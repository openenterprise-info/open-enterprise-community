require("dotenv").config({ path: require("path").resolve(__dirname, "../../server/.env") });
const express = require("express");
const multer = require("multer");
const path = require("path");
const { processFile } = require("./handlers/fileHandler");
const { processUrl } = require("./handlers/urlHandler");
const { chunkText } = require("./utils/chunker");

const app = express();
const PORT = process.env.PROCESSOR_PORT || 3002;
const upload = multer({ dest: path.join(__dirname, "../storage/temp/") });

app.use(express.json());

app.post("/process/file", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const chunkSize    = parseInt(req.body.chunkSize)    || undefined;
    const chunkOverlap = parseInt(req.body.chunkOverlap) || undefined;
    const text = await processFile(req.file);
    const chunks = chunkText(text, req.file.originalname, chunkSize, chunkOverlap);
    res.json({ chunks, charCount: text.length });
  } catch (err) {
    console.error("File processing error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/process/url", async (req, res) => {
  const { url, chunkSize, chunkOverlap } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });
  try {
    const text = await processUrl(url);
    const chunks = chunkText(text, url, chunkSize || undefined, chunkOverlap || undefined);
    res.json({ chunks, charCount: text.length });
  } catch (err) {
    console.error("URL processing error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Open Enterprise processor running on port ${PORT}`));
