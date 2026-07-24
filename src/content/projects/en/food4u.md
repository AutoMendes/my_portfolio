---
title: "Food-4-U"
org: "Polytechnic Institute of Cávado and Ave (UPCA)"
dateRange: "Feb 2022 – Jun 2022"
description: >-
  A full-stack restaurant management system: a Kotlin Android app (MVVM) with a C#/.NET REST
  API backend, digital menu, table reservations, and order processing with MySQL.
tags: ["Kotlin", "C#/.NET", "MySQL"]
featured: true
caseStudy:
  slug: food4u
---

## The problem

Built for a real restaurant ("Francesinha Portuguesa"), the goal was to move ordering off paper menus and verbal orders to waitstaff — let a customer browse the menu and order from their table, with the kitchen, the till, and the restaurant's own management all working off the same live data instead of a handwritten ticket and a notebook of covers.

## Architecture decisions

**QR code as the entry point, not an account.** A customer scans a code at their table and lands straight in the menu — no sign-up friction for what's usually a one-off visit. The API generates codes with IronBarCode, and a `Cliente` (customer) record — with name, email, NIF, gender, age, town, and municipality — captures who ordered without requiring a full account system up front.

**Menu modeled with real operational data, not just name and price.** An `Item` carries `temp_prep` (prep time in minutes), a `destaque` (featured) flag, a category and subcategory, and its own running rating — so the menu isn't a static list, it's data the kitchen and the front-of-house screen can both use (what's slow to make, what's being pushed today, what's actually good according to customers).

**Three-tier split: Kotlin client, C#/.NET API, MySQL.** A standard separation, chosen so the restaurant-facing Android client (tablets at the table, or a till) and the backend could evolve independently — the API is the only thing that touches the database.

**A feedback loop built into the order itself, feeding real analytics.** Every `Pedido` (order) carries two ratings — `avaliação` for the food, `aval_funcio` for the staff — alongside whether it's been paid. Those ratings, plus each customer's demographic fields, feed a set of analytics endpoints the API exposes directly: average order value overall, average and count of orders segmented by gender, total revenue, and the standard deviation of order value. That's not a dashboard bolted on afterward — it's business intelligence designed into the order model from the start.

## The hardest part

An order isn't placed all at once — items get added to it as a table decides what they want, sometimes over several minutes, and the order needs to accumulate correctly rather than get overwritten. That meant separating `Pedido` (the order header — total, paid status, ratings, table, customer) from `PedidoItens` (its line items), with `PedidoItens.GetItemsFromPedido` reassembling a full itemized invoice (`PedidoItensFatura`) from an order ID on demand. Getting "add one more item to what we already ordered" to behave the way a real table expects — without a new addition creating a disconnected second order — is what made the two-table split necessary rather than optional.

## Result

An ordering flow that goes from scanning a table's QR code to a placed, itemized order the kitchen and till both see, with the restaurant able to query average spend, order volume, and revenue broken down by customer demographics straight from the same API — built and shipped for an actual restaurant, not a hypothetical one.
