# PROMPT DE EXECUÇÃO — QUIZ SACRA V4 (fonte de verdade, recebido do dono em 2026-07-19)

> Complementos decididos em conversa (NÃO estão no prompt original):
> 1. **Workspace novo** no admin para o v4 (quiz_id novo, métricas zeradas) — quiz atual continua no workspace 'sacra'.
> 2. **Quiz atual permanece no ar** em `/sacra-v2/` (build do tag `prod-2026-07-16`).
> 3. **Captura nome+WhatsApp** ligada à estrutura de resposta automática existente (`enqueueWhatsappResult` → app Vercel, delay ~35s, tabela `whatsapp_sends`) + eventos visíveis no admin.
> 4. A pergunta de **risco é preservada** (o prompt manda; o HTML a omite — prioridade 1 = código real).
> 5. Relatórios de verificação pré-implementação: `VERIFICACAO-ENCAIXES-QUIZ-V4.md` e `VERIFICACAO-ENCAIXES-ADMIN-V4.md` (mesma pasta).

## OBJETIVO
Portar o design/copy de `quiz-sacra-v4-oferta-otimizada.html` (mesma pasta) para React/TS dentro do projeto atual, preservando: URL atual, TanStack, Supabase, persistência de leads, fluxo de risco, UTMs, external_id, Pixel 863734499693171, CAPI, dedup, eventos, URL Kirvano (`VITE_KIRVANO_URL` — não trocar UUID), preço dinâmico, order bumps, upsell/downsell, `/sacra/obrigado`, recuperação de sessão. **NUNCA publicar o HTML como página estática.**

## PRIORIDADE EM DIVERGÊNCIA
1. Código atual em produção (contratos/tracking/checkout/banco/rotas/segurança)
2. HTML anexado (design/hierarquia/copy)
3. Config atual do ambiente (URLs/preços/Pixel/flags)
4. Docs do projeto

## REGRAS NÃO NEGOCIÁVEIS
- **Checkout**: todos os CTAs de compra → `onCheckout` → `checkout()` do QuizApp (getOrCreateExternalId, sendTrackingBeacon, trackStep("cta"), trackInitiateCheckout, normalização WhatsApp, buildKirvanoUrl, UTMs, arquétipo, nome, email, whatsapp, src, feature flag). Sem `<a href>` direto, sem iframe, sem alert de demo.
- **Pixel/CAPI**: preservar Advanced Matching, Lead com `eventID lead_<external_id>`, InitiateCheckout, eventos de etapa, external_id, fbp/fbc/fbclid/ip/ua. Não duplicar, não renomear sem necessidade, **nunca Purchase no browser** (só webhook/CAPI).
- **Pós-compra**: não tocar — VITE_KIRVANO_UPSELL_URL/DOWNSELL_URL, /sacra/obrigado, token kirvano_upsell, fix do '+', MutationObserver, botões estáticos, offer duplicado, nextPageURL/refusePageURL, PIX/cartão. Sem CheckoutModal/iframe.
- **Banco**: sem db push, sem migration desnecessária, sem alterar RLS/Edge Functions, sem expor chaves, sem logar email/telefone, preservar risk_flag/encaminhamento de risco, persistência em leads/quiz_responses/tracking_sessions, retomada de sessão.
- **Ética**: sem depoimentos/clientes/credenciais/CNPJ inventados, sem R$228 riscado, sem falsa escassez/vagas/cronômetro, sem promessa de cura, sem quiz-como-diagnóstico, sem atacar terapia/medicação, sem compra-como-teste-de-fé.

## ABERTURA — SEM HERO, DIRETO NA PERGUNTA DO PESO
Pergunta 1 (key `peso`, substitui `situacao`, total continua **7 perguntas**):
**"Se você pudesse soltar hoje um peso que ninguém vê, qual seria?"**
1. "O peso de precisar dar conta de todo mundo." → `sobrecarga`
2. "O peso de nunca conseguir baixar a guarda." → `vigilante`
3. "O peso da culpa quando tento cuidar de mim." → `culposa`
4. "O peso do medo de que algo ruim aconteça." → `antecipatoria`
Microcopy: **"Toque no peso que mais parece com a sua vida hoje."**
UX: sem hero promocional, sem botão "começar", pergunta visível imediatamente, 1º clique inicia sessão, logo discreta, progresso "Pergunta 1 de 7", sem exigir nome antes, rápido no in-app browser do Meta.
Scoring: a pergunta pontua igualmente os 4 arquétipos (mesmo peso de pergunta central), pontuação máxima igual pros 4, sem desempate novo, testar cenários puros e mistos, não quebrar fluxo de risco, `situation` opcional quando não existir, adaptar bridges, nunca inventar situação demográfica.
Microvalidação pós-1ª resposta (rápida): "Esse peso não define quem você é. Mas mostra exatamente onde o seu descanso está sendo roubado. Vamos descobrir como ele se mantém ativo."

## PERGUNTAS RESTANTES
Preservar intenção: risco (SAGRADA — flags, redirect, eventos, testar cada resposta, nunca encaminhar risco pra oferta), corpo, comportamento, frase interna, espiritual, desejo. Reescrever só para coerência com eixo "peso invisível". Perguntas-espelho, 4 opções equilibradas, sem linguagem clínica, sem acusação, sem animação lenta.

## RESULTADO (1ª dobra — valor antes de vender)
1. Label: **"O peso que mais tem roubado a sua paz"**
2. Headline: **"Por trás desse peso, seu padrão predominante hoje é:"**
3. Nomes emocionais: sobrecarga=**A Cuidadora em Plantão** · culposa=**A Filha que se Cobra** · vigilante=**A Guardiã que Não Desliga** · antecipatoria=**A Sentinela do Amanhã**
4. Explicação dinâmica; 5. Bloco "Isso apareceu nas suas respostas porque:"; 6. Três razões das respostas REAIS; 7. Absolvição: "Esse peso não é quem você é."; 8. Promessa dinâmica.
Regras: não começar com preço/VSL/checkout, sem frases genéricas iguais, sem padrão secundário se o sistema não calcula com segurança, CTA → `onContinue`, não ligar direto à Kirvano.

## OFERTA 1ª DOBRA
"Plano recomendado pelo seu resultado" + headline/subheadline dinâmicas + duração explícita + prova visual + botão que ROLA pra VSL (respeitar prefers-reduced-motion).
Duração: **"2 práticas guiadas por dia · 8 a 12 minutos cada · acesso imediato"** (CONFERIR nos áudios reais; usar a verdade).
CTA (não é compra): **"ENTENDER COMO O MÉTODO CARREGA ESSA JORNADA COM VOCÊ ↓"**

## VSL — 2ª DOBRA
Headline: **"Você não falhou por não conseguir simplesmente soltar esse peso."**
Absolvição: **"Não é falta de fé. E não é porque você não tentou o suficiente."** + texto: "Uma oração, um devocional, uma conversa ou uma noite de descanso podem trazer alívio. Mas, quando o corpo continua de plantão e a mente repete a mesma cobrança, o peso encontra o caminho de volta. Você estava tentando alcançar a paz enquanto uma parte de você ainda acreditava que não podia baixar a guarda."
Ponte: "Assista e entenda como o Rotina de Paz integra corpo, mente e Palavra na mesma prática — sem transformar sua fé em mais uma tarefa."
Vídeo: `https://cdnrotinadepaz.b-cdn.net/VSL-mecanismo-v2v3-EDITADA.mp4` — validar 200, mobile, preload="metadata", playsInline, sem autoplay com som. Tracking: play/25/50/75/100, preservar `VSLProgress`, cada marco 1× por load.
CTA sob a VSL: **"QUERO COMEÇAR MEUS 7 DIAS DE PAZ →"** → `onCheckout`.

## MECANISMO
4 passos (corpo desacelera → padrão ganha nome → Palavra na dor correta → repetição constrói nova resposta). Copy central: "O Rotina de Paz não pede que você abandone responsabilidades. Ele conduz duas práticas curtas por dia para que o corpo desacelere, o padrão seja interrompido e a Palavra seja aplicada exatamente onde culpa, vigilância, sobrecarga ou medo do amanhã costumam assumir o controle." Sem afirmação clínica absoluta.

## JORNADA 7 DIAS (micro-resultados; VALIDAR contra os áudios reais; não inventar entrega)
D1 **O peso finalmente ganha nome** — Você identifica onde o plantão começa e deixa de lutar contra um cansaço sem explicação.
D2 **Descansar deixa de parecer abandono** — Você distingue responsabilidade real da cobrança que transforma toda pausa em culpa.
D3 **A frase que reacende o peso perde o comando** — Você reconhece o pensamento automático antes que ele conduza o corpo e o restante do dia.
D4 **O corpo recebe um novo sinal** — Respiração, Palavra direcionada e gesto-âncora formam uma resposta prática para o momento de alerta.
D5 **Você solta o que não precisa carregar agora** — A rendição deixa de parecer negligência e passa a ser uma escolha consciente de limite.
D6 **Sua mente recebe permissão para encerrar o dia** — A prática noturna ajuda a parar de revisar problemas quando o corpo já está na cama.
D7 **Você termina com um mapa para usar quando o peso voltar** — Você sabe qual prática aplicar diante de culpa, vigilância, sobrecarga ou medo do amanhã.

## PROVA DO PRODUTO (antes dos bônus)
Telas reais do app, Vol I, Vol II, player, manhã/noite, acesso vitalício, como o acesso chega. Assets reais do repo, WebP/AVIF, sem Base64 gigante.

## PROVA DE IDENTIFICAÇÃO (não é prova de resultado)
Comentários anônimos: "Essa sou eu faz muito tempo." / "Verdade. Estou vazia de sentimentos." / "É isso mesmo. Preciso saber o que devo fazer."
Rótulo: **"Prova de identificação"** + nota: "Esses comentários mostram identificação com a dor. Eles não são apresentados como prova de resultado do produto." Sem nomes/fotos sem autorização.

## AUTORIA E TRANSPARÊNCIA
Nome: **Guilherme Henrique**. Sem diploma/certificação/CNPJ/suporte inventados. Procurar razão social/CNPJ/emails/política/termos reais no projeto; se não existirem, OMITIR e informar no relatório. Avatar (só se verdadeiro e aprovado): "Jaqueline é a apresentadora visual da marca. O conteúdo, o atendimento e a garantia são responsabilidade do projeto Rotina de Paz."

## ENTREGA E BÔNUS
Núcleo: 14 práticas guiadas, Vol I — Despertar, Vol II — Repouso, app, acesso vitalício, suporte.
Bônus: 148 Louvores em Salmos, Dormir Melhor Hoje, Devocional 30 Dias com Jesus.
Cartão "Passe o Turno": SÓ se o entregável real existir (procurar arquivo/rota, validar acesso do comprador; senão remover e informar).

## PREÇO E ANCORAGEM
Preço dinâmico: priceCents/função existente/parcelas existentes. NÃO usar: R$228 riscado, valores inventados, de/por sem lastro, parcelamento diferente do checkout.
Título: **"Uma jornada completa, sem mensalidade e com acesso vitalício."**
Texto: "O preço é acessível porque a entrega é digital e pode chegar a muitas mulheres sem o custo de uma consulta individual — não porque o conteúdo seja pequeno."
Se preço = R$47: "R$47 equivalem a aproximadamente R$6,71 por dia da jornada." (calcular priceCents/7 dinamicamente; não mostrar se preço mudar).

## GARANTIA (usar guaranteeDays real; referência 15 dias)
Headline: **"Faça os 7 dias. Você terá 15 para decidir."**
Copy: "A jornada completa dura sete dias, mas sua garantia dura quinze. Você pode acessar todas as práticas, experimentar o método e ainda terá oito dias para decidir com tranquilidade. Se, dentro desse período, concluir que o Rotina de Paz não é para você, fale com nosso suporte e devolveremos 100% do valor conforme a política da plataforma."
Fechamento: **"O risco financeiro fica conosco, não com você."** Não prometer "sem formulário/sem perguntas" sem confirmar.

## MOTIVO PARA AGORA (sem urgência falsa)
Headline: **"Adiar não custa no cartão. Custa mais um dia carregando o mesmo peso."**
Pontos: mais uma noite com o corpo na cama e a mente trabalhando; mais um dia começando cansada; mais uma oração transformada em esforço.
Texto: "Sem cronômetro falso e sem vagas inventadas. O motivo para começar hoje é simples: o acesso é imediato e a primeira prática pode ser feita ainda hoje."

## CTAs
Principal: **"QUERO COMEÇAR MEUS 7 DIAS DE PAZ →"**. Todos via `onCheckout`. Sem link hardcoded, sem window.location no componente visual, sem alert, sem "Eu creio" como condição.
Sticky: só DEPOIS da usuária passar a seção da VSL (nunca no resultado, nunca antes da VSL), safe-area mobile, não cobrir conteúdo, chama `onCheckout`.

## CONTRATOS
ResultScreen: `{ archetype: ArchetypeData; bridge?: string|null; name?: string; desire?: string; onContinue: () => void }` (+ answers/scores só se necessário e explícito).
OfferScreen: `{ archetype: ArchetypeData; desire?: string; priceCents: number; anchorCents?: number; freeInstCount?: number; onCheckout: () => void; onBack: () => void }` (anchorCents sem âncora sem lastro).
QuizApp: preservar stages, goToOffer, checkout, submitContact, tracking de stage, persistência, risco, URL preview.

## CSS/A11Y
Breakpoints 360/390/430/768/1024/desktop. Tap 44px, contraste, sem overflow-x, safe-area no sticky, foco visível, type="button", imagens com dimensões+alt, lazy abaixo da dobra, VSL preload metadata, prefers-reduced-motion, pausar animações com aba oculta, limpar timers no unmount.

## PERFORMANCE
1ª pergunta interativa rápido; VSL não baixa antes da oferta; lazy images; sem Base64 gigante; sem scripts duplicados; sem re-render desnecessário. Comparar bundle antes/depois e informar.

## MATRIZ DE TRACKING (validar)
Carregamento=PageView · 1ª resposta=sessão iniciada · cada pergunta=evento atual sem dup · risco=evento+redirect · contato=Lead `lead_<eid>` · resultado/oferta=stage atual · VSL play/25/50/75/100 1× · CTA=beacon+step cta · Checkout=InitiateCheckout 1× · Redirect Kirvano=UTMs+src+dados · Purchase=SÓ webhook/CAPI.
NÃO: Purchase client-side, outro Pixel, snippet base de novo, external_id paralelo, perder event_id, IC 2× no mesmo clique.

## TESTES (26.x)
Quiz (1ª pergunta, 4 respostas, avanço, voltar/retomar, 7 perguntas, progresso, mobile, sessão) · Arquétipos (1 caminho puro cada, sem conteúdo cruzado) · Risco (todas as respostas, não chega à oferta) · Contato (email válido, whatsapp, erro Supabase, timeout, envio de resultado, Lead) · Oferta (scroll VSL, marcos, CTA, sticky pós-VSL, FAQ, preço, garantia, voltar) · Checkout (1 IC, beacon, mesma URL Kirvano, src, UTMs, arquétipo, dados, sem iframe/alert) · Pós-compra (smoke /sacra/obrigado?offer=upsell|downsell).

## TÉCNICOS (27)
`npx tsc --noEmit` + `npm run build` (+ `npm test` se houver). Sem erro TS novo, sem placeholder, sem "prévia HTML", sem botão morto, sem imagem quebrada, sem 404 da VSL, sem R$228, sem banner de QA.

## DEPLOY (28-29)
Preview primeiro (deploy sem --prod), testar tudo no *.pages.dev; produção só depois de todos os critérios críticos. Smoke test em /sacra/quiz, /sacra/obrigado?offer=upsell|downsell.

## GIT/ROLLBACK (30)
Commit + hash, deployment anterior registrado, sem misturar mudanças não relacionadas. Rollback: commit revert + deployment CF anterior + arquivos afetados.

## ACEITAÇÃO (31) — 28 critérios
HTML portado pra React; sem página estática paralela; 1ª tela = pergunta do peso; 7 perguntas; risco funciona; 4 arquétipos; resultado personalizado; VSL 2ª dobra; CTA da VSL → onCheckout; sticky só pós-VSL; mesma VITE_KIRVANO_URL; UTMs+external_id na Kirvano; Pixel preservado; Lead/IC sem dup; Purchase só webhook; Supabase ok; pós-compra ok; preço dinâmico; sem R$228; garantia real; sem falsa escassez; sem depoimento inventado; assets ok; typecheck ok; build ok; preview validado; produção publicada; smoke test ok.

## RELATÓRIO FINAL (32)
Implementação (arquivos, componentes, decisões, mapeamento HTML→React) · Integrações preservadas · Testes executados · Deploy (URLs, commit, deployment ID) · Pendências honestas · Rollback.
