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

Construído para o alpinista profissional João Garcia, o trabalho da app era organizar expedições de montanhismo — treks a montanhas específicas, cada uma com a sua própria dificuldade, datas, preço e capacidade de convidados —, deixar os participantes inscreverem-se e acompanharem, e captar dados de medição vindos do terreno, num contexto onde "ter sinal" não é uma suposição segura assim que se está perto da montanha em si.

## Decisões de arquitetura

**Um `Trek` como entidade central, modelado como uma expedição real, não um "evento" genérico.** Cada trek carrega o nome da montanha, altura, dificuldade, localidade e país, capacidade de convidados, duração em dias, preço, datas de início/fim, uma flag de ativo, e uma imagem de capa, lido e escrito através de uma `DatabaseReference` contra o Firebase Realtime Database. É estrutura suficiente para correr um fluxo de reserva a sério (este trek ainda está aberto, quantos dias, quanto custa) sem um backend para além do próprio Firebase.

**Realtime Database, escolhido especificamente pela sua história offline.** O SDK do Realtime Database mantém uma cache local em disco e consegue servir leituras e enfileirar escritas a partir dela quando não há ligação — mas isso é opt-in, não automático: `FirebaseDatabase.getInstance().setPersistenceEnabled(true)` tem de ser chamado antes de qualquer acesso à base de dados para realmente o ativar. A app chama-o explicitamente no fluxo de admin, na `SplashActivity`, antes de encaminhar para a `AdminActivity`. Do lado do participante, um helper dedicado `sendDataOffline(form: Form2)` envia dados de medição (`Measures/`) diretamente através de `database.push().setValue(form)` — a usar o próprio comportamento de escrita enfileirada do Realtime Database para garantir que uma medição feita sem sinal continua a ser registada e sincroniza assim que a conectividade volta, sem a app precisar de construir a sua própria lógica de retry/fila por cima.

**Participantes mantidos separados do nó do trek, não aninhados dentro dele.** Os participantes de um trek não são guardados como uma lista sob o nó `Trek` — são modelados como a sua própria entidade `Participant` (referência ao utilizador, nome) e consultados separadamente. Essa separação existe por uma razão bem concreta.

## A parte mais difícil

O Realtime Database é uma única árvore JSON, e não garante de forma fiável devolver uma lista genuína para algo que foi escrito como tal — um nó com chaves filhas esparsas, não sequenciais, ou de alguma forma irregulares pode voltar desserializado como um `Map` em vez de uma `List`, dependendo de como foi escrito. É uma armadilha bem conhecida do Realtime Database, e apareceu diretamente aqui: uma versão inicial do `Trek` guardava os participantes como uma lista embutida no próprio nó, e desserializá-la lançava exatamente essa incompatibilidade. A correção foi arquitetural, não um try/catch à volta do desserializador — tirar `Participant` para o seu próprio nó de topo, consultado de forma independente por trek em vez de confiar que voltaria corretamente moldado como filho aninhado de um objeto.

## Resultado

Uma app de organização de treks a funcionar, mais um portal web complementar, ambos a ler e escrever através do mesmo Firebase Realtime Database, com persistência offline explícita no fluxo de admin e um caminho de escrita offline dedicado para medições de terreno — construída para alguém a planear ou a juntar-se a uma expedição sem garantia de ligação ativa no momento em que precisa dela.
