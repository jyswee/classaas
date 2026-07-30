# classaas-cli (`caas`)

ClassaaS from the command line. Teach without the stack.

Zero-dependency Node CLI for the [ClassaaS](https://classaas.com) e-learning platform,
following the `bgz-cli` architecture.

## Install

```bash
npm install -g .        # from this repo
caas --version
```

## Quick start

```bash
# Log in (token saved to .classaas/config.json in the current project)
caas login --email you@example.com --password 'secret'

# Point at QA instead of production
caas login --email you@example.com --password 'secret' --url https://classaas.hq.tyga.dev

# Browse
caas courses --category "tyga.games Accreditation" --limit 5
caas course some-course-slug
caas categories

# Learn
caas enroll crs_xxx
caas student
caas progress crs_xxx
caas creds
caas verify VERIFY_CODE          # public, no login needed

# Teach (host/org_admin/super_admin)
caas cohorts
caas cohort create "Malta 2026" --instructor joe@tyga.agency --courses crs_a,crs_b
caas cohort add coh_xxx --emails a@x.com,b@y.com
caas instructor grant --user joe@tyga.agency --streams foundation,buggazi
```

## Config precedence

| Priority | Token | Base URL |
|---|---|---|
| 1 | `--token TOKEN` | `--api-url URL` |
| 2 | `CLASSAAS_TOKEN` env | `CLASSAAS_URL` env |
| 3 | `.classaas/config.json` | `.classaas/config.json` |
| default | — | `https://classaas.com` |

## JSON mode

Every command accepts `--json` for raw machine-readable output.

## Agent schema

```bash
caas init --agent-schema     # machine-readable command schema (JSON)
```

## Tests

```bash
npm test
```

---
© Tyga.Cloud Ltd. ClassaaS is a division of Tyga.Cloud Ltd. All rights reserved.
