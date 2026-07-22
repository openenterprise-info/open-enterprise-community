"use strict";
const { execSync }    = require("child_process");
const { copyFileSync } = require("fs");

const platform = process.platform;
const outName  = platform === "win32"  ? "oe-runtime-win.exe"
               : platform === "darwin" ? "oe-runtime-macos"
               :                         "oe-runtime-linux";

const outPath  = `cli/${outName}`;

copyFileSync(process.execPath, outPath);

const macFlag = platform === "darwin" ? " --macho-segment-name NODE_SEA" : "";
execSync(
  `npx postject "${outPath}" NODE_SEA_BLOB cli/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2${macFlag}`,
  { stdio: "inherit" }
);

if (platform === "darwin") {
  execSync(`codesign --sign - "${outPath}"`, { stdio: "inherit" });
}

if (platform !== "win32") {
  execSync(`chmod +x "${outPath}"`);
}

console.log(`\n✅  ${outPath} ready`);
