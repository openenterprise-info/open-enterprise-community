const router = require("express").Router();
const { authenticate, requireAdmin, requireManagerOrAdmin } = require("../middleware/auth");
const { canAddConnector, getTierFromDB } = require("../utils/tier");
const { logActivity }                = require("../utils/activityLog");

const SUPPORTED_TYPES = ["postgresql", "mysql", "mssql", "oracle", "mongodb", "rest-api", "gmail", "slack", "jira", "confluence", "notion", "hubspot", "freshdesk", "zendesk", "github", "zoho-mail", "gdrive", "ssh"];

function generateSlug(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "") || "connector";
}

router.use(authenticate, requireManagerOrAdmin);

const SENSITIVE_AUTH_KEYS = new Set([
  "password", "privateKey", "apiToken", "apiKey", "botToken", "appPassword",
  "bearerToken", "integrationToken", "privateAppToken", "personalAccessToken",
  "keyFileJson", "refreshToken", "accessToken", "clientSecret",
]);

// List connectors for a workspace
router.get("/workspaces/:workspaceId/connectors", async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const [connectors, totalConnectors, tier] = await Promise.all([
      req.db.connector.findMany({
        where:   { workspaceId },
        orderBy: { createdAt: "asc" },
        select:  { id: true, name: true, slug: true, type: true, config: true, authConfig: true, status: true, lastTestedAt: true, createdAt: true }
      }),
      req.db.connector.count(),
      getTierFromDB(req.db),
    ]);
    // Return non-sensitive auth fields (host, port, username, email, etc.) for edit pre-fill
    const sanitized = connectors.map(({ authConfig, ...c }) => {
      const auth = authConfig ? JSON.parse(authConfig) : {};
      const publicAuth = Object.fromEntries(Object.entries(auth).filter(([k]) => !SENSITIVE_AUTH_KEYS.has(k)));
      return { ...c, publicAuth };        // slug is already in ...c
    });
    res.json({ connectors: sanitized, totalConnectors, tier: { maxConnectors: isFinite(tier.maxConnectors) ? tier.maxConnectors : null } });
  } catch (err) {
    console.error("[connectors] GET failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Check slug availability
router.get("/connectors/check-slug", async (req, res) => {
  const { slug, excludeId } = req.query;
  if (!slug) return res.json({ available: false });
  const clean = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!clean) return res.json({ available: false });
  const existing = await req.db.connector.findUnique({ where: { slug: clean }, select: { id: true } });
  const available = !existing || (excludeId && existing.id === parseInt(excludeId));
  res.json({ available });
});

// Create connector
router.post("/workspaces/:workspaceId/connectors", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  const { name, slug: providedSlug, type, config, authConfig } = req.body;

  if (!name?.trim())          return res.status(400).json({ error: "Name required" });
  if (!SUPPORTED_TYPES.includes(type)) return res.status(400).json({ error: `Unsupported type. Supported: ${SUPPORTED_TYPES.join(", ")}` });

  const existing = await req.db.connector.count();
  if (!await canAddConnector(existing, req.db)) {
    const tier = await getTierFromDB(req.db);
    return res.status(403).json({ error: `Tier limit reached. Max ${tier.maxConnectors} connector(s) allowed across the instance.` });
  }

  // Auto-generate unique slug from name (same rules as agent slugs)
  let baseSlug = providedSlug ? providedSlug.toLowerCase().replace(/[^a-z0-9]/g, "") : generateSlug(name.trim());
  if (!baseSlug) baseSlug = "connector";
  let slug = baseSlug;
  let suffix = 2;
  while (await req.db.connector.findUnique({ where: { slug } })) {
    slug = `${baseSlug}${suffix++}`;
  }

  const connector = await req.db.connector.create({
    data: {
      workspaceId,
      name:       name.trim(),
      slug,
      type,
      config:     config     ? JSON.stringify(config)     : null,
      authConfig: authConfig ? JSON.stringify(authConfig) : null,
      status:     "active",
    },
    select: { id: true, name: true, slug: true, type: true, config: true, status: true, createdAt: true }
  });

  await logActivity(req.db, req.user, "connector.created", { workspaceId, name: connector.name, type });
  res.json({ connector });
});

// Update connector
router.put("/workspaces/:workspaceId/connectors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, slug, config, authConfig, status } = req.body;
    const data = {};
    if (name   !== undefined) data.name   = name.trim();
    if (slug   !== undefined) data.slug   = slug ? slug.toLowerCase().replace(/[^a-z0-9]/g, "") || null : null;
    if (config !== undefined) data.config = config ? JSON.stringify(config) : null;
    if (status !== undefined) data.status = status;

    if (authConfig !== undefined) {
      if (!authConfig) {
        data.authConfig = null;
      } else {
        // Merge with existing: blank fields in the edit form mean "keep existing"
        const existing = await req.db.connector.findUnique({ where: { id }, select: { authConfig: true } });
        const existingAuth = existing?.authConfig ? JSON.parse(existing.authConfig) : {};
        const merged = { ...existingAuth };
        for (const [k, v] of Object.entries(authConfig)) {
          if (v !== "" && v !== null && v !== undefined) merged[k] = v;
        }
        data.authConfig = JSON.stringify(merged);
      }
    }

    const connector = await req.db.connector.update({
      where:  { id },
      data,
      select: { id: true, name: true, slug: true, type: true, config: true, status: true, lastTestedAt: true }
    });
    res.json({ connector });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Slug is already in use by another connector. Choose a different slug." });
    }
    console.error("[connectors] PUT failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Test connector connection
router.post("/workspaces/:workspaceId/connectors/:id/test", async (req, res) => {
  const id        = parseInt(req.params.id);
  const connector = await req.db.connector.findUnique({ where: { id } });
  if (!connector) return res.status(404).json({ error: "Connector not found" });

  const cfg  = connector.config     ? JSON.parse(connector.config)     : {};
  const auth = connector.authConfig ? JSON.parse(connector.authConfig) : {};

  let success = false;
  let message = "";

  try {
    if (connector.type === "postgresql") {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: cfg.url || undefined,
        host:     cfg.host || "localhost",
        port:     parseInt(cfg.port || "5432"),
        database: cfg.database || undefined,
        user:     auth.username || undefined,
        password: auth.password || undefined,
        ssl:      cfg.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 8000,
      });
      await pool.query("SELECT 1");
      await pool.end();
      success = true; message = "Connected successfully.";
    } else if (connector.type === "mysql") {
      const mysql = require("mysql2/promise");
      const TIMEOUT_MS = 8000;
      const connPromise = mysql.createConnection({
        host:           cfg.host     || "localhost",
        port:           parseInt(cfg.port || "3306"),
        database:       cfg.database || undefined,
        user:           auth.username || undefined,
        password:       auth.password || undefined,
        connectTimeout: TIMEOUT_MS,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timed out")), TIMEOUT_MS)
      );
      const conn = await Promise.race([connPromise, timeoutPromise]);
      await conn.ping();
      await conn.execute("SELECT 1");
      await conn.end();
      success = true; message = "Connected successfully.";
    } else if (connector.type === "mssql") {
      const mssql = require("mssql");
      const pool  = await mssql.connect({
        server:   cfg.host     || "localhost",
        port:     parseInt(cfg.port || "1433"),
        database: cfg.database || undefined,
        user:     auth.username || undefined,
        password: auth.password || undefined,
        options: {
          encrypt:                cfg.encrypt !== false,
          trustServerCertificate: cfg.trustServerCertificate || false,
        },
        connectionTimeout: 8000,
        requestTimeout:    8000,
      });
      await pool.request().query("SELECT 1 AS ok");
      await pool.close();
      success = true; message = "Connected successfully.";
    } else if (connector.type === "oracle") {
      const oracledb = require("oracledb");
      const connectString = cfg.connectString ||
        `${cfg.host || "localhost"}:${cfg.port || "1521"}/${cfg.serviceName || cfg.sid || "ORCL"}`;
      const conn = await oracledb.getConnection({
        user: auth.username || undefined, password: auth.password || undefined, connectString,
      });
      await conn.execute("SELECT 1 FROM DUAL");
      await conn.close();
      success = true; message = "Connected successfully.";
    } else if (connector.type === "mongodb") {
      const { MongoClient } = require("mongodb");
      const { buildUri } = require("../utils/tools/adapters/mongodb");
      const uri    = buildUri(cfg, auth);
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
      await client.connect();
      await client.db(cfg.database || "admin").command({ ping: 1 });
      await client.close();
      success = true; message = "Connected successfully.";
    } else if (connector.type === "gmail") {
      const { google }  = require("googleapis");
      const { makeOAuth2Client } = require("../utils/tools/adapters/gmail");
      if (!auth.refreshToken) throw new Error("Not connected — please reconnect via the Integrations tab.");
      const oauth2 = await makeOAuth2Client(req.db);
      oauth2.setCredentials({ access_token: auth.accessToken, refresh_token: auth.refreshToken, expiry_date: auth.expiresAt });
      const gmail = google.gmail({ version: "v1", auth: oauth2 });
      const profile = await gmail.users.getProfile({ userId: "me" });
      success = true; message = `Connected as ${profile.data.emailAddress}`;
    } else if (connector.type === "gdrive") {
      const { google }  = require("googleapis");
      const { makeOAuth2Client } = require("../utils/tools/adapters/gmail");
      if (!auth.refreshToken) throw new Error("Not connected — please reconnect via the Integrations tab.");
      const oauth2 = await makeOAuth2Client(req.db, connector.workspaceId);
      oauth2.setCredentials({ access_token: auth.accessToken, refresh_token: auth.refreshToken, expiry_date: auth.expiresAt });
      const drive = google.drive({ version: "v3", auth: oauth2 });
      const res = await drive.about.get({ fields: "user" });
      success = true; message = `Connected as ${res.data.user.emailAddress}`;
    } else if (["slack","jira","confluence","notion","hubspot","freshdesk","zendesk","github"].includes(connector.type)) {
      const { ADAPTERS } = require("../utils/tools/registry");
      const adapter = ADAPTERS[connector.type];
      const ok = await adapter.testConnection(auth);
      if (!ok) throw new Error("Connection test failed — check your credentials.");
      success = true; message = "Connected successfully.";
    } else if (connector.type === "zoho-mail") {
      const nodemailer = require("nodemailer");
      const port = parseInt(auth.smtpPort || "465");
      const transport = nodemailer.createTransport({
        host:   auth.smtpHost || "smtp.zoho.com",
        port,
        secure: port === 465,
        auth: { user: auth.email, pass: auth.appPassword },
        connectionTimeout: 8000,
      });
      await transport.verify();
      success = true; message = `Connected as ${auth.email}`;
    } else if (connector.type === "ssh") {
      const { Client } = require("ssh2");
      await new Promise((resolve, reject) => {
        const conn = new Client();
        const timer = setTimeout(() => { conn.end(); reject(new Error("Connection timed out")); }, 10000);
        conn.on("ready", () => { clearTimeout(timer); conn.end(); resolve(); });
        conn.on("error", err => { clearTimeout(timer); reject(err); });
        const cfg2 = { host: auth.host || cfg.host, port: parseInt(auth.port || cfg.port || "22"), username: auth.username || cfg.username };
        if (auth.privateKey || cfg.privateKey) cfg2.privateKey = auth.privateKey || cfg.privateKey;
        conn.connect(cfg2);
      });
      success = true; message = `Connected to ${auth.host || cfg.host} as ${auth.username || cfg.username}`;
    } else if (connector.type === "rest-api") {
      const axios = require("axios");
      const baseUrl = (cfg.baseUrl || "").replace(/\/$/, "");
      if (!baseUrl) throw new Error("Base URL not configured");
      const headers = {};
      if (auth.apiKey)      headers[auth.headerName || "X-API-Key"] = auth.apiKey;
      if (auth.bearerToken) headers["Authorization"] = `Bearer ${auth.bearerToken}`;
      await axios.get(baseUrl + (cfg.healthPath || "/"), { headers, timeout: 8000 });
      success = true; message = "API reachable.";
    }
  } catch (err) {
    message = err.message || err.errors?.[0]?.message || err.code || String(err) || "Connection failed";
  }

  await req.db.connector.update({
    where: { id },
    data:  { status: success ? "active" : "error", lastTestedAt: new Date() }
  });

  res.json({ success, message });
});

// Delete connector
router.delete("/workspaces/:workspaceId/connectors/:id", async (req, res) => {
  const id        = parseInt(req.params.id);
  const connector = await req.db.connector.findUnique({ where: { id }, select: { name: true, type: true } });
  if (!connector) return res.status(404).json({ error: "Not found" });
  await req.db.connector.delete({ where: { id } });
  await logActivity(req.db, req.user, "connector.deleted", { name: connector.name, type: connector.type });
  res.json({ success: true });
});

module.exports = router;
