/**
 * Bundles: public list/show, my bundles, enroll.
 */
const fmt = require('../format');
const { positionalArgs, validateFlags, hasFlag } = require('../config');

async function list(client, args, json) {
  validateFlags(args, ['mine'], 'caas bundles [--mine]');
  const result = hasFlag(args, 'mine') ? await client.myBundles() : await client.bundlesPublic();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const bundles = (result.data && (result.data.bundles || result.data)) || [];
  if (!Array.isArray(bundles) || !bundles.length) return fmt.info('No bundles.');
  fmt.heading('Bundles');
  bundles.forEach(b => {
    const id = fmt.pad(`${fmt.C.orange}${b.slug || b.bundleId || ''}${fmt.C.reset}`, 40);
    const n = fmt.pad(`${fmt.C.gray}${(b.courseIds || b.courses || []).length} courses${fmt.C.reset}`, 14);
    console.log(`${id} ${n} ${b.title || ''}`);
  });
  console.log(fmt.count(bundles.length, 'bundle'));
}

async function run(client, args, json) {
  const sub = args[0];
  if (sub === 'enroll') {
    validateFlags(args, [], 'caas bundle enroll BUNDLE_ID');
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas bundle enroll BUNDLE_ID'); process.exit(1); }
    const result = await client.enrollBundle(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    fmt.ok(result.message || 'Enrolled in bundle');
    return;
  }

  validateFlags(args, [], 'caas bundle SLUG');
  const slug = positionalArgs(args)[0];
  if (!slug) { fmt.err('Usage: caas bundle SLUG | caas bundle enroll BUNDLE_ID'); process.exit(1); }
  const result = await client.bundlePublic(slug);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const b = (result.data && (result.data.bundle || result.data)) || {};
  fmt.heading(b.title || slug);
  if (b.bundleId) console.log(fmt.row('Bundle ID', `${fmt.C.orange}${b.bundleId}${fmt.C.reset}`));
  console.log(fmt.row('Slug', b.slug || slug));
  console.log(fmt.row('Courses', String((b.courseIds || b.courses || []).length)));
  if (b.description) {
    console.log('');
    console.log(`${fmt.C.dim}${fmt.truncate(b.description, 400)}${fmt.C.reset}`);
  }
}

module.exports = { list, run };
