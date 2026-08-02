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

module.exports = { memberships, products, coaching };
