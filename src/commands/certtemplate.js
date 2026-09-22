/**
 * Certificate template — the creator's completion-certificate branding.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

const FIELD_FLAGS = {
  header: 'headerText',
  org: 'orgDisplayName',
  subtitle: 'subtitle',
  descriptor: 'descriptor',
  footer: 'footerNote',
  signature: 'instructorSignatureName',
  accent: 'accentHex',
  logo: 'logoUrl',
};
const USAGE = [
  'caas certtemplate                                  show my template',
  'caas certtemplate save [--header … --org … --subtitle … --descriptor …',
  '                        --footer … --signature … --accent #111 --logo URL]',
].join('\n  ');

async function run(client, args, json) {
  validateFlags(args, Object.keys(FIELD_FLAGS), USAGE);
  const pos = positionalArgs(args);

  if (pos[0] === 'save') {
    const data = {};
    for (const [flag, field] of Object.entries(FIELD_FLAGS)) {
      const v = strFlag(args, flag);
      if (v !== null) data[field] = v;
    }
    if (!Object.keys(data).length) { fmt.err('Provide at least one field.\n  ' + USAGE); process.exit(1); }
    const result = await client.saveCertificateTemplate(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Template saved');
  }

  const result = await client.certificateTemplate();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const t = result.data;
  if (!t) return fmt.info('No certificate template set — run: caas certtemplate save --header "…"');
  fmt.heading('Certificate Template');
  for (const field of Object.values(FIELD_FLAGS)) {
    if (t[field]) console.log(fmt.row(field, t[field]));
  }
}

module.exports = { run };
