const database       = require("./adapters/database");
const restApi        = require("./adapters/rest-api");
const mongodb        = require("./adapters/mongodb");
const gmail          = require("./adapters/gmail");
const slack          = require("./adapters/slack");
const jira           = require("./adapters/jira");
const confluence     = require("./adapters/confluence");
const notion         = require("./adapters/notion");
const hubspot        = require("./adapters/hubspot");
const freshdesk      = require("./adapters/freshdesk");
const zendesk        = require("./adapters/zendesk");
const github         = require("./adapters/github");
const zohoMail       = require("./adapters/zoho-mail");
const gdrive         = require("./adapters/gdrive");
const redis          = require("./adapters/redis");
const elasticsearch  = require("./adapters/elasticsearch");
const onedrive       = require("./adapters/onedrive");
const dropbox        = require("./adapters/dropbox");
const box            = require("./adapters/box");
const ssh            = require("./adapters/ssh");
const ADAPTERS = {
  postgresql:    database,
  mysql:         database,
  mssql:         database,
  oracle:        database,
  cockroachdb:   database,
  sqlite:        database,
  snowflake:     database,
  bigquery:      database,
  mongodb:       mongodb,
  redis:         redis,
  elasticsearch: elasticsearch,
  onedrive:      onedrive,
  dropbox:       dropbox,
  box:           box,
  "rest-api": restApi,
  gmail:      gmail,
  slack:      slack,
  jira:       jira,
  confluence: confluence,
  notion:     notion,
  hubspot:    hubspot,
  freshdesk:  freshdesk,
  zendesk:    zendesk,
  github:     github,
  "zoho-mail": zohoMail,
  "gdrive":    gdrive,
  "ssh":         ssh,
};

function getToolDefinitions(connectors) {
  const tools = [];
  for (const c of connectors) {
    const adapter = ADAPTERS[c.type];
    if (adapter) tools.push(...adapter.getToolDefinitions(c));
  }
  return tools;
}

function getAnthropicToolDefinitions(connectors) {
  const tools = [];
  for (const c of connectors) {
    const adapter = ADAPTERS[c.type];
    if (adapter) tools.push(...adapter.getAnthropicToolDefinitions(c));
  }
  return tools;
}

async function executeTool(toolName, args, connectors, db) {
  const match = toolName.match(/^conn_(\d+)_(.+)$/);
  if (!match) return `Unknown tool: ${toolName}`;

  const connectorId = parseInt(match[1]);
  const action      = match[2];
  const connector   = connectors.find(c => c.id === connectorId);
  if (!connector) return "Connector not found.";

  const adapter = ADAPTERS[connector.type];
  if (!adapter) return `Unsupported connector type: ${connector.type}`;

  return adapter.executeTool(action, args, connector, db);
}

module.exports = { getToolDefinitions, getAnthropicToolDefinitions, executeTool, ADAPTERS };
