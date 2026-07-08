const router = require("express").Router();
const { authenticate, requireManagerOrAdmin } = require("../middleware/auth");
const { getToolDefinitions, getAnthropicToolDefinitions, executeTool } = require("../utils/tools/registry");
const { getLLMClient, getSetting } = require("../providers/llm");
const scheduler = require("../utils/scheduler");

router.use(authenticate, requireManagerOrAdmin);

// List agents for a workspace
router.get("/workspaces/:workspaceId/agents", async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const agents = await req.db.agent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { status: true, startedAt: true, completedAt: true },
        },
      },
    });
    res.json({ agents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create agent
router.post("/workspaces/:workspaceId/agents", async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const { name, description, systemPrompt, connectorIds, triggerType, cronExpression, enabled, visualize } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const agent = await req.db.agent.create({
      data: {
        workspaceId,
        name:           name.trim(),
        description:    description?.trim() || null,
        systemPrompt:   systemPrompt?.trim() || null,
        connectorIds:   JSON.stringify(connectorIds || []),
        triggerType:    triggerType || "manual",
        cronExpression: cronExpression || null,
        enabled:        enabled !== false,
        visualize:      visualize === true,
        createdByUserId: req.user.id || null,
      },
    });
    scheduler.scheduleAgent(agent, req.db);
    res.json({ agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update agent
router.put("/workspaces/:workspaceId/agents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, systemPrompt, connectorIds, triggerType, cronExpression, enabled, visualize } = req.body;
    const data = {};
    if (name           !== undefined) data.name           = name.trim();
    if (description    !== undefined) data.description    = description?.trim() || null;
    if (systemPrompt   !== undefined) data.systemPrompt   = systemPrompt?.trim() || null;
    if (connectorIds   !== undefined) data.connectorIds   = JSON.stringify(connectorIds);
    if (triggerType    !== undefined) data.triggerType    = triggerType;
    if (cronExpression !== undefined) data.cronExpression = cronExpression || null;
    if (enabled        !== undefined) data.enabled        = enabled;
    if (visualize      !== undefined) data.visualize      = visualize === true;
    const agent = await req.db.agent.update({ where: { id }, data });
    scheduler.scheduleAgent(agent, req.db);
    res.json({ agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete agent
router.delete("/workspaces/:workspaceId/agents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    scheduler.unscheduleAgent(id);
    await req.db.agent.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get run history for an agent
router.get("/workspaces/:workspaceId/agents/:id/runs", async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    const runs = await req.db.agentRun.findMany({
      where: { agentId },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
    res.json({ runs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel a running agent run
router.post("/workspaces/:workspaceId/agents/:id/runs/:runId/cancel", async (req, res) => {
  try {
    const runId = parseInt(req.params.runId);
    await req.db.$executeRaw`UPDATE AgentRun SET cancelRequested = 1 WHERE id = ${runId}`;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run an agent (manual trigger)
router.post("/workspaces/:workspaceId/agents/:id/run", async (req, res) => {
  const agentId     = parseInt(req.params.id);
  const workspaceId = parseInt(req.params.workspaceId);
  const { input }   = req.body;

  const agent = await req.db.agent.findUnique({ where: { id: agentId } });
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  // Create a pending run record
  const run = await req.db.agentRun.create({
    data: { agentId, status: "running", triggerType: "manual", input: input || null },
  });

  // Stream SSE back
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const connectorIds = JSON.parse(agent.connectorIds || "[]");
    const connectors   = connectorIds.length
      ? await req.db.connector.findMany({ where: { id: { in: connectorIds }, status: "active" } })
      : [];

    const systemPrompt = agent.systemPrompt ||
      "You are a helpful AI agent. Complete the task given to you using the available tools.";

    const userMessage = input?.trim() || "Execute the agent task now using the available tools. Do not ask for clarification.";

    const { provider, client } = await getLLMClient();
    const model = (await getSetting("llm_model")) || process.env.OPENAI_MODEL || process.env.OLLAMA_MODEL || "gpt-4o";

    const MAX_ROUNDS = 5;
    let fullOutput = "";

    if (provider === "anthropic") {
      const tools = getAnthropicToolDefinitions(connectors);
      const msgs  = [{ role: "user", content: userMessage }];

      for (let round = 0; round < MAX_ROUNDS; round++) {
        const resp = await client.messages.create({
          model: model || "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: systemPrompt,
          messages: msgs,
          tools: tools.length ? tools : undefined,
          temperature: 0.3,
        });

        if (resp.stop_reason !== "tool_use" || !tools.length) {
          fullOutput = resp.content?.find(b => b.type === "text")?.text || "";
          break;
        }

        const toolUseBlocks = resp.content.filter(b => b.type === "tool_use");
        res.write(`data: ${JSON.stringify({ tool_calls: toolUseBlocks.map(b => b.name) })}\n\n`);

        msgs.push({ role: "assistant", content: resp.content });
        const toolResults = [];
        for (const tb of toolUseBlocks) {
          const result = await executeTool(tb.name, tb.input, connectors, req.db);
          toolResults.push({ type: "tool_result", tool_use_id: tb.id, content: String(result) });
        }
        msgs.push({ role: "user", content: toolResults });

        const [cr0] = await req.db.$queryRaw`SELECT cancelRequested FROM AgentRun WHERE id = ${run.id}`;
        if (cr0?.cancelRequested) { fullOutput = "[Run cancelled by user]"; break; }

        if (round === MAX_ROUNDS - 1) {
          const finalResp = await client.messages.create({
            model: model || "claude-3-5-sonnet-20241022",
            max_tokens: 4096, system: systemPrompt, messages: msgs, temperature: 0.3,
          });
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

        if (choice.finish_reason !== "tool_calls" || !tools.length) {
          fullOutput = choice.message.content || "";
          break;
        }

        const toolCalls = choice.message.tool_calls || [];
        res.write(`data: ${JSON.stringify({ tool_calls: toolCalls.map(tc => tc.function.name) })}\n\n`);

        messages.push(choice.message);
        for (const tc of toolCalls) {
          let args = {};
          try { args = JSON.parse(tc.function.arguments); } catch { /* */ }
          const result = await executeTool(tc.function.name, args, connectors, req.db);
          messages.push({ role: "tool", tool_call_id: tc.id, content: String(result) });
        }

        const [cr1] = await req.db.$queryRaw`SELECT cancelRequested FROM AgentRun WHERE id = ${run.id}`;
        if (cr1?.cancelRequested) { fullOutput = "[Run cancelled by user]"; break; }

        if (round === MAX_ROUNDS - 1) {
          const finalResp = await client.chat.completions.create({ model, messages, temperature: 0.3, max_tokens: 4096 });
          fullOutput = finalResp.choices[0].message.content || "";
        }
      }
    }

    await req.db.agentRun.update({
      where: { id: run.id },
      data:  { status: "success", output: fullOutput, completedAt: new Date() },
    });

    res.write(`data: ${JSON.stringify({ done: true, output: fullOutput, runId: run.id })}\n\n`);
    res.end();
  } catch (err) {
    await req.db.agentRun.update({
      where: { id: run.id },
      data:  { status: "error", error: err.message, completedAt: new Date() },
    });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
