// scripts/combine-import.mjs
// Convertit les exports CSV du combine (athlétique) et des tests techniques en src/data/combine.json.
// Conserve les accès déjà générés (id, authHash) en rapprochant les joueurs par nom complet.
//
// Usage (depuis la racine du projet) :
//   node scripts/combine-import.mjs --athle combine.csv --tech techniques.csv --date 2026-10-11
//   node scripts/combine-import.mjs --tech techniques.csv --date 2026-10-18   ← ne met à jour que la partie technique
//
// Une section non fournie est conservée telle quelle depuis le combine.json existant.
// --date s'applique aux sections fournies dans la commande (par défaut : aujourd'hui).
//
// Format de chaque CSV : une ligne d'en-tête, une ligne par joueur.
//   ATHLETE (« Prénom Nom ») | une colonne par test
// - Athlétique : l'unité entre parenthèses fixe le sens — (s) plus bas = mieux, (cm) plus haut = mieux.
// - Technique : scores de réussite en %, acceptés sous la forme 85 %, 85 ou 0,85.
// Une case vide = test non passé. Séparateur ; ou , — UTF-8 ou ANSI.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const FILE = "src/data/combine.json";
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const files = { athle: arg("--athle"), tech: arg("--tech") };
const date = arg("--date") ?? new Date().toISOString().slice(0, 10);
if (!files.athle && !files.tech) {
  console.error("Usage : node scripts/combine-import.mjs [--athle combine.csv] [--tech techniques.csv] [--date AAAA-MM-JJ]");
  process.exit(1);
}

const SECTIONS = [
  { id: "athle", label: "Athlétique" },
  { id: "tech", label: "Technique" },
];

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

const norm = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Clé de rapprochement avec les licences : nom complet sans accents/espaces/tirets
const cleNom = (s) => norm(s).replace(/[^A-Z]/g, "");
// « Jean-Pierre Le Gall » → « Jean-Pierre L. »
const cap = (s) => s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
const displayName = (full) => {
  const [prenom, ...reste] = full.trim().split(/\s+/);
  return reste.length ? `${cap(prenom)} ${reste[0][0].toUpperCase()}.` : cap(prenom);
};
const num = (s) => {
  const v = parseFloat(String(s ?? "").replace(/[\s%]/g, "").replace(",", "."));
  return Number.isFinite(v) && v >= 0 ? v : null;
};

// ---------- Lecture d'une section ----------
function readSection(section, path) {
  const [header, ...body] = readCSV(path);
  let iNom = header.findIndex((h) => /^(ATHLETE|ATHLETES|JOUEUR|JOUEUSE|NOM)$/.test(norm(h)));
  if (iNom === -1) iNom = 0;

  const tests = [];
  header.forEach((h, col) => {
    if (col === iNom || !h) return;
    const m = h.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const label = (m ? m[1] : h).trim();
    let unit = (m ? m[2] : "").trim();
    let lowerIsBetter, decimals;
    if (section === "tech") {
      unit = "%"; lowerIsBetter = false; decimals = 0;
    } else {
      const isTime = /^s$|sec/i.test(unit);
      lowerIsBetter = isTime; decimals = isTime ? 2 : 0;
    }
    tests.push({ col, id: `${section}-${slug(label)}`, section, label, unit, lowerIsBetter, decimals });
  });

  // Pourcentages saisis en fraction (0,85) : si toutes les valeurs d'une colonne sont ≤ 1, on multiplie par 100
  if (section === "tech") {
    for (const t of tests) {
      const raw = body.map((r) => r[t.col]).filter((x) => x && !x.includes("%"));
      const vals = raw.map(num).filter((v) => v != null);
      t.fraction = vals.length > 0 && vals.every((v) => v <= 1);
    }
  }

  const players = new Map();
  for (const r of body) {
    const full = r[iNom];
    if (!full) continue;
    const res = {};
    for (const t of tests) {
      let v = num(r[t.col]);
      if (v != null && t.fraction && !String(r[t.col]).includes("%")) v *= 100;
      res[t.id] = v == null ? null : Math.round(v * 10 ** t.decimals) / 10 ** t.decimals;
    }
    if (Object.values(res).every((v) => v == null)) continue; // n'a passé aucun test de la section
    const cle = cleNom(full);
    if (players.has(cle)) console.warn(`⚠️ [${section}] « ${full} » apparaît deux fois — seule la dernière ligne compte.`);
    players.set(cle, { full, res });
  }

  console.log(`\n[${SECTIONS.find((s) => s.id === section).label}] ${path}`);
  tests.forEach((t) =>
    console.log(`  • ${t.label} (${t.unit || "sans unité"}) → ${t.lowerIsBetter ? "plus bas = mieux" : "plus haut = mieux"}${t.fraction ? " · converti depuis 0–1" : ""}`)
  );
  if (section === "athle" && tests.some((t) => !t.unit))
    console.warn("  ⚠️ Colonne sans unité : considérée « plus haut = mieux ». Ajoute (s) ou (cm) dans l'en-tête.");
  console.log(`  ${players.size} joueur(s) avec au moins un résultat`);

  return { tests: tests.map(({ col, fraction, ...t }) => t), players };
}

// ---------- Fusion avec l'existant ----------
const previous = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { tests: [], joueurs: [] };
const sectionOf = (t) => t.section ?? "athle"; // anciennes versions sans section = athlétique
const provided = SECTIONS.map((s) => s.id).filter((id) => files[id]);

const sections = SECTIONS.map((s) => {
  const prev = previous.sections?.find((p) => p.id === s.id);
  return { ...s, date: provided.includes(s.id) ? date : prev?.date ?? previous.date ?? null };
});

let tests = previous.tests.filter((t) => !provided.includes(sectionOf(t))).map((t) => ({ ...t, section: sectionOf(t) }));
const keptIds = new Set(tests.map((t) => t.id));

// Joueurs existants : on garde id, accès et résultats des sections non fournies
const joueurs = new Map();
for (const j of previous.joueurs) {
  if (!j.cle) continue; // format trop ancien : sera recréé
  const res = Object.fromEntries(Object.entries(j.res).filter(([id]) => keptIds.has(id)));
  joueurs.set(j.cle, { ...j, res });
}

for (const id of provided) {
  const { tests: t, players } = readSection(id, files[id]);
  tests.push(...t);
  for (const [cle, p] of players) {
    const j = joueurs.get(cle) ?? { nom: displayName(p.full), cle, res: {} };
    j.nom = displayName(p.full);
    j.complet = p.full; // nom complet, utilisé par combine-auth pour le rapprochement (reste local / chiffré)
    Object.assign(j.res, p.res);
    joueurs.set(cle, j);
  }
}

tests.sort((a, b) => SECTIONS.findIndex((s) => s.id === a.section) - SECTIONS.findIndex((s) => s.id === b.section));
const testIds = new Set(tests.map((t) => t.id));

const out = {
  sections: sections.filter((s) => tests.some((t) => t.section === s.id)),
  tests,
  joueurs: [...joueurs.values()]
    .map((j) => ({ ...j, res: Object.fromEntries(Object.entries(j.res).filter(([id]) => testIds.has(id))) }))
    .filter((j) => Object.values(j.res).some((v) => v != null)),
};
writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");

// ---------- Bilan ----------
const has = (j, s) => tests.some((t) => t.section === s && j.res[t.id] != null);
const both = out.joueurs.filter((j) => has(j, "athle") && has(j, "tech")).length;
const onlyA = out.joueurs.filter((j) => has(j, "athle") && !has(j, "tech")).length;
const onlyT = out.joueurs.filter((j) => !has(j, "athle") && has(j, "tech")).length;
const sansAcces = out.joueurs.filter((j) => !j.authHashes?.length).map((j) => j.nom);

console.log(`\n✓ ${out.joueurs.length} joueur(s) → ${FILE}  (les deux : ${both} · athlétique seul : ${onlyA} · technique seul : ${onlyT})`);
if (sansAcces.length) console.warn(`ℹ️ Sans accès, lance combine-auth.mjs : ${sansAcces.join(", ")}`);
console.log("→ Puis combine-encrypt.mjs.");
