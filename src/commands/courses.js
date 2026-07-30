/**
 * Course commands: catalog list/search, detail, categories, enroll, progress.
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

async function list(client, args, json) {
  validateFlags(args, ['q', 'category', 'difficulty', 'pricing', 'sort', 'page', 'limit'],
    'caas courses [--q text] [--category X] [--page N] [--limit N]');

  const q = getFlag(args, 'q');
  const params = new URLSearchParams();
  for (const k of ['category', 'difficulty', 'pricing', 'sort', 'page', 'limit']) {
    const v = getFlag(args, k);
    if (v && v !== true) params.set(k, v);
  }

  let result;
  if (q && q !== true) {
    params.set('q', q);
    result = await client.catalogSearch(params.toString());
  } else {
    result = await client.catalog(params.toString());
  }

  if (json) return console.log(JSON.stringify(result, null, 2));

  const courses = result.data || [];
  if (!courses.length) return fmt.info('No courses found.');

  fmt.heading('Courses');
  courses.forEach(c => console.log(fmt.courseLine(c)));

  const p = result.pagination;
  if (p && p.pages > 1) {
    console.log(`${fmt.C.dim}Page ${p.page}/${p.pages} — ${p.total} total (use --page N)${fmt.C.reset}`);
  } else {
    console.log(fmt.count(courses.length, 'course'));
  }
}

async function show(client, args, json) {
  validateFlags(args, [], 'caas course SLUG');
  const slug = positionalArgs(args)[0];
  if (!slug) { fmt.err('Usage: caas course SLUG'); process.exit(1); }

  const result = await client.course(slug);
  if (json) return console.log(JSON.stringify(result, null, 2));

  const c = result.data && (result.data.course || result.data);
  if (!c) return fmt.err('Course not found');
  fmt.heading(c.title || slug);
  console.log(fmt.row('Slug', c.slug || slug));
  if (c.courseId) console.log(fmt.row('Course ID', `${fmt.C.orange}${c.courseId}${fmt.C.reset}`));
  console.log(fmt.row('Status', fmt.status(c.status)));
  if (c.category) console.log(fmt.row('Category', c.category));
  if (c.difficultyLevel) console.log(fmt.row('Difficulty', c.difficultyLevel));
  const pr = c.pricing || {};
  console.log(fmt.row('Pricing', pr.type === 'paid' ? `${pr.currency || 'USD'} ${pr.amount}` : 'free'));
  if (c.sections) console.log(fmt.row('Sections', String(c.sections.length)));
  if (c.stats) console.log(fmt.row('Enrollments', String(c.stats.totalEnrollments || 0)));
  if (c.tags && c.tags.length) console.log(fmt.row('Tags', c.tags.join(', ')));
  if (c.description) {
    console.log('');
    console.log(`${fmt.C.dim}${fmt.truncate(c.description, 500)}${fmt.C.reset}`);
  }
}

async function categories(client, args, json) {
  validateFlags(args, [], 'caas categories');
  const result = await client.categories();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const cats = result.data || [];
  if (!cats.length) return fmt.info('No categories.');
  fmt.heading('Categories');
  cats.forEach(c => {
    const name = c._id || c.name || c;
    const n = c.count != null ? ` ${fmt.C.gray}(${c.count})${fmt.C.reset}` : '';
    console.log(`  ${name}${n}`);
  });
}

async function enroll(client, args, json) {
  validateFlags(args, [], 'caas enroll COURSE_ID');
  const courseId = positionalArgs(args)[0];
  if (!courseId) { fmt.err('Usage: caas enroll COURSE_ID'); process.exit(1); }
  const result = await client.enroll(courseId);
  if (json) return console.log(JSON.stringify(result, null, 2));
  fmt.ok(result.message || 'Enrolled');
}

async function progress(client, args, json) {
  validateFlags(args, [], 'caas progress COURSE_ID');
  const courseId = positionalArgs(args)[0];
  if (!courseId) { fmt.err('Usage: caas progress COURSE_ID'); process.exit(1); }
  const result = await client.progress(courseId);
  if (json) return console.log(JSON.stringify(result, null, 2));
  const d = result.data || {};
  fmt.heading('Progress');
  const pct = d.progress != null ? d.progress : (d.enrollment && d.enrollment.progress);
  if (pct != null) console.log(fmt.row('Complete', `${pct}%`));
  console.log(JSON.stringify(d, null, 2));
}

module.exports = { list, show, categories, enroll, progress };
