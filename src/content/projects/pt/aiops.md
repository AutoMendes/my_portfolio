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

## Arquitetura

O sistema está organizado em cinco fases sequenciais que cobrem todo o ciclo de vida de IaC — Desenho (gerar Terraform/Helm a partir de uma prompt), Revisão (sete agentes + análise do diff de IaC), Validação (decisão do orquestrador + validação profunda de IaC), Deploy (estimativa de custos, depois rollout faseado), e Operação (auto-healing + deteção de drift) — modelada abaixo em notação C4. As secções seguintes detalham cada módulo.

<img src="/images/aiops/arquitetura_sistema_c4.png" alt="Arquitetura modular de agentes de IA a gerir o ciclo de vida de IaC, desde uma prompt até revisão, validação, deploy e operação" class="diagram-large" />

### Revisão de PRs

**Sete agentes revisores estreitos, um orquestrador que só fala depois de todos falarem.** Cada PR contra `dev`/`main` é revisto em paralelo por agentes especializados — qualidade de código, segurança, testes, performance, documentação, Docker, e configuração de pipeline/CI — cada um a publicar o seu próprio comentário com um marcador de severidade (🔴 CRITICAL, 🟡 WARNING, 💡 SUGGESTION). Nenhum fala com o outro nem precisa de concordar; um orquestrador separado corre só depois de todos terminarem e toma a única decisão que importa: qualquer CRITICAL bloqueia o merge, mais nada bloqueia. Separar "notar problemas" de "decidir o que fazer com eles" manteve cada agente individual simples e deixou a política de bloqueio a viver num único sítio.

**Correções como sugestões clicáveis do GitHub, não só comentários.** Quando o orquestrador bloqueia um PR, não fica pelo relatório — gera correções concretas via LLM e publica-as como blocos de sugestão nativos do GitHub no separador Files Changed, para um developer poder clicar em "Commit all suggestions" e aplicá-las de uma vez, em vez de implementar manualmente o que um agente de IA já escreveu.

![Um PR bloqueado com sugestões de correção geradas por LLM, mostradas como blocos de sugestão clicáveis do GitHub](/images/aiops/pr_sugestoes_clicaveis_en.png)

Um programador abre um PR; sete agentes analisam o diff em paralelo e publicam comentários estruturados. O orquestrador lê-os e decide: sem problemas críticos → aprova e faz auto-merge (squash); caso contrário → bloqueia e publica sugestões de correção clicáveis que o programador pode aceitar e re-submeter.

<img src="/images/aiops/uc1_pr_review.png" alt="Diagrama: programador abre um PR, sete agentes revêem em paralelo, orquestrador aprova e faz auto-merge ou bloqueia com sugestões" class="diagram-large" />

### Infraestrutura como Código (IaC)

**`iac_generator`, um módulo, cinco modos.** O mesmo agente trata de `generate` (templates Terraform/Helm a partir de uma prompt em linguagem natural), `validate`, `fix`, `ci` (validação de PR/push com veredicto de bloqueio), e `cost` (estimativa via Infracost) — uma única base de código atrás dos cinco, em vez de uma ferramenta separada por preocupação que divergiria ao longo do tempo. No modo `validate` lê o conjunto *completo* de ficheiros Terraform em conjunto em vez de um de cada vez, o que evita falsos positivos por falta de contexto que só existe noutro ficheiro do projeto (uma versão de provider fixada noutro sítio, por exemplo). Os problemas só são reportados com evidência concreta no código, divididos entre críticos (credenciais hardcoded, backend local, recursos sem bloco lifecycle), avisos e sugestões — resolvendo sempre num `VERDICT: BLOCKED` ou `VERDICT: APPROVED` estruturado sobre o qual uma pipeline pode agir diretamente.

![O relatório de validação do agente de IaC renderizado no GitHub — problemas críticos estruturados com a linha problemática e uma correção sugerida](/images/aiops/mcp_iac_issue.png)

**Agnóstico a cloud por design, incluindo on-premises.** Para além de Azure, AWS e GCP, `generate`/`validate`/`fix` vêm com prompts de sistema dedicados para ambientes locais/on-premises — Terraform com providers locais, namespaces Kubernetes via kubeconfig — porque infraestrutura sem acesso a cloud continua a ser infraestrutura que precisa de validação. A estimativa de custos nesse modo dispensa completamente o Infracost (não tem preços on-prem para mapear) e pede diretamente ao LLM para estimar os recursos necessários.

**Deteção de drift como uma verificação recorrente própria, não uma aplicação única.** A infraestrutura não é assumida como continuando exatamente como o Terraform a deixou — um `terraform plan -detailed-exitcode` agendado contra o estado real da cloud reporta um de três resultados (sem drift, erro, drift detetado) através da própria convenção de exit code do Terraform, para alterações manuais feitas fora da pipeline serem expostas em vez de divergirem silenciosamente do que está declarado em código.

Acionado por alterações a ficheiros Terraform, o `iac_generator` valida a configuração de infraestrutura e estima custos via o CLI do Infracost, publicando um relatório no PR. O veredicto (`VERDICT: APPROVED` ou `VERDICT: BLOCKED`) decide se a pipeline avança para `terraform apply` ou abre uma issue de bloqueio no GitHub.

<img src="/images/aiops/uc2_iac_review.png" alt="Diagrama: alterações Terraform acionam validação de IaC e estimativa de custos, condicionando o terraform apply ao veredicto" class="diagram-large" />

### Kubernetes (auto-healing)

**Triagem antes de agir, nunca uma mutação direta do cluster.** Os estados de falha de pods estão divididos entre os que são seguros de auto-remediar (`CrashLoopBackOff`, `Error`, `OOMKilled`, `Failed`) e os que são só-relatório (`ImagePullBackOff`, `Pending`), porque reiniciar cegamente estes últimos não corrigiria — e poderia mascarar — o problema real. Além disso, uma heurística (pod com menos de 10 minutos de idade *e* 2+ reinícios) assinala um provável mau deploy; quando dispara, a correção não é um `kubectl rollback` direto — é um commit git a reverter o ficheiro de values do Helm relevante no branch que a Application do ArgoCD desse namespace segue, para o cluster ser corrigido através do mesmo caminho GitOps que qualquer outro deploy usa, sem divergência entre o que o auto-healing fez e o que a pipeline de deploy acredita estar em produção.

O Azure Monitor / Logic Apps deteta um pod Kubernetes a falhar e aciona o agente de auto-healing. O agente diagnostica a causa raiz e, consoante o tipo de falha, aplica uma correção automática (para estados reiniciáveis) ou reporta o incidente para intervenção manual — gerindo o ciclo de vida da issue no GitHub em ambos os casos: criada quando detetada, fechada automaticamente quando a recuperação é confirmada.

<img src="/images/aiops/uc3_auto_healing.png" alt="Diagrama: Azure Monitor deteta um pod a falhar, agente de auto-healing diagnostica e corrige ou reporta, issue no GitHub aberta e fechada automaticamente" class="diagram-large" />

### Camada MCP

**Uma única camada de interface, usada tanto pela pipeline como por um humano.** Cinco servidores MCP próprios (GitHub, Kubernetes, IaC, Infracost, Log Analytics) expõem os mesmos primitivos — `list_pods`, `get_pod_logs`, `get_pod_events`, validação de Terraform, estimativa de custos — como ferramentas. O agente de auto-healing em CI e o servidor MCP de Kubernetes chamam exatamente o mesmo tipo de funções wrapper de `kubectl` por baixo; a diferença é só *quem está a conduzir*. Ligar os servidores ao Claude Desktop com os prompts fornecidos (`iac_validate`, `iac_generate`, `iac_costs`, `auto_healing`, …) dá a uma pessoa, de forma interativa, as mesmas ferramentas de diagnóstico e remediação que a pipeline usa de forma autónoma — uma camada de integração, dois consumidores.

Uma interação conversacional entre um programador e o sistema através da camada MCP, usando o Claude Desktop ou o Claude Code CLI — gerar, validar e estimar o custo de IaC, detetar drift, operar o cluster Kubernetes (auto-healing, listar pods, ler logs), e gerir PRs/issues no GitHub. Um veredicto de bloqueio ou drift detetado abre automaticamente uma issue no GitHub com os detalhes.

![Diagrama: programador interage com ferramentas de IaC, Kubernetes e GitHub de forma conversacional através da camada MCP via Claude Desktop ou CLI](/images/aiops/uc4_mcp.png)

Ao nível de componentes, isto é um cliente LLM (Claude Desktop ou o Claude Code CLI) a consumir interfaces expostas pelos servidores MCP através do protocolo MCP/stdio, com cada servidor a encapsular um sistema externo — Kubernetes via chamadas subprocess ao `kubectl`, GitHub e Infracost via HTTPS, Terraform via subprocess do CLI e ferramentas de análise estática (`tfsec`, `checkov`).

<img src="/images/aiops/mcp_componentes.png" alt="Diagrama UML de componentes da camada MCP: um cliente LLM a consumir servidores MCP via stdio, cada servidor a encapsular um sistema externo via HTTPS ou subprocess" class="diagram-large" />

### Aplicação desktop

**Uma terceira interface, para quem não quer um terminal — e agnóstica a provider por design.** Uma GUI em PyQt6 (empacotada de forma standalone com PyInstaller) envolve o agente de IaC numa janela de dois painéis — um painel de configuração para perfis de ligação e definições, um painel de output em streaming alimentado por uma thread de trabalho em segundo plano através de um temporizador de flush a cada 80ms, para a UI se manter responsiva enquanto o LLM transmite uma resposta em vez de bloquear à espera dela. Ao contrário do routing fixo Groq-primário/Azure-fallback da pipeline de CI, a app desktop deixa um utilizador guardar múltiplos perfis de ligação nomeados contra Azure OpenAI, Anthropic, Google Gemini, ou qualquer endpoint genérico compatível com OpenAI — para trocar de, digamos, Azure para Claude para um modelo alojado localmente ser um dropdown, não uma alteração de código. O `engine.py` guarda toda a lógica de IaC sem qualquer dependência do módulo do agente de CI, carregando os mesmos prompts de sistema partilhados em Markdown que os agentes da pipeline usam, para os dois nunca divergirem em comportamento; o `workers.py` corre as operações do engine numa `QThread`, a canalizar stdout/stderr para uma fila que alimenta a UI em tempo real.

<img src="/images/aiops/desktop_app_pacotes.png" alt="Diagrama de pacotes da aplicação desktop: módulos PyQt6 (engine, workers, window, dialogs, config) e as suas dependências de prompts partilhados e sistemas externos" class="diagram-large" />

<div class="image-pair">
<img src="/images/aiops/desktop_app_main.png" alt="A aplicação desktop em PyQt6: painel de configuração à esquerda, output em streaming à direita" />
<img src="/images/aiops/desktop_app_validate_en.png" alt="Resultado de uma validação de IaC em modo cloud na app desktop, com diagnóstico estruturado e veredicto no painel de output" />
</div>

**Validação on-premises, com a capacidade real da máquina alvo como contexto.** Selecionar "Local" em vez de um provider cloud muda a app para os mesmos prompts on-prem descritos acima, para ambientes sem conta cloud contra a qual validar. Para tornar a estimativa de custo/viabilidade nesse modo realmente útil em vez de um palpite às escuras, a app introduz **perfis de máquina** — registos persistentes do SO, núcleos de CPU, RAM, disco, GPU e largura de banda de rede de uma máquina alvo, geridos no separador Machines da janela de definições. Escolher um perfil ao correr uma estimativa local passa-o ao LLM como contexto, permitindo-lhe comparar o que a infraestrutura declarada realmente precisa contra o que essa máquina específica consegue fornecer — um edge server e um portátil de desenvolvimento são avaliados contra os seus próprios limites reais, não uma suposição genérica.

<div class="image-pair">
<img src="/images/aiops/desktop_app_machines.png" alt="O separador Machines da app desktop: criação e gestão de perfis de máquina persistentes (SO, CPU, RAM, disco, GPU, largura de banda) usados nas estimativas de viabilidade on-premises" />
<img src="/images/aiops/desktop_app_cost_local_en.png" alt="Estimativa de recursos no modo local/on-premises da app desktop, a comparar os recursos necessários com o perfil de máquina selecionado" />
</div>

Para um utilizador DevOps sem familiaridade com a linha de comandos ou pipelines de CI/CD: validar configurações de IaC, gerar templates, estimar custos (modo cloud ou local) e detetar drift, escolhendo o provider de LLM e — em modo local — um perfil de máquina pré-configurado. Ficheiros de IaC inalterados entre execuções são servidos a partir de uma cache em memória em vez de chamarem a API outra vez.

![Diagrama: um utilizador DevOps valida, gera e estima custos de IaC através da GUI da aplicação desktop](/images/aiops/uc5_desktop_app.png)

### Fiabilidade: routing de LLM

**Uma cadeia de provider primário/fallback, não uma API fixa.** O Groq é o provider primário, com o Azure OpenAI configurado como fallback automático (`LLM_PRIMARY_PROVIDER`/`LLM_FALLBACK_PROVIDER`), para uma falha num único provider não derrubar de uma vez a revisão de PRs, a validação de IaC, ou o auto-healing — uma decisão de fiabilidade real, não hipotética, para algo pensado para correr sem supervisão em CI.

## A parte mais difícil

Decidir quanto confiar de facto na automação perto de coisas que importam — um PR que faz auto-merge, um pod que é "corrigido", um plano do Terraform que é aplicado. A resposta não foi "confiar menos", foi construir as salvaguardas na própria arquitetura em vez de esperar que o LLM se comportasse: a severidade CRITICAL é um portão rígido na revisão de PRs independentemente do que mais um agente diga, os estados de pod que justificam restart vs. só-relatório são uma allowlist fixa em código em vez de um juízo do LLM, um mau deploy é revertido através de Git/ArgoCD em vez de uma mutação imperativa do cluster, e as aplicações de Terraform passam por OIDC em vez de credenciais cloud de longa duração. O LLM decide *o que está errado e como deve ser a correção*; nunca decide *se tem permissão para agir* — essa fronteira é código fixo, não uma prompt.

## Resultado

Uma pipeline a funcionar demonstrada de ponta a ponta com duas APIs de demonstração deliberadamente emparelhadas: uma partida com problemas plantados (segredos hardcoded, SQL Injection, sem autenticação, um hot path O(n²), testes e documentação em falta) que a pipeline apanha e bloqueia, e uma versão segura da mesma API que passa sem problemas e faz auto-merge — provando que os agentes de revisão apanham o que devem apanhar, não só que correm. Ao lado, um crash de pod simulado dispara o ciclo completo de auto-healing (detetar → ler logs/eventos → diagnosticar → corrigir → confirmar recuperação → abrir/fechar uma issue no GitHub), e a pipeline de IaC corre validação de Terraform e estimativa de custos via Infracost em cada alteração de infraestrutura antes de ser aplicada.
