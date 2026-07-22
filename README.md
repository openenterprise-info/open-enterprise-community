# Open Enterprise — Community Edition

A **self-hosted AI agent runtime** built on **declarative YAML agents** — no LangChain, no LangGraph, no code. Define multi-step agent workflows in plain YAML, connect 2,500+ enterprise tools, and run agents anywhere with a single binary. Includes human approval gates, RAG, multi-LLM support, and a full agent marketplace. Apache-2.0.

<a href="https://discord.gg/vWsZ24Msn"><img src="https://img.shields.io/badge/Discord-Join%20the%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" height="50" /></a>

Licensed under **[Apache-2.0](LICENSE)** — free to use, modify, and deploy for any purpose, including commercial. No usage limits, no telemetry, no call-home. Self-host it on your own infrastructure and own your data completely.


## Connector Catalog

2,500+ connectors across 39 categories — the largest open-source connector catalog for enterprise AI.

- **Databases** — PostgreSQL, MySQL, MongoDB, Redis, Snowflake, Elasticsearch, and more
- **CRM & Sales** — Salesforce, HubSpot, Pipedrive, Zoho CRM, and more
- **Developer Tools & DevOps** — GitHub, GitLab, Docker, Kubernetes, Datadog, and more
- **AI & ML** — OpenAI, Anthropic, HuggingFace, Pinecone, and more
- **Finance & Accounting** — Stripe, QuickBooks, Xero, Plaid, and more
- **HR, Healthcare, Legal, Education, E-commerce, ERP, IoT** — and 28 more categories

All connectors are browsable from the **Connectors** tab inside your workspace.

---

## Feature Capabilities

- **Foundation** — Multiple LLMs, Embeddings, Vector Databases
- **Knowledge** — RAG, Memory, Context Engineering
- **Interaction** — AI Assistant / Chat, Workspaces (Multi-tenant)
- **Integration** — Tools / Connectors, Tool Calling, MCP
- **Workflow** — Chains, Conditional Branches, Multi-step Pipelines, Loops, Routers, State Management
- **Agents** — Agents, Agent Planning, Multi-agent Collaboration, Reflection / Self-Critique
- **Execution** — Automation, Event-driven Workflows, Human Approval, Runtime / Execution Engine
- **OE Runtime** — Standalone binary, run any agent YAML locally on Windows / Linux / macOS — no server required
- **Governance** — Guardrails / DLP *(Enterprise)*
- **Operations** — Observability: Token Usage, Activity Log, Dashboard *(Enterprise)*
- **Ecosystem** — Marketplace, Agent Templates

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Yarn](https://yarnpkg.com/) v1.x (`npm install -g yarn`)

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/openenterprise-info/open-enterprise-community.git
cd open-enterprise-community/app
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in these three values:

```env
JWT_SECRET=any-long-random-string-here
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your-secure-password
```

> **LLM provider and API keys** are configured from inside the app after you log in — no need to set them here.

### 4. Set up the database

```bash
yarn workspace @open-enterprise/server db:push
```

This creates the SQLite database at `server/storage/openenterprise.db`.

### 5. Start the app

```bash
yarn dev
```

Three services start:

| Service   | URL                      | Env var            |
|-----------|--------------------------|--------------------|
| Frontend  | http://localhost:3000    | `FRONTEND_PORT`    |
| Server    | http://localhost:3001    | `SERVER_PORT`      |
| Processor | http://localhost:3002    | `PROCESSOR_PORT`   |

All three vars live in `server/.env`.

### 6. Log in

Open [http://localhost:3000](http://localhost:3000) and log in with the `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` you set in `.env`.

---

## Environment Variables Reference

| Variable               | Required | Default                       | Description                                                                 |
|------------------------|----------|-------------------------------|-----------------------------------------------------------------------------|
| `JWT_SECRET`           | Yes      | —                             | Signs and verifies login tokens. Keep the same across restarts — changing it logs everyone out. Does not affect your data. |
| `SUPER_ADMIN_EMAIL`    | Yes      | —                             | Email for the super admin account                                           |
| `SUPER_ADMIN_PASSWORD` | Yes      | —                             | Password for the super admin account                                        |
| `FRONTEND_PORT`        | No       | `3000`                        | Vite dev server port                                                        |
| `SERVER_PORT`          | No       | `3001`                        | API server port                                                             |
| `PROCESSOR_PORT`       | No       | `3002`                        | Document processor port                                                     |
| `LICENSE_TYPE`         | No       | `community`                   | Edition identifier. See license section below.                              |
| `LICENSE_EDITION`      | No       | `Open Enterprise Community`   | Edition display name.                                                       |
| `LICENSE_PRICE`        | No       | `free`                        | Pricing tier.                                                               |

All LLM and embedding settings are configured from the admin panel inside the app.

---

## Docker

```bash
docker run -d \
  -p 3001:3001 \
  -e JWT_SECRET=your-secret \
  -e SUPER_ADMIN_EMAIL=admin@yourdomain.com \
  -e SUPER_ADMIN_PASSWORD=your-password \
  -v ./data:/app/server/storage \
  openenterprise/open-enterprise-community:latest
```

> LLM provider and API keys are configured from the admin panel after first login.

### Data Persistence

The `-v ./data:/app/server/storage` flag mounts a local folder into the container. All your data — workspaces, documents, vector embeddings, agents, connector credentials, and chat history — is stored in `./data` on your host machine, not inside the container.

**This means upgrades never lose your data.** To upgrade to a new version:

```bash
# Stop the current container
docker stop <container-id>

# Pull the latest image
docker pull openenterprise/open-enterprise-community:latest

# Start again with the same flags — all data is preserved
docker run -d \
  -p 3001:3001 \
  -e JWT_SECRET=your-secret \
  -e SUPER_ADMIN_EMAIL=admin@yourdomain.com \
  -e SUPER_ADMIN_PASSWORD=your-password \
  -v ./data:/app/server/storage \
  openenterprise/open-enterprise-community:latest
```

> **Important:** Always use the same `JWT_SECRET` value across restarts. Changing it will invalidate all active sessions and log everyone out.

---

## OE Runtime

Run any agent YAML file locally — no server, no database, no UI required. OE Runtime is a single binary that executes Open Enterprise agents on the command line.

**Download — v1.3.2**

| Platform | Binary |
|----------|--------|
| Windows  | [oe-runtime-win.exe](https://github.com/openenterprise-info/open-enterprise-community/releases/download/v1.3.2/oe-runtime-win.exe) |
| Linux    | [oe-runtime-linux](https://github.com/openenterprise-info/open-enterprise-community/releases/download/v1.3.2/oe-runtime-linux) |
| macOS    | [oe-runtime-macos](https://github.com/openenterprise-info/open-enterprise-community/releases/download/v1.3.2/oe-runtime-macos) |
| Config template | [oe-config.example.json](https://github.com/openenterprise-info/open-enterprise-community/releases/download/v1.3.2/oe-config.example.json) |
| Sample agent    | [agent.example.yaml](https://github.com/openenterprise-info/open-enterprise-community/releases/download/v1.3.2/agent.example.yaml) |

**Usage**

```bash
# Run an agent with parameters
oe-runtime my-agent.yaml --config oe-config.json --param company="Acme" --input "Summarise Q3 results"
```

`oe-config.json` holds your LLM API key and connector credentials. A starter template is included in every release as `oe-config.example.json`.

**20 capability categories** — Databases, REST APIs, SSH, S3 storage, Email, Slack, GitHub, Kafka, MQTT/IoT, LDAP, GraphQL, Web3, Web Search, OCR, Image Generation, Speech, Video Generation, Music Generation, and more. Full details at [openenterprise.info/runtime](https://www.openenterprise.info/runtime.html).

---

## License

[Apache-2.0](LICENSE)
