// scripts/combine-encrypt.mjs
// Chiffre src/data/combine.json (gitignoré) → src/data/combine.enc.json (commité).
// Clé dérivée de COMBINE_SECRET : rien d'autre à configurer sur Netlify.
//
// Usage (depuis la racine du projet, après combine-import et combine-auth) :
//   node --env-file=.env scripts/combine-encrypt.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { createCipheriv, createHash, randomBytes } from "node:crypto";

const SECRET = process.env.COMBINE_SECRET;
if (!SECRET) {
  console.error("COMBINE_SECRET manquant (doit être le même que sur Netlify).");
  process.exit(1);
}

const SRC = "src/data/combine.json";
const OUT = "src/data/combine.enc.json";

const key = createHash("sha256").update(`data:${SECRET}`).digest(); // 32 octets, identique à combine.astro
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const plain = readFileSync(SRC, "utf8");
const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

writeFileSync(
  OUT,
  JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  }) + "\n"
);
console.log(`✓ ${SRC} chiffré → ${OUT} (à commiter)`);
