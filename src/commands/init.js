/**
 * init — quickstart guide + machine-readable agent schema.
 */
const fmt = require('../format');
const { hasFlag } = require('../config');
const pkg = require('../../package.json');

const AGENT_SCHEMA = {
  $schema: 'classaas-cli-commands',
  version: pkg.version,
  auth: 'JWT Bearer. Get one with: caas login --email E --password P. Stored in .classaas/config.json. Env override: CLASSAAS_TOKEN, CLASSAAS_URL.',
  globalFlags: ['--json', '--token TOKEN', '--api-url URL'],
  roles: ['participant (learner)', 'host (creator)', 'org_admin', 'super_admin'],
  commands: {
    // Setup
    login: { syntax: 'caas login --email E --password P [--url URL]', alt: 'caas login --token TOKEN', auth: false },
    signup: { syntax: 'caas signup --email E --password P --first-name F --last-name L --org "School Name" [--plan basic]', auth: false, description: 'Creates a host account + organization' },
    logout: { syntax: 'caas logout', auth: false },
    me: { syntax: 'caas me' },
    config: { syntax: 'caas config', auth: false },
    health: { syntax: 'caas health', auth: false },

    // Catalog
    courses: { syntax: 'caas courses [--q text] [--category X] [--difficulty X] [--pricing free|paid] [--sort newest|popular] [--page N] [--limit N]', auth: false },
    course: { syntax: 'caas course SLUG', auth: false },
    categories: { syntax: 'caas categories', auth: false },
    enroll: { syntax: 'caas enroll COURSE_ID' },
    progress: { syntax: 'caas progress COURSE_ID' },

    // Learner
    student: { syntax: 'caas student [--status active] [--page N]' },
    certificates: { syntax: 'caas certificates' },
    learn: { syntax: 'caas learn COURSE_ID', description: 'Course content + my progress (✓ per lesson)' },
    complete: { syntax: 'caas complete COURSE_ID --lesson LESSON_ID --section SECTION_ID [--time SECONDS]' },
    quiz: { syntax: 'caas quiz COURSE_ID QUIZ_ID [--answers 1,0,2] [--attempts]', description: 'No flags = show questions; --answers submits; --attempts shows history' },
    certificate: { syntax: 'caas certificate COURSE_ID', description: 'Claim/fetch certificate for a completed course' },
    creds: { syntax: 'caas creds', description: 'My accreditation credentials (badges/tier/full)' },
    verify: { syntax: 'caas verify CODE', auth: false, description: 'Public credential verification' },

    // Bundles
    bundles: { syntax: 'caas bundles [--mine]' },
    bundle: { syntax: 'caas bundle SLUG | caas bundle enroll BUNDLE_ID' },

    // Teaching (creator)
    teach: { syntax: 'caas teach [--status draft|published|archived] [--page N]', roles: ['host', 'org_admin', 'super_admin'], description: 'List my courses' },
    create: { syntax: 'caas create "Title" [-d DESC] [--category X] [--price CENTS] [--currency usd] [--difficulty X] [--tags a,b]', roles: ['host', 'org_admin', 'super_admin'] },
    show: { syntax: 'caas show COURSE_ID', roles: ['host', 'org_admin', 'super_admin'], description: 'Course detail + sections/lessons tree with IDs' },
    update: { syntax: 'caas update COURSE_ID [--title T] [-d DESC] [--category X] [--price CENTS]', roles: ['host', 'org_admin', 'super_admin'] },
    publish: { syntax: 'caas publish COURSE_ID', roles: ['host', 'org_admin', 'super_admin'] },
    archive: { syntax: 'caas archive COURSE_ID', roles: ['host', 'org_admin', 'super_admin'] },
    remove: { syntax: 'caas remove COURSE_ID', roles: ['host', 'org_admin', 'super_admin'] },
    duplicate: { syntax: 'caas duplicate COURSE_ID [--title "New title"]', roles: ['host', 'org_admin', 'super_admin'] },
    section: { syntax: 'caas section add COURSE_ID "Title" | caas section update COURSE_ID SECTION_ID --title T | caas section rm COURSE_ID SECTION_ID', roles: ['host', 'org_admin', 'super_admin'] },
    lesson: { syntax: 'caas lesson add COURSE_ID SECTION_ID "Title" [--type text|video|quiz] [--content TEXT] [--duration MIN] | caas lesson update COURSE_ID SECTION_ID LESSON_ID ... | caas lesson rm COURSE_ID SECTION_ID LESSON_ID', roles: ['host', 'org_admin', 'super_admin'] },
    quizset: { syntax: 'caas quizset set COURSE_ID SECTION_ID LESSON_ID --questions JSON [--passing 70] [--title T] | caas quizset show ... | caas quizset rm ...', roles: ['host', 'org_admin', 'super_admin'] },
    students: { syntax: 'caas students COURSE_ID [--q text] [--page N]', roles: ['host', 'org_admin', 'super_admin'] },
    'bulk-enroll': { syntax: 'caas bulk-enroll COURSE_ID --emails a@x.com,b@y.com', roles: ['host', 'org_admin', 'super_admin'] },
    analytics: { syntax: 'caas analytics [COURSE_ID] [--engagement]', roles: ['host', 'org_admin', 'super_admin'] },

    // Cohorts + instructors
    cohorts: { syntax: 'caas cohorts', roles: ['host', 'org_admin', 'super_admin'] },
    cohort: {
      syntax: 'caas cohort show ID | caas cohort create "name" --instructor EMAIL [--courses id1,id2] [--starts ISO] [--ends ISO] | caas cohort add ID --emails a,b',
      roles: ['host', 'org_admin', 'super_admin'],
    },
    instructor: { syntax: 'caas instructor grant --user EMAIL_OR_ID --streams s1,s2', roles: ['org_admin', 'super_admin'] },

    // Social
    reviews: { syntax: 'caas reviews COURSE_ID', auth: false },
    review: { syntax: 'caas review COURSE_ID --stars 5 -m "Great" | caas review reply REVIEW_ID -m "Thanks" | caas review delete REVIEW_ID' },
    inbox: { syntax: 'caas inbox', description: 'List conversations' },
    msg: { syntax: 'caas msg CONV_ID ["message text"]', description: 'Show messages, or send if text given' },
    broadcast: { syntax: 'caas broadcast COURSE_ID "message to all students"', roles: ['host', 'org_admin', 'super_admin'], description: 'Opens the course broadcast channel and posts into it' },
    community: { syntax: 'caas community [--category ID] | caas community categories | caas community post "Title" -m "body" [--category ID] | caas community show POST_ID | caas community reply POST_ID "text" | caas community upvote POST_ID | caas community category create "name" (org_admin)' },

    // Commerce
    memberships: { syntax: 'caas memberships [--mine|--public] | caas memberships create "Name" --price CENTS --interval month | caas memberships subscribe ID | caas memberships cancel SUB_ID' },
    products: { syntax: 'caas products [--mine|--public] | caas products create "Name" --price CENTS [--file-url URL]' },
    coaching: { syntax: 'caas coaching [--mine|--public] | caas coaching create "Name" --price CENTS [--duration MIN] [--sessions N]' },

    // Money
    payments: { syntax: 'caas payments [--page N] [--status completed]' },
    revenue: { syntax: 'caas revenue [--from YYYY-MM-DD] [--to YYYY-MM-DD]', roles: ['host', 'org_admin', 'super_admin'], description: 'Defaults to last 30 days' },
    connect: { syntax: 'caas connect [create|link]', roles: ['host', 'org_admin', 'super_admin'], description: 'Stripe Connect status / onboarding' },
    payouts: { syntax: 'caas payouts [ID] [--pending|--summary] | caas payouts cancel ID', roles: ['host', 'org_admin', 'super_admin'] },
    dashboard: { syntax: 'caas dashboard [--forecast|--customers|--payments]', roles: ['host', 'org_admin', 'super_admin'] },

    // Admin
    admin: { syntax: 'caas admin [stats|users|orgs|health] | caas admin bootstrap (promote self to super_admin on a fresh platform — closes once one exists) | caas admin migrate [--force|--dry-run] (seed course catalogue) | caas admin scaffold (build accreditation programme)', roles: ['super_admin'] },
    org: { syntax: 'caas org [--domain example.com]', roles: ['org_admin', 'super_admin'] },
    flags: { syntax: 'caas flags | caas flags create NAME [--enabled true] | caas flags update ID --enabled false | caas flags rm ID', roles: ['super_admin'] },
    coupons: { syntax: 'caas coupons | caas coupons create CODE --percent 20 | caas coupons validate CODE [--course ID] | caas coupons rm ID', roles: ['host', 'org_admin', 'super_admin'] },
  },
};

function run(args) {
  if (hasFlag(args, 'agent-schema')) {
    console.log(JSON.stringify(AGENT_SCHEMA, null, 2));
    return;
  }

  const C = fmt.C;
  console.log(`${C.bold}${C.orange}caas${C.reset} — ClassaaS from the command line. Teach without the stack.

${C.bold}SETUP${C.reset}
  caas login --email you@co --password pw     Log in (token → .classaas/config.json)
  caas signup --email E --password P --first-name F --last-name L --org "School"
  caas me                                     Who am I
  caas config                                 Show active config
  caas health                                 API health check

${C.bold}CATALOG${C.reset}
  caas courses [--q text] [--category X]      Browse published courses
  caas course SLUG                            Course detail
  caas categories                             Category list
  caas enroll COURSE_ID                       Enroll (free courses)

${C.bold}LEARNING${C.reset}
  caas student                                My enrolled courses + stats
  caas learn COURSE_ID                        Course content + my progress
  caas complete COURSE_ID --lesson L --section S   Mark lesson complete
  caas quiz COURSE_ID QUIZ_ID [--answers 1,0,2]    View / submit quiz
  caas certificate COURSE_ID                  Claim certificate
  caas certificates                           My certificates
  caas creds                                  My accreditation credentials
  caas verify CODE                            Verify any credential (public)

${C.bold}TEACHING${C.reset} ${C.dim}(host/org_admin/super_admin)${C.reset}
  caas teach                                  List my courses
  caas create "Title" [--price CENTS]         Create course
  caas show COURSE_ID                         Course + curriculum tree
  caas publish|archive|remove|duplicate ID    Lifecycle
  caas section add COURSE_ID "Title"          Add section
  caas lesson add COURSE_ID SECTION_ID "T"    Add lesson (--type text|video|quiz)
  caas quizset set C S L --questions JSON     Attach quiz to lesson
  caas students COURSE_ID                     Enrolled students
  caas bulk-enroll COURSE_ID --emails a,b     Bulk enroll
  caas analytics [COURSE_ID]                  Course / engagement analytics
  caas broadcast COURSE_ID "text"             Message all students

${C.bold}COHORTS${C.reset}
  caas cohorts | caas cohort show ID          List / detail
  caas cohort create "name" --instructor E    Create cohort
  caas cohort add ID --emails a,b             Add members (auto-enrols)
  caas instructor grant --user E --streams s  Grant certified-instructor

${C.bold}SOCIAL${C.reset}
  caas reviews COURSE_ID                      List reviews
  caas review COURSE_ID --stars 5 -m "..."    Leave a review
  caas inbox | caas msg CONV_ID ["text"]      Messaging
  caas community [post|reply|show|upvote]     Community forum

${C.bold}COMMERCE${C.reset}
  caas memberships | products | coaching      List (--mine / --public / create ...)
  caas bundles [--mine] | caas bundle SLUG    Bundles

${C.bold}MONEY${C.reset} ${C.dim}(creator)${C.reset}
  caas payments | caas revenue                Payments / revenue analytics
  caas connect [create|link]                  Stripe Connect onboarding
  caas payouts [--pending|--summary]          Payouts
  caas dashboard [--forecast|--customers]     Business dashboards
  caas coupons [create CODE --percent 20]     Coupons

${C.bold}ADMIN${C.reset} ${C.dim}(super_admin)${C.reset}
  caas admin [stats|users|orgs|health]        Platform admin
  caas admin bootstrap                        First-admin self-promote (fresh platform only)
  caas admin migrate [--force|--dry-run]      Seed course catalogue
  caas admin scaffold                         Build accreditation programme
  caas org [--domain example.com]             My organization
  caas flags                                  Feature flags

${C.dim}Global flags: --json  --token TOKEN  --api-url URL
Env: CLASSAAS_TOKEN, CLASSAAS_URL
Agent schema: caas init --agent-schema${C.reset}`);
}

module.exports = { run };
