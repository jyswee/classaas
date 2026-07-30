/**
 * Student dashboard: my courses, stats, certificates.
 */
const fmt = require('../format');
const { getFlag, validateFlags } = require('../config');

async function run(client, args, json) {
  validateFlags(args, ['page', 'limit', 'status'], 'caas student [--status active] [--page N]');

  const params = new URLSearchParams();
  for (const k of ['page', 'limit', 'status']) {
    const v = getFlag(args, k);
    if (v && v !== true) params.set(k, v);
  }

  const [coursesRes, statsRes] = await Promise.all([
    client.myCourses(params.toString()),
    client.myStats().catch(() => null),
  ]);

  if (json) return console.log(JSON.stringify({ courses: coursesRes, stats: statsRes }, null, 2));

  if (statsRes && statsRes.data) {
    const s = statsRes.data;
    fmt.heading('My Learning');
    if (s.totalCourses != null) console.log(fmt.row('Courses', String(s.totalCourses)));
    if (s.completedCourses != null) console.log(fmt.row('Completed', String(s.completedCourses)));
    if (s.inProgressCourses != null) console.log(fmt.row('In progress', String(s.inProgressCourses)));
    console.log('');
  }

  const items = (coursesRes.data && (coursesRes.data.courses || coursesRes.data.enrollments)) || coursesRes.data || [];
  if (!Array.isArray(items) || !items.length) return fmt.info('No enrolled courses.');

  fmt.heading('Enrolled Courses');
  items.forEach(e => {
    const c = e.course || e;
    const pct = e.progress != null ? e.progress : (e.enrollment && e.enrollment.progress);
    const pctStr = pct != null ? fmt.pad(`${fmt.C.cyan}${Math.round(pct)}%${fmt.C.reset}`, 6) : fmt.pad('', 6);
    console.log(`${pctStr} ${fmt.courseLine(c)}`);
  });
  console.log(fmt.count(items.length, 'course'));
}

async function certificates(client, args, json) {
  validateFlags(args, [], 'caas certificates');
  const result = await client.myCertificates();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const certs = (result.data && (result.data.certificates || result.data)) || [];
  if (!Array.isArray(certs) || !certs.length) return fmt.info('No certificates yet.');
  fmt.heading('Certificates');
  certs.forEach(c => console.log(`  ${fmt.C.orange}${c.certificateId || c.id || ''}${fmt.C.reset} ${c.courseTitle || c.title || ''}`));
}

module.exports = { run, certificates };
