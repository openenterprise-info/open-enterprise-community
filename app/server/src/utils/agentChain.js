const { buildSystemPrompt } = require("./workflowEngine");
const { getLLMClient, getSetting } = require("../providers/llm");
const { getToolDefinitions, getAnthropicToolDefinitions, executeTool } = require("./tools/registry");

function friendlyToolName(rawName, connectors) {
  const connId = rawName.match(/^conn_(\d+)_/)?.[1];
  const action = rawName.replace(/^conn_\d+_/, "");
  if (connId) {
    const conn = (connectors || []).find(c => c.id === parseInt(connId));
    return conn ? conn.name : action;
  }
  return rawName.replace(/_/g, " ");
}

function applyParams(template, paramDefs, paramValues) {
  let result = template || "";
  for (const p of (paramDefs || [])) {
    const val = String(paramValues?.[p.name] ?? p.default ?? "");
    result = result.split(`{{${p.name}}}`).join(val);
  }
  return result;
}

function conditionMet(condition, output) {
  switch (condition) {
    case "always":      return true;
    case "on_success":  return true; // already succeeded to get here
    case "on_critical": return /CRITICAL|🚨/i.test(output || "");
    case "on_warning":  return /WARNING|CRITICAL|⚠️|🚨/i.test(output || "");
    default:            return true;
  }
}

async function runChainedAgent(agent, db, inputContext, depth, chatContext) {
  const run = await db.agentRun.create({
    data: { agentId: agent.id, status: "running", triggerType: "chained", input: inputContext?.slice(0, 2000) || null, triggeredFromWorkspaceId: chatContext?.workspaceId || null },
  });

  try {
    const connectorIds = JSON.parse(agent.connectorIds || "[]");
    const connectors   = connectorIds.length
      ? await db.connector.findMany({ where: { id: { in: connectorIds }, status: "active" } })
      : [];

    const workspace   = await db.workspace.findUnique({ where: { id: agent.workspaceId } });
    const paramDefs   = JSON.parse(agent.params || "[]");
    let systemPrompt = applyParams(
      buildSystemPrompt(agent) || "You are a helpful AI agent. Complete the task given to you using the available tools.",
      paramDefs, null
    ) + "\n\nIMPORTANT: This is an automated chained run. Execute immediately using available tools. Do not ask for clarification.";

    if (workspace?.agentMemoryEnabled) {
      const pastRuns = await db.agentRun.findMany({
        where: { agentId: agent.id, status: "success" },
        orderBy: { completedAt: "desc" },
        take: workspace.agentMemoryRuns || 5,
      });
      if (pastRuns.length) {
        const memoryBlock = pastRuns.reverse().map((r, i) =>
          `Run ${i + 1} (${r.completedAt?.toISOString().slice(0, 10)}): ${(r.output || "").slice(0, 500)}`
        ).join("\n\n");
        systemPrompt += `\n\n--- MEMORY FROM PREVIOUS RUNS ---\n${memoryBlock}\n--- END MEMORY ---`;
      }
    }

    const userMessage = inputContext
      ? `Context from previous agent:\n\n${inputContext}\n\nNow execute your task.`
      : "Execute the agent task now.";

    const { provider, client } = await getLLMClient();
    const model      = (await getSetting("llm_model")) || process.env.OPENAI_MODEL || process.env.OLLAMA_MODEL || "gpt-4o";
    const MAX_ROUNDS = workspace?.defaultAgentMaxRounds || 25;
    let fullOutput   = "";
    const allToolCallNames = [];
    const hasWorkflow = (JSON.parse(agent.workflow || "[]")).length > 0;

    if (provider === "anthropic") {
      const tools = getAnthropicToolDefinitions(connectors);
      const msgs  = [{ role: "user", content: userMessage }];
      let madeToolCall = false;
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const resp = await client.messages.create({
          model: model || "claude-sonnet-4-6", max_tokens: 4096,
          system: systemPrompt, messages: msgs,
          tools: tools.length ? tools : undefined, temperature: 0.3,
        });
        if (resp.stop_reason !== "tool_use" || !tools.length) {
          // Workflow agents: if no tools were called yet on round 0, push agent to act immediately
          if (hasWorkflow && tools.length && !madeToolCall && round === 0) {
            msgs.push({ role: "assistant", content: resp.content });
            msgs.push({ role: "user", content: "Do not plan or summarise. Call your first tool RIGHT NOW." });
            continue;
          }
          fullOutput = resp.content?.find(b => b.type === "text")?.text || ""; break;
        }
        madeToolCall = true;
        const toolUseBlocks = resp.content.filter(b => b.type === "tool_use");
        allToolCallNames.push(...toolUseBlocks.map(b => friendlyToolName(b.name, connectors)));
        msgs.push({ role: "assistant", content: resp.content });
        const toolResults = [];
        for (const tb of toolUseBlocks) {
          const result = await executeTool(tb.name, tb.input, connectors, db);
          toolResults.push({ type: "tool_result", tool_use_id: tb.id, content: String(result) });
        }
        msgs.push({ role: "user", content: toolResults });
        if (round === MAX_ROUNDS - 1) {
          const fr = await client.messages.create({ model: model || "claude-sonnet-4-6", max_tokens: 4096, system: systemPrompt, messages: msgs, temperature: 0.3 });
          fullOutput = fr.content?.find(b => b.type === "text")?.text || "";
        }
      }
    } else {
      const tools    = getToolDefinitions(connectors);
      const messages = [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }];
      let madeToolCall = false;
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const reqBody = { model, messages, temperature: 0.3, max_tokens: 4096 };
        if (tools.length) { reqBody.tools = tools; reqBody.tool_choice = "auto"; }
        const resp   = await client.chat.completions.create(reqBody);
        const choice = resp.choices[0];
        if (choice.finish_reason !== "tool_calls" || !tools.length) {
          if (hasWorkflow && tools.length && !madeToolCall && round === 0) {
            messages.push(choice.message);
            messages.push({ role: "user", content: "Do not plan or summarise. Call your first tool RIGHT NOW." });
            continue;
          }
          fullOutput = choice.message.content || ""; break;
        }
        madeToolCall = true;
        messages.push(choice.message);
        for (const tc of choice.message.tool_calls || []) {
          let args = {};
          try { args = JSON.parse(tc.function.arguments); } catch { /**/ }
          allToolCallNames.push(friendlyToolName(tc.function.name, connectors));
          const result = await executeTool(tc.function.name, args, connectors, db);
          messages.push({ role: "tool", tool_call_id: tc.id, content: String(result) });
        }
        if (round === MAX_ROUNDS - 1) {
          const fr = await client.chat.completions.create({ model, messages, temperature: 0.3, max_tokens: 4096 });
          fullOutput = fr.choices[0].message.content || "";
        }
      }
    }

    await db.agentRun.update({
      where: { id: run.id },
      data: { status: "success", output: fullOutput, completedAt: new Date() },
    });
    console.log(`[chain] Agent "${agent.name}" (depth=${depth}) completed.`);

    if (chatContext?.workspaceId) {
      await db.chat.create({
        data: {
          workspaceId: chatContext.workspaceId,
          threadId:    chatContext.threadId || null,
          role:        "assistant",
          content:     `**@${agent.slug}** *(chained)* — ${fullOutput}`,
          toolCalls:   allToolCallNames.length ? JSON.stringify(allToolCallNames) : null,
        },
      });
    }

    // Continue chain
    await maybeChain(agent, fullOutput, db, depth, chatContext);

  } catch (err) {
    await db.agentRun.update({
      where: { id: run.id },
      data: { status: "error", error: err.message, completedAt: new Date() },
    });
    if (chatContext?.workspaceId) {
      await db.chat.create({
        data: {
          workspaceId: chatContext.workspaceId,
          threadId:    chatContext.threadId || null,
          role:        "assistant",
          content:     `**@${agent.slug}** *(chained)* — ❌ Error: ${err.message}`,
        },
      });
    }
    console.error(`[chain] Agent "${agent.name}" failed:`, err.message);
  }
}

async function maybeChain(agent, output, db, depth = 0, chatContext) {
  const workspace = await db.workspace.findUnique({ where: { id: agent.workspaceId } });
  const maxDepth  = workspace?.maxChainDepth || 5;
  if (depth >= maxDepth) { console.warn(`[chain] Max depth (${maxDepth}) reached at agent "${agent.name}"`); return { pendingApprovals: 0 }; }

  const chains = agent.chains
    ? JSON.parse(agent.chains)
    : agent.nextAgent
      ? [{ condition: agent.nextAgentCondition || "always", nextAgent: agent.nextAgent }]
      : [];

  if (!chains.length) return { pendingApprovals: 0 };

  let pendingApprovals = 0;

  for (const chain of chains) {
    if (!chain.nextAgent) continue;
    if (!conditionMet(chain.condition || "always", output)) {
      console.log(`[chain] Condition "${chain.condition}" not met → skipping "${chain.nextAgent}"`);
      continue;
    }
    const nextAgent = await db.agent.findFirst({ where: { slug: chain.nextAgent } });
    if (!nextAgent) { console.warn(`[chain] Next agent "${chain.nextAgent}" not found`); continue; }

    if (chain.triggerType === "manual") {
      const timeoutAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await db.chainApproval.create({
        data: {
          workspaceId:   chatContext?.workspaceId || agent.workspaceId,
          sourceAgentId: agent.id,
          sourceRunId:   chatContext?.runId || 0,
          threadId:      chatContext?.threadId || null,
          nextAgentSlug: chain.nextAgent,
          condition:     chain.condition || "always",
          runOutput:     (output || "").slice(0, 2000),
          status:        "pending",
          timeoutAt,
        }
      });
      pendingApprovals++;
      console.log(`[chain] "${agent.name}" → "${chain.nextAgent}" queued for manual approval`);
      continue;
    }

    console.log(`[chain] "${agent.name}" → "${nextAgent.name}" (condition: ${chain.condition}, depth: ${depth + 1})`);
    await runChainedAgent(nextAgent, db, output, depth + 1, chatContext);
  }

  return { pendingApprovals };
}

module.exports = { maybeChain, runChainedAgent };
