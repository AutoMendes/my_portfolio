---
title: "IPV Smart Campus"
org: "Polytechnic Institute of Viseu"
dateRange: "Oct 2025 – Dec 2025"
description: >-
  Real-time monitoring system for sensor data across campus using IoT hardware. Integrated
  Arduino and a LoRa Shield for long-range data collection, a high-performance REST API in Go
  with PostgreSQL, and a React dashboard for real-time visualization.
tags: ["Go", "PostgreSQL", "React", "Arduino", "LoRa"]
featured: true
caseStudy:
  slug: ipv-smart-campus
---

## The problem

A campus has sensors scattered across buildings and grounds, but no single place to see what they're reporting or manage which device belongs where. The goal was a system that could take in readings from IoT hardware spread across campus and turn them into something a facilities team could actually look at in real time.

## Architecture decisions

**Two services, cleanly split.** A Go REST API (PostgreSQL, `pgx` driver, containerized) owns devices, locations, and measurements as the single source of truth. A separate React/TypeScript/Vite dashboard is purely a consumer of that API — it doesn't touch the database directly. That split means the API could serve other consumers later without the dashboard being in the way.

**LoRaWAN via ChirpStack, not a custom radio stack.** Arduino nodes with a LoRa Shield don't talk to this API directly — they join a LoRaWAN network managed by ChirpStack (an open-source LoRaWAN Network Server), which handles the actual radio protocol, device authentication, and decoding. ChirpStack then forwards each decoded uplink to the Go API as an HTTP webhook. That split matters: the API doesn't need to know anything about LoRaWAN's join procedures or frame formats — it just receives clean JSON and persists it, while ChirpStack does the hard, protocol-specific part that a from-scratch implementation would have burned most of the project on.

**Devices can be fixed or moving, resolved by a single query.** A device carries a `type` field. Devices of type `gps` have their position resolved from their most recent GPS-tagged measurement (`ORDER BY timestamp DESC LIMIT 1` against the `measurements` table); every other device resolves its position from a joined `locations` row via `location_id`. Both branches live in one SQL query with a `CASE` expression per coordinate, rather than two separate code paths that could drift apart — a stationary sensor bolted to a wall and a sensor that moves around campus are the same query, just a different branch of the same `CASE`.

## The hardest part

Getting that fixed-vs-GPS location resolution to live in the database layer as one honest query, instead of leaking into application code as two different lookups that the caller has to know to choose between. Landing on a single `SELECT` with `CASE WHEN d.type = 'gps' THEN (subquery on measurements) ELSE l.latitude END` (and the same for longitude) meant `GET /devices/with-location` never has to ask "is this a GPS device or not" — every caller gets a resolved coordinate regardless of device type, and the distinction is fully contained in the query that produces it.

## Result

An end-to-end pipeline: Arduino/LoRa nodes join the LoRaWAN network, ChirpStack decodes and webhooks each reading to the Go API, measurements land in PostgreSQL, and a live dashboard shows every device's current, correctly-resolved location alongside its readings — without the frontend or the API ever needing to special-case a moving sensor.
