---
title: "Everest — App"
org: "Instituto Politécnico do Cávado e do Ave (IPCA)"
dateRange: "Out 2022 – Fev 2023"
description: >-
  Uma solução full-stack para o alpinista profissional João Garcia: gestão de atletas e
  organização de eventos através de uma app mobile em Kotlin (MVVM) e um portal web, com
  arquitetura offline-first e sincronização via Firebase.
tags: ["Kotlin", "MVVM", "Firebase"]
featured: false
caseStudy:
  slug: everest
---

## O problema

Construído para o alpinista profissional João Garcia, o trabalho da app era organizar expedições de montanhismo — treks a montanhas específicas, cada uma com a sua própria dificuldade, datas, preço e capacidade de convidados — e deixar os participantes inscreverem-se e acompanharem, num contexto onde "ter sinal" não é uma suposição segura assim que se está perto da montanha em si.

## Decisões de arquitetura

**Um `Trek` como entidade central, modelado como uma expedição real, não um "evento" genérico.** Cada trek carrega o nome da montanha, altura, dificuldade, localidade e país, capacidade de convidados, duração em dias, preço, datas de início/fim, uma flag de ativo, e uma imagem de capa — guardado diretamente no Firebase Firestore. É estrutura suficiente para correr um fluxo de reserva a sério (este trek ainda está aberto, quantos dias, quanto custa) sem um backend para além do próprio Firestore.

**Firestore como backend real, com leituras offline embutidas.** O SDK cliente do Firestore guarda documentos em cache local e serve leituras a partir dessa cache quando não há ligação, sincronizando escritas assim que a conectividade volta — que é exatamente a propriedade de que esta app precisava dado onde os seus utilizadores realmente estão. É isto que "offline-first" significa concretamente aqui: a app não finge que tem rede, está construída sobre um cliente de base de dados cujo design todo assume que pode não ter.

**Participantes mantidos separados do documento do trek, não aninhados dentro dele.** Os participantes de um trek não são guardados como um campo de lista no objeto `Trek` — são modelados como a sua própria entidade `Participant` (referência ao utilizador, nome) e consultados separadamente. Essa separação existe por uma razão bem concreta.

## A parte mais difícil

O Firestore não garante que devolve uma `List` para algo que foi escrito como lista — coleções aninhadas podem voltar desserializadas como um `HashMap` em bruto, dependendo de como foram escritas e lidas. É uma interação documentada do Firestore com o Gson, e apareceu diretamente neste projeto: uma versão inicial do `Trek` tinha os participantes como um campo de lista embutido, e desserializá-lo lançava exatamente essa incompatibilidade. A correção foi arquitetural, não um try/catch — tirar `Participant` para a sua própria coleção, consultada de forma independente por trek, em vez de confiar que voltaria corretamente aninhado dentro de um documento. É o tipo de bug que parece "só acrescentar tratamento de erros" até perceberes que o problema é mesmo a forma dos dados que voltam, não o código que os lê.

## Resultado

Uma app de organização de treks a funcionar, mais um portal web complementar, ambos a ler e escrever através do mesmo backend Firestore, utilizável por alguém a planear ou a juntar-se a uma expedição sem garantia de ligação ativa no momento em que precisa dos dados.
