/**
 * Teach commands — creator-side course management.
 * Roles: host, org_admin, super_admin.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

function out(json, result, msgFn) {
  if (json) return console.log(JSON.stringify(result, null, 2));
  msgFn(result);
}

// caas teach [list] — list own courses
async function list(client, args, json) {
  validateFlags(args, ['status', 'page', 'limit'], 'caas teach [--status draft|published] [--page N]');
  const p = new URLSearchParams();
  for (const k of ['status', 'page', 'limit']) {
    const v = getFlag(args, k);
    if (v && v !== true) p.set(k, v);
  }
  const result = await client.manageCourses(p.toString());
  out(json, result, (r) => {
    const courses = (r.data && (r.data.courses || r.data)) || [];
    if (!courses.length) return fmt.info('No courses. Create one: caas teach create "Title" -d "Description"');
    fmt.heading('My Courses');
    courses.forEach(c => {
      const id = fmt.pad(`${fmt.C.orange}${c._id || c.courseId}${fmt.C.reset}`, 40);
      const st = fmt.pad(fmt.status(c.status), 14);
      const enr = fmt.pad(`${fmt.C.gray}${c.enrollmentCount ?? c.enrollments ?? 0} enrolled${fmt.C.reset}`, 16);
      console.log(`${id} ${st} ${enr} ${c.title || ''}`);
    });
    console.log(fmt.count(courses.length, 'course'));
  });
}

// caas teach create "Title" -d DESC [--category C] [--price CENTS] [--currency USD] [--difficulty beginner]
async function create(client, args, json) {
  validateFlags(args, ['d', 'description', 'category', 'c', 'price', 'currency', 'difficulty', 'tags'],
    'caas teach create "Title" -d "Description" [--category X] [--price CENTS] [--difficulty beginner]');
  const title = positionalArgs(args).join(' ').trim();
  if (!title) { fmt.err('Course title required. Usage: caas teach create "Title" -d "Description"'); process.exit(1); }
  const desc = getFlag(args, 'description') || getFlag(args, 'd');
  const price = getFlag(args, 'price');
  const data = {
    title,
    description: (desc && desc !== true) ? desc : title,
    category: strFlag(args, 'category') || strFlag(args, 'c') || 'general',
    difficultyLevel: strFlag(args, 'difficulty') || 'beginner',
    pricing: (price && price !== true)
      ? { type: 'paid', amount: Number(price), currency: strFlag(args, 'currency') || 'USD' }
      : { type: 'free', amount: 0, currency: 'USD' },
  };
  const tags = strFlag(args, 'tags');
  if (tags) data.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
  const result = await client.createCourse(data);
  out(json, result, (r) => {
    const c = (r.data && (r.data.course || r.data)) || {};
    fmt.ok(`Created course ${c._id || c.courseId || ''}: ${c.title || title}`);
    if (c.slug) fmt.info(`Slug: ${c.slug}`);
    fmt.info('Next: caas section add COURSE_ID "Section title"');
  });
}

// caas teach show ID
async function show(client, args, json) {
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas teach show COURSE_ID'); process.exit(1); }
  const result = await client.manageCourse(id);
  out(json, result, (r) => {
    const c = (r.data && (r.data.course || r.data)) || {};
    fmt.heading(c.title || id);
    console.log(fmt.row('ID', c._id || c.courseId || id));
    console.log(fmt.row('Status', fmt.status(c.status)));
    console.log(fmt.row('Slug', c.slug || '--'));
    console.log(fmt.row('Pricing', c.pricing && c.pricing.type === 'paid' ? `${c.pricing.currency} ${c.pricing.amount}` : 'free'));
    console.log(fmt.row('Enrolled', String(c.enrollmentCount ?? c.enrollments ?? 0)));
    const sections = c.sections || [];
    if (sections.length) {
      fmt.heading('Sections');
      sections.forEach(s => {
        console.log(`  ${fmt.C.orange}${s.sectionId}${fmt.C.reset} ${s.title} ${fmt.C.gray}(${(s.lessons || []).length} lessons)${fmt.C.reset}`);
        (s.lessons || []).forEach(l => {
          console.log(`    ${fmt.C.gray}${l.lessonId}${fmt.C.reset} [${l.type || 'text'}] ${l.title}`);
        });
      });
    }
  });
}

// caas teach publish|archive|delete|duplicate ID
async function publish(client, args, json) {
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas teach publish COURSE_ID'); process.exit(1); }
  const result = await client.publishCourse(id);
  out(json, result, (r) => fmt.ok(r.message || 'Published'));
}

async function archive(client, args, json) {
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas teach archive COURSE_ID'); process.exit(1); }
  const result = await client.archiveCourse(id);
  out(json, result, (r) => fmt.ok(r.message || 'Archived'));
}

async function remove(client, args, json) {
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas teach delete COURSE_ID'); process.exit(1); }
  const result = await client.deleteCourse(id);
  out(json, result, (r) => fmt.ok(r.message || 'Deleted'));
}

async function duplicate(client, args, json) {
  validateFlags(args, ['title'], 'caas teach duplicate COURSE_ID [--title "New title"]');
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas teach duplicate COURSE_ID'); process.exit(1); }
  const title = strFlag(args, 'title');
  const result = await client.duplicateCourse(id, title ? { title } : {});
  out(json, result, (r) => fmt.ok(r.message || 'Duplicated'));
}

// caas teach update ID --title T -d DESC --price CENTS
async function update(client, args, json) {
  validateFlags(args, ['title', 'd', 'description', 'category', 'price', 'currency', 'difficulty'],
    'caas teach update COURSE_ID [--title T] [-d DESC] [--price CENTS]');
  const id = positionalArgs(args)[0];
  if (!id) { fmt.err('Usage: caas teach update COURSE_ID [--title T] ...'); process.exit(1); }
  const data = {};
  const title = strFlag(args, 'title');
  const desc = strFlag(args, 'description') || strFlag(args, 'd');
  const cat = strFlag(args, 'category');
  const diff = strFlag(args, 'difficulty');
  const price = strFlag(args, 'price');
  if (title) data.title = title;
  if (desc) data.description = desc;
  if (cat) data.category = cat;
  if (diff) data.difficultyLevel = diff;
  if (price) data.pricing = { type: Number(price) > 0 ? 'paid' : 'free', amount: Number(price), currency: strFlag(args, 'currency') || 'USD' };
  if (!Object.keys(data).length) { fmt.err('Nothing to update.'); process.exit(1); }
  const result = await client.updateCourse(id, data);
  out(json, result, (r) => fmt.ok(r.message || 'Updated'));
}

// ── Sections ────────────────────────────────────────────────

// caas section add COURSE "Title" | caas section rm COURSE SECTION | caas section update COURSE SECTION --title T
async function section(client, args, json) {
  const sub = args[0];
  const rest = args.slice(1);
  if (sub === 'add') {
    validateFlags(rest, ['d', 'description'], 'caas section add COURSE_ID "Section title" [-d DESC]');
    const pos = positionalArgs(rest);
    const courseId = pos[0];
    const title = pos.slice(1).join(' ').trim();
    if (!courseId || !title) { fmt.err('Usage: caas section add COURSE_ID "Section title"'); process.exit(1); }
    const data = { title };
    const desc = strFlag(rest, 'description') || strFlag(rest, 'd');
    if (desc) data.description = desc;
    const result = await client.addSection(courseId, data);
    return out(json, result, (r) => {
      const sections = (r.data && r.data.sections) || [];
      const added = sections.length ? sections[sections.length - 1] : null;
      fmt.ok(`Section added${added ? `: ${added.sectionId}` : ''}`);
    });
  }
  if (sub === 'update') {
    validateFlags(rest, ['title', 'd', 'description'], 'caas section update COURSE_ID SECTION_ID --title T');
    const pos = positionalArgs(rest);
    if (pos.length < 2) { fmt.err('Usage: caas section update COURSE_ID SECTION_ID --title T'); process.exit(1); }
    const data = {};
    const title = strFlag(rest, 'title');
    const desc = strFlag(rest, 'description') || strFlag(rest, 'd');
    if (title) data.title = title;
    if (desc) data.description = desc;
    const result = await client.updateSection(pos[0], pos[1], data);
    return out(json, result, (r) => fmt.ok(r.message || 'Section updated'));
  }
  if (sub === 'rm' || sub === 'delete') {
    const pos = positionalArgs(rest);
    if (pos.length < 2) { fmt.err('Usage: caas section rm COURSE_ID SECTION_ID'); process.exit(1); }
    const result = await client.deleteSection(pos[0], pos[1]);
    return out(json, result, (r) => fmt.ok(r.message || 'Section removed'));
  }
  fmt.err('Usage: caas section add|update|rm ...');
  process.exit(1);
}

// ── Lessons ─────────────────────────────────────────────────

// caas lesson add COURSE SECTION "Title" [--type text|video|quiz] [--content TEXT]
async function lesson(client, args, json) {
  const sub = args[0];
  const rest = args.slice(1);
  if (sub === 'add') {
    validateFlags(rest, ['type', 'content', 'duration'], 'caas lesson add COURSE_ID SECTION_ID "Title" [--type text] [--content TEXT]');
    const pos = positionalArgs(rest);
    const [courseId, sectionId] = pos;
    const title = pos.slice(2).join(' ').trim();
    if (!courseId || !sectionId || !title) { fmt.err('Usage: caas lesson add COURSE_ID SECTION_ID "Title"'); process.exit(1); }
    const data = { title, type: strFlag(rest, 'type') || 'text' };
    const content = strFlag(rest, 'content');
    if (content) data.content = content;
    const duration = strFlag(rest, 'duration');
    if (duration) data.estimatedDuration = Number(duration);
    const result = await client.addLesson(courseId, sectionId, data);
    return out(json, result, (r) => {
      // Find the lesson just added by title
      let lessonId = null;
      for (const sec of (r.data && r.data.sections) || []) {
        const found = (sec.lessons || []).find(l => l.title === title);
        if (found) { lessonId = found.lessonId; break; }
      }
      fmt.ok(`Lesson added${lessonId ? `: ${lessonId}` : ''}`);
    });
  }
  if (sub === 'update') {
    validateFlags(rest, ['title', 'content', 'duration'], 'caas lesson update COURSE_ID SECTION_ID LESSON_ID --title T');
    const pos = positionalArgs(rest);
    if (pos.length < 3) { fmt.err('Usage: caas lesson update COURSE_ID SECTION_ID LESSON_ID --title T'); process.exit(1); }
    const data = {};
    const title = strFlag(rest, 'title');
    const content = strFlag(rest, 'content');
    const duration = strFlag(rest, 'duration');
    if (title) data.title = title;
    if (content) data.content = content;
    if (duration) data.estimatedDuration = Number(duration);
    const result = await client.updateLesson(pos[0], pos[1], pos[2], data);
    return out(json, result, (r) => fmt.ok(r.message || 'Lesson updated'));
  }
  if (sub === 'rm' || sub === 'delete') {
    const pos = positionalArgs(rest);
    if (pos.length < 3) { fmt.err('Usage: caas lesson rm COURSE_ID SECTION_ID LESSON_ID'); process.exit(1); }
    const result = await client.deleteLesson(pos[0], pos[1], pos[2]);
    return out(json, result, (r) => fmt.ok(r.message || 'Lesson removed'));
  }
  fmt.err('Usage: caas lesson add|update|rm ...');
  process.exit(1);
}

// ── Quiz authoring ──────────────────────────────────────────

// caas quizset COURSE SECTION LESSON --questions JSON [--passing 70]
async function quizset(client, args, json) {
  const sub = args[0];
  if (sub === 'show') {
    const pos = positionalArgs(args.slice(1));
    if (pos.length < 3) { fmt.err('Usage: caas quizset show COURSE_ID SECTION_ID LESSON_ID'); process.exit(1); }
    const result = await client.getLessonQuiz(pos[0], pos[1], pos[2]);
    return out(json, result, (r) => console.log(JSON.stringify(r.data, null, 2)));
  }
  if (sub === 'rm' || sub === 'delete') {
    const pos = positionalArgs(args.slice(1));
    if (pos.length < 3) { fmt.err('Usage: caas quizset rm COURSE_ID SECTION_ID LESSON_ID'); process.exit(1); }
    const result = await client.deleteLessonQuiz(pos[0], pos[1], pos[2]);
    return out(json, result, (r) => fmt.ok(r.message || 'Quiz removed'));
  }
  validateFlags(args, ['questions', 'passing', 'title'],
    'caas quizset COURSE_ID SECTION_ID LESSON_ID --questions \'[{"question":"2+2?","type":"multiple_choice","options":["3","4"],"correctAnswer":1}]\'');
  const pos = positionalArgs(args);
  if (pos.length < 3) { fmt.err('Usage: caas quizset COURSE_ID SECTION_ID LESSON_ID --questions JSON'); process.exit(1); }
  const qjson = strFlag(args, 'questions');
  if (!qjson) { fmt.err('--questions JSON array required'); process.exit(1); }
  let questions;
  try { questions = JSON.parse(qjson); } catch (e2) { fmt.err(`Invalid --questions JSON: ${e2.message}`); process.exit(1); }
  const data = { questions };
  const passing = strFlag(args, 'passing');
  if (passing) data.passingScore = Number(passing);
  const title = strFlag(args, 'title');
  if (title) data.title = title;
  const result = await client.setLessonQuiz(pos[0], pos[1], pos[2], data);
  out(json, result, (r) => fmt.ok(r.message || 'Quiz saved'));
}

// ── Students & analytics ────────────────────────────────────

// caas students COURSE [--q text] [--page N]
async function students(client, args, json) {
  validateFlags(args, ['q', 'page', 'limit'], 'caas students COURSE_ID [--q text]');
  const courseId = positionalArgs(args)[0];
  if (!courseId) { fmt.err('Usage: caas students COURSE_ID'); process.exit(1); }
  const p = new URLSearchParams();
  const qv = strFlag(args, 'q');
  if (qv) p.set('searchTerm', qv);
  for (const k of ['page', 'limit']) { const v = strFlag(args, k); if (v) p.set(k, v); }
  const result = await client.courseStudents(courseId, p.toString());
  out(json, result, (r) => {
    const rows = (r.data && (r.data.students || r.data)) || [];
    if (!rows.length) return fmt.info('No students enrolled.');
    fmt.heading('Students');
    rows.forEach(s => {
      const u = s.user || s;
      const email = fmt.pad(`${fmt.C.cyan}${u.email || '--'}${fmt.C.reset}`, 36);
      const prog = fmt.pad(`${fmt.C.gray}${s.progress ?? s.completionPercentage ?? 0}%${fmt.C.reset}`, 8);
      const name = [u.profile && u.profile.firstName, u.profile && u.profile.lastName].filter(Boolean).join(' ') || u.firstName || '';
      console.log(`${email} ${prog} ${name}`);
    });
    console.log(fmt.count(rows.length, 'student'));
  });
}

// caas bulk-enroll COURSE --emails a@x,b@y
async function bulkEnroll(client, args, json) {
  validateFlags(args, ['emails'], 'caas bulk-enroll COURSE_ID --emails a@x.com,b@y.com');
  const courseId = positionalArgs(args)[0];
  const emails = strFlag(args, 'emails');
  if (!courseId || !emails) { fmt.err('Usage: caas bulk-enroll COURSE_ID --emails a@x.com,b@y.com'); process.exit(1); }
  const result = await client.bulkEnroll(courseId, { emails: emails.split(',').map(s => s.trim()).filter(Boolean) });
  out(json, result, (r) => fmt.ok(r.message || 'Bulk enrollment complete'));
}

// caas analytics [COURSE]
async function analytics(client, args, json) {
  const courseId = positionalArgs(args)[0];
  const result = courseId ? await client.courseAnalytics(courseId) : await client.engagement('');
  out(json, result, (r) => {
    const d = r.data || {};
    fmt.heading(courseId ? `Course Analytics — ${courseId}` : 'Engagement Analytics');
    for (const [k, v] of Object.entries(d)) {
      if (typeof v === 'object' && v !== null) console.log(fmt.row(k, JSON.stringify(v)));
      else console.log(fmt.row(k, String(v)));
    }
  });
}

function strFlag(args, name) {
  const v = getFlag(args, name);
  return (v && v !== true) ? v : null;
}

module.exports = { list, create, show, update, publish, archive, remove, duplicate, section, lesson, quizset, students, bulkEnroll, analytics };
