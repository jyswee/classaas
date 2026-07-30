/**
 * Cohorts + certified-instructor management (host/org_admin/super_admin).
 */
const fmt = require('../format');
const { getFlag, positionalArgs, validateFlags } = require('../config');

async function list(client, args, json) {
  validateFlags(args, [], 'caas cohorts');
  const result = await client.cohorts();
  if (json) return console.log(JSON.stringify(result, null, 2));
  const cohorts = (result.data && result.data.cohorts) || [];
  if (!cohorts.length) return fmt.info('No cohorts.');
  fmt.heading('Cohorts');
  cohorts.forEach(c => console.log(fmt.cohortLine(c)));
  console.log(fmt.count(cohorts.length, 'cohort'));
}

async function run(client, args, json) {
  const sub = args[0];

  if (sub === 'show') {
    validateFlags(args, [], 'caas cohort show COHORT_ID');
    const id = positionalArgs(args.slice(1))[0];
    if (!id) { fmt.err('Usage: caas cohort show COHORT_ID'); process.exit(1); }
    const result = await client.cohort(id);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const c = result.data && result.data.cohort;
    if (!c) return fmt.err('Cohort not found');
    fmt.heading(c.name);
    console.log(fmt.row('ID', `${fmt.C.orange}${c.cohortId}${fmt.C.reset}`));
    console.log(fmt.row('Status', fmt.status(c.status)));
    const inst = c.instructorId || {};
    console.log(fmt.row('Instructor', inst.email || String(inst)));
    console.log(fmt.row('Members', String((c.members || []).length)));
    console.log(fmt.row('Courses', (c.courseIds || []).map(x => x.slug || x.title || x).join(', ') || '--'));
    if (c.startsAt) console.log(fmt.row('Starts', new Date(c.startsAt).toLocaleDateString()));
    if (c.endsAt) console.log(fmt.row('Ends', new Date(c.endsAt).toLocaleDateString()));
    return;
  }

  if (sub === 'create') {
    validateFlags(args, ['instructor', 'description', 'courses', 'starts', 'ends', 'org'],
      'caas cohort create "name" --instructor EMAIL [--courses id1,id2] [--starts ISO] [--ends ISO]');
    const name = positionalArgs(args.slice(1))[0];
    const instructorEmail = getFlag(args, 'instructor');
    if (!name || !instructorEmail || instructorEmail === true) {
      fmt.err('Usage: caas cohort create "name" --instructor EMAIL');
      process.exit(1);
    }
    const data = { name, instructorEmail };
    const desc = getFlag(args, 'description');
    const courses = getFlag(args, 'courses');
    const starts = getFlag(args, 'starts');
    const ends = getFlag(args, 'ends');
    const org = getFlag(args, 'org');
    if (desc && desc !== true) data.description = desc;
    if (courses && courses !== true) data.courseIds = courses.split(',').map(s => s.trim());
    if (starts && starts !== true) data.startsAt = starts;
    if (ends && ends !== true) data.endsAt = ends;
    if (org && org !== true) data.organizationId = org;
    const result = await client.createCohort(data);
    if (json) return console.log(JSON.stringify(result, null, 2));
    const c = result.data && result.data.cohort;
    fmt.ok(`Created ${c ? c.cohortId : ''}`);
    return;
  }

  if (sub === 'add') {
    validateFlags(args, ['emails'], 'caas cohort add COHORT_ID --emails a@x.com,b@y.com');
    const id = positionalArgs(args.slice(1))[0];
    const emails = getFlag(args, 'emails');
    if (!id || !emails || emails === true) {
      fmt.err('Usage: caas cohort add COHORT_ID --emails a@x.com,b@y.com');
      process.exit(1);
    }
    const result = await client.addCohortMembers(id, { emails: emails.split(',').map(s => s.trim()) });
    if (json) return console.log(JSON.stringify(result, null, 2));
    fmt.ok(result.message || 'Members added');
    const d = result.data || {};
    if (d.notFound && d.notFound.length) fmt.warn(`Not found: ${d.notFound.join(', ')}`);
    return;
  }

  fmt.err('Usage: caas cohort show|create|add …');
  process.exit(1);
}

async function grantInstructor(client, args, json) {
  validateFlags(args, ['user', 'streams'], 'caas instructor grant --user EMAIL_OR_ID --streams s1,s2');
  if (args[0] !== 'grant') {
    fmt.err('Usage: caas instructor grant --user EMAIL_OR_ID --streams s1,s2');
    process.exit(1);
  }
  const user = getFlag(args, 'user');
  const streams = getFlag(args, 'streams');
  if (!user || user === true || !streams || streams === true) {
    fmt.err('Usage: caas instructor grant --user EMAIL_OR_ID --streams s1,s2');
    process.exit(1);
  }
  const result = await client.grantInstructor({ userId: user, streams: streams.split(',').map(s => s.trim()) });
  if (json) return console.log(JSON.stringify(result, null, 2));
  fmt.ok(result.message || 'Instructor certification granted');
}

module.exports = { list, run, grantInstructor };
