---
title: "Food-4-U"
org: "Instituto Politécnico do Cávado e do Ave (IPCA)"
dateRange: "Fev 2022 – Jun 2022"
description: >-
  Um sistema full-stack de gestão de restaurante: uma app Android em Kotlin (MVVM) com uma API
  REST em C#/.NET, menu digital, reservas de mesa, e processamento de pedidos com MySQL.
tags: ["Kotlin", "C#/.NET", "MySQL"]
featured: true
caseStudy:
  slug: food4u
---

## O problema

Construído para um restaurante real ("Francesinha Portuguesa"), o objetivo era tirar o pedido do menu de papel e da comunicação verbal com os empregados de mesa — deixar o cliente consultar o menu e pedir a partir da própria mesa, com a cozinha, a caixa e a própria gestão do restaurante a trabalhar sobre os mesmos dados ao vivo, em vez de um talão escrito à mão e um caderno de mesas.

## Decisões de arquitetura

**Código QR como ponto de entrada, não uma conta.** O cliente lê um código na mesa e cai diretamente no menu — sem fricção de registo para o que costuma ser uma visita única. A API gera os códigos com o IronBarCode, e um registo `Cliente` — com nome, email, NIF, género, idade, localidade e concelho — capta quem fez o pedido sem exigir um sistema de contas completo à partida.

**Menu modelado com dados operacionais a sério, não só nome e preço.** Um `Item` carrega `temp_prep` (tempo de preparação em minutos), uma flag `destaque`, uma categoria e subcategoria, e a sua própria avaliação corrente — por isso o menu não é uma lista estática, são dados que tanto a cozinha como o ecrã de sala podem usar (o que demora a fazer, o que está a ser destacado hoje, o que é realmente bom segundo os clientes).

**Separação em três camadas: cliente Kotlin, API C#/.NET, MySQL.** Uma separação standard, escolhida para que o cliente Android voltado para o restaurante (tablets na mesa, ou uma caixa) e o backend pudessem evoluir de forma independente — a API é a única coisa que toca na base de dados.

**Um ciclo de feedback embutido no próprio pedido, a alimentar analytics a sério.** Cada `Pedido` carrega duas avaliações — `avaliação` para a comida, `aval_funcio` para o serviço — além de se já foi pago. Essas avaliações, mais os campos demográficos de cada cliente, alimentam um conjunto de endpoints de analytics que a API expõe diretamente: valor médio de pedido no geral, média e contagem de pedidos segmentados por género, receita total, e o desvio-padrão do valor dos pedidos. Não é um dashboard colado depois — é business intelligence desenhada no modelo do pedido desde o início.

## A parte mais difícil

Um pedido não é feito de uma vez — vão-se acrescentando itens conforme uma mesa decide o que quer, por vezes ao longo de vários minutos, e o pedido precisa de acumular corretamente em vez de ser substituído. Isso significou separar `Pedido` (o cabeçalho do pedido — total, estado de pagamento, avaliações, mesa, cliente) de `PedidoItens` (as suas linhas), com `PedidoItens.GetItemsFromPedido` a remontar uma fatura completa e detalhada (`PedidoItensFatura`) a partir de um ID de pedido, sob pedido. Fazer "acrescentar mais um item ao que já pedimos" comportar-se como uma mesa real espera — sem uma nova adição criar um segundo pedido desligado — é o que tornou a separação em duas tabelas necessária, não opcional.

## Resultado

Um fluxo de pedido que vai de ler o código QR de uma mesa a um pedido colocado e detalhado que tanto a cozinha como a caixa veem, com o restaurante a conseguir consultar gasto médio, volume de pedidos e receita divididos por demografia de cliente diretamente da mesma API — construído e usado num restaurante real, não hipotético.
