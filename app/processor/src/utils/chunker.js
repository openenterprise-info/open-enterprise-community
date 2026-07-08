const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 150;

function chunkText(text, source = "", chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP) {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = start + chunkSize;

    // Try to break at a sentence or newline boundary
    if (end < clean.length) {
      const boundary = clean.lastIndexOf("\n", end);
      if (boundary > start + chunkSize / 2) end = boundary;
      else {
        const sentence = clean.lastIndexOf(". ", end);
        if (sentence > start + chunkSize / 2) end = sentence + 1;
      }
    }

    const chunkText = clean.slice(start, end).trim();
    if (chunkText.length > 50) {
      chunks.push({ text: chunkText, metadata: { source, chunkIndex: chunks.length, startChar: start } });
    }

    start = end - chunkOverlap;
    if (start >= clean.length) break;
  }

  return chunks;
}

module.exports = { chunkText };
