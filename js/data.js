/* BreedingPro — Block 3 engine, part 1: reading tables, column roles and
   recognition of the mating and field designs.

   Data.readFile / Data.sheetRows / Data.parseDelimited turn a workbook or a text
   file into rows; Data.table finds the header (and the declaration line written
   by the Block 2 field book); Data.guessRoles proposes a role for every column
   from its name (Spanish and English synonyms) and its contents; Data.build
   makes the records; Data.recognize works out the mating design (Griffing 1–4,
   partial diallel, North Carolina I–III, triple test cross, line × tester,
   generations) and, for every environment, the field design (completely
   randomised, complete blocks, resolvable incomplete blocks / α-lattice,
   incomplete blocks, augmented, entry means). */

const Data = {};

/* ================= reading ================= */
Data.MISSING = new Set(['', 'na', 'n/a', 'nan', 'null', '.', '..', '-', '--', '?', '*', 'missing', 'perdido', 'faltante', 's/d', 'sd', 'nd', 'n.d.', '#n/a', '#value!', '#div/0!']);
Data.isMissing = v => v == null || (typeof v === 'number' ? !isFinite(v) : Data.MISSING.has(String(v).trim().toLowerCase()));

Data.readFile = file => new Promise((resolve, reject) => {
  const name = file.name || 'data';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const binary = ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods'].includes(ext);
  const fr = new FileReader();
  fr.onerror = () => reject(new Error(T('No se pudo leer el archivo.', 'The file could not be read.')));
  fr.onload = () => {
    try {
      if (binary) {
        const wb = XLSX.read(new Uint8Array(fr.result), { type: 'array' });
        resolve({ name, ext, kind: 'workbook', workbook: wb, sheets: wb.SheetNames });
      } else resolve({ name, ext, kind: 'text', text: String(fr.result) });
    } catch (e) { reject(e); }
  };
  if (binary) fr.readAsArrayBuffer(file); else fr.readAsText(file);
});

Data.trimRows = rows => {
  const out = rows.map(r => (r || []).map(v => (v == null ? '' : v)));
  while (out.length && out[out.length - 1].every(v => String(v).trim() === '')) out.pop();
  let cols = 0;
  out.forEach(r => { for (let j = r.length - 1; j >= 0; j--) if (String(r[j]).trim() !== '') { cols = Math.max(cols, j + 1); break; } });
  return out.map(r => { const x = r.slice(0, cols); while (x.length < cols) x.push(''); return x; });
};
Data.sheetRows = (wb, sheet) => Data.trimRows(XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: true, defval: '', blankrows: false }));

function splitLine(line, delim) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else if (cur === '' || q) q = !q; else cur += ch; }
    else if (ch === delim && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}
Data.parseDelimited = text => {
  text = String(text).replace(/^\uFEFF/, '');
  const lines = text.split(/\r\n|\n|\r/);
  const counts = { ',': 0, ';': 0, '\t': 0 };
  lines.slice(0, 30).forEach(l => { if (l.startsWith('#')) return; for (const d in counts) counts[d] += l.split(d).length - 1; });
  const delim = counts['\t'] > 0 && counts['\t'] >= counts[';'] * 0.5 ? '\t' : counts[';'] > counts[','] ? ';' : ',';
  const rows = lines.filter(l => l.trim() !== '').map(l => splitLine(l, delim));
  const out = Data.trimRows(rows);
  out.delimiter = delim;
  return out;
};

/* the declaration line of a BreedingPro field book */
Data.parseMeta = s => {
  const m = {};
  String(s).replace(/^#\s*BreedingPro\s+fieldbook\s*,?/i, '').split(',').forEach(part => {
    const [k, v] = part.split('=').map(x => (x || '').trim());
    if (k && v != null && v !== '') m[k] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  });
  return m;
};

/* header and data rows; leading comment lines are skipped */
Data.table = rows => {
  let i = 0, meta = null;
  const txt = v => String(v == null ? '' : v).trim();
  while (i < rows.length) {
    const first = txt(rows[i][0]);
    if (rows[i].every(v => txt(v) === '')) { i++; continue; }
    if (first.startsWith('#')) { if (/^#\s*BreedingPro/i.test(first)) meta = Data.parseMeta(rows[i].map(txt).filter(Boolean).join(', ')); i++; continue; }
    break;
  }
  if (i >= rows.length) return { header: [], rows: [], meta, headerRow: 0 };
  const seen = new Map();
  const header = rows[i].map((v, j) => {
    let h = txt(v) || T('Columna ', 'Column ') + (j + 1);
    if (seen.has(h)) { const k = seen.get(h) + 1; seen.set(h, k); h = h + ' (' + k + ')'; } else seen.set(h, 1);
    return h;
  });
  const data = [], rowNumbers = [];
  for (let r = i + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(v => txt(v) === '')) continue;
    const x = header.map((_, j) => (row[j] == null ? '' : row[j]));
    data.push(x); rowNumbers.push(r + 1);
  }
  return { header, rows: data, meta, headerRow: i + 1, rowNumbers };
};

/* ================= numbers ================= */
const reComma = /^[-+]?\d+,\d+$/, reThousandsComma = /^[-+]?\d{1,3}(\.\d{3})+,\d+$/, rePoint = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
/* decimal convention of a column: 'point' or 'comma' */
Data.decimalOf = values => {
  let comma = 0, point = 0;
  values.forEach(v => {
    if (typeof v === 'number' || Data.isMissing(v)) return;
    const s = String(v).trim();
    if (reComma.test(s) || reThousandsComma.test(s)) comma++;
    else if (/^[-+]?\d+\.\d+$/.test(s)) point++;
  });
  return comma > point ? 'comma' : 'point';
};
Data.toNumber = (v, decimal) => {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (Data.isMissing(v)) return null;
  let s = String(v).trim().replace(/\u2212/g, '-').replace(/\s+/g, '');
  if (decimal === 'comma') { if (reThousandsComma.test(s)) s = s.replace(/\./g, ''); s = s.replace(',', '.'); }
  return rePoint.test(s) ? Number(s) : NaN;
};

/* ================= column roles ================= */
Data.ROLES = [
  { key: 'ignore', es: 'Ignorar', en: 'Ignore' },
  { key: 'trait', es: 'Variable respuesta', en: 'Response trait' },
  { key: 'env', es: 'Localidad / ambiente', en: 'Location / environment' },
  { key: 'year', es: 'Año / ciclo', en: 'Year / season' },
  { key: 'rep', es: 'Repetición', en: 'Replicate' },
  { key: 'block', es: 'Bloque (incompleto)', en: 'Block (incomplete)' },
  { key: 'plot', es: 'Parcela', en: 'Plot' },
  { key: 'row', es: 'Fila', en: 'Row' },
  { key: 'col', es: 'Columna', en: 'Column' },
  { key: 'entry', es: 'Entrada / genotipo', en: 'Entry / genotype' },
  { key: 'female', es: 'Hembra / línea / progenitor 1', en: 'Female / line / parent 1' },
  { key: 'male', es: 'Macho / probador / progenitor 2', en: 'Male / tester / parent 2' },
  { key: 'set', es: 'Conjunto', en: 'Set' },
  { key: 'generation', es: 'Generación', en: 'Generation' },
  { key: 'type', es: 'Tipo de entrada', en: 'Entry type' },
  { key: 'plant', es: 'Planta / individuo', en: 'Plant / individual' },
];
Data.SINGLE_ROLES = ['rep', 'block', 'plot', 'row', 'col', 'entry', 'female', 'male', 'set', 'generation', 'type', 'plant'];

Data.norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[\u2080-\u2089]/g, d => String(d.charCodeAt(0) - 0x2080)).replace(/[^a-z0-9]/g, '');

const SYN = [
  ['plot', /^(plot|plots|parcela|parcelas|parc|plotid|plotno|plotnumber|numparcela|noparcela|numerodeparcela|unidad|unit|unidadexperimental|experimentalunit)$/],
  ['rep', /^(rep|reps|repeticion|repeticiones|repet|replicate|replicates|replication|replica|r|bloquecompleto|completeblock)$/],
  ['block', /^(block|blocks|bloque|bloques|blk|blq|bl|iblock|incblock|subbloque|subblock|bloqueincompleto|incompleteblock)$/],
  ['env', /^(loc|locs|localidad|localidades|location|locations|locality|env|envs|environment|environments|ambiente|ambientes|amb|site|sites|sitio|sitios|lugar|trial|ensayo|experimento|experiment|estacion|station)$/],
  ['year', /^(year|years|ano|anos|anio|yr|season|seasons|ciclo|ciclos|temporada|cycle|campana|campaign)$/],
  ['row', /^(row|rows|fila|filas|hilera|hileras|range|ranges|rango|rowno)$/],
  ['col', /^(col|cols|column|columns|columna|columnas|tier|pase|colno)$/],
  ['set', /^(set|sets|conjunto|conjuntos)$/],
  ['generation', /^(generation|generations|generacion|generaciones|gener|filial)$/],
  ['type', /^(type|types|tipo|tipos|clase|class|category|categoria|entrytype|tipoentrada|tipodeentrada)$/],
  ['plant', /^(plant|plants|planta|plantas|individual|individuo|ind|plantid|plantno|progeny|progenie|seedling|plantula|arbol|tree|sample|muestra)$/],
  ['female', /^(female|females|hembra|hembras|madre|mother|dam|par1|parent1|parenta|progenitor1|padre1|cross1|linea|lineas|line|lines|seedparent|maternal|fem|f2|plantaf2|f2plant|f2plants|plantasf2)$/],
  ['male', /^(male|males|macho|machos|padre|father|sire|par2|parent2|parentb|progenitor2|padre2|cross2|probador|probadores|tester|testers|pollenparent|paternal)$/],
  ['entry', /^(entry|entries|entrada|entradas|entryno|genotype|genotypes|genotipo|genotipos|geno|gen|treatment|treatments|tratamiento|tratamientos|trat|trt|treat|variety|varieties|variedad|variedades|var|hybrid|hybrids|hibrido|hibridos|cross|crosses|cruza|cruzas|cruzamiento|familia|familias|family|families|clon|clones|clone|material|materiales|accesion|accesiones|accession|cultivar|cultivares|cv|name|nombre|pedigree|pedigri|genealogia|id|code|codigo)$/],
];
Data.roleFromName = name => { const n = Data.norm(name); const hit = SYN.find(([, re]) => re.test(n)); return hit ? hit[0] : null; };

Data.columnProfile = (table, j) => {
  const vals = table.rows.map(r => r[j]);
  const present = vals.filter(v => !Data.isMissing(v));
  const decimal = Data.decimalOf(present);
  let numeric = 0;
  present.forEach(v => { if (isFinite(Data.toNumber(v, decimal))) numeric++; });
  const distinct = new Set(present.map(v => String(v).trim()));
  return { j, name: table.header[j], n: vals.length, present: present.length, missing: vals.length - present.length, numeric, numericShare: present.length ? numeric / present.length : 0, distinct: distinct.size, decimal, sample: [...distinct].slice(0, 6) };
};

Data.guessRoles = table => {
  const prof = table.header.map((_, j) => Data.columnProfile(table, j));
  const roles = prof.map(p => {
    if (!p.present) return 'ignore';
    const byName = Data.roleFromName(p.name);
    if (byName) return byName;
    return p.numericShare >= 0.9 ? 'trait' : 'ignore';
  });
  /* one column per single role: keep the most informative one */
  Data.SINGLE_ROLES.forEach(role => {
    const idx = roles.map((r, j) => (r === role ? j : -1)).filter(j => j >= 0);
    if (idx.length < 2) return;
    const best = role === 'entry' ? (idx.find(j => prof[j].numericShare < 0.5) ?? idx[0]) : idx[0];
    idx.forEach(j => { if (j !== best) roles[j] = 'ignore'; });
  });
  /* no entry column: an unnamed text column with several values names the entries */
  const hasPedigree = roles.includes('female') || roles.includes('male') || roles.includes('generation');
  if (!roles.includes('entry') && !hasPedigree) {
    const j = prof.findIndex((p, k) => roles[k] === 'ignore' && p.present && p.numericShare < 0.5 && p.distinct >= 2);
    if (j >= 0) roles[j] = 'entry';
  }
  return { roles, profiles: prof };
};

/* ================= genetics vocabulary ================= */
Data.GEN_ORDER = ['P1', 'P2', 'F1', 'RF1', 'F2', 'F3', 'BC1', 'BC2', 'BC1S', 'BC2S'];
Data.genCode = s => {
  const n = Data.norm(s);
  const map = { p1: 'P1', p2: 'P2', f1: 'F1', rf1: 'RF1', f1r: 'RF1', f1rec: 'RF1', f1reciproca: 'RF1', f2: 'F2', f3: 'F3', bc1: 'BC1', b1: 'BC1', rc1: 'BC1', bc1p1: 'BC1', bc2: 'BC2', b2: 'BC2', rc2: 'BC2', bc2p2: 'BC2', bc1s: 'BC1S', bc11: 'BC1S', b11: 'BC1S', bs1: 'BC1S', bc2s: 'BC2S', bc22: 'BC2S', b22: 'BC2S', bs2: 'BC2S', retrocruza1: 'BC1', retrocruza2: 'BC2', backcross1: 'BC1', backcross2: 'BC2' };
  return map[n] || null;
};
Data.typeCode = s => {
  const n = Data.norm(s);
  if (!n) return null;
  if (/^(check|checks|testigo|testigos|control|controles|controls|comercial|commercial)$/.test(n)) return 'check';
  if (/^(reciprocal|reciprocals|reciproca|reciprocas|recip|rf1|r)$/.test(n)) return 'reciprocal';
  if (/^(parent|parents|progenitor|progenitores|padre|padres|parental|parentales|p|self|inbred|endogamica|autofecundacion)$/.test(n)) return 'parent';
  if (/^(line|lines|linea|lineas)$/.test(n)) return 'line';
  if (/^(tester|testers|probador|probadores)$/.test(n)) return 'tester';
  if (/^(fs|fullsib|fullsibfamily|familiadehermanoscompletos|hermanoscompletos)$/.test(n)) return 'FS';
  if (String(s).trim().startsWith('×')) { if (n === 'p1') return 'L1'; if (n === 'p2') return 'L2'; if (n === 'f1') return 'L3'; }
  if (/^(cross|crosses|cruza|cruzas|f1|f1directa|f1direct|direct|directa|hybrid|hibrido|hibridos|hybrids|single cross|cruzasimple|singlecross)$/.test(n)) return 'F1';
  if (Data.genCode(s)) return 'generation';
  return null;
};

/* "A × B", "A x B", "A/B", "1x3": the two parents of a cross, or null */
Data.splitCross = s => {
  s = String(s == null ? '' : s).trim();
  if (!s) return null;
  let m = s.match(/^(.+?)\s*[×✕✖]\s*(.+)$/) || s.match(/^(.+?)\s+[xX*]\s+(.+)$/) || s.match(/^(.+?)\s*[*/]\s*(.+)$/);
  if (!m) m = s.match(/^([A-Za-z]{0,4}\d+[A-Za-z]?)\s*[xX]\s*([A-Za-z]{0,4}\d+[A-Za-z]?)$/);
  if (!m) return null;
  const a = m[1].trim(), b = m[2].trim();
  return a && b ? [a, b] : null;
};
Data.crossName = (f, m) => (f === m ? f : f + ' × ' + m);

/* ================= records ================= */
Data.build = (table, roles, o) => {
  o = o || {};
  const n = table.rows.length;
  const colOf = role => roles.map((r, j) => (r === role ? j : -1)).filter(j => j >= 0);
  const txt = (row, js) => js.map(j => row[j]).filter(v => !Data.isMissing(v)).map(v => String(v).trim()).join(' · ');
  const issues = [];
  const cEnv = colOf('env'), cYear = colOf('year');
  const one = role => colOf(role)[0];
  const traits = colOf('trait').map(j => {
    const decimal = o.decimal && o.decimal !== 'auto' ? o.decimal : Data.decimalOf(table.rows.map(r => r[j]));
    return { name: table.header[j], col: j, decimal, y: new Float64Array(n), missing: 0, bad: [] };
  });
  const recs = table.rows.map((row, i) => {
    const get = role => { const j = one(role); return j == null || Data.isMissing(row[j]) ? '' : String(row[j]).trim(); };
    const r = {
      i, line: table.rowNumbers ? table.rowNumbers[i] : i + 2,
      env: [txt(row, cEnv), txt(row, cYear)].filter(Boolean).join(' · '),
      rep: get('rep'), block: get('block'), plot: get('plot'), row: get('row'), col: get('col'), set: get('set'), plant: get('plant'),
      entryRaw: get('entry'), female: get('female'), male: get('male'), typeRaw: get('type'), genRaw: get('generation'),
    };
    return r;
  });
  traits.forEach(t => recs.forEach((r, i) => {
    const v = Data.toNumber(table.rows[i][t.col], t.decimal);
    if (v === null) { t.y[i] = NaN; t.missing++; }
    else if (!isFinite(v)) { t.y[i] = NaN; t.missing++; t.bad.push({ line: r.line, value: String(table.rows[i][t.col]) }); }
    else t.y[i] = v;
  }));
  traits.forEach(t => { if (t.bad.length) issues.push({ level: 'warning', es: `«${t.name}»: ${t.bad.length === 1 ? '1 valor que no es número se tomó' : t.bad.length + ' valores que no son números se tomaron'} como faltantes (p. ej., fila ${t.bad[0].line}: «${t.bad[0].value}»).`, en: `"${t.name}": ${t.bad.length === 1 ? '1 value that is not a number was' : t.bad.length + ' values that are not numbers were'} taken as missing (e.g., row ${t.bad[0].line}: "${t.bad[0].value}").`, lines: t.bad.map(b => b.line) }); });

  /* generation codes, from the generation column, the type column or the entry names */
  const mostlyGen = vals => { const d = [...new Set(vals.filter(Boolean))]; const g = d.filter(x => Data.genCode(x)); return g.length >= 3 && g.length >= 0.6 * d.length; };
  const typeIsGen = mostlyGen(recs.map(r => r.typeRaw)), entryIsGen = !roles.includes('generation') && mostlyGen(recs.map(r => r.entryRaw));
  recs.forEach(r => {
    r.generation = Data.genCode(r.genRaw) || (typeIsGen ? Data.genCode(r.typeRaw) : null) || (entryIsGen ? Data.genCode(r.entryRaw) : null);
    r.type = r.generation ? 'generation' : Data.typeCode(r.typeRaw);
  });

  /* crosses written in the entry name */
  const hasPed = roles.includes('female') || roles.includes('male');
  let splitUsed = false;
  if (!hasPed) {
    const names = [...new Set(recs.map(r => r.entryRaw).filter(Boolean))];
    const parts = new Map(names.map(x => [x, Data.splitCross(x)]));
    const split = names.filter(x => parts.get(x));
    const parentNames = new Set(split.flatMap(x => parts.get(x)));
    const reused = [...parentNames].filter(p => split.filter(x => parts.get(x).includes(p)).length >= 2).length;
    if (split.length >= 2 && split.length >= 0.5 * names.length && reused >= Math.min(3, parentNames.size)) {
      splitUsed = true;
      recs.forEach(r => {
        if (r.generation) return;
        const pr = parts.get(r.entryRaw);
        if (pr) { r.female = pr[0]; r.male = pr[1]; }
        else if (parentNames.has(r.entryRaw)) { r.female = r.male = r.entryRaw; }
      });
    }
  }

  /* entry names: pedigree when the entry column is only a number that matches it one to one */
  const numericEntry = roles.includes('entry') && recs.every(r => !r.entryRaw || /^\d+$/.test(r.entryRaw));
  let byPedigree = false;
  if (numericEntry && hasPed) {
    const a = new Map(), b = new Map();
    let ok = true;
    recs.forEach(r => {
      if (!r.entryRaw || (!r.female && !r.male)) return;
      const ped = (r.female || '') + '|' + (r.male || '');
      if (a.has(r.entryRaw) && a.get(r.entryRaw) !== ped) ok = false;
      if (b.has(ped) && b.get(ped) !== r.entryRaw) ok = false;
      a.set(r.entryRaw, ped); b.set(ped, r.entryRaw);
    });
    byPedigree = ok;
  }
  /* In North Carolina and line × tester designs females and males are different
     plants even when their codes coincide ("1 × 1" is a cross, not a parent), and
     codes that repeat across sets are different plants too; in diallels both
     columns name the same parents. The inbred testers P1, P2 and F1 keep their names. */
  const hasSet = roles.includes('set') && new Set(recs.map(r => r.set)).size > 1;
  const separate = o.separateSexes != null ? o.separateSexes : hasSet;
  const tester = x => /^(p1|p2|f1)$/.test(Data.norm(x));
  recs.forEach(r => { r.femaleRaw = r.female; r.maleRaw = r.male; });
  let setQualified = false;
  if (hasSet && hasPed) {
    const seen = new Map();
    recs.forEach(r => { [r.female, r.male].forEach(x => { if (!x || tester(x)) return; if (!seen.has(x)) seen.set(x, new Set()); seen.get(x).add(r.set); }); });
    if ([...seen.values()].some(s => s.size > 1)) {
      setQualified = true;
      recs.forEach(r => { if (r.female && !tester(r.female)) r.female = 'S' + r.set + '·' + r.female; if (r.male && !tester(r.male)) r.male = 'S' + r.set + '·' + r.male; });
    }
  }
  if (separate && hasPed) {
    const fem = new Set(recs.map(r => r.female).filter(Boolean)), mal = new Set(recs.map(r => r.male).filter(Boolean));
    const clash = [...fem].some(x => mal.has(x));
    if (clash) recs.forEach(r => { if (r.female) r.female = '♀' + r.female; if (r.male) r.male = '♂' + r.male; });
  }
  if (o.nestFemales && hasPed) recs.forEach(r => { if (r.female && r.male) r.female = r.male.replace(/^♂/, '') + '/' + r.female.replace(/^♀/, ''); });
  recs.forEach(r => {
    if (r.generation) { r.entry = r.entryRaw && !Data.genCode(r.entryRaw) ? r.entryRaw : r.generation; r.type = 'generation'; return; }
    if (r.female && r.male) r.pedigree = Data.crossName(r.female, r.male);
    else r.pedigree = r.female || r.male || '';
    r.number = numericEntry ? r.entryRaw : '';
    r.entry = (byPedigree || !r.entryRaw || setQualified) && r.pedigree ? r.pedigree : r.entryRaw || r.pedigree;
    /* in a generations trial a check is often written in the generation column itself
       (Testigo, H-520): that name is the entry, and it is a check */
    if (!r.entry && r.genRaw && String(r.genRaw).trim()) { r.entry = String(r.genRaw).trim(); if (!r.type) r.type = 'check'; }
    if (!r.type) {
      if (r.female && r.male) r.type = r.female === r.male ? 'parent' : 'F1';
      else if (r.female) r.type = 'line';
      else if (r.male) r.type = 'tester';
      else r.type = null;
    }
  });
  const anyCross = recs.some(r => r.female && r.male && r.female !== r.male);
  recs.forEach(r => { if (!r.type) r.type = anyCross ? 'check' : 'entry'; });
  const empty = recs.filter(r => !r.entry);
  if (empty.length) issues.push({ level: 'warning', es: `${empty.length === 1 ? '1 fila sin entrada se omitió' : empty.length + ' filas sin entrada se omitieron'} (p. ej., fila ${empty[0].line}).`, en: `${empty.length === 1 ? '1 row without an entry was' : empty.length + ' rows without an entry were'} left out (e.g., row ${empty[0].line}).`, lines: empty.map(r => r.line) });
  const records = recs.filter(r => r.entry);
  const keep = records.map(r => r.i);
  traits.forEach(t => { t.y = Float64Array.from(keep, i => t.y[i]); t.missing = Array.prototype.filter.call(t.y, v => isNaN(v)).length; });
  records.forEach((r, k) => { r.k = k; });
  if (!traits.length) issues.push({ level: 'error', es: 'No hay ninguna variable respuesta: marque al menos una columna numérica como «Variable respuesta».', en: 'There is no response trait: mark at least one numeric column as "Response trait".' });
  return { records, traits, issues, roles: roles.slice(), header: table.header.slice(), meta: table.meta, splitUsed, byPedigree, setQualified, hasSet, separate, roleNames: Object.fromEntries(Data.ROLES.map(R => [R.key, table.header[roles.indexOf(R.key)]]).filter(x => x[1])) };
};

/* ================= recognition: mating design ================= */
const natSort = arr => arr.slice().sort(LM.natCmp);

Data.entryTable = ds => {
  const E = new Map();
  ds.records.forEach(r => {
    let e = E.get(r.entry);
    if (!e) E.set(r.entry, e = { name: r.entry, female: r.female, male: r.male, type: r.type, generation: r.generation, set: r.set, number: r.number, n: 0 });
    e.n++;
  });
  return [...E.values()];
};

function circulantPairs(order, s) {
  const p = order.length, k = (p + 1 - s) / 2, set = new Set();
  if (!Number.isInteger(k) || k < 1) return null;
  for (let i = 0; i < p; i++) for (let t = 0; t < s; t++) { const j = (i + k + t) % p; set.add(Math.min(i, j) + '|' + Math.max(i, j)); }
  return set;
}

Data.recognizeMating = (ds, ov) => {
  ov = ov || {};
  const entries = Data.entryTable(ds);
  const reasons = [];
  const say = (es, en) => reasons.push({ es, en });
  const out = { entries, reasons, checks: [], confidence: 'high' };
  const gens = entries.filter(e => e.generation);
  const nonCheck = entries.filter(e => e.type !== 'check' && e.type !== 'entry');
  if (ov.mating === 'generations' || (!ov.mating && gens.length >= 3 && gens.length >= 0.6 * entries.length)) {
    const present = Data.GEN_ORDER.filter(g => gens.some(e => e.generation === g));
    out.design = 'generations';
    out.generations = present;
    out.missing = ['P1', 'P2', 'F1', 'F2'].filter(g => !present.includes(g));
    say(`Las entradas son generaciones (${present.join(', ')}).`, `The entries are generations (${present.join(', ')}).`);
    out.checks = entries.filter(e => !e.generation).map(e => e.name);
    return out;
  }
  const crosses = entries.filter(e => e.female && e.male && e.female !== e.male && e.type !== 'check');
  out.checks = entries.filter(e => e.type === 'check').map(e => e.name);
  if (!crosses.length) {
    out.design = 'none';
    say('No hay cruzas con progenitores identificados: es un ensayo de genotipos (variedades, líneas o clones).', 'There are no crosses with known parents: it is a genotype trial (varieties, lines or clones).');
    return out;
  }
  const F = new Set(crosses.map(e => e.female)), M = new Set(crosses.map(e => e.male));
  const selfs = entries.filter(e => e.female && e.female === e.male && e.type !== 'check');
  const inter = [...F].filter(x => M.has(x)).length;
  const types = new Set(entries.map(e => e.type));
  const genName = s => /^(p1|p2|f1)$/.test(Data.norm(String(s).replace(/^S\d+·/, '').replace(/^[♀♂]/, '')));
  const hint = Data.norm((ds.roleNames && ds.roleNames.female) || '') + '|' + Data.norm((ds.roleNames && ds.roleNames.male) || '');
  let design = ov.mating || null;
  if (!design) {
    if (types.has('L1') || types.has('L2') || types.has('L3')) design = types.has('L3') ? 'ttc' : 'nc3';
    else if ((M.size <= 3 && [...M].every(genName) && F.size >= 4) || (F.size <= 3 && [...F].every(genName) && M.size >= 4)) design = Math.min(F.size, M.size) === 3 ? 'ttc' : 'nc3';
    else if (!ds.hasSet && (inter >= Math.max(2, 0.5 * Math.min(F.size, M.size)) || (selfs.length >= 3 && selfs.filter(e => F.has(e.female) || M.has(e.female)).length >= 3))) design = 'diallel';
    else {
      const malesOf = new Map(), femalesOf = new Map();
      crosses.forEach(e => {
        const fk = e.female;
        if (!malesOf.has(fk)) malesOf.set(fk, new Set()); malesOf.get(fk).add(e.male);
        if (!femalesOf.has(e.male)) femalesOf.set(e.male, new Set()); femalesOf.get(e.male).add(fk);
      });
      const nested = [...malesOf.values()].every(s => s.size === 1) && [...femalesOf.values()].every(s => s.size >= 2);
      if (nested) design = 'nc1';
      else if (types.has('line') || types.has('tester') || /line|linea/.test(hint) || /tester|probador/.test(hint) || (!ds.hasSet && M.size <= 5 && F.size >= 2 * M.size)) design = 'lxt';
      else design = 'nc2';
      if (design === 'nc2' && ds.setQualified) { out.confidence = 'medium'; say('Las hembras repiten códigos entre machos: si cada macho tiene sus propias hembras (Carolina del Norte I), cambie el diseño abajo.', 'Females repeat codes across males: if every male has its own females (North Carolina I), change the design below.'); }
    }
  }
  if (design === 'griffing' || design === 'partial') design = 'diallel';

  if (design === 'diallel') {
    const P = natSort([...new Set([...F, ...M, ...selfs.map(e => e.female)])]);
    const p = P.length, ix = new Map(P.map((x, i) => [x, i]));
    const ordered = new Set(crosses.map(e => ix.get(e.female) + '>' + ix.get(e.male)));
    const U = new Set(crosses.map(e => { const a = ix.get(e.female), b = ix.get(e.male); return Math.min(a, b) + '|' + Math.max(a, b); }));
    const recip = [...U].filter(k => { const [a, b] = k.split('|'); return ordered.has(a + '>' + b) && ordered.has(b + '>' + a); });
    const full = p * (p - 1) / 2;
    const selfSet = new Set(selfs.map(e => e.female));
    const hasSelfs = selfSet.size >= Math.ceil(p / 2);
    const hasRecips = recip.length >= Math.max(1, 0.5 * U.size);
    const counts = P.map((_, i) => [...U].filter(k => k.split('|').map(Number).includes(i)).length);
    let method = hasSelfs ? (hasRecips ? 1 : 2) : (hasRecips ? 3 : 4);
    if (ov.method) method = ov.method;
    out.parents = P; out.p = p; out.selfs = [...selfSet]; out.reciprocals = recip.length; out.pairs = U.size; out.counts = counts;
    out.method = method;
    out.missing = {
      pairs: U.size >= 0.5 * full ? [] : null,
      selfs: (method === 1 || method === 2) ? P.filter(x => !selfSet.has(x)) : [],
      recips: (method === 1 || method === 3) ? [...U].filter(k => !recip.includes(k)).map(k => { const [a, b] = k.split('|').map(Number); return P[b] + ' × ' + P[a]; }) : [],
    };
    const complete = U.size === full;
    const allEqual = counts.every(c => c === counts[0]);
    if (!complete && (U.size < 0.9 * full || ov.mating === 'partial')) {
      out.design = 'partial';
      out.s = allEqual ? counts[0] : null;
      out.balanced = allEqual;
      if (allEqual) {
        const want = circulantPairs(P.map((_, i) => i), counts[0]);
        out.circulant = !!want && want.size === U.size && [...U].every(k => want.has(k));
        if (out.circulant) out.k = (p + 1 - counts[0]) / 2;
      }
      say(out.circulant ? `Dialelo parcial circulante (Kempthorne y Curnow 1961): ${p} progenitores, cada uno en s = ${out.s} cruzas.` : allEqual ? `Dialelo parcial balanceado: cada progenitor entra en ${out.s} cruzas, pero no en el orden circulante; se analizará por mínimos cuadrados.` : `Dialelo incompleto y desbalanceado (${U.size} de ${full} cruzas); se analizará por mínimos cuadrados.`,
        out.circulant ? `Circulant partial diallel (Kempthorne & Curnow 1961): ${p} parents, each in s = ${out.s} crosses.` : allEqual ? `Balanced partial diallel: every parent enters ${out.s} crosses, but not in circulant order; it will be analysed by least squares.` : `Incomplete, unbalanced diallel (${U.size} of ${full} crosses); it will be analysed by least squares.`);
      if (!out.circulant) out.confidence = 'medium';
    } else {
      out.design = 'griffing';
      if (!complete) { out.missing.pairs = []; for (let a = 0; a < p; a++) for (let b = a + 1; b < p; b++) if (!U.has(a + '|' + b)) out.missing.pairs.push(P[a] + ' × ' + P[b]); }
      const what = { 1: ['progenitores, cruzas F₁ y recíprocas', 'parents, F₁ crosses and reciprocals'], 2: ['progenitores y cruzas F₁, sin recíprocas', 'parents and F₁ crosses, without reciprocals'], 3: ['cruzas F₁ y recíprocas, sin progenitores', 'F₁ crosses and reciprocals, without parents'], 4: ['solo cruzas F₁', 'F₁ crosses only'] }[method];
      say(`Dialelo con ${p} progenitores: ${what[0]} → método ${method} de Griffing (1956).`, `Diallel with ${p} parents: ${what[1]} → Griffing's (1956) Method ${method}.`);
      const miss = (out.missing.pairs || []).length + out.missing.selfs.length + out.missing.recips.length;
      if (miss) { out.confidence = 'medium'; say(`${miss === 1 ? 'Falta 1 entrada' : 'Faltan ' + miss + ' entradas'} del diseño completo; los efectos se estiman por mínimos cuadrados.`, `${miss} entr${miss === 1 ? 'y is' : 'ies are'} missing from the complete design; effects are estimated by least squares.`); }
    }
    /* entry types in the diallel */
    const typeOf = e => {
      if (e.type === 'check') return 'check';
      if (e.female === e.male) return 'parent';
      const a = ix.get(e.female), b = ix.get(e.male);
      if (a == null || b == null) return e.type;
      return ordered.has(b + '>' + a) && a > b ? 'reciprocal' : 'F1';
    };
    entries.forEach(e => { e.dtype = typeOf(e); });
    out.matrix = { rows: P, cols: P, rowTitle: { es: 'hembra', en: 'female' }, colTitle: { es: 'macho', en: 'male' }, key: (f, m) => f + '|' + m };
    if (out.checks.length) say(`Testigos u otras entradas fuera del dialelo: ${out.checks.slice(0, 6).join(', ')}${out.checks.length > 6 ? '…' : ''}.`, `Checks or other entries outside the diallel: ${out.checks.slice(0, 6).join(', ')}${out.checks.length > 6 ? '…' : ''}.`);
    return out;
  }

  out.design = design;
  if (design === 'nc3' || design === 'ttc') {
    const testersSide = F.size <= M.size ? F : M;
    const testers = natSort([...testersSide]), plants = natSort([...(testersSide === F ? M : F)]);
    out.testers = testers; out.plants = plants; out.testerIsFemale = testersSide === F;
    say(design === 'ttc' ? `Cruza triple de prueba: ${plants.length} individuos cruzados con ${testers.join(', ')}.` : `Carolina del Norte III: ${plants.length} plantas F₂ cruzadas con ${testers.join(' y ')}.`,
      design === 'ttc' ? `Triple test cross: ${plants.length} individuals crossed with ${testers.join(', ')}.` : `North Carolina III: ${plants.length} F₂ plants crossed with ${testers.join(' and ')}.`);
    out.matrix = { rows: plants, cols: testers, rowTitle: { es: 'planta F₂', en: 'F₂ plant' }, colTitle: { es: 'probador', en: 'tester' }, key: (a, b) => out.testerIsFemale ? b + '|' + a : a + '|' + b };
    if (plants.length < 20) { out.confidence = out.confidence === 'high' ? 'medium' : out.confidence; say(`Con ${plants.length} individuos las varianzas serán poco precisas (se recomiendan 20 o más).`, `With ${plants.length} individuals the variances will be imprecise (20 or more are recommended).`); }
    return out;
  }
  const females = natSort([...F]), males = natSort([...M]);
  out.females = females; out.males = males;
  const sets = ds.hasSet ? natSort([...new Set(ds.records.map(r => r.set))]) : [''];
  out.sets = sets.filter(Boolean);
  const cells = new Set(crosses.map(e => e.female + '|' + e.male));
  if (design === 'nc1') {
    say(`Carolina del Norte I: ${males.length} machos, cada uno con sus propias hembras (${(females.length / males.length).toFixed(1)} en promedio)${out.sets.length ? `, en ${out.sets.length} conjuntos` : ''}.`, `North Carolina I: ${males.length} males, each with its own females (${(females.length / males.length).toFixed(1)} on average)${out.sets.length ? `, in ${out.sets.length} sets` : ''}.`);
    out.matrix = { rows: males, cols: females, rowTitle: { es: 'macho', en: 'male' }, colTitle: { es: 'hembra', en: 'female' }, key: (m, f) => f + '|' + m };
  } else {
    /* factorial: completeness within each set */
    let expected = 0;
    sets.forEach(s => {
      const inSet = crosses.filter(e => !s || e.set === s);
      const fs = new Set(inSet.map(e => e.female)), ms = new Set(inSet.map(e => e.male));
      expected += fs.size * ms.size;
    });
    out.missingCells = expected - cells.size;
    if (design === 'lxt') {
      out.lines = females; out.testers = males;
      out.parentsEvaluated = entries.filter(e => (e.female && !e.male) || (!e.female && e.male) || (e.female && e.female === e.male && (F.has(e.female) || M.has(e.female)))).length;
      say(`Línea × probador: ${females.length} líneas × ${males.length} probadores${out.parentsEvaluated ? `, con ${out.parentsEvaluated} progenitores evaluados` : ''}.`, `Line × tester: ${females.length} lines × ${males.length} testers${out.parentsEvaluated ? `, with ${out.parentsEvaluated} parents evaluated` : ''}.`);
    } else say(`Carolina del Norte II (factorial): ${females.length} hembras × ${males.length} machos${out.sets.length ? ` en ${out.sets.length} conjuntos` : ''}.`, `North Carolina II (factorial): ${females.length} females × ${males.length} males${out.sets.length ? ` in ${out.sets.length} sets` : ''}.`);
    if (out.missingCells > 0) { out.confidence = 'medium'; say(`Faltan ${out.missingCells} cruzas del factorial.`, `${out.missingCells} crosses of the factorial are missing.`); }
    out.matrix = { rows: females, cols: males, rowTitle: { es: design === 'lxt' ? 'línea' : 'hembra', en: design === 'lxt' ? 'line' : 'female' }, colTitle: { es: design === 'lxt' ? 'probador' : 'macho', en: design === 'lxt' ? 'tester' : 'male' }, key: (f, m) => f + '|' + m };
  }
  return out;
};

/* ================= recognition: field design ================= */
Data.recognizeField = (ds, mating, ov) => {
  ov = ov || {};
  const byEnv = new Map();
  ds.records.forEach(r => { const k = r.env || ''; if (!byEnv.has(k)) byEnv.set(k, []); byEnv.get(k).push(r); });
  const checks = new Set(mating.checks || []);
  const hasRole = role => ds.roles.includes(role);
  const envs = [...byEnv.entries()].sort((a, b) => LM.natCmp(a[0], b[0])).map(([name, recs]) => {
    const E = { name: name || T('Única', 'Single'), key: name, n: recs.length, issues: [] };
    /* plots */
    const plotKey = r => hasRole('plot') && r.plot ? 'p' + r.plot : [r.rep, r.block, r.row, r.col, r.set, r.entry].join('|');
    const plots = new Map();
    recs.forEach(r => { const k = plotKey(r); if (!plots.has(k)) plots.set(k, { key: k, rep: r.rep, block: r.block, row: r.row, col: r.col, entry: r.entry, set: r.set, recs: [] }); plots.get(k).recs.push(r); });
    const multi = [...plots.values()].filter(p => p.recs.length > 1);
    E.plantLevel = hasRole('plant') || multi.length >= 0.5 * plots.size;
    E.plots = plots.size;
    if (!E.plantLevel && multi.length) E.issues.push({ level: 'warning', es: `${multi.length === 1 ? '1 parcela aparece' : multi.length + ' parcelas aparecen'} más de una vez (p. ej., filas ${multi[0].recs.map(r => r.line).slice(0, 3).join(', ')}); se promediarán.`, en: `${multi.length === 1 ? '1 plot appears' : multi.length + ' plots appear'} more than once (e.g., rows ${multi[0].recs.map(r => r.line).slice(0, 3).join(', ')}); ${multi.length === 1 ? 'it' : 'they'} will be averaged.`, lines: multi.flatMap(p => p.recs.map(r => r.line)) });
    const mixedPlot = [...plots.values()].filter(p => new Set(p.recs.map(r => r.entry)).size > 1);
    if (mixedPlot.length) E.issues.push({ level: 'error', es: `${mixedPlot.length === 1 ? '1 parcela tiene' : mixedPlot.length + ' parcelas tienen'} más de una entrada (p. ej., parcela ${mixedPlot[0].key.replace(/^p/, '')}).`, en: `${mixedPlot.length === 1 ? '1 plot holds' : mixedPlot.length + ' plots hold'} more than one entry (e.g., plot ${mixedPlot[0].key.replace(/^p/, '')}).`, lines: mixedPlot.flatMap(p => p.recs.map(r => r.line)) });
    const P = [...plots.values()];
    P.forEach(p => { p.repKey = p.rep ? (ds.hasSet ? p.set + '·' : '') + p.rep : ''; });
    const reps = natSort([...new Set(P.map(p => p.repKey).filter(Boolean))]);
    const blockKey = p => p.repKey + '|' + p.block;
    const blocks = hasRole('block') ? natSort([...new Set(P.filter(p => p.block).map(blockKey))]) : [];
    const entries = [...new Set(P.map(p => p.entry))];
    const entryPlots = new Map(); P.forEach(p => entryPlots.set(p.entry, (entryPlots.get(p.entry) || 0) + 1));
    E.entries = entries.length;
    E.reps = reps; E.blocks = blocks.length;
    E.hasRowCol = hasRole('row') && hasRole('col') && new Set(P.map(p => p.row)).size > 1 && new Set(P.map(p => p.col)).size > 1;
    const repsPerEntry = [...entryPlots.values()].sort((a, b) => a - b);
    E.medianReps = repsPerEntry[Math.floor(repsPerEntry.length / 2)] || 0;
    /* plants measured one by one, with no plots, replicates or blocks (a generation-means trial):
       every plant is an experimental unit, and the plants of an entry are its replicates */
    E.plantUnits = E.plantLevel && !reps.length && !hasRole('block') && !hasRole('plot') && E.medianReps < 2;
    if (E.plantUnits) {
      const per = new Map(); recs.forEach(r => per.set(r.entry, (per.get(r.entry) || 0) + 1));
      const sorted = [...per.values()].sort((a, b) => a - b);
      E.medianReps = sorted[Math.floor(sorted.length / 2)] || 0;
      E.plots = recs.length;
    }
    /* augmented pattern: a few entries in every group, the rest once */
    const augmentedIn = groups => {
      if (groups.length < 2) return null;
      const inAll = entries.filter(e => groups.every(g => g.some(p => p.entry === e)));
      const once = entries.filter(e => entryPlots.get(e) === 1);
      if (inAll.length >= 1 && inAll.length <= entries.length / 2 && once.length >= 0.5 * (entries.length - inAll.length) && once.length >= 2) return inAll;
      return null;
    };
    let design;
    if (reps.length >= 2) {
      const groups = reps.map(rp => P.filter(p => p.repKey === rp));
      const entriesOfSet = s => new Set(P.filter(p => p.set === s).map(p => p.entry)).size;
      const expected = groups.reduce((s, g) => s + (ds.hasSet ? entriesOfSet(g[0].set) : entries.length), 0);
      const cellsPresent = groups.reduce((s, g) => s + new Set(g.map(p => p.entry)).size, 0);
      const coverage = cellsPresent / expected;
      const aug = augmentedIn(groups);
      if (aug && coverage < 0.6) { design = 'augmented'; E.checks = aug; E.groupBy = 'rep'; }
      else {
        const bSizes = hasRole('block') ? blocks.map(b => P.filter(p => blockKey(p) === b).length) : [];
        const perRep = P.length / reps.length;
        E.perRep = perRep;
        if (blocks.length > reps.length && Math.max(...bSizes) < 0.75 * perRep) { design = 'alpha'; E.blockSize = Math.round(S.mean(bSizes)); }
        else design = 'rcbd';
        if (coverage < 0.999) E.issues.push({ level: 'info', es: `${expected - cellsPresent === 1 ? 'Falta 1 combinación' : 'Faltan ' + (expected - cellsPresent) + ' combinaciones'} repetición × entrada: el análisis usa mínimos cuadrados ajustados.`, en: `${expected - cellsPresent === 1 ? '1 replicate × entry combination is' : (expected - cellsPresent) + ' replicate × entry combinations are'} missing: the analysis uses adjusted least squares.` });
      }
    } else if (blocks.length >= 2) {
      const groups = blocks.map(b => P.filter(p => blockKey(p) === b));
      const full = groups.every(g => new Set(g.map(p => p.entry)).size === entries.length);
      const aug = augmentedIn(groups);
      if (full) { design = 'rcbd'; E.blockAsRep = true; E.reps = blocks.map(b => b.split('|')[1]); }
      else if (aug) { design = 'augmented'; E.checks = aug; E.groupBy = 'block'; }
      else if (E.medianReps >= 2) { design = 'ibd'; E.blockSize = Math.round(P.length / blocks.length); }
      else design = 'unreplicated';
    } else if (E.medianReps >= 2) design = 'crd';
    else design = E.plantLevel ? 'crd' : 'means';
    if (E.plantLevel && design === 'means') design = 'crd';
    E.design = ov.field || design;
    E.detected = design;
    if (design === 'means') E.issues.push({ level: 'info', es: 'Una observación por entrada: parecen medias. Para las pruebas F hace falta el cuadrado medio del error del experimento original (abajo).', en: 'One observation per entry: these look like means. F tests need the error mean square of the original experiment (below).' });
    if (design === 'unreplicated') E.issues.push({ level: 'warning', es: 'Las entradas no se repiten y no hay testigos repetidos: no se puede estimar el error experimental.', en: 'Entries are not replicated and there are no repeated checks: the experimental error cannot be estimated.' });
    return E;
  });
  const count = new Map(); envs.forEach(e => count.set(e.design, (count.get(e.design) || 0) + 1));
  const design = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return { envs, design, multiEnv: envs.length > 1, mixed: count.size > 1, plantLevel: envs.some(e => e.plantLevel), hasRowCol: envs.some(e => e.hasRowCol) };
};

Data.recognize = (ds, ov) => {
  const mating = Data.recognizeMating(ds, ov);
  const field = Data.recognizeField(ds, mating, ov);
  return { mating, field };
};

/* ================= descriptive summaries ================= */
Data.describe = values => {
  const x = Array.from(values).filter(v => isFinite(v));
  const n = x.length;
  if (!n) return { n: 0 };
  const mean = S.mean(x), sd = n > 1 ? S.sd(x) : NaN;
  return { n, mean, sd, cv: mean !== 0 ? 100 * sd / Math.abs(mean) : NaN, min: S.min(x), max: S.max(x), median: S.median(x), skew: n > 2 ? S.skewness(x) : NaN, kurt: n > 3 ? S.kurtosis(x) : NaN };
};

/* ================= reshaping ================= */
/* several value columns → one column plus a factor (e.g. R1…R6 → Replicate, Yield).
   Names like E1B2 or Loc1_Rep2 split into two factors. */
Data.reshapeLong = (table, valueCols, o) => {
  o = o || {};
  const idCols = table.header.map((_, j) => j).filter(j => !valueCols.includes(j));
  const names = valueCols.map(j => table.header[j]);
  const two = names.map(nm => nm.match(/^([A-Za-z]+)[\s_.-]*(\d+)[\s_.-]*([A-Za-z]+)[\s_.-]*(\d+)$/));
  const split = o.split !== false && two.every(Boolean) && new Set(two.map(m => m[1].toLowerCase())).size === 1 && new Set(two.map(m => m[3].toLowerCase())).size === 1;
  const oneNum = names.map(nm => { const m = nm.match(/^[A-Za-z_ .-]*?(\d+)$/); return m ? m[1] : nm; });
  const keyName = o.keyName || T('Repetición', 'Replicate');
  const header = idCols.map(j => table.header[j]);
  if (split) header.push(o.key1 || two[0][1], o.key2 || two[0][3]); else header.push(keyName);
  header.push(o.valueName || T('Valor', 'Value'));
  const rows = [], rowNumbers = [];
  table.rows.forEach((row, i) => valueCols.forEach((j, k) => {
    const r = idCols.map(c => row[c]);
    if (split) r.push(two[k][1] + two[k][2], two[k][4]); else r.push(oneNum[k]);
    r.push(row[j]);
    rows.push(r); rowNumbers.push(table.rowNumbers ? table.rowNumbers[i] : i + 2);
  }));
  return { header, rows, meta: table.meta, rowNumbers, reshaped: true };
};
/* a p × p diallel table (row parent in the first column, column parents in the header) → long */
Data.isDiallelMatrix = table => {
  if (table.header.length < 4) return false;
  const colNames = table.header.slice(1).map(String);
  const rowNames = table.rows.map(r => String(r[0]).trim());
  const shared = colNames.filter(c => rowNames.includes(c)).length;
  return shared >= 3 && shared >= 0.8 * colNames.length && table.rows.every(r => r.slice(1).every(v => Data.isMissing(v) || isFinite(Data.toNumber(v, Data.decimalOf([v])))));
};
Data.matrixToLong = (table, o) => {
  o = o || {};
  const header = [T('Hembra', 'Female'), T('Macho', 'Male'), o.valueName || T('Valor', 'Value')];
  const rows = [], rowNumbers = [];
  table.rows.forEach((r, i) => table.header.slice(1).forEach((c, j) => {
    if (Data.isMissing(r[j + 1])) return;
    rows.push([String(r[0]).trim(), c, r[j + 1]]); rowNumbers.push(table.rowNumbers ? table.rowNumbers[i] : i + 2);
  }));
  return { header, rows, meta: table.meta, rowNumbers, reshaped: true };
};

window.Data = Data;
