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

Built for professional climber João Garcia, the app's job was organizing climbing expeditions — treks up specific mountains, each with its own difficulty, dates, price, and guest capacity — and letting participants sign up and follow along, in a context where "you have signal" isn't a safe assumption once you're anywhere near the actual mountain.

## Architecture decisions

**A `Trek` as the central entity, modeled like a real expedition, not a generic "event."** Each trek carries the mountain name, height, difficulty, locality and country, guest capacity, duration in days, price, start/end dates, an active flag, and a cover image — stored directly in Firebase Firestore. That's enough structure to run an actual booking flow (is this trek still open, how many days, what does it cost) without a backend beyond Firestore itself.

**Firestore as the real backend, with offline reads built in.** Firestore's client SDK caches documents locally and serves reads from that cache when there's no connection, syncing writes once connectivity returns — which is exactly the property this app needed given where its users actually are. That's what "offline-first" means concretely here: the app isn't pretending it has a network, it's built on a database client whose whole design assumes it might not.

**Participants kept separate from the trek document, not nested inside it.** A trek's participants aren't stored as a list field on the `Trek` object — they're modeled as their own `Participant` entity (user reference, name) and queried separately. That split exists for a very concrete reason.

## The hardest part

Firestore doesn't guarantee it hands you back a `List` for something you wrote as a list — nested collections can come back deserialized as a raw `HashMap` instead, depending on how they were written and read. That's a documented Firestore/Gson interaction, and it showed up directly in this project: an early version of `Trek` had participants as an embedded list field, and deserializing it threw exactly that mismatch. The fix was architectural, not a try/catch — pull `Participant` out into its own collection, queried independently per trek instead of trusted to come back correctly nested inside one document. It's the kind of bug that looks like "just add error handling" until you realize the actual shape of the data coming back is the problem, not the code reading it.

## Result

A working trek-organization app and companion web portal, both reading and writing through the same Firestore backend, usable by someone planning or joining an expedition with no guarantee of a live connection at the moment they need the data.
