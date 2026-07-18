// Injects the SEA blob into a copy of node.exe to produce oe-runtime-win.exe
const { execSync } = require("child_process");
const { copyFileSync } = require("fs");

copyFileSync(process.execPath, "cli/oe-runtime-win.exe");
execSync(
  "npx postject cli/oe-runtime-win.exe NODE_SEA_BLOB cli/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  { stdio: "inherit" }
);
console.log("\n✅  cli/oe-runtime-win.exe ready");
