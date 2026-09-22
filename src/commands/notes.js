/**
 * Lesson notes + bookmarks (mounted server-side at /learn).
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

const NOTES_USAGE = [
  'caas notes --course C | --lesson L                 list my notes',
  'caas notes save --course C --lesson L -m "body"    upsert my lesson note',
  'caas notes rm NOTE_ID',
].join('\n  ');

async function notes(client, args, json) {
  validateFlags(args, ['course', 'lesson', 'm', 'message'], NOTES_USAGE);
  const pos = positionalArgs(args);
  const sub = pos[0];

  if (sub === 'save') {
    const courseId = strFlag(args, 'course');
    const lessonId = strFlag(args, 'lesson');
    const body = strFlag(args, 'message') || strFlag(args, 'm');
    if (!courseId || !lessonId) { fmt.err('Usage: caas notes save --course C --lesson L -m "body"'); process.exit(1); }
    const result = await client.saveNote({ courseId, lessonId, body: body || '' });
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Note saved');
  }
  if (sub === 'rm' || sub === 'delete') {
    const id = pos[1];
    if (!id) { fmt.err('Usage: caas notes rm NOTE_ID'); process.exit(1); }
    const result = await client.deleteNote(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Note deleted');
  }

  const params = [];
  const course = strFlag(args, 'course'); if (course) params.push(`courseId=${encodeURIComponent(course)}`);
  const lesson = strFlag(args, 'lesson'); if (lesson) params.push(`lessonId=${encodeURIComponent(lesson)}`);
  if (!params.length) { fmt.err('Usage:\n  ' + NOTES_USAGE); process.exit(1); }
  const result = await client.notes(params.join('&'));
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.notes || result.data)) || [];
  if (!rows.length) return fmt.info('No notes.');
  fmt.heading('Notes');
  rows.forEach(n => {
    console.log(`  ${fmt.pad(`${fmt.C.orange}${n._id}${fmt.C.reset}`, 40)} ${fmt.C.gray}${n.lessonId || ''}${fmt.C.reset}`);
    console.log(`    ${fmt.truncate(n.body || '', 100)}`);
  });
  console.log(fmt.count(rows.length, 'note'));
}

const BM_USAGE = [
  'caas bookmarks --course C | --lesson L              list my bookmarks',
  'caas bookmarks add --course C --lesson L [--at SECONDS --label "…"]',
  'caas bookmarks rm BOOKMARK_ID',
].join('\n  ');

async function bookmarks(client, args, json) {
  validateFlags(args, ['course', 'lesson', 'at', 'label'], BM_USAGE);
  const pos = positionalArgs(args);
  const sub = pos[0];

  if (sub === 'add') {
    const courseId = strFlag(args, 'course');
    const lessonId = strFlag(args, 'lesson');
    if (!courseId || !lessonId) { fmt.err('Usage: caas bookmarks add --course C --lesson L [--at SECONDS --label "…"]'); process.exit(1); }
    const data = { courseId, lessonId };
    const at = strFlag(args, 'at'); if (at) data.videoTimestamp = Number(at);
    const label = strFlag(args, 'label'); if (label) data.label = label;
    const result = await client.addBookmark(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Bookmark added');
  }
  if (sub === 'rm' || sub === 'delete') {
    const id = pos[1];
    if (!id) { fmt.err('Usage: caas bookmarks rm BOOKMARK_ID'); process.exit(1); }
    const result = await client.deleteBookmark(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Bookmark deleted');
  }

  const params = [];
  const course = strFlag(args, 'course'); if (course) params.push(`courseId=${encodeURIComponent(course)}`);
  const lesson = strFlag(args, 'lesson'); if (lesson) params.push(`lessonId=${encodeURIComponent(lesson)}`);
  if (!params.length) { fmt.err('Usage:\n  ' + BM_USAGE); process.exit(1); }
  const result = await client.bookmarks(params.join('&'));
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.bookmarks || result.data)) || [];
  if (!rows.length) return fmt.info('No bookmarks.');
  fmt.heading('Bookmarks');
  rows.forEach(b => {
    const at = b.videoTimestamp ? `${fmt.C.yellow}@${b.videoTimestamp}s${fmt.C.reset}` : '';
    console.log(`  ${fmt.pad(`${fmt.C.orange}${b._id}${fmt.C.reset}`, 40)} ${fmt.pad(at, 10)} ${b.label || ''}`);
  });
  console.log(fmt.count(rows.length, 'bookmark'));
}

module.exports = { notes, bookmarks };
