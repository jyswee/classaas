/**
 * Money commands — payments, revenue, Stripe Connect, payouts, analytics.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function money(cents, currency) {
  if (cents == null) return '?';
  return `${(cents / 100).toFixed(2)} ${(currency || 'usd').toUpperCase()}`;
}

// caas payments [--page N]
async function payments(client, args, json) {
  validateFlags(args, ['page', 'limit', 'status'], 'caas payments [--page N] [--status completed]');
  const params = [];
  ['page', 'limit', 'status'].forEach(f => {
    const v = getFlag(args, f);
    if (v && v !== true) params.push(`${f}=${encodeURIComponent(v)}`);
  });
  const result = await client.payments(params.join('&'));
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.payments || result.data)) || [];
  if (!Array.isArray(rows) || !rows.length) return fmt.info('No payments.');
  fmt.heading('Payments');
  rows.forEach(p => {
    const amt = fmt.pad(money(p.amount, p.currency), 14);
    const st = fmt.pad(p.status || '', 12);
    console.log(`  ${amt} ${st} ${fmt.pad(p.description || p.itemTitle || '', 40)} ${fmt.C.gray}${p.createdAt || ''}${fmt.C.reset}`);
  });
  console.log(fmt.count(rows.length, 'payment'));
}

// caas revenue [--from ISO --to ISO] — revenue analytics (defaults to last 30 days)
async function revenue(client, args, json) {
  validateFlags(args, ['from', 'to'], 'caas revenue [--from 2026-07-01] [--to 2026-08-01]');
  const from = getFlag(args, 'from');
  const to = getFlag(args, 'to');
  const end = (to && to !== true) ? to : new Date().toISOString().slice(0, 10);
  const start = (from && from !== true) ? from : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const result = await client.revenue(`startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const d = result.data || {};
  fmt.heading('Revenue');
  console.log(JSON.stringify(d, null, 2));
}

// caas connect [create|link] — Stripe Connect status/onboarding
async function connect(client, args, json) {
  const sub = args[0];
  if (sub === 'create') {
    const result = await client.connectCreate({});
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok(result.message || 'Connect account created');
  }
  if (sub === 'link') {
    const result = await client.connectLink();
    if (json) return console.log(JSON.stringify(result, null, 2));
    const d = result.data || {};
    fmt.ok('Onboarding link:');
    return console.log(`  ${d.url || d.link || JSON.stringify(d)}`);
  }
  const result = await client.connectStatus();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const d = result.data || {};
  fmt.heading('Stripe Connect');
  console.log(fmt.row('Connected', String(d.connected ?? d.hasAccount ?? false)));
  if (d.accountId) console.log(fmt.row('Account', d.accountId));
  if (d.chargesEnabled != null) console.log(fmt.row('Charges', String(d.chargesEnabled)));
  if (d.payoutsEnabled != null) console.log(fmt.row('Payouts', String(d.payoutsEnabled)));
  if (d.detailsSubmitted != null) console.log(fmt.row('Details', String(d.detailsSubmitted)));
}

// caas payouts [ID] [--pending] [--summary] [cancel ID]
async function payouts(client, args, json) {
  const sub = args[0];
  if (sub === 'cancel') {
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas payouts cancel PAYOUT_ID'); process.exit(1); }
    const result = await client.cancelPayout(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok(result.message || 'Payout cancelled');
  }
  validateFlags(args, ['pending', 'summary', 'page', 'limit'], 'caas payouts [ID] [--pending|--summary]');
  if (getFlag(args, 'pending')) {
    const result = await client.payoutsPending();
    if (json) return console.log(JSON.stringify(result, null, 2));
    return console.log(JSON.stringify(result.data, null, 2));
  }
  if (getFlag(args, 'summary')) {
    const result = await client.payoutsDashboard();
    if (json) return console.log(JSON.stringify(result, null, 2));
    return console.log(JSON.stringify(result.data, null, 2));
  }
  const id = positionalArgs(args)[0];
  if (id) {
    const result = await client.payout(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return console.log(JSON.stringify(result.data, null, 2));
  }
  const result = await client.payouts('');
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.payouts || result.data)) || [];
  if (!Array.isArray(rows) || !rows.length) return fmt.info('No payouts.');
  fmt.heading('Payouts');
  rows.forEach(p => {
    console.log(`  ${fmt.pad(`${fmt.C.orange}${p._id || ''}${fmt.C.reset}`, 40)} ${fmt.pad(money(p.amount, p.currency), 14)} ${fmt.pad(p.status || '', 12)} ${fmt.C.gray}${p.createdAt || ''}${fmt.C.reset}`);
  });
  console.log(fmt.count(rows.length, 'payout'));
}

// caas dashboard [--forecast|--customers|--payments]
async function dashboard(client, args, json) {
  validateFlags(args, ['forecast', 'customers', 'payments'], 'caas dashboard [--forecast|--customers|--payments]');
  let result;
  if (getFlag(args, 'forecast')) result = await client.revenueForecast();
  else if (getFlag(args, 'customers')) result = await client.customerAnalytics();
  else if (getFlag(args, 'payments')) result = await client.paymentAnalytics();
  else result = await client.dashboardSummary();
  if (json) return console.log(JSON.stringify(result, null, 2));
  fmt.heading('Dashboard');
  console.log(JSON.stringify(result.data, null, 2));
}

module.exports = { payments, revenue, connect, payouts, dashboard };
