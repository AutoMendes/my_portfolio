---
title: "SoftSkills — Plataforma de Formação e Partilha de Conhecimento"
org: "Instituto Politécnico de Viseu"
dateRange: "Fev 2025 – Jul 2025"
description: >-
  Uma plataforma interna que centraliza a formação de colaboradores e a partilha de conhecimento
  para apoiar o trabalho remoto. Web (Front Office/Back Office) e uma app mobile/tablet com
  papéis configuráveis, gestão de cursos, acompanhamento de progresso e notificações automáticas.
tags: ["Node.js", "Flutter"]
featured: true
caseStudy:
  slug: softskills
---

## O problema

A formação interna na maioria das empresas está dispersa — um curso anunciado por email, materiais numa drive partilhada, sem forma real de ver quem terminou o quê, e sem forma de destacar conteúdo que alguém realmente quisesse a seguir. O objetivo era centralizar tudo numa plataforma: consultar e inscrever-se em cursos, acompanhar progresso, receber lembretes automáticos conforme as coisas começam e terminam, partilhar conhecimento com colegas, e ser direcionado para o que é relevante em vez de percorrer um catálogo plano.

## Decisões de arquitetura

**Uma separação curso/ocorrência, não uma tabela "curso" plana.** `Formacao` é o curso em si — o seu tópico, descrição, duração. `OcorrenciaFormacao` é uma edição concreta e agendada dele: datas de início/fim, número de edição, prazo de inscrição, vagas totais e vagas disponíveis. Essa distinção é o que faz "o mesmo curso, a correr três vezes por ano, cada uma com a sua própria capacidade" encaixar naturalmente em vez de ser um contorno.

**Um motor de recomendação a sério, não uma lista de "cursos populares".** O backend constrói recomendações por utilizador a partir de dois sinais: tópicos que marcou explicitamente como favoritos (`FavoritosTopico`), e tópicos de cursos que já concluiu (inscrições em estado `'Aprovado'`), destacando depois ocorrências futuras nesses tópicos em que ainda não está inscrito. É um recomendador pequeno, baseado em conteúdo, mas é genuinamente guiado pelo que a pessoa fez na plataforma, não um ranking estático.

**Um fórum de partilha de conhecimento dentro da mesma plataforma.** Para além dos cursos, existe um sistema completo de publicações e respostas — `Publicacao` e `Resposta`, cada uma com os seus próprios anexos e avaliações (`AvaliacaoPublicacao`/`AvaliacaoResposta`), mais um modelo `Denuncia` para moderação. É construído como o seu próprio subsistema, com os seus próprios modelos, não colado aos dados dos cursos — partilhar conhecimento e fazer um curso são atividades relacionadas mas diferentes, e o modelo de dados trata-as como tal.

**Transições de estado dos cursos guiadas por cron, não por alguém a olhar para um calendário.** Um job `node-cron` corre diariamente, move ocorrências para `'Em Curso'` na data de início e `'Terminado'` na data de fim, e — em cada transição — dispara tanto uma notificação in-app (via Firebase Cloud Messaging, tanto para a web como para a app Flutter) como um email através do `nodemailer`. Ninguém tem de alternar manualmente o estado de um curso; a automação é a fonte de verdade sobre quando um curso visivelmente começa e termina.

**Detalhes de segurança que não aparecem numa lista de funcionalidades.** Os JWTs são explicitamente colocados numa blacklist (`TokenBlacklist`) ao fazer logout, em vez de simplesmente expirarem naturalmente, para um token roubado não poder ser reutilizado depois de um utilizador terminar sessão. Registos não verificados são apagados por um cron noturno se não confirmarem no espaço de 24 horas, para a tabela de utilizadores não acumular contas abandonadas e não verificáveis. Materiais de curso e certificados gerados (com `pdfkit`) vão para o S3 através do `multer-s3`, não para o disco do próprio servidor da API.

## A parte mais difícil

Tornar a query de recomendação suficientemente barata para correr a cada carregamento de página. Construir "tópicos de cursos concluídos, menos tópicos já marcados como favoritos, cruzados com ocorrências futuras em que o utilizador não está inscrito" como um conjunto único de queries Sequelize — em vez de puxar todas as inscrições e ocorrências para memória e filtrar em JavaScript — significou apoiar-me em operações de `Set` para a desduplicação de IDs e deixar a base de dados fazer os joins, para o endpoint se manter rápido à medida que o número de formações e inscrições cresce, em vez de degradar linearmente com o uso da plataforma.

## Resultado

Uma plataforma a funcionar de ponta a ponta, espelhada entre web e mobile/tablet em Flutter (com a sua própria localização): consultar e inscrever-se em cursos, receber recomendações do que é relevante a seguir, acompanhar estado e histórico por formando, fazer quizzes e tarefas com acompanhamento de submissões, ganhar badges, partilhar e discutir conhecimento no fórum, e receber notificações automáticas por push/email conforme os cursos começam e terminam — com materiais, certificados e moderação todos apoiados em infraestrutura real em vez de trabalho administrativo manual.
