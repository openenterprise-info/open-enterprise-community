import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";
import ConfirmDialog from "./ConfirmDialog";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

const THIRD_PARTY = [
  { id: "sql",        name: "SQL Connector",    desc: "Query MySQL, PostgreSQL, MSSQL, or SQLite and ingest results as knowledge", color: "bg-teal-600",    initial: "SQL" },
  { id: "filesystem", name: "File System",      desc: "Mount a server-side directory and continuously sync new or changed files",  color: "bg-slate-600",   initial: "FS"  },
  { id: "freshdesk",  name: "Freshdesk",       desc: "Sync tickets, articles, and solution folders",            color: "bg-green-500",   initial: "F"  },
  { id: "zoho-desk",  name: "Zoho Desk",        desc: "Sync support tickets, FAQs, and help articles",          color: "bg-red-500",     initial: "ZD" },
  { id: "zendesk",    name: "Zendesk",          desc: "Sync help center articles and support tickets",           color: "bg-emerald-600", initial: "Z"  },
  { id: "intercom",   name: "Intercom",         desc: "Sync articles, conversations, and help center content",   color: "bg-blue-400",    initial: "I"  },
  { id: "salesforce", name: "Salesforce",       desc: "Sync accounts, cases, knowledge articles, and objects",   color: "bg-sky-500",     initial: "SF" },
  { id: "hubspot",    name: "HubSpot",          desc: "Sync contacts, deals, and knowledge base articles",       color: "bg-orange-500",  initial: "H"  },
  { id: "zoho-crm",   name: "Zoho CRM",         desc: "Sync leads, accounts, contacts, and notes",              color: "bg-red-600",     initial: "ZC" },
  { id: "zoho-books", name: "Zoho Books",       desc: "Sync invoices, customer records, and financial docs",     color: "bg-orange-600",  initial: "ZB" },
  { id: "pipedrive",  name: "Pipedrive",        desc: "Sync deals, contacts, and pipeline notes",                color: "bg-green-600",   initial: "P"  },
  { id: "dynamics",   name: "Dynamics 365",     desc: "Sync CRM records, cases, and knowledge articles",         color: "bg-blue-900",    initial: "D"  },
  { id: "notion",     name: "Notion",           desc: "Sync pages, databases, and team wikis",                   color: "bg-gray-800",    initial: "N"  },
  { id: "confluence", name: "Confluence",       desc: "Sync spaces, pages, and Atlassian documentation",         color: "bg-blue-500",    initial: "C"  },
  { id: "jira",       name: "Jira",             desc: "Sync issues, projects, and sprint documentation",         color: "bg-indigo-500",  initial: "J"  },
  { id: "gdrive",     name: "Google Drive",     desc: "Sync documents, spreadsheets, and Drive folders",         color: "bg-yellow-500",  initial: "G"  },
  { id: "sharepoint", name: "SharePoint",       desc: "Sync sites, document libraries, and SharePoint pages",    color: "bg-blue-700",    initial: "SP" },
  { id: "dropbox",    name: "Dropbox",          desc: "Sync files and folders from your Dropbox account",        color: "bg-blue-600",    initial: "DB" },
  { id: "box",        name: "Box",              desc: "Sync files, folders, and Box Notes",                      color: "bg-blue-800",    initial: "BX" },
  { id: "github",     name: "GitHub",           desc: "Sync README files, wikis, and repo documentation",        color: "bg-gray-900",    initial: "GH" },
  { id: "slack",      name: "Slack",            desc: "Sync channel messages, files, and bookmarked content",    color: "bg-purple-600",  initial: "SL" },
  { id: "teams",      name: "Microsoft Teams",  desc: "Sync channel posts, files, and shared documents",         color: "bg-indigo-600",  initial: "MT" },
  { id: "monday",     name: "Monday.com",       desc: "Sync boards, items, and project documentation",           color: "bg-pink-500",    initial: "M"  },
  { id: "asana",      name: "Asana",            desc: "Sync tasks, projects, and team workspaces",               color: "bg-rose-500",    initial: "A"  },
  { id: "servicenow", name: "ServiceNow",       desc: "Sync incidents, knowledge base, and CMDB records",        color: "bg-green-700",   initial: "SN" },
  { id: "sap",        name: "SAP",              desc: "Sync SAP modules, knowledge docs, and master data",       color: "bg-amber-600",   initial: "S"  },
  { id: "workday",    name: "Workday",          desc: "Sync HR policies, org docs, and workforce data",          color: "bg-orange-700",  initial: "W"  },
];

function Spinner({ className = "w-4 h-4" }) {
  return <div className={`${className} border-[2.5px] border-current border-t-transparent rounded-full animate-spin`} />;
}


const INGEST_TABS = [
  { id: "folder",  label: "Folder",      icon: "M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L11 7h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" },
  { id: "upload",  label: "File Upload", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
  { id: "cloud-storage", label: "Cloud Storage", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
  { id: "website", label: "Website",     icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" },
  { id: "ocr",     label: "OCR",         icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
];

export default function ConnectorsPanel({ workspaceSlug, onDocumentAdded, refreshTrigger }) {
  const [activeTab, setActiveTab]   = useState("folder");
  const [ingesting, setIngesting]   = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [ocrFiles, setOcrFiles]     = useState([]);
  const [url, setUrl]               = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [crawlUrl, setCrawlUrl]     = useState("");
  const [crawlMaxPages, setCrawlMaxPages] = useState(20);
  const [crawlMaxDepth, setCrawlMaxDepth] = useState(2);
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [driveConnectors, setDriveConnectors] = useState([]);
  const [driveConnectorId, setDriveConnectorId] = useState("");
  const [success, setSuccess]       = useState("");
  const [error, setError]           = useState("");
  const [storageInfo, setStorageInfo] = useState({ usedBytes: 0, usedGb: 0, limitGb: null, maxFileSizeMb: null, loaded: false });
  const fileRef    = useRef();
  const ocrFileRef = useRef();

  const refreshStorage = useCallback(async () => {
    try {
      const { data } = await api.get(`/documents/${workspaceSlug}/storage-info`);
      setStorageInfo({ ...data, loaded: true });
    } catch { /* non-fatal */ }
  }, [workspaceSlug]);

  useEffect(() => { refreshStorage(); }, [refreshStorage]);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    refreshStorage();
  }, [refreshTrigger]);

  useEffect(() => {
    if (!workspaceSlug) return;
    api.get(`/documents/${workspaceSlug}/cloud-connectors`)
      .then(r => { setDriveConnectors(r.data.connectors || []); if (r.data.connectors?.length) setDriveConnectorId(String(r.data.connectors[0].id)); })
      .catch(() => {});
  }, [workspaceSlug]);


  const atStorageLimit = storageInfo.loaded && storageInfo.limitGb !== null && storageInfo.usedGb >= storageInfo.limitGb;
  const storagePercent = storageInfo.limitGb ? Math.min(100, (storageInfo.usedGb / storageInfo.limitGb) * 100) : 0;

  const canIngest = !ingesting && !atStorageLimit && (() => {
    if (activeTab === "upload")  return selectedFiles.length > 0;
    if (activeTab === "ocr")     return ocrFiles.length > 0;
    if (activeTab === "folder")  return folderPath.trim().length > 0;
    if (activeTab === "url")     return url.trim().length > 0;
    if (activeTab === "website") return crawlUrl.trim().length > 0;
    if (activeTab === "cloud-storage") return driveFolderUrl.trim().length > 0 && driveConnectors.length > 0;
    return false;
  })();

  async function handleIngest() {
    setError(""); setSuccess(""); setIngesting(true);
    try {
      if (activeTab === "upload") {
        const batchId = crypto.randomUUID();
        const results = await Promise.allSettled(selectedFiles.map(async file => {
          const form = new FormData();
          form.append("file", file);
          await api.post(`/documents/${workspaceSlug}/upload`, form, { headers: { "X-Batch-Id": batchId } });
        }));
        const failedCnt = results.filter(r => r.status === "rejected").length;
        const okCnt = results.filter(r => r.status === "fulfilled").length;
        if (okCnt) { setSelectedFiles([]); if (fileRef.current) fileRef.current.value = ""; onDocumentAdded?.(); refreshStorage(); setSuccess(`${okCnt} file${okCnt > 1 ? "s" : ""} queued for ingestion.`); }
        if (failedCnt) { const e = results.find(r => r.status === "rejected"); setError(e?.reason?.response?.data?.error || `${failedCnt} file(s) failed.`); refreshStorage(); }

      } else if (activeTab === "ocr") {
        const batchId = crypto.randomUUID();
        let succeeded = 0;
        for (const file of ocrFiles) {
          try {
            const form = new FormData();
            form.append("image", file);
            await api.post(`/documents/${workspaceSlug}/ocr`, form, { headers: { "X-Batch-Id": batchId } });
            succeeded++;
          } catch (err) {
            setError(err.response?.data?.error || `Failed: ${file.name}`);
          }
        }
        if (succeeded) { setOcrFiles([]); if (ocrFileRef.current) ocrFileRef.current.value = ""; onDocumentAdded?.(); setSuccess(`${succeeded} image${succeeded > 1 ? "s" : ""} queued for OCR extraction.`); }

      } else if (activeTab === "folder") {
        await api.post(`/documents/${workspaceSlug}/ingest-folder`, { folderPath: folderPath.trim() });
        setFolderPath(""); onDocumentAdded?.(); setSuccess("Folder queued for ingestion.");

      } else if (activeTab === "url") {
        await api.post(`/documents/${workspaceSlug}/ingest-url`, { url: url.trim() });
        setUrl(""); onDocumentAdded?.(); setSuccess("URL queued for ingestion.");

      } else if (activeTab === "website") {
        await api.post(`/documents/${workspaceSlug}/ingest-website`, {
          startUrl: crawlUrl.trim(), maxPages: crawlMaxPages, maxDepth: crawlMaxDepth
        });
        setCrawlUrl(""); onDocumentAdded?.(); setSuccess("Website crawl queued — pages will appear as discovered.");

      } else if (activeTab === "cloud-storage") {
        const folderMatch = driveFolderUrl.match(/\/folders\/([^?&/]+)/);
        const fileMatch   = driveFolderUrl.match(/\/d\/([^?&/]+)/);
        const resourceId  = folderMatch?.[1] || fileMatch?.[1] || driveFolderUrl.trim();
        const urlLower = driveFolderUrl.toLowerCase();
        const typeByUrl = urlLower.includes("drive.google.com") ? "gdrive"
          : urlLower.includes("dropbox.com") ? "dropbox"
          : (urlLower.includes("onedrive.live.com") || urlLower.includes("sharepoint.com") || urlLower.includes("1drv.ms")) ? "onedrive"
          : urlLower.includes("box.com") ? "box"
          : null;
        const selectedConnector = (typeByUrl ? driveConnectors.find(c => c.type === typeByUrl) : null) || driveConnectors[0];
        const connId = selectedConnector?.id;
        const endpoint = selectedConnector?.type === "gdrive" ? "ingest-gdrive-folder" : "ingest-cloud-folder";
        const payload  = selectedConnector?.type === "gdrive"
          ? { connectorId: connId, folderId: resourceId, folderName: driveFolderUrl.trim() }
          : { connectorId: connId, resourceId, resourceUrl: driveFolderUrl.trim() };
        await api.post(`/documents/${workspaceSlug}/${endpoint}`, payload);
        setDriveFolderUrl(""); onDocumentAdded?.(); setSuccess("Cloud storage folder queued for ingestion.");
      }

    } catch (err) {
      setError(err.response?.data?.error || "Ingestion failed.");
      refreshStorage();
    } finally {
      setIngesting(false);
    }
  }

  function handleTabChange(id) {
    setActiveTab(id);
    setError(""); setSuccess("");
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-3">

      {atStorageLimit && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
          Storage limit reached. Upgrade your plan to add more documents.
        </div>
      )}

      {/* Ingestion source section */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">

        {/* Tab selector */}
        <div className="grid grid-cols-5 border-b border-gray-200">
          {INGEST_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-indigo-600 border-b-2 border-indigo-500"
                  : "bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="px-4 py-4 space-y-3 min-h-[100px]">

          {activeTab === "upload" && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-400">PDF · DOCX · TXT · CSV · XLSX · JSON{storageInfo.maxFileSizeMb ? ` · Max ${storageInfo.maxFileSizeMb} MB per file` : ""}</p>
              <input type="file" ref={fileRef} className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls,.json" multiple
                onChange={e => { setSelectedFiles(Array.from(e.target.files)); setSuccess(""); }} />
              {selectedFiles.length === 0 ? (
                <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-lg py-6 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  Click to choose files
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-0.5 max-h-28 overflow-y-auto">
                    {selectedFiles.map((f, i) => (
                      <p key={i} className="text-xs text-gray-600 truncate">📄 {f.name} <span className="text-gray-400">({formatBytes(f.size)})</span></p>
                    ))}
                  </div>
                  <button onClick={() => { setSelectedFiles([]); if (fileRef.current) fileRef.current.value = ""; }} className="text-[10px] text-gray-400 hover:text-gray-600">
                    Clear selection
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "ocr" && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-400">JPG · PNG · GIF · WEBP · TIFF · BMP — requires vision-capable LLM</p>
              <input type="file" ref={ocrFileRef} className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp,image/tiff,image/bmp" multiple
                onChange={e => { setOcrFiles(Array.from(e.target.files)); setSuccess(""); }} />
              {ocrFiles.length === 0 ? (
                <button onClick={() => ocrFileRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-lg py-6 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  Click to choose images
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-0.5 max-h-28 overflow-y-auto">
                    {ocrFiles.map((f, i) => <p key={i} className="text-xs text-gray-600 truncate">🖼 {f.name}</p>)}
                  </div>
                  <button onClick={() => { setOcrFiles([]); if (ocrFileRef.current) ocrFileRef.current.value = ""; }} className="text-[10px] text-gray-400 hover:text-gray-600">
                    Clear selection
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "folder" && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-400">Path must be accessible on the <span className="font-medium text-gray-500">server</span> running Open Enterprise — not your local machine. For local files, use File Upload or Google Drive.</p>
              <input className="input text-sm w-full py-2 font-mono" value={folderPath}
                onChange={e => { setFolderPath(e.target.value); setSuccess(""); }}
                placeholder="e.g. /data/cvs  or  /mnt/s3-bucket/docs  or  \\fileserver\shared" />
            </div>
          )}

          {activeTab === "cloud-storage" && (
            <div className="space-y-2">
              {driveConnectors.length === 0 ? (
                <p className="text-[11px] text-amber-600">No cloud storage connected. Go to Integrations tab and connect Google Drive, OneDrive, Dropbox, or Box first.</p>
              ) : (
                <input className="input text-sm w-full py-2 font-mono" value={driveFolderUrl}
                  onChange={e => { setDriveFolderUrl(e.target.value); setSuccess(""); }}
                  placeholder="Folder or file URL from Google Drive, OneDrive, Dropbox, or Box" />
              )}
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-400">Fetch and ingest content from a single web page</p>
              <input className="input text-sm w-full py-2" type="url" value={url}
                onChange={e => { setUrl(e.target.value); setSuccess(""); }}
                placeholder="https://example.com/page" />
            </div>
          )}

          {activeTab === "website" && (
            <div className="space-y-2.5">
              <p className="text-[11px] text-gray-400">Crawl and ingest all pages starting from a seed URL</p>
              <input className="input text-sm w-full py-2" type="url" value={crawlUrl}
                onChange={e => { setCrawlUrl(e.target.value); setSuccess(""); }}
                placeholder="https://example.com" />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Max Pages</label>
                  <input type="number" min={1} max={100} value={crawlMaxPages}
                    onChange={e => setCrawlMaxPages(parseInt(e.target.value) || 20)}
                    className="input text-sm py-1.5 w-full" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Crawl Depth</label>
                  <input type="number" min={1} max={5} value={crawlMaxDepth}
                    onChange={e => setCrawlMaxDepth(parseInt(e.target.value) || 2)}
                    className="input text-sm py-1.5 w-full" />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Feedback messages */}
        {(error || success) && (
          <div className={`mx-4 mb-3 text-xs rounded-lg px-3 py-2 flex items-center justify-between ${error ? "text-red-600 bg-red-50" : "text-green-700 bg-green-50"}`}>
            {error || success}
            <button onClick={() => { setError(""); setSuccess(""); }} className="ml-2 font-bold">&times;</button>
          </div>
        )}

        {/* Single action button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleIngest}
            disabled={!canIngest}
            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ingesting ? <><Spinner className="w-4 h-4" /> Ingesting…</> : atStorageLimit ? "Storage limit reached" : "Start Ingestion"}
          </button>
        </div>
      </div>

    </div>
  );
}

// ── Connector types available now ────────────────────────────────────────────

const CONNECTOR_TYPES = [
  {
    id: "postgresql", label: "PostgreSQL", color: "bg-blue-600",
    fields: [
      { key: "config.host",     label: "Host",     placeholder: "localhost" },
      { key: "config.port",     label: "Port",     placeholder: "5432" },
      { key: "config.database", label: "Database", placeholder: "mydb" },
      { key: "auth.username",   label: "Username", placeholder: "postgres" },
      { key: "auth.password",   label: "Password", placeholder: "••••••••", type: "password" },
      { key: "config.ssl",      label: "SSL",      type: "checkbox" },
    ]
  },
  {
    id: "mysql", label: "MySQL", color: "bg-orange-500",
    fields: [
      { key: "config.host",     label: "Host",     placeholder: "localhost" },
      { key: "config.port",     label: "Port",     placeholder: "3306" },
      { key: "config.database", label: "Database", placeholder: "mydb" },
      { key: "auth.username",   label: "Username", placeholder: "root" },
      { key: "auth.password",   label: "Password", placeholder: "••••••••", type: "password" },
    ]
  },
  {
    id: "mssql", label: "MSSQL", color: "bg-red-700",
    fields: [
      { key: "config.host",                  label: "Host",                    placeholder: "localhost" },
      { key: "config.port",                  label: "Port",                    placeholder: "1433" },
      { key: "config.database",              label: "Database",                placeholder: "mydb" },
      { key: "auth.username",                label: "Username",                placeholder: "sa" },
      { key: "auth.password",                label: "Password",                placeholder: "••••••••", type: "password" },
      { key: "config.encrypt",               label: "Encrypt",                 type: "checkbox" },
      { key: "config.trustServerCertificate",label: "Trust Server Certificate",type: "checkbox" },
    ]
  },
  {
    id: "oracle", label: "Oracle", color: "bg-red-600",
    fields: [
      { key: "config.host",          label: "Host",             placeholder: "localhost" },
      { key: "config.port",          label: "Port",             placeholder: "1521" },
      { key: "config.serviceName",   label: "Service Name",     placeholder: "ORCL" },
      { key: "config.sid",           label: "SID (alt)",        placeholder: "ORCL (if no service name)" },
      { key: "auth.username",        label: "Username",         placeholder: "system" },
      { key: "auth.password",        label: "Password",         placeholder: "••••••••", type: "password" },
      { key: "config.connectString", label: "Connect String",   placeholder: "host:1521/ORCL (optional, overrides above)" },
    ]
  },
  {
    id: "mongodb", label: "MongoDB", color: "bg-green-600",
    fields: [
      { key: "config.uri",      label: "Connection URI", placeholder: "mongodb://localhost:27017/mydb (optional)" },
      { key: "config.host",     label: "Host",           placeholder: "localhost" },
      { key: "config.port",     label: "Port",           placeholder: "27017" },
      { key: "config.database", label: "Database",       placeholder: "mydb" },
      { key: "auth.username",   label: "Username",       placeholder: "(optional)" },
      { key: "auth.password",   label: "Password",       placeholder: "••••••••", type: "password" },
    ]
  },
  {
    id: "redis", label: "Redis", color: "bg-red-600",
    fields: [
      { key: "config.host",     label: "Host",          placeholder: "localhost" },
      { key: "config.port",     label: "Port",          placeholder: "6379" },
      { key: "auth.password",   label: "Password",      placeholder: "(optional)", type: "password" },
      { key: "config.db",       label: "DB Index",      placeholder: "0 (optional)" },
      { key: "config.tls",      label: "TLS",           type: "checkbox" },
    ]
  },
  {
    id: "sqlite", label: "SQLite", color: "bg-blue-400",
    fields: [
      { key: "config.filename", label: "Database File", placeholder: "/data/app.db or :memory:" },
    ]
  },
  {
    id: "snowflake", label: "Snowflake", color: "bg-cyan-500",
    fields: [
      { key: "config.account",   label: "Account",   placeholder: "xy12345.us-east-1" },
      { key: "config.warehouse", label: "Warehouse", placeholder: "COMPUTE_WH" },
      { key: "config.database",  label: "Database",  placeholder: "MY_DB" },
      { key: "config.schema",    label: "Schema",    placeholder: "PUBLIC" },
      { key: "auth.username",    label: "Username",  placeholder: "MYUSER" },
      { key: "auth.password",    label: "Password",  placeholder: "••••••••", type: "password" },
      { key: "config.role",      label: "Role",      placeholder: "SYSADMIN (optional)" },
    ]
  },
  {
    id: "bigquery", label: "BigQuery", color: "bg-blue-500",
    fields: [
      { key: "config.projectId",    label: "Project ID",           placeholder: "my-gcp-project" },
      { key: "config.dataset",      label: "Default Dataset",      placeholder: "my_dataset (optional)" },
      { key: "auth.keyFileJson",    label: "Service Account JSON", placeholder: '{"type":"service_account",...}', type: "password" },
    ]
  },
  {
    id: "cockroachdb", label: "CockroachDB", color: "bg-purple-600",
    fields: [
      { key: "config.host",     label: "Host",     placeholder: "free-tier.gcp-us-central1.cockroachlabs.cloud" },
      { key: "config.port",     label: "Port",     placeholder: "26257" },
      { key: "config.database", label: "Database", placeholder: "defaultdb" },
      { key: "auth.username",   label: "Username", placeholder: "root" },
      { key: "auth.password",   label: "Password", placeholder: "••••••••", type: "password" },
      { key: "config.ssl",      label: "SSL",      type: "checkbox" },
    ]
  },
  {
    id: "elasticsearch", label: "Elasticsearch", color: "bg-yellow-500",
    fields: [
      { key: "config.node",      label: "Node URL",  placeholder: "https://localhost:9200" },
      { key: "config.index",     label: "Default Index", placeholder: "my-index (optional)" },
      { key: "auth.username",    label: "Username",  placeholder: "(optional)" },
      { key: "auth.password",    label: "Password",  placeholder: "••••••••", type: "password" },
      { key: "auth.apiKey",      label: "API Key",   placeholder: "base64-encoded (optional)", type: "password" },
    ]
  },
];

const INTEGRATION_TYPES = [
  { id: "gmail",       label: "Gmail",           color: "bg-red-500",    initial: "G",  live: true,  desc: "Send emails, search inbox, read threads" },
  { id: "rest-api",    label: "REST API",        color: "bg-purple-600", initial: "R",  live: true,  desc: "Connect any REST API with bearer token or API key" },
  { id: "slack",       label: "Slack",           color: "bg-purple-600", initial: "SL", live: true,  desc: "Post messages, read channels, search conversations" },
  { id: "github",      label: "GitHub",          color: "bg-gray-900",   initial: "GH", live: true,  desc: "Search issues, list repos, create issues" },
  { id: "jira",        label: "Jira",            color: "bg-indigo-500", initial: "J",  live: true,  desc: "Search issues, create tickets, update status" },
  { id: "confluence",  label: "Confluence",      color: "bg-blue-500",   initial: "CF", live: true,  desc: "Read and search Confluence pages and spaces" },
  { id: "notion",      label: "Notion",          color: "bg-gray-800",   initial: "N",  live: true,  desc: "Read and update Notion pages and databases" },
  { id: "hubspot",     label: "HubSpot",         color: "bg-orange-600", initial: "H",  live: true,  desc: "Read contacts, deals, and company records" },
  { id: "freshdesk",   label: "Freshdesk",       color: "bg-green-500",  initial: "F",  live: true,  desc: "Search tickets and create support requests" },
  { id: "zendesk",     label: "Zendesk",         color: "bg-emerald-600",initial: "Z",  live: true,  desc: "Search help center and support tickets" },
  { id: "zoho-mail",   label: "Zoho Mail",       color: "bg-red-600",    initial: "ZM", live: true,  desc: "Send outbound emails via your Zoho Mail account" },
  { id: "ssh",         label: "SSH",             color: "bg-gray-800",   initial: "SSH",live: true,  desc: "Run shell commands on a remote server for security audits and DevOps automation" },
  { id: "gdrive",      label: "Google Drive",    color: "bg-yellow-500", initial: "GD", live: true,  desc: "Read CSV files and documents from your Google Drive" },
  { id: "onedrive",    label: "OneDrive",        color: "bg-blue-600",   initial: "OD", live: true,  desc: "Read and ingest files from Microsoft OneDrive",
    oauthSetup: { configureEndpoint: "/oauth/onedrive/configure",
      fields: [{ key: "clientId", label: "Azure Application (Client) ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
               { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "Your Azure app client secret" },
               { key: "tenantId", label: "Tenant ID", placeholder: "common (leave blank for personal/any org)", optional: true }],
      redirectPath: "/api/oauth/onedrive/callback",
      guide: ["Go to portal.azure.com → Azure Active Directory → App registrations","New registration → Web → add redirect URI below","Certificates & Secrets → New client secret → copy value","API Permissions → Microsoft Graph → Files.Read.All + offline_access + User.Read","Paste Client ID and Secret below → Connect"] } },
  { id: "dropbox",     label: "Dropbox",         color: "bg-blue-500",   initial: "DB", live: true,  desc: "Read and ingest files from Dropbox",
    oauthSetup: { configureEndpoint: "/oauth/dropbox/configure",
      fields: [{ key: "appKey", label: "App Key", placeholder: "Your Dropbox app key" },
               { key: "appSecret", label: "App Secret", type: "password", placeholder: "Your Dropbox app secret" }],
      redirectPath: "/api/oauth/dropbox/callback",
      guide: ["Go to dropbox.com/developers → App Console → Create app","Choose Scoped access → Full Dropbox → name your app","OAuth 2 → add redirect URI below","Permissions → enable files.content.read + account_info.read","Paste App Key and Secret below → Connect"] } },
  { id: "box",         label: "Box",             color: "bg-blue-700",   initial: "BX", live: true,  desc: "Read and ingest files from Box",
    oauthSetup: { configureEndpoint: "/oauth/box/configure",
      fields: [{ key: "clientId", label: "Client ID", placeholder: "Your Box app client ID" },
               { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "Your Box app client secret" }],
      redirectPath: "/api/oauth/box/callback",
      guide: ["Go to developer.box.com → My Apps → Create New App","Select Custom App → Standard OAuth 2.0","Add redirect URI below","Copy Client ID and Secret → Connect"] } },
  { id: "teams",        label: "Microsoft Teams", color: "bg-violet-700", initial: "MT",  live: false, desc: "Post messages and read channel content" },
  { id: "outlook",      label: "Outlook",         color: "bg-blue-600",   initial: "OL",  live: false, desc: "Send emails and search Outlook inbox" },
  { id: "sharepoint",   label: "SharePoint",      color: "bg-blue-700",   initial: "SP",  live: false, desc: "Read and search SharePoint sites and libraries" },
  { id: "salesforce",   label: "Salesforce",      color: "bg-sky-500",    initial: "SF",  live: false, desc: "Query and update CRM records and opportunities" },
  { id: "zoho-crm",     label: "Zoho CRM",        color: "bg-red-600",    initial: "ZC",  live: false, desc: "Search leads, accounts, contacts, and activities in Zoho CRM" },
  { id: "bullhorn",     label: "Bullhorn",         color: "bg-orange-500", initial: "BH",  live: false, desc: "Search candidates, jobs, and placements in Bullhorn ATS" },
  { id: "recruit-crm",  label: "Recruit CRM",      color: "bg-blue-600",   initial: "RC",  live: false, desc: "Manage candidates, contacts, and job pipelines in Recruit CRM" },
  { id: "vincere",      label: "Vincere",          color: "bg-indigo-600", initial: "VN",  live: false, desc: "Search candidates and jobs in Vincere recruitment platform" },
  { id: "manatal",      label: "Manatal",          color: "bg-teal-600",   initial: "MN",  live: false, desc: "Access candidates, jobs, and pipelines in Manatal ATS" },
  { id: "zoho-recruit",      label: "Zoho Recruit",      color: "bg-red-600",    initial: "ZR",  live: false, desc: "Search candidates, job openings, and interviews in Zoho Recruit" },
  // Databases (coming soon)
  { id: "dynamodb",          label: "DynamoDB",          color: "bg-orange-500",  initial: "DY",  live: false, desc: "Query Amazon DynamoDB tables and indexes" },
  { id: "cassandra",         label: "Cassandra",         color: "bg-blue-800",    initial: "CA",  live: false, desc: "Query Apache Cassandra keyspaces and tables" },
  { id: "mariadb",           label: "MariaDB",           color: "bg-amber-700",   initial: "MA",  live: false, desc: "Query MariaDB databases with full SQL support" },
  { id: "neo4j",             label: "Neo4j",             color: "bg-blue-600",    initial: "NJ",  live: false, desc: "Query Neo4j graph database with Cypher" },
  { id: "influxdb",          label: "InfluxDB",          color: "bg-purple-700",  initial: "IF",  live: false, desc: "Query InfluxDB time-series data" },
  { id: "clickhouse",        label: "ClickHouse",        color: "bg-yellow-600",  initial: "CH",  live: false, desc: "Query ClickHouse columnar analytics database" },
  { id: "couchdb",           label: "CouchDB",           color: "bg-red-800",     initial: "CO",  live: false, desc: "Query Apache CouchDB document store" },
  { id: "firestore",         label: "Firestore",         color: "bg-orange-400",  initial: "FS",  live: false, desc: "Query Google Firestore NoSQL database" },
  { id: "arangodb",          label: "ArangoDB",          color: "bg-teal-700",    initial: "AR",  live: false, desc: "Query ArangoDB multi-model database" },
  { id: "db2",               label: "IBM Db2",           color: "bg-blue-900",    initial: "D2",  live: false, desc: "Query IBM Db2 relational databases" },
  { id: "teradata",          label: "Teradata",          color: "bg-orange-700",  initial: "TD",  live: false, desc: "Query Teradata enterprise data warehouse" },
  { id: "duckdb",            label: "DuckDB",            color: "bg-yellow-500",  initial: "DK",  live: false, desc: "Query DuckDB in-process analytical database" },
  { id: "supabase",          label: "Supabase",          color: "bg-emerald-600", initial: "SB",  live: false, desc: "Query Supabase Postgres-backed database" },
  { id: "neon",              label: "Neon",              color: "bg-green-500",   initial: "NE",  live: false, desc: "Query serverless Neon Postgres database" },
  { id: "planetscale",       label: "PlanetScale",       color: "bg-gray-900",    initial: "PL",  live: false, desc: "Query PlanetScale serverless MySQL database" },
  // CRM / Sales
  { id: "pipedrive",         label: "Pipedrive",         color: "bg-green-600",   initial: "PD",  live: false, desc: "Read deals, contacts, and pipeline stages" },
  { id: "close-crm",         label: "Close CRM",         color: "bg-blue-500",    initial: "CL",  live: false, desc: "Search leads, contacts, and activity history" },
  { id: "copper",            label: "Copper",            color: "bg-teal-500",    initial: "CP",  live: false, desc: "Access contacts, opportunities, and tasks in Copper" },
  { id: "activecampaign",    label: "ActiveCampaign",    color: "bg-blue-600",    initial: "AC",  live: false, desc: "Manage contacts, deals, and automations" },
  { id: "keap",              label: "Keap",              color: "bg-green-500",   initial: "KP",  live: false, desc: "Access contacts, campaigns, and orders in Keap" },
  { id: "dynamics-crm",      label: "Dynamics 365",      color: "bg-blue-700",    initial: "DC",  live: false, desc: "Query Microsoft Dynamics 365 CRM records" },
  { id: "sugarcrm",          label: "SugarCRM",          color: "bg-red-700",     initial: "SC",  live: false, desc: "Search accounts, contacts, and opportunities" },
  { id: "capsule",           label: "Capsule CRM",       color: "bg-cyan-600",    initial: "CA",  live: false, desc: "Read contacts, opportunities, and cases" },
  { id: "nutshell",          label: "Nutshell",          color: "bg-green-600",   initial: "NU",  live: false, desc: "Access leads, contacts, and pipelines in Nutshell" },
  { id: "streak",            label: "Streak",            color: "bg-blue-500",    initial: "SK",  live: false, desc: "Access Gmail-based CRM pipelines and contacts" },
  // Marketing
  { id: "mailchimp",         label: "Mailchimp",         color: "bg-yellow-500",  initial: "MC",  live: false, desc: "Manage audiences, campaigns, and subscriber lists" },
  { id: "sendgrid",          label: "SendGrid",          color: "bg-blue-500",    initial: "SG",  live: false, desc: "Send transactional emails and manage contacts" },
  { id: "klaviyo",           label: "Klaviyo",           color: "bg-green-600",   initial: "KL",  live: false, desc: "Access profiles, flows, and campaign metrics" },
  { id: "marketo",           label: "Marketo",           color: "bg-purple-700",  initial: "MK",  live: false, desc: "Query leads, programs, and campaign activities" },
  { id: "brevo",             label: "Brevo",             color: "bg-teal-600",    initial: "BV",  live: false, desc: "Send emails and manage contacts via Brevo" },
  { id: "constant-contact",  label: "Constant Contact",  color: "bg-blue-600",    initial: "CT",  live: false, desc: "Manage lists, campaigns, and email contacts" },
  { id: "drip",              label: "Drip",              color: "bg-indigo-500",  initial: "DP",  live: false, desc: "Access subscriber segments and email automations" },
  { id: "convertkit",        label: "ConvertKit",        color: "bg-red-500",     initial: "CK",  live: false, desc: "Manage subscribers, tags, and email sequences" },
  { id: "campaign-monitor",  label: "Campaign Monitor",  color: "bg-blue-600",    initial: "CM",  live: false, desc: "Send campaigns and manage subscriber lists" },
  { id: "mailerlite",        label: "MailerLite",        color: "bg-green-500",   initial: "ML",  live: false, desc: "Manage email campaigns and subscriber groups" },
  // Communication
  { id: "twilio",            label: "Twilio",            color: "bg-red-500",     initial: "TW",  live: false, desc: "Send SMS, make calls, and manage conversations" },
  { id: "discord",           label: "Discord",           color: "bg-indigo-500",  initial: "DS",  live: false, desc: "Post messages and read Discord channel content" },
  { id: "telegram",          label: "Telegram",          color: "bg-blue-400",    initial: "TG",  live: false, desc: "Send messages and manage Telegram bot interactions" },
  { id: "whatsapp-business", label: "WhatsApp Business", color: "bg-green-500",   initial: "WA",  live: false, desc: "Send WhatsApp messages via Business API" },
  { id: "intercom",          label: "Intercom",          color: "bg-blue-500",    initial: "IC",  live: false, desc: "Read conversations, contacts, and help articles" },
  { id: "drift",             label: "Drift",             color: "bg-blue-600",    initial: "DF",  live: false, desc: "Access conversations and visitor intelligence" },
  { id: "crisp",             label: "Crisp",             color: "bg-indigo-400",  initial: "CR",  live: false, desc: "Manage chat conversations and contact profiles" },
  { id: "messagebird",       label: "MessageBird",       color: "bg-blue-500",    initial: "MB",  live: false, desc: "Send SMS, voice, and omnichannel messages" },
  { id: "vonage",            label: "Vonage",            color: "bg-purple-600",  initial: "VG",  live: false, desc: "Send SMS and make voice calls via Vonage API" },
  { id: "bandwidth",         label: "Bandwidth",         color: "bg-blue-700",    initial: "BW",  live: false, desc: "Send messages and manage voice calls via Bandwidth" },
  // Project Management
  { id: "trello",            label: "Trello",            color: "bg-blue-500",    initial: "TR",  live: false, desc: "Read boards, cards, and list activity" },
  { id: "asana",             label: "Asana",             color: "bg-pink-500",    initial: "AS",  live: false, desc: "Manage tasks, projects, and team workspaces" },
  { id: "monday",            label: "Monday.com",        color: "bg-red-500",     initial: "MN",  live: false, desc: "Query boards, items, and project documentation" },
  { id: "linear",            label: "Linear",            color: "bg-indigo-600",  initial: "LN",  live: false, desc: "Search issues, cycles, and engineering projects" },
  { id: "basecamp",          label: "Basecamp",          color: "bg-green-600",   initial: "BC",  live: false, desc: "Access to-dos, messages, and project schedules" },
  { id: "clickup",           label: "ClickUp",           color: "bg-purple-600",  initial: "CU",  live: false, desc: "Manage tasks, docs, and workspace hierarchies" },
  { id: "wrike",             label: "Wrike",             color: "bg-green-600",   initial: "WK",  live: false, desc: "Query tasks, projects, and workflow timelines" },
  { id: "smartsheet",        label: "Smartsheet",        color: "bg-blue-600",    initial: "SS",  live: false, desc: "Read sheets, rows, and project tracking data" },
  { id: "airtable",          label: "Airtable",          color: "bg-yellow-500",  initial: "AT",  live: false, desc: "Query Airtable bases, tables, and records" },
  { id: "height",            label: "Height",            color: "bg-gray-800",    initial: "HT",  live: false, desc: "Access tasks and project data in Height" },
  // HR / Payroll
  { id: "bamboohr",          label: "BambooHR",          color: "bg-green-600",   initial: "BM",  live: false, desc: "Access employee records, time-off, and org data" },
  { id: "workday",           label: "Workday",           color: "bg-orange-600",  initial: "WY",  live: false, desc: "Query HR, payroll, and workforce data" },
  { id: "adp",               label: "ADP",               color: "bg-red-600",     initial: "AD",  live: false, desc: "Access payroll, benefits, and employee records" },
  { id: "gusto",             label: "Gusto",             color: "bg-green-500",   initial: "GS",  live: false, desc: "Read payroll runs, employees, and benefits data" },
  { id: "rippling",          label: "Rippling",          color: "bg-yellow-600",  initial: "RL",  live: false, desc: "Access HR, IT, and finance employee data" },
  { id: "personio",          label: "Personio",          color: "bg-blue-500",    initial: "PE",  live: false, desc: "Read employee profiles, absences, and payroll" },
  { id: "hibob",             label: "HiBob",             color: "bg-blue-600",    initial: "HB",  live: false, desc: "Access people data, org structure, and time-off" },
  { id: "namely",            label: "Namely",            color: "bg-teal-600",    initial: "NM",  live: false, desc: "Query HR records, payroll, and time-tracking" },
  // Accounting / Finance
  { id: "quickbooks",        label: "QuickBooks",        color: "bg-green-600",   initial: "QB",  live: false, desc: "Read invoices, customers, and financial reports" },
  { id: "xero",              label: "Xero",              color: "bg-blue-500",    initial: "XR",  live: false, desc: "Access accounting records, invoices, and contacts" },
  { id: "freshbooks",        label: "FreshBooks",        color: "bg-blue-600",    initial: "FN",  live: false, desc: "Read invoices, expenses, and client records" },
  { id: "wave",              label: "Wave",              color: "bg-blue-400",    initial: "WV",  live: false, desc: "Access accounting, invoicing, and payment data" },
  { id: "zoho-books",        label: "Zoho Books",        color: "bg-red-500",     initial: "ZB",  live: false, desc: "Query invoices, contacts, and financial records" },
  { id: "netsuite",          label: "NetSuite",          color: "bg-orange-600",  initial: "NS",  live: false, desc: "Access ERP financials, inventory, and CRM data" },
  { id: "sage",              label: "Sage",              color: "bg-green-700",   initial: "SE",  live: false, desc: "Query accounting, payroll, and business data" },
  // E-commerce
  { id: "shopify",           label: "Shopify",           color: "bg-green-600",   initial: "SH",  live: false, desc: "Read orders, products, customers, and inventory" },
  { id: "woocommerce",       label: "WooCommerce",       color: "bg-purple-600",  initial: "WO",  live: false, desc: "Access store orders, products, and customer data" },
  { id: "bigcommerce",       label: "BigCommerce",       color: "bg-blue-700",    initial: "BG",  live: false, desc: "Query catalog, orders, and customer records" },
  { id: "stripe",            label: "Stripe",            color: "bg-indigo-600",  initial: "ST",  live: false, desc: "Read payments, subscriptions, and customer data" },
  { id: "square",            label: "Square",            color: "bg-gray-900",    initial: "SQ",  live: false, desc: "Access payments, orders, and inventory records" },
  { id: "paypal",            label: "PayPal",            color: "bg-blue-700",    initial: "PP",  live: false, desc: "Read transactions, invoices, and account details" },
  { id: "magento",           label: "Magento",           color: "bg-orange-600",  initial: "MG",  live: false, desc: "Query catalog, orders, and customer segments" },
  // Cloud / DevOps
  { id: "aws-s3",            label: "Amazon S3",         color: "bg-orange-500",  initial: "S3",  live: false, desc: "List and read files from Amazon S3 buckets" },
  { id: "azure-blob",        label: "Azure Blob",        color: "bg-blue-600",    initial: "AZ",  live: false, desc: "Access files and containers in Azure Blob Storage" },
  { id: "gcs",               label: "Google Cloud",      color: "bg-blue-500",    initial: "GC",  live: false, desc: "Read files and buckets from Google Cloud Storage" },
  { id: "jenkins",           label: "Jenkins",           color: "bg-red-600",     initial: "JK",  live: false, desc: "Trigger builds and read pipeline status" },
  { id: "circleci",          label: "CircleCI",          color: "bg-gray-800",    initial: "CI",  live: false, desc: "Read pipeline runs, jobs, and test results" },
  { id: "gitlab",            label: "GitLab",            color: "bg-orange-600",  initial: "GL",  live: false, desc: "Search issues, MRs, and GitLab project data" },
  { id: "bitbucket",         label: "Bitbucket",         color: "bg-blue-600",    initial: "BT",  live: false, desc: "Access repos, PRs, and Bitbucket pipeline runs" },
  { id: "datadog",           label: "Datadog",           color: "bg-purple-600",  initial: "DD",  live: false, desc: "Query metrics, logs, and infrastructure monitors" },
  // Observability / ITSM
  { id: "sentry",            label: "Sentry",            color: "bg-purple-700",  initial: "SY",  live: false, desc: "Search errors, issues, and release health data" },
  { id: "pagerduty",         label: "PagerDuty",         color: "bg-green-600",   initial: "PG",  live: false, desc: "Read incidents, on-call schedules, and alerts" },
  { id: "newrelic",          label: "New Relic",         color: "bg-blue-500",    initial: "NR",  live: false, desc: "Query APM metrics, traces, and alert conditions" },
  { id: "splunk",            label: "Splunk",            color: "bg-orange-500",  initial: "SP",  live: false, desc: "Search logs, events, and Splunk dashboards" },
  { id: "servicenow",        label: "ServiceNow",        color: "bg-green-600",   initial: "SN",  live: false, desc: "Query incidents, CMDB records, and knowledge base" },
  { id: "opsgenie",          label: "Opsgenie",          color: "bg-blue-500",    initial: "OG",  live: false, desc: "Read alerts, on-call schedules, and incident data" },
  { id: "grafana",           label: "Grafana",           color: "bg-orange-600",  initial: "GF",  live: false, desc: "Access dashboards, alerts, and metric annotations" },
  { id: "kibana",            label: "Kibana",            color: "bg-pink-600",    initial: "KB",  live: false, desc: "Search Elasticsearch indices via Kibana" },
  // Analytics
  { id: "mixpanel",          label: "Mixpanel",          color: "bg-purple-600",  initial: "MX",  live: false, desc: "Query user events, funnels, and retention reports" },
  { id: "amplitude",         label: "Amplitude",         color: "bg-blue-600",    initial: "AP",  live: false, desc: "Read product analytics, cohorts, and event data" },
  { id: "segment",           label: "Segment",           color: "bg-green-600",   initial: "SG",  live: false, desc: "Access customer data streams and profile traits" },
  { id: "heap",              label: "Heap",              color: "bg-purple-500",  initial: "HP",  live: false, desc: "Query auto-captured user events and sessions" },
  { id: "posthog",           label: "PostHog",           color: "bg-orange-500",  initial: "PH",  live: false, desc: "Read product events, feature flags, and recordings" },
  { id: "google-analytics",  label: "Google Analytics",  color: "bg-orange-500",  initial: "GA",  live: false, desc: "Query traffic, conversions, and audience reports" },
  { id: "tableau",           label: "Tableau",           color: "bg-blue-700",    initial: "TB",  live: false, desc: "Access Tableau workbooks, views, and data sources" },
];

// Fields required per API-key integration type
const API_KEY_FIELDS = {
  "rest-api": [{ key: "connectorName", label: "Name",             type: "text",     placeholder: "e.g. Deploy Hook" },
               { key: "baseUrl",      label: "Base URL",         type: "text",     placeholder: "https://api.example.com" },
               { key: "bearerToken",  label: "Bearer Token",     type: "password", placeholder: "sk-... (optional)" },
               { key: "apiKey",       label: "API Key",          type: "password", placeholder: "(optional)" },
               { key: "headerName",   label: "API Key Header",   type: "text",     placeholder: "X-API-Key (optional)" },
               { key: "healthPath",   label: "Health Check Path",type: "text",     placeholder: "/health (for test, optional)" }],
  slack:      [{ key: "botToken",            label: "Bot Token",             type: "password", placeholder: "xoxb-..." }],
  github:     [{ key: "name",               label: "Name",                  type: "text",     placeholder: "e.g. expressjs/express" },
               { key: "repoUrl",             label: "Repository URL",        type: "text",     placeholder: "https://github.com/owner/repo" },
               { key: "personalAccessToken", label: "Access Token",          type: "password", placeholder: "ghp_… (optional — private repos only)", optional: true }],
  jira:       [{ key: "domain",    label: "Domain",    type: "text",     placeholder: "yourco.atlassian.net" },
               { key: "email",     label: "Email",     type: "text",     placeholder: "you@company.com" },
               { key: "apiToken",  label: "API Token", type: "password", placeholder: "" }],
  confluence: [{ key: "domain",    label: "Domain",    type: "text",     placeholder: "yourco.atlassian.net" },
               { key: "email",     label: "Email",     type: "text",     placeholder: "you@company.com" },
               { key: "apiToken",  label: "API Token", type: "password", placeholder: "" }],
  notion:     [{ key: "integrationToken", label: "Integration Token", type: "password", placeholder: "secret_..." }],
  hubspot:    [{ key: "privateAppToken",  label: "Private App Token", type: "password", placeholder: "" }],
  freshdesk:  [{ key: "domain",  label: "Domain",  type: "text",     placeholder: "yourco.freshdesk.com" },
               { key: "apiKey",  label: "API Key", type: "password", placeholder: "" }],
  zendesk:    [{ key: "subdomain", label: "Subdomain", type: "text",     placeholder: "yourco" },
               { key: "email",    label: "Email",    type: "text",     placeholder: "you@company.com" },
               { key: "apiToken", label: "API Token",type: "password", placeholder: "" }],
  "zoho-mail":[{ key: "email",       label: "Zoho Email",    type: "text",     placeholder: "you@yourdomain.com" },
               { key: "appPassword", label: "App Password",  type: "password", placeholder: "Generated in Zoho → Security → App Passwords" },
               { key: "fromName",    label: "From Name",     type: "text",     placeholder: "e.g. Sales Team (optional)", optional: true },
               { key: "smtpHost",    label: "SMTP Host",     type: "text",     placeholder: "smtp.zoho.com (or smtp.zoho.in)", optional: true },
               { key: "smtpPort",    label: "SMTP Port",     type: "text",     placeholder: "465", optional: true }],
  "ssh":      [{ key: "host",       label: "Host",          type: "text",     placeholder: "e.g. 192.168.1.10 or server.example.com" },
               { key: "port",       label: "Port",          type: "text",     placeholder: "22", optional: true },
               { key: "username",   label: "Username",      type: "text",     placeholder: "e.g. ubuntu or deploy" },
               { key: "privateKey", label: "Private Key",   type: "textarea", placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----\n..." }],
};

function getNestedValue(obj, path) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  const result = { ...obj };
  let cur = result;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...(cur[keys[i]] || {}) };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return result;
}

const DB_CONNECTOR_IDS = new Set(CONNECTOR_TYPES.map(t => t.id));
const OAUTH_TYPES = new Set(["gmail", "gdrive", "onedrive", "dropbox", "box"]);
const CLOUD_STORAGE_TYPES = new Set(["gdrive", "onedrive", "dropbox", "box"]);
const INTEGRATION_CONNECTOR_TYPES = new Set([
  "gmail", "gdrive", "onedrive", "dropbox", "box", "slack", "github", "jira", "confluence", "notion",
  "hubspot", "freshdesk", "zendesk", "rest-api", "zoho-mail", "ssh",
  "teams", "outlook", "sharepoint", "salesforce", "zoho-crm", "bullhorn", "recruit-crm", "vincere", "manatal", "zoho-recruit",
  // Databases (new — no form yet, treated as integrations)
  "dynamodb", "cassandra", "mariadb", "neo4j", "influxdb", "clickhouse", "couchdb", "firestore", "arangodb",
  "db2", "teradata", "duckdb", "supabase", "neon", "planetscale",
  // CRM / Sales
  "pipedrive", "close-crm", "copper", "activecampaign", "keap", "dynamics-crm", "sugarcrm", "capsule", "nutshell", "streak",
  // Marketing
  "mailchimp", "sendgrid", "klaviyo", "marketo", "brevo", "constant-contact", "drip", "convertkit", "campaign-monitor", "mailerlite",
  // Communication
  "twilio", "discord", "telegram", "whatsapp-business", "intercom", "drift", "crisp", "messagebird", "vonage", "bandwidth",
  // Project Management
  "trello", "asana", "monday", "linear", "basecamp", "clickup", "wrike", "smartsheet", "airtable", "height",
  // HR / Payroll
  "bamboohr", "workday", "adp", "gusto", "rippling", "personio", "hibob", "namely",
  // Accounting / Finance
  "quickbooks", "xero", "freshbooks", "wave", "zoho-books", "netsuite", "sage",
  // E-commerce
  "shopify", "woocommerce", "bigcommerce", "stripe", "square", "paypal", "magento",
  // Cloud / DevOps
  "aws-s3", "azure-blob", "gcs", "jenkins", "circleci", "gitlab", "bitbucket", "datadog",
  // Observability / ITSM
  "sentry", "pagerduty", "newrelic", "splunk", "servicenow", "opsgenie", "grafana", "kibana",
  // Analytics
  "mixpanel", "amplitude", "segment", "heap", "posthog", "google-analytics", "tableau",
]);

const toSlug = v => v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");

export function EnterpriseConnectorsPanel({ workspaceId, workspaceSlug, onIngestionStarted, onInsertMention, section, focusType, focusEditConnector, onConnected }) {
  const [subTab, setSubTab]                 = useState("integrations");
  const [connectors, setConnectors]         = useState([]);
  const [totalConnectors, setTotalConnectors] = useState(0);
  const [tier, setTier]                     = useState({ maxConnectors: null });
  // GitHub Repo ingestion
  const [ghRepo, setGhRepo]       = useState("");
  const [ghToken, setGhToken]     = useState("");
  const [ghBranch, setGhBranch]   = useState("master");
  const [ghOpen, setGhOpen]       = useState(false);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghResult, setGhResult]   = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(`gh_ingest_${workspaceSlug}`) || "null"); }
    catch { return null; }
  });
  const [ghError, setGhError]     = useState("");
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [form, setForm]             = useState({ name: "", slug: "", type: "postgresql", config: {}, auth: {}, allowedOps: ["SELECT"] });
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(null);
  const [testResult, setTestResult] = useState({});
  const [error, setError]           = useState("");
  const [oauthSuccess, setOauthSuccess]   = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showGmailSetup, setShowGmailSetup] = useState(false);
  const [gmailCreds, setGmailCreds]         = useState({ clientId: "", clientSecret: "" });
  const [oauthSetupId, setOauthSetupId]     = useState(null);  // for onedrive/dropbox/box
  const [oauthSetupCreds, setOauthSetupCreds] = useState({});
  const [savingCreds, setSavingCreds]       = useState(false);
  const [apiKeySetup, setApiKeySetup]       = useState(null); // intg.id of open form
  const [apiKeyFields, setApiKeyFields]     = useState({});   // { fieldKey: value }
  const [savingApiKey, setSavingApiKey]     = useState(false);
  const [apiKeyError, setApiKeyError]       = useState("");
  const [sharesMap, setSharesMap]           = useState({}); // { connectorId: [share] }
  const [sharePickerConnId, setSharePickerConnId] = useState(null);
  const [peerWorkspaces, setPeerWorkspaces] = useState([]);
  const [sharingTo, setSharingTo]           = useState(null);
  const [connectorSharingEnabled, setConnectorSharingEnabled] = useState(true);
  const [editingDbId, setEditingDbId]       = useState(null);
  const [editDbForm, setEditDbForm]         = useState({ name: "", slug: "", type: "", config: {}, auth: {}, allowedOps: ["SELECT"] });
  const [editDbSaving, setEditDbSaving]     = useState(false);
  const [dbSlugStatus, setDbSlugStatus]         = useState(null); // null | "checking" | "available" | "taken"
  const [createSlugStatus, setCreateSlugStatus]     = useState(null); // null | "checking" | "available" | "taken"
  const [apiKeySlugStatus, setApiKeySlugStatus]         = useState(null); // null | "checking" | "available" | "taken"
  const [oauthSetupSlugStatus, setOauthSetupSlugStatus] = useState(null); // null | "checking" | "available" | "taken"
  const [editIntgConnId, setEditIntgConnId] = useState(null);
  const [editIntgType, setEditIntgType]     = useState(null);
  const [editIntgFields, setEditIntgFields] = useState({});
  const [editIntgSaving, setEditIntgSaving] = useState(false);
  const [editIntgError, setEditIntgError]   = useState("");
  const [intgSlugStatus, setIntgSlugStatus] = useState(null); // null | "checking" | "available" | "taken"
  const [mastersMap, setMastersMap] = useState({});
  const dbSlugDebounce       = useRef(null);
  const createSlugDebounce   = useRef(null);
  const intgSlugDebounce     = useRef(null);
  const apiKeySlugDebounce     = useRef(null);
  const oauthSetupSlugDebounce = useRef(null);

  useEffect(() => {
    const slug = editDbForm.slug?.trim();
    if (!slug) { setDbSlugStatus(null); return; }
    setDbSlugStatus("checking");
    clearTimeout(dbSlugDebounce.current);
    dbSlugDebounce.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (editingDbId) params.set("excludeId", editingDbId);
        const { data } = await api.get(`/admin/connectors/check-slug?${params}`);
        setDbSlugStatus(data.available ? "available" : "taken");
      } catch { setDbSlugStatus(null); }
    }, 400);
    return () => clearTimeout(dbSlugDebounce.current);
  }, [editDbForm.slug, editingDbId]);

  useEffect(() => {
    const slug = form.slug?.trim();
    if (!slug) { setCreateSlugStatus(null); return; }
    setCreateSlugStatus("checking");
    clearTimeout(createSlugDebounce.current);
    createSlugDebounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/admin/connectors/check-slug?slug=${encodeURIComponent(slug)}`);
        setCreateSlugStatus(data.available ? "available" : "taken");
      } catch { setCreateSlugStatus(null); }
    }, 400);
    return () => clearTimeout(createSlugDebounce.current);
  }, [form.slug]);

  useEffect(() => {
    const slug = editIntgFields.slug?.trim();
    if (!slug) { setIntgSlugStatus(null); return; }
    setIntgSlugStatus("checking");
    clearTimeout(intgSlugDebounce.current);
    intgSlugDebounce.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (editIntgConnId) params.set("excludeId", editIntgConnId);
        const { data } = await api.get(`/admin/connectors/check-slug?${params}`);
        setIntgSlugStatus(data.available ? "available" : "taken");
      } catch { setIntgSlugStatus(null); }
    }, 400);
    return () => clearTimeout(intgSlugDebounce.current);
  }, [editIntgFields.slug, editIntgConnId]);

  useEffect(() => {
    const slug = apiKeyFields._slug?.trim();
    if (!slug) { setApiKeySlugStatus(null); return; }
    setApiKeySlugStatus("checking");
    clearTimeout(apiKeySlugDebounce.current);
    apiKeySlugDebounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/admin/connectors/check-slug?slug=${encodeURIComponent(slug)}`);
        setApiKeySlugStatus(data.available ? "available" : "taken");
      } catch { setApiKeySlugStatus(null); }
    }, 400);
    return () => clearTimeout(apiKeySlugDebounce.current);
  }, [apiKeyFields._slug]);

  const _oauthSlug = gmailCreds._slug || oauthSetupCreds._slug;
  useEffect(() => {
    const slug = _oauthSlug?.trim();
    if (!slug) { setOauthSetupSlugStatus(null); return; }
    setOauthSetupSlugStatus("checking");
    clearTimeout(oauthSetupSlugDebounce.current);
    oauthSetupSlugDebounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/admin/connectors/check-slug?slug=${encodeURIComponent(slug)}`);
        setOauthSetupSlugStatus(data.available ? "available" : "taken");
      } catch { setOauthSetupSlugStatus(null); }
    }, 400);
    return () => clearTimeout(oauthSetupSlugDebounce.current);
  }, [_oauthSlug]);

  const isFocused = !!focusType || !!focusEditConnector;

  useEffect(() => {
    if (!focusType) return;
    setComingSoon(false);
    if (INTEGRATION_CONNECTOR_TYPES.has(focusType)) {
      const intg = INTEGRATION_TYPES.find(t => t.id === focusType);
      const isGoogle = focusType === "gmail" || focusType === "gdrive";
      const isCloudOAuth = !!intg?.oauthSetup;
      const defaultIntgName = toSlug(intg?.label || focusType);
      if (isGoogle) {
        setShowGmailSetup(true);
        setGmailCreds({ clientId: "", clientSecret: "", _for: focusType, _name: defaultIntgName, _slug: defaultIntgName });
      } else if (isCloudOAuth) {
        setOauthSetupId(focusType);
        setOauthSetupCreds({ _name: defaultIntgName, _slug: defaultIntgName });
      } else if (API_KEY_FIELDS[focusType]) {
        setApiKeySetup(focusType);
        setApiKeyFields({ _name: defaultIntgName, _slug: defaultIntgName });
        setApiKeyError("");
      } else {
        setComingSoon(true);
      }
    } else if (DB_CONNECTOR_IDS.has(focusType)) {
      const defaultName = toSlug(CONNECTOR_TYPES.find(t => t.id === focusType)?.label || focusType);
      setForm(f => ({ ...f, type: focusType, name: defaultName, slug: defaultName, config: {}, auth: {} }));
      setShowForm(true);
    } else {
      setComingSoon(true);
    }
  }, [focusType]);

  useEffect(() => {
    if (!focusEditConnector) return;
    if (INTEGRATION_CONNECTOR_TYPES.has(focusEditConnector.type)) {
      startIntgEdit(focusEditConnector, focusEditConnector.type);
    } else {
      startDbEdit(focusEditConnector);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEditConnector?.id]);

  function setEditDbField(path, value) {
    setEditDbForm(f => {
      const [sec, ...rest] = path.split(".");
      const subPath = rest.join(".");
      return { ...f, [sec]: setNestedValue(f[sec] || {}, subPath, value) };
    });
  }

  function startDbEdit(c) {
    const parsed = c.config ? JSON.parse(c.config) : {};
    const { allowedOps, maxRows, ...cfg } = parsed;
    setEditingDbId(c.id);
    setEditDbForm({ name: c.name, slug: c.slug || "", type: c.type, config: cfg, auth: {}, allowedOps: allowedOps || ["SELECT"], maxRows: maxRows || "" });
  }

  async function handleSaveDbEdit() {
    setEditDbSaving(true);
    try {
      const hasAuth = Object.values(editDbForm.auth).some(v => v !== "" && v !== undefined);
      const { data } = await api.put(`/admin/workspaces/${workspaceId}/connectors/${editingDbId}`, {
        name:   editDbForm.name.trim(),
        slug:   editDbForm.slug?.trim() || undefined,
        config: { ...editDbForm.config, allowedOps: editDbForm.allowedOps, ...(editDbForm.maxRows ? { maxRows: parseInt(editDbForm.maxRows) } : {}) },
        ...(hasAuth ? { authConfig: editDbForm.auth } : {}),
      });
      setConnectors(cs => cs.map(x => x.id === editingDbId ? { ...x, ...data.connector } : x));
      setEditingDbId(null);
      onConnected?.();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to save.");
    } finally { setEditDbSaving(false); }
  }

  function startIntgEdit(c, intgId) {
    const parsed     = c.config     ? JSON.parse(c.config) : {};
    const pub        = c.publicAuth || {};
    const prefill = {
      slug:          c.slug         || "",
      // REST API
      connectorName: c.name,
      baseUrl:       parsed.baseUrl    || pub.baseUrl    || "",
      healthPath:    parsed.healthPath || pub.healthPath || "",
      headerName:    parsed.headerName || pub.headerName || "",
      // SSH / generic
      host:          pub.host       || "",
      port:          pub.port       || "",
      username:      pub.username   || "",
      // GitHub
      name:          pub.name       || c.name || "",
      repoUrl:       pub.repoUrl    || "",
      // API integrations
      email:         pub.email      || "",
      domain:        pub.domain     || "",
      subdomain:     pub.subdomain  || "",
      smtpHost:      pub.smtpHost   || "",
      smtpPort:      pub.smtpPort   || "",
      fromName:      pub.fromName   || "",
    };
    setEditIntgConnId(c.id);
    setEditIntgType(intgId);
    setEditIntgFields(prefill);
    setEditIntgError("");
  }

  async function handleSaveIntgEdit() {
    setEditIntgSaving(true); setEditIntgError("");
    try {
      const { slug: connSlug, ...authFields } = editIntgFields;
      const isRestApi    = editIntgType === "rest-api";
      const isApiKeyType = !!API_KEY_FIELDS[editIntgType];
      const payload = isRestApi
        ? { name: authFields.name?.trim() || authFields.connectorName?.trim() || editIntgType,
            slug: connSlug?.trim() || undefined,
            config:     { baseUrl: authFields.baseUrl?.trim(), healthPath: authFields.healthPath?.trim() || "/" },
            authConfig: { bearerToken: authFields.bearerToken?.trim() || "", apiKey: authFields.apiKey?.trim() || "", headerName: authFields.headerName?.trim() || "" } }
        : isApiKeyType
          ? { name: authFields.name?.trim() || editIntgType, slug: connSlug?.trim() || undefined, authConfig: authFields }
          : { name: authFields.name?.trim() || editIntgType, slug: connSlug?.trim() || undefined };
      await api.put(`/admin/workspaces/${workspaceId}/connectors/${editIntgConnId}`, payload);
      await loadConnectors();
      setEditIntgConnId(null); setEditIntgType(null); setEditIntgFields({});
      onConnected?.();
    } catch (e) {
      setEditIntgError(e.response?.data?.error || "Failed to save.");
    } finally { setEditIntgSaving(false); }
  }

  const loadConnectors = useCallback(() => {
    if (!workspaceId) return;
    api.get(`/admin/workspaces/${workspaceId}/connectors`)
      .then(r => {
        setConnectors(r.data.connectors || []);
        setTotalConnectors(r.data.totalConnectors ?? 0);
        setTier(r.data.tier || {});
      })
      .catch(() => setError("Failed to load connectors"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { loadConnectors(); }, [loadConnectors]);

  useEffect(() => {
    api.get("/admin/connection-masters")
      .then(r => {
        const map = {};
        (r.data.masters || []).forEach(m => { map[m.key] = m; });
        setMastersMap(map);
      })
      .catch(() => {});
  }, []);

  const loadShares = useCallback(() => {
    if (!workspaceSlug) return;
    api.get(`/workspaces/${workspaceSlug}/connector-shares`)
      .then(r => {
        const map = {};
        (r.data.shares || []).forEach(s => {
          if (!map[s.connectorId]) map[s.connectorId] = [];
          map[s.connectorId].push(s);
        });
        setSharesMap(map);
      }).catch(() => {});
  }, [workspaceSlug]);

  useEffect(() => { loadShares(); }, [loadShares]);

  useEffect(() => {
    api.get("/features").then(r => setConnectorSharingEnabled(r.data.connectorSharing !== false)).catch(() => {});
  }, []);

  async function openSharePicker(connId) {
    if (sharePickerConnId === connId) { setSharePickerConnId(null); return; }
    setSharePickerConnId(connId);
    if (!peerWorkspaces.length) {
      try {
        const { data } = await api.get("/admin/workspaces");
        setPeerWorkspaces((data.workspaces || []).filter(w => w.id !== workspaceId));
      } catch { /* ignore */ }
    }
  }

  async function addConnectorShare(connId, grantedWorkspaceId) {
    setSharingTo(grantedWorkspaceId);
    try {
      await api.post(`/workspaces/${workspaceSlug}/connector-shares`, { connectorId: connId, grantedWorkspaceId });
      loadShares();
    } catch (e) { setError(e.response?.data?.error || "Failed to share"); }
    finally { setSharingTo(null); }
  }

  async function removeConnectorShare(shareId) {
    try {
      await api.delete(`/workspaces/${workspaceSlug}/connector-shares/${shareId}`);
      loadShares();
    } catch { setError("Failed to remove share"); }
  }

  // Detect OAuth redirect-back (e.g. ?oauth_success=gmail&ws=123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("oauth_success");
    const ws      = params.get("ws");
    if (success && ws && parseInt(ws) === workspaceId) {
      setOauthSuccess(success);
      setSubTab("integrations");
      loadConnectors();
      // Clean the URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    }
    const oauthError = params.get("oauth_error");
    if (oauthError) {
      setError(`OAuth failed: ${oauthError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [workspaceId, loadConnectors]);

  function setField(path, value) {
    setForm(f => {
      const [section, ...rest] = path.split(".");
      const subPath = rest.join(".");
      return { ...f, [section]: setNestedValue(f[section] || {}, subPath, value) };
    });
  }

  async function handleAdd() {
    if (!form.name.trim()) return;
    setSaving(true); setError("");
    try {
      const { data } = await api.post(`/admin/workspaces/${workspaceId}/connectors`, {
        name: form.name.trim(),
        slug: form.slug?.trim() || undefined,
        type: form.type,
        config:     { ...(Object.keys(form.config).length ? form.config : {}), allowedOps: form.allowedOps },
        authConfig: Object.keys(form.auth).length ? form.auth : undefined,
      });
      setConnectors(c => [...c, data.connector]);
      setTotalConnectors(n => n + 1);
      setShowForm(false);
      setForm({ name: "", slug: "", type: "postgresql", config: {}, auth: {}, allowedOps: ["SELECT"] });
      setCreateSlugStatus(null);
      onConnected?.();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to add connector");
    } finally { setSaving(false); }
  }

  async function handleTest(connector) {
    setTesting(connector.id);
    setTestResult(r => ({ ...r, [connector.id]: null }));
    try {
      const { data } = await api.post(`/admin/workspaces/${workspaceId}/connectors/${connector.id}/test`);
      setTestResult(r => ({ ...r, [connector.id]: data }));
      setConnectors(c => c.map(x => x.id === connector.id
        ? { ...x, status: data.success ? "active" : "error" }
        : x
      ));
    } catch {
      setTestResult(r => ({ ...r, [connector.id]: { success: false, message: "Test request failed" } }));
    } finally { setTesting(null); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/admin/workspaces/${workspaceId}/connectors/${id}`);
      setConnectors(c => c.filter(x => x.id !== id));
      setTotalConnectors(n => Math.max(0, n - 1));
    } catch { setError("Failed to delete connector"); }
    finally { setConfirmDelete(null); }
  }

  const selectedType = CONNECTOR_TYPES.find(t => t.id === form.type);
  const atLimit = tier.maxConnectors !== null && totalConnectors >= tier.maxConnectors;

  if (loading) return <div className="px-4 py-6 flex justify-center"><div className="w-5 h-5 border-2 border-indigo border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 pt-3 pb-4 space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 flex items-center justify-between">
          {error} <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Sub-tab selector — hidden when section prop is set */}
      {!section && (
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {[
            { id: "integrations", label: "Integrations" },
            { id: "data-sources", label: "Databases" },
          ].map(t => (
            <button key={t.id} onClick={() => { setSubTab(t.id); setShowForm(false); setError(""); }}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                subTab === t.id ? "bg-indigo text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Coming Soon (catalog-only connector clicked) ── */}
      {comingSoon && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Coming Soon</p>
          <p className="text-xs text-gray-400 max-w-xs">This connector is not yet available. It will be built and contributed by the community.</p>
        </div>
      )}

      {/* ── Databases section ── */}
      {!comingSoon && (section === "databases" || section === "both" || (!section && subTab === "data-sources")) &&
       (!isFocused || (focusType && !INTEGRATION_CONNECTOR_TYPES.has(focusType)) || (focusEditConnector && !INTEGRATION_CONNECTOR_TYPES.has(focusEditConnector.type))) && (
        <>
          {section === "both" && !isFocused && (
            <div className="border-t border-gray-100 -mx-4 px-4 pt-4 pb-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Databases</p>
            </div>
          )}
          {!isFocused && (
            <div className="flex gap-2 flex-wrap">
              {!atLimit ? CONNECTOR_TYPES.map(t => (
                <button key={t.id}
                  onClick={() => { setForm(f => ({ ...f, type: t.id, config: {}, auth: {} })); setShowForm(true); }}
                  className={`px-3 py-1 text-xs rounded-lg border font-medium transition-all ${
                    showForm && form.type === t.id
                      ? "border-indigo bg-indigo text-white"
                      : "border-gray-200 text-gray-600 hover:border-indigo hover:text-indigo"
                  }`}>{t.label}</button>
              )) : <span className="text-amber-600 font-medium text-xs">Connector limit reached</span>}
            </div>
          )}

          {(isFocused
            ? (focusEditConnector ? connectors.filter(c => c.id === focusEditConnector.id) : [])
            : connectors.filter(c => !INTEGRATION_CONNECTOR_TYPES.has(c.type))
          ).map(c => {
            const ct = CONNECTOR_TYPES.find(t => t.id === c.type);
            const tr = testResult[c.id];
            const isEditing = editingDbId === c.id;
            return (
              <div key={c.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {!isFocused && <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50">
                  <div className={`w-7 h-7 rounded-lg ${ct?.color || "bg-gray-500"} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-[9px] font-bold">{c.type.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{ct?.label || c.type}</p>
                  </div>
                  <button onClick={() => handleTest(c)} disabled={testing === c.id}
                    title={testing === c.id ? "Testing…" : "Test connection"}
                    className="p-1 rounded hover:bg-gray-100 text-indigo disabled:opacity-40 transition-colors">
                    {testing === c.id
                      ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    }
                  </button>
                  <button onClick={() => isEditing ? setEditingDbId(null) : startDbEdit(c)}
                    title={isEditing ? "Cancel edit" : "Edit"}
                    className="p-1 rounded hover:bg-gray-100 text-indigo transition-colors">
                    {isEditing
                      ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    }
                  </button>
                  {connectorSharingEnabled && (
                  <button onClick={() => openSharePicker(c.id)} title="Share with workspace"
                    className="p-1 rounded hover:bg-gray-100 text-indigo transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  </button>
                  )}
                  <button onClick={() => setConfirmDelete(c)} title="Remove"
                    className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>}
                {sharePickerConnId === c.id && (
                  <div className="border-t border-gray-100 px-3 py-3 bg-white space-y-2">
                    <p className="text-xs font-semibold text-gray-700">Share with workspace</p>
                    {(sharesMap[c.id] || []).length > 0 && (
                      <div className="space-y-1">
                        {(sharesMap[c.id] || []).map(s => (
                          <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 bg-indigo/5 rounded-lg">
                            <span className="text-xs font-medium text-gray-700 flex-1">{s.grantedWorkspace.name}</span>
                            <span className="text-[10px] text-green-600 font-semibold">Shared</span>
                            <button onClick={() => removeConnectorShare(s.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {peerWorkspaces.filter(w => !(sharesMap[c.id] || []).some(s => s.grantedWorkspace.id === w.id)).length === 0
                        ? <p className="text-xs text-gray-400">All workspaces already added.</p>
                        : peerWorkspaces.filter(w => !(sharesMap[c.id] || []).some(s => s.grantedWorkspace.id === w.id)).map(w => (
                          <button key={w.id} onClick={() => addConnectorShare(c.id, w.id)} disabled={sharingTo === w.id}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg border border-gray-200 hover:border-indigo hover:bg-indigo/5 transition-colors text-left disabled:opacity-50 text-xs">
                            <span className="font-medium text-gray-700">{w.name}</span>
                            <span className="text-gray-400">{sharingTo === w.id ? "Sharing…" : "Share →"}</span>
                          </button>
                        ))
                      }
                    </div>
                    <button onClick={() => setSharePickerConnId(null)} className="text-[10px] text-gray-400 hover:text-gray-600">✕ Close</button>
                  </div>
                )}
                {tr && (
                  <div className={`px-3 py-1.5 text-[10px] ${tr.success ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}`}>
                    {tr.success ? "✓" : "✗"} {tr.message || (tr.success ? "Connected successfully." : "Connection failed.")}
                  </div>
                )}
                {isEditing && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-white">
                    <p className="text-xs font-semibold text-gray-700">Edit Connection</p>
                    <p className="text-[10px] text-amber-600">Username &amp; password are not pre-filled for security — enter new values to update, leave blank to keep existing.</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                      <input className="input text-sm py-1.5 font-mono" value={editDbForm.name}
                        onChange={e => { const v = toSlug(e.target.value); setEditDbForm(f => ({ ...f, name: v, slug: v })); }} />
                    </div>
                    {CONNECTOR_TYPES.find(t => t.id === editDbForm.type)?.fields.map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {f.label}
                          {(f.type === "password" || f.key.startsWith("auth.")) && (
                            <span className="text-[10px] text-gray-400 ml-1">(leave blank to keep existing)</span>
                          )}
                        </label>
                        {f.type === "checkbox" ? (
                          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                            <input type="checkbox"
                              checked={!!getNestedValue(editDbForm, f.key)}
                              onChange={e => setEditDbField(f.key, e.target.checked)} />
                            Enable {f.label}
                          </label>
                        ) : (
                          <input className="input text-sm py-1.5"
                            type={f.type || "text"}
                            placeholder={f.key.startsWith("auth.") ? "leave blank to keep existing" : f.placeholder}
                            value={getNestedValue(editDbForm, f.key) || ""}
                            onChange={e => setEditDbField(f.key, e.target.value)} />
                        )}
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Max Rows per Query</label>
                      <input className="input text-sm py-1.5 w-32" type="number" min="1" max="100000"
                        placeholder="100" value={editDbForm.maxRows ?? ""}
                        onChange={e => setEditDbForm(f => ({ ...f, maxRows: e.target.value ? parseInt(e.target.value) : "" }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Allowed Operations</label>
                      <div className="flex flex-wrap gap-2">
                        {["SELECT", "INSERT", "UPDATE", "DELETE", "EXECUTE"].map(op => {
                          const on = (editDbForm.allowedOps || []).includes(op);
                          return (
                            <button key={op} type="button"
                              onClick={() => setEditDbForm(f => ({ ...f, allowedOps: on ? f.allowedOps.filter(o => o !== op) : [...f.allowedOps, op] }))}
                              className={`px-3 py-1 text-xs rounded-lg border font-mono font-medium transition-all ${on ? "border-indigo bg-indigo text-white" : "border-gray-200 text-gray-500 hover:border-indigo hover:text-indigo"}`}>
                              {op}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {!isFocused && <button onClick={() => setEditingDbId(null)} className="btn-secondary px-4 py-1.5 text-xs flex-1">Cancel</button>}
                      <button onClick={handleSaveDbEdit} disabled={editDbSaving || !editDbForm.name.trim()}
                        className="btn-primary px-4 py-1.5 text-xs flex-1 disabled:opacity-50">
                        {editDbSaving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!isFocused && connectors.filter(c => !INTEGRATION_CONNECTOR_TYPES.has(c.type)).length === 0 && !showForm && (
            <p className="text-xs text-gray-400 text-center py-4">No databases yet. Add one to query live data in chat.</p>
          )}

          {showForm && (
            <div className="border border-indigo/30 rounded-xl p-4 space-y-3 bg-indigo/5">
              <p className="text-sm font-semibold text-gray-800">New {selectedType?.label} Connection</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input className="input text-sm py-1.5 font-mono w-full" placeholder="e.g. production-db" value={form.name}
                  onChange={e => {
                    const name = toSlug(e.target.value);
                    setForm(f => ({ ...f, name, slug: name }));
                  }} />
              </div>
              {selectedType?.fields.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  {f.type === "checkbox" ? (
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox"
                        checked={!!getNestedValue(form, f.key)}
                        onChange={e => setField(f.key, e.target.checked)} />
                      Enable {f.label}
                    </label>
                  ) : (
                    <input className="input text-sm py-1.5" type={f.type || "text"} placeholder={f.placeholder}
                      value={getNestedValue(form, f.key) || ""}
                      onChange={e => setField(f.key, e.target.value)} />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Rows per Query</label>
                <input className="input text-sm py-1.5 w-32" type="number" min="1" max="100000"
                  placeholder="100"
                  value={form.config.maxRows ?? ""}
                  onChange={e => setField("config.maxRows", e.target.value ? parseInt(e.target.value) : undefined)} />
                <p className="text-[10px] text-gray-400 mt-1">Auto-appended LIMIT for SELECT queries with no explicit limit. Leave blank for 100.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Allowed Operations</label>
                <div className="flex flex-wrap gap-2">
                  {["SELECT", "INSERT", "UPDATE", "DELETE", "EXECUTE"].map(op => {
                    const on = form.allowedOps.includes(op);
                    return (
                      <button key={op} type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          allowedOps: on ? f.allowedOps.filter(o => o !== op) : [...f.allowedOps, op]
                        }))}
                        className={`px-3 py-1 text-xs rounded-lg border font-mono font-medium transition-all ${
                          on ? "border-indigo bg-indigo text-white" : "border-gray-200 text-gray-500 hover:border-indigo hover:text-indigo"
                        }`}>
                        {op}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Match the permissions granted to the DB user you're connecting with.</p>
              </div>
              <div className="flex gap-2 pt-1">
                {!isFocused && <button onClick={() => { setShowForm(false); setForm({ name: "", slug: "", type: "postgresql", config: {}, auth: {}, allowedOps: ["SELECT"] }); setCreateSlugStatus(null); }}
                  className="btn-secondary px-4 py-1.5 text-xs flex-1">Cancel</button>}
                <button onClick={handleAdd} disabled={saving || !form.name.trim() || createSlugStatus === "taken"}
                  className="btn-primary px-4 py-1.5 text-xs flex-1 disabled:opacity-50">
                  {saving ? "Adding…" : "Add Connector"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Integrations section ── */}
      {(section === "integrations" || section === "both" || (!section && subTab === "integrations")) &&
       (!isFocused || (focusType && INTEGRATION_CONNECTOR_TYPES.has(focusType)) || (focusEditConnector && INTEGRATION_CONNECTOR_TYPES.has(focusEditConnector.type))) && (
        <div className="space-y-3">
          {section === "both" && !isFocused && (
            <div className="border-t border-gray-100 -mx-4 px-4 pt-4 pb-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Integrations</p>
            </div>
          )}
          {oauthSuccess && (
            <div className={`border text-xs rounded-lg px-3 py-2 flex items-center justify-between ${CLOUD_STORAGE_TYPES.has(oauthSuccess) ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-green-50 border-green-200 text-green-700"}`}>
              {CLOUD_STORAGE_TYPES.has(oauthSuccess)
                ? "Connected! Go to Knowledge Base → Add Documents → Cloud Storage, select a folder and start ingestion. Wait for indexing to complete before querying."
                : "Connected successfully!"}
              <button onClick={() => setOauthSuccess("")} className="ml-2 font-bold shrink-0">×</button>
            </div>
          )}
          {!isFocused && <p className="text-[10px] text-gray-400">Connect external services so the AI agent can take actions — send emails, create tickets, post messages, and more.</p>}
          {!isFocused && atLimit && <p className="text-[10px] text-amber-600 font-medium">Connector limit reached — remove an existing connector to add a new one.</p>}

          <div className={isFocused ? "space-y-3" : "grid grid-cols-4 gap-3"}>
          {[...INTEGRATION_TYPES]
            .filter(intg => !isFocused || intg.id === (focusType || focusEditConnector?.type))
            .sort((a, b) => {
            const aC = connectors.some(c => c.type === a.id) ? 0 : 1;
            const bC = connectors.some(c => c.type === b.id) ? 0 : 1;
            return aC - bC;
          }).map(intg => {
            const connected      = connectors.filter(c => c.type === intg.id);
            const isGmail        = intg.id === "gmail";
            const isGdrive       = intg.id === "gdrive";
            const isGoogle       = isGmail || isGdrive;
            const isGithub       = intg.id === "github";
            const isCloudOAuth   = !!intg.oauthSetup;
            const isApiKey       = !!API_KEY_FIELDS[intg.id];
            const setupOpen      = isGoogle ? showGmailSetup : isCloudOAuth ? (oauthSetupId === intg.id) : (apiKeySetup === intg.id);
            const fields         = API_KEY_FIELDS[intg.id] || [];
            const isRestApi      = intg.id === "rest-api";
            const allFilled      = isRestApi
              ? !!apiKeyFields.baseUrl?.trim()
              : fields.filter(f => !f.optional && f.key !== "name" && f.key !== "connectorName").every(f => apiKeyFields[f.key]?.trim());

            return (
              <div key={intg.id} className={`border rounded-xl overflow-hidden flex flex-col ${setupOpen ? "col-span-4" : ""} ${connected.length ? "border-green-200" : "border-gray-200"}`}>
                {/* Card header */}
                {!isFocused && <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50/60">
                  <div className={`w-7 h-7 rounded-lg ${intg.color} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-[9px] font-bold">{intg.initial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{intg.label}</p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">{intg.desc}</p>
                  </div>
                  {!!mastersMap[intg.id]?.fields && !setupOpen && (
                    atLimit
                      ? <span className="text-[10px] font-semibold text-amber-500 shrink-0">Limit reached</span>
                      : <button onClick={() => {
                          const dn = toSlug(intg.label || intg.id);
                          if (isGoogle) {
                            setGmailCreds({ clientId: "", clientSecret: "", _for: intg.id, _name: dn, _slug: dn });
                            setShowGmailSetup(true);
                          } else if (isCloudOAuth) {
                            setOauthSetupId(intg.id); setOauthSetupCreds({ _name: dn, _slug: dn });
                          } else { setApiKeySetup(intg.id); setApiKeyFields({ _name: dn, _slug: dn }); setApiKeyError(""); }
                        }} className="text-[10px] font-semibold text-white bg-indigo px-3 py-1 rounded-lg shrink-0 hover:bg-indigo/90 transition-colors">
                          Connect
                        </button>
                  )}
                  {!!mastersMap[intg.id]?.fields && setupOpen && (
                    <button onClick={() => { setShowGmailSetup(false); setOauthSetupId(null); setOauthSetupCreds({}); setApiKeySetup(null); setApiKeyFields({}); setApiKeySlugStatus(null); setOauthSetupSlugStatus(null); }}
                      className="text-[10px] text-gray-400 hover:text-gray-600 shrink-0">Cancel</button>
                  )}
                  {!mastersMap[intg.id]?.fields && <span className="text-[10px] font-semibold text-gray-300 shrink-0">Soon</span>}
                </div>}

                {/* Gmail OAuth form */}
                {isGoogle && setupOpen && (gmailCreds._for || "gmail") === intg.id && (
                  <div className="px-3 py-3 border-t border-gray-200 bg-white space-y-3">
                    {/* Step-by-step guide */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 space-y-1.5">
                      <p className="text-[10px] font-semibold text-blue-700">Setup Guide — Google OAuth</p>
                      <ol className="text-[10px] text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline font-medium">Google Cloud Console → Credentials</a></li>
                        <li>Create or select a project → <strong>Create Credentials → OAuth 2.0 Client ID</strong></li>
                        <li>Application type: <strong>Web application</strong></li>
                        <li>Under <strong>Authorized redirect URIs</strong>, add both URIs below</li>
                        <li>Enable <strong>Gmail API</strong> and <strong>Google Drive API</strong> in APIs &amp; Services</li>
                        <li>Set OAuth consent screen to <strong>In production</strong></li>
                        <li>Copy Client ID &amp; Secret below and click Connect</li>
                      </ol>
                    </div>
                    {/* Dynamic redirect URIs */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-gray-500">Add these Authorized Redirect URIs:</p>
                      {["/api/oauth/gmail/callback", "/api/oauth/gdrive/callback"].map(path => {
                        const base = window.location.hostname === "localhost" ? "http://localhost:3001" : window.location.origin;
                        const uri = `${base}${path}`;
                        return (
                          <div key={path} className="flex items-center gap-1.5">
                            <p className="text-[10px] font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded flex-1 select-all truncate">{uri}</p>
                            <button onClick={() => navigator.clipboard.writeText(uri)} className="text-[9px] text-indigo hover:text-indigo-700 shrink-0 font-medium">Copy</button>
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Connection Name</label>
                      <input className="input text-xs py-1.5 w-full font-mono" placeholder={toSlug(intg.label)}
                        value={gmailCreds._name || ""}
                        onChange={e => { const v = toSlug(e.target.value); setGmailCreds(c => ({ ...c, _name: v, _slug: v })); }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Client ID</label>
                      <input className="input text-xs py-1.5 w-full font-mono" placeholder="123456789-abc.apps.googleusercontent.com"
                        value={gmailCreds.clientId} onChange={e => setGmailCreds(c => ({ ...c, clientId: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Client Secret</label>
                      <input className="input text-xs py-1.5 w-full font-mono" type="password" placeholder="GOCSPX-..."
                        value={gmailCreds.clientSecret} onChange={e => setGmailCreds(c => ({ ...c, clientSecret: e.target.value }))} />
                    </div>
                    <button disabled={savingCreds || !gmailCreds.clientId.trim() || !gmailCreds.clientSecret.trim() || oauthSetupSlugStatus === "taken"}
                      onClick={async () => {
                        setSavingCreds(true);
                        const service = gmailCreds._for || "gmail";
                        try {
                          await api.post("/oauth/gmail/configure", { workspaceId, clientId: gmailCreds.clientId.trim(), clientSecret: gmailCreds.clientSecret.trim() });
                          const params = new URLSearchParams({ workspaceId });
                          if (gmailCreds._name?.trim()) params.set("connectionName", gmailCreds._name.trim());
                          if (gmailCreds._slug?.trim()) params.set("connectionSlug", gmailCreds._slug.trim());
                          const { data } = await api.get(`/oauth/${service}/start?${params}`);
                          window.location.href = data.url;
                        } catch (e) { setError(e.response?.data?.error || e.message || "Failed to connect."); setSavingCreds(false); }
                      }}
                      className="btn-primary w-full py-1.5 text-xs disabled:opacity-50">
                      {savingCreds ? "Connecting…" : `Save & Connect via Google`}
                    </button>
                  </div>
                )}

                {/* Generic cloud OAuth setup form (OneDrive, Dropbox, Box) */}
                {isCloudOAuth && oauthSetupId === intg.id && (
                  <div className="px-3 py-3 border-t border-gray-200 bg-white space-y-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 space-y-1.5">
                      <p className="text-[10px] font-semibold text-blue-700">Setup Guide — {intg.label}</p>
                      <ol className="text-[10px] text-blue-800 space-y-1 list-decimal list-inside">
                        {intg.oauthSetup.guide.map((step, i) => <li key={i}>{step}</li>)}
                      </ol>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-gray-500">Add this Redirect URI in your app settings:</p>
                      {(() => {
                        const base = window.location.hostname === "localhost" ? "http://localhost:3001" : window.location.origin;
                        const uri = `${base}${intg.oauthSetup.redirectPath}`;
                        return (
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded flex-1 select-all truncate">{uri}</p>
                            <button onClick={() => navigator.clipboard.writeText(uri)} className="text-[9px] text-indigo hover:text-indigo-700 shrink-0 font-medium">Copy</button>
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Connection Name</label>
                      <input className="input text-xs py-1.5 w-full font-mono" placeholder={toSlug(intg.label)}
                        value={oauthSetupCreds._name || ""}
                        onChange={e => { const v = toSlug(e.target.value); setOauthSetupCreds(c => ({ ...c, _name: v, _slug: v })); }} />
                    </div>
                    {intg.oauthSetup.fields.map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{f.label}{f.optional && <span className="text-gray-300 ml-1">(optional)</span>}</label>
                        <input className="input text-xs py-1.5 w-full font-mono" type={f.type || "text"} placeholder={f.placeholder}
                          value={oauthSetupCreds[f.key] || ""}
                          onChange={e => setOauthSetupCreds(v => ({ ...v, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                    <button
                      disabled={savingCreds || oauthSetupSlugStatus === "taken" || intg.oauthSetup.fields.filter(f => !f.optional).some(f => !oauthSetupCreds[f.key]?.trim())}
                      onClick={async () => {
                        setSavingCreds(true);
                        try {
                          const { _name, _slug, ...credFields } = oauthSetupCreds;
                          await api.post(`/oauth/${intg.id}/configure`, { workspaceId, ...credFields });
                          const params = new URLSearchParams({ workspaceId });
                          if (_name?.trim()) params.set("connectionName", _name.trim());
                          if (_slug?.trim()) params.set("connectionSlug", _slug.trim());
                          const { data } = await api.get(`/oauth/${intg.id}/start?${params}`);
                          window.location.href = data.url;
                        } catch (e) { setError(e.response?.data?.error || e.message || "Failed to connect."); setSavingCreds(false); }
                      }}
                      className="btn-primary w-full py-1.5 text-xs disabled:opacity-50">
                      {savingCreds ? "Connecting…" : `Save & Connect via ${intg.label}`}
                    </button>
                  </div>
                )}

                {/* API key form */}
                {isApiKey && setupOpen && (
                  <div className="px-3 py-3 border-t border-gray-200 bg-white space-y-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Connection Name</label>
                      <input className="input text-xs py-1.5 w-full font-mono" placeholder={toSlug(intg.label)}
                        value={apiKeyFields._name || ""}
                        onChange={e => { const v = toSlug(e.target.value); setApiKeyFields(c => ({ ...c, _name: v, _slug: v })); }} />
                    </div>
                    {fields.filter(f => f.key !== "name" && f.key !== "connectorName").map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{f.label}{f.optional && <span className="text-gray-300 ml-1">(optional)</span>}</label>
                        {f.type === "textarea"
                          ? <textarea className="input text-xs py-1.5 w-full font-mono resize-none" rows={5} placeholder={f.placeholder}
                              value={apiKeyFields[f.key] || ""}
                              onChange={e => { setApiKeyFields(v => ({ ...v, [f.key]: e.target.value })); setApiKeyError(""); }} />
                          : <input className="input text-xs py-1.5 w-full font-mono" type={f.type || "text"} placeholder={f.placeholder}
                              value={apiKeyFields[f.key] || ""}
                              onChange={e => { setApiKeyFields(v => ({ ...v, [f.key]: e.target.value })); setApiKeyError(""); }} />
                        }
                      </div>
                    ))}
                    {apiKeyError && (
                      <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">{apiKeyError}</p>
                    )}
                    <button disabled={savingApiKey || !allFilled || apiKeySlugStatus === "taken"}
                      onClick={async () => {
                        setSavingApiKey(true); setApiKeyError("");
                        try {
                          const { _slug, _name, ...credFields } = apiKeyFields;
                          const slug = _slug?.trim() || undefined;
                          const connName = _name?.trim() || credFields.connectorName?.trim() || credFields.name?.trim() || intg.label;
                          const payload = isRestApi
                            ? { name: connName, type: intg.id, slug,
                                config:     { baseUrl: credFields.baseUrl?.trim(), healthPath: credFields.healthPath?.trim() || "/" },
                                authConfig: { bearerToken: credFields.bearerToken?.trim(), apiKey: credFields.apiKey?.trim(), headerName: credFields.headerName?.trim() } }
                            : { name: connName, type: intg.id, slug, authConfig: credFields };
                          const { data } = await api.post(`/admin/workspaces/${workspaceId}/connectors`, payload);
                          const test = await api.post(`/admin/workspaces/${workspaceId}/connectors/${data.connector.id}/test`);
                          if (!test.data.success) {
                            await api.delete(`/admin/workspaces/${workspaceId}/connectors/${data.connector.id}`);
                            setApiKeyError(test.data.message || "Connection test failed — check your credentials.");
                          } else {
                            setConnectors(c => [...c, data.connector]);
                            setTotalConnectors(n => n + 1);
                            setApiKeySetup(null); setApiKeyFields({}); setApiKeyError(""); setApiKeySlugStatus(null);
                            onConnected?.();
                          }
                        } catch (e) { setApiKeyError(e.response?.data?.error || "Failed to connect."); }
                        finally { setSavingApiKey(false); }
                      }}
                      className="btn-primary w-full py-1.5 text-xs disabled:opacity-50">
                      {savingApiKey ? "Connecting…" : `Connect ${intg.label}`}
                    </button>
                  </div>
                )}

                {/* Connected state */}
                {connected.map(c => (
                  <div key={c.id}>
                    {!isFocused && <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border-t border-green-100">
                      <span className="text-green-500 text-[10px] shrink-0">✓</span>
                      <span className="text-[10px] text-green-700 font-medium flex-1">
                        {c.name}
                      </span>
                      <button onClick={() => { if (editIntgConnId === c.id) { setEditIntgConnId(null); setEditIntgType(null); } else { startIntgEdit(c, intg.id); } }}
                        title={editIntgConnId === c.id ? "Cancel edit" : "Edit"}
                        className="p-1 rounded hover:bg-green-100 text-indigo transition-colors shrink-0">
                        {editIntgConnId === c.id
                          ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        }
                      </button>
                      {connectorSharingEnabled && (
                      <button onClick={() => openSharePicker(c.id)} title="Share with workspace"
                        className="p-1 rounded hover:bg-green-100 text-indigo transition-colors shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                      </button>
                      )}
                      <button onClick={() => setConfirmDelete(c)} title="Remove"
                        className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>}
                    {!isFocused && sharePickerConnId === c.id && (
                      <div className="border-t border-gray-100 px-3 py-3 bg-white space-y-2">
                        <p className="text-xs font-semibold text-gray-700">Share with workspace</p>
                        {(sharesMap[c.id] || []).length > 0 && (
                          <div className="space-y-1">
                            {(sharesMap[c.id] || []).map(s => (
                              <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 bg-indigo/5 rounded-lg">
                                <span className="text-xs font-medium text-gray-700 flex-1">{s.grantedWorkspace.name}</span>
                                <span className="text-[10px] text-green-600 font-semibold">Shared</span>
                                <button onClick={() => removeConnectorShare(s.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {peerWorkspaces.filter(w => !(sharesMap[c.id] || []).some(s => s.grantedWorkspace.id === w.id)).length === 0
                            ? <p className="text-xs text-gray-400">All workspaces already added.</p>
                            : peerWorkspaces.filter(w => !(sharesMap[c.id] || []).some(s => s.grantedWorkspace.id === w.id)).map(w => (
                              <button key={w.id} onClick={() => addConnectorShare(c.id, w.id)} disabled={sharingTo === w.id}
                                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg border border-gray-200 hover:border-indigo hover:bg-indigo/5 transition-colors text-left disabled:opacity-50 text-xs">
                                <span className="font-medium text-gray-700">{w.name}</span>
                                <span className="text-gray-400">{sharingTo === w.id ? "Sharing…" : "Share →"}</span>
                              </button>
                            ))
                          }
                        </div>
                        <button onClick={() => setSharePickerConnId(null)} className="text-[10px] text-gray-400 hover:text-gray-600">✕ Close</button>
                      </div>
                    )}
                    {editIntgConnId === c.id && (
                      <div className="border-t border-gray-100 px-3 py-3 bg-white space-y-2">
                        <p className="text-[10px] font-semibold text-gray-600">{isApiKey ? "Edit Credentials" : "Edit Connection"}</p>
                        {isApiKey && <p className="text-[10px] text-amber-600">Sensitive fields are not pre-filled — enter new values to update, leave blank to keep existing.</p>}
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Name</label>
                          <input className="input text-xs py-1.5 w-full font-mono"
                            value={editIntgFields.name || ""}
                            onChange={e => { const v = toSlug(e.target.value); setEditIntgFields(f => ({ ...f, name: v, slug: v })); }} />
                        </div>
                        {isApiKey && (API_KEY_FIELDS[editIntgType] || []).filter(f => f.key !== "name" && f.key !== "connectorName").map(f => (
                          <div key={f.key}>
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                              {f.label}
                              {(f.type === "password" || f.optional) && <span className="text-gray-300 ml-1">(leave blank to keep existing)</span>}
                            </label>
                            {f.type === "textarea"
                              ? <textarea className="input text-xs py-1.5 w-full font-mono resize-none" rows={4}
                                  placeholder="leave blank to keep existing"
                                  value={editIntgFields[f.key] || ""}
                                  onChange={e => { setEditIntgFields(v => ({ ...v, [f.key]: e.target.value })); setEditIntgError(""); }} />
                              : <input className="input text-xs py-1.5 w-full font-mono"
                                  type={f.type === "password" ? "password" : "text"}
                                  placeholder={f.type === "password" ? "leave blank to keep existing" : f.placeholder}
                                  value={editIntgFields[f.key] || ""}
                                  onChange={e => { setEditIntgFields(v => ({ ...v, [f.key]: e.target.value })); setEditIntgError(""); }} />
                            }
                          </div>
                        ))}
                        {editIntgError && <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">{editIntgError}</p>}
                        <button disabled={editIntgSaving} onClick={handleSaveIntgEdit}
                          className="btn-primary w-full py-1.5 text-xs disabled:opacity-50">
                          {editIntgSaving ? "Saving…" : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={OAUTH_TYPES.has(confirmDelete.type) ? "Remove Integration" : "Remove Connector"}
          message={OAUTH_TYPES.has(confirmDelete.type)
            ? "This will remove the connected account and delete the saved OAuth credentials. You will need to set up again."
            : "Remove this connector from the workspace?"}
          detail={confirmDelete.name}
          confirmLabel="Remove"
          onConfirm={async () => {
            if (OAUTH_TYPES.has(confirmDelete.type)) {
              try {
                await api.delete(`/admin/workspaces/${workspaceId}/connectors/${confirmDelete.id}`);
                await api.delete(`/oauth/gmail/configure?workspaceId=${workspaceId}`);
                setConnectors(c => c.filter(x => x.id !== confirmDelete.id));
                setTotalConnectors(n => Math.max(0, n - 1));
              } catch { setError("Failed to remove."); }
              setConfirmDelete(null);
            } else {
              handleDelete(confirmDelete.id);
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
