"use strict";

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

const frontendFile = path.resolve(
  __dirname,
  "../../frontend/src/pages/Workspace/WorkspaceConnectorsPage.jsx"
);

async function run() {
  const content = fs.readFileSync(frontendFile, "utf8");

  // Extract every { id, label, color, initial, cat } entry from ALL_TYPES
  const re = /\{\s*id:\s*"([^"]+)"[^}]*?label:\s*"([^"]+)"[^}]*?color:\s*"([^"]+)"[^}]*?initial:\s*"([^"]+)"[^}]*?cat:\s*"([^"]+)"/gs;
  const entries = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    entries.push({ id: m[1], label: m[2], color: m[3], initial: m[4], cat: m[5] });
  }

  if (!entries.length) {
    console.error("No entries extracted — check the regex against the JSX file.");
    process.exit(1);
  }

  console.log(`Extracted ${entries.length} entries from ALL_TYPES`);

  let inserted = 0, skipped = 0;

  for (const e of entries) {
    const existing = await db.connectionMaster.findUnique({ where: { key: e.id } });
    if (existing) {
      // Already seeded — update label/category but preserve fields
      await db.connectionMaster.update({
        where: { key: e.id },
        data: { label: e.label, category: e.cat, color: e.color, initial: e.initial },
      });
      skipped++;
    } else {
      // New entry — insert with null fields (shows as Coming Soon)
      await db.connectionMaster.create({
        data: {
          key:      e.id,
          label:    e.label,
          category: e.cat,
          color:    e.color,
          initial:  e.initial,
          fields:   null,
        },
      });
      inserted++;
    }
  }

  const total   = await db.connectionMaster.count();
  const live    = await db.connectionMaster.count({ where: { fields: { not: null } } });
  const soon    = await db.connectionMaster.count({ where: { fields: null } });

  console.log(`\nDone.`);
  console.log(`  Inserted (new, Coming Soon): ${inserted}`);
  console.log(`  Updated  (kept fields):      ${skipped}`);
  console.log(`\n  Total in DB : ${total}`);
  console.log(`  Live        : ${live}`);
  console.log(`  Coming Soon : ${soon}`);

  await db.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
