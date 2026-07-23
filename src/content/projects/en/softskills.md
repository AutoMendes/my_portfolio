---
title: "SoftSkills — Training and Knowledge-Sharing Platform"
org: "Polytechnic Institute of Viseu"
dateRange: "Feb 2025 – Jul 2025"
description: >-
  An internal platform centralizing employee training and knowledge sharing to support remote
  work. Web (Front Office/Back Office) and a mobile/tablet app with configurable roles, course
  management, progress tracking, and automated notifications.
tags: ["Node.js", "Flutter"]
featured: true
caseStudy:
  slug: softskills
---

## The problem

Internal training at most companies is scattered — a course announced by email, materials in a shared drive, no real way to see who actually finished what, and no way to surface content someone would actually want next. The brief was to centralize it into one platform: browse and enroll in courses, track progress, get automated reminders as things start and end, share knowledge with colleagues, and get pointed toward what's relevant instead of scrolling a flat catalog.

## Architecture decisions

**A course/occurrence split, not one flat "course" table.** `Formacao` is the course itself — its topic, description, duration. `OcorrenciaFormacao` is a specific scheduled running of it: start/end dates, an edition number, an enrollment deadline, total seats and seats remaining. That distinction is what makes "the same course, running three times a year, each with its own capacity" a natural fit instead of a workaround.

**A real recommendation engine, not a "popular courses" list.** The backend builds recommendations per user from two signals: topics they've explicitly favorited (`FavoritosTopico`), and topics of courses they've already completed (enrollments in state `'Aprovado'`), then surfaces upcoming occurrences in those topics they aren't already enrolled in. It's a small, content-based recommender, but it's genuinely driven by what a person did on the platform, not a static ranking.

**A knowledge-sharing forum sitting inside the same platform.** Beyond courses, there's a full post/reply system — `Publicacao` and `Resposta`, each with their own attachments and ratings (`AvaliacaoPublicacao`/`AvaliacaoResposta`), plus a `Denuncia` (report) model for moderation. It's built as its own subsystem with its own models, not bolted onto the course data — sharing knowledge and taking a course are related but different activities, and the data model treats them that way.

**Course-state transitions driven by cron, not by someone checking a calendar.** A `node-cron` job runs daily, moves occurrences into `'Em Curso'` on their start date and `'Terminado'` on their end date, and — for each transition — fires both an in-app notification (via Firebase Cloud Messaging, to web and the Flutter app alike) and an email through `nodemailer`. Nobody has to manually flip a course's status; the automation is the source of truth for when a course visibly starts and ends.

**Security details that don't show up in a feature list.** JWTs get explicitly blacklisted on logout (`TokenBlacklist`) instead of just expiring naturally, so a stolen token can't be replayed after a user signs out. Unverified signups get purged by a nightly cron job if they haven't confirmed within 24 hours, so the user table doesn't accumulate abandoned, unverifiable accounts. Course materials and generated certificates (built with `pdfkit`) go to S3 through `multer-s3`, not onto the API server's own disk.

## The hardest part

Making the recommendation query cheap enough to run per page load. Building "topics from completed courses, minus topics already favorited, joined against upcoming occurrences the user isn't enrolled in" as a single set of Sequelize queries — rather than pulling every enrollment and occurrence into memory and filtering in JavaScript — meant leaning on `Set` operations for the ID de-duplication and letting the database do the joins, so the endpoint stays fast as the number of formations and enrollments grows instead of degrading linearly with platform usage.

## Result

A working platform end to end, mirrored across web and Flutter mobile/tablet (with its own localization): browse and enroll in courses, get recommended what's relevant next, track status and history per trainee, take quizzes and tasks with submission tracking, earn badges, share and discuss knowledge in the forum, and receive automated push/email notifications as courses start and finish — with materials, certificates, and moderation all backed by real infrastructure rather than manual admin work.
