---
title: "Sistema de Gestão de Biblioteca"
org: "Instituto Politécnico de Viseu"
dateRange: "Out 2024 – Dez 2024"
description: >-
  Uma aplicação desktop para gestão de livros de biblioteca, construída com princípios de OOP.
  Suporta registo de livros por categorias, empréstimos com controlo de stock, pesquisa por
  ISBN/título/autor, e validação de dados.
tags: ["C++", "Qt", "OOP"]
featured: false
caseStudy:
  slug: library-management
---

## O problema

O trabalho era explícito quanto ao objetivo: demonstrar design orientado a objetos a sério em C++, não só ter uma app de gestão de livros a funcionar. Isso significava que o requisito real por baixo era "fazer a hierarquia de classes trabalhar de verdade" — multas, reservas e controlo de stock tinham todos de vir do próprio modelo de objetos, não de condicionais ad-hoc espalhados pelo código da UI.

## Decisões de arquitetura

**Uma interface pura, e depois uma árvore de herança a sério em cima dela.** `ILivro` declara `toString()` e `toFile()` como puramente virtuais — tudo o que é um "livro" tem de saber representar-se e persistir-se, sem exceção. `Livro` implementa o estado partilhado (título, autor, ISBN, idade mínima, quantidades total/disponível/emprestada, a sua própria lista de reservas) mas mantém-se abstrata, e cinco tipos concretos assentam em cima: `LivroFiccao`, `LivroEducativo`, `LivroCientifico`, `Jornal`, `Revista`. Cada tipo só carrega os campos que lhe são realmente específicos — género para ficção, área de estudo para educativo, área de conhecimento para científico — em vez de uma única linha `Livro` com uma pilha de colunas nuláveis.

**Herança múltipla para publicações periódicas, de propósito.** `Jornal` e `Revista` herdam ambos de `Livro` *e* de uma classe separada `LivrosQuiosque`, que guarda data de publicação, periodicidade e género. Jornais e revistas partilham esses atributos específicos de periódicos entre si mas não com livros de ficção ou científicos, por isso puxá-los para uma segunda classe base evitou duplicar esses campos em `Jornal` e `Revista` ao mesmo tempo que os manteve completamente fora de `Livro`, onde não pertencem.

**Multas e reservas como objetos de primeira classe, não booleanos num empréstimo.** `Multa` não é só uma flag — calcula o seu próprio valor a partir de uma taxa diária estática e de um desconto por multa (`CalcularMulta(desconto)`), acompanha os dias de atraso, e sabe se já foi paga. `Reserva` liga um leitor específico a um livro específico, independentemente de qualquer empréstimo ativo, e `Livro` mantém a sua própria lista de reservas contra si, para que um livro possa ser consultado por "quem está à espera".

**Uma interface Qt Widgets organizada da mesma forma que o domínio — e um formulário que se reconfigura à volta da hierarquia de classes.** A UI não é um único ecrã com uma dropdown; é um ecrã de gestão dedicado por domínio (`gestaolivros` para livros, `gestaoemprestimos` para empréstimos, `gestaoleitores` para leitores, mais uma área `admin` separada) construído no Qt Designer, pendurado num `mainmenu`, com diálogos focados — `AddBookDialog`, `EditBookDialog`, `ReservasDialog` — para as ações em si. A peça interessante é o `AddBookDialog`: recebe uma string de tipo quando é aberto, e *constrói os seus próprios campos de formulário em tempo de execução* a partir disso, usando `QFormLayout::addRow`/`removeRow`/`insertRow` — um livro de Ficção recebe um campo de género acrescentado, um Educativo recebe um campo de área de estudo, e um Jornal não só recebe campos extra, como remove a linha de ISBN por completo e substitui-a por ISSN, acrescentando depois um `QDateEdit` com um calendário interativo para a data de publicação. O diálogo é, na prática, um espelho ao nível da UI da árvore de herança de `Livro`: qual subclasse concreta é construída ao submeter é decidido por quais campos o formulário foi construído.

## A parte mais difícil

Duas coisas, em camadas diferentes. Por baixo, acertar no layout de herança múltipla sem isso se tornar uma confusão: `Jornal` e `Revista` precisam ambos de tudo o que `Livro` fornece *e* de tudo o que `LivrosQuiosque` fornece, sem ambiguidade sobre qual base resolve uma dada chamada de método, e cada um tinha ainda de sobrepor corretamente `toString()`/`toFile()` a partir da interface `ILivro` alcançada especificamente através de `Livro`. Em cima disso, manter a construção dinâmica de campos do `AddBookDialog` sincronizada com essa mesma hierarquia — sempre que um tipo de livro ganhava ou perdia um campo no modelo C++, o ramo específico desse tipo no diálogo tinha de ser atualizado à mão, já que nada garantia que o formulário e a classe se mantinham de acordo.

## Resultado

Uma app desktop Qt a funcionar onde registar, pesquisar, emprestar, reservar e multar assentam todos numa hierarquia de classes que está realmente a fazer a categorização — e uma interface que a reflete visivelmente, não uma tabela de livros plana com uma string `tipo` e uma UI que finge que os tipos são diferentes.
