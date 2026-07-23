---
title: "IPV Smart Campus"
org: "Instituto Politécnico de Viseu"
dateRange: "Out 2025 – Dez 2025"
description: >-
  Sistema de monitorização em tempo real de dados de sensores em todo o campus, usando hardware
  IoT. Integração de Arduino e um LoRa Shield para recolha de dados de longo alcance, uma API
  REST de alto desempenho em Go com PostgreSQL, e um dashboard em React para visualização em
  tempo real.
tags: ["Go", "PostgreSQL", "React", "Arduino", "LoRa"]
featured: true
caseStudy:
  slug: ipv-smart-campus
---

## O problema

Um campus tem sensores espalhados por edifícios e espaços exteriores, mas nenhum sítio único para ver o que estão a reportar ou gerir a que dispositivo pertence cada localização. O objetivo era um sistema capaz de receber leituras de hardware IoT espalhado pelo campus e transformá-las em algo que uma equipa de instalações pudesse mesmo consultar em tempo real.

## Decisões de arquitetura

**Dois serviços, bem separados.** Uma API REST em Go (PostgreSQL, driver `pgx`, containerizada) é a fonte única de verdade para dispositivos, localizações e medições. Um dashboard separado em React/TypeScript/Vite é puramente um consumidor dessa API — não toca diretamente na base de dados. Essa separação significa que a API pode vir a servir outros consumidores mais tarde sem o dashboard estar no caminho.

**LoRaWAN via ChirpStack, não uma stack de rádio construída de raiz.** Os nós Arduino com LoRa Shield não falam diretamente com esta API — juntam-se a uma rede LoRaWAN gerida pelo ChirpStack (um servidor de rede LoRaWAN open-source), que trata do protocolo de rádio em si, autenticação de dispositivos e descodificação. O ChirpStack encaminha depois cada uplink descodificado para a API Go como um webhook HTTP. Essa separação importa: a API não precisa de saber nada sobre procedimentos de join do LoRaWAN ou formatos de trama — recebe apenas JSON limpo e persiste-o, enquanto o ChirpStack trata da parte difícil e específica do protocolo, que uma implementação de raiz teria consumido a maior parte do projeto.

**Dispositivos podem ser fixos ou móveis, resolvidos numa única query.** Um dispositivo tem um campo `type`. Dispositivos do tipo `gps` têm a sua posição resolvida a partir da sua medição mais recente com GPS (`ORDER BY timestamp DESC LIMIT 1` na tabela `measurements`); todos os outros resolvem a posição a partir de uma linha `locations` associada via `location_id`. Ambos os ramos vivem numa única query SQL com uma expressão `CASE` por coordenada, em vez de dois caminhos de código separados que pudessem divergir com o tempo — um sensor estacionário aparafusado a uma parede e um sensor que se move pelo campus são a mesma query, só um ramo diferente do mesmo `CASE`.

## A parte mais difícil

Fazer com que essa resolução de localização fixa vs. GPS vivesse na camada da base de dados como uma única query honesta, em vez de escapar para código de aplicação como duas pesquisas diferentes que quem chama tem de saber escolher entre elas. Chegar a um único `SELECT` com `CASE WHEN d.type = 'gps' THEN (subquery em measurements) ELSE l.latitude END` (e o mesmo para a longitude) significou que `GET /devices/with-location` nunca precisa de perguntar "isto é um dispositivo GPS ou não" — todos os que chamam recebem uma coordenada resolvida independentemente do tipo de dispositivo, e a distinção fica totalmente contida na query que a produz.

## Resultado

Um pipeline de ponta a ponta: os nós Arduino/LoRa juntam-se à rede LoRaWAN, o ChirpStack descodifica e envia por webhook cada leitura para a API Go, as medições ficam em PostgreSQL, e um dashboard ao vivo mostra a localização atual e corretamente resolvida de cada dispositivo junto das suas leituras — sem o frontend ou a API alguma vez terem de tratar um sensor móvel como caso especial.
