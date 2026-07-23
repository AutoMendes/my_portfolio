---
title: "Cartógrafo — Navegação Inteligente por Portugal"
org: "Instituto Politécnico de Viseu — cadeira de Inteligência Artificial"
dateRange: "Mar 2026 – Abr 2026"
description: >-
  Um projeto universitário de Inteligência Artificial que combina algoritmos clássicos de procura
  em grafos (Custo Uniforme, Profundidade Limitada, Sôfrega, A*), reconhecimento de matrículas por
  OCR (EasyOCR) para autenticação, e um LLM local (Ollama/Mistral) a descrever atrações turísticas
  ao longo da melhor rota — entre 18 cidades portuguesas, com mapas interativos via Folium e
  roteamento OSRM, numa interface Streamlit.
tags: ["Python", "LLMs"]
featured: true
caseStudy:
  slug: cartografo
---

## O enunciado

O trabalho, no papel, era simples: implementar alguns algoritmos de procura sobre um grafo e demonstrar que funcionam. Quis construir algo que parecesse mesmo um produto, por isso enquadrei-o como um planeador de viagens de carro — planear uma rota entre cidades portuguesas, ver diferentes algoritmos discordarem sobre qual é a "melhor" rota, e obter algo útil do outro lado (uma descrição do que vale a pena ver pelo caminho).

Foi esse enquadramento que trouxe as duas partes que não eram pedidas: login por OCR de matrícula (para a app "reconhecer" o teu carro) e um LLM local para as descrições das atrações.

## Decisões de arquitetura

**Quatro algoritmos, de propósito, não só um.** Custo Uniforme e A* são ambos ótimos, mas por razões diferentes — o A* chega lá mais depressa porque é guiado por uma heurística (distância em linha reta de Haversine até ao destino, que é admissível porque nunca sobrestima a distância real por estrada). Profundidade Limitada e Sôfrega estão incluídos precisamente porque *não* são ótimos — o objetivo era tornar o trade-off visível: a Sôfrega encontra uma rota quase instantaneamente mas pode acabar num caminho pior que o A*, porque só olha para "quão perto isto parece agora" e nunca contabiliza o custo já gasto.

**LLM local, não uma chamada a uma API.** Ollama a correr Mistral 7B localmente, sem dependência de internet. Numa demo universitária isto importa menos pelo custo e mais pela fiabilidade — um gerador de descrições que cai a meio de uma apresentação por causa de uma API instável não vale o risco.

**Streamlit em vez de um frontend próprio.** A parte interessante deste projeto nunca foi a UI — foram os algoritmos e o pipeline de OCR. O Streamlit deixou-me gastar esse tempo aí, em vez de canalização de componentes.

## A parte mais difícil: OCR que tem mesmo de funcionar

As matrículas portuguesas não são um formato só — são quatro, consoante quando o carro foi registado (`AB-12-CD` desde 2020, recuando até `12-34-AB` pré-1992). Uma passagem genérica de OCR numa foto, tirada em ângulo, com a iluminação que a câmara de um telemóvel apanhar, falha constantemente à primeira tentativa.

A solução não foi um modelo mais inteligente — foi aceitar que uma única passagem nunca seria fiável o suficiente, e em vez disso passar a imagem por três variantes de pré-processamento (aumento de contraste/nitidez; binarização por limiar de Otsu; invertida + Otsu, para matrículas escuras sobre fundo claro) cruzadas com quatro estratégias de validação (correspondência direta após limpeza, concatenação espacial para matrículas lidas em fragmentos, correção por template de posição, e correção por template aplicada à concatenação). Doze tentativas, testadas em sequência, a primeira correspondência válida ganha. Não é elegante, mas é a diferença entre uma demo que funciona à primeira foto e uma que precisa de três tentativas à frente de uma audiência.

## Resultado

Demo de ponta a ponta: fotografa ou escreve uma matrícula, ficas autenticado (ou registado na hora, se for nova), escolhes duas de 18 cidades e um algoritmo, obténs uma rota desenhada num mapa real com roteamento OSRM passo a passo, e lês uma descrição gerada localmente sobre o que ver pelo caminho. Os quatro algoritmos produzem visivelmente caminhos diferentes para o mesmo par de cidades, que era todo o objetivo — dá para *ver* o trade-off entre custo/velocidade/otimalidade em vez de só o ler num relatório.
