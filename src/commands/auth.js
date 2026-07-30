/**
 * Auth commands: login, logout, me, config.
 */
const fmt = require('../format');
const { saveConfig, clearConfig, configInfo, getFlag, validateFlags, LOCAL_CONFIG_FILE } = require('../config');
const apiMod = require('../api');

async function login(args, baseUrl) {
  validateFlags(args, ['email', 'password', 'url'], 'caas login --email E --password P [--url URL]');

  const url = getFlag(args, 'url');
  const effectiveUrl = (url && url !== true) ? url : baseUrl;

  // Direct token save: caas login --token TOKEN
  const token = getFlag(args, 'token');
  if (token && token !== true) {
    const data = { token };
    if (url && url !== true) data.baseUrl = url;
    const file = saveConfig(data);
    fmt.ok(`Token saved to ${file}`);
    return;
  }

  const email = getFlag(args, 'email');
  const password = getFlag(args, 'password');
  if (!email || email === true || !password || password === true) {
    fmt.err('Usage: caas login --email E --password P [--url URL]  (or --token TOKEN)');
    process.exit(1);
  }

  const result = await apiMod.login(effectiveUrl, { email, password });
  const jwt = result.data && result.data.token;
  if (!jwt) {
    fmt.err('Login succeeded but no token in response');
    process.exit(1);
  }
  const user = (result.data && result.data.user) || {};
  const data = { token: jwt, email: user.email || email };
  if (url && url !== true) data.baseUrl = url;
  const file = saveConfig(data);
  fmt.ok(`Logged in as ${user.email || email} (${user.role || 'unknown role'})`);
  fmt.info(`Token saved to ${file}`);
}

function logout() {
  const file = clearConfig();
  fmt.ok(`Logged out (removed ${file})`);
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch { return null; }
}

async function me(client, json, source) {
  let result;
  try {
    result = await client.me();
  } catch {
    // /auth/me may be session-based — fall back to local JWT decode
    const decoded = decodeJwt(client.token);
    if (!decoded) { fmt.err('Could not fetch or decode identity'); process.exit(1); }
    result = { success: true, message: 'Decoded from local JWT (API /auth/me unavailable)', data: { user: decoded } };
  }
  if (json) return console.log(JSON.stringify(result, null, 2));

  const u = (result.data && (result.data.user || result.data)) || {};
  fmt.heading('Identity');
  console.log(fmt.row('Email', u.email || '--'));
  console.log(fmt.row('Role', u.role || '--'));
  if (u.id || u.userId) console.log(fmt.row('User ID', u.id || u.userId));
  if (u.exp) console.log(fmt.row('Token exp', new Date(u.exp * 1000).toLocaleString()));
  console.log(fmt.row('API', client.baseUrl));
  if (source) {
    const labels = {
      flag: '--token flag',
      env: 'CLASSAAS_TOKEN environment variable',
      local: '.classaas/config.json (local project)',
    };
    fmt.info(`Config source: ${labels[source] || source}`);
  }
}

function config(json, args) {
  const info = configInfo();
  const { loadConfig } = require('../config');
  const cfg = loadConfig(args);
  if (json) {
    return console.log(JSON.stringify({
      localFile: info.local,
      baseUrl: cfg.baseUrl,
      hasToken: !!cfg.token,
      source: cfg.source,
    }, null, 2));
  }
  fmt.heading('Config');
  console.log(fmt.row('Local file', info.local || `${fmt.C.dim}(none — ${LOCAL_CONFIG_FILE})${fmt.C.reset}`));
  console.log(fmt.row('Base URL', cfg.baseUrl));
  console.log(fmt.row('Token', cfg.token ? `${fmt.C.green}set${fmt.C.reset} (${cfg.source})` : `${fmt.C.red}not set${fmt.C.reset}`));
}

module.exports = { login, logout, me, config };
