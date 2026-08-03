/**
 * Admin commands — platform admin (super_admin), org management, feature flags, coupons.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

// caas admin [stats|users|orgs|health|bootstrap|migrate|scaffold]
async function admin(client, args, json) {
  const sub = args[0] || 'stats';

  // Self-serve platform bootstrap + maintenance (no server exec needed)
  if (sub === 'bootstrap') {
    const result = await client.adminBootstrap();
    if (json) return console.log(JSON.stringify(result, null, 2));
    fmt.ok(result.message || 'Bootstrapped');
    if (result.data?.role) fmt.info(`${result.data.email} → ${result.data.role} (re-login to refresh token)`);
    return;
  }
  if (sub === 'migrate') {
    validateFlags(args.slice(1), ['force', 'dry-run'], 'caas admin migrate [--force] [--dry-run]');
    const body = {};
    if (getFlag(args, 'force')) body.force = true;
    if (getFlag(args, 'dry-run')) body.dryRun = true;
    const result = await client.adminMigrateCourses(body);
    if (json) return console.log(JSON.stringify(result, null, 2));
    fmt.ok(result.message || 'Migration completed');
    if (result.data?.output) console.log(result.data.output);
    return;
  }
  if (sub === 'scaffold') {
    const result = await client.adminScaffoldAccreditation();
    if (json) return console.log(JSON.stringify(result, null, 2));
    fmt.ok(result.message || 'Scaffold completed');
    if (result.data?.output) console.log(result.data.output);
    return;
  }

  let result;
  if (sub === 'users') result = await client.adminUsers();
  else if (sub === 'orgs' || sub === 'organizations') result = await client.adminOrgs();
  else if (sub === 'health') result = await client.adminHealth();
  else result = await client.adminStats();
  if (json) return console.log(JSON.stringify(result, null, 2));
  if (sub === 'users') {
    const rows = (result.data && (result.data.users || result.data)) || [];
    if (!Array.isArray(rows) || !rows.length) return fmt.info('No users.');
    fmt.heading('Users');
    rows.forEach(u => {
      const name = [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ');
      console.log(`  ${fmt.pad(u.email || '', 36)} ${fmt.pad(u.role || '', 14)} ${name}`);
    });
    return console.log(fmt.count(rows.length, 'user'));
  }
  if (sub === 'orgs' || sub === 'organizations') {
    const rows = (result.data && (result.data.organizations || result.data)) || [];
    if (!Array.isArray(rows) || !rows.length) return fmt.info('No organizations.');
    fmt.heading('Organizations');
    rows.forEach(o => {
      console.log(`  ${fmt.pad(`${fmt.C.orange}${o._id || ''}${fmt.C.reset}`, 40)} ${fmt.pad(o.name || '', 30)} ${fmt.C.gray}${o.customDomain || o.slug || ''}${fmt.C.reset}`);
    });
    return console.log(fmt.count(rows.length, 'organization'));
  }
  fmt.heading(sub === 'health' ? 'Platform Health' : 'Platform Stats');
  console.log(JSON.stringify(result.data, null, 2));
}

// caas org [--domain example.com]
async function org(client, args, json) {
  validateFlags(args, ['domain'], 'caas org [--domain example.com]');
  const domain = strFlag(args, 'domain');
  if (domain) {
    const result = await client.setOrgDomain({ domain });
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok(result.message || `Domain set to ${domain}`);
  }
  const result = await client.myOrg();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const o = (result.data && (result.data.organization || result.data)) || {};
  fmt.heading(o.name || 'Organization');
  if (o._id) console.log(fmt.row('ID', o._id));
  if (o.slug) console.log(fmt.row('Slug', o.slug));
  if (o.customDomain) console.log(fmt.row('Domain', o.customDomain));
  if (o.plan) console.log(fmt.row('Plan', o.plan));
}

// caas flags [set NAME --enabled true|false] [rm ID]
async function flags(client, args, json) {
  const sub = args[0];
  if (sub === 'create' || sub === 'set') {
    validateFlags(args.slice(1), ['enabled', 'd', 'description'], 'caas flags create NAME [--enabled true] [-d DESC]');
    const name = positionalArgs(args.slice(1))[0];
    if (!name) { fmt.err('Usage: caas flags create NAME [--enabled true]'); process.exit(1); }
    const data = { name, key: name, enabled: strFlag(args, 'enabled') !== 'false' };
    const desc = strFlag(args, 'description') || strFlag(args, 'd');
    if (desc) data.description = desc;
    const result = await client.createFeatureFlag(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Flag saved');
  }
  if (sub === 'update') {
    validateFlags(args.slice(1), ['enabled'], 'caas flags update ID --enabled true|false');
    const id = positionalArgs(args.slice(1))[0];
    const enabled = strFlag(args, 'enabled');
    if (!id || enabled == null) { fmt.err('Usage: caas flags update ID --enabled true|false'); process.exit(1); }
    const result = await client.updateFeatureFlag(id, { enabled: enabled !== 'false' });
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Flag updated');
  }
  if (sub === 'rm' || sub === 'delete') {
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas flags rm ID'); process.exit(1); }
    const result = await client.deleteFeatureFlag(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Flag deleted');
  }
  const result = await client.featureFlags();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.flags || result.data)) || [];
  if (!Array.isArray(rows) || !rows.length) return fmt.info('No feature flags.');
  fmt.heading('Feature Flags');
  rows.forEach(f => {
    const on = f.enabled ? `${fmt.C.green}on${fmt.C.reset}` : `${fmt.C.gray}off${fmt.C.reset}`;
    console.log(`  ${fmt.pad(f.name || f.key || '', 30)} ${fmt.pad(on, 12)} ${fmt.C.gray}${f._id || ''}${fmt.C.reset}`);
  });
}

// caas coupons [create CODE --percent 20 | rm ID | validate CODE]
async function coupons(client, args, json) {
  const sub = args[0];
  if (sub === 'create') {
    validateFlags(args.slice(1), ['percent', 'amount', 'currency', 'max-uses', 'expires'],
      'caas coupons create CODE --percent 20 | --amount CENTS');
    const code = positionalArgs(args.slice(1))[0];
    if (!code) { fmt.err('Usage: caas coupons create CODE --percent 20'); process.exit(1); }
    const data = { code };
    const percent = strFlag(args, 'percent');
    const amount = strFlag(args, 'amount');
    if (percent) { data.discountType = 'percent'; data.discountValue = Number(percent); }
    else if (amount) { data.discountType = 'amount'; data.discountValue = Number(amount); data.currency = strFlag(args, 'currency') || 'usd'; }
    else { fmt.err('Provide --percent N or --amount CENTS'); process.exit(1); }
    const maxUses = strFlag(args, 'max-uses');
    if (maxUses) data.maxUses = Number(maxUses);
    const expires = strFlag(args, 'expires');
    if (expires) data.expiresAt = expires;
    const result = await client.createCoupon(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok(`Coupon ${code} created`);
  }
  if (sub === 'rm' || sub === 'delete') {
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas coupons rm ID'); process.exit(1); }
    const result = await client.deleteCoupon(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Coupon deleted');
  }
  if (sub === 'validate') {
    validateFlags(args.slice(1), ['course'], 'caas coupons validate CODE [--course COURSE_ID]');
    const code = positionalArgs(args.slice(1))[0];
    if (!code) { fmt.err('Usage: caas coupons validate CODE'); process.exit(1); }
    const data = { code };
    const course = strFlag(args, 'course');
    if (course) data.courseId = course;
    const result = await client.validateCoupon(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok(result.message || 'Coupon valid');
  }
  const result = await client.coupons('');
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.coupons || result.data)) || [];
  if (!Array.isArray(rows) || !rows.length) return fmt.info('No coupons.');
  fmt.heading('Coupons');
  rows.forEach(c => {
    const disc = c.discountType === 'percent' ? `${c.discountValue}%` : `${((c.discountValue || 0) / 100).toFixed(2)}`;
    console.log(`  ${fmt.pad(c.code || '', 20)} ${fmt.pad(disc, 10)} ${fmt.C.gray}${c._id || ''}${fmt.C.reset}`);
  });
}

module.exports = { admin, org, flags, coupons };
