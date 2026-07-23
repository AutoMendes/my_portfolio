---
title: "Bits & Bots — Platform for Gifted Children"
org: "Independent Project (in partnership with ANEIS Braga)"
dateRange: "Jul 2026 – Present"
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

I volunteer with ANEIS, monitoring educational activities for gifted children. What was missing was a way to give those children (6–16 years old) structured courses in robotics, electronics, and programming that they could work through at their own pace, with monitors able to see progress without chasing paper records or spreadsheets. I built Bits & Bots to fill that gap.

## Architecture decisions

**No explicit enrollment.** Every child has access to every course from the moment they log in — a `Matricula` (enrollment record) is created automatically the first time a child opens a course, not through a separate sign-up step. Fewer screens, fewer places for a monitor to have to manually add a child to something before they can start.

**Course structure mirrors how the content is actually taught:** a `Curso` contains an ordered list of `Atividades`, each of which contains an ordered list of `Níveis` (plain Markdown — no need for a rich content editor for this), ending in a single `Quiz`. `Matricula` tracks the child's current position plus the full history of quiz attempts and monitor validations, so a monitor can see not just "where are they now" but "how did they get here."

**Monorepo, two deployables, one entry point.** Backend (Node/Express, MongoDB via Mongoose) and frontend (React/Vite/Tailwind) live in one repo as npm workspaces. In production, the frontend container is the *only* public-facing thing — it's nginx serving the built Vite bundle and reverse-proxying `/api` straight to the backend container over Cloud Run's internal networking. The backend itself has no public ingress at all. One less thing to secure, one less DNS entry to manage.

**Infrastructure as actual code.** Cloud Run services, the Artifact Registry, the avatar storage bucket, service accounts, and the domain are all defined in Terraform, not clicked together in a console. Deploys are just "merge to main" — GitHub Actions builds and ships a new image on top of whatever Terraform already provisioned; the infrastructure itself only changes when someone deliberately runs Terraform.

**A companion app that does one job.** The React Native (Expo) app is monitor-only — deliberately no child-facing screens. It talks to the same backend API, keeps the refresh token in `expo-secure-store` and the access token in memory only (not persisted), and shares its design tokens with the web frontend so the two don't visually drift apart over time.

## The hardest part: making local development work at all

None of the architecture above was the hard part — WSL2 networking was. The backend and Metro bundler run inside WSL2's network namespace, which isn't reachable from a physical phone on the same Wi-Fi, or from Android Studio's emulator without special-casing. Getting a monitor's actual phone talking to a backend running on my laptop meant setting up Windows-side port proxies (`netsh interface portproxy`) forwarding both the API port and Metro's bundler port into the WSL2 VM, plus forcing Metro to advertise the Windows LAN IP instead of its own WSL2-internal one via `REACT_NATIVE_PACKAGER_HOSTNAME`. None of this is Bits & Bots-specific — it's the tax of a Windows/WSL2 dev environment plus React Native — but it's the kind of yak-shave that eats a whole afternoon if you don't know it's coming.

## Result (in progress)

Both the web platform and the monitor app are live and deployed, with course content, quizzes, and progress tracking working end to end. It's an active project, not a finished one — I'm still the only developer, so test coverage is intentionally focused on the modules most likely to break silently (auth, progress tracking) rather than everything.

## What I'd do differently

Broaden test coverage before adding more features, not after — right now it's concentrated on a couple of critical modules by necessity, and that's a debt I'm aware of. I'd also want proper offline support in the monitor app sooner: classrooms don't always have reliable Wi-Fi, and right now a dropped connection mid-session is a rough experience rather than a graceful one.
