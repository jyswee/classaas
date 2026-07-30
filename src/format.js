/**
 * Output formatting — git-style terminal output.
 * Clean columns, color-coded status, aligned padding.
 */

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

// ── Basic output ────────────────────────────────────────────

function ok(msg) { console.log(`${C.green}✓${C.reset} ${msg}`); }
function err(msg) { console.error(`${C.red}✗${C.reset} ${msg}`); }
function info(msg) { console.log(`${C.gray}${msg}${C.reset}`); }
function warn(msg) { console.log(`${C.yellow}⚠${C.reset} ${msg}`); }

// ── Badges ──────────────────────────────────────────────────

function status(s) {
  const badges = {
    published: `${C.green}published${C.reset}`,
    draft: `${C.yellow}draft${C.reset}`,
    archived: `${C.dim}archived${C.reset}`,
    active: `${C.green}active${C.reset}`,
    completed: `${C.green}completed${C.reset}`,
    'in-progress': `${C.blue}in-progress${C.reset}`,
    valid: `${C.green}valid${C.reset}`,
    revoked: `${C.red}revoked${C.reset}`,
    expired: `${C.dim}expired${C.reset}`,
  };
  return badges[s] || `${C.gray}${s || '--'}${C.reset}`;
}

function price(p) {
  if (!p || p.type === 'free' || !p.amount) return `${C.green}free${C.reset}`;
  const cur = (p.currency || 'USD').toUpperCase();
  return `${C.yellow}${cur} ${(p.amount / (p.amount > 999 ? 100 : 1)).toFixed ? p.amount : p.amount}${C.reset}`;
}

function tier(t) {
  if (!t) return '';
  return `${C.magenta}${t}${C.reset}`;
}

// ── Padded columns (git-style alignment) ────────────────────

function pad(str, len) {
  const stripped = String(str).replace(/\x1b\[[0-9;]*m/g, '');
  return str + ' '.repeat(Math.max(0, len - stripped.length));
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len - 1) + '…' : str;
}

// ── List lines (git log --oneline style) ────────────────────

function courseLine(c) {
  const cols = process.stdout.columns || 120;
  const slug = pad(`${C.orange}${truncate(c.slug || c.courseId || '', 44)}${C.reset}`, 46);
  const pr = pad(c.pricing && c.pricing.type === 'paid'
    ? `${C.yellow}${c.pricing.currency || 'USD'} ${c.pricing.amount}${C.reset}`
    : `${C.green}free${C.reset}`, 14);
  const title = truncate(c.title || '', Math.max(20, cols - 64));
  return `${slug} ${pr} ${title}`;
}

function credLine(cr) {
  const id = pad(`${C.orange}${cr.credentialId}${C.reset}`, 30);
  const kind = pad(`${C.cyan}${cr.kind}${C.reset}`, 22);
  const t = pad(tier(cr.tier || '--'), 8);
  const valid = cr.valid ? `${C.green}valid${C.reset}` : `${C.red}invalid${C.reset}`;
  return `${id} ${kind} ${t} ${pad(valid, 9)} ${cr.title || ''}`;
}

function cohortLine(co) {
  const id = pad(`${C.orange}${co.cohortId}${C.reset}`, 30);
  const st = pad(status(co.status), 14);
  const members = pad(`${C.gray}${(co.members || []).length} members${C.reset}`, 14);
  return `${id} ${st} ${members} ${co.name || ''}`;
}

// ── Detail rows ─────────────────────────────────────────────

function row(label, value) {
  return `  ${C.gray}${pad(label, 14)}${C.reset} ${value}`;
}

function heading(text) {
  console.log(`${C.bold}${text}${C.reset}`);
}

function count(n, singular) {
  const noun = n === 1 ? singular : singular + 's';
  return `${C.gray}${n} ${noun}${C.reset}`;
}

module.exports = {
  C, ok, err, info, warn,
  status, price, tier, pad, truncate,
  courseLine, credLine, cohortLine,
  row, heading, count,
};
