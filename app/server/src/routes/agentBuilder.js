const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { getLLMClient, getSetting } = require("../providers/llm");

const SYSTEM_PROMPT = `You are an expert agent designer for Open Enterprise. Help users design AI agents and output them in the Open Enterprise YAML format.

YAML format (always output inside a triple-backtick yaml block):

name: "Agent Name"
slug: "agent-slug"
description: "What this agent does"
enabled: true
trigger:
  type: manual
instructions: |
  You are a helpful AI agent.
steps:
  - name: "Step 1"
    content: |
      What to do in this step.
connectors:
  - name: "My Server"
    type: ssh
params:
  - name: input_value
    label: "Input"
    default: ""

TRIGGER TYPES: manual | scheduled (add cron: "0 9 * * 1") | chat
CONNECTOR TYPES: ssh, smtp, imap, gdrive, slack, http, postgres, mysql, mongodb, notion, jira, github
CHAIN: use chains to run another agent after this one.

BEHAVIOUR:
- Ask clarifying questions until you understand the goal fully
- Discuss the design before generating YAML
- When the user confirms, output the complete YAML in a yaml code block
- Always respond conversationally and helpfully`;

router.post("/chat", authenticate, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  let fullResponse = "";
  let clientGone = false;
  req.on("close", () => { clientGone = true; });

  function safeWrite(data) {
    if (clientGone) return;
    try { res.write(data); } catch { clientGone = true; }
  }

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { provider, client } = await getLLMClient();
    const model = (await getSetting("llm_model")) || process.env.OPENAI_MODEL || process.env.OLLAMA_MODEL || "gpt-4o";

    if (provider === "anthropic") {
      const stream = await client.messages.create({
        model: model || "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
        temperature: 0.5,
        stream: true,
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          const chunk = event.delta.text;
          fullResponse += chunk;
          safeWrite(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      }
    } else {
      const allMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
      const stream = await client.chat.completions.create({
        model,
        messages: allMessages,
        temperature: 0.5,
        max_tokens: 4096,
        stream: true,
        stream_options: { include_usage: true },
      });
      for await (const part of stream) {
        const chunk = part.choices?.[0]?.delta?.content || "";
        if (chunk) {
          fullResponse += chunk;
          safeWrite(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      }
    }

    if (!clientGone) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (err) {
    console.error("[AgentBuilder] error:", err.message);
    if (!clientGone) {
      try {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      } catch { /* client gone */ }
    }
  }
});

module.exports = router;
