import React, { useState } from "react";

const VERSION = "v1.3.3";
const REPO = "https://github.com/openenterprise-info/open-enterprise-community";
const BASE_URL = `${REPO}/releases/latest/download`;

const DOWNLOADS = [
  {
    label: "Windows",
    file: "oe-runtime-win.exe",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    label: "Linux",
    file: "oe-runtime-linux",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.041.284.354.369.53.33.613-.12 1.208-.33 1.804-.534l.006.006C6.747 17.485 7.684 20.13 9.15 22.32c-.116.21-.21.439-.195.622.016.178.132.353.37.407 1.11.257 3.025.163 4.105-.14.234-.066.377-.269.322-.506-.053-.228-.225-.404-.444-.521.695-1.127 1.168-2.393 1.498-3.686.398.067.778.168 1.098.301.21.09.47.051.645-.131.178-.185.245-.446.153-.68-.553-1.426-1.39-2.695-2.295-3.909.195-.37.41-.738.625-1.105.75-1.284 1.476-2.606 1.62-4.144.264-2.831-1.156-5.81-3.371-5.81zM12.12 4.17c-.328 0-.627.096-.869.272-.514.37-.838 1.06-.888 1.89-.074 1.23.436 2.59 1.362 3.492.347.334.774.613 1.292.613.517 0 .945-.278 1.292-.613.926-.903 1.436-2.263 1.362-3.491-.05-.83-.374-1.52-.888-1.89-.242-.177-.541-.273-.869-.273h-.794zm-.003 1.5h.8c.116 0 .226.04.31.11.275.2.43.6.463 1.127.054.9-.322 1.947-.997 2.591-.206.2-.409.327-.576.327-.167 0-.37-.126-.576-.327-.675-.644-1.05-1.69-.996-2.591.033-.527.188-.927.463-1.128.084-.069.194-.11.31-.11z" />
      </svg>
    ),
    color: "bg-orange-600 hover:bg-orange-700",
  },
  {
    label: "macOS",
    file: "oe-runtime-macos",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </svg>
    ),
    color: "bg-gray-800 hover:bg-gray-900",
  },
  {
    label: "Config Template",
    file: "oe-config.example.json",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "bg-indigo-600 hover:bg-indigo-700",
  },
  {
    label: "Sample Agent",
    file: "agent.example.yaml",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "bg-emerald-600 hover:bg-emerald-700",
  },
];

const CAPABILITIES = [
  { category: "SQL Databases", providers: "PostgreSQL, MySQL, MSSQL, Oracle, SQLite, Snowflake, BigQuery, Redshift" },
  { category: "NoSQL & Cache", providers: "MongoDB, Redis, Elasticsearch" },
  { category: "Object Storage", providers: "AWS S3, GCS, Azure Blob, MinIO, Cloudflare R2, Backblaze B2" },
  { category: "Cloud Drives", providers: "Google Drive, OneDrive, SharePoint, Dropbox, Box" },
  { category: "Email", providers: "Gmail, Zoho Mail, SMTP, IMAP" },
  { category: "Messaging", providers: "Slack" },
  { category: "SSH", providers: "Any Linux / Unix server (password or private key)" },
  { category: "REST API & HTTP", providers: "Any HTTP endpoint, Bearer / API key / Basic auth" },
  { category: "GraphQL", providers: "GraphQL, Hasura, GraphCMS, Fauna" },
  { category: "Productivity & CRM", providers: "GitHub, Jira, Notion, Confluence, HubSpot, Freshdesk, Zendesk" },
  { category: "Message Queues", providers: "Kafka, RabbitMQ, AWS SQS, Azure Service Bus, Google Pub/Sub" },
  { category: "Web Search", providers: "Perplexity, Google Custom Search, Bing" },
  { category: "OCR / Vision", providers: "Azure Vision, Google Vision, AWS Textract, Tesseract" },
  { category: "Image Generation", providers: "OpenAI gpt-image-1, FLUX, Stable Diffusion, Ideogram" },
  { category: "Speech & Audio", providers: "ElevenLabs, OpenAI TTS, Azure Speech, Google TTS" },
  { category: "Video Generation", providers: "Runway, Kling, Pika" },
  { category: "Music Generation", providers: "Suno, Udio" },
  { category: "Blockchain / Web3", providers: "Ethereum, Polygon, Solana, Avalanche, Infura, Alchemy" },
  { category: "Directory & Identity", providers: "LDAP, Active Directory, Azure AD, OpenLDAP" },
  { category: "IoT Messaging", providers: "MQTT, AWS IoT, HiveMQ, Mosquitto" },
];

const SERVER_USAGE = `# Start the HTTP server (default port 3333)
oe-runtime --serve --config oe-config.json

# ── GET /health ─────────────────────────────────────
curl http://localhost:3333/health

# ── POST /run  (inline YAML) ─────────────────────────
curl -X POST http://localhost:3333/run \\
  -H "Content-Type: application/json" \\
  -d '{
    "yaml": "name: Hello\\nsteps:\\n  - name: Say hello",
    "params": { "company": "Tesla" },
    "input": "Summarize Q3 results"
  }'

# ── POST /run-file  (YAML path on disk) ──────────────
curl -X POST http://localhost:3333/run-file \\
  -H "Content-Type: application/json" \\
  -d '{ "file": "/agents/market-report.yaml", "params": { "company": "Tesla" } }'

# ── With API key auth (optional) ──────────────────────
curl -X POST http://localhost:3333/run \\
  -H "x-api-key: your-secret-key" \\
  -H "Content-Type: application/json" \\
  -d '{ "yaml": "..." }'`;

const EXAMPLE_YAML = `name: Market Intelligence Briefing
description: >
  Researches a company, pulls internal DB metrics,
  and emails a structured report.

params:
  - name: company
    default: "OpenAI"
  - name: recipient
    default: "team@yourcompany.com"

connectors:
  - connection_name: Perplexity Search
    connection_type: perplexity-search
  - connection_name: Postgres DB
    connection_type: postgres
  - connection_name: Company Email
    connection_type: smtp

steps:
  - name: Research latest news
  - name: Pull internal metrics
  - name: Compose and send report`;

const POSTMAN_COLLECTION = {
  info: {
    name: "OE Runtime API",
    description: "OE Runtime HTTP server endpoints. Start the server with: oe-runtime --serve --config oe-config.json",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "base_url", value: "http://localhost:3333", type: "string" },
    { key: "api_key",  value: "your-api-key",          type: "string" },
  ],
  item: [
    {
      name: "Health Check",
      request: {
        method: "GET",
        header: [
          { key: "x-api-key", value: "{{api_key}}" },
        ],
        url: { raw: "{{base_url}}/health", host: ["{{base_url}}"], path: ["health"] },
        description: "Liveness check — returns runtime version.",
      },
    },
    {
      name: "Run Agent (inline YAML)",
      request: {
        method: "POST",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "x-api-key",    value: "{{api_key}}" },
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            yaml: "name: Hello World\nsteps:\n  - name: Answer the question",
            params: {},
            input: "What is 2 + 2?",
          }, null, 2),
          options: { raw: { language: "json" } },
        },
        url: { raw: "{{base_url}}/run", host: ["{{base_url}}"], path: ["run"] },
        description: "Run an agent by passing YAML inline. Returns { success, output, duration_ms }.",
      },
    },
    {
      name: "Run Agent (from file on disk)",
      request: {
        method: "POST",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "x-api-key",    value: "{{api_key}}" },
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            file:   "C:/path/to/your/agent.yaml",
            params: {},
            input:  "What is 2 + 2?",
          }, null, 2),
          options: { raw: { language: "json" } },
        },
        url: { raw: "{{base_url}}/run-file", host: ["{{base_url}}"], path: ["run-file"] },
        description: "Run an agent from a YAML file path on the server's disk. Returns { success, output, duration_ms }.",
      },
    },
  ],
};

export default function RuntimePage() {
  const [copied, setCopied] = useState(false);

  function copyYaml() {
    navigator.clipboard.writeText(EXAMPLE_YAML).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadPostman() {
    const blob = new Blob([JSON.stringify(POSTMAN_COLLECTION, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "oe-runtime.postman_collection.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo/10 text-indigo">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo" />
            {VERSION}
          </span>
          <span className="text-xs text-gray-400 font-medium">Standalone binary · No install required</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">OE Runtime</h1>
        <p className="text-gray-500 max-w-2xl">
          Execute any agent YAML file locally on Windows, Linux, or macOS. No Docker, no database, no Node.js.
          Point it at a YAML file and run.
        </p>
      </div>

      {/* Download buttons */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Download</h2>
        <div className="flex flex-wrap gap-3">
          {DOWNLOADS.map((d) => (
            <a
              key={d.file}
              href={`${BASE_URL}/${d.file}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors ${d.color}`}
            >
              {d.icon}
              {d.label}
            </a>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Always points to the latest release. Binaries are built automatically on every version tag.
        </p>
      </div>

      {/* Usage */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Usage</h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs text-gray-500">terminal</span>
          </div>
          <pre className="p-5 text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">{`# Run an agent
oe-runtime agent.yaml --config oe-config.json

# Pass parameters
oe-runtime market-report.yaml \\
  --config oe-config.json \\
  --param company="Tesla" \\
  --param recipient="ceo@company.com"

# Pass an input message
oe-runtime researcher.yaml \\
  --config oe-config.json \\
  --input "Summarise AI trends in healthcare Q3 2026"`}</pre>
        </div>
      </div>

      {/* Server mode */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">HTTP Server Mode</h2>
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">New in v1.3.3</span>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">--serve</code> to turn the binary into a persistent HTTP API.
          Call it from mobile apps, web apps, or any HTTP client — no Node.js or Docker required on the server.
        </p>
        <div className="bg-gray-900 rounded-xl overflow-hidden mb-3">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs text-gray-500">terminal + curl</span>
          </div>
          <pre className="p-5 text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">{SERVER_USAGE}</pre>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { method: "GET",  path: "/health",    desc: "Liveness check — returns version" },
            { method: "POST", path: "/run",       desc: "Run agent from inline YAML string" },
            { method: "POST", path: "/run-file",  desc: "Run agent from YAML path on disk" },
          ].map(e => (
            <div key={e.path} className="border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${e.method === "GET" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{e.method}</span>
                <code className="text-gray-700 font-mono text-xs font-semibold">{e.path}</code>
              </div>
              <p className="text-gray-500 text-xs">{e.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">
            Set <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">server.apiKey</code> in <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">oe-config.json</code> to require an <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">x-api-key</code> header.
            Default port is <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">3333</code> — override with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">server.port</code>.
          </p>
          <button
            onClick={downloadPostman}
            className="ml-4 flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Postman Collection
          </button>
        </div>
      </div>

      {/* Example YAML */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Example Agent YAML</h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <span className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-gray-500">market-intelligence.yaml</span>
            </div>
            <button
              onClick={copyYaml}
              className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-5 text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">{EXAMPLE_YAML}</pre>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">connection_name</code> in the YAML must match a connector in your <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">oe-config.json</code>.
        </p>
      </div>

      {/* Capabilities table */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Capability Categories <span className="text-gray-300 font-normal normal-case">({CAPABILITIES.length} built-in)</span>
        </h2>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Providers / Protocols</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap, i) => (
                <tr key={cap.category} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                  <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{cap.category}</td>
                  <td className="px-4 py-3 text-gray-500">{cap.providers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer link */}
      <div className="pb-4">
        <a
          href="https://www.openenterprise.info/runtime.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-indigo hover:underline"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View full OE Runtime documentation
        </a>
      </div>

    </div>
  );
}
