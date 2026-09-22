/**
 * Assignments — creator authoring, student submissions, grading.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

const FLAGS = ['course', 'lesson', 'title', 'd', 'description', 'due', 'points', 'type', 'active', 'text', 'url', 'grade', 'm', 'message', 'status'];
const USAGE = [
  'caas assignments --course C | --lesson L            list assignments',
  'caas assignments create --course C --lesson L --title "T" [-d DESC --due ISO --points N --type text|url]',
  'caas assignments update AID [--title … --due … --points … --active true|false]',
  'caas assignments rm AID',
  'caas assignments mine AID                           my submission',
  'caas assignments submit AID --text "…" | --url "…"',
  'caas assignments inbox [--status submitted|graded --course C]',
  'caas assignments grade SUBMISSION_ID --grade N [-m "feedback"]',
].join('\n  ');

async function run(client, args, json) {
  validateFlags(args, FLAGS, USAGE);
  const pos = positionalArgs(args);
  const sub = pos[0];

  if (sub === 'create') {
    const data = {
      courseId: strFlag(args, 'course'),
      lessonId: strFlag(args, 'lesson'),
      title: strFlag(args, 'title'),
    };
    if (!data.courseId || !data.lessonId || !data.title) {
      fmt.err('Usage: caas assignments create --course C --lesson L --title "T"'); process.exit(1);
    }
    const desc = strFlag(args, 'description') || strFlag(args, 'd');
    if (desc) data.description = desc;
    const due = strFlag(args, 'due'); if (due) data.dueAt = due;
    const points = strFlag(args, 'points'); if (points) data.maxPoints = Number(points);
    const type = strFlag(args, 'type'); if (type) data.submissionType = type;
    const result = await client.createAssignment(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const a = result.data || {};
    return fmt.ok(`Assignment created${a._id ? `: ${a._id}` : ''}`);
  }
  if (sub === 'update') {
    const id = pos[1];
    if (!id) { fmt.err('Usage: caas assignments update ASSIGNMENT_ID [flags]'); process.exit(1); }
    const data = {};
    const title = strFlag(args, 'title'); if (title) data.title = title;
    const desc = strFlag(args, 'description') || strFlag(args, 'd'); if (desc) data.description = desc;
    const due = strFlag(args, 'due'); if (due) data.dueAt = due;
    const points = strFlag(args, 'points'); if (points) data.maxPoints = Number(points);
    const type = strFlag(args, 'type'); if (type) data.submissionType = type;
    const active = strFlag(args, 'active'); if (active !== null) data.isActive = active === 'true';
    const result = await client.updateAssignment(id, data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Assignment updated');
  }
  if (sub === 'rm' || sub === 'delete') {
    const id = pos[1];
    if (!id) { fmt.err('Usage: caas assignments rm ASSIGNMENT_ID'); process.exit(1); }
    const result = await client.deleteAssignment(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Assignment deleted');
  }
  if (sub === 'mine') {
    const id = pos[1];
    if (!id) { fmt.err('Usage: caas assignments mine ASSIGNMENT_ID'); process.exit(1); }
    const result = await client.myAssignmentSubmission(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const s = result.data;
    if (!s) return fmt.info('No submission yet.');
    fmt.heading('My Submission');
    console.log(fmt.row('Status', s.status || '--'));
    if (s.grade !== undefined && s.grade !== null) console.log(fmt.row('Grade', String(s.grade)));
    if (s.feedback) console.log(fmt.row('Feedback', s.feedback));
    if (s.textAnswer) console.log(fmt.row('Answer', s.textAnswer));
    if (s.url) console.log(fmt.row('URL', s.url));
    return;
  }
  if (sub === 'submit') {
    const id = pos[1];
    if (!id) { fmt.err('Usage: caas assignments submit ASSIGNMENT_ID --text "…" | --url "…"'); process.exit(1); }
    const data = {};
    const text = strFlag(args, 'text'); if (text) data.textAnswer = text;
    const url = strFlag(args, 'url'); if (url) data.url = url;
    if (!data.textAnswer && !data.url) { fmt.err('Provide --text "…" or --url "…"'); process.exit(1); }
    const result = await client.submitAssignment(id, data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Submitted');
  }
  if (sub === 'inbox') {
    const params = [];
    const st = strFlag(args, 'status'); if (st) params.push(`status=${encodeURIComponent(st)}`);
    const course = strFlag(args, 'course'); if (course) params.push(`courseId=${encodeURIComponent(course)}`);
    const result = await client.assignmentInbox(params.join('&'));
    if (json) return console.log(JSON.stringify(result, null, 2));
    const rows = (result.data && (result.data.submissions || result.data)) || [];
    if (!rows.length) return fmt.info('Inbox empty.');
    fmt.heading('Submissions to Grade');
    rows.forEach(s => {
      const id = fmt.pad(`${fmt.C.orange}${s._id}${fmt.C.reset}`, 40);
      const who = (s.userId && (s.userId.email || s.userId)) || '?';
      console.log(`  ${id} ${fmt.pad(fmt.status(s.status), 14)} ${who}`);
    });
    console.log(fmt.count(rows.length, 'submission'));
    return;
  }
  if (sub === 'grade') {
    const id = pos[1];
    const grade = strFlag(args, 'grade');
    if (!id || grade === null) { fmt.err('Usage: caas assignments grade SUBMISSION_ID --grade N [-m "feedback"]'); process.exit(1); }
    const data = { grade: Number(grade) };
    const fb = strFlag(args, 'message') || strFlag(args, 'm');
    if (fb) data.feedback = fb;
    const result = await client.gradeSubmission(id, data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    return fmt.ok('Graded');
  }

  // Default: list by course or lesson
  const params = [];
  const course = strFlag(args, 'course'); if (course) params.push(`courseId=${encodeURIComponent(course)}`);
  const lesson = strFlag(args, 'lesson'); if (lesson) params.push(`lessonId=${encodeURIComponent(lesson)}`);
  if (!params.length) { fmt.err('Usage:\n  ' + USAGE); process.exit(1); }
  const result = await client.assignments(params.join('&'));
  if (json) return console.log(JSON.stringify(result, null, 2));
  const rows = (result.data && (result.data.assignments || result.data)) || [];
  if (!rows.length) return fmt.info('No assignments.');
  fmt.heading('Assignments');
  rows.forEach(a => {
    const id = fmt.pad(`${fmt.C.orange}${a._id}${fmt.C.reset}`, 40);
    const pts = a.maxPoints ? `${fmt.C.gray}${a.maxPoints}pts${fmt.C.reset}` : '';
    console.log(`  ${id} ${fmt.pad(`${fmt.C.cyan}${a.submissionType || 'text'}${fmt.C.reset}`, 14)} ${a.title || ''} ${pts}`);
  });
  console.log(fmt.count(rows.length, 'assignment'));
}

module.exports = { run };
