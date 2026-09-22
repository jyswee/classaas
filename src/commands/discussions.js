/**
 * Discussions — course Q&A threads (enrolled students + the creator).
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

const USAGE = [
  'caas discussions COURSE_ID                         list threads (optional --lesson L)',
  'caas discussions COURSE_ID show DISCUSSION_ID      one thread with replies',
  'caas discussions COURSE_ID ask "Title" -m "body"   start a thread (optional --lesson L)',
  'caas discussions COURSE_ID reply DISCUSSION_ID "…" post a reply',
  'caas discussions COURSE_ID upvote DISCUSSION_ID    toggle upvote',
  'caas discussions COURSE_ID pin|resolve DISCUSSION_ID   creator toggle',
  'caas discussions COURSE_ID rm DISCUSSION_ID        creator hide',
].join('\n  ');

async function run(client, args, json) {
  validateFlags(args, ['lesson', 'm', 'message', 'page', 'limit'], USAGE);
  const pos = positionalArgs(args);
  const courseId = pos[0];
  if (!courseId) { fmt.err('Usage:\n  ' + USAGE); process.exit(1); }
  const sub = pos[1];

  if (sub === 'show') {
    const id = pos[2];
    if (!id) { fmt.err('Usage: caas discussions COURSE_ID show DISCUSSION_ID'); process.exit(1); }
    const result = await client.discussion(courseId, id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const d = result.data || {};
    fmt.heading(d.title || id);
    console.log(`  ${d.body || ''}`);
    const who = d.userId && (d.userId.email || (d.userId.profile && d.userId.profile.firstName));
    console.log(fmt.row('Author', who || '?'));
    const badges = [d.isPinned ? 'pinned' : '', d.isResolved ? 'resolved' : ''].filter(Boolean).join(' ');
    if (badges) console.log(fmt.row('Status', badges));
    (d.replies || []).forEach(rp => {
      const a = rp.userId && (rp.userId.email || (rp.userId.profile && rp.userId.profile.firstName)) || '?';
      const tag = rp.isInstructorReply ? `${fmt.C.magenta}[instructor]${fmt.C.reset} ` : '';
      console.log(`  ${fmt.C.cyan}↳${fmt.C.reset} ${tag}${a}: ${rp.body || ''} ${fmt.C.gray}${rp.createdAt || ''}${fmt.C.reset}`);
    });
    return;
  }
  if (sub === 'ask') {
    const title = pos.slice(2).join(' ').trim();
    const body = strFlag(args, 'message') || strFlag(args, 'm');
    if (!title || !body) { fmt.err('Usage: caas discussions COURSE_ID ask "Title" -m "body"'); process.exit(1); }
    const data = { title, body };
    const lesson = strFlag(args, 'lesson');
    if (lesson) data.lessonId = lesson;
    const result = await client.createDiscussion(courseId, data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const d = result.data || {};
    return fmt.ok(`Thread created${d._id ? `: ${d._id}` : ''}`);
  }
  if (sub === 'reply') {
    const id = pos[2];
    const body = pos.slice(3).join(' ').trim();
    if (!id || !body) { fmt.err('Usage: caas discussions COURSE_ID reply DISCUSSION_ID "text"'); process.exit(1); }
    const result = await client.replyDiscussion(courseId, id, { body });
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Reply posted');
  }
  if (sub === 'upvote' || sub === 'pin' || sub === 'resolve') {
    const id = pos[2];
    if (!id) { fmt.err(`Usage: caas discussions COURSE_ID ${sub} DISCUSSION_ID`); process.exit(1); }
    const fn = sub === 'upvote' ? client.upvoteDiscussion : sub === 'pin' ? client.pinDiscussion : client.resolveDiscussion;
    const result = await fn.call(client, courseId, id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok(`${sub} toggled`);
  }
  if (sub === 'rm' || sub === 'delete') {
    const id = pos[2];
    if (!id) { fmt.err('Usage: caas discussions COURSE_ID rm DISCUSSION_ID'); process.exit(1); }
    const result = await client.deleteDiscussion(courseId, id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Discussion hidden');
  }

  // Default: list threads
  const params = [];
  const lesson = strFlag(args, 'lesson');
  if (lesson) params.push(`lessonId=${encodeURIComponent(lesson)}`);
  const result = await client.discussions(courseId, params.join('&'));
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.discussions || result.data)) || [];
  if (!rows.length) return fmt.info('No discussions yet.');
  fmt.heading('Discussions');
  rows.forEach(d => {
    const id = fmt.pad(`${fmt.C.orange}${d._id}${fmt.C.reset}`, 40);
    const flags = `${d.isPinned ? fmt.C.yellow + '📌' + fmt.C.reset : ''}${d.isResolved ? fmt.C.green + '✓' + fmt.C.reset : ''}`;
    console.log(`  ${id} ${flags}${d.title || ''} ${fmt.C.gray}(${d.replyCount ?? 0} replies)${fmt.C.reset}`);
  });
  console.log(fmt.count(rows.length, 'thread'));
}

module.exports = { run };
