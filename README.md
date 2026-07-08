# Open Enterprise — Community Edition

Lightweight, open-source enterprise AI platform. Deploy workspaces, AI agents, and knowledge bases on your own infrastructure.

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

| Variable               | Required | Default | Description                          |
|------------------------|----------|---------|--------------------------------------|
| `JWT_SECRET`           | Yes      | —       | Secret key for signing auth tokens   |
| `SUPER_ADMIN_EMAIL`    | Yes      | —       | Email for the super admin account    |
| `SUPER_ADMIN_PASSWORD` | Yes      | —       | Password for the super admin account |
| `FRONTEND_PORT`        | No       | `3000`  | Vite dev server port                 |
| `SERVER_PORT`          | No       | `3001`  | API server port                      |
| `PROCESSOR_PORT`       | No       | `3002`  | Document processor port              |

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

---

## Testing Your Installation

Once the app is running, follow these steps to verify everything works end to end:

1. **Log in** with your `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`
2. **Configure LLM & Embedding** — go to **Settings → Instance Settings** and set your LLM provider and Embedding provider API keys
3. **Create a workspace** from the admin panel
4. **Ingest data** — open the workspace, go to **Settings → Knowledge Base** and upload some documents
5. **Test RAG** — ask questions in the workspace chat related to the ingested data
6. **Add connectors** — connect databases or enterprise tools (GitHub, Notion, Slack, etc.) from the Connectors panel
7. **Build & test agents** — create an agent, attach connectors, and run it

Thank you for testing Open Enterprise! If you run into issues, please [open an issue](https://github.com/openenterprise-info/open-enterprise-community/issues).

---

## License

[AGPL-3.0](LICENSE)
