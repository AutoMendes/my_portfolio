---
title: "Code Viseu United — Fictional Football Club"
org: "Polytechnic Institute of Viseu"
dateRange: "Sep 2025 – Jan 2026"
description: >-
  A comprehensive, multifunctional digital platform for a football club, centralizing e-commerce
  (merchandising), ticketing, squad/match information, news, and reporting (sales, performance,
  rankings).
tags: ["Django", "PostgreSQL", "MongoDB"]
featured: false
caseStudy:
  slug: code-viseu-united
---

## The problem

A football club's day-to-day runs through departments that don't naturally share a system: sales (merchandising, tickets), marketing (news, announcements), and administration (squad, matches, users). Treating all of that as one flat admin panel would mean every department wading through screens meant for someone else. The brief was to build a platform organized the way the club actually operates.

## Architecture decisions

**Three back-office panels, not one.** `admin_panel`, `marketing_panel`, and `sales_panel` are separate Django apps within the same project, each scoped to what that department needs — squad/match/user management in one, news/content in another, e-commerce/ticketing/reporting in the third. It mirrors the club's real org chart instead of forcing one shared surface.

**MongoDB as the actual application data store — not Django's ORM at all.** `models.py` in the app is empty. Every piece of club data (squad, matches, merchandising, tickets, news) goes through a hand-written `mongo.py` layer talking to MongoDB via `pymongo`, completely bypassing Django's own ORM, which has no native concept of a document store. On top of that, both databases — the MongoDB app data *and* the PostgreSQL instance backing Django's own auth/sessions/admin — are reached over separate SSH tunnels (`SSHTunnelForwarder`) to a remote server, rather than exposing either database port directly.

**Faking relational guarantees on top of a document store, on purpose.** MongoDB's native `_id` is an `ObjectId` — not sequential, not human-readable, and not what a club's ticketing or order data should look like. So `mongo.py` implements its own auto-increment: a `sequencias` collection tracks the next ID per collection name, incremented atomically via `find_one_and_update` with `upsert=True`, and every insert calls `nextval()` before writing. `update_doc` goes further and implements upsert-style "find or create" semantics by hand — if a document matching a filter doesn't exist, it synthesizes one (with a fresh sequential ID) instead of failing, mimicking what an ORM's `get_or_create` would give you if Django's ORM actually worked with Mongo.

**Server-rendered, styled with django-tailwind and django-material.** No separate frontend framework — Django's own templates, styled properly instead of left at Bootstrap-admin defaults. For this scope, a custom SPA frontend would have been solving a problem that didn't exist yet.

## The hardest part

Building a data layer that *feels* relational — sequential, predictable IDs; find-or-create semantics; consistent document shapes per collection — on top of a database that natively gives you none of that, and doing it entirely by hand because Django's ORM doesn't reach MongoDB at all. Every one of those guarantees that Postgres/Django would give for free (autoincrement, `get_or_create`, schema consistency) had to be deliberately re-implemented in `mongo.py`, and re-implemented correctly enough that the three back-office panels built on top of it could treat it like an ORM without needing to know it wasn't one.

## Result

A working platform across all three panels: merchandising and ticketing on the sales side, news and content on the marketing side, and squad/match/user administration — with sales, performance, and ranking reports pulling from the underlying data instead of being assembled by hand.
