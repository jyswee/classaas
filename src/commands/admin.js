/**
 * Admin commands — full super_admin control surface.
 * Platform admin, impersonation, users/orgs, queues, students CRM, compliance,
 * affiliates, community moderation, SSO, theming, carts, org management,
 * feature flags, coupons. Mirrors the bgz-cli admin pattern (flat if-chain).
 */
const fs = require('fs');
const fmt = require('../format');
const { getFlag, hasFlag, positionalArgs, validateFlags, saveConfig, loadConfig, LOCAL_CONFIG_FILE } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

// Build a raw query string (api.js prepends the '?') from an object of flags.
function qs(pairs) {
  const parts = [];
  for (const [k, v] of Object.entries(pairs)) {
    if (v == null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join('&');
}

function readRawConfig() {
  try { return JSON.parse(fs.readFileSync(LOCAL_CONFIG_FILE, 'utf8')); } catch { return {}; }
}

// Destructive-verb gate. Returns true if allowed to proceed.
function confirmDestructive(args, label) {
  if (hasFlag(args, 'yes') || hasFlag(args, 'y')) return true;
  fmt.warn(`${label} is destructive. Re-run with --yes to confirm.`);
  return false;
}

function out(json, result, prettyFn) {
  if (json) { console.log(JSON.stringify(result, null, 2)); return true; }
  prettyFn();
  return true;
}

// caas admin <verb>
async function admin(client, args, json) {
  const sub = args[0] || 'stats';
  const rest = args.slice(1);
  const pos = positionalArgs(rest);

  // ── Maintenance / bootstrap ───────────────────────────────
  if (sub === 'bootstrap') {
    const result = await client.adminBootstrap();
    return out(json, result, () => {
      fmt.ok(result.message || 'Bootstrapped');
      if (result.data?.role) fmt.info(`${result.data.email} → ${result.data.role} (re-login to refresh token)`);
    });
  }
  if (sub === 'migrate') {
    validateFlags(rest, ['force', 'dry-run'], 'caas admin migrate [--force] [--dry-run]');
    const body = {};
    if (hasFlag(rest, 'force')) body.force = true;
    if (hasFlag(rest, 'dry-run')) body.dryRun = true;
    const result = await client.adminMigrateCourses(body);
    return out(json, result, () => {
      fmt.ok(result.message || 'Migration completed');
      if (result.data?.output) console.log(result.data.output);
    });
  }
  if (sub === 'scaffold') {
    const result = await client.adminScaffoldAccreditation();
    return out(json, result, () => {
      fmt.ok(result.message || 'Scaffold completed');
      if (result.data?.output) console.log(result.data.output);
    });
  }

  // ── Impersonation ─────────────────────────────────────────
  if (sub === 'impersonate') {
    if (pos[0] === 'stop' || hasFlag(rest, 'stop')) {
      const raw = readRawConfig();
      const targetUserId = raw.impersonating?.userId || null;
      // The /stop endpoint is super_admin-only and audits who stopped it, so it
      // must be called with the ORIGINAL admin token — not the impersonation
      // token the live client is holding. Fall back to the live client if we
      // have no backed-up admin token (best effort; restore always runs).
      let result = { success: true, message: 'Impersonation stopped' };
      try {
        const stopClient = raw.adminToken
          ? require('../api').api({ token: raw.adminToken, baseUrl: loadConfig([]).baseUrl })
          : client;
        result = await stopClient.adminImpersonateStop(targetUserId ? { targetUserId } : {});
      } catch (err) { result = { success: true, message: `Impersonation stopped (audit call: ${err.message})` }; }
      if (raw.adminToken) saveConfig({ token: raw.adminToken, adminToken: undefined, impersonating: undefined });
      return out(json, result, () => {
        fmt.ok('Impersonation stopped — restored super_admin token');
      });
    }
    const userId = pos[0];
    if (!userId) { fmt.err('Usage: caas admin impersonate USER_ID | stop'); process.exit(1); }
    const result = await client.adminImpersonate(userId);
    const token = result.data?.token;
    if (token) {
      const raw = readRawConfig();
      const adminToken = raw.adminToken || raw.token; // preserve the original super_admin token
      const u = result.data.user || {};
      saveConfig({ adminToken, token, impersonating: { userId, email: u.email, role: u.role } });
    }
    return out(json, result, () => {
      const u = result.data?.user || {};
      fmt.ok(`Now impersonating ${u.email || userId} (${u.role || '?'})`);
      fmt.info(`Token saved to ${LOCAL_CONFIG_FILE} — subsequent commands run as this user. 'caas admin impersonate stop' to restore.`);
    });
  }

  // ── Platform stats / revenue / usage ──────────────────────
  if (sub === 'revenue-trends') {
    validateFlags(rest, ['days', 'org'], 'caas admin revenue-trends [--days N] [--org ID]');
    const result = await client.adminRevenueTrends(qs({ days: strFlag(rest, 'days'), organizationId: strFlag(rest, 'org') }));
    return out(json, result, () => {
      fmt.heading('Revenue Trends');
      console.log(JSON.stringify(result.data, null, 2));
    });
  }
  if (sub === 'usage') {
    validateFlags(rest, ['org'], 'caas admin usage [--org ID]');
    const result = await client.adminUsage(qs({ organizationId: strFlag(rest, 'org') }));
    return out(json, result, () => {
      fmt.heading('Usage');
      console.log(JSON.stringify(result.data, null, 2));
    });
  }
  if (sub === 'usage-refresh') {
    if (!pos[0]) { fmt.err('Usage: caas admin usage-refresh ORG_ID'); process.exit(1); }
    const result = await client.adminUsageRefresh(pos[0]);
    return out(json, result, () => fmt.ok(result.message || 'Usage refreshed'));
  }

  // ── Users / orgs enumeration ──────────────────────────────
  if (sub === 'users') {
    validateFlags(rest, ['role', 'q', 'page', 'limit'], 'caas admin users [--role R] [--q S] [--page N]');
    const result = await client.adminUsers(qs({ role: strFlag(rest, 'role'), q: strFlag(rest, 'q'), page: strFlag(rest, 'page'), limit: strFlag(rest, 'limit') }));
    return out(json, result, () => {
      const rows = (result.data && (result.data.users || result.data)) || [];
      if (!Array.isArray(rows) || !rows.length) return fmt.info('No users.');
      fmt.heading('Users');
      rows.forEach(u => {
        const name = [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ');
        console.log(`  ${fmt.pad(`${fmt.C.orange}${u._id || ''}${fmt.C.reset}`, 40)} ${fmt.pad(u.email || '', 34)} ${fmt.pad(u.role || '', 14)} ${name}`);
      });
      console.log(fmt.count(rows.length, 'user'));
    });
  }
  if (sub === 'orgs' || sub === 'organizations') {
    validateFlags(rest, ['q', 'page', 'limit'], 'caas admin orgs [--q S] [--page N]');
    const result = await client.adminOrgs(qs({ q: strFlag(rest, 'q'), page: strFlag(rest, 'page'), limit: strFlag(rest, 'limit') }));
    return out(json, result, () => {
      const rows = (result.data && (result.data.organizations || result.data)) || [];
      if (!Array.isArray(rows) || !rows.length) return fmt.info('No organizations.');
      fmt.heading('Organizations');
      rows.forEach(o => {
        console.log(`  ${fmt.pad(`${fmt.C.orange}${o._id || ''}${fmt.C.reset}`, 40)} ${fmt.pad(o.name || '', 30)} ${fmt.C.gray}${o.customDomain || o.slug || ''}${fmt.C.reset}`);
      });
      console.log(fmt.count(rows.length, 'organization'));
    });
  }

  // ── Health / email deliverability ─────────────────────────
  if (sub === 'health') {
    const result = await client.adminHealth();
    return out(json, result, () => { fmt.heading('Platform Health'); console.log(JSON.stringify(result.data, null, 2)); });
  }
  if (sub === 'email-deliverability') {
    const result = await client.adminEmailDeliverability();
    return out(json, result, () => { fmt.heading('Email Deliverability'); console.log(JSON.stringify(result.data, null, 2)); });
  }

  // ── Queues ────────────────────────────────────────────────
  if (sub === 'queues') {
    const result = await client.adminQueues();
    return out(json, result, () => {
      const rows = (result.data && (result.data.queues || result.data)) || [];
      if (!Array.isArray(rows) || !rows.length) return fmt.info('No queues.');
      fmt.heading('Queues');
      rows.forEach(qq => {
        console.log(`  ${fmt.pad(qq.name || '', 28)} ${fmt.C.gray}waiting ${qq.waiting ?? '?'}  active ${qq.active ?? '?'}  failed ${qq.failed ?? '?'}  completed ${qq.completed ?? '?'}${fmt.C.reset}`);
      });
    });
  }
  if (sub === 'queue-jobs') {
    validateFlags(rest, ['state'], 'caas admin queue-jobs NAME [--state S]');
    if (!pos[0]) { fmt.err('Usage: caas admin queue-jobs NAME [--state failed]'); process.exit(1); }
    const result = await client.adminQueueJobs(pos[0], qs({ state: strFlag(rest, 'state') }));
    return out(json, result, () => { fmt.heading(`Queue: ${pos[0]}`); console.log(JSON.stringify(result.data, null, 2)); });
  }
  if (sub === 'queue-retry') {
    if (!pos[0]) { fmt.err('Usage: caas admin queue-retry NAME'); process.exit(1); }
    const result = await client.adminQueueRetry(pos[0]);
    return out(json, result, () => fmt.ok(result.message || `Retried failed jobs in ${pos[0]}`));
  }
  if (sub === 'queue-drain') {
    if (!pos[0]) { fmt.err('Usage: caas admin queue-drain NAME --yes'); process.exit(1); }
    if (!confirmDestructive(rest, `Draining queue "${pos[0]}"`)) process.exit(1);
    const result = await client.adminQueueDrain(pos[0]);
    return out(json, result, () => fmt.ok(result.message || `Drained queue ${pos[0]}`));
  }

  // ── Student CRM ───────────────────────────────────────────
  if (sub === 'students') {
    validateFlags(rest, ['q', 'page', 'limit', 'tag'], 'caas admin students [--q S] [--page N]');
    const result = await client.adminStudents(qs({ q: strFlag(rest, 'q'), page: strFlag(rest, 'page'), limit: strFlag(rest, 'limit'), tag: strFlag(rest, 'tag') }));
    return out(json, result, () => {
      const rows = (result.data && (result.data.students || result.data)) || [];
      if (!Array.isArray(rows) || !rows.length) return fmt.info('No students.');
      fmt.heading('Students');
      rows.forEach(s => {
        const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ');
        console.log(`  ${fmt.pad(`${fmt.C.orange}${s.userId || s._id || ''}${fmt.C.reset}`, 40)} ${fmt.pad(s.email || '', 34)} ${name}`);
      });
      console.log(fmt.count(rows.length, 'student'));
    });
  }
  if (sub === 'student') {
    if (!pos[0]) { fmt.err('Usage: caas admin student USER_ID'); process.exit(1); }
    const result = await client.adminStudent(pos[0]);
    return out(json, result, () => { fmt.heading(`Student ${pos[0]}`); console.log(JSON.stringify(result.data, null, 2)); });
  }
  if (sub === 'student-tag') {
    validateFlags(rest, ['tags'], 'caas admin student-tag USER_ID --tags a,b');
    const tags = strFlag(rest, 'tags');
    if (!pos[0] || !tags) { fmt.err('Usage: caas admin student-tag USER_ID --tags a,b'); process.exit(1); }
    const result = await client.adminStudentTags(pos[0], { tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
    return out(json, result, () => fmt.ok(result.message || 'Tags updated'));
  }
  if (sub === 'student-note') {
    validateFlags(rest, ['m', 'message'], 'caas admin student-note USER_ID -m "note"');
    const note = strFlag(rest, 'm') || strFlag(rest, 'message');
    if (!pos[0] || !note) { fmt.err('Usage: caas admin student-note USER_ID -m "note"'); process.exit(1); }
    const result = await client.adminStudentNote(pos[0], { note });
    return out(json, result, () => fmt.ok(result.message || 'Note added'));
  }
  if (sub === 'students-export') {
    validateFlags(rest, ['format'], 'caas admin students-export [--format csv]');
    const result = await client.adminStudentsExport(qs({ format: strFlag(rest, 'format') }));
    return out(json, result, () => {
      if (typeof result === 'string') return console.log(result);
      if (result.data) console.log(typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2));
      else console.log(JSON.stringify(result, null, 2));
    });
  }

  // ── Organization management ───────────────────────────────
  if (sub === 'org') {
    validateFlags(rest, ['id'], 'caas admin org [--id ORG_ID]');
    const result = await client.myOrgById(qs({ id: strFlag(rest, 'id') }));
    return out(json, result, () => {
      const o = (result.data && (result.data.organization || result.data)) || {};
      fmt.heading(o.name || 'Organization');
      if (o._id) console.log(fmt.row('ID', o._id));
      if (o.slug) console.log(fmt.row('Slug', o.slug));
      if (o.customDomain) console.log(fmt.row('Domain', o.customDomain));
      if (o.plan) console.log(fmt.row('Plan', o.plan));
    });
  }
  if (sub === 'org-domain') {
    validateFlags(rest, ['domain', 'id'], 'caas admin org-domain --domain example.com');
    const domain = strFlag(rest, 'domain');
    if (!domain) { fmt.err('Usage: caas admin org-domain --domain example.com'); process.exit(1); }
    const result = await client.setOrgDomain({ domain });
    return out(json, result, () => fmt.ok(result.message || `Domain set to ${domain}`));
  }
  if (sub === 'org-domain-verify') {
    validateFlags(rest, ['id'], 'caas admin org-domain-verify [--id ORG_ID]');
    const result = await client.verifyOrgDomain(strFlag(rest, 'id') ? { organizationId: strFlag(rest, 'id') } : {});
    return out(json, result, () => fmt.ok(result.message || 'Domain verification triggered'));
  }
  if (sub === 'org-permissions') {
    const result = await client.orgRolePermissions();
    return out(json, result, () => { fmt.heading('Role Permissions'); console.log(JSON.stringify(result.data, null, 2)); });
  }
  if (sub === 'org-permissions-set') {
    validateFlags(rest, ['config'], 'caas admin org-permissions-set --config \'{"host":[...]}\'');
    const cfg = strFlag(rest, 'config');
    if (!cfg) { fmt.err('Usage: caas admin org-permissions-set --config JSON'); process.exit(1); }
    let body; try { body = JSON.parse(cfg); } catch { fmt.err('--config must be valid JSON'); process.exit(1); }
    const result = await client.setOrgRolePermissions(body);
    return out(json, result, () => fmt.ok(result.message || 'Permissions updated'));
  }
  if (sub === 'org-payouts') {
    validateFlags(rest, ['org'], 'caas admin org-payouts [--org ORG_ID]');
    const result = await client.orgPayoutsConsolidated(qs({ organizationId: strFlag(rest, 'org') }));
    return out(json, result, () => { fmt.heading('Consolidated Payouts'); console.log(JSON.stringify(result.data, null, 2)); });
  }
  if (sub === 'org-payouts-run') {
    validateFlags(rest, ['org', 'yes', 'y'], 'caas admin org-payouts-run --org ORG_ID --yes');
    if (!confirmDestructive(rest, 'Running consolidated payouts')) process.exit(1);
    const org = strFlag(rest, 'org');
    const result = await client.runOrgPayoutsConsolidated(org ? { organizationId: org } : {});
    return out(json, result, () => fmt.ok(result.message || 'Payout run started'));
  }

  // ── Compliance + audit ────────────────────────────────────
  if (sub === 'audit') {
    validateFlags(rest, ['q', 'page', 'limit', 'action'], 'caas admin audit [--q S] [--page N]');
    const result = await client.auditTrail(qs({ q: strFlag(rest, 'q'), action: strFlag(rest, 'action'), page: strFlag(rest, 'page'), limit: strFlag(rest, 'limit') }));
    return out(json, result, () => {
      const rows = (result.data && (result.data.entries || result.data.logs || result.data)) || [];
      if (!Array.isArray(rows) || !rows.length) return fmt.info('No audit entries.');
      fmt.heading('Audit Trail');
      rows.forEach(a => {
        const when = (a.createdAt || a.timestamp || '').toString().slice(0, 19).replace('T', ' ');
        console.log(`  ${fmt.pad(`${fmt.C.gray}${when}${fmt.C.reset}`, 30)} ${fmt.pad(a.action || '', 28)} ${fmt.C.gray}${a.userEmail || a.userId || ''}${fmt.C.reset}`);
      });
      console.log(fmt.count(rows.length, 'entry'));
    });
  }
  if (sub === 'security-assessment') {
    const result = await client.securityAssessment();
    return out(json, result, () => { fmt.heading('Security Assessment'); console.log(JSON.stringify(result.data, null, 2)); });
  }
  if (sub === 'compliance-dashboard') {
    const result = await client.complianceDashboard();
    return out(json, result, () => { fmt.heading('Compliance Dashboard'); console.log(JSON.stringify(result.data, null, 2)); });
  }
  if (sub === 'compliance-report') {
    validateFlags(rest, ['config'], 'caas admin compliance-report --config JSON');
    const cfg = strFlag(rest, 'config');
    let body = {}; if (cfg) { try { body = JSON.parse(cfg); } catch { fmt.err('--config must be valid JSON'); process.exit(1); } }
    const result = await client.complianceReport(body);
    return out(json, result, () => fmt.ok(result.message || 'Compliance report generated'));
  }

  // ── Affiliates ────────────────────────────────────────────
  if (sub === 'affiliates') {
    const result = await client.affiliates();
    return out(json, result, () => {
      const rows = (result.data && (result.data.affiliates || result.data)) || [];
      if (!Array.isArray(rows) || !rows.length) return fmt.info('No affiliates.');
      fmt.heading('Affiliates');
      rows.forEach(a => {
        console.log(`  ${fmt.pad(`${fmt.C.orange}${a._id || ''}${fmt.C.reset}`, 40)} ${fmt.pad(a.status || '', 12)} ${fmt.pad((a.commissionRate != null ? a.commissionRate + '%' : ''), 8)} ${fmt.C.gray}${a.email || a.userId || ''}${fmt.C.reset}`);
      });
      console.log(fmt.count(rows.length, 'affiliate'));
    });
  }
  if (sub === 'affiliate-approve') {
    if (!pos[0]) { fmt.err('Usage: caas admin affiliate-approve ID'); process.exit(1); }
    const result = await client.approveAffiliate(pos[0]);
    return out(json, result, () => fmt.ok(result.message || 'Affiliate approved'));
  }
  if (sub === 'affiliate-suspend') {
    if (!pos[0]) { fmt.err('Usage: caas admin affiliate-suspend ID'); process.exit(1); }
    const result = await client.suspendAffiliate(pos[0]);
    return out(json, result, () => fmt.ok(result.message || 'Affiliate suspended'));
  }
  if (sub === 'affiliate-rate') {
    validateFlags(rest, ['rate'], 'caas admin affiliate-rate ID --rate N');
    const rate = strFlag(rest, 'rate');
    if (!pos[0] || rate == null) { fmt.err('Usage: caas admin affiliate-rate ID --rate 20'); process.exit(1); }
    const result = await client.setAffiliateRate(pos[0], { commissionRate: Number(rate) });
    return out(json, result, () => fmt.ok(result.message || 'Commission rate updated'));
  }
  if (sub === 'affiliates-stats') {
    const result = await client.affiliatesStats();
    return out(json, result, () => { fmt.heading('Affiliate Stats'); console.log(JSON.stringify(result.data, null, 2)); });
  }

  // ── Community moderation + instructor grant ───────────────
  if (sub === 'community-category') {
    validateFlags(rest, ['name', 'description', 'config'], 'caas admin community-category create|update|delete ...');
    const action = pos[0];
    if (action === 'create') {
      const name = strFlag(rest, 'name');
      if (!name) { fmt.err('Usage: caas admin community-category create --name NAME'); process.exit(1); }
      const body = { name }; const d = strFlag(rest, 'description'); if (d) body.description = d;
      const result = await client.createCommunityCategory(body);
      return out(json, result, () => fmt.ok(result.message || 'Category created'));
    }
    if (action === 'update') {
      const id = pos[1]; if (!id) { fmt.err('Usage: caas admin community-category update ID --name NAME'); process.exit(1); }
      const body = {}; const n = strFlag(rest, 'name'); const d = strFlag(rest, 'description');
      if (n) body.name = n; if (d) body.description = d;
      const result = await client.updateCommunityCategory(id, body);
      return out(json, result, () => fmt.ok(result.message || 'Category updated'));
    }
    if (action === 'delete') {
      const id = pos[1]; if (!id) { fmt.err('Usage: caas admin community-category delete ID --yes'); process.exit(1); }
      if (!confirmDestructive(rest, `Deleting category "${id}"`)) process.exit(1);
      const result = await client.deleteCommunityCategory(id);
      return out(json, result, () => fmt.ok(result.message || 'Category deleted'));
    }
    fmt.err('Usage: caas admin community-category create|update|delete'); process.exit(1);
  }
  if (sub === 'post-pin') {
    if (!pos[0]) { fmt.err('Usage: caas admin post-pin POST_ID'); process.exit(1); }
    const result = await client.pinCommunityPost(pos[0]);
    return out(json, result, () => fmt.ok(result.message || 'Post pin toggled'));
  }
  if (sub === 'post-lock') {
    if (!pos[0]) { fmt.err('Usage: caas admin post-lock POST_ID'); process.exit(1); }
    const result = await client.lockCommunityPost(pos[0]);
    return out(json, result, () => fmt.ok(result.message || 'Post lock toggled'));
  }
  if (sub === 'instructor-grant') {
    validateFlags(rest, ['user', 'streams'], 'caas admin instructor-grant --user USER_ID --streams a,b');
    const user = strFlag(rest, 'user');
    const streams = strFlag(rest, 'streams');
    if (!user) { fmt.err('Usage: caas admin instructor-grant --user USER_ID --streams a,b'); process.exit(1); }
    const body = { userId: user };
    if (streams) body.streams = streams.split(',').map(s => s.trim()).filter(Boolean);
    const result = await client.grantInstructor(body);
    return out(json, result, () => fmt.ok(result.message || 'Instructor access granted'));
  }

  // ── SSO ───────────────────────────────────────────────────
  if (sub === 'sso') {
    validateFlags(rest, ['config', 'yes', 'y'], 'caas admin sso get|set|test|disable');
    const action = pos[0] || 'get';
    if (action === 'get') {
      const result = await client.ssoConfig();
      return out(json, result, () => { fmt.heading('SSO Config'); console.log(JSON.stringify(result.data, null, 2)); });
    }
    if (action === 'set') {
      const cfg = strFlag(rest, 'config');
      if (!cfg) { fmt.err('Usage: caas admin sso set --config JSON'); process.exit(1); }
      let body; try { body = JSON.parse(cfg); } catch { fmt.err('--config must be valid JSON'); process.exit(1); }
      const result = await client.setSsoConfig(body);
      return out(json, result, () => fmt.ok(result.message || 'SSO config saved'));
    }
    if (action === 'test') {
      const cfg = strFlag(rest, 'config');
      let body = {}; if (cfg) { try { body = JSON.parse(cfg); } catch { fmt.err('--config must be valid JSON'); process.exit(1); } }
      const result = await client.testSsoConfig(body);
      return out(json, result, () => { fmt.heading('SSO Test'); console.log(JSON.stringify(result.data, null, 2)); });
    }
    if (action === 'disable') {
      if (!confirmDestructive(rest, 'Disabling SSO')) process.exit(1);
      const result = await client.disableSso();
      return out(json, result, () => fmt.ok(result.message || 'SSO disabled'));
    }
    fmt.err('Usage: caas admin sso get|set|test|disable'); process.exit(1);
  }
  if (sub === 'sso-users') {
    const result = await client.ssoUsers();
    return out(json, result, () => {
      const rows = (result.data && (result.data.users || result.data)) || [];
      if (!Array.isArray(rows) || !rows.length) return fmt.info('No SSO users.');
      fmt.heading('SSO Users');
      rows.forEach(u => console.log(`  ${fmt.pad(u.email || '', 36)} ${fmt.C.gray}${u.externalId || u._id || ''}${fmt.C.reset}`));
      console.log(fmt.count(rows.length, 'user'));
    });
  }

  // ── Theming custom CSS ────────────────────────────────────
  if (sub === 'css') {
    validateFlags(rest, ['org', 'file', 'css', 'index', 'yes', 'y'], 'caas admin css get|set|rm|history|restore --org ORG_ID');
    const action = pos[0] || 'get';
    const org = strFlag(rest, 'org') || pos[1];
    if (!org) { fmt.err('caas admin css requires --org ORG_ID'); process.exit(1); }
    if (action === 'get') {
      const result = await client.customCss(org);
      return out(json, result, () => { fmt.heading('Custom CSS'); console.log(result.data?.css ?? JSON.stringify(result.data, null, 2)); });
    }
    if (action === 'set') {
      const file = strFlag(rest, 'file');
      let css = strFlag(rest, 'css');
      if (file) { try { css = fs.readFileSync(file, 'utf8'); } catch { fmt.err(`Cannot read ${file}`); process.exit(1); } }
      if (css == null) { fmt.err('Usage: caas admin css set --org ID --file style.css | --css "..."'); process.exit(1); }
      const result = await client.setCustomCss(org, { css });
      return out(json, result, () => fmt.ok(result.message || 'Custom CSS saved'));
    }
    if (action === 'rm' || action === 'delete') {
      if (!confirmDestructive(rest, `Removing custom CSS for ${org}`)) process.exit(1);
      const result = await client.deleteCustomCss(org);
      return out(json, result, () => fmt.ok(result.message || 'Custom CSS removed'));
    }
    if (action === 'history') {
      const result = await client.customCssHistory(org);
      return out(json, result, () => { fmt.heading('CSS History'); console.log(JSON.stringify(result.data, null, 2)); });
    }
    if (action === 'restore') {
      const index = strFlag(rest, 'index') || pos[2];
      if (index == null) { fmt.err('Usage: caas admin css restore --org ID --index N'); process.exit(1); }
      const result = await client.restoreCustomCss(org, index);
      return out(json, result, () => fmt.ok(result.message || 'Custom CSS restored'));
    }
    fmt.err('Usage: caas admin css get|set|rm|history|restore'); process.exit(1);
  }

  // ── Student dashboard config ──────────────────────────────
  if (sub === 'dashboard-config') {
    validateFlags(rest, ['config'], 'caas admin dashboard-config get|set --config JSON');
    const action = pos[0] || 'get';
    if (action === 'set') {
      const cfg = strFlag(rest, 'config');
      if (!cfg) { fmt.err('Usage: caas admin dashboard-config set --config JSON'); process.exit(1); }
      let body; try { body = JSON.parse(cfg); } catch { fmt.err('--config must be valid JSON'); process.exit(1); }
      const result = await client.setStudentDashboardConfig(body);
      return out(json, result, () => fmt.ok(result.message || 'Dashboard config saved'));
    }
    const result = await client.studentDashboardConfig();
    return out(json, result, () => { fmt.heading('Student Dashboard Config'); console.log(JSON.stringify(result.data, null, 2)); });
  }

  // ── Abandoned carts ───────────────────────────────────────
  if (sub === 'carts') {
    validateFlags(rest, ['page', 'limit'], 'caas admin carts [--page N]');
    const result = await client.abandonedCarts(qs({ page: strFlag(rest, 'page'), limit: strFlag(rest, 'limit') }));
    return out(json, result, () => {
      const rows = (result.data && (result.data.carts || result.data)) || [];
      if (!Array.isArray(rows) || !rows.length) return fmt.info('No abandoned carts.');
      fmt.heading('Abandoned Carts');
      rows.forEach(c => console.log(`  ${fmt.pad(`${fmt.C.orange}${c._id || ''}${fmt.C.reset}`, 40)} ${fmt.pad(c.email || '', 34)} ${fmt.C.gray}${c.courseId || c.itemCount || ''}${fmt.C.reset}`));
      console.log(fmt.count(rows.length, 'cart'));
    });
  }
  if (sub === 'carts-stats') {
    const result = await client.abandonedCartsStats();
    return out(json, result, () => { fmt.heading('Abandoned Cart Stats'); console.log(JSON.stringify(result.data, null, 2)); });
  }

  // ── flags alias ───────────────────────────────────────────
  if (sub === 'flags') return flags(client, rest, json);

  // ── Default: platform stats ───────────────────────────────
  const result = await client.adminStats(qs({ organizationId: strFlag(rest, 'org') }));
  return out(json, result, () => { fmt.heading('Platform Stats'); console.log(JSON.stringify(result.data, null, 2)); });
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

// caas coupons [create CODE --percent 20 | show ID | update ID | rm ID | deactivate ID | validate CODE | analytics]
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
  if (sub === 'show') {
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas coupons show ID'); process.exit(1); }
    const result = await client.coupon(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    fmt.heading('Coupon'); return console.log(JSON.stringify(result.data, null, 2));
  }
  if (sub === 'update') {
    validateFlags(args.slice(1), ['percent', 'amount', 'currency', 'max-uses', 'expires'],
      'caas coupons update ID [--percent N] [--amount CENTS] [--max-uses N] [--expires DATE]');
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas coupons update ID [--percent N]'); process.exit(1); }
    const data = {};
    const percent = strFlag(args, 'percent');
    const amount = strFlag(args, 'amount');
    if (percent) { data.discountType = 'percent'; data.discountValue = Number(percent); }
    if (amount) { data.discountType = 'amount'; data.discountValue = Number(amount); data.currency = strFlag(args, 'currency') || 'usd'; }
    const maxUses = strFlag(args, 'max-uses'); if (maxUses) data.maxUses = Number(maxUses);
    const expires = strFlag(args, 'expires'); if (expires) data.expiresAt = expires;
    const result = await client.updateCoupon(id, data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Coupon updated');
  }
  if (sub === 'deactivate') {
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas coupons deactivate ID'); process.exit(1); }
    const result = await client.deactivateCoupon(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Coupon deactivated');
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
  if (sub === 'analytics') {
    const result = await client.couponsAnalytics('');
    if (json) return console.log(JSON.stringify(result, null, 2));
    fmt.heading('Coupon Analytics'); return console.log(JSON.stringify(result.data, null, 2));
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
