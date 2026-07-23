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

## Architecture decisions

**Seven narrow reviewer agents, one orchestrator that only speaks after all of them do.** Every PR against `dev`/`main` gets reviewed in parallel by specialized agents — code quality, security, tests, performance, documentation, Docker, and pipeline/CI config — each posting its own comment with a severity marker (🔴 CRITICAL, 🟡 WARNING, 💡 SUGGESTION). None of them talk to each other or need to agree; a separate orchestrator runs only once they're all done and makes the one decision that matters: any CRITICAL blocks the merge, nothing else does. Splitting "notice problems" from "decide what to do about them" kept each individual agent simple and let the blocking policy live in exactly one place.

**Fixes as clickable GitHub suggestions, not just comments.** When the orchestrator blocks a PR, it doesn't stop at a report — it generates concrete fixes via the LLM and publishes them as native GitHub review suggestion blocks in the Files Changed tab, so a developer can click "Commit all suggestions" and apply them in one action instead of manually implementing what an AI agent already wrote out.

**MCP servers as the one interface layer, used by both the pipeline and a human.** Five custom MCP servers (GitHub, Kubernetes, IaC, Infracost, Log Analytics) expose the same primitives — `list_pods`, `get_pod_logs`, `get_pod_events`, Terraform validation, cost estimation — as tools. The CI auto-healing agent and the Kubernetes MCP server call the exact same kind of `kubectl` wrapper functions under the hood; the difference is only *who's driving*. Wire the servers into Claude Desktop with the provided prompts (`iac_validate`, `iac_generate`, `iac_costs`, `auto_healing`, …) and a person gets the same diagnostic and remediation tools interactively that the pipeline uses autonomously — one integration layer, two consumers.

**A native desktop app as a third interface, for people who don't want a terminal — and provider-agnostic by design.** A PyQt6 GUI (packaged standalone with PyInstaller) wraps the IaC agent behind a two-panel window — a config panel for connection profiles and settings, a streaming output panel fed by a background worker thread through an 80ms-interval flush timer so the UI stays responsive while the LLM streams a response instead of blocking on it. Unlike the CI pipeline's fixed Groq-primary/Azure-fallback routing, the desktop app lets a user save multiple named connection profiles against Azure OpenAI, Anthropic, Google Gemini, or any generic OpenAI-compatible endpoint — so switching from, say, Azure to Claude to a locally-hosted model is a dropdown, not a code change.

**LLM calls route through a primary/fallback provider chain, not one hardcoded API.** Groq is the primary provider, with Azure OpenAI configured as an automatic fallback (`LLM_PRIMARY_PROVIDER`/`LLM_FALLBACK_PROVIDER`), so a single provider outage doesn't take down PR review, IaC validation, or auto-healing all at once — a real reliability decision, not a hypothetical one, for something meant to run unattended in CI.

**Drift detection as its own recurring check, not a one-time apply.** Infrastructure isn't assumed to stay the way Terraform left it — a scheduled `terraform plan -detailed-exitcode` against the real cloud state reports one of three outcomes (no drift, error, drift detected) via Terraform's own exit code convention, so manual changes made outside the pipeline get surfaced instead of silently diverging from what's declared in code.

**Auto-healing that triages before it acts, and never mutates the cluster directly.** Pod failure states are split into ones that are safe to auto-remediate (`CrashLoopBackOff`, `Error`, `OOMKilled`, `Failed`) and ones that are report-only (`ImagePullBackOff`, `Pending`) because blindly restarting those wouldn't fix — and might mask — the real problem. On top of that, a heuristic (pod age under 10 minutes *and* 2+ restarts) flags a likely bad deploy; when it fires, the fix isn't a direct `kubectl rollback` — it's a git commit reverting the relevant Helm values file on the branch that namespace's ArgoCD Application tracks, so the cluster gets fixed through the same GitOps path every other deploy goes through, with no drift between what auto-healing did and what the deployment pipeline believes is live.

## The hardest part

Deciding how much to actually trust the automation near things that matter — a PR that gets auto-merged, a pod that gets "fixed," a Terraform plan that gets applied. The answer wasn't "trust it less," it was building the guardrails into the architecture itself instead of hoping the LLM behaves: CRITICAL severity is a hard gate on PR review regardless of what else an agent says, restart-worthy vs. report-only pod states are a hardcoded allowlist rather than an LLM judgment call, a bad deploy gets rolled back through Git/ArgoCD instead of an imperative cluster mutation, and Terraform applies run through OIDC rather than long-lived cloud credentials. The LLM decides *what's wrong and what the fix should look like*; it never gets to decide *whether it's allowed to act* — that boundary is fixed code, not a prompt.

## Result

A working pipeline demonstrated end to end with two deliberately paired demo APIs: a broken one with planted issues (hardcoded secrets, SQL injection, no auth, an O(n²) hot path, missing tests and docs) that the pipeline catches and blocks, and a secured version of the same API that sails through and auto-merges — proving the review agents catch what they're supposed to, not just that they run. Alongside it, a simulated pod crash triggers the full auto-healing loop (detect → read logs/events → diagnose → fix → confirm recovery → open/close a GitHub issue), and the IaC pipeline runs Terraform validation and Infracost-based cost estimation on every infrastructure change before it's applied.
