# caas

[![npm version](https://img.shields.io/npm/v/classaas.svg)](https://www.npmjs.com/package/classaas)
[![Remote MCP](https://img.shields.io/badge/MCP-76_tools-blue)](#mcp-server--76-tools-zero-install)
[![Live classes](https://img.shields.io/badge/live_classes-tokenless_join-f97316)](#live-classes--zoom-without-zoom)

**Your whole academy from the command line — courses, live classes, cohorts, verifiable credentials and payouts. As easy as git.**

> **Teach without the stack.**

Launching a course used to mean stitching five subscriptions together — Teachable for the content, Zoom for the live sessions, Calendly for the scheduling, Intercom for the support, Xero for the payouts — and *you* were the glue. ClassaaS is that whole stack in one platform, and `caas` puts it in your terminal: your agent builds the curriculum, publishes it, runs the live class, enrolls the cohort, and gets you paid — without opening a browser.

**Works with:** Claude Code · Cursor · Cline · Windsurf · Aider · Codex · any MCP client

[![caas — build a course from the terminal](https://prodmedia.tyga.host/public/tyga.cloud/landing/classaas.com/demos/build.gif)](https://classaas.com/#demo)

*Real terminal sessions, real dashboards — [see all six workflows on classaas.com](https://classaas.com/#demo).*

## Install

```bash
npm i -g classaas
```

The npm package is `classaas`; the command is `caas`.

## Quick Start

```bash
# Log in (token saved to .classaas/config.json in the current project)
caas login --email you@example.com --password 'secret'

# Build a course
caas create "Intro to Unity" --price 4900 --category technology
caas section add crs_xxx "Module 1"
caas lesson add crs_xxx sec_a "Welcome" --type text --content "Let's begin"
caas publish crs_xxx

# Run a live class — prints a tokenless join link
caas video schedule --title "Office Hours" --now
caas video start mtg_xxx

# Full reference
caas --help
```

## One platform, not five subscriptions

Your content, your live room, your scheduling, your support and your money — one login, one bill, one CLI. No Zoom account to provision, no Calendly to wire up, no Xero export to reconcile.

| You were paying for | ClassaaS gives you |
|---|---|
| Teachable / Kajabi | Courses, curriculum, quizzes, certificates |
| Zoom | Live classes with a tokenless join link |
| Calendly | Scheduled sessions + cohorts |
| Intercom | Reviews, inbox, communities |
| Stripe + Xero | Stripe Connect payouts, revenue, coupons, forecasts |

## Build a course — curriculum, not just a landing page

A course is sections, lessons, quizzes and a certificate — not a checkout page with a video behind it. Your agent assembles the whole thing and ships it.

```bash
caas create "Intro to Unity" --price 4900 --category technology
caas section add crs_xxx "Module 1"
caas lesson add crs_xxx sec_a "Physics basics" --type text --content "..."
caas quiz crs_xxx qz_y --answers 1,0,2      # author + preview
caas publish crs_xxx
caas students crs_xxx                        # who's enrolled
caas bulk-enroll crs_xxx --emails a@x.com,b@y.com
caas analytics crs_xxx                       # completion, revenue, engagement
```

Free courses publish instantly. Paid courses require Stripe Connect onboarding first (`caas connect`) — so you can never sell before you can be paid.

## Live classes — Zoom, without Zoom

Schedule it, start it, and hand out the link. The join URL carries **no token** — access is re-checked from each viewer's own session on connect, so a link that leaks into a browser history or a chat log is still not a key.

```bash
caas video schedule --title "Office Hours" --at 2026-09-01T14:00Z --duration 60
caas video schedule --title "Ask me anything" --now      # instant class
caas video list --scheduled
caas video start mtg_xxx        # marks active, prints the tokenless join link
caas video join mtg_xxx         # room link for an already-running class
caas video end mtg_xxx
caas video analytics
```

[![caas — schedule and run a live class](https://prodmedia.tyga.host/public/tyga.cloud/landing/classaas.com/demos/live.gif)](https://classaas.com/#demo)

## Cohorts — teach groups, grant instructors

Run a class as a cohort: one roster, one instructor, many courses. Grant teaching rights across streams without making everyone an admin.

```bash
caas cohort create "Malta 2026" --instructor joe@tyga.agency --courses crs_a,crs_b
caas cohort add coh_xxx --emails a@x.com,b@y.com
caas instructor grant --user joe@tyga.agency --streams foundation,accreditation
caas cohorts
```

[![caas — track cohort enrollments and progress](https://prodmedia.tyga.host/public/tyga.cloud/landing/classaas.com/demos/cohorts.gif)](https://classaas.com/#demo)

## Learn — enroll, progress, verifiable credentials

The learner side is a first-class CLI too. Enroll, work through the curriculum, sit the quiz, and earn a credential anyone can verify — no login required to check it.

```bash
caas enroll crs_xxx
caas learn crs_xxx                                   # curriculum + my progress
caas complete crs_xxx --lesson les_a --section sec_b
caas quiz crs_xxx qz_y --answers 1,0,2
caas certificate crs_xxx
caas verify VERIFY_CODE                              # public — proves a credential is real
```

[![caas — learn, complete lessons and earn a credential](https://prodmedia.tyga.host/public/tyga.cloud/landing/classaas.com/demos/learn.gif)](https://classaas.com/#demo)

## Commerce — sell more than courses

Memberships, digital products and 1:1 coaching, all from the same account and the same payout pipeline.

```bash
caas memberships --public
caas products create "Course Ebook" --price 1900 --file-url https://...
caas coaching create "1:1 Mentoring" --price 15000 --duration 60
```

## Get paid — Stripe Connect, payouts, forecasts

Destination charges on the platform account, a flat platform fee, and everything queryable from the terminal. No dashboard tab-hopping to see where the money is.

```bash
caas connect            # Stripe Connect status / onboarding link
caas revenue
caas payouts --summary
caas dashboard --forecast
caas coupons create LAUNCH20 --percent 20
```

[![caas — Stripe Connect payouts and revenue](https://prodmedia.tyga.host/public/tyga.cloud/landing/classaas.com/demos/paid.gif)](https://classaas.com/#demo)

## Community & messaging

Reviews, a shared inbox and communities keep the conversation on your platform instead of a fourth SaaS tab.

```bash
caas reviews crs_xxx
caas review crs_xxx --stars 5 -m "Great course"
caas inbox
caas msg conv_xxx "Welcome aboard!"
caas community create "Study Group" -d "Weekly Q&A"
caas broadcast crs_xxx "New lesson is live!"
```

[![caas — built-in community and messaging](https://prodmedia.tyga.host/public/tyga.cloud/landing/classaas.com/demos/community.gif)](https://classaas.com/#demo)

## MCP Server — 76 tools, zero install

Prefer tools over a CLI? Claude Web, Claude Desktop, Raycast, or any hosted MCP client can connect straight to the ClassaaS remote MCP server — the whole platform as **76 native tools**, nothing to install:

```
URL:  https://mcp.classaas.com/sse
Auth: Authorization: Bearer YOUR_JWT
```

No token? Connect anyway: the session starts in onboarding mode with `classaas_get_started` and `classaas_login`, and a successful login unlocks all 76 tools in place.

## Config precedence

| Priority | Token | Base URL |
|---|---|---|
| 1 | `--token TOKEN` | `--api-url URL` |
| 2 | `CLASSAAS_TOKEN` env | `CLASSAAS_URL` env |
| 3 | `.classaas/config.json` | `.classaas/config.json` |
| default | — | `https://classaas.com` |

Config is per-project and auto-loaded from `.classaas/config.json`. Add `.classaas/` to your `.gitignore`. Every command accepts `--json` for raw machine-readable output.

## Agent Integration

Add to your CLAUDE.md, .cursorrules, .clinerules, .windsurfrules, or AGENTS.md:

```
## ClassaaS
This project uses ClassaaS to build and run courses. Use the `caas` CLI.
Config is in .classaas/config.json (auto-loaded).
If not configured: caas login --email E --password P

Run `caas init --agent-schema` — it returns every command + valid flags.
This is the single source of truth: if it is not in the schema, do not use it.
```

## Features

- **Courses** — sections, lessons, quizzes, certificates; free or paid
- **Live classes** — schedule/start/join/end with a tokenless join link, plus analytics
- **Cohorts** — group rosters, multi-course, instructor grants
- **Learning** — enroll, progress, quizzes, verifiable public credentials
- **Commerce** — memberships, digital products, 1:1 coaching
- **Money** — Stripe Connect payouts, revenue, coupons, forecasting dashboards
- **Community** — reviews, inbox, communities, broadcasts
- **Remote MCP** — 76 tools at `mcp.classaas.com`: Claude Web, Cursor, Raycast, any MCP client
- **Agent-first** — `caas init --agent-schema` is the single source of truth for every command and flag

**Pricing:** Free to start. See [classaas.com](https://classaas.com) for plan details.

## Why this exists

Teachers shouldn't have to become sysadmins to teach. The stack — one tool for content, another for video, another for scheduling, another for money — turns every course launch into an integration project. So we built the platform that *is* the stack, and gave it a CLI the agent can run itself. It's early and we iterate fast: if something's rough or missing, [open an issue](https://github.com/jyswee/classaas/issues) — we read every one.

## Documentation

- [ClassaaS](https://classaas.com)
- `caas --help` — full command reference
- `caas init --agent-schema` — machine-readable schema

## License

Proprietary — Tyga.Cloud Ltd. See [LICENSE](./LICENSE). ClassaaS is a division of Tyga.Cloud Ltd. All rights reserved.
