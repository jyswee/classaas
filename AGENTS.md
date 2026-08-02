# ClassaaS Integration

ClassaaS is an agent-first e-learning platform ("Teach without the stack"). This project ships the `caas` CLI so you (the agent) can run an entire school — create courses, enroll students, grade quizzes, message cohorts, and manage revenue — without a human clicking through dashboards.

## Setup (one-time)

```bash
npm install -g classaas-cli
caas login --email you@school.com --password 'secret'          # production
caas login --email ... --password ... --url https://classaas.hq.tyga.dev   # QA
```

Token is saved to `.classaas/config.json` and auto-loaded. Env overrides: `CLASSAAS_TOKEN`, `CLASSAAS_URL`.

No CLI (Claude Web, Raycast, other web agents)? Use the remote MCP server instead, same JWT:
URL: `https://mcp.classaas.com/sse` (Authorization: Bearer YOUR_TOKEN)

## Every session: load the schema FIRST

```bash
caas init --agent-schema
```

Returns the authoritative JSON of EVERY command and valid flag. It is the source of truth: if a command or flag is not in the schema, do not use it. Then run `caas me` to confirm your identity and role.

## Roles

- `participant` — learner: enroll, learn, quiz, certificate, review
- `host` — creator: everything under TEACHING + MONEY
- `org_admin` — host + organization management (`caas org`)
- `super_admin` — everything + `caas admin`, `caas flags`

Commands are role-gated server-side; a 403 means your token's role can't do that — don't retry.

## Operating rhythm: you are the school operator

- BUILD: `caas create` → `caas section add` → `caas lesson add` → `caas quizset set` → `caas publish`. A course needs at least one section+lesson before publishing; paid courses need Stripe Connect complete (`caas connect`).
- ENROLL: `caas bulk-enroll COURSE --emails ...` or cohorts (`caas cohort create` + `caas cohort add` auto-enrolls into the cohort's courses).
- TEACH: watch `caas students COURSE` and `caas analytics COURSE`; nudge stragglers with `caas msg` or `caas broadcast COURSE "..."`.
- LEARN (as a student token): `caas learn COURSE` shows curriculum + ✓ progress; `caas complete` needs BOTH `--lesson` and `--section`; `caas quiz C Q --answers 1,0,2` submits; `caas certificate COURSE` claims.
- SELL: `caas memberships|products|coaching create`, `caas coupons create CODE --percent N`, bundles via `caas bundles`.
- MONEY: `caas connect` before publishing paid content; `caas revenue`, `caas payouts --summary`, `caas dashboard --forecast` for the business picture.
- CREDENTIAL: `caas creds` (mine), `caas verify CODE` (public, no auth) for third-party verification.

## Conventions

- Every command accepts `--json` for raw machine-readable output — prefer it when parsing.
- API envelope is always `{ success, message, data }`.
- IDs are prefixed: `crs_` course, `enr_` enrollment, `qz_` quiz, `pay_` payment, `coh_` cohort.
- Prices are integer CENTS (`--price 4900` = 49.00).
- Quiz answers are zero-based option indices (`--answers 1,0,2`).
