// scripts/combine-auth.mjs
// Rapproche chaque joueur du combine (src/data/combine.json) de sa licence et calcule
// ses empreintes de connexion (licence + prénom). Rien n'est stocké en clair.
//
// Usage (depuis la racine du projet) :
//   node --env-file=.env scripts/combine-auth.mjs licences.csv
//   node --env-file=.env scripts/combine-auth.mjs licences.csv --alias alias.csv
//
// licences.csv : Code Adhérent (ou Licence) | Nom | Prénom   (séparateur ; ou , — UTF-8 ou ANSI)
//
// Rapprochement, dans l'ordre :
//   1. alias.csv (facultatif) : ATHLETE ; Code Adhérent — pour forcer un cas à la main
//   2. nom complet identique, sans accents/espaces/tirets/apostrophes
//        « Thomas Delatour » = « Thomas DE LA TOUR », « Jean-Pierre » = « Jean Pierre »
//   3. mots du nom utilisé au club tous présents dans le nom de licence, même prénom
//        « Thomas Martin » ↔ « Thomas MARTIN DUPONT », « Hugo Tour » ↔ « Hugo DE LA TOUR »
//        accepté seulement si un seul licencié correspond (sinon signalé)
//
// Prénoms acceptés à la connexion : prénom de licence complet, son 1er mot, et le prénom
// utilisé au club (« Marie-Claire », « Marie » ou « Malou » si c'est ce qui est dans l'Excel).
//
// ⚠️ Garde ces CSV hors du dépôt.

import { readFileSync, writeFileSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";

const SECRET = process.env.COMBINE_SECRET;
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const CSV = process.argv[2];
const ALIAS = arg("--alias");
if (!SECRET) {
  console.error("COMBINE_SECRET manquant (lance avec : node --env-file=.env ...).");
  process.exit(1);
}
if (!CSV || CSV.startsWith("--")) {
  console.error("Usage : node --env-file=.env scripts/combine-auth.mjs licences.csv [--alias alias.csv]");
  process.exit(1);
}
const FILE = "src/data/combine.json";
const hmac = (s) => createHmac("sha256", SECRET).update(s).digest("hex");

// ---------- Lecture CSV ----------
function readCSV(path) {
  const buf = readFileSync(path);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    const W1252 = { 0x80: "€", 0x85: "…", 0x8c: "Œ", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x96: "–", 0x97: "—", 0x9c: "œ" };
    text = new TextDecoder("windows-1252").decode(buf).replace(/[\u0080-\u009f]/g, (c) => W1252[c.charCodeAt(0)] ?? c);
  }
  text = text.replace(/^﻿/, "");
  const first = text.split(/\r?\n/, 1)[0];
  const SEP = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === SEP) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((c) => c));
}

// ---------- Normalisations ----------
const norm = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const cleNom = (s) => norm(s).replace(/[^A-Z]/g, ""); // identique à combine-import.mjs
const mots = (s) => norm(s).split(/[^A-Z]+/).filter(Boolean); // coupe sur espaces, tirets, apostrophes
const normLicence = (s) => (s ?? "").toUpperCase().replace(/[\s.-]/g, ""); // identique à combine.astro
const normPrenom = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, ""); // identique à combine.astro

// ---------- Licences ----------
const [header, ...lines] = readCSV(CSV);
const H = header.map(norm);
const find = (...res) => H.findIndex((h) => res.some((re) => re.test(h)));
const iLic = find(/^CODE ADHERENT$/, /^N?°? ?LICENCE$/, /^NUMERO DE LICENCE$/, /^LICENCE$/);
const iNom = find(/^NOM$/);
const iPrenom = find(/^PRENOM$/);
if (iLic === -1 || iNom === -1 || iPrenom === -1) {
  console.error("Colonnes attendues : Code Adhérent (ou Licence), Nom, Prénom");
  console.error(`En-têtes lus : ${header.join(" | ")}`);
  process.exit(1);
}

const licences = lines
  .map((l) => {
    const prenom = l[iPrenom] ?? "", nom = l[iNom] ?? "";
    return {
      code: normLicence(l[iLic]),
      prenom,
      full: `${prenom} ${nom}`.trim(),
      cle: cleNom(`${prenom} ${nom}`),
      mots: new Set(mots(`${prenom} ${nom}`)),
      motsPrenom: new Set(mots(prenom)),
    };
  })
  .filter((l) => l.code && l.prenom);
const byCode = new Map(licences.map((l) => [l.code, l]));

// ---------- Alias manuels ----------
const alias = new Map();
if (ALIAS) {
  const [, ...rows] = readCSV(ALIAS);
  for (const [nom, code] of rows) if (nom && code) alias.set(cleNom(nom), normLicence(code));
}

// ---------- Rapprochement ----------
const data = JSON.parse(readFileSync(FILE, "utf8"));
if (data.joueurs.some((j) => !j.complet)) {
  console.error("combine.json sans nom complet : relance d'abord combine-import.mjs (nouvelle version).");
  process.exit(1);
}

const problemes = [];
const approx = new Map(); // joueur → texte
const attribue = new Map(); // code licence → joueur

for (const j of data.joueurs) {
  delete j.authHash; delete j.codeHash; // reliquats d'anciennes versions
  j.authHashes = [];

  let lic = null, mode = "";
  const aliasCode = alias.get(j.cle);
  if (aliasCode) {
    lic = byCode.get(aliasCode);
    mode = "alias";
    if (!lic) { problemes.push(`${j.complet} : code ${aliasCode} de l'alias introuvable dans les licences`); continue; }
  } else {
    const exacts = licences.filter((l) => l.cle === j.cle);
    if (exacts.length === 1) { lic = exacts[0]; mode = "exact"; }
    else if (exacts.length > 1) { problemes.push(`${j.complet} : ${exacts.length} licences au même nom — à forcer dans alias.csv`); continue; }
    else {
      const m = mots(j.complet);
      const cands = licences.filter((l) => m.every((x) => l.mots.has(x)) && l.motsPrenom.has(m[0]));
      if (cands.length === 1) { lic = cands[0]; mode = "approx"; }
      else if (cands.length > 1) {
        problemes.push(`${j.complet} : plusieurs licences possibles (${cands.map((c) => c.full).join(" / ")}) — à forcer dans alias.csv`);
        continue;
      } else { problemes.push(`${j.complet} : aucune licence trouvée — à forcer dans alias.csv`); continue; }
    }
  }

  if (attribue.has(lic.code)) {
    const autre = attribue.get(lic.code);
    problemes.push(`${j.complet} et ${autre.complet} pointent vers la même licence (${lic.full}) — à forcer dans alias.csv`);
    autre.authHashes = [];
    approx.delete(autre);
    continue;
  }
  attribue.set(lic.code, j);
  if (mode === "approx") approx.set(j, `${j.complet}  →  ${lic.full}`);

  // Prénoms acceptés : licence complet, 1er mot du prénom de licence, prénom utilisé au club
  const variantes = new Set(
    [lic.prenom, mots(lic.prenom)[0], j.complet.split(/\s+/)[0]].map(normPrenom).filter(Boolean)
  );
  if (!j.id) j.id = randomBytes(6).toString("hex");
  j.authHashes = [...variantes].map((p) => hmac(`auth:${lic.code}|${p}`));
}

writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");

// ---------- Bilan ----------
const ok = data.joueurs.filter((j) => j.authHashes.length).length;
console.log(`✓ ${ok} accès configuré(s) sur ${data.joueurs.length} joueur(s)`);
if (approx.size) {
  console.log(`\nRapprochements approximatifs (vérifie-les) :`);
  [...approx.values()].forEach((a) => console.log(`  ${a}`));
}
if (problemes.length) {
  console.warn(`\n⚠️ Sans accès :`);
  problemes.forEach((p) => console.warn(`  ${p}`));
  console.warn(`\nPour forcer un rapprochement, crée alias.csv :\n  ATHLETE;Code Adhérent\n  Prénom Nom (comme dans l'Excel);CODE\npuis relance avec --alias alias.csv`);
}
console.log("\n→ Puis combine-encrypt.mjs.");
