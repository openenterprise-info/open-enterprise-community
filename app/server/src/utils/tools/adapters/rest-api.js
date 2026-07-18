const axios = require("axios");

function getToolDefinitions(connector) {
  return [
    {
      type: "function",
      function: {
        name: `conn_${connector.id}_get`,
        description: `Fetch data from the "${connector.name}" REST API via HTTP GET.`,
        parameters: {
          type: "object",
          properties: {
            path:   { type: "string", description: "URL path to call (e.g. /users or /tickets/123)" },
            params: { type: "object", description: "Optional query parameters as key-value pairs", additionalProperties: { type: "string" } }
          },
          required: ["path"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: `conn_${connector.id}_post`,
        description: `Send data to the "${connector.name}" REST API via HTTP POST.`,
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "URL path to call" },
            body: { type: "object", description: "JSON body to send", additionalProperties: true }
          },
          required: ["path", "body"]
        }
      }
    }
  ];
}

function getAnthropicToolDefinitions(connector) {
  return getToolDefinitions(connector).map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

async function executeTool(action, args, connector) {
  const cfg  = connector.config    ? JSON.parse(connector.config)    : {};
  const auth = connector.authConfig ? JSON.parse(connector.authConfig) : {};

  const baseUrl = (auth.baseUrl || cfg.baseUrl || "").replace(/\/$/, "");
  if (!baseUrl) return "Connector base URL not configured.";

  const headers = { "Content-Type": "application/json", "Accept": "application/json" };
  if (auth.apiKey)      headers[auth.headerName || "X-API-Key"] = auth.apiKey;
  if (auth.bearerToken) headers["Authorization"] = `Bearer ${auth.bearerToken}`;
  if (auth.username && auth.password) {
    headers["Authorization"] = "Basic " + Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
  }

  const url = baseUrl + (args.path || "");

  try {
    if (action === "get") {
      const res = await axios.get(url, { headers, params: args.params || {}, timeout: 300000 });
      return JSON.stringify(res.data, null, 2).slice(0, 8000);
    }
    if (action === "post") {
      const res = await axios.post(url, args.body || {}, { headers, timeout: 300000 });
      return JSON.stringify(res.data, null, 2).slice(0, 8000);
    }
    return "Unknown action.";
  } catch (err) {
    return `API error: ${err.response?.status} ${err.response?.statusText || err.message}`;
  }
}

module.exports = { getToolDefinitions, getAnthropicToolDefinitions, executeTool };
