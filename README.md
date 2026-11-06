# vibe-coding-app

vibe-coding-app turns a plain-English app idea into a live, verified
application on Render. You type "Build a website for a local barbershop", and a
few minutes later you have a public URL. When the idea needs saved data, you
also get an API and a Postgres database, all wired together and smoke-tested.

It is a reference app: real, running TypeScript that shows how Render
Workflows, Sandboxes, Blueprints, Postgres, and the read-only Render MCP server
fit together in an agent product.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy-template/api/github/start?template_repo=vibe-coding-app)

Before you deploy, prepare:

- a Render workspace with Workflows and
  [Sandboxes early access](https://render.com/docs/sandboxes);
- an empty GitHub repository for generated apps, with the
  [Render GitHub app](https://github.com/apps/render) installed on it so
  Render can read the repository for Blueprint sync;
- a separate GitHub App or fine-grained token with Contents: write on that
  repository, which the factory uses to push generated apps;
- Anthropic and Render API keys, plus the Render workspace ID; and
- a lowercase UI username and a UI password of at least 16 characters.

After the factory deploys, run `npm run setup:apps-repo` and complete the
[one-time apps Blueprint step](docs/0_QUICKSTART.md#3-connect-the-apps-blueprint).

## Why it matters

Most "prompt to app" demos stop at generated code or a preview. Shipping
that code as a real multi-service deployment raises harder questions:

- Where does untrusted, model-written code run, and what can it reach?
- How do you keep the model away from your GitHub token and cloud API keys?
- How does an agent create infrastructure without being able to create
  *anything*?
- How do you know the deployed app works, not just that it built?

This repository answers each of those in code. Agents write and run code only
in a disposable Render Sandbox that holds no credentials. Infrastructure is
created only by committing a Render Blueprint, never by an agent calling an
API. Every app is built, migrated, booted, and queried before it is published,
and checked again at its public URL after Render deploys it.

It is written for engineers building AI app builders, coding agents, or
internal platforms on Render, and for anyone who wants a working example of
those boundaries to read and adapt. It is a demonstration, not a multi-tenant
product: see [Current limitations](docs/0_QUICKSTART.md#current-limitations).

## Architecture at a glance

```text
 User ──▶ Gateway ───────────▶ Workflows: prompt-to-app ─────▶ Sandbox
          (web service)        agents, verify, publish          (build and verify)
             │                    │             │
             └──▶ Factory DB ◀────┘             ▼
                  (Postgres)          Apps repository (GitHub)
                                                │  Blueprint auto-sync
                                                ▼
                                Deployed app (site, API, Postgres)
```

| Component | Render primitive | Role |
| --- | --- | --- |
| Gateway | Web service (Docker) | Authenticates callers, records runs, and starts tasks. It has no model key or GitHub credential, but it does hold the Render API key used for task dispatch. |
| Factory DB | Managed Postgres | Run state, progress, idempotency, concurrency cap |
| Workflows host | Workflow | Runs the agents, verification, publish, and deploy checks. Holds the model key and GitHub credential. |
| Sandbox | Sandbox | Disposable machine where the builder writes and runs code |
| Apps repository | GitHub repo | Every generated app, plus the root `render.yaml` Render watches |
| Generated app | Static site, web service, Postgres | One Render project per app, created by Blueprint sync |

## How the Render products fit together

- **Web Services** host the gateway and each generated app's API, with
  health checks and `preDeployCommand` migrations.
- **Workflows** run the pipeline as a `prompt-to-app` task whose agents and
  steps are subtasks, each with its own run and logs in the Dashboard.
- **Sandboxes** give each run an isolated machine, with a real Postgres when
  the app needs one, and no credentials.
- **Postgres** stores the factory's run state, and gives each generated app
  its own managed database.
- **Blueprints** are the only way the factory creates infrastructure: the
  workflow commits a `render.yaml`, and Render's Blueprint sync deploys it.
- **Render MCP** gives the architect a read-only view of the workspace,
  enforced by an allowlist in code.

## Prerequisites

- Node.js 22 or later, and Docker (for the local Postgres)
- The [Render CLI](https://render.com/docs/cli), signed in with `render login`
- A Render workspace with Workflows and Sandboxes enabled, a Render API key,
  and the workspace ID (it starts with `tea-`)
- An Anthropic API key
- An empty GitHub repository for generated apps
- The [Render GitHub app](https://github.com/apps/render) installed on that
  repository, so Render can read it for Blueprint sync
- A credential that can push to the repository: a fine-grained personal
  access token or a GitHub App, with Contents: write on that repository

## Quick start

The [Quickstart](docs/0_QUICKSTART.md) is the canonical setup guide. It covers
installation, local processes, the one-time apps Blueprint, the first app,
deployment, diagnostics, operations, and cleanup.

Local development still creates real Render Sandboxes and deploys real
services. Generated static sites are free; a generated API and database use
paid plans and bill until you delete the app.

## Deploy the factory to Render

Click **Deploy to Render** above to fork this repository into your GitHub
account and create a Blueprint from your fork, or create a Blueprint from this
repository's `render.yaml` yourself. It creates the gateway, the workflow service, and their database
in a `vibe-factory` project, and prompts you once for each secret.
[docs/0_QUICKSTART.md](docs/0_QUICKSTART.md#deploy-the-factory-to-render)
has the full steps.

## Documentation

- [Quickstart](docs/0_QUICKSTART.md): setup, first run, deploying the factory,
  diagnostics, operations, and cleanup
- [Extension guide](docs/1_EXTENSION.md): factory settings, agents, tools,
  infrastructure primitives, templates, and pipeline changes
- [Architecture](docs/2_ARCHITECTURE.md): directory overview, execution paths,
  core interfaces, trust boundaries, state, and tests
- [Takeaways](docs/3_TAKEAWAYS.md): lessons to apply in your own agent system

Contributor and coding-agent conventions, invariants, and change checklists
are in [AGENTS.md](AGENTS.md).

## License

MIT
