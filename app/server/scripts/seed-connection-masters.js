"use strict";
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

// ── Field templates ──────────────────────────────────────────────────────────

const HTTP = JSON.stringify([
  { key: "baseUrl",  label: "Base URL",             type: "text",     required: true,  placeholder: "https://api.example.com/v1" },
  { key: "headers",  label: "Auth Headers (JSON)",   type: "json",     required: false, placeholder: '{"Authorization":"Bearer YOUR_TOKEN"}' },
]);

const DB = JSON.stringify([
  { key: "host",     label: "Host",                  type: "text",     required: true,  placeholder: "localhost" },
  { key: "port",     label: "Port",                  type: "number",   required: false, placeholder: "3306" },
  { key: "user",     label: "Username",              type: "text",     required: true,  placeholder: "root" },
  { key: "password", label: "Password",              type: "password", required: true  },
  { key: "database", label: "Database",              type: "text",     required: true,  placeholder: "mydb" },
  { key: "ssl",      label: "Use SSL",               type: "boolean",  required: false },
]);

const MONGO = JSON.stringify([
  { key: "connectionString", label: "Connection String", type: "text", required: true, placeholder: "mongodb://localhost:27017/mydb" },
]);

const REDIS = JSON.stringify([
  { key: "host",     label: "Host",     type: "text",     required: true,  placeholder: "localhost" },
  { key: "port",     label: "Port",     type: "number",   required: false, placeholder: "6379" },
  { key: "password", label: "Password", type: "password", required: false },
]);

const ES = JSON.stringify([
  { key: "url",      label: "URL",      type: "text",     required: true,  placeholder: "http://localhost:9200" },
  { key: "username", label: "Username", type: "text",     required: false },
  { key: "password", label: "Password", type: "password", required: false },
  { key: "apiKey",   label: "API Key",  type: "password", required: false },
]);

const SSH = JSON.stringify([
  { key: "host",           label: "Host",             type: "text",     required: true,  placeholder: "your-server.com" },
  { key: "port",           label: "Port",             type: "number",   required: false, placeholder: "22" },
  { key: "username",       label: "Username",         type: "text",     required: true,  placeholder: "ubuntu" },
  { key: "privateKeyPath", label: "Private Key Path", type: "text",     required: false, placeholder: "~/.ssh/id_rsa" },
  { key: "password",       label: "Password",         type: "password", required: false },
]);

const GDRIVE = JSON.stringify([
  { key: "clientId",     label: "Client ID",     type: "text",     required: true },
  { key: "clientSecret", label: "Client Secret", type: "password", required: true },
  { key: "accessToken",  label: "Access Token",  type: "password", required: false },
  { key: "refreshToken", label: "Refresh Token", type: "password", required: true },
]);

const GITHUB = JSON.stringify([
  { key: "token", label: "Personal Access Token", type: "password", required: true, placeholder: "ghp_..." },
  { key: "owner", label: "Owner / Org",           type: "text",     required: false },
  { key: "repo",  label: "Repository",            type: "text",     required: false },
]);

const SMTP = JSON.stringify([
  { key: "host",   label: "SMTP Host",    type: "text",     required: true,  placeholder: "smtp.zoho.com" },
  { key: "port",   label: "Port",         type: "number",   required: false, placeholder: "465" },
  { key: "secure", label: "Use SSL",      type: "boolean",  required: false },
  { key: "user",   label: "Email",        type: "text",     required: true },
  { key: "pass",   label: "App Password", type: "password", required: true },
]);

// ── Field templates — new capability categories ──────────────────────────────

const APIKEY = JSON.stringify([
  { key: "apiKey", label: "API Key", type: "password", required: true },
]);

const PERPLEXITY_SEARCH = JSON.stringify([
  { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "pplx-..." },
]);

const GOOGLE_SEARCH = JSON.stringify([
  { key: "apiKey",          label: "API Key",           type: "password", required: true },
  { key: "searchEngineId",  label: "Search Engine ID (cx)", type: "text", required: true },
]);

const BING_SEARCH = JSON.stringify([
  { key: "apiKey", label: "Ocp-Apim-Subscription-Key", type: "password", required: true },
]);

const AZURE_VISION = JSON.stringify([
  { key: "endpoint", label: "Endpoint", type: "text",     required: true, placeholder: "https://YOUR_RESOURCE.cognitiveservices.azure.com" },
  { key: "apiKey",   label: "API Key",  type: "password", required: true },
]);

const GOOGLE_VISION = JSON.stringify([
  { key: "apiKey", label: "API Key", type: "password", required: true },
]);

const AWS_TEXTRACT = JSON.stringify([
  { key: "accessKeyId",     label: "Access Key ID",     type: "text",     required: true },
  { key: "secretAccessKey", label: "Secret Access Key", type: "password", required: true },
  { key: "region",          label: "Region",            type: "text",     required: true, placeholder: "us-east-1" },
]);

const TESSERACT_OCR = JSON.stringify([
  { key: "baseUrl", label: "Service URL", type: "text", required: true, placeholder: "http://localhost:8884" },
]);

const OPENAI_IMAGE = JSON.stringify([
  { key: "apiKey", label: "OpenAI API Key", type: "password", required: true },
  { key: "model",  label: "Model",          type: "text",     required: false, placeholder: "dall-e-3" },
]);

const FLUX_IMAGE = JSON.stringify([
  { key: "apiKey", label: "Together AI API Key", type: "password", required: true },
  { key: "model",  label: "Model",               type: "text",     required: false, placeholder: "black-forest-labs/FLUX.1-schnell-Free" },
]);

const STABILITY_IMAGE = JSON.stringify([
  { key: "apiKey", label: "Stability AI API Key", type: "password", required: true },
]);

const IDEOGRAM_IMAGE = JSON.stringify([
  { key: "apiKey", label: "Ideogram API Key", type: "password", required: true },
]);

const ELEVENLABS = JSON.stringify([
  { key: "apiKey",  label: "API Key",          type: "password", required: true },
  { key: "voiceId", label: "Default Voice ID", type: "text",     required: false, placeholder: "EXAVITQu4vr4xnSDxMaL" },
]);

const OPENAI_TTS = JSON.stringify([
  { key: "apiKey", label: "OpenAI API Key",  type: "password", required: true },
  { key: "voice",  label: "Default Voice",   type: "text",     required: false, placeholder: "alloy" },
]);

const AZURE_SPEECH = JSON.stringify([
  { key: "subscriptionKey", label: "Subscription Key", type: "password", required: true },
  { key: "region",          label: "Region",           type: "text",     required: true, placeholder: "eastus" },
]);

const GOOGLE_TTS = JSON.stringify([
  { key: "apiKey", label: "API Key", type: "password", required: true },
]);

const RUNWAY_FIELDS = JSON.stringify([
  { key: "apiKey", label: "Runway API Key", type: "password", required: true },
]);

const KLING_FIELDS = JSON.stringify([
  { key: "apiKey", label: "Kling API Key", type: "password", required: true },
]);

const PIKA_FIELDS = JSON.stringify([
  { key: "apiKey", label: "Pika API Key", type: "password", required: true },
]);

const SUNO_FIELDS = JSON.stringify([
  { key: "apiKey", label: "Suno API Key", type: "password", required: true },
]);

const UDIO_FIELDS = JSON.stringify([
  { key: "apiKey", label: "Udio API Key", type: "password", required: true },
]);

// ── Adapter type overrides ───────────────────────────────────────────────────

const DB_KEYS = new Set([
  "postgresql","mysql","mssql","oracle","cockroachdb","sqlite","snowflake","bigquery",
  "mariadb","supabase","neon","planetscale","timescaledb","yugabyte","cratedb",
  "amazon-aurora","azure-sql","amazon-redshift","alloydb","tidb","singlestore",
  "vitess","trino","databricks","apache-druid","turso","rethinkdb",
]);

const adapterMap = {
  // SQL databases
  postgresql: ["database", DB], mysql: ["database", DB], mssql: ["database", DB],
  oracle: ["database", DB], cockroachdb: ["database", DB], sqlite: ["database", DB],
  snowflake: ["database", DB], bigquery: ["database", DB], mariadb: ["database", DB],
  supabase: ["database", DB], neon: ["database", DB], planetscale: ["database", DB],
  timescaledb: ["database", DB], yugabyte: ["database", DB], cratedb: ["database", DB],
  "amazon-aurora": ["database", DB], "azure-sql": ["database", DB],
  "amazon-redshift": ["database", DB], alloydb: ["database", DB],
  tidb: ["database", DB], singlestore: ["database", DB], vitess: ["database", DB],
  trino: ["database", DB], databricks: ["database", DB], "apache-druid": ["database", DB],
  turso: ["database", DB], rethinkdb: ["database", DB],
  // NoSQL
  mongodb: ["mongodb", MONGO], "azure-cosmos": ["mongodb", MONGO],
  redis: ["redis", REDIS], upstash: ["redis", REDIS],
  elasticsearch: ["elasticsearch", ES],
  // Files / native protocols
  ssh: ["ssh", SSH], "sftp-generic": ["ssh", SSH],
  // Google
  gdrive: ["gdrive", GDRIVE], gmail: ["gmail", GDRIVE],
  // Code
  github: ["github", GITHUB],
  // Mail
  "zoho-mail": ["zoho-mail", SMTP],
  // Known app adapters that have native code but work via HTTP config
  slack: ["slack", HTTP], jira: ["jira", HTTP], confluence: ["confluence", HTTP],
  notion: ["notion", HTTP], hubspot: ["hubspot", HTTP],
  freshdesk: ["freshdesk", HTTP], zendesk: ["zendesk", HTTP],
  onedrive: ["onedrive", HTTP], dropbox: ["dropbox", HTTP], box: ["box", HTTP],
  // Search
  "perplexity-search": ["perplexity-search", PERPLEXITY_SEARCH],
  "google-search":     ["google-search",     GOOGLE_SEARCH],
  "bing-search":       ["bing-search",       BING_SEARCH],
  // OCR
  "azure-vision":  ["azure-vision",  AZURE_VISION],
  "google-vision": ["google-vision", GOOGLE_VISION],
  "aws-textract":  ["aws-textract",  AWS_TEXTRACT],
  "tesseract-ocr": ["tesseract-ocr", TESSERACT_OCR],
  // Image generation
  "openai-image":     ["openai-image",     OPENAI_IMAGE],
  "flux":             ["flux",             FLUX_IMAGE],
  "stable-diffusion": ["stable-diffusion", STABILITY_IMAGE],
  "ideogram":         ["ideogram",         IDEOGRAM_IMAGE],
  // Speech
  "elevenlabs":   ["elevenlabs",   ELEVENLABS],
  "openai-tts":   ["openai-tts",   OPENAI_TTS],
  "azure-speech": ["azure-speech", AZURE_SPEECH],
  "google-tts":   ["google-tts",   GOOGLE_TTS],
  // Video generation
  "runway": ["runway", RUNWAY_FIELDS],
  "kling":  ["kling",  KLING_FIELDS],
  "pika":   ["pika",   PIKA_FIELDS],
  // Music generation
  "suno": ["suno", SUNO_FIELDS],
  "udio": ["udio", UDIO_FIELDS],
};

// ── All 2654 connector types ─────────────────────────────────────────────────

const ALL = [
  // Database
  { key: "postgresql",        label: "PostgreSQL",          color: "bg-blue-600",    initial: "PG",  cat: "Database" },
  { key: "mysql",             label: "MySQL",               color: "bg-orange-500",  initial: "MY",  cat: "Database" },
  { key: "mssql",             label: "MSSQL",               color: "bg-red-700",     initial: "MS",  cat: "Database" },
  { key: "oracle",            label: "Oracle",              color: "bg-red-600",     initial: "OR",  cat: "Database" },
  { key: "mongodb",           label: "MongoDB",             color: "bg-green-600",   initial: "MG",  cat: "Database" },
  { key: "redis",             label: "Redis",               color: "bg-red-600",     initial: "RD",  cat: "Database" },
  { key: "sqlite",            label: "SQLite",              color: "bg-blue-400",    initial: "SL",  cat: "Database" },
  { key: "snowflake",         label: "Snowflake",           color: "bg-cyan-500",    initial: "SF",  cat: "Database" },
  { key: "bigquery",          label: "BigQuery",            color: "bg-blue-500",    initial: "BQ",  cat: "Database" },
  { key: "cockroachdb",       label: "CockroachDB",         color: "bg-purple-600",  initial: "CR",  cat: "Database" },
  { key: "elasticsearch",     label: "Elasticsearch",       color: "bg-yellow-500",  initial: "ES",  cat: "Database" },
  { key: "dynamodb",          label: "DynamoDB",            color: "bg-orange-500",  initial: "DY",  cat: "Database" },
  { key: "cassandra",         label: "Cassandra",           color: "bg-blue-800",    initial: "CA",  cat: "Database" },
  { key: "mariadb",           label: "MariaDB",             color: "bg-amber-700",   initial: "MA",  cat: "Database" },
  { key: "neo4j",             label: "Neo4j",               color: "bg-blue-600",    initial: "NJ",  cat: "Database" },
  { key: "influxdb",          label: "InfluxDB",            color: "bg-purple-700",  initial: "IF",  cat: "Database" },
  { key: "clickhouse",        label: "ClickHouse",          color: "bg-yellow-600",  initial: "CH",  cat: "Database" },
  { key: "couchdb",           label: "CouchDB",             color: "bg-red-800",     initial: "CO",  cat: "Database" },
  { key: "firestore",         label: "Firestore",           color: "bg-orange-400",  initial: "FS",  cat: "Database" },
  { key: "arangodb",          label: "ArangoDB",            color: "bg-teal-700",    initial: "AR",  cat: "Database" },
  { key: "db2",               label: "IBM Db2",             color: "bg-blue-900",    initial: "D2",  cat: "Database" },
  { key: "teradata",          label: "Teradata",            color: "bg-orange-700",  initial: "TD",  cat: "Database" },
  { key: "duckdb",            label: "DuckDB",              color: "bg-yellow-500",  initial: "DK",  cat: "Database" },
  { key: "supabase",          label: "Supabase",            color: "bg-emerald-600", initial: "SB",  cat: "Database" },
  { key: "neon",              label: "Neon",                color: "bg-green-500",   initial: "NE",  cat: "Database" },
  { key: "planetscale",       label: "PlanetScale",         color: "bg-gray-900",    initial: "PL",  cat: "Database" },
  // CRM & Sales
  { key: "hubspot",           label: "HubSpot",             color: "bg-orange-600",  initial: "H",   cat: "CRM & Sales" },
  { key: "salesforce",        label: "Salesforce",          color: "bg-sky-500",     initial: "SF",  cat: "CRM & Sales" },
  { key: "zoho-crm",          label: "Zoho CRM",            color: "bg-red-600",     initial: "ZC",  cat: "CRM & Sales" },
  { key: "freshdesk",         label: "Freshdesk",           color: "bg-green-500",   initial: "F",   cat: "CRM & Sales" },
  { key: "zendesk",           label: "Zendesk",             color: "bg-emerald-600", initial: "Z",   cat: "CRM & Sales" },
  { key: "bullhorn",          label: "Bullhorn",            color: "bg-orange-500",  initial: "BH",  cat: "CRM & Sales" },
  { key: "pipedrive",         label: "Pipedrive",           color: "bg-green-600",   initial: "PD",  cat: "CRM & Sales" },
  { key: "close-crm",         label: "Close CRM",           color: "bg-blue-500",    initial: "CL",  cat: "CRM & Sales" },
  { key: "copper",            label: "Copper",              color: "bg-teal-500",    initial: "CP",  cat: "CRM & Sales" },
  { key: "activecampaign",    label: "ActiveCampaign",      color: "bg-blue-600",    initial: "AC",  cat: "CRM & Sales" },
  { key: "keap",              label: "Keap",                color: "bg-green-500",   initial: "KP",  cat: "CRM & Sales" },
  { key: "dynamics-crm",      label: "Dynamics 365",        color: "bg-blue-700",    initial: "DC",  cat: "CRM & Sales" },
  { key: "sugarcrm",          label: "SugarCRM",            color: "bg-red-700",     initial: "SC",  cat: "CRM & Sales" },
  { key: "capsule",           label: "Capsule CRM",         color: "bg-cyan-600",    initial: "CA",  cat: "CRM & Sales" },
  { key: "nutshell",          label: "Nutshell",            color: "bg-green-600",   initial: "NU",  cat: "CRM & Sales" },
  { key: "streak",            label: "Streak",              color: "bg-blue-500",    initial: "SK",  cat: "CRM & Sales" },
  // Email & Communication
  { key: "gmail",             label: "Gmail",               color: "bg-red-500",     initial: "G",   cat: "Email & Communication" },
  { key: "zoho-mail",         label: "Zoho Mail",           color: "bg-red-600",     initial: "ZM",  cat: "Email & Communication" },
  { key: "slack",             label: "Slack",               color: "bg-purple-500",  initial: "SL",  cat: "Email & Communication" },
  { key: "teams",             label: "Microsoft Teams",     color: "bg-violet-700",  initial: "MT",  cat: "Email & Communication" },
  { key: "outlook",           label: "Outlook",             color: "bg-blue-600",    initial: "OL",  cat: "Email & Communication" },
  { key: "twilio",            label: "Twilio",              color: "bg-red-500",     initial: "TW",  cat: "Email & Communication" },
  { key: "discord",           label: "Discord",             color: "bg-indigo-500",  initial: "DS",  cat: "Email & Communication" },
  { key: "telegram",          label: "Telegram",            color: "bg-blue-400",    initial: "TG",  cat: "Email & Communication" },
  { key: "whatsapp-business", label: "WhatsApp Business",   color: "bg-green-500",   initial: "WA",  cat: "Email & Communication" },
  { key: "intercom",          label: "Intercom",            color: "bg-blue-500",    initial: "IC",  cat: "Email & Communication" },
  { key: "drift",             label: "Drift",               color: "bg-blue-600",    initial: "DF",  cat: "Email & Communication" },
  { key: "crisp",             label: "Crisp",               color: "bg-indigo-400",  initial: "CR",  cat: "Email & Communication" },
  { key: "messagebird",       label: "MessageBird",         color: "bg-blue-500",    initial: "MB",  cat: "Email & Communication" },
  { key: "vonage",            label: "Vonage",              color: "bg-purple-600",  initial: "VG",  cat: "Email & Communication" },
  { key: "bandwidth",         label: "Bandwidth",           color: "bg-blue-700",    initial: "BW",  cat: "Email & Communication" },
  // Cloud Storage
  { key: "gdrive",            label: "Google Drive",        color: "bg-yellow-500",  initial: "GD",  cat: "Cloud Storage" },
  { key: "onedrive",          label: "OneDrive",            color: "bg-blue-600",    initial: "OD",  cat: "Cloud Storage" },
  { key: "dropbox",           label: "Dropbox",             color: "bg-blue-500",    initial: "DB",  cat: "Cloud Storage" },
  { key: "box",               label: "Box",                 color: "bg-blue-700",    initial: "BX",  cat: "Cloud Storage" },
  { key: "sharepoint",        label: "SharePoint",          color: "bg-blue-700",    initial: "SP",  cat: "Cloud Storage" },
  { key: "aws-s3",            label: "Amazon S3",           color: "bg-orange-500",  initial: "S3",  cat: "Cloud Storage" },
  { key: "azure-blob",        label: "Azure Blob",          color: "bg-blue-600",    initial: "AZ",  cat: "Cloud Storage" },
  { key: "gcs",               label: "Google Cloud",        color: "bg-blue-500",    initial: "GC",  cat: "Cloud Storage" },
  // Developer Tools
  { key: "rest-api",          label: "REST API",            color: "bg-purple-600",  initial: "R",   cat: "Developer Tools" },
  { key: "github",            label: "GitHub",              color: "bg-gray-900",    initial: "GH",  cat: "Developer Tools" },
  { key: "gitlab",            label: "GitLab",              color: "bg-orange-600",  initial: "GL",  cat: "Developer Tools" },
  { key: "bitbucket",         label: "Bitbucket",           color: "bg-blue-600",    initial: "BT",  cat: "Developer Tools" },
  { key: "jira",              label: "Jira",                color: "bg-indigo-500",  initial: "J",   cat: "Developer Tools" },
  { key: "confluence",        label: "Confluence",          color: "bg-blue-500",    initial: "CF",  cat: "Developer Tools" },
  { key: "notion",            label: "Notion",              color: "bg-gray-800",    initial: "N",   cat: "Developer Tools" },
  { key: "ssh",               label: "SSH",                 color: "bg-gray-800",    initial: "SSH", cat: "Developer Tools" },
  { key: "jenkins",           label: "Jenkins",             color: "bg-red-600",     initial: "JK",  cat: "Developer Tools" },
  { key: "circleci",          label: "CircleCI",            color: "bg-gray-800",    initial: "CI",  cat: "Developer Tools" },
  { key: "datadog",           label: "Datadog",             color: "bg-purple-600",  initial: "DD",  cat: "Developer Tools" },
  // Project Management
  { key: "trello",            label: "Trello",              color: "bg-blue-500",    initial: "TR",  cat: "Project Management" },
  { key: "asana",             label: "Asana",               color: "bg-pink-500",    initial: "AS",  cat: "Project Management" },
  { key: "monday",            label: "Monday.com",          color: "bg-red-500",     initial: "MN",  cat: "Project Management" },
  { key: "linear",            label: "Linear",              color: "bg-indigo-600",  initial: "LN",  cat: "Project Management" },
  { key: "basecamp",          label: "Basecamp",            color: "bg-green-600",   initial: "BC",  cat: "Project Management" },
  { key: "clickup",           label: "ClickUp",             color: "bg-purple-600",  initial: "CU",  cat: "Project Management" },
  { key: "wrike",             label: "Wrike",               color: "bg-green-600",   initial: "WK",  cat: "Project Management" },
  { key: "smartsheet",        label: "Smartsheet",          color: "bg-blue-600",    initial: "SS",  cat: "Project Management" },
  { key: "airtable",          label: "Airtable",            color: "bg-yellow-500",  initial: "AT",  cat: "Project Management" },
  { key: "height",            label: "Height",              color: "bg-gray-800",    initial: "HT",  cat: "Project Management" },
  // Marketing
  { key: "mailchimp",         label: "Mailchimp",           color: "bg-yellow-500",  initial: "MC",  cat: "Marketing" },
  { key: "sendgrid",          label: "SendGrid",            color: "bg-blue-500",    initial: "SG",  cat: "Marketing" },
  { key: "klaviyo",           label: "Klaviyo",             color: "bg-green-600",   initial: "KL",  cat: "Marketing" },
  { key: "marketo",           label: "Marketo",             color: "bg-purple-700",  initial: "MK",  cat: "Marketing" },
  { key: "brevo",             label: "Brevo",               color: "bg-teal-600",    initial: "BV",  cat: "Marketing" },
  { key: "constant-contact",  label: "Constant Contact",    color: "bg-blue-600",    initial: "CT",  cat: "Marketing" },
  { key: "drip",              label: "Drip",                color: "bg-indigo-500",  initial: "DP",  cat: "Marketing" },
  { key: "convertkit",        label: "ConvertKit",          color: "bg-red-500",     initial: "CK",  cat: "Marketing" },
  { key: "campaign-monitor",  label: "Campaign Monitor",    color: "bg-blue-600",    initial: "CM",  cat: "Marketing" },
  { key: "mailerlite",        label: "MailerLite",          color: "bg-green-500",   initial: "ML",  cat: "Marketing" },
  // HR & Payroll
  { key: "bamboohr",          label: "BambooHR",            color: "bg-green-600",   initial: "BM",  cat: "HR & Payroll" },
  { key: "workday",           label: "Workday",             color: "bg-orange-600",  initial: "WY",  cat: "HR & Payroll" },
  { key: "adp",               label: "ADP",                 color: "bg-red-600",     initial: "AD",  cat: "HR & Payroll" },
  { key: "gusto",             label: "Gusto",               color: "bg-green-500",   initial: "GS",  cat: "HR & Payroll" },
  { key: "rippling",          label: "Rippling",            color: "bg-yellow-600",  initial: "RL",  cat: "HR & Payroll" },
  { key: "personio",          label: "Personio",            color: "bg-blue-500",    initial: "PE",  cat: "HR & Payroll" },
  { key: "hibob",             label: "HiBob",               color: "bg-blue-600",    initial: "HB",  cat: "HR & Payroll" },
  { key: "namely",            label: "Namely",              color: "bg-teal-600",    initial: "NM",  cat: "HR & Payroll" },
  // Finance & Accounting
  { key: "quickbooks",        label: "QuickBooks",          color: "bg-green-600",   initial: "QB",  cat: "Finance & Accounting" },
  { key: "xero",              label: "Xero",                color: "bg-blue-500",    initial: "XR",  cat: "Finance & Accounting" },
  { key: "freshbooks",        label: "FreshBooks",          color: "bg-blue-600",    initial: "FN",  cat: "Finance & Accounting" },
  { key: "wave",              label: "Wave",                color: "bg-blue-400",    initial: "WV",  cat: "Finance & Accounting" },
  { key: "zoho-books",        label: "Zoho Books",          color: "bg-red-500",     initial: "ZB",  cat: "Finance & Accounting" },
  { key: "netsuite",          label: "NetSuite",            color: "bg-orange-600",  initial: "NS",  cat: "Finance & Accounting" },
  { key: "sage",              label: "Sage",                color: "bg-green-700",   initial: "SE",  cat: "Finance & Accounting" },
  // E-commerce
  { key: "shopify",           label: "Shopify",             color: "bg-green-600",   initial: "SH",  cat: "E-commerce" },
  { key: "woocommerce",       label: "WooCommerce",         color: "bg-purple-600",  initial: "WO",  cat: "E-commerce" },
  { key: "bigcommerce",       label: "BigCommerce",         color: "bg-blue-700",    initial: "BG",  cat: "E-commerce" },
  { key: "stripe",            label: "Stripe",              color: "bg-indigo-600",  initial: "ST",  cat: "E-commerce" },
  { key: "square",            label: "Square",              color: "bg-gray-900",    initial: "SQ",  cat: "E-commerce" },
  { key: "paypal",            label: "PayPal",              color: "bg-blue-700",    initial: "PP",  cat: "E-commerce" },
  { key: "magento",           label: "Magento",             color: "bg-orange-600",  initial: "MG",  cat: "E-commerce" },
  // Analytics
  { key: "mixpanel",          label: "Mixpanel",            color: "bg-purple-600",  initial: "MX",  cat: "Analytics" },
  { key: "amplitude",         label: "Amplitude",           color: "bg-blue-600",    initial: "AP",  cat: "Analytics" },
  { key: "segment",           label: "Segment",             color: "bg-green-600",   initial: "SG",  cat: "Analytics" },
  { key: "heap",              label: "Heap",                color: "bg-purple-500",  initial: "HP",  cat: "Analytics" },
  { key: "posthog",           label: "PostHog",             color: "bg-orange-500",  initial: "PH",  cat: "Analytics" },
  { key: "google-analytics",  label: "Google Analytics",    color: "bg-orange-500",  initial: "GA",  cat: "Analytics" },
  { key: "tableau",           label: "Tableau",             color: "bg-blue-700",    initial: "TB",  cat: "Analytics" },
  // Observability & ITSM
  { key: "sentry",            label: "Sentry",              color: "bg-purple-700",  initial: "SY",  cat: "Observability" },
  { key: "pagerduty",         label: "PagerDuty",           color: "bg-green-600",   initial: "PG",  cat: "Observability" },
  { key: "newrelic",          label: "New Relic",           color: "bg-blue-500",    initial: "NR",  cat: "Observability" },
  { key: "splunk",            label: "Splunk",              color: "bg-orange-500",  initial: "SP",  cat: "Observability" },
  { key: "servicenow",        label: "ServiceNow",          color: "bg-green-600",   initial: "SN",  cat: "Observability" },
  { key: "opsgenie",          label: "Opsgenie",            color: "bg-blue-500",    initial: "OG",  cat: "Observability" },
  { key: "grafana",           label: "Grafana",             color: "bg-orange-600",  initial: "GF",  cat: "Observability" },
  { key: "kibana",            label: "Kibana",              color: "bg-pink-600",    initial: "KB",  cat: "Observability" },
  // CRM & Sales — additional
  { key: "insightly",         label: "Insightly",           color: "bg-blue-500",    initial: "IN",  cat: "CRM & Sales" },
  { key: "highlevel",         label: "HighLevel",           color: "bg-orange-500",  initial: "HL",  cat: "CRM & Sales" },
  { key: "agile-crm",         label: "Agile CRM",           color: "bg-red-500",     initial: "AG",  cat: "CRM & Sales" },
  { key: "vtiger",            label: "Vtiger",              color: "bg-blue-700",    initial: "VT",  cat: "CRM & Sales" },
  { key: "apptivo",           label: "Apptivo",             color: "bg-red-600",     initial: "AP",  cat: "CRM & Sales" },
  { key: "freshsales",        label: "Freshsales",          color: "bg-teal-500",    initial: "FS",  cat: "CRM & Sales" },
  { key: "salesloft",         label: "Salesloft",           color: "bg-blue-600",    initial: "SL",  cat: "CRM & Sales" },
  { key: "outreach",          label: "Outreach",            color: "bg-purple-600",  initial: "OR",  cat: "CRM & Sales" },
  { key: "monday-crm",        label: "Monday CRM",          color: "bg-red-500",     initial: "MC",  cat: "CRM & Sales" },
  { key: "sap-crm",           label: "SAP CRM",             color: "bg-blue-800",    initial: "SC",  cat: "CRM & Sales" },
  // Email & Communication — additional
  { key: "zoom",              label: "Zoom",                color: "bg-blue-500",    initial: "ZM",  cat: "Email & Communication" },
  { key: "google-chat",       label: "Google Chat",         color: "bg-green-500",   initial: "GC",  cat: "Email & Communication" },
  { key: "rocketchat",        label: "Rocket.Chat",         color: "bg-red-600",     initial: "RC",  cat: "Email & Communication" },
  { key: "mattermost",        label: "Mattermost",          color: "bg-blue-700",    initial: "MM",  cat: "Email & Communication" },
  { key: "signal",            label: "Signal",              color: "bg-blue-500",    initial: "SI",  cat: "Email & Communication" },
  { key: "skype",             label: "Skype",               color: "bg-blue-500",    initial: "SK",  cat: "Email & Communication" },
  { key: "webex",             label: "Webex",               color: "bg-blue-700",    initial: "WX",  cat: "Email & Communication" },
  { key: "ringcentral",       label: "RingCentral",         color: "bg-orange-500",  initial: "RG",  cat: "Email & Communication" },
  { key: "aircall",           label: "Aircall",             color: "bg-green-500",   initial: "AC",  cat: "Email & Communication" },
  { key: "zoom-phone",        label: "Zoom Phone",          color: "bg-blue-600",    initial: "ZP",  cat: "Email & Communication" },
  { key: "facebook-messenger",label: "FB Messenger",        color: "bg-blue-600",    initial: "FM",  cat: "Email & Communication" },
  { key: "line",              label: "LINE",                color: "bg-green-500",   initial: "LN",  cat: "Email & Communication" },
  // Cloud Storage — additional
  { key: "backblaze",         label: "Backblaze B2",        color: "bg-red-500",     initial: "BB",  cat: "Cloud Storage" },
  { key: "wasabi",            label: "Wasabi",              color: "bg-green-600",   initial: "WS",  cat: "Cloud Storage" },
  { key: "cloudflare-r2",     label: "Cloudflare R2",       color: "bg-orange-500",  initial: "R2",  cat: "Cloud Storage" },
  { key: "icloud",            label: "iCloud",              color: "bg-blue-400",    initial: "iC",  cat: "Cloud Storage" },
  { key: "mega",              label: "Mega",                color: "bg-red-600",     initial: "MG",  cat: "Cloud Storage" },
  { key: "pcloud",            label: "pCloud",              color: "bg-blue-500",    initial: "PC",  cat: "Cloud Storage" },
  { key: "nextcloud",         label: "Nextcloud",           color: "bg-blue-600",    initial: "NC",  cat: "Cloud Storage" },
  { key: "owncloud",          label: "ownCloud",            color: "bg-gray-600",    initial: "OC",  cat: "Cloud Storage" },
  { key: "minio",             label: "MinIO",               color: "bg-red-500",     initial: "MN",  cat: "Cloud Storage" },
  { key: "do-spaces",         label: "DO Spaces",           color: "bg-blue-500",    initial: "DS",  cat: "Cloud Storage" },
  { key: "openstack-swift",   label: "OpenStack Swift",     color: "bg-red-700",     initial: "OS",  cat: "Cloud Storage" },
  { key: "synology-nas",      label: "Synology NAS",        color: "bg-gray-700",    initial: "SY",  cat: "Cloud Storage" },
  // Developer Tools — additional
  { key: "azure-devops",      label: "Azure DevOps",        color: "bg-blue-600",    initial: "AD",  cat: "Developer Tools" },
  { key: "docker",            label: "Docker",              color: "bg-blue-500",    initial: "DK",  cat: "Developer Tools" },
  { key: "kubernetes",        label: "Kubernetes",          color: "bg-blue-600",    initial: "K8",  cat: "Developer Tools" },
  { key: "terraform",         label: "Terraform",           color: "bg-purple-600",  initial: "TF",  cat: "Developer Tools" },
  { key: "ansible",           label: "Ansible",             color: "bg-gray-800",    initial: "AN",  cat: "Developer Tools" },
  { key: "prometheus",        label: "Prometheus",          color: "bg-orange-600",  initial: "PM",  cat: "Developer Tools" },
  { key: "travis-ci",         label: "Travis CI",           color: "bg-red-600",     initial: "TR",  cat: "Developer Tools" },
  { key: "teamcity",          label: "TeamCity",            color: "bg-blue-700",    initial: "TC",  cat: "Developer Tools" },
  { key: "argocd",            label: "Argo CD",             color: "bg-orange-500",  initial: "AR",  cat: "Developer Tools" },
  { key: "harbor",            label: "Harbor",              color: "bg-blue-600",    initial: "HB",  cat: "Developer Tools" },
  { key: "sonarqube",         label: "SonarQube",           color: "bg-blue-500",    initial: "SQ",  cat: "Developer Tools" },
  { key: "jfrog",             label: "JFrog",               color: "bg-green-600",   initial: "JF",  cat: "Developer Tools" },
  { key: "backstage",         label: "Backstage",           color: "bg-gray-800",    initial: "BS",  cat: "Developer Tools" },
  // Project Management — additional
  { key: "todoist",           label: "Todoist",             color: "bg-red-500",     initial: "TD",  cat: "Project Management" },
  { key: "ms-planner",        label: "MS Planner",          color: "bg-blue-600",    initial: "MP",  cat: "Project Management" },
  { key: "redmine",           label: "Redmine",             color: "bg-red-700",     initial: "RM",  cat: "Project Management" },
  { key: "taiga",             label: "Taiga",               color: "bg-teal-600",    initial: "TG",  cat: "Project Management" },
  { key: "shortcut",          label: "Shortcut",            color: "bg-purple-600",  initial: "SC",  cat: "Project Management" },
  { key: "hive-pm",           label: "Hive",                color: "bg-yellow-500",  initial: "HV",  cat: "Project Management" },
  { key: "proofhub",          label: "ProofHub",            color: "bg-orange-500",  initial: "PH",  cat: "Project Management" },
  { key: "teamwork",          label: "Teamwork",            color: "bg-blue-600",    initial: "TW",  cat: "Project Management" },
  { key: "youtrack",          label: "YouTrack",            color: "bg-blue-500",    initial: "YT",  cat: "Project Management" },
  { key: "ntask",             label: "nTask",               color: "bg-teal-500",    initial: "NT",  cat: "Project Management" },
  // Marketing — additional
  { key: "hubspot-marketing", label: "HubSpot Marketing",   color: "bg-orange-500",  initial: "HM",  cat: "Marketing" },
  { key: "customer-io",       label: "Customer.io",         color: "bg-green-600",   initial: "CI",  cat: "Marketing" },
  { key: "braze",             label: "Braze",               color: "bg-blue-600",    initial: "BZ",  cat: "Marketing" },
  { key: "iterable",          label: "Iterable",            color: "bg-purple-600",  initial: "IT",  cat: "Marketing" },
  { key: "omnisend",          label: "Omnisend",            color: "bg-blue-500",    initial: "OM",  cat: "Marketing" },
  { key: "moengage",          label: "MoEngage",            color: "bg-blue-600",    initial: "ME",  cat: "Marketing" },
  { key: "clevertap",         label: "CleverTap",           color: "bg-orange-500",  initial: "CT",  cat: "Marketing" },
  { key: "adobe-campaign",    label: "Adobe Campaign",      color: "bg-red-600",     initial: "AC",  cat: "Marketing" },
  { key: "eloqua",            label: "Eloqua",              color: "bg-red-500",     initial: "EQ",  cat: "Marketing" },
  { key: "unbounce",          label: "Unbounce",            color: "bg-blue-500",    initial: "UB",  cat: "Marketing" },
  // Finance & Accounting — additional
  { key: "razorpay",          label: "Razorpay",            color: "bg-blue-500",    initial: "RZ",  cat: "Finance & Accounting" },
  { key: "adyen",             label: "Adyen",               color: "bg-green-700",   initial: "AY",  cat: "Finance & Accounting" },
  { key: "braintree",         label: "Braintree",           color: "bg-blue-600",    initial: "BT",  cat: "Finance & Accounting" },
  { key: "authorizenet",      label: "Authorize.net",       color: "bg-blue-700",    initial: "AZ",  cat: "Finance & Accounting" },
  { key: "wise",              label: "Wise",                color: "bg-green-500",   initial: "WI",  cat: "Finance & Accounting" },
  { key: "revolut",           label: "Revolut",             color: "bg-gray-900",    initial: "RV",  cat: "Finance & Accounting" },
  { key: "plaid",             label: "Plaid",               color: "bg-blue-600",    initial: "PL",  cat: "Finance & Accounting" },
  { key: "sap-finance",       label: "SAP Finance",         color: "bg-blue-700",    initial: "SF",  cat: "Finance & Accounting" },
  { key: "oracle-erp",        label: "Oracle ERP",          color: "bg-red-600",     initial: "OE",  cat: "Finance & Accounting" },
  { key: "chargebee",         label: "Chargebee",           color: "bg-orange-500",  initial: "CB",  cat: "Finance & Accounting" },
  // Analytics — additional
  { key: "power-bi",          label: "Power BI",            color: "bg-yellow-500",  initial: "PB",  cat: "Analytics" },
  { key: "looker",            label: "Looker",              color: "bg-blue-500",    initial: "LK",  cat: "Analytics" },
  { key: "metabase",          label: "Metabase",            color: "bg-blue-600",    initial: "MB",  cat: "Analytics" },
  { key: "redash",            label: "Redash",              color: "bg-red-500",     initial: "RD",  cat: "Analytics" },
  { key: "superset",          label: "Superset",            color: "bg-red-600",     initial: "SS",  cat: "Analytics" },
  { key: "qlik",              label: "Qlik",                color: "bg-green-600",   initial: "QL",  cat: "Analytics" },
  { key: "domo",              label: "Domo",                color: "bg-blue-600",    initial: "DM",  cat: "Analytics" },
  { key: "kissmetrics",       label: "Kissmetrics",         color: "bg-purple-600",  initial: "KM",  cat: "Analytics" },
  { key: "matomo",            label: "Matomo",              color: "bg-blue-700",    initial: "MT",  cat: "Analytics" },
  { key: "hotjar",            label: "Hotjar",              color: "bg-orange-500",  initial: "HJ",  cat: "Analytics" },
  { key: "fullstory",         label: "FullStory",           color: "bg-purple-600",  initial: "FS",  cat: "Analytics" },
  { key: "plausible",         label: "Plausible",           color: "bg-gray-800",    initial: "PA",  cat: "Analytics" },
  { key: "fathom",            label: "Fathom",              color: "bg-teal-600",    initial: "FA",  cat: "Analytics" },
  // AI & ML
  { key: "openai",            label: "OpenAI",              color: "bg-gray-900",    initial: "OA",  cat: "AI & ML" },
  { key: "anthropic",         label: "Anthropic",           color: "bg-orange-600",  initial: "AN",  cat: "AI & ML" },
  { key: "cohere",            label: "Cohere",              color: "bg-blue-600",    initial: "CO",  cat: "AI & ML" },
  { key: "mistral",           label: "Mistral AI",          color: "bg-orange-500",  initial: "MS",  cat: "AI & ML" },
  { key: "hugging-face",      label: "Hugging Face",        color: "bg-yellow-500",  initial: "HF",  cat: "AI & ML" },
  { key: "vertex-ai",         label: "Vertex AI",           color: "bg-blue-500",    initial: "VA",  cat: "AI & ML" },
  { key: "azure-openai",      label: "Azure OpenAI",        color: "bg-blue-600",    initial: "AO",  cat: "AI & ML" },
  { key: "amazon-bedrock",    label: "Amazon Bedrock",      color: "bg-orange-600",  initial: "BR",  cat: "AI & ML" },
  { key: "ollama",            label: "Ollama",              color: "bg-gray-800",    initial: "OL",  cat: "AI & ML" },
  { key: "langchain",         label: "LangChain",           color: "bg-green-600",   initial: "LC",  cat: "AI & ML" },
  { key: "llamaindex",        label: "LlamaIndex",          color: "bg-purple-600",  initial: "LI",  cat: "AI & ML" },
  { key: "pinecone",          label: "Pinecone",            color: "bg-green-600",   initial: "PC",  cat: "AI & ML" },
  { key: "weaviate",          label: "Weaviate",            color: "bg-green-700",   initial: "WV",  cat: "AI & ML" },
  { key: "milvus",            label: "Milvus",              color: "bg-blue-500",    initial: "MV",  cat: "AI & ML" },
  { key: "chroma",            label: "Chroma",              color: "bg-orange-500",  initial: "CH",  cat: "AI & ML" },
  { key: "replicate",         label: "Replicate",           color: "bg-gray-800",    initial: "RP",  cat: "AI & ML" },
  { key: "runpod",            label: "RunPod",              color: "bg-purple-600",  initial: "RN",  cat: "AI & ML" },
  { key: "together-ai",       label: "Together AI",         color: "bg-blue-600",    initial: "TA",  cat: "AI & ML" },
  { key: "perplexity",        label: "Perplexity",          color: "bg-blue-700",    initial: "PX",  cat: "AI & ML" },
  { key: "deepseek",          label: "DeepSeek",            color: "bg-blue-800",    initial: "DS",  cat: "AI & ML" },
  { key: "groq-ai",           label: "Groq",                color: "bg-orange-500",  initial: "GQ",  cat: "AI & ML" },
  { key: "fireworks-ai",      label: "Fireworks AI",        color: "bg-orange-600",  initial: "FW",  cat: "AI & ML" },
  { key: "modal-com",         label: "Modal",               color: "bg-green-600",   initial: "MD",  cat: "AI & ML" },
  { key: "cerebras",          label: "Cerebras",            color: "bg-blue-700",    initial: "CB",  cat: "AI & ML" },
  { key: "nvidia-nim",        label: "NVIDIA NIM",          color: "bg-green-600",   initial: "NV",  cat: "AI & ML" },
  { key: "aws-sagemaker",     label: "SageMaker",           color: "bg-orange-500",  initial: "SM",  cat: "AI & ML" },
  { key: "azure-ml",          label: "Azure ML",            color: "bg-blue-600",    initial: "AM",  cat: "AI & ML" },
  { key: "google-automl",     label: "Google AutoML",       color: "bg-blue-500",    initial: "GA",  cat: "AI & ML" },
  { key: "databricks-ml",     label: "Databricks ML",       color: "bg-red-600",     initial: "DB",  cat: "AI & ML" },
  { key: "mlflow",            label: "MLflow",              color: "bg-blue-500",    initial: "ML",  cat: "AI & ML" },
  { key: "weights-biases",    label: "Weights & Biases",    color: "bg-yellow-500",  initial: "WB",  cat: "AI & ML" },
  { key: "comet-ml",          label: "Comet ML",            color: "bg-purple-600",  initial: "CM",  cat: "AI & ML" },
  { key: "label-studio",      label: "Label Studio",        color: "bg-blue-600",    initial: "LS",  cat: "AI & ML" },
  { key: "scale-ai",          label: "Scale AI",            color: "bg-red-600",     initial: "SC",  cat: "AI & ML" },
  { key: "roboflow",          label: "Roboflow",            color: "bg-purple-500",  initial: "RF",  cat: "AI & ML" },
  { key: "activeloop",        label: "Activeloop",          color: "bg-orange-500",  initial: "AL",  cat: "AI & ML" },
  { key: "qdrant",            label: "Qdrant",              color: "bg-red-500",     initial: "QD",  cat: "AI & ML" },
  { key: "zilliz",            label: "Zilliz Cloud",        color: "bg-blue-600",    initial: "ZL",  cat: "AI & ML" },
  { key: "marqo",             label: "Marqo",               color: "bg-blue-700",    initial: "MQ",  cat: "AI & ML" },
  { key: "vectara",           label: "Vectara",             color: "bg-purple-600",  initial: "VC",  cat: "AI & ML" },
  // More Databases
  { key: "timescaledb",       label: "TimescaleDB",         color: "bg-orange-500",  initial: "TS",  cat: "Database" },
  { key: "yugabyte",          label: "YugabyteDB",          color: "bg-blue-600",    initial: "YG",  cat: "Database" },
  { key: "cratedb",           label: "CrateDB",             color: "bg-teal-600",    initial: "CR",  cat: "Database" },
  { key: "rethinkdb",         label: "RethinkDB",           color: "bg-blue-800",    initial: "RD",  cat: "Database" },
  { key: "surrealdb",         label: "SurrealDB",           color: "bg-gray-900",    initial: "SU",  cat: "Database" },
  { key: "upstash",           label: "Upstash",             color: "bg-green-500",   initial: "UP",  cat: "Database" },
  { key: "singlestore",       label: "SingleStore",         color: "bg-purple-600",  initial: "SS",  cat: "Database" },
  { key: "tidb",              label: "TiDB",                color: "bg-red-500",     initial: "TD",  cat: "Database" },
  { key: "questdb",           label: "QuestDB",             color: "bg-gray-800",    initial: "QD",  cat: "Database" },
  { key: "scylladb",          label: "ScyllaDB",            color: "bg-blue-700",    initial: "SC",  cat: "Database" },
  { key: "memcached",         label: "Memcached",           color: "bg-green-700",   initial: "MC",  cat: "Database" },
  { key: "hazelcast",         label: "Hazelcast",           color: "bg-blue-600",    initial: "HZ",  cat: "Database" },
  { key: "amazon-aurora",     label: "Amazon Aurora",       color: "bg-orange-500",  initial: "AU",  cat: "Database" },
  { key: "amazon-redshift",   label: "Amazon Redshift",     color: "bg-orange-600",  initial: "AR",  cat: "Database" },
  { key: "azure-sql",         label: "Azure SQL",           color: "bg-blue-600",    initial: "AZ",  cat: "Database" },
  { key: "azure-cosmos",      label: "Azure Cosmos DB",     color: "bg-blue-500",    initial: "AC",  cat: "Database" },
  { key: "cloud-spanner",     label: "Cloud Spanner",       color: "bg-blue-500",    initial: "CS",  cat: "Database" },
  { key: "alloydb",           label: "AlloyDB",             color: "bg-blue-600",    initial: "AL",  cat: "Database" },
  { key: "turso",             label: "Turso",               color: "bg-green-500",   initial: "TU",  cat: "Database" },
  { key: "pocketbase",        label: "PocketBase",          color: "bg-gray-800",    initial: "PB",  cat: "Database" },
  { key: "fauna",             label: "Fauna",               color: "bg-purple-600",  initial: "FN",  cat: "Database" },
  { key: "edgedb",            label: "EdgeDB",              color: "bg-gray-800",    initial: "ED",  cat: "Database" },
  { key: "vitess",            label: "Vitess",              color: "bg-blue-500",    initial: "VT",  cat: "Database" },
  { key: "trino",             label: "Trino",               color: "bg-blue-500",    initial: "TR",  cat: "Database" },
  { key: "databricks",        label: "Databricks",          color: "bg-red-600",     initial: "DB",  cat: "Database" },
  { key: "apache-druid",      label: "Apache Druid",        color: "bg-blue-600",    initial: "DR",  cat: "Database" },
  { key: "apache-hbase",      label: "Apache HBase",        color: "bg-orange-500",  initial: "HB",  cat: "Database" },
  { key: "apache-kafka",      label: "Apache Kafka",        color: "bg-gray-900",    initial: "KF",  cat: "Database" },
  { key: "apache-pulsar",     label: "Apache Pulsar",       color: "bg-purple-600",  initial: "PL",  cat: "Database" },
  { key: "ravendb",           label: "RavenDB",             color: "bg-blue-700",    initial: "RV",  cat: "Database" },
  { key: "foundationdb",      label: "FoundationDB",        color: "bg-red-700",     initial: "FD",  cat: "Database" },
  // More CRM & Sales
  { key: "zoho-bigin",        label: "Zoho Bigin",          color: "bg-red-500",     initial: "ZB",  cat: "CRM & Sales" },
  { key: "nethunt-crm",       label: "NetHunt CRM",         color: "bg-orange-500",  initial: "NH",  cat: "CRM & Sales" },
  { key: "kommo",             label: "Kommo",               color: "bg-green-500",   initial: "KO",  cat: "CRM & Sales" },
  { key: "salesmate",         label: "Salesmate",           color: "bg-blue-500",    initial: "SM",  cat: "CRM & Sales" },
  { key: "gong-io",           label: "Gong",                color: "bg-blue-700",    initial: "GO",  cat: "CRM & Sales" },
  { key: "chorus-ai",         label: "Chorus.ai",           color: "bg-purple-600",  initial: "CH",  cat: "CRM & Sales" },
  { key: "apollo-io",         label: "Apollo.io",           color: "bg-blue-600",    initial: "AP",  cat: "CRM & Sales" },
  { key: "zoominfo",          label: "ZoomInfo",            color: "bg-blue-700",    initial: "ZI",  cat: "CRM & Sales" },
  { key: "clearbit",          label: "Clearbit",            color: "bg-blue-500",    initial: "CB",  cat: "CRM & Sales" },
  { key: "leadsquared",       label: "LeadSquared",         color: "bg-orange-500",  initial: "LS",  cat: "CRM & Sales" },
  { key: "nimble",            label: "Nimble",              color: "bg-blue-500",    initial: "NB",  cat: "CRM & Sales" },
  { key: "lusha",             label: "Lusha",               color: "bg-purple-500",  initial: "LU",  cat: "CRM & Sales" },
  { key: "attio",             label: "Attio",               color: "bg-gray-800",    initial: "AT",  cat: "CRM & Sales" },
  { key: "affinity",          label: "Affinity",            color: "bg-blue-600",    initial: "AF",  cat: "CRM & Sales" },
  { key: "twenty-crm",        label: "Twenty CRM",          color: "bg-gray-900",    initial: "TW",  cat: "CRM & Sales" },
  { key: "hunter-io",         label: "Hunter.io",           color: "bg-orange-500",  initial: "HT",  cat: "CRM & Sales" },
  { key: "reply-io",          label: "Reply.io",            color: "bg-blue-600",    initial: "RP",  cat: "CRM & Sales" },
  { key: "lemlist",           label: "Lemlist",             color: "bg-orange-500",  initial: "LM",  cat: "CRM & Sales" },
  { key: "instantly-ai",      label: "Instantly",           color: "bg-blue-500",    initial: "IN",  cat: "CRM & Sales" },
  { key: "smartlead",         label: "Smartlead",           color: "bg-purple-500",  initial: "SL",  cat: "CRM & Sales" },
  // More Email & Communication
  { key: "postmark",          label: "Postmark",            color: "bg-yellow-500",  initial: "PM",  cat: "Email & Communication" },
  { key: "mailgun",           label: "Mailgun",             color: "bg-red-500",     initial: "MG",  cat: "Email & Communication" },
  { key: "sparkpost",         label: "SparkPost",           color: "bg-orange-500",  initial: "SP",  cat: "Email & Communication" },
  { key: "amazon-ses",        label: "Amazon SES",          color: "bg-orange-500",  initial: "SE",  cat: "Email & Communication" },
  { key: "mandrill",          label: "Mandrill",            color: "bg-yellow-600",  initial: "MD",  cat: "Email & Communication" },
  { key: "loops-so",          label: "Loops",               color: "bg-blue-500",    initial: "LP",  cat: "Email & Communication" },
  { key: "buttondown",        label: "Buttondown",          color: "bg-blue-600",    initial: "BD",  cat: "Email & Communication" },
  { key: "beehiiv",           label: "Beehiiv",             color: "bg-yellow-500",  initial: "BH",  cat: "Email & Communication" },
  { key: "flodesk",           label: "Flodesk",             color: "bg-pink-500",    initial: "FD",  cat: "Email & Communication" },
  { key: "helpscout",         label: "Help Scout",          color: "bg-green-600",   initial: "HS",  cat: "Email & Communication" },
  { key: "front-app",         label: "Front",               color: "bg-pink-500",    initial: "FR",  cat: "Email & Communication" },
  { key: "missive",           label: "Missive",             color: "bg-blue-600",    initial: "MV",  cat: "Email & Communication" },
  { key: "superhuman",        label: "Superhuman",          color: "bg-orange-500",  initial: "SH",  cat: "Email & Communication" },
  { key: "freshchat",         label: "Freshchat",           color: "bg-teal-500",    initial: "FC",  cat: "Email & Communication" },
  { key: "tidio",             label: "Tidio",               color: "bg-blue-500",    initial: "TD",  cat: "Email & Communication" },
  { key: "chatwoot",          label: "Chatwoot",            color: "bg-blue-600",    initial: "CW",  cat: "Email & Communication" },
  { key: "zulip",             label: "Zulip",               color: "bg-blue-600",    initial: "ZU",  cat: "Email & Communication" },
  { key: "element-io",        label: "Element",             color: "bg-green-600",   initial: "EL",  cat: "Email & Communication" },
  { key: "pumble",            label: "Pumble",              color: "bg-purple-500",  initial: "PU",  cat: "Email & Communication" },
  // More Cloud Storage
  { key: "sftp-generic",      label: "SFTP",                color: "bg-gray-700",    initial: "SF",  cat: "Cloud Storage" },
  { key: "webdav-generic",    label: "WebDAV",              color: "bg-gray-600",    initial: "WD",  cat: "Cloud Storage" },
  { key: "ftp-generic",       label: "FTP",                 color: "bg-gray-600",    initial: "FT",  cat: "Cloud Storage" },
  { key: "aliyun-oss",        label: "Alibaba OSS",         color: "bg-orange-500",  initial: "AL",  cat: "Cloud Storage" },
  { key: "huawei-obs",        label: "Huawei OBS",          color: "bg-red-600",     initial: "HW",  cat: "Cloud Storage" },
  { key: "storj",             label: "Storj",               color: "bg-blue-600",    initial: "SJ",  cat: "Cloud Storage" },
  { key: "filebase",          label: "Filebase",            color: "bg-blue-500",    initial: "FB",  cat: "Cloud Storage" },
  { key: "linode-obj",        label: "Linode Obj Storage",  color: "bg-green-600",   initial: "LN",  cat: "Cloud Storage" },
  // More Developer Tools
  { key: "buildkite",         label: "Buildkite",           color: "bg-green-600",   initial: "BK",  cat: "Developer Tools" },
  { key: "semaphore-ci",      label: "Semaphore CI",        color: "bg-blue-500",    initial: "SM",  cat: "Developer Tools" },
  { key: "github-actions",    label: "GitHub Actions",      color: "bg-gray-900",    initial: "GA",  cat: "Developer Tools" },
  { key: "gocd",              label: "GoCD",                color: "bg-blue-700",    initial: "GC",  cat: "Developer Tools" },
  { key: "codefresh",         label: "Codefresh",           color: "bg-blue-600",    initial: "CF",  cat: "Developer Tools" },
  { key: "harness-cd",        label: "Harness",             color: "bg-blue-600",    initial: "HR",  cat: "Developer Tools" },
  { key: "sonatype-nexus",    label: "Nexus Repository",    color: "bg-blue-700",    initial: "NX",  cat: "Developer Tools" },
  { key: "vault-hc",          label: "HashiCorp Vault",     color: "bg-yellow-500",  initial: "VT",  cat: "Developer Tools" },
  { key: "consul-hc",         label: "HashiCorp Consul",    color: "bg-pink-600",    initial: "CN",  cat: "Developer Tools" },
  { key: "packer-hc",         label: "HashiCorp Packer",    color: "bg-blue-500",    initial: "PK",  cat: "Developer Tools" },
  { key: "puppet",            label: "Puppet",              color: "bg-orange-500",  initial: "PP",  cat: "Developer Tools" },
  { key: "chef-infra",        label: "Chef",                color: "bg-orange-600",  initial: "CF",  cat: "Developer Tools" },
  { key: "saltstack",         label: "SaltStack",           color: "bg-blue-700",    initial: "SS",  cat: "Developer Tools" },
  { key: "helmchart",         label: "Helm",                color: "bg-blue-600",    initial: "HM",  cat: "Developer Tools" },
  { key: "kustomize",         label: "Kustomize",           color: "bg-blue-500",    initial: "KS",  cat: "Developer Tools" },
  { key: "istio",             label: "Istio",               color: "bg-blue-600",    initial: "IS",  cat: "Developer Tools" },
  { key: "cloudflare-tunnel", label: "Cloudflare Tunnel",   color: "bg-orange-500",  initial: "CT",  cat: "Developer Tools" },
  { key: "ngrok",             label: "ngrok",               color: "bg-blue-700",    initial: "NG",  cat: "Developer Tools" },
  { key: "postman-api",       label: "Postman",             color: "bg-orange-500",  initial: "PS",  cat: "Developer Tools" },
  { key: "insomnia-api",      label: "Insomnia",            color: "bg-purple-600",  initial: "IN",  cat: "Developer Tools" },
  { key: "swaggerhub",        label: "SwaggerHub",          color: "bg-green-600",   initial: "SW",  cat: "Developer Tools" },
  { key: "stoplight",         label: "Stoplight",           color: "bg-green-500",   initial: "SL",  cat: "Developer Tools" },
  { key: "snyk-code",         label: "Snyk Code",           color: "bg-purple-600",  initial: "SK",  cat: "Developer Tools" },
  { key: "dependabot",        label: "Dependabot",          color: "bg-blue-600",    initial: "DP",  cat: "Developer Tools" },
  { key: "codecov",           label: "Codecov",             color: "bg-red-500",     initial: "CC",  cat: "Developer Tools" },
  { key: "coveralls",         label: "Coveralls",           color: "bg-orange-500",  initial: "CV",  cat: "Developer Tools" },
  { key: "linear-api",        label: "Linear API",          color: "bg-indigo-600",  initial: "LA",  cat: "Developer Tools" },
  { key: "readme-io",         label: "ReadMe",              color: "bg-green-700",   initial: "RM",  cat: "Developer Tools" },
  { key: "gitbook-dev",       label: "GitBook",             color: "bg-gray-800",    initial: "GB",  cat: "Developer Tools" },
  { key: "vercel",            label: "Vercel",              color: "bg-gray-900",    initial: "VC",  cat: "Developer Tools" },
  { key: "netlify",           label: "Netlify",             color: "bg-teal-600",    initial: "NL",  cat: "Developer Tools" },
  { key: "render-com",        label: "Render",              color: "bg-purple-600",  initial: "RN",  cat: "Developer Tools" },
  { key: "fly-io",            label: "Fly.io",              color: "bg-purple-700",  initial: "FL",  cat: "Developer Tools" },
  { key: "railway",           label: "Railway",             color: "bg-purple-600",  initial: "RW",  cat: "Developer Tools" },
  // More Project Management
  { key: "coda-doc",          label: "Coda",                color: "bg-red-500",     initial: "CD",  cat: "Project Management" },
  { key: "slab",              label: "Slab",                color: "bg-blue-600",    initial: "SB",  cat: "Project Management" },
  { key: "nuclino",           label: "Nuclino",             color: "bg-green-500",   initial: "NU",  cat: "Project Management" },
  { key: "outline-wiki",      label: "Outline",             color: "bg-gray-800",    initial: "OT",  cat: "Project Management" },
  { key: "document360",       label: "Document360",         color: "bg-blue-600",    initial: "D3",  cat: "Project Management" },
  { key: "guru-app",          label: "Guru",                color: "bg-teal-500",    initial: "GU",  cat: "Project Management" },
  { key: "tettra",            label: "Tettra",              color: "bg-blue-500",    initial: "TT",  cat: "Project Management" },
  { key: "archbee",           label: "Archbee",             color: "bg-blue-700",    initial: "AB",  cat: "Project Management" },
  { key: "plane-so",          label: "Plane",               color: "bg-indigo-600",  initial: "PL",  cat: "Project Management" },
  { key: "openproject",       label: "OpenProject",         color: "bg-blue-700",    initial: "OP",  cat: "Project Management" },
  { key: "pivotal-tracker",   label: "Pivotal Tracker",     color: "bg-green-500",   initial: "PT",  cat: "Project Management" },
  { key: "azure-boards",      label: "Azure Boards",        color: "bg-blue-600",    initial: "AB",  cat: "Project Management" },
  // More Marketing
  { key: "google-ads",        label: "Google Ads",          color: "bg-green-600",   initial: "GA",  cat: "Marketing" },
  { key: "meta-ads",          label: "Meta Ads",            color: "bg-blue-600",    initial: "MA",  cat: "Marketing" },
  { key: "linkedin-ads",      label: "LinkedIn Ads",        color: "bg-blue-700",    initial: "LA",  cat: "Marketing" },
  { key: "tiktok-ads",        label: "TikTok Ads",          color: "bg-gray-900",    initial: "TA",  cat: "Marketing" },
  { key: "twitter-ads",       label: "X (Twitter) Ads",     color: "bg-gray-900",    initial: "XA",  cat: "Marketing" },
  { key: "pinterest-ads",     label: "Pinterest Ads",       color: "bg-red-600",     initial: "PA",  cat: "Marketing" },
  { key: "reddit-ads",        label: "Reddit Ads",          color: "bg-orange-600",  initial: "RA",  cat: "Marketing" },
  { key: "amazon-ads",        label: "Amazon Ads",          color: "bg-orange-500",  initial: "AA",  cat: "Marketing" },
  { key: "microsoft-ads",     label: "Microsoft Ads",       color: "bg-blue-600",    initial: "MSA", cat: "Marketing" },
  { key: "taboola",           label: "Taboola",             color: "bg-blue-500",    initial: "TB",  cat: "Marketing" },
  { key: "outbrain",          label: "Outbrain",            color: "bg-red-500",     initial: "OB",  cat: "Marketing" },
  { key: "criteo-ads",        label: "Criteo",              color: "bg-orange-600",  initial: "CR",  cat: "Marketing" },
  { key: "semrush",           label: "SEMrush",             color: "bg-orange-500",  initial: "SR",  cat: "Marketing" },
  { key: "ahrefs",            label: "Ahrefs",              color: "bg-blue-500",    initial: "AH",  cat: "Marketing" },
  { key: "moz-pro",           label: "Moz",                 color: "bg-blue-800",    initial: "MZ",  cat: "Marketing" },
  { key: "surfer-seo",        label: "Surfer SEO",          color: "bg-blue-500",    initial: "SF",  cat: "Marketing" },
  { key: "clearscope",        label: "Clearscope",          color: "bg-blue-600",    initial: "CS",  cat: "Marketing" },
  { key: "google-tag-manager",label: "Google Tag Mgr",      color: "bg-blue-500",    initial: "GT",  cat: "Marketing" },
  { key: "google-search-cons",label: "Search Console",      color: "bg-green-500",   initial: "SC",  cat: "Marketing" },
  { key: "crazyegg",          label: "Crazy Egg",           color: "bg-orange-500",  initial: "CE",  cat: "Marketing" },
  { key: "mouseflow",         label: "Mouseflow",           color: "bg-blue-600",    initial: "MF",  cat: "Marketing" },
  { key: "logrocket",         label: "LogRocket",           color: "bg-purple-600",  initial: "LR",  cat: "Marketing" },
  { key: "heap-marketing",    label: "Heap Analytics",      color: "bg-purple-500",  initial: "HP",  cat: "Marketing" },
  // More HR & Payroll
  { key: "lever",             label: "Lever",               color: "bg-blue-500",    initial: "LV",  cat: "HR & Payroll" },
  { key: "greenhouse",        label: "Greenhouse",          color: "bg-green-600",   initial: "GH",  cat: "HR & Payroll" },
  { key: "workable",          label: "Workable",            color: "bg-blue-500",    initial: "WK",  cat: "HR & Payroll" },
  { key: "jobvite",           label: "Jobvite",             color: "bg-blue-600",    initial: "JV",  cat: "HR & Payroll" },
  { key: "icims",             label: "iCIMS",               color: "bg-blue-700",    initial: "IC",  cat: "HR & Payroll" },
  { key: "taleo",             label: "Oracle Taleo",        color: "bg-red-600",     initial: "TL",  cat: "HR & Payroll" },
  { key: "successfactors",    label: "SAP SuccessFactors",  color: "bg-blue-700",    initial: "SF",  cat: "HR & Payroll" },
  { key: "oracle-hcm",        label: "Oracle HCM",          color: "bg-red-600",     initial: "OH",  cat: "HR & Payroll" },
  { key: "dayforce",          label: "Dayforce",            color: "bg-blue-600",    initial: "DF",  cat: "HR & Payroll" },
  { key: "ukg-pro",           label: "UKG Pro",             color: "bg-blue-700",    initial: "UK",  cat: "HR & Payroll" },
  { key: "paychex",           label: "Paychex",             color: "bg-blue-600",    initial: "PX",  cat: "HR & Payroll" },
  { key: "paylocity",         label: "Paylocity",           color: "bg-blue-500",    initial: "PC",  cat: "HR & Payroll" },
  { key: "paycom",            label: "Paycom",              color: "bg-green-600",   initial: "PM",  cat: "HR & Payroll" },
  { key: "zenefits",          label: "Zenefits",            color: "bg-teal-600",    initial: "ZN",  cat: "HR & Payroll" },
  { key: "justworks",         label: "Justworks",           color: "bg-blue-500",    initial: "JW",  cat: "HR & Payroll" },
  { key: "trinet",            label: "TriNet",              color: "bg-blue-700",    initial: "TN",  cat: "HR & Payroll" },
  { key: "deel",              label: "Deel",                color: "bg-gray-900",    initial: "DL",  cat: "HR & Payroll" },
  { key: "remote-com",        label: "Remote",              color: "bg-blue-600",    initial: "RM",  cat: "HR & Payroll" },
  { key: "oyster-hr",         label: "Oyster HR",           color: "bg-blue-500",    initial: "OY",  cat: "HR & Payroll" },
  { key: "papaya-global",     label: "Papaya Global",       color: "bg-green-500",   initial: "PG",  cat: "HR & Payroll" },
  { key: "multiplier-hr",     label: "Multiplier",          color: "bg-blue-600",    initial: "MP",  cat: "HR & Payroll" },
  { key: "lattice",           label: "Lattice",             color: "bg-purple-600",  initial: "LT",  cat: "HR & Payroll" },
  { key: "culture-amp",       label: "Culture Amp",         color: "bg-orange-500",  initial: "CA",  cat: "HR & Payroll" },
  { key: "betterworks",       label: "BetterWorks",         color: "bg-blue-500",    initial: "BW",  cat: "HR & Payroll" },
  { key: "15five",            label: "15Five",              color: "bg-green-600",   initial: "FF",  cat: "HR & Payroll" },
  { key: "leapsome",          label: "Leapsome",            color: "bg-blue-600",    initial: "LP",  cat: "HR & Payroll" },
  { key: "officevibe",        label: "Officevibe",          color: "bg-teal-600",    initial: "OV",  cat: "HR & Payroll" },
  { key: "deputy",            label: "Deputy",              color: "bg-blue-600",    initial: "DP",  cat: "HR & Payroll" },
  { key: "when-i-work",       label: "When I Work",         color: "bg-green-500",   initial: "WW",  cat: "HR & Payroll" },
  { key: "planday",           label: "Planday",             color: "bg-blue-600",    initial: "PD",  cat: "HR & Payroll" },
  { key: "bambee",            label: "Bambee",              color: "bg-green-600",   initial: "BE",  cat: "HR & Payroll" },
  { key: "keka",              label: "Keka",                color: "bg-orange-500",  initial: "KE",  cat: "HR & Payroll" },
  // More Finance & Accounting
  { key: "bill-com",          label: "Bill.com",            color: "bg-blue-500",    initial: "BC",  cat: "Finance & Accounting" },
  { key: "melio",             label: "Melio",               color: "bg-green-500",   initial: "ML",  cat: "Finance & Accounting" },
  { key: "tipalti",           label: "Tipalti",             color: "bg-blue-600",    initial: "TP",  cat: "Finance & Accounting" },
  { key: "airbase",           label: "Airbase",             color: "bg-blue-500",    initial: "AB",  cat: "Finance & Accounting" },
  { key: "brex-card",         label: "Brex",                color: "bg-gray-900",    initial: "BX",  cat: "Finance & Accounting" },
  { key: "ramp-card",         label: "Ramp",                color: "bg-yellow-500",  initial: "RP",  cat: "Finance & Accounting" },
  { key: "expensify",         label: "Expensify",           color: "bg-green-500",   initial: "EX",  cat: "Finance & Accounting" },
  { key: "sap-concur",        label: "SAP Concur",          color: "bg-blue-700",    initial: "SC",  cat: "Finance & Accounting" },
  { key: "fyle",              label: "Fyle",                color: "bg-purple-500",  initial: "FY",  cat: "Finance & Accounting" },
  { key: "spendesk",          label: "Spendesk",            color: "bg-blue-600",    initial: "SD",  cat: "Finance & Accounting" },
  { key: "pleo",              label: "Pleo",                color: "bg-teal-600",    initial: "PL",  cat: "Finance & Accounting" },
  { key: "payhawk",           label: "Payhawk",             color: "bg-blue-600",    initial: "PH",  cat: "Finance & Accounting" },
  { key: "procurify",         label: "Procurify",           color: "bg-blue-500",    initial: "PR",  cat: "Finance & Accounting" },
  { key: "coupa",             label: "Coupa",               color: "bg-blue-600",    initial: "CP",  cat: "Finance & Accounting" },
  { key: "ariba",             label: "SAP Ariba",           color: "bg-blue-700",    initial: "AR",  cat: "Finance & Accounting" },
  { key: "tradeshift",        label: "Tradeshift",          color: "bg-blue-500",    initial: "TS",  cat: "Finance & Accounting" },
  { key: "sage-intacct",      label: "Sage Intacct",        color: "bg-green-700",   initial: "SI",  cat: "Finance & Accounting" },
  { key: "acumatica",         label: "Acumatica",           color: "bg-blue-600",    initial: "AC",  cat: "Finance & Accounting" },
  { key: "epicor",            label: "Epicor",              color: "bg-blue-700",    initial: "EP",  cat: "Finance & Accounting" },
  { key: "avalara",           label: "Avalara",             color: "bg-blue-500",    initial: "AV",  cat: "Finance & Accounting" },
  // More E-commerce
  { key: "bigcartel",         label: "Big Cartel",          color: "bg-blue-600",    initial: "BC",  cat: "E-commerce" },
  { key: "ecwid",             label: "Ecwid",               color: "bg-blue-500",    initial: "EC",  cat: "E-commerce" },
  { key: "prestashop",        label: "PrestaShop",          color: "bg-blue-700",    initial: "PS",  cat: "E-commerce" },
  { key: "opencart",          label: "OpenCart",            color: "bg-blue-500",    initial: "OC",  cat: "E-commerce" },
  { key: "wix-ecom",          label: "Wix eCommerce",       color: "bg-gray-900",    initial: "WX",  cat: "E-commerce" },
  { key: "squarespace-shop",  label: "Squarespace Shop",    color: "bg-gray-900",    initial: "SQ",  cat: "E-commerce" },
  { key: "etsy",              label: "Etsy",                color: "bg-orange-500",  initial: "ET",  cat: "E-commerce" },
  { key: "amazon-seller",     label: "Amazon Seller",       color: "bg-orange-500",  initial: "AS",  cat: "E-commerce" },
  { key: "ebay-seller",       label: "eBay",                color: "bg-yellow-500",  initial: "EB",  cat: "E-commerce" },
  { key: "gorgias",           label: "Gorgias",             color: "bg-blue-600",    initial: "GG",  cat: "E-commerce" },
  { key: "yotpo",             label: "Yotpo",               color: "bg-blue-500",    initial: "YP",  cat: "E-commerce" },
  { key: "stamped-io",        label: "Stamped.io",          color: "bg-orange-500",  initial: "ST",  cat: "E-commerce" },
  { key: "smile-io",          label: "Smile.io",            color: "bg-pink-500",    initial: "SM",  cat: "E-commerce" },
  { key: "loyalty-lion",      label: "LoyaltyLion",         color: "bg-orange-600",  initial: "LL",  cat: "E-commerce" },
  { key: "recharge",          label: "Recharge",            color: "bg-purple-600",  initial: "RC",  cat: "E-commerce" },
  { key: "recurly",           label: "Recurly",             color: "bg-blue-500",    initial: "RU",  cat: "E-commerce" },
  { key: "chargify",          label: "Chargify",            color: "bg-blue-600",    initial: "CG",  cat: "E-commerce" },
  { key: "zuora",             label: "Zuora",               color: "bg-blue-700",    initial: "ZU",  cat: "E-commerce" },
  { key: "impact-radius",     label: "Impact",              color: "bg-blue-600",    initial: "IM",  cat: "E-commerce" },
  { key: "shareasale",        label: "ShareASale",          color: "bg-orange-500",  initial: "SA",  cat: "E-commerce" },
  { key: "partnerstack",      label: "PartnerStack",        color: "bg-blue-600",    initial: "PS",  cat: "E-commerce" },
  { key: "refersion",         label: "Refersion",           color: "bg-purple-500",  initial: "RF",  cat: "E-commerce" },
  { key: "shipbob",           label: "ShipBob",             color: "bg-blue-500",    initial: "SB",  cat: "E-commerce" },
  { key: "shipstation",       label: "ShipStation",         color: "bg-blue-600",    initial: "SS",  cat: "E-commerce" },
  { key: "shippo",            label: "Shippo",              color: "bg-purple-500",  initial: "SP",  cat: "E-commerce" },
  { key: "aftership",         label: "AfterShip",           color: "bg-orange-500",  initial: "AF",  cat: "E-commerce" },
  // More Analytics
  { key: "thoughtspot",       label: "ThoughtSpot",         color: "bg-blue-700",    initial: "TS",  cat: "Analytics" },
  { key: "sigma-computing",   label: "Sigma Computing",     color: "bg-blue-500",    initial: "SG",  cat: "Analytics" },
  { key: "hex-data",          label: "Hex",                 color: "bg-purple-600",  initial: "HX",  cat: "Analytics" },
  { key: "mode-analytics",    label: "Mode",                color: "bg-gray-800",    initial: "MD",  cat: "Analytics" },
  { key: "growth-book",       label: "GrowthBook",          color: "bg-purple-500",  initial: "GB",  cat: "Analytics" },
  { key: "optimizely",        label: "Optimizely",          color: "bg-blue-600",    initial: "OP",  cat: "Analytics" },
  { key: "vwo",               label: "VWO",                 color: "bg-blue-500",    initial: "VW",  cat: "Analytics" },
  { key: "ab-tasty",          label: "AB Tasty",            color: "bg-blue-600",    initial: "AB",  cat: "Analytics" },
  { key: "quantum-metric",    label: "Quantum Metric",      color: "bg-blue-700",    initial: "QM",  cat: "Analytics" },
  { key: "contentsquare",     label: "Contentsquare",       color: "bg-purple-600",  initial: "CS",  cat: "Analytics" },
  { key: "luckyorange",       label: "Lucky Orange",        color: "bg-orange-500",  initial: "LO",  cat: "Analytics" },
  // More Observability & ITSM
  { key: "jaeger",            label: "Jaeger",              color: "bg-blue-600",    initial: "JG",  cat: "Observability" },
  { key: "zipkin",            label: "Zipkin",              color: "bg-orange-500",  initial: "ZK",  cat: "Observability" },
  { key: "opentelemetry",     label: "OpenTelemetry",       color: "bg-blue-500",    initial: "OT",  cat: "Observability" },
  { key: "aws-cloudwatch",    label: "AWS CloudWatch",      color: "bg-orange-500",  initial: "CW",  cat: "Observability" },
  { key: "azure-monitor",     label: "Azure Monitor",       color: "bg-blue-600",    initial: "AZ",  cat: "Observability" },
  { key: "google-cloud-ops",  label: "Google Cloud Ops",    color: "bg-blue-500",    initial: "GO",  cat: "Observability" },
  { key: "dynatrace",         label: "Dynatrace",           color: "bg-green-600",   initial: "DT",  cat: "Observability" },
  { key: "appdynamics",       label: "AppDynamics",         color: "bg-blue-700",    initial: "AD",  cat: "Observability" },
  { key: "instana",           label: "Instana",             color: "bg-orange-600",  initial: "IN",  cat: "Observability" },
  { key: "lightstep",         label: "Lightstep",           color: "bg-purple-500",  initial: "LS",  cat: "Observability" },
  { key: "honeycomb-io",      label: "Honeycomb",           color: "bg-yellow-500",  initial: "HC",  cat: "Observability" },
  { key: "cribl",             label: "Cribl",               color: "bg-blue-600",    initial: "CR",  cat: "Observability" },
  { key: "sumo-logic",        label: "Sumo Logic",          color: "bg-blue-700",    initial: "SL",  cat: "Observability" },
  { key: "logdna",            label: "LogDNA",              color: "bg-blue-500",    initial: "LD",  cat: "Observability" },
  { key: "papertrail",        label: "Papertrail",          color: "bg-blue-600",    initial: "PT",  cat: "Observability" },
  { key: "loggly",            label: "Loggly",              color: "bg-orange-500",  initial: "LG",  cat: "Observability" },
  { key: "coralogix",         label: "Coralogix",           color: "bg-blue-600",    initial: "CO",  cat: "Observability" },
  { key: "better-stack",      label: "Better Stack",        color: "bg-blue-500",    initial: "BS",  cat: "Observability" },
  { key: "axiom",             label: "Axiom",               color: "bg-gray-900",    initial: "AX",  cat: "Observability" },
  { key: "rollbar",           label: "Rollbar",             color: "bg-blue-600",    initial: "RB",  cat: "Observability" },
  { key: "bugsnag",           label: "Bugsnag",             color: "bg-blue-700",    initial: "BG",  cat: "Observability" },
  { key: "raygun",            label: "Raygun",              color: "bg-orange-500",  initial: "RG",  cat: "Observability" },
  { key: "airbrake",          label: "Airbrake",            color: "bg-blue-600",    initial: "AB",  cat: "Observability" },
  { key: "checkly",           label: "Checkly",             color: "bg-teal-500",    initial: "CK",  cat: "Observability" },
  { key: "statuspage-io",     label: "Statuspage",          color: "bg-blue-600",    initial: "SP",  cat: "Observability" },
  // Security & Identity
  { key: "okta",              label: "Okta",                color: "bg-blue-600",    initial: "OK",  cat: "Security & Identity" },
  { key: "auth0",             label: "Auth0",               color: "bg-orange-500",  initial: "A0",  cat: "Security & Identity" },
  { key: "azure-ad",          label: "Microsoft Entra",     color: "bg-blue-600",    initial: "AA",  cat: "Security & Identity" },
  { key: "onelogin",          label: "OneLogin",            color: "bg-blue-500",    initial: "OL",  cat: "Security & Identity" },
  { key: "ping-identity",     label: "Ping Identity",       color: "bg-red-500",     initial: "PI",  cat: "Security & Identity" },
  { key: "cyberark",          label: "CyberArk",            color: "bg-blue-800",    initial: "CA",  cat: "Security & Identity" },
  { key: "beyondtrust",       label: "BeyondTrust",         color: "bg-red-700",     initial: "BT",  cat: "Security & Identity" },
  { key: "sailpoint",         label: "SailPoint",           color: "bg-blue-600",    initial: "SP",  cat: "Security & Identity" },
  { key: "saviynt",           label: "Saviynt",             color: "bg-blue-500",    initial: "SV",  cat: "Security & Identity" },
  { key: "varonis",           label: "Varonis",             color: "bg-blue-700",    initial: "VR",  cat: "Security & Identity" },
  { key: "tenable-io",        label: "Tenable",             color: "bg-blue-600",    initial: "TN",  cat: "Security & Identity" },
  { key: "qualys-guard",      label: "Qualys",              color: "bg-red-600",     initial: "QL",  cat: "Security & Identity" },
  { key: "rapid7-insight",    label: "Rapid7",              color: "bg-orange-600",  initial: "R7",  cat: "Security & Identity" },
  { key: "crowdstrike",       label: "CrowdStrike",         color: "bg-red-600",     initial: "CS",  cat: "Security & Identity" },
  { key: "sentinelone",       label: "SentinelOne",         color: "bg-purple-600",  initial: "S1",  cat: "Security & Identity" },
  { key: "carbon-black",      label: "VMware Carbon Black", color: "bg-gray-800",    initial: "CB",  cat: "Security & Identity" },
  { key: "sophos",            label: "Sophos",              color: "bg-blue-700",    initial: "SH",  cat: "Security & Identity" },
  { key: "lacework",          label: "Lacework",            color: "bg-blue-500",    initial: "LW",  cat: "Security & Identity" },
  { key: "wiz-cloud",         label: "Wiz",                 color: "bg-blue-600",    initial: "WZ",  cat: "Security & Identity" },
  { key: "orca-security",     label: "Orca Security",       color: "bg-blue-500",    initial: "OR",  cat: "Security & Identity" },
  { key: "aqua-security",     label: "Aqua Security",       color: "bg-blue-500",    initial: "AQ",  cat: "Security & Identity" },
  { key: "snyk-security",     label: "Snyk",                color: "bg-purple-600",  initial: "SK",  cat: "Security & Identity" },
  { key: "hashicorp-vault",   label: "HashiCorp Vault",     color: "bg-yellow-500",  initial: "HV",  cat: "Security & Identity" },
  { key: "1password-biz",     label: "1Password Biz",       color: "bg-blue-600",    initial: "1P",  cat: "Security & Identity" },
  { key: "bitwarden-biz",     label: "Bitwarden",           color: "bg-blue-700",    initial: "BW",  cat: "Security & Identity" },
  { key: "duo-security",      label: "Duo Security",        color: "bg-green-600",   initial: "DU",  cat: "Security & Identity" },
  { key: "jumpcloud",         label: "JumpCloud",           color: "bg-green-500",   initial: "JC",  cat: "Security & Identity" },
  { key: "strongdm",          label: "StrongDM",            color: "bg-blue-600",    initial: "SD",  cat: "Security & Identity" },
  { key: "teleport-io",       label: "Teleport",            color: "bg-blue-700",    initial: "TP",  cat: "Security & Identity" },
  { key: "zscaler",           label: "Zscaler",             color: "bg-blue-600",    initial: "ZS",  cat: "Security & Identity" },
  { key: "palo-alto-prisma",  label: "Prisma Cloud",        color: "bg-blue-700",    initial: "PA",  cat: "Security & Identity" },
  { key: "fortinet",          label: "Fortinet",            color: "bg-red-600",     initial: "FT",  cat: "Security & Identity" },
  { key: "checkpoint",        label: "Check Point",         color: "bg-red-700",     initial: "CP",  cat: "Security & Identity" },
  { key: "darktrace",         label: "Darktrace",           color: "bg-purple-700",  initial: "DK",  cat: "Security & Identity" },
  { key: "rubrik",            label: "Rubrik",              color: "bg-blue-600",    initial: "RK",  cat: "Security & Identity" },
  { key: "cohesity",          label: "Cohesity",            color: "bg-blue-500",    initial: "CH",  cat: "Security & Identity" },
  // Social Media
  { key: "twitter-x",         label: "X (Twitter)",         color: "bg-gray-900",    initial: "X",   cat: "Social Media" },
  { key: "linkedin-social",   label: "LinkedIn",            color: "bg-blue-700",    initial: "LI",  cat: "Social Media" },
  { key: "instagram-api",     label: "Instagram",           color: "bg-pink-600",    initial: "IG",  cat: "Social Media" },
  { key: "facebook-pages",    label: "Facebook Pages",      color: "bg-blue-600",    initial: "FB",  cat: "Social Media" },
  { key: "youtube-api",       label: "YouTube",             color: "bg-red-600",     initial: "YT",  cat: "Social Media" },
  { key: "tiktok-api",        label: "TikTok",              color: "bg-gray-900",    initial: "TK",  cat: "Social Media" },
  { key: "pinterest-api",     label: "Pinterest",           color: "bg-red-600",     initial: "PT",  cat: "Social Media" },
  { key: "reddit-api",        label: "Reddit",              color: "bg-orange-600",  initial: "RD",  cat: "Social Media" },
  { key: "snapchat-api",      label: "Snapchat",            color: "bg-yellow-400",  initial: "SC",  cat: "Social Media" },
  { key: "buffer-social",     label: "Buffer",              color: "bg-blue-600",    initial: "BF",  cat: "Social Media" },
  { key: "hootsuite",         label: "Hootsuite",           color: "bg-blue-700",    initial: "HT",  cat: "Social Media" },
  { key: "sprout-social",     label: "Sprout Social",       color: "bg-green-600",   initial: "SS",  cat: "Social Media" },
  { key: "later-com",         label: "Later",               color: "bg-purple-600",  initial: "LT",  cat: "Social Media" },
  { key: "loomly",            label: "Loomly",              color: "bg-blue-500",    initial: "LM",  cat: "Social Media" },
  { key: "agorapulse",        label: "Agorapulse",          color: "bg-orange-500",  initial: "AG",  cat: "Social Media" },
  { key: "sendible",          label: "Sendible",            color: "bg-blue-600",    initial: "SD",  cat: "Social Media" },
  { key: "socialbee",         label: "SocialBee",           color: "bg-blue-500",    initial: "SB",  cat: "Social Media" },
  { key: "mention",           label: "Mention",             color: "bg-blue-600",    initial: "MN",  cat: "Social Media" },
  { key: "brand24",           label: "Brand24",             color: "bg-blue-700",    initial: "B2",  cat: "Social Media" },
  { key: "talkwalker",        label: "Talkwalker",          color: "bg-blue-600",    initial: "TW",  cat: "Social Media" },
  { key: "brandwatch",        label: "Brandwatch",          color: "bg-purple-700",  initial: "BW",  cat: "Social Media" },
  { key: "keyhole",           label: "Keyhole",             color: "bg-blue-500",    initial: "KH",  cat: "Social Media" },
  { key: "sprinklr",          label: "Sprinklr",            color: "bg-blue-700",    initial: "SP",  cat: "Social Media" },
  { key: "khoros",            label: "Khoros",              color: "bg-blue-600",    initial: "KR",  cat: "Social Media" },
  // Data Integration & ETL
  { key: "fivetran",          label: "Fivetran",            color: "bg-blue-600",    initial: "FV",  cat: "Data Integration" },
  { key: "airbyte",           label: "Airbyte",             color: "bg-blue-500",    initial: "AB",  cat: "Data Integration" },
  { key: "stitch-data",       label: "Stitch",              color: "bg-blue-700",    initial: "ST",  cat: "Data Integration" },
  { key: "talend",            label: "Talend",              color: "bg-blue-600",    initial: "TL",  cat: "Data Integration" },
  { key: "informatica-cloud", label: "Informatica",         color: "bg-orange-600",  initial: "IC",  cat: "Data Integration" },
  { key: "mulesoft",          label: "MuleSoft",            color: "bg-blue-700",    initial: "MS",  cat: "Data Integration" },
  { key: "boomi-dell",        label: "Boomi",               color: "bg-blue-600",    initial: "BM",  cat: "Data Integration" },
  { key: "snaplogic",         label: "SnapLogic",           color: "bg-blue-500",    initial: "SL",  cat: "Data Integration" },
  { key: "jitterbit",         label: "Jitterbit",           color: "bg-purple-600",  initial: "JB",  cat: "Data Integration" },
  { key: "celigo",            label: "Celigo",              color: "bg-blue-500",    initial: "CL",  cat: "Data Integration" },
  { key: "workato",           label: "Workato",             color: "bg-blue-600",    initial: "WK",  cat: "Data Integration" },
  { key: "zapier-integration",label: "Zapier",              color: "bg-orange-500",  initial: "ZP",  cat: "Data Integration" },
  { key: "make-com",          label: "Make",                color: "bg-purple-600",  initial: "MK",  cat: "Data Integration" },
  { key: "n8n",               label: "n8n",                 color: "bg-red-500",     initial: "N8",  cat: "Data Integration" },
  { key: "tray-io",           label: "Tray.io",             color: "bg-blue-500",    initial: "TR",  cat: "Data Integration" },
  { key: "hevo-data",         label: "Hevo Data",           color: "bg-blue-600",    initial: "HD",  cat: "Data Integration" },
  { key: "dbt-core",          label: "dbt",                 color: "bg-orange-500",  initial: "DB",  cat: "Data Integration" },
  { key: "apache-airflow",    label: "Apache Airflow",      color: "bg-green-600",   initial: "AF",  cat: "Data Integration" },
  { key: "prefect-io",        label: "Prefect",             color: "bg-blue-600",    initial: "PF",  cat: "Data Integration" },
  { key: "dagster",           label: "Dagster",             color: "bg-purple-600",  initial: "DG",  cat: "Data Integration" },
  // Search
  { key: "perplexity-search", label: "Perplexity Search",  color: "bg-blue-700",    initial: "PS",  cat: "Search" },
  { key: "google-search",     label: "Google Search",      color: "bg-blue-500",    initial: "GS",  cat: "Search" },
  { key: "bing-search",       label: "Bing Search",        color: "bg-teal-600",    initial: "BS",  cat: "Search" },
  // OCR
  { key: "azure-vision",  label: "Azure Computer Vision", color: "bg-blue-600",    initial: "AV",  cat: "OCR" },
  { key: "google-vision", label: "Google Cloud Vision",   color: "bg-blue-500",    initial: "GV",  cat: "OCR" },
  { key: "aws-textract",  label: "AWS Textract",          color: "bg-orange-600",  initial: "TX",  cat: "OCR" },
  { key: "tesseract-ocr", label: "Tesseract OCR",         color: "bg-gray-700",    initial: "TS",  cat: "OCR" },
  // Image Generation
  { key: "openai-image",     label: "OpenAI Image (DALL-E)", color: "bg-gray-900",   initial: "OI",  cat: "Image Generation" },
  { key: "flux",             label: "FLUX",                  color: "bg-gray-800",   initial: "FX",  cat: "Image Generation" },
  { key: "stable-diffusion", label: "Stable Diffusion",      color: "bg-purple-700", initial: "SD",  cat: "Image Generation" },
  { key: "ideogram",         label: "Ideogram",              color: "bg-blue-600",   initial: "IG",  cat: "Image Generation" },
  // Speech & Audio
  { key: "elevenlabs",   label: "ElevenLabs",        color: "bg-gray-900",    initial: "EL",  cat: "Speech & Audio" },
  { key: "openai-tts",   label: "OpenAI TTS",        color: "bg-green-700",   initial: "OT",  cat: "Speech & Audio" },
  { key: "azure-speech", label: "Azure Speech",      color: "bg-blue-600",    initial: "AZ",  cat: "Speech & Audio" },
  { key: "google-tts",   label: "Google Text-to-Speech", color: "bg-blue-500", initial: "GT",  cat: "Speech & Audio" },
  // Video Generation
  { key: "runway", label: "Runway",  color: "bg-gray-900",    initial: "RW",  cat: "Video Generation" },
  { key: "kling",  label: "Kling",   color: "bg-purple-700",  initial: "KL",  cat: "Video Generation" },
  { key: "pika",   label: "Pika",    color: "bg-blue-600",    initial: "PK",  cat: "Video Generation" },
  // Music Generation
  { key: "suno", label: "Suno", color: "bg-gray-900",    initial: "SN",  cat: "Music Generation" },
  { key: "udio", label: "Udio", color: "bg-purple-600",  initial: "UD",  cat: "Music Generation" },
];

// ── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${ALL.length} connection masters...`);
  let live = 0, soon = 0;

  for (const entry of ALL) {
    const override = adapterMap[entry.key];
    const adapterType = override ? override[0] : "rest-api";
    const fields      = override ? override[1] : HTTP;

    if (fields) live++; else soon++;

    await db.connectionMaster.upsert({
      where:  { key: entry.key },
      update: { label: entry.label, category: entry.cat, color: entry.color, initial: entry.initial, adapterType, fields },
      create: { key: entry.key, label: entry.label, category: entry.cat, color: entry.color, initial: entry.initial, adapterType, fields },
    });
  }

  const dbTotal = await db.connectionMaster.count();
  console.log(`Done. Upserted: ${ALL.length}, DB total: ${dbTotal}`);
}

main().catch(console.error).finally(() => db.$disconnect());
