---
title: "Everest — App"
org: "Polytechnic Institute of Cávado and Ave (UPCA)"
dateRange: "Oct 2022 – Feb 2023"
description: >-
  A full-stack solution for professional climber João Garcia: athlete management and event
  organization via a Kotlin mobile app (MVVM) and a web portal, with offline-first architecture
  and Firebase sync.
tags: ["Kotlin", "MVVM", "Firebase"]
featured: false
caseStudy:
  slug: everest
---

## The problem

Built for professional climber João Garcia, the app's job was organizing climbing expeditions — treks up specific mountains, each with its own difficulty, dates, price, and guest capacity — letting participants sign up and follow along, and capturing measurement data from the field, in a context where "you have signal" isn't a safe assumption once you're anywhere near the actual mountain.

## Architecture decisions

**A `Trek` as the central entity, modeled like a real expedition, not a generic "event."** Each trek carries the mountain name, height, difficulty, locality and country, guest capacity, duration in days, price, start/end dates, an active flag, and a cover image, read and written through a `DatabaseReference` against the Firebase Realtime Database. That's enough structure to run an actual booking flow (is this trek still open, how many days, what does it cost) without a backend beyond Firebase itself.

**Realtime Database, chosen specifically for its offline story.** The Realtime Database SDK keeps a local disk cache and can serve reads and queue writes from it when there's no connection — but that's opt-in, not automatic: `FirebaseDatabase.getInstance().setPersistenceEnabled(true)` has to be called before any database access to actually enable it. The app calls it explicitly for the admin flow in `SplashActivity`, before routing into `AdminActivity`. On the participant side, a dedicated `sendDataOffline(form: Form2)` helper pushes measurement data (`Measures/`) straight through `database.push().setValue(form)` — using Realtime Database's own queued-write behavior to make sure a measurement taken with no signal still gets recorded and syncs once connectivity returns, without the app needing to build its own retry/queue logic on top.

**Participants kept separate from the trek node, not nested inside it.** A trek's participants aren't stored as a list under the `Trek` node — they're modeled as their own `Participant` entity (user reference, name) and queried separately. That split exists for a very concrete reason.

## The hardest part

The Realtime Database is a single JSON tree, and it doesn't reliably give you back a genuine list for something that was written as one — a node with sparse, non-sequential, or otherwise irregular child keys can come back deserialized as a `Map` instead of a `List`, depending on how it was written. That's a well-known Realtime Database gotcha, and it showed up directly here: an early version of `Trek` kept participants as an embedded list on the node itself, and deserializing it threw exactly that mismatch. The fix was architectural, not a try/catch around the deserializer — pull `Participant` out into its own top-level node, queried independently per trek instead of trusted to come back correctly shaped as a nested child of one object.

## Result

A working trek-organization app and companion web portal, both reading and writing through the same Firebase Realtime Database, with explicit offline persistence for the admin flow and a dedicated offline-write path for field measurements — built for someone planning or joining an expedition with no guarantee of a live connection at the moment they need it.
