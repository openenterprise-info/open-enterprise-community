require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"));

const authRoutes      = require("./routes/auth");
const workspaceRoutes = require("./routes/workspaces");
const documentRoutes  = require("./routes/documents");
const chatRoutes      = require("./routes/chat");
const threadRoutes    = require("./routes/threads");
const adminRoutes     = require("./routes/admin");
const settingsRoutes  = require("./routes/settings");
const modelsRoutes    = require("./routes/models");
const audioRoutes      = require("./routes/audio");
const dashboardRoutes  = require("./routes/dashboard");
const embedRoutes      = require("./routes/embed");
const apiKeyRoutes     = require("./routes/apiKeys");
const connectorRoutes  = require("./routes/connectors");
const oauthRoutes      = require("./routes/oauth");
const { router: ssoRoutes } = require("./routes/sso");
const agentRoutes      = require("./routes/agents");
const scheduler        = require("./utils/scheduler");
const superAdminRoutes = require("./routes/superadmin");
const v1Routes         = require("./routes/v1");
const swaggerUi        = require("swagger-ui-express");
const openApiSpec      = { ...require("./docs/openapi.json"), info: { ...require("./docs/openapi.json").info, version } };
const ingestionQueue   = require("./utils/ingestionQueue");

const app    = express();
const prisma = new PrismaClient();
const PORT   = process.env.SERVER_PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => { req.db = prisma; next(); });

app.use("/api/auth",       authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/documents",  documentRoutes);
app.use("/api/chat",       chatRoutes);
app.use("/api/threads",    threadRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/settings",   settingsRoutes);
app.use("/api/models",     modelsRoutes);
app.use("/api/audio",      audioRoutes);
app.use("/api/dashboard",  dashboardRoutes);
app.use("/api/embed",          embedRoutes);
app.use("/api/admin/api-keys",  apiKeyRoutes);
app.use("/api/admin",          connectorRoutes);
app.use("/api/oauth",          oauthRoutes);
app.use("/api/sso",            ssoRoutes);
app.use("/api/admin",          agentRoutes);
app.use("/api/superadmin",    superAdminRoutes);

// Swagger UI — public, must be registered before the authenticated v1 router
app.get("/api/v1/docs/openapi.json", (_req, res) => res.json(openApiSpec));
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: "Open Enterprise API Docs",
  customCss: ".swagger-ui .topbar { display: none }",
  swaggerOptions: { persistAuthorization: true, defaultModelsExpandDepth: -1 },
}));

app.use("/api/v1",         v1Routes);

app.get("/api/health", (_req, res) => res.json({ status: "ok", version }));

// Feature flags — readable by any authenticated user
app.get("/api/features", async (req, res) => {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ["feature.kbSharing", "feature.agentSharing", "feature.connectorSharing"] } },
    });
    const s = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json({
      kbSharing:        s["feature.kbSharing"]        === "true",
      agentSharing:     s["feature.agentSharing"]     === "true",
      connectorSharing: s["feature.connectorSharing"] === "true",
    });
  } catch { res.json({ kbSharing: false, agentSharing: false, connectorSharing: false }); }
});

async function recoverPendingJobs() {
  try {
    const stuck = await prisma.document.findMany({
      where:   { status: { in: ["queued", "ingesting"] } },
      include: { workspace: true }
    });
    if (!stuck.length) return;

    console.log(`[Queue] Recovering ${stuck.length} interrupted document(s)…`);

    for (const doc of stuck) {
      if (doc.type === "website-crawl") continue; // crawler tracker docs have no chunks of their own

      const reset = { status: "queued", chunksProcessed: 0, cancelRequested: false, errorMessage: null };

      if (doc.type === "url") {
        await prisma.document.update({ where: { uid: doc.uid }, data: reset });
        ingestionQueue.enqueue(prisma, doc.workspace, doc, doc.name, "url");
      } else if (doc.sourcePath && fs.existsSync(doc.sourcePath)) {
        await prisma.document.update({ where: { uid: doc.uid }, data: reset });
        const sourceType = doc.type === "ocr" ? "ocr" : "file";
        const keepFile   = !doc.sourcePath.includes("uploads");
        ingestionQueue.enqueue(prisma, doc.workspace, doc, doc.sourcePath, sourceType, keepFile);
      } else {
        await prisma.document.update({
          where: { uid: doc.uid },
          data:  { status: "failed", errorMessage: "Source file unavailable after server restart. Please re-upload." }
        });
      }
    }
  } catch (err) {
    console.error("[Queue] Recovery error:", err.message);
  }
}

// Serve built frontend in production
if (process.env.NODE_ENV === "production") {
  const path = require("path");
  const publicDir = path.join(__dirname, "../../public");
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
}

app.listen(PORT, async () => {
  console.log(`Open Enterprise server running on port ${PORT}`);
  await recoverPendingJobs();
  await scheduler.init(prisma);
});
