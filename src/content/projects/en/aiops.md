---
title: "AIOps — AI-Driven DevOps Automation Platform"
org: "Final Project · Polytechnic Institute of Viseu / DevScope"
dateRange: "Feb 2026 – Jun 2026"
description: >-
  Final-year project integrating LLMs into DevOps pipelines: multi-agent PR review,
  Terraform IaC generation/validation, and autonomous Kubernetes auto-healing, built with custom
  FastMCP servers deployed on Azure (AKS, Azure Pipelines).
tags: ["Python", "Terraform", "Kubernetes", "Azure", "MCP", "LLMs"]
featured: true
caseStudy:
  slug: aiops
---

## The problem

The unglamorous parts of shipping software — reviewing pull requests thoroughly, keeping infrastructure-as-code safe and cost-aware, noticing and fixing a failing pod at 3am — are exactly the parts that get skipped under time pressure, even though they're where real incidents come from. The project's premise was to point LLMs at those specific parts, not as a chatbot bolted onto the side of DevOps, but wired directly into the pipeline, Kubernetes, and the terminal a human would already be using.

## Architecture

The system is organized as five sequential phases covering the full IaC lifecycle — Design (generate Terraform/Helm from a prompt), Review (seven agents + IaC diff analysis), Validation (orchestrator decision + deep IaC validation), Deploy (cost estimation, then staged rollout), and Operation (auto-healing + drift detection) — modeled below in C4 notation. The sections that follow break it down module by module.

<img src="/images/aiops/arquitetura_sistema_c4.png" alt="Modular architecture of AI agents managing the IaC lifecycle, from a prompt through review, validation, deploy, and operation" class="diagram-large" />

### PR Review

A developer opens a PR; seven agents analyze the diff in parallel and post structured comments. The orchestrator reads them and decides: no critical issues → approve and auto-merge (squash); otherwise → block and publish clickable fix suggestions the developer can accept and re-submit.

<img src="/images/aiops/uc1_pr_review.png" alt="Diagram: developer opens a PR, seven agents review in parallel, orchestrator approves and auto-merges or blocks with suggestions" class="diagram-large" />

**Seven narrow reviewer agents, one orchestrator that only speaks after all of them do.** Every PR against `dev`/`main` gets reviewed in parallel by specialized agents — code quality, security, tests, performance, documentation, Docker, and pipeline/CI config — each posting its own comment with a severity marker (🔴 CRITICAL, 🟡 WARNING, 💡 SUGGESTION). None of them talk to each other or need to agree; a separate orchestrator runs only once they're all done and makes the one decision that matters: any CRITICAL blocks the merge, nothing else does. Splitting "notice problems" from "decide what to do about them" kept each individual agent simple and let the blocking policy live in exactly one place.

**Fixes as clickable GitHub suggestions, not just comments.** When the orchestrator blocks a PR, it doesn't stop at a report — it generates concrete fixes via the LLM and publishes them as native GitHub review suggestion blocks in the Files Changed tab, so a developer can click "Commit all suggestions" and apply them in one action instead of manually implementing what an AI agent already wrote out.

![A blocked PR with LLM-generated fix suggestions shown as clickable GitHub review blocks](/images/aiops/pr_sugestoes_clicaveis_en.png)

### Infrastructure as Code (IaC)

Triggered by changes to Terraform files, `iac_generator` validates the infrastructure configuration and estimates costs via the Infracost CLI, publishing a report on the PR. The verdict (`VERDICT: APPROVED` or `VERDICT: BLOCKED`) decides whether the pipeline proceeds to `terraform apply` or opens a blocking GitHub issue instead.

<img src="/images/aiops/uc2_iac_review.png" alt="Diagram: Terraform changes trigger IaC validation and cost estimation, gating terraform apply on the verdict" class="diagram-large" />

**`iac_generator`, one module, five modes.** The same agent handles `generate` (Terraform/Helm templates from a natural-language prompt), `validate`, `fix`, `ci` (PR/push validation with a blocking verdict), and `cost` (Infracost-based estimation) — one codebase behind all five, rather than a separate tool per concern that would drift apart over time. In `validate` mode it reads the *entire* Terraform file set together rather than one file at a time, which avoids false positives from context that only exists elsewhere in the project (a provider version pinned in a different file, say). Findings are only ever reported with concrete evidence in the code, split into critical (hardcoded credentials, local backend, resources without a lifecycle block), warnings, and suggestions — always resolving to a structured `VERDICT: BLOCKED` or `VERDICT: APPROVED` a pipeline can act on directly.

<div class="image-pair">
<img src="/images/aiops/iac_findings_pass_fail.png" alt="The IaC agent's Terraform validation, one finding per line: severity (PASS/FAIL), file, quoted line, and a fix where applicable" />
<img src="/images/aiops/iac_evidence_checked.png" alt="Evidence Checked: every piece of evidence the agent verified before reaching its verdict, plus Improvement Opportunities and the final VERDICT: APPROVED" />
</div>

**Cloud-agnostic by design, including on-premises.** Beyond Azure, AWS, and GCP, `generate`/`validate`/`fix` ship with dedicated system prompts for local/on-premises setups — Terraform with local providers, Kubernetes namespaces via kubeconfig — since infrastructure without cloud access is still infrastructure that needs validating. Cost estimation in that mode skips Infracost entirely (it has no on-prem pricing to map to) and asks the LLM directly to estimate the resources required instead.

**Drift detection as its own recurring check, not a one-time apply.** Infrastructure isn't assumed to stay the way Terraform left it — a scheduled `terraform plan -detailed-exitcode` against the real cloud state reports one of three outcomes (no drift, error, drift detected) via Terraform's own exit code convention, so manual changes made outside the pipeline get surfaced instead of silently diverging from what's declared in code.

<div class="image-pair">
<img src="/images/aiops/infracost_breakdown.png" alt="Cost Analysis (Infracost): per-resource monthly cost breakdown for main-production and main-staging, with subtotals and a total month/year summary" />
<img src="/images/aiops/infracost_savings.png" alt="High-Cost Resources and Savings Opportunities: the LLM flags the biggest cost drivers and suggests concrete ways to reduce them" />
</div>

### Kubernetes (auto-healing)

**Triage before action, never a direct cluster mutation.** Pod failure states are split into ones that are safe to auto-remediate (`CrashLoopBackOff`, `Error`, `OOMKilled`, `Failed`) and ones that are report-only (`ImagePullBackOff`, `Pending`) because blindly restarting those wouldn't fix — and might mask — the real problem. On top of that, a heuristic (pod age under 10 minutes *and* 2+ restarts) flags a likely bad deploy; when it fires, the fix isn't a direct `kubectl rollback` — it's a git commit reverting the relevant Helm values file on the branch that namespace's ArgoCD Application tracks, so the cluster gets fixed through the same GitOps path every other deploy goes through, with no drift between what auto-healing did and what the deployment pipeline believes is live.

Azure Monitor / Logic Apps detects a failing Kubernetes pod and triggers the auto-healing agent. The agent diagnoses the root cause and, depending on the failure type, applies an automatic fix (for restartable states) or reports the incident for manual intervention — managing the GitHub issue's lifecycle either way: opened on detection, closed automatically on confirmed recovery.

<img src="/images/aiops/uc3_auto_healing.png" alt="Diagram: Azure Monitor detects a failing pod, auto-healing agent diagnoses and fixes or reports, GitHub issue opened and closed automatically" class="diagram-large" />

### MCP layer

**One interface layer, used by both the pipeline and a human.** Five custom MCP servers (GitHub, Kubernetes, IaC, Infracost, Log Analytics) expose the same primitives — `list_pods`, `get_pod_logs`, `get_pod_events`, Terraform validation, cost estimation — as tools. The CI auto-healing agent and the Kubernetes MCP server call the exact same kind of `kubectl` wrapper functions under the hood; the difference is only *who's driving*. Wire the servers into Claude Desktop with the provided prompts (`iac_validate`, `iac_generate`, `iac_costs`, `auto_healing`, …) and a person gets the same diagnostic and remediation tools interactively that the pipeline uses autonomously — one integration layer, two consumers.

A conversational interaction between a developer and the system through the MCP layer, using Claude Desktop or the Claude Code CLI — generating, validating, and estimating the cost of IaC, detecting drift, operating the Kubernetes cluster (auto-healing, listing pods, reading logs), and managing PRs/issues on GitHub. A blocking verdict or detected drift automatically opens a GitHub issue with the details.

![Diagram: developer interacts with IaC, Kubernetes, and GitHub tools conversationally through the MCP layer via Claude Desktop or CLI](/images/aiops/uc4_mcp.png)

At the component level, this is an LLM client (Claude Desktop or the Claude Code CLI) consuming interfaces exposed by the MCP servers over the MCP/stdio protocol, with each server wrapping an external system in turn — Kubernetes via `kubectl` subprocess calls, GitHub and Infracost via HTTPS, Terraform via CLI subprocess and static analysis tools (`tfsec`, `checkov`).

<img src="/images/aiops/mcp_componentes.png" alt="UML component diagram of the MCP layer: an LLM client consuming MCP servers over stdio, each server wrapping an external system via HTTPS or subprocess" class="diagram-large" />

### Desktop app

For a DevOps user without CLI or CI/CD pipeline familiarity: validate IaC configurations, generate templates, estimate costs (cloud or local mode), and detect drift, choosing the LLM provider and — in local mode — a pre-configured machine profile. Unchanged IaC files between runs are served from an in-memory cache instead of re-hitting the API.

![Diagram: a DevOps user validates, generates, and estimates costs for IaC through the desktop app's GUI](/images/aiops/uc5_desktop_app.png)

**A third interface, for people who don't want a terminal — and provider-agnostic by design.** A PyQt6 GUI (packaged standalone with PyInstaller) wraps the IaC agent behind a two-panel window — a config panel for connection profiles and settings, a streaming output panel fed by a background worker thread through an 80ms-interval flush timer so the UI stays responsive while the LLM streams a response instead of blocking on it. Unlike the CI pipeline's fixed Groq-primary/Azure-fallback routing, the desktop app lets a user save multiple named connection profiles against Azure OpenAI, Anthropic, Google Gemini, or any generic OpenAI-compatible endpoint — so switching from, say, Azure to Claude to a locally-hosted model is a dropdown, not a code change. `engine.py` holds all the IaC logic with zero dependency on the CI agent module, loading the same shared Markdown system prompts the pipeline agents use so the two never drift out of sync in behavior; `workers.py` runs engine operations on a `QThread`, piping stdout/stderr into a queue that feeds the UI in real time.

<img src="/images/aiops/desktop_app_pacotes.png" alt="Package diagram of the desktop app: PyQt6 modules (engine, workers, window, dialogs, config) and their dependencies on shared prompts and external systems" class="diagram-large" />

<div class="image-pair">
<img src="/images/aiops/desktop_app_main.png" alt="The PyQt6 desktop app: config panel on the left, streaming output on the right" />
<img src="/images/aiops/desktop_app_validate_en.png" alt="Result of a cloud IaC validation run in the desktop app, with structured diagnosis and verdict in the output panel" />
</div>

**On-premises validation, with the target machine's real capacity as context.** Selecting "Local" instead of a cloud provider switches the app to the same on-prem-specific prompts described above, for environments with no cloud account to validate against. To make cost/feasibility estimation there actually useful instead of a guess in the dark, the app introduces **machine profiles** — persistent records of a target machine's OS, CPU cores, RAM, disk, GPU, and network bandwidth, managed in the Settings window's Machines tab. Pick a profile when running a local estimate and it's passed to the LLM as context, letting it compare what the declared infrastructure actually needs against what that specific machine can provide — an edge server and a dev laptop get evaluated against their own real limits, not a generic assumption.

<div class="image-pair">
<img src="/images/aiops/desktop_app_machines.png" alt="The desktop app's Machines tab: creating and managing persistent machine profiles (OS, CPU, RAM, disk, GPU, bandwidth) used for on-premises feasibility estimates" />
<img src="/images/aiops/desktop_app_cost_local_en.png" alt="Resource estimation in the desktop app's local/on-premises mode, comparing required resources against the selected machine profile" />
</div>

### Reliability: LLM routing

**A primary/fallback provider chain, not one hardcoded API.** Groq is the primary provider, with Azure OpenAI configured as an automatic fallback (`LLM_PRIMARY_PROVIDER`/`LLM_FALLBACK_PROVIDER`), so a single provider outage doesn't take down PR review, IaC validation, or auto-healing all at once — a real reliability decision, not a hypothetical one, for something meant to run unattended in CI.

## The hardest part

Deciding how much to actually trust the automation near things that matter — a PR that gets auto-merged, a pod that gets "fixed," a Terraform plan that gets applied. The answer wasn't "trust it less," it was building the guardrails into the architecture itself instead of hoping the LLM behaves: CRITICAL severity is a hard gate on PR review regardless of what else an agent says, restart-worthy vs. report-only pod states are a hardcoded allowlist rather than an LLM judgment call, a bad deploy gets rolled back through Git/ArgoCD instead of an imperative cluster mutation, and Terraform applies run through OIDC rather than long-lived cloud credentials. The LLM decides *what's wrong and what the fix should look like*; it never gets to decide *whether it's allowed to act* — that boundary is fixed code, not a prompt.

## Result

A working pipeline demonstrated end to end with two deliberately paired demo APIs: a broken one with planted issues (hardcoded secrets, SQL injection, no auth, an O(n²) hot path, missing tests and docs) that the pipeline catches and blocks, and a secured version of the same API that sails through and auto-merges — proving the review agents catch what they're supposed to, not just that they run. Alongside it, a simulated pod crash triggers the full auto-healing loop (detect → read logs/events → diagnose → fix → confirm recovery → open/close a GitHub issue), and the IaC pipeline runs Terraform validation and Infracost-based cost estimation on every infrastructure change before it's applied.
