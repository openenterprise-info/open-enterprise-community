const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { parse } = require("csv-parse/sync");
const XLSX = require("xlsx");

async function processFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const buffer = fs.readFileSync(file.path);

  try {
    if (ext === ".pdf") {
      const data = await pdfParse(buffer);
      return data.text;
    }

    if (ext === ".docx" || ext === ".doc") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    if (ext === ".txt" || ext === ".md") {
      return buffer.toString("utf-8");
    }

    if (ext === ".csv") {
      const records = parse(buffer, { columns: true, skip_empty_lines: true });
      return records.map(r => Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(" | ")).join("\n");
    }

    if (ext === ".xlsx" || ext === ".xls") {
      const wb = XLSX.read(buffer, { type: "buffer" });
      return wb.SheetNames.map(name => {
        const ws = wb.Sheets[name];
        return `Sheet: ${name}\n` + XLSX.utils.sheet_to_csv(ws);
      }).join("\n\n");
    }

    if (ext === ".json") {
      return JSON.stringify(JSON.parse(buffer.toString()), null, 2);
    }

    // Fallback: treat as plain text
    return buffer.toString("utf-8");
  } finally {
    fs.unlink(file.path, () => {});
  }
}

module.exports = { processFile };
