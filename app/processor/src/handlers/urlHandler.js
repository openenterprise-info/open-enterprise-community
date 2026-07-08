const axios = require("axios");
const cheerio = require("cheerio");

async function processUrl(url) {
  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OpenEnterprise/1.0)" }
  });

  const $ = cheerio.load(data);

  // Remove noise elements
  $("script, style, nav, footer, header, noscript, iframe, img, svg").remove();

  // Extract meaningful text
  const title = $("title").text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  return `Title: ${title}\nDescription: ${metaDesc}\n\n${bodyText}`;
}

module.exports = { processUrl };
