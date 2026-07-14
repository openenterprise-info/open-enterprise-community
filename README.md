# Open Enterprise — Community Edition

Lightweight, open-source enterprise AI platform. Workspaces, Agents, Connectors and RAG, self-hosted. Single Docker deploy.

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

## No Code. Just YAML.

Most AI agent frameworks require you to write Python, wire up LangGraph nodes, or manage complex orchestration code. Open Enterprise is different — define any agent workflow in a simple YAML file. Steps, connectors, schedules, and logic are all declared, not coded.

- No LangGraph, no LangChain, no custom Python
- Multi-step workflows with conditional logic in plain YAML
- Import, export, and share agents as single files
- Any complexity — from a simple Q&A bot to a 10-step automated pipeline

See the [`sample-agents/`](sample-agents/) folder for ready-to-use examples.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | SQLite / PostgreSQL |
| File Storage | Local filesystem |
| Queue | In-memory |
| Vector DB | LanceDB (default) + 7 others |
| LLM | 17+ providers (OpenAI, Ollama, Anthropic, etc.) |
| Embedding | Any provider (OpenAI, Ollama, etc.) |
| Deployment | Single Docker container |
| Process Manager | PM2 |
| Connectors | 2,500+ across 39 categories |

---

## Feature Capabilities

- **Foundation** — Multiple LLMs, Embeddings, Vector Databases
- **Knowledge** — RAG, Memory, Context Engineering
- **Interaction** — AI Assistant / Chat, Workspaces (Multi-tenant)
- **Integration** — Tools / Connectors, Tool Calling, MCP
- **Workflow** — Chains, Conditional Branches, Multi-step Pipelines, Loops, Routers, State Management
- **Agents** — Agents, Agent Planning, Multi-agent Collaboration, Reflection / Self-Critique
- **Execution** — Automation, Event-driven Workflows, Human Approval, Runtime / Execution Engine
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

## Testing Your Installation

Once the app is running, follow these steps to verify everything works end to end:

1. **Log in** with your `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`
2. **Configure LLM & Embedding** — go to **Settings → Instance Settings** and set your LLM provider and Embedding provider API keys
3. **Create a workspace** from the **Workspaces** page
4. **Ingest data** — open the workspace, go to **Settings → Knowledge Base** and upload some documents
5. **Test RAG** — ask questions in the workspace chat related to the ingested data
6. **Add connectors** — connect databases or enterprise tools (GitHub, Notion, Slack, etc.) from the Connectors panel
7. **Build & test agents** — create an agent from scratch or pick a template (green **Templates** button), attach connectors, and run it
8. **Browse the Marketplace** — explore ready-to-use agent templates across Security, Sales, Marketing, Integrations, and Analytics

Thank you for testing Open Enterprise! If you run into issues, please [open an issue](https://github.com/openenterprise-info/open-enterprise-community/issues).

---

## Sample Agents

The [`sample-agents/`](sample-agents/) folder contains ready-to-import agent configurations to help you get started quickly:

| File | Description |
|------|-------------|
| `devops-agent-security-monitor.yaml` | Monitors infrastructure for security issues |
| `devops-agent-security-remediation.yaml` | Automates remediation of common security findings |
| `marketing-agent-outbound-sales.yaml` | Runs outbound sales outreach workflows |
| `marketing-agent-reply-tracker.yaml` | Tracks and follows up on email replies |
| `marketing-agent-blog-publisher.yaml` | Generates and publishes one blog post per run via GitHub, driven by a Google Drive CSV of topics |
| `marketing-agent-blog-revoker.yaml` | Deletes a published blog post, removes the index card and sitemap entry, and resets the CSV row for republishing |
| `sql-agent-doctors-by-specialty.yaml` | Queries a database for doctors by specialty |
| `sql-agent-total-doctors-count.yaml` | Returns total doctor count from a database |
| `rest-agent-api-consumer.yaml` | Fetches data from an external REST API endpoint and summarizes the response |
| `rest-agent-db-to-api.yaml` | Queries a database and pushes the results to a REST API endpoint via POST |

To use: go to **Workspaces → Chat → Agents → Import**, select a YAML file, configure the required connectors, and run.

---

## Open Enterprise Commercial

The Community Edition is free forever — but when your organization needs more than self-service, **Open Enterprise Commercial** is built for you.

Whether you're deploying AI across 50 employees or 5,000, running regulated workloads, or building AI-powered products on top of Open Enterprise — the Commercial edition gives you the enterprise controls, white-label flexibility, and dedicated support that production demands.

**No compromises. No workarounds. Just a deployment your team can rely on.**

---

### Enterprise Features

- **SSO / SAML** — Single sign-on via Okta, Azure AD, Google Workspace, and any SAML 2.0 provider. One login, zero friction.
- **Security & Compliance** — Data Loss Prevention (DLP), content policy enforcement, audit-ready violation logs. Stay compliant without slowing down your teams.
- **Observability** — Per-user and per-workspace token usage, cost dashboards, and full activity logs. Know exactly what's running and what it costs.
- **White-label** — Ship it as your own product. Replace every logo, name, and link with your brand. Your customers never need to know what's running under the hood.
- **Custom Connectors** — Need a connector that doesn't exist yet? We build it. Your internal systems, your proprietary APIs, your data sources — all connected.
- **Advanced Agent Workflows** — Multi-agent orchestration, approval gates, event-driven pipelines, and enterprise-grade scheduling built for complex automation at scale.

### Dedicated Services

- **Guided implementation** — We don't hand you docs and wish you luck. Our team works alongside yours to design, deploy, and validate your setup from day one.
- **Dedicated success manager** — A named person who knows your environment, your team, and your goals — available when you need them.
- **SLA-backed support** — Contractual response and resolution times. Critical issues get immediate attention, not a queue.
- **Custom training** — Hands-on workshops for your admins, developers, and end users — tailored to how your organization actually works.
- **Roadmap access** — Commercial customers shape our roadmap. If you need a capability, tell us — we build it.
- **Private deployment support** — Air-gapped environments, VPC deployments, and on-premise installs fully supported.

### Who It's For

- **Enterprises** rolling out AI assistants and agents across departments
- **ISVs and SaaS companies** embedding AI into their own products under their own brand
- **Regulated industries** — finance, healthcare, legal — that need compliance controls and audit trails
- **Teams that have outgrown the Community Edition** and need SLA, SSO, and dedicated support

---

Ready to talk? Reach out to [team@openenterprise.info](mailto:team@openenterprise.info) — we'll scope your requirements and get you a proposal within 24 hours.

---

## License

[Apache-2.0](LICENSE)
