---
title: "Bits & Bots — Platform for Gifted Children"
org: "Independent Project (in partnership with ANEIS Braga)"
dateRange: "Jul 2026 – Sep 2026"
description: >-
  A STEAM education platform (robotics, electronics, programming, and STEAM challenges) for
  gifted children aged 6–16, built in partnership with ANEIS Braga, with progress tracking for
  monitors. Full-stack web platform (Node.js/Express, MongoDB, React) plus a companion React
  Native monitor app, deployed on Google Cloud Run with Terraform-managed infrastructure and
  automated CI/CD.
tags: ["Node.js", "MongoDB", "React", "React Native/Expo", "Terraform", "Docker", "GCP Cloud Run"]
featured: true
caseStudy:
  slug: bits-bots
---

## The problem

I volunteer with ANEIS, monitoring educational activities for gifted children. Two things were broken: materials (PDFs, worksheets) lived in a Google Drive folder, and every session started with someone writing a shortened link on the whiteboard for the kids to type in — clunky, and a fresh point of friction every time. On top of that, monitors had no real way to track each child's progress through the material — it lived in memory and scattered notes. I built Bits & Bots to fix both: a structured place to publish robotics, electronics, and programming content that doesn't depend on a whiteboard link, and a way for monitors to actually see how each child (6–16 years old) is progressing through it.

## Architecture decisions

**No explicit enrollment.** Every child has access to every course from the moment they log in — a `Matricula` (enrollment record) is created automatically the first time a child opens a course, not through a separate sign-up step. Fewer screens, fewer places for a monitor to have to manually add a child to something before they can start.

**Course structure mirrors how the content is actually taught:** a `Curso` contains an ordered list of `Atividades`, each of which contains an ordered list of `Níveis` (plain Markdown — no need for a rich content editor for this), ending in a single `Quiz`. `Matricula` tracks the child's current position plus the full history of quiz attempts and monitor validations, so a monitor can see not just "where are they now" but "how did they get here."

**Monorepo, two deployables, one entry point.** Backend (Node/Express, MongoDB via Mongoose) and frontend (React/Vite/Tailwind) live in one repo as npm workspaces. In production, the frontend container is the *only* public-facing thing — it's nginx serving the built Vite bundle and reverse-proxying `/api` straight to the backend container over Cloud Run's internal networking. The backend itself has no public ingress at all. One less thing to secure, one less DNS entry to manage.

**Infrastructure as actual code.** Cloud Run services, the Artifact Registry, the avatar storage bucket, service accounts, and the domain are all defined in Terraform, not clicked together in a console. Deploys are just "merge to main" — GitHub Actions builds and ships a new image on top of whatever Terraform already provisioned; the infrastructure itself only changes when someone deliberately runs Terraform.

**A companion app that does one job.** The React Native (Expo) app is monitor-only — deliberately no child-facing screens. It talks to the same backend API, keeps the refresh token in `expo-secure-store` and the access token in memory only (not persisted), and shares its design tokens with the web frontend so the two don't visually drift apart over time.

**Offline by default, not as an afterthought.** The monitor app assumes the classroom might have no wifi: reads are persisted across restarts, and actions taken offline (validating an activity, creating a Student) go into a local FIFO queue instead of failing outright. The queue solves the two classic problems of this pattern — reconciling temporary ids once a newly-created entity syncs, and cascading failure to dependent actions — and every queued item carries an idempotency key, with the backend deduplicating replayed requests (a TTL-indexed Mongo collection). None of this is visible to the monitor day-to-day; that's the point.

## Architecture (C4) and use cases

**Context:** two personas (Child, Monitor) interacting with the platform as a whole.

<img src="/images/bits-bots/c4-context-en.svg" alt="C4 context diagram: Child and Monitor interacting with the Bits & Bots platform" class="diagram-medium" />

**Containers:** React SPA served by Nginx, monitor-only React Native app, Node/Express backend, MongoDB, and an image bucket.

<img src="/images/bits-bots/c4-container-en.svg" alt="C4 container diagram: React SPA, React Native app, Node/Express backend, MongoDB, and image bucket" class="diagram-large" />

**Use cases:** grouped by persona. The Child accesses courses, goes through levels, and submits quizzes; the Monitor manages the pedagogical content (including importing levels/materials from a `.md` file instead of typing markdown by hand) and validates each child's progress.

<img src="/images/bits-bots/use-cases-en.svg" alt="Use case diagram: Child and Monitor and the actions each can perform" class="diagram-medium" />

## The hardest part: making local development work at all

None of the architecture above was the hard part — WSL2 networking was. The backend and Metro bundler run inside WSL2's network namespace, which isn't reachable from a physical phone on the same Wi-Fi, or from Android Studio's emulator without special-casing. Getting a monitor's actual phone talking to a backend running on my laptop meant setting up Windows-side port proxies (`netsh interface portproxy`) forwarding both the API port and Metro's bundler port into the WSL2 VM, plus forcing Metro to advertise the Windows LAN IP instead of its own WSL2-internal one via `REACT_NATIVE_PACKAGER_HOSTNAME`. None of this is Bits & Bots-specific — it's the tax of a Windows/WSL2 dev environment plus React Native — but it's the kind of yak-shave that eats a whole afternoon if you don't know it's coming.

## Result (in progress)

Both the web platform and the monitor app are live and deployed, with course content, quizzes, progress tracking, and offline support working end to end. It's an active project, not a finished one — I'm still the only developer, so test coverage is intentionally focused on the modules most likely to break silently (auth, progress tracking, the offline queue) rather than everything.
