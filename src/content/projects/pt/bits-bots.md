---
title: "Bits & Bots — Plataforma para Crianças Sobredotadas"
org: "Projeto Independente (em parceria com a ANEIS Braga)"
dateRange: "Jul 2026 – Presente"
description: >-
  Uma plataforma de educação STEAM (robótica, eletrónica, programação e desafios STEAM) para
  crianças sobredotadas dos 6 aos 16 anos, construída em parceria com a ANEIS Braga, com
  acompanhamento de progresso para monitores. Plataforma web full-stack (Node.js/Express,
  MongoDB, React) e uma app React Native complementar para monitores, implantada no Google Cloud
  Run com infraestrutura gerida por Terraform e CI/CD automatizado.
tags: ["Node.js", "MongoDB", "React", "React Native/Expo", "Terraform", "Docker", "GCP Cloud Run"]
featured: true
caseStudy:
  slug: bits-bots
---

## O problema

Sou voluntário na ANEIS, a acompanhar atividades educativas para crianças sobredotadas. Havia dois problemas: os materiais (PDFs, fichas de trabalho) viviam numa pasta do Google Drive, e cada sessão começava com alguém a escrever um link encurtado no quadro para as crianças escreverem — desajeitado, e um novo ponto de fricção sempre que acontecia. Além disso, os monitores não tinham uma forma real de acompanhar o progresso de cada criança pelo material — vivia na memória e em notas dispersas. Construí o Bits & Bots para resolver os dois: um sítio estruturado para publicar conteúdo de robótica, eletrónica e programação que não depende de um link no quadro, e uma forma de os monitores verem mesmo como cada criança (dos 6 aos 16 anos) está a progredir por ele.

## Decisões de arquitetura

**Sem inscrição explícita.** Todas as crianças têm acesso a todos os cursos desde o momento em que entram — uma `Matricula` (registo de progresso) é criada automaticamente na primeira vez que uma criança abre um curso, em vez de através de um passo de inscrição separado. Menos ecrãs, menos sítios onde um monitor teria de adicionar manualmente uma criança a algo antes de ela poder começar.

**A estrutura dos cursos espelha como o conteúdo é realmente ensinado:** um `Curso` contém uma lista ordenada de `Atividades`, cada uma com uma lista ordenada de `Níveis` (Markdown simples — não há necessidade de um editor de conteúdo rico para isto), a terminar num único `Quiz`. A `Matricula` guarda a posição atual da criança mais o histórico completo de tentativas de quiz e validações do monitor, para que um monitor veja não só "onde está agora" mas "como chegou aqui".

**Monorepo, dois deployables, um único ponto de entrada.** Backend (Node/Express, MongoDB via Mongoose) e frontend (React/Vite/Tailwind) vivem no mesmo repo como npm workspaces. Em produção, o container do frontend é a *única* coisa exposta publicamente — é nginx a servir o bundle Vite e a fazer proxy reverso de `/api` diretamente para o container do backend através da rede interna do Cloud Run. O próprio backend não tem qualquer ingress público. Menos uma coisa a proteger, menos uma entrada DNS a gerir.

**Infraestrutura como código a sério.** Os serviços Cloud Run, o Artifact Registry, o bucket de avatares, as contas de serviço e o domínio estão todos definidos em Terraform, não montados à mão numa consola. Os deploys são só "merge para main" — o GitHub Actions constrói e publica uma imagem nova em cima do que o Terraform já provisionou; a infraestrutura em si só muda quando alguém corre o Terraform de propósito.

**Uma app complementar que faz uma coisa só.** A app React Native (Expo) é só para monitores — deliberadamente sem ecrãs para crianças. Fala com a mesma API do backend, guarda o refresh token em `expo-secure-store` e o access token só em memória (não persistido), e partilha os design tokens com o frontend web para os dois não se desalinharem visualmente ao longo do tempo.

## Arquitetura (C4) e casos de uso

**Contexto:** duas personas (Criança, Monitor) a interagir com a plataforma como um todo.

<img src="/images/bits-bots/c4-context-pt.svg" alt="Diagrama de contexto C4: Criança e Monitor a interagir com a plataforma Bits & Bots" class="diagram-medium" />

**Containers:** SPA React servida por Nginx, app React Native só para monitores, backend Node/Express, MongoDB e bucket de imagens.

<img src="/images/bits-bots/c4-container-pt.svg" alt="Diagrama de containers C4: SPA React, app React Native, backend Node/Express, MongoDB e bucket de imagens" class="diagram-large" />

**Casos de uso:** agrupados por persona. A Criança acede a cursos, percorre níveis e submete quizzes; o Monitor gere o conteúdo pedagógico (incluindo importar níveis/materiais a partir de um ficheiro `.md`, em vez de escrever markdown à mão) e valida o progresso de cada criança.

<img src="/images/bits-bots/use-cases-pt.svg" alt="Diagrama de casos de uso: Criança e Monitor e as ações que cada um pode realizar" class="diagram-medium" />

## A parte mais difícil: fazer o desenvolvimento local funcionar

Nada da arquitetura acima foi a parte difícil — a rede do WSL2 foi. O backend e o Metro bundler correm dentro do namespace de rede do WSL2, que não é alcançável a partir de um telemóvel físico na mesma Wi-Fi, nem a partir do emulador do Android Studio sem tratamento especial. Fazer o telemóvel real de um monitor falar com um backend a correr no meu portátil exigiu configurar port proxies do lado do Windows (`netsh interface portproxy`) a encaminhar tanto a porta da API como a porta do bundler do Metro para dentro da VM do WSL2, além de forçar o Metro a anunciar o IP da LAN do Windows em vez do seu próprio IP interno do WSL2 via `REACT_NATIVE_PACKAGER_HOSTNAME`. Nada disto é específico do Bits & Bots — é o "imposto" de um ambiente de desenvolvimento Windows/WSL2 mais React Native — mas é o tipo de yak-shaving que come uma tarde inteira se não souberes que vem aí.

## Resultado (em curso)

Tanto a plataforma web como a app dos monitores estão em produção, com conteúdo de cursos, quizzes e acompanhamento de progresso a funcionar de ponta a ponta. É um projeto ativo, não terminado — continuo a ser o único developer, por isso a cobertura de testes está intencionalmente concentrada nos módulos com maior probabilidade de falhar em silêncio (autenticação, acompanhamento de progresso) em vez de tudo.
