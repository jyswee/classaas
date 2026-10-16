/**
 * Commerce commands — memberships, digital products, coaching.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

function priceStr(p) {
  if (!p) return 'free';
  if (typeof p === 'object') {
    if (p.type === 'free') return 'free';
    const amt = p.amount ?? p.price ?? 0;
    return `${((amt) / 100).toFixed(2)} ${p.currency || 'usd'}`;
  }
  return `${(p / 100).toFixed(2)}`;
}

function listRows(rows, label) {
  if (!rows.length) return fmt.info(`No ${label}.`);
  fmt.heading(label.charAt(0).toUpperCase() + label.slice(1));
  rows.forEach(x => {
    const id = fmt.pad(`${fmt.C.orange}${x._id || x.id || ''}${fmt.C.reset}`, 40);
    const price = priceStr(x.pricing || x.price);
    console.log(`${id} ${fmt.pad(x.title || x.name || '', 40)} ${fmt.C.gray}${price}${fmt.C.reset}`);
  });
  console.log(fmt.count(rows.length, label.replace(/s$/, '')));
}

// caas memberships [--mine|--public] | caas memberships create "Name" --price CENTS --interval month
async function memberships(client, args, json) {
  const sub = args[0];
  if (sub === 'create') {
    validateFlags(args.slice(1), ['price', 'currency', 'interval', 'd', 'description'],
      'caas memberships create "Name" --price CENTS --interval month [-d DESC]');
    const name = positionalArgs(args.slice(1)).join(' ').trim();
    const price = strFlag(args, 'price');
    if (!name || !price) { fmt.err('Usage: caas memberships create "Name" --price CENTS --interval month'); process.exit(1); }
    const data = {
      name,
      title: name,
      pricing: {
        amount: Number(price),
        currency: strFlag(args, 'currency') || 'usd',
        interval: strFlag(args, 'interval') || 'month',
      },
    };
    const desc = strFlag(args, 'description') || strFlag(args, 'd');
    if (desc) data.description = desc;
    const result = await client.createMembership(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const m = (result.data && (result.data.membership || result.data)) || {};
    return fmt.ok(`Membership created${m._id ? `: ${m._id}` : ''}`);
  }
  if (sub === 'subscribe') {
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas memberships subscribe MEMBERSHIP_ID'); process.exit(1); }
    const result = await client.subscribeMembership(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok(result.message || 'Subscribed');
  }
  if (sub === 'cancel') {
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas memberships cancel SUBSCRIPTION_ID'); process.exit(1); }
    const result = await client.cancelMembership(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok(result.message || 'Cancelled');
  }
  validateFlags(args, ['mine', 'public', 'page', 'limit'], 'caas memberships [--mine|--public]');
  let result;
  if (getFlag(args, 'mine')) result = await client.myMemberships();
  else if (getFlag(args, 'public')) result = await client.membershipsPublic();
  else result = await client.memberships('');
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.memberships || result.data.subscriptions || result.data)) || [];
  listRows(Array.isArray(rows) ? rows : [], 'memberships');
}

// caas products [--mine|--public] | caas products create "Name" --price CENTS [--file-url URL]
async function products(client, args, json) {
  const sub = args[0];
  if (sub === 'create') {
    validateFlags(args.slice(1), ['price', 'currency', 'd', 'description', 'file-url', 'type'],
      'caas products create "Name" --price CENTS [-d DESC] [--file-url URL]');
    const name = positionalArgs(args.slice(1)).join(' ').trim();
    const price = strFlag(args, 'price');
    if (!name || !price) { fmt.err('Usage: caas products create "Name" --price CENTS'); process.exit(1); }
    const data = {
      title: name,
      name,
      pricing: { amount: Number(price), currency: strFlag(args, 'currency') || 'usd' },
    };
    const desc = strFlag(args, 'description') || strFlag(args, 'd');
    if (desc) data.description = desc;
    const fileUrl = strFlag(args, 'file-url');
    if (fileUrl) data.fileUrl = fileUrl;
    const type = strFlag(args, 'type');
    if (type) data.type = type;
    const result = await client.createProduct(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const p = (result.data && (result.data.product || result.data)) || {};
    return fmt.ok(`Product created${p._id ? `: ${p._id}` : ''}`);
  }
  validateFlags(args, ['mine', 'public', 'page', 'limit'], 'caas products [--mine|--public]');
  let result;
  if (getFlag(args, 'mine')) result = await client.myProducts();
  else if (getFlag(args, 'public')) result = await client.productsPublic();
  else result = await client.products('');
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.products || result.data)) || [];
  listRows(Array.isArray(rows) ? rows : [], 'products');
}

// caas coaching [--mine|--public] | caas coaching create "Name" --price CENTS --duration MIN
async function coaching(client, args, json) {
  const sub = args[0];
  if (sub === 'create') {
    validateFlags(args.slice(1), ['price', 'currency', 'd', 'description', 'duration', 'sessions'],
      'caas coaching create "Name" --price CENTS [--duration MIN] [--sessions N]');
    const name = positionalArgs(args.slice(1)).join(' ').trim();
    const price = strFlag(args, 'price');
    if (!name || !price) { fmt.err('Usage: caas coaching create "Name" --price CENTS'); process.exit(1); }
    const data = {
      title: name,
      name,
      pricing: { amount: Number(price), currency: strFlag(args, 'currency') || 'usd' },
    };
    const desc = strFlag(args, 'description') || strFlag(args, 'd');
    if (desc) data.description = desc;
    const duration = strFlag(args, 'duration');
    if (duration) data.sessionDuration = Number(duration);
    const sessions = strFlag(args, 'sessions');
    if (sessions) data.sessionCount = Number(sessions);
    const result = await client.createCoaching(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const c = (result.data && (result.data.coaching || result.data.program || result.data)) || {};
    return fmt.ok(`Coaching program created${c._id ? `: ${c._id}` : ''}`);
  }
  validateFlags(args, ['mine', 'public', 'page', 'limit'], 'caas coaching [--mine|--public]');
  let result;
  if (getFlag(args, 'mine')) result = await client.myCoaching();
  else if (getFlag(args, 'public')) result = await client.coachingPublic();
  else result = await client.coaching('');
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.coaching || result.data.programs || result.data)) || [];
  listRows(Array.isArray(rows) ? rows : [], 'coaching programs');
}

// caas course-coupons | create CODE --percent N [--course ID[,ID]] [--max-uses N] [--expires YYYY-MM-DD]
//   | deactivate ID | rm ID | validate CODE --course ID
// Codes buyers type at course checkout. --course takes one id or a comma list
// (one code across a series); omit it and the code covers all your paid courses.
async function courseCoupons(client, args, json) {
  const sub = args[0];
  const rest = args.slice(1);
  const usage = 'caas course-coupons [create CODE --percent N | --amount CENTS [--course ID[,ID]] [--max-uses N] [--per-customer N] [--expires YYYY-MM-DD] [--name N] | update ID [--percent N] [--max-uses N] [--per-customer N] [--expires DATE] | deactivate ID | rm ID | validate CODE --course ID]';
  const out = (r, pretty) => { if (json) return console.log(JSON.stringify(r, null, 2)); if (!r.success) { fmt.err(r.message || 'Failed'); process.exit(1); } pretty(r); };

  if (sub === 'create') {
    validateFlags(rest, ['percent', 'amount', 'course', 'max-uses', 'per-customer', 'expires', 'name', 'currency'], usage);
    const code = positionalArgs(rest)[0];
    const percent = strFlag(rest, 'percent');
    const amount = strFlag(rest, 'amount');
    if (!code || (!percent && !amount)) { fmt.err(`Usage: ${usage}`); process.exit(1); }
    const data = {
      code,
      discountType: percent ? 'percentage' : 'fixed_amount',
      discountValue: Number(percent || amount)
    };
    const courses = (strFlag(rest, 'course') || '').split(',').map(s => s.trim()).filter(Boolean);
    if (courses.length === 1) data.courseId = courses[0];
    if (courses.length > 1) data.courseIds = courses;
    if (strFlag(rest, 'max-uses')) data.maxUses = Number(strFlag(rest, 'max-uses'));
    if (strFlag(rest, 'per-customer')) data.maxUsesPerCustomer = Number(strFlag(rest, 'per-customer'));
    if (strFlag(rest, 'name')) data.name = strFlag(rest, 'name');
    if (strFlag(rest, 'currency')) data.currency = strFlag(rest, 'currency');
    const expires = strFlag(rest, 'expires');
    if (expires) {
      const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(expires) ? `${expires}T23:59:59Z` : expires);
      if (isNaN(d)) { fmt.err('--expires must be a date, e.g. 2026-12-31'); process.exit(1); }
      data.validUntil = d.toISOString();
    }
    return out(await client.createCourseCoupon(data), (r) => fmt.ok(`Coupon ${r.data.code} created (${r.data._id})`));
  }
  if (sub === 'update') {
    validateFlags(rest, ['percent', 'max-uses', 'per-customer', 'expires', 'name'], usage);
    const id = positionalArgs(rest)[0];
    if (!id) { fmt.err('Usage: caas course-coupons update ID [--percent N] [--max-uses N] [--per-customer N] [--expires YYYY-MM-DD]'); process.exit(1); }
    const data = {};
    if (strFlag(rest, 'percent')) { data.discountType = 'percentage'; data.discountValue = Number(strFlag(rest, 'percent')); }
    if (strFlag(rest, 'max-uses')) data.maxUses = Number(strFlag(rest, 'max-uses'));
    if (strFlag(rest, 'per-customer')) data.maxUsesPerCustomer = Number(strFlag(rest, 'per-customer'));
    if (strFlag(rest, 'name')) data.name = strFlag(rest, 'name');
    const expires = strFlag(rest, 'expires');
    if (expires) {
      const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(expires) ? `${expires}T23:59:59Z` : expires);
      if (isNaN(d)) { fmt.err('--expires must be a date, e.g. 2026-12-31'); process.exit(1); }
      data.validUntil = d.toISOString();
    }
    if (!Object.keys(data).length) { fmt.err('Nothing to update.'); process.exit(1); }
    return out(await client.updateCourseCoupon(id, data), (r) => fmt.ok(`Coupon ${r.data?.code || id} updated`));
  }
  if (sub === 'deactivate') {
    const id = positionalArgs(rest)[0];
    if (!id) { fmt.err('Usage: caas course-coupons deactivate ID'); process.exit(1); }
    return out(await client.updateCourseCoupon(id, { isActive: false }), () => fmt.ok('Coupon deactivated'));
  }
  if (sub === 'rm') {
    const id = positionalArgs(rest)[0];
    if (!id) { fmt.err('Usage: caas course-coupons rm ID'); process.exit(1); }
    return out(await client.deleteCourseCoupon(id), (r) => fmt.ok(r.message || 'Coupon deleted'));
  }
  if (sub === 'validate') {
    validateFlags(rest, ['course'], usage);
    const code = positionalArgs(rest)[0];
    const courseId = strFlag(rest, 'course');
    if (!code || !courseId) { fmt.err('Usage: caas course-coupons validate CODE --course ID'); process.exit(1); }
    return out(await client.validateCourseCoupon({ code, courseId }), (r) => fmt.ok(JSON.stringify(r.data)));
  }
  if (sub && sub !== 'list') { fmt.err(`Usage: ${usage}`); process.exit(1); }
  return out(await client.courseCoupons(), (r) => {
    const list = Array.isArray(r.data) ? r.data : (r.data?.coupons || []);
    fmt.info(`Course coupons (${list.length})`);
    for (const c of list) {
      const off = c.discountType === 'percentage' ? `${c.discountValue}%` : `${c.discountValue}c`;
      const scope = c.courseIds?.length ? `${c.courseIds.length} courses` : (c.courseId ? `course ${c.courseId}` : 'all my courses');
      console.log(`  ${c.code}  ${off} off  ${scope}  uses ${c.currentUses || 0}/${c.maxUses || '∞'}  ${c.isActive ? 'active' : 'inactive'}  ${c._id}`);
    }
  });
}

module.exports = { memberships, products, coaching, courseCoupons };
