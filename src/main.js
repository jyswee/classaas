/**
 * caas CLI — ClassaaS from the command line.
 * Teach without the stack.
 */

const { loadConfig, hasFlag } = require('./config');
const { api } = require('./api');
const fmt = require('./format');

const args = process.argv.slice(2);
const command = args[0];
const subArgs = args.slice(1);

// JSON output mode
const jsonMode = hasFlag(args, 'json');

if (hasFlag(args, 'version') || command === '--version') {
  const pkg = require('../package.json');
  console.log(`caas ${pkg.version}`);
  process.exit(0);
}

if (!command || hasFlag(args, 'help') || command === '--help' || command === 'help') {
  require('./commands/init').run([]);
  process.exit(0);
}

// Load config (token + url)
const config = loadConfig(args);

// Commands that don't need auth
const noAuth = ['login', 'signup', 'logout', 'config', 'init', 'health', 'verify', 'courses', 'course', 'categories', 'help', '--help', '--version'];

if (!noAuth.includes(command) && !config.token) {
  fmt.err('Not logged in. Run: caas login --email E --password P (or set CLASSAAS_TOKEN)');
  process.exit(1);
}

// Public commands still need a client (token optional)
const client = api(config);

// Route to handlers
const handlers = {
  // Auth
  login: () => require('./commands/auth').login(subArgs, config.baseUrl),
  signup: () => require('./commands/auth').signup(subArgs, config.baseUrl),
  logout: () => require('./commands/auth').logout(),
  me: () => require('./commands/auth').me(client, jsonMode, config.source),
  config: () => require('./commands/auth').config(jsonMode, args),
  init: () => require('./commands/init').run(subArgs),

  // Health
  health: () => client.health().then(r => {
    if (jsonMode) return console.log(JSON.stringify(r, null, 2));
    fmt.ok(`${r.status || 'ok'} — ${r.service || config.baseUrl} (v${r.version || '?'}, up ${Math.round(r.uptime || 0)}s)`);
  }),

  // Catalog
  courses: () => require('./commands/courses').list(client, subArgs, jsonMode),
  course: () => require('./commands/courses').show(client, subArgs, jsonMode),
  categories: () => require('./commands/courses').categories(client, subArgs, jsonMode),
  enroll: () => require('./commands/courses').enroll(client, subArgs, jsonMode),
  progress: () => require('./commands/courses').progress(client, subArgs, jsonMode),

  // Student
  student: () => require('./commands/student').run(client, subArgs, jsonMode),
  certificates: () => require('./commands/student').certificates(client, subArgs, jsonMode),

  // Credentials
  creds: () => require('./commands/credentials').mine(client, subArgs, jsonMode),
  credentials: () => require('./commands/credentials').mine(client, subArgs, jsonMode),
  verify: () => require('./commands/credentials').verify(client, subArgs, jsonMode),

  // Bundles
  bundles: () => require('./commands/bundles').list(client, subArgs, jsonMode),
  bundle: () => require('./commands/bundles').run(client, subArgs, jsonMode),

  // Cohorts + instructors
  cohorts: () => require('./commands/cohorts').list(client, subArgs, jsonMode),
  cohort: () => require('./commands/cohorts').run(client, subArgs, jsonMode),
  instructor: () => require('./commands/cohorts').grantInstructor(client, subArgs, jsonMode),

  // Teaching (creator course management)
  teach: () => require('./commands/teach').list(client, subArgs, jsonMode),
  create: () => require('./commands/teach').create(client, subArgs, jsonMode),
  show: () => require('./commands/teach').show(client, subArgs, jsonMode),
  update: () => require('./commands/teach').update(client, subArgs, jsonMode),
  publish: () => require('./commands/teach').publish(client, subArgs, jsonMode),
  archive: () => require('./commands/teach').archive(client, subArgs, jsonMode),
  remove: () => require('./commands/teach').remove(client, subArgs, jsonMode),
  duplicate: () => require('./commands/teach').duplicate(client, subArgs, jsonMode),
  section: () => require('./commands/teach').section(client, subArgs, jsonMode),
  lesson: () => require('./commands/teach').lesson(client, subArgs, jsonMode),
  quizset: () => require('./commands/teach').quizset(client, subArgs, jsonMode),
  students: () => require('./commands/teach').students(client, subArgs, jsonMode),
  'bulk-enroll': () => require('./commands/teach').bulkEnroll(client, subArgs, jsonMode),
  analytics: () => require('./commands/teach').analytics(client, subArgs, jsonMode),

  // Live classes (video calls) — schedule/start/end/join management verbs
  video: () => require('./commands/video').run(client, subArgs, jsonMode),

  // Learning (learner side)
  learn: () => require('./commands/learn').show(client, subArgs, jsonMode),
  complete: () => require('./commands/learn').complete(client, subArgs, jsonMode),
  quiz: () => require('./commands/learn').quiz(client, subArgs, jsonMode),
  certificate: () => require('./commands/learn').certificate(client, subArgs, jsonMode),

  // Social — reviews, messaging, community
  reviews: () => require('./commands/social').reviews(client, subArgs, jsonMode),
  review: () => require('./commands/social').review(client, subArgs, jsonMode),
  inbox: () => require('./commands/social').inbox(client, subArgs, jsonMode),
  msg: () => require('./commands/social').msg(client, subArgs, jsonMode),
  broadcast: () => require('./commands/social').broadcast(client, subArgs, jsonMode),
  community: () => require('./commands/social').community(client, subArgs, jsonMode),

  // Commerce — memberships, products, coaching
  memberships: () => require('./commands/commerce').memberships(client, subArgs, jsonMode),
  products: () => require('./commands/commerce').products(client, subArgs, jsonMode),
  coaching: () => require('./commands/commerce').coaching(client, subArgs, jsonMode),

  // Money — payments, revenue, Connect, payouts, dashboards
  payments: () => require('./commands/money').payments(client, subArgs, jsonMode),
  revenue: () => require('./commands/money').revenue(client, subArgs, jsonMode),
  connect: () => require('./commands/money').connect(client, subArgs, jsonMode),
  payouts: () => require('./commands/money').payouts(client, subArgs, jsonMode),
  dashboard: () => require('./commands/money').dashboard(client, subArgs, jsonMode),

  // Admin — platform admin, org, feature flags, coupons
  admin: () => require('./commands/admin').admin(client, subArgs, jsonMode),
  org: () => require('./commands/admin').org(client, subArgs, jsonMode),
  flags: () => require('./commands/admin').flags(client, subArgs, jsonMode),
  coupons: () => require('./commands/admin').coupons(client, subArgs, jsonMode),
};

if (handlers[command]) {
  Promise.resolve(handlers[command]()).catch(e => {
    fmt.err(e.message);
    process.exit(1);
  });
} else {
  fmt.err(`Unknown command: ${command}`);
  fmt.info('Run: caas help');
  process.exit(1);
}
