const router  = require("express").Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { v4: uuidv4 } = require("uuid");

const { authenticateApiKey }                          = require("../middleware/auth");
const { similaritySearch, deleteDocumentChunks }      = require("../utils/vectorStore");
const { getLLMClient, getSetting }                    = require("../providers/llm");
const { getAnthropicToolDefinitions, getToolDefinitions, executeTool } = require("../utils/tools/registry");
const { canRunAgent, incrementAgentRun, getTierFromDB } = require("../utils/tier");
const ingestionQueue                                  = require("../utils/ingestionQueue");

router.use(authenticateApiKey);

const UPLOAD_DIR = path.join(__dirname, "../../storage/uploads/");
const upload     = multer({ dest: UPLOAD_DIR });

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function buildChatPayload(db, workspace, message, threadId) {
  const temperature  = workspace.temperature ?? 0.7;
  const historyLimit = (workspace.chatHistory ?? 20) * 2;
  const topK         = parseInt((await getSetting("rag_top_k")) || "15");
  const sources      = await similaritySearch(workspace.slug, message, topK);
  const context      = sources.map((s, i) => `[Source ${i + 1}]: ${s.text}`).join("\n\n");

  const history = await db.chat.findMany({
    where: { workspaceId: workspace.id, threadId: threadId ?? null },
    orderBy: { createdAt: "desc" },
    take: historyLimit,
  });
  const historyMessages = history.reverse().map(c => ({ role: c.role, content: c.content }));

  const basePrompt  = workspace.systemPrompt ||
    "You are a knowledgeable assistant for this workspace. Answer ONLY based on the documents provided. Do NOT use general knowledge.";
  const refusalMsg  = workspace.queryRefusalResponse || "There is no relevant information in this workspace to answer your query.";
  const systemPrompt = context.length > 0
    ? `${basePrompt}\n\n--- Document Context ---\n${context}\n--- End of Context ---\n\nIf the answer cannot be found in the context above, respond with: "${refusalMsg}"`
    : `${basePrompt}\n\nNo documents found. Respond with: "${refusalMsg}"`;

  return { temperature, sources, historyMessages, systemPrompt };
}

async function persistChat(db, workspaceId, threadId, message, responseText, sources, inputTokens, outputTokens, model) {
  await db.chat.create({ data: { workspaceId, threadId: threadId ?? null, role: "user", content: message } });
  await db.chat.create({
    data: {
      workspaceId,
      threadId: threadId ?? null,
      role:        "assistant",
      content:     responseText,
      sources:     sources.length > 0 ? JSON.stringify(sources.map(s => ({ text: s.text.slice(0, 200), metadata: s.metadata }))) : null,
      inputTokens,
      outputTokens,
      model,
    },
  });
}

async function llmChat(provider, client, model, systemPrompt, historyMessages, message, temperature) {
  let responseText = "", inputTokens = 0, outputTokens = 0;
  if (provider === "anthropic") {
    const result = await client.messages.create({
      model: model || "claude-3-5-sonnet-20241022", max_tokens: 4096, system: systemPrompt,
      messages: [...historyMessages, { role: "user", content: message }], temperature,
    });
    responseText = result.content?.[0]?.text || "";
    inputTokens  = result.usage?.input_tokens  || 0;
    outputTokens = result.usage?.output_tokens || 0;
  } else {
    const result = await client.chat.completions.create({
      model, max_tokens: 4096, temperature,
      messages: [{ role: "system", content: systemPrompt }, ...historyMessages, { role: "user", content: message }],
    });
    responseText = result.choices?.[0]?.message?.content || "";
    inputTokens  = result.usage?.prompt_tokens     || 0;
    outputTokens = result.usage?.completion_tokens || 0;
  }
  return { responseText, inputTokens, outputTokens };
}

async function resolveThreadByUid(db, workspaceId, threadUid) {
  if (!threadUid) return null;
  const t = await db.thread.findFirst({ where: { uid: threadUid, workspaceId } });
  return t ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspaces
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/workspaces
router.get("/workspaces", async (req, res) => {
  const workspaces = await req.db.workspace.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true, chats: true } } },
  });
  res.json({
    workspaces: workspaces.map(ws => ({
      id: ws.id, name: ws.name, slug: ws.slug,
      documents: ws._count.documents, chats: ws._count.chats, createdAt: ws.createdAt,
    })),
  });
});

// GET /api/v1/workspaces/:slug
router.get("/workspaces/:slug", async (req, res) => {
  const ws = await req.db.workspace.findUnique({
    where: { slug: req.params.slug },
    include: {
      documents: { where: { status: "ready" }, select: { uid: true, name: true, type: true, chunkCount: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      _count: { select: { chats: true } },
    },
  });
  if (!ws) return res.status(404).json({ error: "Workspace not found" });
  res.json({ workspace: { id: ws.id, name: ws.name, slug: ws.slug, chats: ws._count.chats, documents: ws.documents, createdAt: ws.createdAt } });
});

// POST /api/v1/workspaces
router.post("/workspaces", async (req, res) => {
  const { name, systemPrompt } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + uuidv4().slice(0, 6);
  const workspace = await req.db.workspace.create({
    data: { name: name.trim(), slug, systemPrompt: systemPrompt?.trim() || null },
    select: { id: true, name: true, slug: true, createdAt: true },
  });
  res.status(201).json({ workspace });
});

// ─────────────────────────────────────────────────────────────────────────────
// Chat — JSON (non-streaming)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/v1/workspaces/:slug/chat
router.post("/workspaces/:slug/chat", async (req, res) => {
  const { message, threadId: threadUid } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const thread = threadUid ? await resolveThreadByUid(req.db, workspace.id, threadUid) : null;
  if (threadUid && !thread) return res.status(404).json({ error: "Thread not found" });

  try {
    const { temperature, sources, historyMessages, systemPrompt } = await buildChatPayload(req.db, workspace, message, thread?.id);
    const { provider, client } = await getLLMClient();
    const model = (await getSetting("llm_model")) || process.env.OPENAI_MODEL || "gpt-4o";
    const { responseText, inputTokens, outputTokens } = await llmChat(provider, client, model, systemPrompt, historyMessages, message, temperature);

    await persistChat(req.db, workspace.id, thread?.id, message, responseText, sources, inputTokens, outputTokens, model);

    res.json({
      response: responseText,
      sources:  sources.map(s => ({ text: s.text.slice(0, 300), metadata: s.metadata })),
      usage:    { inputTokens, outputTokens, model },
      ...(thread ? { threadId: thread.uid } : {}),
    });
  } catch (err) {
    console.error("[v1 chat]", err.message);
    res.status(500).json({ error: "LLM error. Check your provider configuration." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Chat — SSE streaming
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/v1/workspaces/:slug/chat/stream
router.post("/workspaces/:slug/chat/stream", async (req, res) => {
  const { message, threadId: threadUid } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const thread = threadUid ? await resolveThreadByUid(req.db, workspace.id, threadUid) : null;
  if (threadUid && !thread) return res.status(404).json({ error: "Thread not found" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const { temperature, sources, historyMessages, systemPrompt } = await buildChatPayload(req.db, workspace, message, thread?.id);
    const { provider, client } = await getLLMClient();
    const model = (await getSetting("llm_model")) || process.env.OPENAI_MODEL || "gpt-4o";

    let fullResponse = "", inputTokens = 0, outputTokens = 0;

    if (provider === "anthropic") {
      const stream = await client.messages.create({
        model: model || "claude-3-5-sonnet-20241022", max_tokens: 4096,
        system: systemPrompt, messages: [...historyMessages, { role: "user", content: message }],
        temperature, stream: true,
      });
      for await (const event of stream) {
        if (event.type === "message_start")  inputTokens  = event.message?.usage?.input_tokens  || 0;
        if (event.type === "message_delta")  outputTokens = event.usage?.output_tokens || 0;
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          fullResponse += event.delta.text;
          res.write(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`);
        }
      }
    } else {
      const stream = await client.chat.completions.create({
        model, temperature, max_tokens: 4096, stream: true, stream_options: { include_usage: true },
        messages: [{ role: "system", content: systemPrompt }, ...historyMessages, { role: "user", content: message }],
      });
      for await (const part of stream) {
        if (part.usage) { inputTokens = part.usage.prompt_tokens || 0; outputTokens = part.usage.completion_tokens || 0; }
        const chunk = part.choices?.[0]?.delta?.content || "";
        if (chunk) { fullResponse += chunk; res.write(`data: ${JSON.stringify({ chunk })}\n\n`); }
      }
    }

    await persistChat(req.db, workspace.id, thread?.id, message, fullResponse, sources, inputTokens, outputTokens, model);
    res.write(`data: ${JSON.stringify({ done: true, sources: sources.map(s => ({ text: s.text.slice(0, 300), metadata: s.metadata })), usage: { inputTokens, outputTokens, model }, ...(thread ? { threadId: thread.uid } : {}) })}\n\n`);
    res.end();
  } catch (err) {
    console.error("[v1 chat/stream]", err.message);
    res.write(`data: ${JSON.stringify({ error: "LLM error. Check your provider configuration." })}\n\n`);
    res.end();
  }
});

// GET /api/v1/workspaces/:slug/chat/history
router.get("/workspaces/:slug/chat/history", async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const thread = req.query.threadId ? await resolveThreadByUid(req.db, workspace.id, req.query.threadId) : null;
  if (req.query.threadId && !thread) return res.status(404).json({ error: "Thread not found" });

  const messages = await req.db.chat.findMany({
    where: { workspaceId: workspace.id, threadId: thread?.id ?? null },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json({ messages: messages.map(m => ({ ...m, sources: m.sources ? JSON.parse(m.sources) : [] })) });
});

// ─────────────────────────────────────────────────────────────────────────────
// Threads
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/workspaces/:slug/threads
router.get("/workspaces/:slug/threads", async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  const threads = await req.db.thread.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ pinned: "desc" }, { createdAt: "asc" }],
  });
  res.json({ threads });
});

// POST /api/v1/workspaces/:slug/threads
router.post("/workspaces/:slug/threads", async (req, res) => {
  const { name } = req.body;
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  const thread = await req.db.thread.create({
    data: { uid: uuidv4(), workspaceId: workspace.id, name: name?.trim() || "New Thread" },
  });
  res.status(201).json({ thread });
});

// DELETE /api/v1/workspaces/:slug/threads/:uid
router.delete("/workspaces/:slug/threads/:uid", async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  const thread = await resolveThreadByUid(req.db, workspace.id, req.params.uid);
  if (!thread) return res.status(404).json({ error: "Thread not found" });
  await req.db.chat.deleteMany({ where: { threadId: thread.id } });
  await req.db.thread.delete({ where: { uid: req.params.uid } });
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/workspaces/:slug/documents
router.get("/workspaces/:slug/documents", async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  const documents = await req.db.document.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: { uid: true, name: true, type: true, size: true, status: true, chunkCount: true, createdAt: true },
  });
  res.json({ documents });
});

// GET /api/v1/workspaces/:slug/documents/:uid
router.get("/workspaces/:slug/documents/:uid", async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  const doc = await req.db.document.findFirst({
    where: { uid: req.params.uid, workspaceId: workspace.id },
    select: { uid: true, name: true, type: true, size: true, status: true, chunkCount: true, chunksProcessed: true, totalChunks: true, errorMessage: true, createdAt: true },
  });
  if (!doc) return res.status(404).json({ error: "Document not found" });
  res.json({ document: doc });
});

// POST /api/v1/workspaces/:slug/documents/upload
router.post("/workspaces/:slug/documents/upload", upload.single("file"), async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  if (!req.file)   return res.status(400).json({ error: "file required (multipart/form-data)" });

  const tier = await getTierFromDB(req.db);
  if (isFinite(tier.ingestionSpaceGb)) {
    const { _sum } = await req.db.document.aggregate({ _sum: { size: true } });
    const usedBytes = _sum.size || 0;
    if (usedBytes + req.file.size > tier.ingestionSpaceGb * 1024 ** 3) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: `Storage limit reached (${tier.ingestionSpaceGb} GB)` });
    }
  }

  const uid = uuidv4();
  const doc = await req.db.document.create({
    data: { uid, name: req.file.originalname, type: req.file.mimetype, size: req.file.size, workspaceId: workspace.id, status: "queued", sourcePath: req.file.path },
  });
  ingestionQueue.enqueue(req.db, workspace, doc, req.file.path, "file", false, null);
  res.status(202).json({ document: { uid: doc.uid, name: doc.name, status: doc.status } });
});

// POST /api/v1/workspaces/:slug/documents/url
router.post("/workspaces/:slug/documents/url", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  const uid = uuidv4();
  const doc = await req.db.document.create({
    data: { uid, name: url, type: "url", workspaceId: workspace.id, status: "queued" },
  });
  ingestionQueue.enqueue(req.db, workspace, doc, url, "url", false, null);
  res.status(202).json({ document: { uid: doc.uid, name: doc.name, status: doc.status } });
});

// DELETE /api/v1/workspaces/:slug/documents/:uid
router.delete("/workspaces/:slug/documents/:uid", async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  const doc = await req.db.document.findFirst({ where: { uid: req.params.uid, workspaceId: workspace.id } });
  if (!doc) return res.status(404).json({ error: "Document not found" });
  await deleteDocumentChunks(workspace.slug, req.params.uid);
  await req.db.document.deleteMany({ where: { uid: req.params.uid, workspaceId: workspace.id } });
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/workspaces/:slug/agents
router.get("/workspaces/:slug/agents", async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  const agents = await req.db.agent.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, triggerType: true, cronExpression: true, enabled: true, createdAt: true,
      runs: { orderBy: { startedAt: "desc" }, take: 1, select: { status: true, startedAt: true, completedAt: true } } },
  });
  res.json({ agents });
});

// GET /api/v1/workspaces/:slug/agents/:id/runs
router.get("/workspaces/:slug/agents/:id/runs", async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  const agentId = parseInt(req.params.id);
  const agent = await req.db.agent.findFirst({ where: { id: agentId, workspaceId: workspace.id } });
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const runs = await req.db.agentRun.findMany({
    where: { agentId },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: { id: true, status: true, triggerType: true, input: true, output: true, error: true, startedAt: true, completedAt: true },
  });
  res.json({ runs });
});

// POST /api/v1/workspaces/:slug/agents/:id/run  — SSE streaming
router.post("/workspaces/:slug/agents/:id/run", async (req, res) => {
  const workspace = await req.db.workspace.findUnique({ where: { slug: req.params.slug } });
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const agentId = parseInt(req.params.id);
  const agent   = await req.db.agent.findFirst({ where: { id: agentId, workspaceId: workspace.id } });
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  const allowed = await canRunAgent(req.db);
  if (!allowed) {
    const tier = await getTierFromDB(req.db);
    return res.status(429).json({ error: `Agent run limit reached. Max ${tier.maxAgentRunsPerMonth} runs/month.` });
  }
  await incrementAgentRun(req.db);

  const run = await req.db.agentRun.create({
    data: { agentId, status: "running", triggerType: "manual", input: req.body.input || null },
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const connectorIds = JSON.parse(agent.connectorIds || "[]");
    const connectors   = connectorIds.length
      ? await req.db.connector.findMany({ where: { id: { in: connectorIds }, status: "active" } })
      : [];

    const systemPrompt = agent.systemPrompt || "You are a helpful AI agent. Complete the task using the available tools.";
    const userMessage  = req.body.input?.trim() || "Execute the agent task now using the available tools. Do not ask for clarification.";

    const { provider, client } = await getLLMClient();
    const model = (await getSetting("llm_model")) || process.env.OPENAI_MODEL || "gpt-4o";
    const MAX_ROUNDS = 5;
    let fullOutput = "";

    if (provider === "anthropic") {
      const tools = getAnthropicToolDefinitions(connectors);
      const msgs  = [{ role: "user", content: userMessage }];
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const resp = await client.messages.create({
          model: model || "claude-3-5-sonnet-20241022", max_tokens: 4096,
          system: systemPrompt, messages: msgs, tools: tools.length ? tools : undefined, temperature: 0.3,
        });
        if (resp.stop_reason !== "tool_use" || !tools.length) { fullOutput = resp.content?.find(b => b.type === "text")?.text || ""; break; }
        const toolUseBlocks = resp.content.filter(b => b.type === "tool_use");
        res.write(`data: ${JSON.stringify({ tool_calls: toolUseBlocks.map(b => b.name) })}\n\n`);
        msgs.push({ role: "assistant", content: resp.content });
        const toolResults = [];
        for (const tb of toolUseBlocks) {
          const result = await executeTool(tb.name, tb.input, connectors, req.db);
          toolResults.push({ type: "tool_result", tool_use_id: tb.id, content: String(result) });
        }
        msgs.push({ role: "user", content: toolResults });
        if (round === MAX_ROUNDS - 1) {
          const finalResp = await client.messages.create({ model: model || "claude-3-5-sonnet-20241022", max_tokens: 4096, system: systemPrompt, messages: msgs, temperature: 0.3 });
          fullOutput = finalResp.content?.find(b => b.type === "text")?.text || "";
        }
      }
    } else {
      const tools    = getToolDefinitions(connectors);
      const messages = [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }];
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const reqBody = { model, messages, temperature: 0.3, max_tokens: 4096 };
        if (tools.length) { reqBody.tools = tools; reqBody.tool_choice = "auto"; }
        const resp   = await client.chat.completions.create(reqBody);
        const choice = resp.choices[0];
        if (choice.finish_reason !== "tool_calls" || !tools.length) { fullOutput = choice.message.content || ""; break; }
        const toolCalls = choice.message.tool_calls || [];
        res.write(`data: ${JSON.stringify({ tool_calls: toolCalls.map(tc => tc.function.name) })}\n\n`);
        messages.push(choice.message);
        for (const tc of toolCalls) {
          let args = {}; try { args = JSON.parse(tc.function.arguments); } catch { /* */ }
          const result = await executeTool(tc.function.name, args, connectors, req.db);
          messages.push({ role: "tool", tool_call_id: tc.id, content: String(result) });
        }
        if (round === MAX_ROUNDS - 1) {
          const finalResp = await client.chat.completions.create({ model, messages, temperature: 0.3, max_tokens: 4096 });
          fullOutput = finalResp.choices[0].message.content || "";
        }
      }
    }

    await req.db.agentRun.update({ where: { id: run.id }, data: { status: "success", output: fullOutput, completedAt: new Date() } });
    res.write(`data: ${JSON.stringify({ done: true, output: fullOutput, runId: run.id })}\n\n`);
    res.end();
  } catch (err) {
    await req.db.agentRun.update({ where: { id: run.id }, data: { status: "error", error: err.message, completedAt: new Date() } });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
