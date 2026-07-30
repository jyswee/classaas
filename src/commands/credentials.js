/**
 * Accreditation credentials: mine + public verify.
 */
const fmt = require('../format');
const { positionalArgs, validateFlags } = require('../config');

async function mine(client, args, json) {
  validateFlags(args, [], 'caas creds');
  const result = await client.myCredentials();
  if (json) return console.log(JSON.stringify(result, null, 2));

  const creds = (result.data && result.data.credentials) || [];
  if (!creds.length) return fmt.info('No credentials yet.');

  fmt.heading('Credentials');
  creds.forEach(c => console.log(fmt.credLine(c)));
  console.log('');
  creds.forEach(c => {
    if (c.verifyPageUrl) fmt.info(`${c.credentialId} → ${client.baseUrl}${c.verifyPageUrl}`);
  });
  console.log(fmt.count(creds.length, 'credential'));
}

async function verify(client, args, json) {
  validateFlags(args, [], 'caas verify CODE');
  const code = positionalArgs(args)[0];
  if (!code) { fmt.err('Usage: caas verify CODE'); process.exit(1); }

  const result = await client.verifyCredential(code);
  if (json) return console.log(JSON.stringify(result, null, 2));

  const v = result.data || {};
  fmt.heading(v.title || 'Credential');
  console.log(fmt.row('Status', v.valid ? `${fmt.C.green}VERIFIED · VALID${fmt.C.reset}` : fmt.status(v.status || 'invalid')));
  console.log(fmt.row('Holder', v.holder || '--'));
  console.log(fmt.row('Kind', `${v.kind || '--'}${v.tier ? ' · ' + v.tier : ''}`));
  if (v.issuedAt) console.log(fmt.row('Issued', new Date(v.issuedAt).toLocaleDateString()));
  if (v.expiresAt) console.log(fmt.row('Valid until', new Date(v.expiresAt).toLocaleDateString()));
  if (v.credentialId) console.log(fmt.row('ID', `${fmt.C.dim}${v.credentialId}${fmt.C.reset}`));
}

module.exports = { mine, verify };
