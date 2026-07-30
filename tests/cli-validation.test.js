/**
 * CLI validation regression tests — bad input must exit 1;
 * valid input must reach the (mocked) API client.
 */
const test = require('node:test');
const assert = require('node:assert');

const courses = require('../src/commands/courses');
const credentials = require('../src/commands/credentials');
const cohorts = require('../src/commands/cohorts');

// A client whose every method throws — guards against network calls
// happening when validation should have failed first.
const networkGuard = new Proxy({}, {
  get: (_, prop) => () => { throw new Error(`network call attempted: ${String(prop)}`); },
});

// process.exit(1) is expected — intercept it.
function expectExit(fn) {
  const orig = process.exit;
  const origErr = console.error;
  let code = null;
  process.exit = (c) => { code = c; throw new Error('__exit__'); };
  console.error = () => {};
  try {
    return Promise.resolve()
      .then(fn)
      .then(() => { throw new Error('expected exit'); })
      .catch(e => {
        if (e.message !== '__exit__') throw e;
        assert.strictEqual(code, 1);
      })
      .finally(() => { process.exit = orig; console.error = origErr; });
  } catch (e) {
    process.exit = orig; console.error = origErr;
    if (e.message !== '__exit__') throw e;
    assert.strictEqual(code, 1);
    return Promise.resolve();
  }
}

function silence(fn) {
  const orig = console.log;
  console.log = () => {};
  return Promise.resolve().then(fn).finally(() => { console.log = orig; });
}

test('course show: no slug → exit 1',
  () => expectExit(() => courses.show(networkGuard, [], false)));

test('courses: unknown flag → exit 1',
  () => expectExit(() => courses.list(networkGuard, ['--bogus', 'x'], false)));

test('enroll: no course id → exit 1',
  () => expectExit(() => courses.enroll(networkGuard, [], false)));

test('verify: no code → exit 1',
  () => expectExit(() => credentials.verify(networkGuard, [], false)));

test('cohort create: missing instructor → exit 1',
  () => expectExit(() => cohorts.run(networkGuard, ['create', 'My Cohort'], false)));

test('cohort add: missing emails → exit 1',
  () => expectExit(() => cohorts.run(networkGuard, ['add', 'coh_x'], false)));

test('instructor grant: missing streams → exit 1',
  () => expectExit(() => cohorts.grantInstructor(networkGuard, ['grant', '--user', 'a@b.c'], false)));

test('courses list: valid flags reach catalog (guard not over-eager)', async () => {
  let captured = null;
  const client = {
    catalog: async (params) => { captured = params; return { success: true, data: [] }; },
  };
  await silence(() => courses.list(client, ['--category', 'games', '--limit', '5'], false));
  assert.ok(captured !== null, 'catalog should have been called');
  assert.ok(captured.includes('category=games'));
  assert.ok(captured.includes('limit=5'));
});

test('courses list: --q routes to search endpoint', async () => {
  let captured = null;
  const client = {
    catalogSearch: async (params) => { captured = params; return { success: true, data: [] }; },
  };
  await silence(() => courses.list(client, ['--q', 'unity'], false));
  assert.ok(captured !== null, 'catalogSearch should have been called');
  assert.ok(captured.includes('q=unity'));
});

test('verify: valid code reaches verifyCredential', async () => {
  let captured = null;
  const client = {
    baseUrl: 'https://x',
    verifyCredential: async (code) => { captured = code; return { success: true, data: { title: 'T', valid: true } }; },
  };
  await silence(() => credentials.verify(client, ['abc123'], false));
  assert.strictEqual(captured, 'abc123');
});

test('cohort create: full flags produce correct body', async () => {
  let captured = null;
  const client = {
    createCohort: async (data) => { captured = data; return { success: true, data: { cohort: { cohortId: 'coh_1' } } }; },
  };
  await silence(() => cohorts.run(client, ['create', 'Alpha', '--instructor', 'i@x.com', '--courses', 'a,b'], false));
  assert.deepStrictEqual(captured, {
    name: 'Alpha', instructorEmail: 'i@x.com', courseIds: ['a', 'b'],
  });
});
