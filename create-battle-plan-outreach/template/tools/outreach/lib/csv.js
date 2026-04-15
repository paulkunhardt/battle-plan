// Minimal RFC 4180 CSV reader/writer. No deps.
const fs = require('fs');

function parse(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else { cur += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else { cur += c; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].length));
}

function escape(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function readObjects(filePath) {
  if (!fs.existsSync(filePath)) return { headers: [], rows: [] };
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = parse(text);
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0];
  const objs = rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i] || ''; });
    return o;
  });
  return { headers, rows: objs };
}

function writeObjects(filePath, headers, objs) {
  const lines = [headers.join(',')];
  for (const o of objs) {
    lines.push(headers.map(h => escape(o[h])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

module.exports = { parse, escape, readObjects, writeObjects };
