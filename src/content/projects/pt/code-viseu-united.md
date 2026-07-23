---
title: "Code Viseu United — Clube de Futebol Fictício"
org: "Instituto Politécnico de Viseu"
dateRange: "Set 2025 – Jan 2026"
description: >-
  Uma plataforma digital abrangente e multifuncional para um clube de futebol, centralizando
  e-commerce (merchandising), bilhética, informação de plantel/jogos, notícias e relatórios
  (vendas, desempenho, rankings).
tags: ["Django", "PostgreSQL", "MongoDB"]
featured: false
caseStudy:
  slug: code-viseu-united
---

## O problema

O dia a dia de um clube de futebol passa por departamentos que não partilham naturalmente um sistema: vendas (merchandising, bilhetes), marketing (notícias, comunicados) e administração (plantel, jogos, utilizadores). Tratar tudo isso como um painel de administração único e plano significaria cada departamento a navegar por ecrãs pensados para outra pessoa. O objetivo era construir uma plataforma organizada como o clube realmente funciona.

## Decisões de arquitetura

**Três painéis de back-office, não um.** `admin_panel`, `marketing_panel` e `sales_panel` são apps Django separadas dentro do mesmo projeto, cada uma orientada ao que esse departamento precisa — gestão de plantel/jogos/utilizadores num, notícias/conteúdo noutro, e-commerce/bilhética/relatórios no terceiro. Espelha o organograma real do clube em vez de forçar uma superfície partilhada.

**MongoDB como a verdadeira base de dados da aplicação — nada do ORM do Django.** O `models.py` da app está vazio. Todos os dados do clube (plantel, jogos, merchandising, bilhetes, notícias) passam por uma camada `mongo.py` escrita à mão a falar com o MongoDB via `pymongo`, ignorando por completo o ORM do Django, que não tem qualquer noção nativa de um document store. Além disso, ambas as bases de dados — os dados de aplicação em MongoDB *e* a instância PostgreSQL que serve a autenticação/sessões/admin do próprio Django — são alcançadas através de túneis SSH separados (`SSHTunnelForwarder`) para um servidor remoto, em vez de expor qualquer uma das portas de base de dados diretamente.

**Simular garantias relacionais em cima de um document store, de propósito.** O `_id` nativo do MongoDB é um `ObjectId` — não sequencial, não legível por humanos, e não o que os dados de bilhética ou encomendas de um clube deviam parecer. Por isso o `mongo.py` implementa o seu próprio auto-incremento: uma coleção `sequencias` guarda o próximo ID por nome de coleção, incrementado atomicamente via `find_one_and_update` com `upsert=True`, e cada inserção chama `nextval()` antes de escrever. O `update_doc` vai mais longe e implementa à mão uma semântica de "find or create" ao estilo upsert — se um documento que corresponda a um filtro não existir, sintetiza um (com um novo ID sequencial) em vez de falhar, imitando o que um `get_or_create` de um ORM daria se o ORM do Django realmente funcionasse com o Mongo.

**Renderizado no servidor, estilizado com django-tailwind e django-material.** Sem framework de frontend separado — os próprios templates do Django, bem estilizados em vez de deixados nos valores por defeito do Bootstrap-admin. Para esta escala, um frontend SPA à parte estaria a resolver um problema que ainda não existia.

## A parte mais difícil

Construir uma camada de dados que *parece* relacional — IDs sequenciais e previsíveis, semântica find-or-create, formas de documento consistentes por coleção — em cima de uma base de dados que nativamente não dá nada disso, e fazê-lo completamente à mão porque o ORM do Django simplesmente não chega ao MongoDB. Cada uma dessas garantias que o Postgres/Django dariam de graça (auto-incremento, `get_or_create`, consistência de schema) teve de ser deliberadamente reimplementada em `mongo.py`, e reimplementada com correção suficiente para que os três painéis de back-office construídos em cima dela a pudessem tratar como um ORM sem precisarem de saber que não era.

## Resultado

Uma plataforma a funcionar nos três painéis: merchandising e bilhética do lado das vendas, notícias e conteúdo do lado do marketing, e administração de plantel/jogos/utilizadores — com relatórios de vendas, desempenho e rankings a virem dos dados subjacentes em vez de serem montados à mão.
