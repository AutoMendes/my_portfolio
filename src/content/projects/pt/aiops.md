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

As partes mais demoradas de entregar software — rever pull requests a sério, manter a infraestrutura como código segura e consciente de custos, notar e corrigir um pod a falhar às 3 da manhã — são exatamente as partes que se saltam sob pressão de tempo, mesmo sendo de onde vêm os incidentes a sério. A revisão manual, o debugging e a correção de erros não só demoram tempo — esse tempo cresce com o próprio código, por isso quanto mais uma aplicação escala, mais lentos se tornam estes processos. Um LLM não tem esse problema: a diferença de tempo entre rever um PR e rever uma centena é mínima. A revisão manual é reativa e não escala; a IA escala. A premissa do projeto era apontar LLMs para essas partes específicas, não como um chatbot colado ao lado do DevOps, mas ligado diretamente à pipeline, ao Kubernetes, e ao terminal que um humano já estaria a usar.

## Arquitetura

O sistema está organizado em cinco fases sequenciais que cobrem todo o ciclo de vida de IaC — Desenho (gerar Terraform/Helm a partir de uma prompt), Revisão (sete agentes + análise do diff de IaC), Validação (decisão do orquestrador + validação profunda de IaC), Deploy (estimativa de custos, depois rollout faseado), e Operação (auto-healing + deteção de drift) — modelada abaixo em notação C4. Três partes destacam-se e merecem detalhe: **revisão de PRs**, **segurança e custo de IaC**, e **auto-healing de Kubernetes** — as de maior valor e maior desafio técnico. Uma camada MCP partilhada e uma app desktop expõem essas mesmas capacidades de forma interativa; ambas cobertas mais abaixo, de forma breve.

<img src="/images/aiops/arquitetura_sistema_c4.png" alt="Arquitetura modular de agentes de IA a gerir o ciclo de vida de IaC, desde uma prompt até revisão, validação, deploy e operação" class="diagram-large" />

### Revisão de PRs

Um programador abre um PR; sete agentes analisam o diff em paralelo e publicam comentários estruturados. O orquestrador lê-os e decide: sem problemas críticos → aprova e faz auto-merge (squash); caso contrário → bloqueia e publica sugestões de correção clicáveis que o programador pode aceitar e re-submeter.

<img src="/images/aiops/uc1_pr_review.png" alt="Diagrama: programador abre um PR, sete agentes revêem em paralelo, orquestrador aprova e faz auto-merge ou bloqueia com sugestões" class="diagram-large" />

**Sete agentes revisores estreitos, um orquestrador que só fala depois de todos falarem.** Cada PR contra `dev`/`main` é revisto em paralelo por agentes especializados — qualidade de código, segurança, testes, performance, documentação, Docker, e configuração de pipeline/CI — cada um a publicar o seu próprio comentário com um marcador de severidade (🔴 CRITICAL, 🟡 WARNING, 💡 SUGGESTION). Nenhum fala com o outro nem precisa de concordar; um orquestrador separado corre só depois de todos terminarem e toma a única decisão que importa: qualquer CRITICAL bloqueia o merge, mais nada bloqueia. Separar "notar problemas" de "decidir o que fazer com eles" manteve cada agente individual simples e deixou a política de bloqueio a viver num único sítio.

**Correções como sugestões clicáveis do GitHub, não só comentários.** Quando o orquestrador bloqueia um PR, não fica pelo relatório — gera correções concretas via LLM e publica-as como blocos de sugestão nativos do GitHub no separador Files Changed, para um developer poder clicar em "Commit all suggestions" e aplicá-las de uma vez, em vez de implementar manualmente o que um agente de IA já escreveu.

![Um PR bloqueado com sugestões de correção geradas por LLM, mostradas como blocos de sugestão clicáveis do GitHub](/images/aiops/pr_sugestoes_clicaveis_en.png)

### Infraestrutura como Código (IaC)

Acionado por alterações a ficheiros Terraform, o `iac_generator` valida a configuração de infraestrutura e estima custos via o CLI do Infracost, publicando um relatório no PR. O veredicto (`VERDICT: APPROVED` ou `VERDICT: BLOCKED`) decide se a pipeline avança para `terraform apply` ou abre uma issue de bloqueio no GitHub.

**`iac_generator`, um módulo, cinco modos.** O mesmo agente trata de `generate` (templates Terraform/Helm a partir de uma prompt em linguagem natural), `validate`, `fix`, `ci` (validação de PR/push com veredicto de bloqueio), e `cost` (estimativa via Infracost) — uma única base de código atrás dos cinco, em vez de uma ferramenta separada por preocupação que divergiria ao longo do tempo. No modo `validate` lê o conjunto *completo* de ficheiros Terraform em conjunto em vez de um de cada vez, o que evita falsos positivos por falta de contexto que só existe noutro ficheiro do projeto (uma versão de provider fixada noutro sítio, por exemplo). Os problemas só são reportados com evidência concreta no código, divididos entre críticos (credenciais hardcoded, backend local, recursos sem bloco lifecycle), avisos e sugestões — resolvendo sempre num `VERDICT: BLOCKED` ou `VERDICT: APPROVED` estruturado sobre o qual uma pipeline pode agir diretamente.

![A validação Terraform do agente de IaC, uma descoberta por linha: severidade (PASS/FAIL), ficheiro, linha citada, e uma correção quando aplicável](/images/aiops/iac_findings_pass_fail.png)

**Agnóstico a cloud por design, incluindo on-premises.** Para além de Azure, AWS e GCP, `generate`/`validate`/`fix` vêm com prompts de sistema dedicados para ambientes locais/on-premises — Terraform com providers locais, namespaces Kubernetes via kubeconfig — porque infraestrutura sem acesso a cloud continua a ser infraestrutura que precisa de validação. A estimativa de custos nesse modo dispensa completamente o Infracost (não tem preços on-prem para mapear) e pede diretamente ao LLM para estimar os recursos necessários.

**Deteção de drift como uma verificação recorrente própria, não uma aplicação única.** A infraestrutura não é assumida como continuando exatamente como o Terraform a deixou — um `terraform plan -detailed-exitcode` agendado contra o estado real da cloud reporta um de três resultados (sem drift, erro, drift detetado) através da própria convenção de exit code do Terraform, para alterações manuais feitas fora da pipeline serem expostas em vez de divergirem silenciosamente do que está declarado em código.

![Cost Analysis (Infracost): custo mensal por recurso para main-production e main-staging, com subtotais e um resumo de total mensal/anual](/images/aiops/infracost_breakdown.png)

### Kubernetes (auto-healing)

O Azure Monitor / Logic Apps deteta um pod Kubernetes a falhar e aciona o agente de auto-healing. O agente diagnostica a causa raiz e, consoante o tipo de falha, aplica uma correção automática (para estados reiniciáveis) ou reporta o incidente para intervenção manual — gerindo o ciclo de vida da issue no GitHub em ambos os casos: criada quando detetada, fechada automaticamente quando a recuperação é confirmada.

<img src="/images/aiops/uc3_auto_healing.png" alt="Diagrama: Azure Monitor deteta um pod a falhar, agente de auto-healing diagnostica e corrige ou reporta, issue no GitHub aberta e fechada automaticamente" class="diagram-large" />

**Triagem antes de agir, nunca uma mutação direta do cluster.** Os estados de falha de pods estão divididos entre os que são seguros de auto-remediar (`CrashLoopBackOff`, `Error`, `OOMKilled`, `Failed`) e os que são só-relatório (`ImagePullBackOff`, `Pending`), porque reiniciar cegamente estes últimos não corrigiria — e poderia mascarar — o problema real. Além disso, uma heurística (pod com menos de 10 minutos de idade *e* 2+ reinícios) assinala um provável mau deploy; quando dispara, a correção não é um `kubectl rollback` direto — é um commit git a reverter o ficheiro de values do Helm relevante no branch que a Application do ArgoCD desse namespace segue, para o cluster ser corrigido através do mesmo caminho GitOps que qualquer outro deploy usa, sem divergência entre o que o auto-healing fez e o que a pipeline de deploy acredita estar em produção.

### Também faz parte do sistema

**Camada MCP.** As mesmas ferramentas de Kubernetes/GitHub/IaC/Infracost/Log Analytics que a pipeline usa de forma autónoma são também expostas como cinco servidores MCP, utilizáveis de forma interativa a partir do Claude Desktop ou do Claude Code CLI com os mesmos prompts (`iac_validate`, `auto_healing`, …) — uma camada de integração, dois consumidores, em vez de construir as mesmas integrações duas vezes.

**App desktop.** Uma GUI em PyQt6 (empacotada de forma standalone com PyInstaller) expõe o mesmo agente de IaC a quem prefere não tocar num terminal — agnóstica a provider (Azure OpenAI, Anthropic, Gemini, ou qualquer endpoint compatível com OpenAI via perfis de ligação nomeados) — e é o único sítio onde o fluxo on-premises ganha uma interface a sério: **perfis de máquina** deixam uma estimativa local de custo/viabilidade comparar a infraestrutura declarada contra a capacidade real de CPU/RAM/disco/GPU de uma máquina alvo específica, em vez de adivinhar.

![O separador Machines da app desktop: criação e gestão de perfis de máquina persistentes (SO, CPU, RAM, disco, GPU, largura de banda) usados nas estimativas de viabilidade on-premises](/images/aiops/desktop_app_machines.png)

**Fiabilidade.** As chamadas ao LLM passam por uma cadeia de provider primário/fallback (Groq primário, Azure OpenAI fallback via `LLM_PRIMARY_PROVIDER`/`LLM_FALLBACK_PROVIDER`) em vez de uma API fixa, para uma falha num único provider não derrubar de uma vez a revisão de PRs, a validação de IaC, ou o auto-healing.

## A parte mais difícil

Decidir quanto confiar de facto na automação perto de coisas que importam — um PR que faz auto-merge, um pod que é "corrigido", um plano do Terraform que é aplicado. A resposta não foi "confiar menos", foi construir as salvaguardas na própria arquitetura em vez de esperar que o LLM se comportasse: a severidade CRITICAL é um portão rígido na revisão de PRs independentemente do que mais um agente diga, os estados de pod que justificam restart vs. só-relatório são uma allowlist fixa em código em vez de um juízo do LLM, um mau deploy é revertido através de Git/ArgoCD em vez de uma mutação imperativa do cluster, e as aplicações de Terraform passam por OIDC em vez de credenciais cloud de longa duração. O LLM decide *o que está errado e como deve ser a correção*; nunca decide *se tem permissão para agir* — essa fronteira é código fixo, não uma prompt.

## O que distingue este projeto

A automação de pipeline comum é uma sequência fixa de verificações `if/then` — mais passos escritos num ficheiro YAML, mas ainda determinística e cega ao contexto. Este sistema substitui essa sequência por agentes que leem o código real e raciocinam sobre ele: uma pipeline em YAML apanha um ponto e vírgula em falta, mas não consegue dizer *porque* é que uma alteração é arriscada, estimar quanto vai custar antes de ser feito o deploy, ou decidir por si que um pod precisa de um revert no Git em vez de um restart. Ao combinar LLMs com GitHub, Azure Pipelines, Terraform e Kubernetes, o resultado é um sistema que revê o próprio código que o alimenta, prevê o custo da infraestrutura antes de ela ser criada, e se repara a si próprio em produção — não é um script mais esperto, é uma pipeline com juízo próprio.

## Resultado

Uma pipeline a funcionar demonstrada de ponta a ponta com duas APIs de demonstração deliberadamente emparelhadas: uma partida com problemas plantados (segredos hardcoded, SQL Injection, sem autenticação, um hot path O(n²), testes e documentação em falta) que a pipeline apanha e bloqueia, e uma versão segura da mesma API que passa sem problemas e faz auto-merge — provando que os agentes de revisão apanham o que devem apanhar, não só que correm. Ao lado, um crash de pod simulado dispara o ciclo completo de auto-healing (detetar → ler logs/eventos → diagnosticar → corrigir → confirmar recuperação → abrir/fechar uma issue no GitHub), e a pipeline de IaC corre validação de Terraform e estimativa de custos via Infracost em cada alteração de infraestrutura antes de ser aplicada.

Ao longo dos PRs abertos durante o desenvolvimento, 30 em 54 fizeram auto-merge e 12 foram bloqueados especificamente pelo agente de segurança — uma decisão determinística, baseada em CRITICAL, em vez de um juízo feito de raiz a cada vez. O auto-healing foi posto à prova em dezenas de cenários simulados de crash de pods, recuperando a maioria de forma autónoma e escalando para um humano sempre que o estado de falha não era um dos que tem permissão para tocar. A validação de IaC manteve sempre os seus achados baseados em evidência (ficheiro, linha e razão citados), precisamente para evitar que falsos positivos se acumulassem e corroessem a confiança no veredicto de bloqueio.
