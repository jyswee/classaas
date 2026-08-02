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

# Learn deeper
caas learn crs_xxx                              # curriculum + my progress
caas complete crs_xxx --lesson les_a --section sec_b
caas quiz crs_xxx qz_y --answers 1,0,2
caas certificate crs_xxx

# Teach (host/org_admin/super_admin)
caas teach                                      # my courses
caas create "My Course" --price 4900 --category technology
caas section add crs_xxx "Module 1"
caas lesson add crs_xxx sec_a "Intro" --type text --content "Welcome"
caas publish crs_xxx
caas students crs_xxx
caas bulk-enroll crs_xxx --emails a@x.com,b@y.com
caas analytics crs_xxx
caas broadcast crs_xxx "New lesson is live!"

# Cohorts
caas cohorts
caas cohort create "Malta 2026" --instructor joe@tyga.agency --courses crs_a,crs_b
caas cohort add coh_xxx --emails a@x.com,b@y.com
caas instructor grant --user joe@tyga.agency --streams foundation,buggazi

# Social
caas reviews crs_xxx
caas review crs_xxx --stars 5 -m "Great course"
caas inbox
caas msg conv_xxx "Hello!"
caas community create "Study Group" -d "Weekly Q&A"

# Commerce
caas memberships --public
caas products create "Ebook" --price 1900 --file-url https://...
caas coaching create "1:1 Mentoring" --price 15000 --duration 60

# Money (creator)
caas connect            # Stripe Connect status
caas payments
caas revenue
caas payouts --summary
caas dashboard --forecast
caas coupons create LAUNCH20 --percent 20

# Admin (super_admin)
caas admin stats
caas flags
caas org --domain school.example.com
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
