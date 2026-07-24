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

The most time-consuming parts of shipping software — reviewing pull requests thoroughly, keeping infrastructure-as-code safe and cost-aware, noticing and fixing a failing pod at 3am — are exactly the parts that get skipped under time pressure, even though they're where real incidents come from. Manual review, debugging, and root-causing don't just take time — that time grows with the codebase, so the more an application scales, the more these processes slow down. An LLM doesn't have that problem: the gap between reviewing one PR and reviewing a hundred is minimal. Manual review is reactive and doesn't scale; AI does. The project's premise was to point LLMs at those specific parts, not as a chatbot bolted onto the side of DevOps, but wired directly into the pipeline, Kubernetes, and the terminal a human would already be using.

## Architecture

The system is organized as five sequential phases covering the full IaC lifecycle — Design (generate Terraform/Helm from a prompt), Review (seven agents + IaC diff analysis), Validation (orchestrator decision + deep IaC validation), Deploy (cost estimation, then staged rollout), and Operation (auto-healing + drift detection) — modeled below in C4 notation. Three parts of it mattered most and get the deep dive below: **PR review**, **IaC safety and cost**, and **Kubernetes auto-healing** — the highest-value and technically hardest pieces. A shared MCP layer and a desktop app expose those same capabilities interactively; both are covered more briefly further down.

<img src="/images/aiops/arquitetura_sistema_c4.png" alt="Modular architecture of AI agents managing the IaC lifecycle, from a prompt through review, validation, deploy, and operation" class="diagram-large" />

### PR Review

A developer opens a PR; seven agents analyze the diff in parallel and post structured comments. The orchestrator reads them and decides: no critical issues → approve and auto-merge (squash); otherwise → block and publish clickable fix suggestions the developer can accept and re-submit.

<img src="/images/aiops/uc1_pr_review.png" alt="Diagram: developer opens a PR, seven agents review in parallel, orchestrator approves and auto-merges or blocks with suggestions" class="diagram-large" />

**Seven narrow reviewer agents, one orchestrator that only speaks after all of them do.** Every PR against `dev`/`main` gets reviewed in parallel by specialized agents — code quality, security, tests, performance, documentation, Docker, and pipeline/CI config — each posting its own comment with a severity marker (🔴 CRITICAL, 🟡 WARNING, 💡 SUGGESTION). None of them talk to each other or need to agree; a separate orchestrator runs only once they're all done and makes the one decision that matters: any CRITICAL blocks the merge, nothing else does. Splitting "notice problems" from "decide what to do about them" kept each individual agent simple and let the blocking policy live in exactly one place.

**Fixes as clickable GitHub suggestions, not just comments.** When the orchestrator blocks a PR, it doesn't stop at a report — it generates concrete fixes via the LLM and publishes them as native GitHub review suggestion blocks in the Files Changed tab, so a developer can click "Commit all suggestions" and apply them in one action instead of manually implementing what an AI agent already wrote out.

![A blocked PR with LLM-generated fix suggestions shown as clickable GitHub review blocks](/images/aiops/pr_sugestoes_clicaveis_en.png)

### Infrastructure as Code (IaC)

Triggered by changes to Terraform files, `iac_generator` validates the infrastructure configuration and estimates costs via the Infracost CLI, publishing a report on the PR. The verdict (`VERDICT: APPROVED` or `VERDICT: BLOCKED`) decides whether the pipeline proceeds to `terraform apply` or opens a blocking GitHub issue instead.

**`iac_generator`, one module, five modes.** The same agent handles `generate` (Terraform/Helm templates from a natural-language prompt), `validate`, `fix`, `ci` (PR/push validation with a blocking verdict), and `cost` (Infracost-based estimation) — one codebase behind all five, rather than a separate tool per concern that would drift apart over time. In `validate` mode it reads the *entire* Terraform file set together rather than one file at a time, which avoids false positives from context that only exists elsewhere in the project (a provider version pinned in a different file, say). Findings are only ever reported with concrete evidence in the code, split into critical (hardcoded credentials, local backend, resources without a lifecycle block), warnings, and suggestions — always resolving to a structured `VERDICT: BLOCKED` or `VERDICT: APPROVED` a pipeline can act on directly.

![The IaC agent's Terraform validation, one finding per line: severity (PASS/FAIL), file, quoted line, and a fix where applicable](/images/aiops/iac_findings_pass_fail.png)

**Cloud-agnostic by design, including on-premises.** Beyond Azure, AWS, and GCP, `generate`/`validate`/`fix` ship with dedicated system prompts for local/on-premises setups — Terraform with local providers, Kubernetes namespaces via kubeconfig — since infrastructure without cloud access is still infrastructure that needs validating. Cost estimation in that mode skips Infracost entirely (it has no on-prem pricing to map to) and asks the LLM directly to estimate the resources required instead.

**Drift detection as its own recurring check, not a one-time apply.** Infrastructure isn't assumed to stay the way Terraform left it — a scheduled `terraform plan -detailed-exitcode` against the real cloud state reports one of three outcomes (no drift, error, drift detected) via Terraform's own exit code convention, so manual changes made outside the pipeline get surfaced instead of silently diverging from what's declared in code.

![Cost Analysis (Infracost): per-resource monthly cost breakdown for main-production and main-staging, with subtotals and a total month/year summary](/images/aiops/infracost_breakdown.png)

### Kubernetes (auto-healing)

Azure Monitor / Logic Apps detects a failing Kubernetes pod and triggers the auto-healing agent. The agent diagnoses the root cause and, depending on the failure type, applies an automatic fix (for restartable states) or reports the incident for manual intervention — managing the GitHub issue's lifecycle either way: opened on detection, closed automatically on confirmed recovery.

<img src="/images/aiops/uc3_auto_healing.png" alt="Diagram: Azure Monitor detects a failing pod, auto-healing agent diagnoses and fixes or reports, GitHub issue opened and closed automatically" class="diagram-large" />

**Triage before action, never a direct cluster mutation.** Pod failure states are split into ones that are safe to auto-remediate (`CrashLoopBackOff`, `Error`, `OOMKilled`, `Failed`) and ones that are report-only (`ImagePullBackOff`, `Pending`) because blindly restarting those wouldn't fix — and might mask — the real problem. On top of that, a heuristic (pod age under 10 minutes *and* 2+ restarts) flags a likely bad deploy; when it fires, the fix isn't a direct `kubectl rollback` — it's a git commit reverting the relevant Helm values file on the branch that namespace's ArgoCD Application tracks, so the cluster gets fixed through the same GitOps path every other deploy goes through, with no drift between what auto-healing did and what the deployment pipeline believes is live.

### Also part of the system

**MCP layer.** The same Kubernetes/GitHub/IaC/Infracost/Log Analytics tools the pipeline uses autonomously are also exposed as five MCP servers, usable interactively from Claude Desktop or the Claude Code CLI with the same prompts (`iac_validate`, `auto_healing`, …) — one integration layer, two consumers, instead of building the same integrations twice.

**Desktop app.** A PyQt6 GUI (packaged standalone with PyInstaller) exposes the same IaC agent to people who'd rather not touch a terminal — provider-agnostic (Azure OpenAI, Anthropic, Gemini, or any OpenAI-compatible endpoint via named connection profiles) — and is the only place the on-premises workflow gets a proper interface: **machine profiles** let a local cost/feasibility estimate compare declared infrastructure against a specific target machine's real CPU/RAM/disk/GPU capacity instead of guessing.

![The desktop app's Machines tab: creating and managing persistent machine profiles (OS, CPU, RAM, disk, GPU, bandwidth) used for on-premises feasibility estimates](/images/aiops/desktop_app_machines.png)

**Reliability.** LLM calls route through a primary/fallback provider chain (Groq primary, Azure OpenAI fallback via `LLM_PRIMARY_PROVIDER`/`LLM_FALLBACK_PROVIDER`) rather than one hardcoded API, so a single provider outage doesn't take down PR review, IaC validation, or auto-healing all at once.

## The hardest part

Deciding how much to actually trust the automation near things that matter — a PR that gets auto-merged, a pod that gets "fixed," a Terraform plan that gets applied. The answer wasn't "trust it less," it was building the guardrails into the architecture itself instead of hoping the LLM behaves: CRITICAL severity is a hard gate on PR review regardless of what else an agent says, restart-worthy vs. report-only pod states are a hardcoded allowlist rather than an LLM judgment call, a bad deploy gets rolled back through Git/ArgoCD instead of an imperative cluster mutation, and Terraform applies run through OIDC rather than long-lived cloud credentials. The LLM decides *what's wrong and what the fix should look like*; it never gets to decide *whether it's allowed to act* — that boundary is fixed code, not a prompt.

## What sets this project apart

Ordinary pipeline automation is a fixed sequence of `if/then` checks — more steps scripted into a YAML file, still deterministic and still blind to context. This system replaces that sequence with agents that read the actual code and reason about it: a YAML pipeline can catch a missing semicolon, but it can't tell you *why* a change is risky, estimate what it'll cost before it's deployed, or decide on its own that a pod needs a Git revert instead of a restart. By combining LLMs with GitHub, Azure Pipelines, Terraform, and Kubernetes, the result is a system that reviews its own code, predicts infrastructure cost ahead of time, and heals itself in production — not a smarter script, but a pipeline with judgment.

## Result

A working pipeline demonstrated end to end with two deliberately paired demo APIs: a broken one with planted issues (hardcoded secrets, SQL injection, no auth, an O(n²) hot path, missing tests and docs) that the pipeline catches and blocks, and a secured version of the same API that sails through and auto-merges — proving the review agents catch what they're supposed to, not just that they run. Alongside it, a simulated pod crash triggers the full auto-healing loop (detect → read logs/events → diagnose → fix → confirm recovery → open/close a GitHub issue), and the IaC pipeline runs Terraform validation and Infracost-based cost estimation on every infrastructure change before it's applied.

Across the PRs opened during development, 30 of 54 were auto-merged and 12 were blocked by the security agent specifically — a deterministic, CRITICAL-based decision rather than a judgment call made fresh each time. Auto-healing was exercised across dozens of simulated pod-crash scenarios, recovering most of them autonomously and escalating to a human whenever the failure state wasn't one of the ones it's allowed to touch. IaC validation kept its findings evidence-based (quoted file, line, and reason) throughout, specifically to keep false positives from piling up and eroding trust in the blocking verdict.
