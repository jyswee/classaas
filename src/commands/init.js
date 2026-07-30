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
  commands: {
    login: { syntax: 'caas login --email E --password P [--url URL]', alt: 'caas login --token TOKEN', auth: false },
    logout: { syntax: 'caas logout', auth: false },
    me: { syntax: 'caas me' },
    config: { syntax: 'caas config', auth: false },
    health: { syntax: 'caas health', auth: false },
    courses: { syntax: 'caas courses [--q text] [--category X] [--difficulty X] [--pricing free|paid] [--sort newest|popular] [--page N] [--limit N]', auth: false },
    course: { syntax: 'caas course SLUG', auth: false },
    categories: { syntax: 'caas categories', auth: false },
    enroll: { syntax: 'caas enroll COURSE_ID' },
    progress: { syntax: 'caas progress COURSE_ID' },
    student: { syntax: 'caas student [--status active] [--page N]' },
    certificates: { syntax: 'caas certificates' },
    creds: { syntax: 'caas creds', description: 'My accreditation credentials (badges/tier/full)' },
    verify: { syntax: 'caas verify CODE', auth: false, description: 'Public credential verification' },
    bundles: { syntax: 'caas bundles [--mine]' },
    bundle: { syntax: 'caas bundle SLUG | caas bundle enroll BUNDLE_ID' },
    cohorts: { syntax: 'caas cohorts', roles: ['host', 'org_admin', 'super_admin'] },
    cohort: {
      syntax: 'caas cohort show ID | caas cohort create "name" --instructor EMAIL [--courses id1,id2] [--starts ISO] [--ends ISO] | caas cohort add ID --emails a,b',
      roles: ['host', 'org_admin', 'super_admin'],
    },
    instructor: { syntax: 'caas instructor grant --user EMAIL_OR_ID --streams s1,s2', roles: ['org_admin', 'super_admin'] },
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
  caas login --token JWT                      Save an existing token
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
  caas progress COURSE_ID                     Progress in a course
  caas certificates                           My certificates
  caas creds                                  My accreditation credentials
  caas verify CODE                            Verify any credential (public)

${C.bold}BUNDLES${C.reset}
  caas bundles [--mine]                       Public (or my) bundles
  caas bundle SLUG                            Bundle detail
  caas bundle enroll BUNDLE_ID                Enroll in bundle

${C.bold}TEACHING${C.reset} ${C.dim}(host/org_admin/super_admin)${C.reset}
  caas cohorts                                List cohorts
  caas cohort show ID                         Cohort detail
  caas cohort create "name" --instructor E    Create cohort
  caas cohort add ID --emails a,b             Add members (auto-enrols)
  caas instructor grant --user E --streams s  Grant certified-instructor

${C.dim}Global flags: --json  --token TOKEN  --api-url URL
Env: CLASSAAS_TOKEN, CLASSAAS_URL
Agent schema: caas init --agent-schema${C.reset}`);
}

module.exports = { run };
