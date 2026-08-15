/**
 * Live-class commands — schedule, list, start, end, cancel, and hand back a
 * join link. These are the *management* verbs only: the real-time seat
 * (media, mute/kick, SFU token) lives in the browser room page and cannot be
 * driven from a CLI.
 *
 * The link this hands back is deliberately tokenless. `start`/`join` return
 * `class-room.html?room=<meetingId>` and the room re-checks access from the
 * viewer's own session on connect — so putting the URL in a terminal, a log or
 * a chat is not a way in (routes/videoCalls.js, Meeting.joinUrl virtual).
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function classLine(m) {
  const id = fmt.pad(`${fmt.C.orange}${m._id || ''}${fmt.C.reset}`, 40);
  const st = fmt.pad(fmt.status(m.status), 14);
  const when = m.scheduledAt || m.actualStartTime || m.createdAt || '';
  return `${id} ${st} ${fmt.pad(fmt.truncate(m.title || '', 34), 34)} ${fmt.C.gray}${when}${fmt.C.reset}`;
}

function printList(result, json, empty) {
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.videoCalls || result.data)) || [];
  if (!Array.isArray(rows) || !rows.length) return fmt.info(empty);
  fmt.heading('Live classes');
  rows.forEach(m => console.log(classLine(m)));
  console.log(fmt.count(rows.length, 'class'));
}

// caas video list [--status X] [--active|--scheduled] [--limit N] [--offset N]
async function list(client, args, json) {
  validateFlags(args, ['status', 'active', 'scheduled', 'limit', 'offset'],
    'caas video list [--status active] [--active|--scheduled] [--limit N]');

  if (getFlag(args, 'active')) {
    return printList(await client.liveClassesActive(), json, 'No active classes.');
  }
  if (getFlag(args, 'scheduled')) {
    return printList(await client.liveClassesScheduled(''), json, 'No scheduled classes.');
  }

  const params = new URLSearchParams();
  for (const k of ['status', 'limit', 'offset']) {
    const v = getFlag(args, k);
    if (v && v !== true) params.set(k, v);
  }
  printList(await client.liveClasses(params.toString()), json, 'No classes.');
}

// caas video show ID
async function show(client, args, json) {
  validateFlags(args, [], 'caas video show ID');
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas video show ID'); process.exit(1); }

  const result = await client.liveClass(id);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const m = result.data || {};
  fmt.heading(m.title || id);
  console.log(fmt.row('ID', `${fmt.C.orange}${m._id || id}${fmt.C.reset}`));
  if (m.meetingId) console.log(fmt.row('Room', m.meetingId));
  console.log(fmt.row('Status', fmt.status(m.status)));
  console.log(fmt.row('Type', m.type || '--'));
  if (m.scheduledAt) console.log(fmt.row('Scheduled', m.scheduledAt));
  if (m.duration) console.log(fmt.row('Duration', `${m.duration} min`));
  if (m.participants) console.log(fmt.row('Participants', String(m.participants.length)));
  const host = m.hostId && (m.hostId.name || m.hostId.email);
  if (host) console.log(fmt.row('Host', host));
  if (m.joinUrl) console.log(fmt.row('Join', m.joinUrl));
  if (m.description) {
    console.log('');
    console.log(`${fmt.C.dim}${fmt.truncate(m.description, 500)}${fmt.C.reset}`);
  }
}

// caas video schedule --title T [--at ISO] [--duration MIN] [--now] [--description D]
async function schedule(client, args, json) {
  validateFlags(args, ['title', 'at', 'duration', 'now', 'description'],
    'caas video schedule --title "Class" [--at 2026-08-20T14:00Z] [--duration 60] [--now]');

  const title = getFlag(args, 'title');
  if (!title || title === true) { fmt.err('Usage: caas video schedule --title "Class name"'); process.exit(1); }

  const now = !!getFlag(args, 'now');
  const at = getFlag(args, 'at');
  const duration = getFlag(args, 'duration');
  const description = getFlag(args, 'description');

  const body = {
    title,
    type: now ? 'instant' : 'scheduled',
    scheduling: {},
  };
  if (description && description !== true) body.description = description;
  if (!now && at && at !== true) body.scheduling.scheduledAt = at;
  if (duration && duration !== true) body.scheduling.duration = parseInt(duration, 10);

  const result = await client.scheduleLiveClass(body);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const m = result.data || {};
  fmt.ok(result.message || 'Class created');
  console.log(fmt.row('ID', `${fmt.C.orange}${m._id || ''}${fmt.C.reset}`));
  console.log(fmt.row('Status', fmt.status(m.status)));
  if (m.joinUrl) console.log(fmt.row('Join', m.joinUrl));
}

// caas video start ID — marks active and hands back the tokenless join link.
async function start(client, args, json) {
  validateFlags(args, [], 'caas video start ID');
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas video start ID'); process.exit(1); }

  const started = await client.startLiveClass(id);
  if (json) {
    // Fold the join link into the JSON so an agent gets it in one call.
    let joinUrl = started.data && started.data.joinUrl;
    if (!joinUrl) {
      try { joinUrl = (await client.joinLiveClass(id)).data.joinUrl; } catch {}
    }
    return console.log(JSON.stringify({ ...started, joinUrl }, null, 2));
  }

  const m = started.data || {};
  fmt.ok(started.message || 'Class started');
  let joinUrl = m.joinUrl;
  if (!joinUrl) {
    try { joinUrl = (await client.joinLiveClass(id)).data.joinUrl; } catch {}
  }
  if (joinUrl) {
    console.log(fmt.row('Join', joinUrl));
    fmt.info('Open this while signed in — the link carries no token; access is re-checked on connect.');
  }
}

// caas video join ID — the tokenless room link for a class already running.
async function join(client, args, json) {
  validateFlags(args, [], 'caas video join ID');
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas video join ID'); process.exit(1); }

  const result = await client.joinLiveClass(id);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const d = result.data || {};
  fmt.ok(`${d.title || 'Class'} — you are ${d.role || 'a participant'}`);
  if (d.joinUrl) {
    console.log(fmt.row('Join', d.joinUrl));
    fmt.info('Open this while signed in — the link carries no token; access is re-checked on connect.');
  }
}

// caas video end ID
async function end(client, args, json) {
  validateFlags(args, [], 'caas video end ID');
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas video end ID'); process.exit(1); }
  const result = await client.endLiveClass(id);
  if (json) return console.log(JSON.stringify(result, null, 2));
  fmt.ok(result.message || 'Class ended');
  const d = result.data || {};
  if (d.actualDuration != null) console.log(fmt.row('Duration', `${Math.round(d.actualDuration / 60)} min`));
}

// caas video cancel ID — deletes a class that is not active.
async function cancel(client, args, json) {
  validateFlags(args, [], 'caas video cancel ID');
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas video cancel ID'); process.exit(1); }
  const result = await client.cancelLiveClass(id);
  if (json) return console.log(JSON.stringify(result, null, 2));
  fmt.ok(result.message || 'Class cancelled');
}

// caas video analytics [--from ISO --to ISO]
async function analytics(client, args, json) {
  validateFlags(args, ['from', 'to'], 'caas video analytics [--from 2026-07-01] [--to 2026-08-01]');
  const params = new URLSearchParams();
  const from = getFlag(args, 'from');
  const to = getFlag(args, 'to');
  if (from && from !== true) params.set('startDate', from);
  if (to && to !== true) params.set('endDate', to);
  const result = await client.liveClassAnalytics(params.toString());
  if (json) return console.log(JSON.stringify(result, null, 2));
  const d = result.data || {};
  fmt.heading('Live-class analytics');
  console.log(fmt.row('Total', String(d.totalCalls || 0)));
  console.log(fmt.row('Active', String(d.activeCalls || 0)));
  console.log(fmt.row('Completed', String(d.completedCalls || 0)));
  console.log(fmt.row('Participants', String(d.totalParticipants || 0)));
  if (d.averageDuration) console.log(fmt.row('Avg duration', `${Math.round(d.averageDuration)} min`));
}

const SUB = { list, show, schedule, start, join, end, cancel, analytics };

function run(client, args, json) {
  const sub = args[0];
  const handler = SUB[sub];
  if (!handler) {
    fmt.err(`Usage: caas video <${Object.keys(SUB).join('|')}>`);
    process.exit(1);
  }
  return handler(client, args.slice(1), json);
}

module.exports = { run, ...SUB };
