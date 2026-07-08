export function exportMD(content, filename) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `${filename}.md`;
  a.click(); URL.revokeObjectURL(url);
}

export function exportPDF(content, filename) {
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>${filename}</title>
    <style>
      body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#111}
      h1,h2,h3{margin-top:1.5em}
      pre{background:#f4f4f4;padding:12px;border-radius:6px;overflow-x:auto;white-space:pre-wrap;font-family:inherit}
      code{background:#f4f4f4;padding:2px 4px;border-radius:3px}
      hr{border:none;border-top:1px solid #e5e7eb}
      @media print{body{margin:20px}}
    </style></head>
    <body><pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
    <script>window.onload=()=>{window.print();}<\/script></body></html>`);
  win.document.close();
}

export function exportFilename(agentName, date) {
  const slug = (agentName || "agent-output").toLowerCase().replace(/\s+/g, "-");
  const d    = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `${slug}-${d}`;
}
