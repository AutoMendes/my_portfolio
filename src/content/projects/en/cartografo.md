---
title: "Cartógrafo — Intelligent Navigation Across Portugal"
org: "Polytechnic Institute of Viseu — Artificial Intelligence coursework"
dateRange: "Mar 2026 – Apr 2026"
description: >-
  A university AI project combining classic graph-search algorithms (Uniform Cost, Depth-Limited,
  Greedy, A*), license-plate OCR (EasyOCR) for user authentication, and a local LLM
  (Ollama/Mistral) describing tourist attractions along the best route — across 18 Portuguese
  cities, with interactive maps via Folium and OSRM routing, in a Streamlit interface.
tags: ["Python", "LLMs"]
featured: true
caseStudy:
  slug: cartografo
---

## The brief

The assignment was narrow on paper: implement a handful of search algorithms over a graph and show they work. I wanted to build something that actually felt like a product, so I framed it as a road-trip planner — plan a route between Portuguese cities, watch different algorithms disagree about the "best" path, and get something useful out the other end (a description of what's worth seeing along the way).

That framing is what pulled in the two pieces that weren't required: OCR-based login (so the app "recognizes" your car) and a local LLM for the attraction descriptions.

## Architecture decisions

**Four algorithms, on purpose, not just one.** Uniform Cost and A* are both optimal, but for different reasons — A* gets there faster because it's guided by a heuristic (straight-line Haversine distance to the destination, which is admissible since it never overestimates real road distance). Depth-Limited and Greedy are included specifically because they're *not* optimal — the point was to make the trade-off visible: Greedy finds a route almost instantly but can walk into a worse path than A*, because it only ever looks at "how close does this look right now" and never accounts for cost already spent.

**Local LLM, not an API call.** Ollama running Mistral 7B locally, no internet dependency. For a university demo this matters less for cost than for reliability — a LLM description generator that goes down mid-presentation because of a flaky API isn't worth the risk.

**Streamlit over a custom frontend.** The interesting part of this project was never the UI — it was the algorithms and the OCR pipeline. Streamlit let me spend that time there instead of on component plumbing.

## The hardest part: OCR that actually has to work

Portuguese license plates aren't one format — they're four, depending on when the car was registered (`AB-12-CD` since 2020, back through `12-34-AB` pre-1992). A generic OCR pass on a photo, taken at an angle, in whatever lighting a phone camera gets, fails constantly on its first attempt.

The fix wasn't a smarter model — it was accepting that a single pass would never be reliable enough, and instead running the image through three preprocessing variants (contrast/sharpness boost; Otsu threshold binarization; inverted + Otsu, for dark plates on light backgrounds) crossed with four validation strategies (direct match after cleanup, spatial concatenation for plates read in fragments, position-template correction, and template correction applied to the concatenated result). Twelve attempts, tried in sequence, first valid match wins. It's not elegant, but it's the difference between a demo that works on the first photo and one that needs three retries in front of an audience.

## Result

End-to-end demo: photograph or type a plate, get authenticated (or registered on the spot if it's new), pick two of 18 cities and an algorithm, get a route drawn on a real map with turn-by-turn OSRM routing, and read a locally-generated description of what to see along the way. All four algorithms visibly produce different paths on the same city pair, which was the whole point — you can *see* the cost/speed/optimality trade-off instead of just reading about it in a report.
