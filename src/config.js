/**
 * Config loader — local-only project config.
 * Each project directory has .classaas/config.json with {"token": "...", "baseUrl": "..."}
 * Priority: 1. --token flag  2. CLASSAAS_TOKEN env  3. .classaas/config.json (local)
 */
const fs = require('fs');
const path = require('path');

const LOCAL_CONFIG_DIR = path.join(process.cwd(), '.classaas');
const LOCAL_CONFIG_FILE = path.join(LOCAL_CONFIG_DIR, 'config.json');

function loadFileConfig(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return {}; }
}

function loadConfig(args) {
  const tokenFlag = getFlag(args, 'token');
  // Base-URL override is --api-url (not --url; commands own --url).
  const urlFlag = getFlag(args, 'api-url');

  const localFile = loadFileConfig(LOCAL_CONFIG_FILE);

  const token = (tokenFlag && tokenFlag !== true ? tokenFlag : null)
    || process.env.CLASSAAS_TOKEN
    || localFile.token
    || null;

  const baseUrl = (urlFlag && urlFlag !== true ? urlFlag : null)
    || process.env.CLASSAAS_URL
    || localFile.baseUrl
    || 'https://classaas.com';

  let source = null;
  if (tokenFlag) source = 'flag';
  else if (process.env.CLASSAAS_TOKEN) source = 'env';
  else if (localFile.token) source = 'local';

  return { token, baseUrl, source };
}

function saveConfig(data) {
  if (!fs.existsSync(LOCAL_CONFIG_DIR)) fs.mkdirSync(LOCAL_CONFIG_DIR, { recursive: true });
  const existing = loadFileConfig(LOCAL_CONFIG_FILE);
  const merged = { ...existing, ...data };
  fs.writeFileSync(LOCAL_CONFIG_FILE, JSON.stringify(merged, null, 2));
  return LOCAL_CONFIG_FILE;
}

function clearConfig() {
  try { fs.unlinkSync(LOCAL_CONFIG_FILE); } catch {}
  return LOCAL_CONFIG_FILE;
}

function configInfo() {
  return {
    local: fs.existsSync(LOCAL_CONFIG_FILE) ? LOCAL_CONFIG_FILE : null,
  };
}

function getFlag(args, name) {
  const long = args.indexOf('--' + name);
  const short = name.length === 1 ? args.indexOf('-' + name) : -1;
  const idx = long !== -1 ? long : short;
  if (idx === -1) return null;
  const next = args[idx + 1];
  return (next && !next.startsWith('-')) ? next : true;
}

function hasFlag(args, name) {
  return args.includes('--' + name) || (name.length === 1 && args.includes('-' + name));
}

function positionalArgs(args) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('-')) {
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) i++;
    } else {
      result.push(args[i]);
    }
  }
  return result;
}

// Global flags valid on ALL commands
const GLOBAL_FLAGS = ['token', 'api-url', 'json', 'help', 'version'];

function validateFlags(args, allowedFlags, usage) {
  const fmt = require('./format');
  const allAllowed = new Set([...GLOBAL_FLAGS, ...allowedFlags]);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const name = arg.substring(2);
      if (!allAllowed.has(name)) {
        const suggestions = allowedFlags.length ? allowedFlags.map(f => '--' + f).join(', ') : '(none)';
        fmt.err(`Unknown flag: ${arg}`);
        fmt.info(`Valid flags: ${suggestions}`);
        if (usage) fmt.info(`Usage: ${usage}`);
        process.exit(1);
      }
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) i++;
    } else if (arg.startsWith('-') && arg.length === 2 && arg !== '-') {
      const short = arg.substring(1);
      if (!allAllowed.has(short)) {
        fmt.err(`Unknown flag: ${arg}`);
        if (usage) fmt.info(`Usage: ${usage}`);
        process.exit(1);
      }
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) i++;
    }
  }
}

module.exports = {
  loadConfig, saveConfig, clearConfig, configInfo,
  getFlag, hasFlag, positionalArgs, validateFlags,
  LOCAL_CONFIG_FILE,
};
