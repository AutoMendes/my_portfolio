---
title: "AIOps — Plataforma de Automação DevOps com IA"
org: "Projeto Final · Instituto Politécnico de Viseu / DevScope"
dateRange: "Fev 2026 – Jun 2026"
description: >-
  Projeto final de curso a integrar LLMs em pipelines de DevOps: revisão de PRs multi-agente,
  geração e validação de IaC com Terraform, e auto-healing autónomo de Kubernetes,
  construído com servidores FastMCP próprios, implantado no Azure (AKS, Azure Pipelines).
tags: ["Python", "Terraform", "Kubernetes", "Azure", "MCP", "LLMs"]
featured: true
caseStudy:
  slug: aiops
---

## O problema

As partes menos glamorosas de entregar software — rever pull requests a sério, manter a infraestrutura como código segura e consciente de custos, notar e corrigir um pod a falhar às 3 da manhã — são exatamente as partes que se saltam sob pressão de tempo, mesmo sendo de onde vêm os incidentes a sério. A premissa do projeto era apontar LLMs para essas partes específicas, não como um chatbot colado ao lado do DevOps, mas ligado diretamente à pipeline, ao Kubernetes, e ao terminal que um humano já estaria a usar.

## Decisões de arquitetura

**Sete agentes revisores estreitos, um orquestrador que só fala depois de todos falarem.** Cada PR contra `dev`/`main` é revisto em paralelo por agentes especializados — qualidade de código, segurança, testes, performance, documentação, Docker, e configuração de pipeline/CI — cada um a publicar o seu próprio comentário com um marcador de severidade (🔴 CRITICAL, 🟡 WARNING, 💡 SUGGESTION). Nenhum fala com o outro nem precisa de concordar; um orquestrador separado corre só depois de todos terminarem e toma a única decisão que importa: qualquer CRITICAL bloqueia o merge, mais nada bloqueia. Separar "notar problemas" de "decidir o que fazer com eles" manteve cada agente individual simples e deixou a política de bloqueio a viver num único sítio.

**Correções como sugestões clicáveis do GitHub, não só comentários.** Quando o orquestrador bloqueia um PR, não fica pelo relatório — gera correções concretas via LLM e publica-as como blocos de sugestão nativos do GitHub no separador Files Changed, para um developer poder clicar em "Commit all suggestions" e aplicá-las de uma vez, em vez de implementar manualmente o que um agente de IA já escreveu.

**Servidores MCP como a única camada de interface, usada tanto pela pipeline como por um humano.** Cinco servidores MCP próprios (GitHub, Kubernetes, IaC, Infracost, Log Analytics) expõem os mesmos primitivos — `list_pods`, `get_pod_logs`, `get_pod_events`, validação de Terraform, estimativa de custos — como ferramentas. O agente de auto-healing em CI e o servidor MCP de Kubernetes chamam exatamente o mesmo tipo de funções wrapper de `kubectl` por baixo; a diferença é só *quem está a conduzir*. Ligar os servidores ao Claude Desktop com os prompts fornecidos (`iac_validate`, `iac_generate`, `iac_costs`, `auto_healing`, …) dá a uma pessoa, de forma interativa, as mesmas ferramentas de diagnóstico e remediação que a pipeline usa de forma autónoma — uma camada de integração, dois consumidores.

**Uma app desktop nativa como terceira interface, para quem não quer um terminal — e agnóstica a provider por design.** Uma GUI em PyQt6 (empacotada de forma standalone com PyInstaller) envolve o agente de IaC numa janela de dois painéis — um painel de configuração para perfis de ligação e definições, um painel de output em streaming alimentado por uma thread de trabalho em segundo plano através de um temporizador de flush a cada 80ms, para a UI se manter responsiva enquanto o LLM transmite uma resposta em vez de bloquear à espera dela. Ao contrário do routing fixo Groq-primário/Azure-fallback da pipeline de CI, a app desktop deixa um utilizador guardar múltiplos perfis de ligação nomeados contra Azure OpenAI, Anthropic, Google Gemini, ou qualquer endpoint genérico compatível com OpenAI — para trocar de, digamos, Azure para Claude para um modelo alojado localmente ser um dropdown, não uma alteração de código.

**Chamadas ao LLM passam por uma cadeia de provider primário/fallback, não uma API fixa.** O Groq é o provider primário, com o Azure OpenAI configurado como fallback automático (`LLM_PRIMARY_PROVIDER`/`LLM_FALLBACK_PROVIDER`), para uma falha num único provider não derrubar de uma vez a revisão de PRs, a validação de IaC, ou o auto-healing — uma decisão de fiabilidade real, não hipotética, para algo pensado para correr sem supervisão em CI.

**Deteção de drift como uma verificação recorrente própria, não uma aplicação única.** A infraestrutura não é assumida como continuando exatamente como o Terraform a deixou — um `terraform plan -detailed-exitcode` agendado contra o estado real da cloud reporta um de três resultados (sem drift, erro, drift detetado) através da própria convenção de exit code do Terraform, para alterações manuais feitas fora da pipeline serem expostas em vez de divergirem silenciosamente do que está declarado em código.

**Auto-healing que faz triagem antes de agir, e nunca muta o cluster diretamente.** Os estados de falha de pods estão divididos entre os que são seguros de auto-remediar (`CrashLoopBackOff`, `Error`, `OOMKilled`, `Failed`) e os que são só-relatório (`ImagePullBackOff`, `Pending`), porque reiniciar cegamente estes últimos não corrigiria — e poderia mascarar — o problema real. Além disso, uma heurística (pod com menos de 10 minutos de idade *e* 2+ reinícios) assinala um provável mau deploy; quando dispara, a correção não é um `kubectl rollback` direto — é um commit git a reverter o ficheiro de values do Helm relevante no branch que a Application do ArgoCD desse namespace segue, para o cluster ser corrigido através do mesmo caminho GitOps que qualquer outro deploy usa, sem divergência entre o que o auto-healing fez e o que a pipeline de deploy acredita estar em produção.

## A parte mais difícil

Decidir quanto confiar de facto na automação perto de coisas que importam — um PR que faz auto-merge, um pod que é "corrigido", um plano do Terraform que é aplicado. A resposta não foi "confiar menos", foi construir as salvaguardas na própria arquitetura em vez de esperar que o LLM se comportasse: a severidade CRITICAL é um portão rígido na revisão de PRs independentemente do que mais um agente diga, os estados de pod que justificam restart vs. só-relatório são uma allowlist fixa em código em vez de um juízo do LLM, um mau deploy é revertido através de Git/ArgoCD em vez de uma mutação imperativa do cluster, e as aplicações de Terraform passam por OIDC em vez de credenciais cloud de longa duração. O LLM decide *o que está errado e como deve ser a correção*; nunca decide *se tem permissão para agir* — essa fronteira é código fixo, não uma prompt.

## Resultado

Uma pipeline a funcionar demonstrada de ponta a ponta com duas APIs de demonstração deliberadamente emparelhadas: uma partida com problemas plantados (segredos hardcoded, SQL Injection, sem autenticação, um hot path O(n²), testes e documentação em falta) que a pipeline apanha e bloqueia, e uma versão segura da mesma API que passa sem problemas e faz auto-merge — provando que os agentes de revisão apanham o que devem apanhar, não só que correm. Ao lado, um crash de pod simulado dispara o ciclo completo de auto-healing (detetar → ler logs/eventos → diagnosticar → corrigir → confirmar recuperação → abrir/fechar uma issue no GitHub), e a pipeline de IaC corre validação de Terraform e estimativa de custos via Infracost em cada alteração de infraestrutura antes de ser aplicada.
