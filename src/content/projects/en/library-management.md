---
title: "Library Management System"
org: "Polytechnic Institute of Viseu"
dateRange: "Oct 2024 – Dec 2024"
description: >-
  A desktop application for library book management, built with OOP principles. Supports book
  registration across categories, borrowing with stock control, search by ISBN/title/author, and
  data validation.
tags: ["C++", "Qt", "OOP"]
featured: false
caseStudy:
  slug: library-management
---

## The problem

The assignment was explicit about the point: demonstrate real object-oriented design in C++, not just get a book-tracking app working. That meant the actual requirement underneath was "make the class hierarchy do real work" — fines, holds, and stock control all had to come out of the object model itself, not out of ad-hoc conditionals scattered through the UI code.

## Architecture decisions

**A pure-virtual interface, then a real inheritance tree on top of it.** `ILivro` declares `toString()` and `toFile()` as pure virtual — every book-like thing has to know how to render itself and how to persist itself, full stop. `Livro` implements the shared state (title, author, ISBN, minimum age, total/available/borrowed counts, its own list of holds) but stays abstract, and five concrete types sit on top: `LivroFiccao`, `LivroEducativo`, `LivroCientifico`, `Jornal`, `Revista`. Each type only carries the fields that are actually specific to it — genre for fiction, field of study for educational, knowledge area for scientific — instead of one `Livro` row with a pile of nullable columns.

**Multiple inheritance for periodicals, on purpose.** `Jornal` and `Revista` both inherit from `Livro` *and* from a separate `LivrosQuiosque` class that holds publication date, periodicity, and genre. Newspapers and magazines share those periodical-specific attributes with each other but not with fiction or scientific books, so pulling them into a second base class avoided duplicating those fields into both `Jornal` and `Revista` while keeping them out of `Livro` entirely, where they don't belong.

**Fines and holds as first-class objects, not booleans on a loan.** `Multa` (fine) isn't just a flag — it computes its own value from a static daily rate and a per-fine discount (`CalcularMulta(desconto)`), tracks days late, and knows whether it's been paid. `Reserva` (hold) links a specific reader to a specific book independently of any active loan, and `Livro` keeps its own list of holds against it so a book can be queried for "who's waiting."

**A Qt Widgets interface organized the same way the domain is — and a form that reshapes itself around the class hierarchy.** The UI isn't one screen with a dropdown; it's a dedicated management screen per domain (`gestaolivros` for books, `gestaoemprestimos` for loans, `gestaoleitores` for readers, plus a separate `admin` area) built in Qt Designer, hanging off a `mainmenu`, with focused dialogs — `AddBookDialog`, `EditBookDialog`, `ReservasDialog` — for the actual actions. The interesting piece is `AddBookDialog`: it's handed a type string when opened, and it *builds its own form fields at runtime* off the back of it, using `QFormLayout::addRow`/`removeRow`/`insertRow` — a Fiction book gets a genre field appended, an Educational book gets a field-of-study field, and a Newspaper doesn't just get extra fields, it removes the ISBN row entirely and replaces it with ISSN, then adds a `QDateEdit` with a live calendar popup for the publication date. The dialog is, in effect, a UI-layer mirror of the `Livro` inheritance tree: which concrete subclass gets constructed on submit is decided by which fields the form was built with.

## The hardest part

Two things, at different layers. Underneath, getting the multiple-inheritance layout right without it turning into a mess: `Jornal` and `Revista` both need everything `Livro` provides *and* everything `LivrosQuiosque` provides, with no ambiguity about which base a method call resolves to, and each still had to correctly override `toString()`/`toFile()` from the `ILivro` interface reached through `Livro` specifically. On top of that, keeping `AddBookDialog`'s dynamic field-building in sync with that same hierarchy — every time a book type gained or lost a field in the C++ model, the dialog's per-type branch had to be updated to match, by hand, since nothing enforced that the form and the class stayed in agreement.

## Result

A working Qt desktop app where registering, searching, borrowing, holding, and fining are all backed by a class hierarchy that's actually doing the categorization — and an interface that visibly reflects it, not a flat book table with a `type` string and a UI that pretends the types are different.
