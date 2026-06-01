# Guia de Estrutura — Ecossistema Rotina de Paz

## Visão Geral

```
rotinadepaz.com.br/           → Rotina de Paz (LP + Checkout)
rotinadepaz.com.br/sacra      → Quiz Sacra (embedded)
rotinadepaz.com.br/quiz       → Quiz antigo (HTML standalone)
rotina-de-paz-app.vercel.app  → App pós-compra (Círculo da Paz) + Admin Dashboard
```

---

## 1. Quiz Sacra

| Item | Valor |
|------|-------|
| **Repositório** | `github.com/santuariotnb-sys/Quiz-sacra.git` |
| **Diretório local** | `/Users/guilhermehenrique/Quiz-sacra/` |
| **Stack** | React 19 + TanStack Router + Tailwind 4 + Framer Motion + Supabase |
| **URL produção** | `rotinadepaz.com.br/sacra` (redirect automático para `/sacra/quiz`) |
| **Hosting** | Cloudflare Pages — embeddado no projeto `rotina-de-paz` como subdiretório `/sacra/` |
| **Checkout** | Kirvano (`VITE_KIRVANO_URL`) |
| **Supabase** | `cemjibbauvvyfaxilrvm` |

### Rotas

| Rota | Arquivo | Função |
|------|---------|--------|
| `/sacra` → `/sacra/quiz` | `src/routes/index.tsx` | Redirect para quiz |
| `/sacra/quiz` | `src/routes/quiz.index.tsx` | Quiz principal (7 perguntas) |
| `/sacra/quiz-sacra` | `src/routes/quiz-sacra.tsx` | Página auxiliar |
| `/sacra/obrigado` | `src/routes/obrigado.tsx` | Thank you + Upsell (R$67 Chave da Gratidão) — redirect pós-compra Kirvano |
| `/sacra/obrigado?offer=downsell` | `src/routes/obrigado.tsx` | Downsell (R$37) — quando recusa upsell |

### Arquivos-chave

```
src/
├── routes/           → Rotas TanStack Router (auto-generated routeTree.gen.ts)
├── components/quiz/
│   ├── QuizApp.tsx   → Componente principal (stages: hero→questions→loading→result→offer)
│   │                   Contém ResultScreen, OfferScreen e NarrationCaption (legenda word-by-word)
│   ├── Avatar.tsx    → Avatar da guia (prop `src` p/ trocar imagem; size hero|corner|chat)
│   └── SpeechBubble.tsx, EmotionalProgress.tsx
├── data/quiz.ts      → Perguntas, arquétipos (campo `result`), transições, computeArchetype
├── data/narration.ts → Cues da legenda da oferta (tempo por palavra, gerado por forced-alignment)
├── data/funil.ts     → Conteúdo das ofertas upsell (R$67) e downsell (R$37)
├── components/funil/
│   ├── OfferPage.tsx    → Página genérica de oferta (upsell/downsell)
│   └── CheckoutModal.tsx → Modal com iframe Kirvano (fallback: redirect em 4s)
├── lib/
│   ├── supabase.ts   → Cliente Supabase (opcional, null se sem env)
│   ├── utm.ts        → Captura UTMs + buildKirvanoUrl (com ?src=external_id)
│   ├── tracking.ts   → Bridge CAPI: external_id, fbp/fbc cookies, InitiateCheckout, tracking_sessions
│   └── sound.ts      → Som de "ding" ao responder
└── main.tsx          → Router com basepath: "/sacra"
```

### Arquivos-chave do Suporte (rotina-de-paz-app)

```
src/
├── lib/support/
│   └── types.ts              → Tipos compartilhados (SupportTicket, SupportMessage, enums, labels, cores)
├── lib/api/
│   └── send-email.functions.ts → 4 server functions com Zod + escapeHtml (notifyNewTicket, notifyUserReply, notifyAdminReply, notifyTicketClosed)
├── lib/admin/
│   └── audit.ts              → logAdminAction() para ticket.reply e ticket.close
├── routes/
│   ├── app.suporte.tsx       → Lista tickets + formulário novo ticket (user)
│   ├── app.suporte.$ticketId.tsx → Thread de mensagens + resposta (user)
│   └── admin.suporte.tsx     → Dashboard KPIs + tabela + drawer reply/close (admin)
supabase/migrations/
├── 20260529_support_tables.sql     → Schema: support_tickets + support_messages + RLS base
└── 20260530_support_rls_complete.sql → DELETE/UPDATE policies para admins + GRANTs
```

### Config

```
vite.config.ts        → base: "/sacra/"
src/main.tsx          → createRouter({ routeTree, basepath: "/sacra" })
.env                  → VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_KIRVANO_URL, VITE_KIRVANO_UPSELL_URL, VITE_KIRVANO_DOWNSELL_URL
```

### Build & Deploy

```bash
# 1. Build o quiz
cd ~/Quiz-sacra && npm run build

# 2. Copiar dist para rotina-de-paz
rm -rf ~/rotina-de-paz/dist/sacra
cp -r ~/Quiz-sacra/dist/ ~/rotina-de-paz/dist/sacra/

# 3. Criar cópias de index.html para sub-rotas (SPA fallback)
for route in quiz quiz-sacra obrigado; do
  mkdir -p ~/rotina-de-paz/dist/sacra/$route
  cp ~/rotina-de-paz/dist/sacra/index.html ~/rotina-de-paz/dist/sacra/$route/index.html
done

# 4. Deploy
cd ~/rotina-de-paz && npx wrangler pages deploy dist --project-name=rotina-de-paz --branch=main --commit-dirty=true
```

**IMPORTANTE**: Sempre usar `--branch=main` para produção. Sem isso, cria deploy de preview que NÃO aparece em `rotinadepaz.com.br`.

### Tracking (Meta Pixel + CAPI)

| Camada | O que faz |
|--------|-----------|
| **Pixel (browser)** | PageView em toda página. InitiateCheckout no clique do checkout (value: 47, eventID: `ic_{externalId}`). Purchase na /obrigado (value: 47 fallback, eventID: transaction_id Kirvano, dedup sessionStorage). |
| **CAPI (server)** | Purchase disparado pelo webhook Kirvano no app (rotina-de-paz-app). Dedup com pixel via event_id = transaction_id. |
| **Bridge** | external_id (qs_UUID) viaja como ?src= na URL Kirvano. Client salva fbp/fbc/ua em `tracking_sessions`. Server busca por external_id e junta com email/phone do webhook. |
| **Gaps conhecidos** | Evento Lead ausente (quiz salva lead no DB mas não dispara fbq). CAPI ausente para PageView e InitiateCheckout. PageView sem eventID. Ver `AUDIT_TRACKING_META.md` para roadmap completo. |

**Pixel ID:** `838169472100225` (hardcoded no index.html)
**Scorecard tracking (2026-05-31):** 48/100 — Purchase sólido, Lead ausente, CAPI parcial. Ver `ARQUITETURA-TRACKING-VEREDICTO.md`.

**Tabelas Supabase (cemjibbauvvyfaxilrvm):**
- `tracking_sessions` — bridge browser→server (external_id PK, fbp, fbc, fbclid, user_agent)
- `processed_events` — idempotência CAPI (sale_id PK, previne Purchase duplicado em retries)

### Fluxo completo do funil

```
Quiz (7 perguntas)
  → Resultado (arquétipo + narração word-by-word)
    → Oferta (Rotina de Paz R$47)
      → [InitiateCheckout pixel (value: 47, eventID) + salva tracking_session]
      → Checkout Kirvano (redirect com ?src=external_id + UTMs)
        → Kirvano processa pagamento
          → Webhook → app → entitlements + CAPI Purchase (server)
          → Redirect → /sacra/obrigado?value=47&transaction_id=X
            → Purchase pixel (client, value: 47, fallback se URL sem value, dedup via transaction_id)
            → Animação "liberando acesso" (1.2s)
            → Upsell: A Chave da Gratidão (R$67)
              → Aceita: modal Kirvano (iframe, fallback redirect 4s)
              → Recusa: /sacra/obrigado?offer=downsell
                → Downsell: mesma oferta por R$37
                  → Aceita: modal Kirvano
                  → Recusa: redirect para app login
```

### Secrets necessários

| Secret | Onde | Descrição |
|--------|------|-----------|
| `META_CAPI_ACCESS_TOKEN` | Vercel env vars (app) | Token CAPI do Events Manager |
| `META_PIXEL_ID` | Vercel env vars (app) | `838169472100225` |
| `KIRVANO_WEBHOOK_SECRET` | Vercel env vars (app) | Token HMAC dos webhooks Kirvano |
| `VITE_KIRVANO_UPSELL_URL` | Quiz Sacra .env | URL checkout upsell Kirvano |
| `VITE_KIRVANO_DOWNSELL_URL` | Quiz Sacra .env | URL checkout downsell Kirvano |

### Preços do funil (atualizado 2026-05-31)

| Produto | Preço | Parcelas | Âncora | Onde |
|---------|-------|----------|--------|------|
| **Rotina de Paz** (principal) | R$ 47 | 10× R$ 5,60 | De R$ 129 | QuizApp.tsx OfferScreen |
| **A Chave da Gratidão** (upsell) | R$ 67 | 6× R$ 12,90 | De R$ 197 | funil.ts UPSELL_CONTENT |
| **A Chave da Gratidão** (downsell) | R$ 37 | 2× R$ 19,50 | De R$ 67 | funil.ts DOWNSELL_CONTENT |

### SPA Fallback

`public/_redirects` → copiado para `dist/` no build. Cloudflare Pages lê da raiz do deploy (`~/rotina-de-paz/dist/_redirects`), que já contém:
```
/sacra/*  /sacra/index.html  200
/*  /index.html  200
```
O hack de copiar index.html para subpastas no script de deploy é redundante mas inofensivo.

### Persistência de sessão (quiz)

`sessionStorage` chave `sacra_quiz_state_v1`. Salva stage + answers + name quando em `result` ou `offer`. Restaura no mount — refresh não reinicia o quiz. JSON corrompido ignorado (try/catch).

### Atualização 2026-05-31 — Auditoria + correções de preço e tracking

1. **Preço corrigido R$67 → R$47** no produto principal (JSX, parcelas, âncora). Upsell/downsell intocados.
2. **InitiateCheckout** agora envia `value: 47` pro Meta (antes enviava sem value).
3. **Purchase fallback** de value: se Kirvano não enviar `?value=` na URL, dispara com `47` em vez de sem valor.
4. **SPA fallback `_redirects`** criado para Cloudflare Pages (previne 404 no F5).
5. **CSS do redesign** commitado (`.rdp-btn-gold`, `.rdp-night`, partículas, legenda).
6. **Auditoria completa do tracking** — ver `AUDIT_TRACKING_META.md` e `ARQUITETURA-TRACKING-VEREDICTO.md`.

### Atualização 2026-05-30 — Redesign do funil (resultado → oferta)

Sessão grande de redesign do fim do funil. **Direção tomada:** transformar o trecho
resultado→oferta numa jornada de conversão mais sólida, fluida e leve, sem perder lead.

**O que mudou:**

1. **Removida a página de transição (BridgeScreen).** Fluxo agora é
   `resultado → (CTA) → oferta` direto. O conteúdo "O Porquê" (mente→corpo→instalação) foi
   absorvido pela narração da oferta.
2. **Chat de balões → legenda única word-by-word** (`NarrationCaption` no QuizApp.tsx).
   As palavras acendem no ritmo da voz; trechos fortes em dourado, versículos em itálico.
   Cues com tempo por palavra em `src/data/narration.ts`.
3. **Áudio único contínuo da oferta:** `src/assets/audio/narracao.mp3` (voz Amandoca,
   `eleven_multilingual_v2`). Gerado por `~/tts-narrador/gerar_narracao.mjs`; os tempos das
   cues vêm de `~/tts-narrador/processar_legenda.mjs` (forced-alignment — preserva o áudio).
   Sincronização via `timeupdate` do `<audio>` (nunca dessincroniza); fallback por tempo;
   autoplay ao entrar na viewport + 1º toque libera o som; mute e "toque para começar".
4. **Avatar "Jaqueline"** (`src/assets/jaqueline-avatar.webp`) só na oferta — header
   horizontal (foto à esquerda, nome+status à direita).
5. **Persistência de sessão** (`sessionStorage` chave `sacra_quiz_state_v1`): refresh em
   result/offer devolve a pessoa onde estava (não recomeça o quiz). Só persiste em
   result/offer; JSON corrompido é ignorado (try/catch). Botão "Voltar" na oferta → resultado.
6. **Scroll-to-top** em toda troca de tela (`useEffect` em `[stage]`) — a oferta abre no topo.
7. **Perguntas mais fluidas:** a transição **sobe pronta** (`SpeechBubble` prop `instant`) e
   só a pergunta digita. **Bug corrigido:** o `useEffect` do typewriter não limpava o
   `setInterval` no cleanup → intervals vazavam e o texto "pingava/voltava". Agora limpa
   timeout E interval + flag de cancelamento.
8. **Performance:** todas as imagens viraram **WebP** (~2 MB → dezenas de KB) e o áudio virou
   mono 80k. Total de assets caiu de ~10,5 MB para ~1,15 MB. Imports atualizados p/ `.webp`.
9. **Visual da oferta:** mockup da Rotina de Paz no lugar do título (moldura dourada premium,
   sombra de flutuação); cards de capítulo e ícones de entregáveis em roxo (paleta
   `#574868→#41345a`); bônus virou título dourado + imagem; botão dourado só no resultado
   (`.rdp-btn-gold`, com degradê no hover) e nos demais o padrão roxo→degradê.
10. **Preview por URL (dev):** `?preview=<arquetipo>&stage=<result|offer>&desire=<...>&situation=<...>`.

> Paleta roxa do card escuro de resultado: gradiente `#382b46 → #2a2236`. Cards/ícones da
> oferta usam um roxo mais claro (`#574868→#41345a`; ícones de entrega ainda mais claros
> `#7d6a96→#5f4f7d`). Dourado de destaque: `--gold-warm #C9A876`.

---

## 2. Rotina de Paz (LP + Checkout)

| Item | Valor |
|------|-------|
| **Repositório** | `github.com/santuariotnb-sys/rotina-de-paz-.git` |
| **Diretório local** | `/Users/guilhermehenrique/rotina-de-paz/` |
| **Stack** | React 18 + React Router v6 + Tailwind 3 + Framer Motion + Supabase + Pagar.me |
| **URL produção** | `rotinadepaz.com.br` |
| **Hosting** | Cloudflare Pages (projeto: `rotina-de-paz`) |
| **Pagamento** | Pagar.me V5 |
| **Supabase** | `qcomfdcofxmpurnfpoon` |

### Rotas principais

| Rota | Função |
|------|--------|
| `/` | Landing Page |
| `/checkout` | Checkout (Pagar.me) |
| `/upsell` | Upsell pós-compra |
| `/downsell` | Downsell |
| `/obrigado` | Thank You + JWT onboarding |
| `/quiz` | Quiz antigo (HTML standalone) |
| `/vsl` | VSL (HTML standalone) |
| `/sacra/*` | **Quiz Sacra** (subdiretório embeddado) |

### _redirects (Cloudflare Pages)

```
/sacra/*  /sacra/index.html  200
/*  /index.html  200
```

### Build & Deploy (só LP, sem quiz sacra)

```bash
cd ~/rotina-de-paz
npm run build   # tsc + vite build + post-build.cjs
npx wrangler pages deploy dist --project-name=rotina-de-paz --branch=main
```

**CUIDADO**: `npm run build` do rotina-de-paz APAGA `dist/sacra/`. Após rebuildar a LP, refaça o passo de copiar o Quiz Sacra (seção 1).

---

## 3. App + Admin (Círculo da Paz)

| Item | Valor |
|------|-------|
| **Repositório** | `github.com/santuariotnb-sys/rotina-de-paz-app.git` |
| **Diretório local** | `/Users/guilhermehenrique/rotina-de-paz-app/` |
| **Stack** | React 18 + TanStack Start (SSR/Nitro) + TanStack Query + Radix/shadcn + Tailwind 4 + Framer Motion + Recharts + Supabase |
| **URL produção** | `rotina-de-paz-app.vercel.app` |
| **Hosting** | Vercel (Nitro preset, deploy automático via push main) |
| **Supabase** | `cemjibbauvvyfaxilrvm` |

### Rotas do App (aluno)

| Rota | Função | Status |
|------|--------|--------|
| `/` | Redirect → `/login` | ✅ |
| `/login` | Login aluno (email/senha ou Google) | ✅ |
| `/reset-password` | Redefinir senha | ✅ |
| `/app` | Dashboard aluno (Método RP7, 7 dias × 2 turnos) | ✅ |
| `/app/volume/$turno` | Player de áudio por volume/turno | ✅ |
| `/app/louvores` | Louvores do Reino (player integrado) | ✅ |
| `/app/ebooks` | E-books com gating por entitlement | ✅ |
| `/app/devocionais` | Devocionais/cursos com gating | ✅ |
| `/app/depoimentos` | Depoimentos (social proof) | ✅ |
| `/app/suporte` | Lista de tickets + formulário novo ticket | ✅ |
| `/app/suporte/$ticketId` | Thread de mensagens + resposta | ✅ |

### Rotas do Admin

| Rota | Função | Status |
|------|--------|--------|
| `/admin/login` | Login admin (email/senha, verifica `admin_users`) | ✅ |
| `/admin` | Dashboard KPIs (vendas, leads, membros, arquétipos) | ✅ |
| `/admin/audios` | CRUD faixas de áudio do método | ✅ |
| `/admin/louvores` | CRUD louvores por livro bíblico + upload em massa | ✅ |
| `/admin/cursos` | CRUD cursos/devocionais + aulas por módulo | ✅ |
| `/admin/ebooks` | CRUD e-books com capa + PDF | ✅ |
| `/admin/produtos` | CRUD produtos + vinculação ofertas Kirvano | ✅ |
| `/admin/acessos` | Entitlements — concessão/revogação manual | ✅ |
| `/admin/clientes` | Tabela de alunas + drawer de detalhes | ✅ |
| `/admin/webhooks` | Logs Kirvano + validação HMAC + replay | ✅ |
| `/admin/leads` | Leads do Quiz — KPIs, gráficos, tabela, CSV export | ✅ |
| `/admin/quiz` | Analytics Quiz — respostas por pergunta, arquétipos, taxa conclusão | ✅ |
| `/admin/membros` | Membros — KPIs, tabela, drawer grant/revoke | ✅ |
| `/admin/vendas` | Vendas — KPIs gerais + funil de ofertas (Order Bump 1/2, Upsell R$67, Downsell R$37) | ✅ |
| `/admin/tracking` | UTM tracking — KPIs, gráficos source/campaign, CSV | ✅ |
| `/admin/suporte` | Tickets de suporte — KPIs, tabela, drawer com reply/close | ✅ |
| `/admin/config` | Setup webhook Kirvano + teste de eventos | ✅ |

### API Routes (server-side)

| Rota | Função |
|------|--------|
| `POST /api/public/webhooks/kirvano` | Recebe webhooks Kirvano, valida HMAC, processa pagamento, registra em webhook_logs |

### Server Functions (TanStack Start / Nitro)

| Função | Arquivo | O que faz |
|--------|---------|-----------|
| `notifyNewTicket` | `src/lib/api/send-email.functions.ts` | Email para suporte@rotinadepaz.com.br quando aluna abre ticket |
| `notifyUserReply` | `src/lib/api/send-email.functions.ts` | Email para suporte quando aluna responde |
| `notifyAdminReply` | `src/lib/api/send-email.functions.ts` | Email para aluna quando admin responde |
| `notifyTicketClosed` | `src/lib/api/send-email.functions.ts` | Email para aluna quando admin fecha ticket |

**Email provider:** Resend (`RESEND_API_KEY` — configurar no Vercel env vars). Sem a key, emails são silenciosamente ignorados.

### Admin

- Tabela `admin_users` (RLS ativo, policy via `is_admin()` SECURITY DEFINER)
- RPC `is_admin(_user_id uuid)` — `SECURITY DEFINER`, retorna boolean, bypassa RLS
- `getCurrentAdmin()` em `src/lib/admin/auth.ts` — chama RPC + busca record em admin_users
- **Branding:** Primordia (logo P dourado/cinza)
- TopBar (`src/components/app/AppNav.tsx`) mostra **Admin** (pill dourado → `/admin`) para admins + **Suporte** (link → `/app/suporte`) para todos
- Sidebar responsiva: colapsável no desktop (64px/244px, estado em localStorage), drawer no mobile com hamburger
- Botão "← App" no topbar admin para voltar ao app
- Admin atual: `guilherme.mrt17@gmail.com` (`super_admin`)

### Supabase Schema (`cemjibbauvvyfaxilrvm`)

| Tabela | Função |
|--------|--------|
| `profiles` | Perfis autenticados (user_id, email, name, archetype, desire, situation, lead_id) |
| `admin_users` | Admins do painel (user_id, email, name, role) |
| `admin_audit_logs` | Auditoria de ações admin |
| `products` | Produtos para venda (name, price_cents, checkout_url) |
| `product_kirvano_offers` | Vinculação produto ↔ oferta Kirvano |
| `entitlements` | Acessos de usuários a produtos (source: kirvano/admin/manual) |
| `audio_tracks` | Faixas de áudio do método RP7 (por dia, kind: despertar/aquietar/bonus) |
| `louvores` | Louvores por livro bíblico (book, chapter, audio_url) |
| `ebooks` | E-books com capa, PDF, categoria, gating por produto |
| `courses` | Cursos/devocionais (kind: devocional/curso, gating por produto) |
| `course_lessons` | Aulas dentro de cursos (por módulo) |
| `leads` | Leads do Quiz Sacra (name, email, archetype, scores, UTMs) |
| `quiz_responses` | Respostas do quiz por pergunta (lead_id, question_key, answer_value) |
| `webhook_logs` | Logs de webhooks Kirvano (payload, signature, processed) |
| `support_tickets` | Tickets de suporte (user_id, category, subject, status: open/answered/closed) |
| `support_messages` | Mensagens de thread (ticket_id, sender_type: user/admin, body) |

**Storage Buckets:** `method-audios`, `louvores-audios`, `ebooks-files`, `course-videos` (todos públicos para leitura)

### Auditoria pendente (2026-05-31) — ver `AUDIT-ADMIN-2026-05-31.md` no repo do app

**Corrigido (sessão 2026-05-31):**
- Fix profile lookup no suporte (`.eq("id")` → `.eq("user_id")`)
- Limpeza mock Pixabay do louvores.ts
- Compressão capas WebP (2.1MB → 111KB)
- Nova tela `/admin/quiz` — analytics de respostas por pergunta, arquétipos, taxa conclusão
- `/admin/vendas` — 4 cards do funil (Order Bump 1/2, Upsell R$67, Downsell R$37) abaixo dos KPIs originais
- Fix `saveEmail()` no Quiz-sacra (update em vez de insert duplicado)
- Evento `Lead` no pixel Meta (dispara após quiz completo)
- Fallback value 47 no Purchase pixel
- Value 47 no InitiateCheckout
- SPA fallback `_redirects` para Cloudflare Pages

### Funil de Vendas (`/admin/vendas`)

```
KPIs originais: Receita Aprovada | Vendas Aprovadas | Estornos | Eventos Kirvano

Funil de Ofertas (4 cards):
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ORDER BUMP 1 │ │ ORDER BUMP 2 │ │    UPSELL    │ │   DOWNSELL   │
│ A cadastrar  │ │ A cadastrar  │ │ Chave da     │ │ Chave da     │
│              │ │              │ │ Gratidão     │ │ Gratidão     │
│ R$ 0,00      │ │ R$ 0,00      │ │ R$ 67        │ │ R$ 37        │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Como funciona:** Webhook Kirvano → `processKirvanoPayload()` → cruza `offer_id` com `product_kirvano_offers` → cria `entitlement` → dashboard lê entitlements e agrupa por produto.

**Para ativar Order Bumps:** cadastrar produtos em `/admin/produtos`, vincular `kirvano_offer_id`, e ajustar match em `funnelStats` no `admin.vendas.tsx`.

**Pendente (por prioridade):**
- Onda 2: Buckets privados + signed URLs, RLS gating em ebooks/courses
- Onda 3: KPIs server-side (receita, arquétipos), QueryClient staleTime, BulkUploader paralelo
- Onda 4: CAPI para InitiateCheckout, pipeline tracking completo
- Onda 5: Unificar query keys, tema visual consistente

### Hooks do App

| Hook | Função |
|------|--------|
| `useEntitlements()` | Retorna Set de product_ids desbloqueados do usuário logado |
| `useProductCheckouts()` | Mapeia product_id → checkout_url (Kirvano) |
| `usePlayer()` | Contexto global do player de áudio (play, toggle, next, prev, seek) |
| `useIsMobile()` | Detecta breakpoint mobile (768px) |

### Fluxo Quiz → Lead → Profile → App

```
1. Quiz Sacra (rotinadepaz.com.br/sacra)
   → Insere lead: name, email, archetype, scores, desire, situation, UTMs
   → Insere quiz_responses por pergunta
   → Salva sacra_student no localStorage

2. Compra via Kirvano
   → Webhook POST /api/public/webhooks/kirvano
   → Cria entitlement (product_id, buyer_email, status: active)

3. Login no App
   → supabase.auth.signInWithPassword()
   → onAuthStateChange → syncStudentWithProfile() (fire-and-forget)
   → Cria/atualiza profile com dados do localStorage (archetype, desire, situation, lead_id)
   → Navigate → /app

4. App carrega
   → Dashboard mostra método RP7 por arquétipo
   → Conteúdo gated verifica entitlements
   → Player de áudio com MediaSession (controles tela bloqueada)
```

### Analytics via Claude Code (RPCs Supabase)

O Claude pode acessar analytics em qualquer sessão via `supabase.rpc()` com a service role key:

| RPC | Parâmetros | Retorna |
|-----|-----------|---------|
| `analytics_top_segments` | `p_days` (30), `p_min_leads` (20) | Top segmentos por conversão (archetype × situation × desire), com n, conv_rate, revenue |
| `analytics_funnel` | `p_days` (30) | Funil: total_leads → with_archetype → with_email → purchasers → upsell_buyers → downsell_buyers + total_revenue |
| `analytics_revenue_breakdown` | `p_days` (30) | Receita por produto e tipo (principal/bump/upsell/downsell), vendas, reembolsos |
| `analytics_quiz_conversion` | `p_days` (30) | Respostas do quiz × taxa de conversão (por question_key) |
| `analytics_cohort_weekly` | `p_weeks` (12) | Cohort semanal: leads, buyers, revenue, conv_pct |

**Exemplo de uso:**
```javascript
const { data } = await supabase.rpc("analytics_top_segments", { p_days: 30, p_min_leads: 20 });
// → [{archetype: "vigilante", situation: "mae-solo", desire: "dormir", total_leads: 45, conv_rate: 8.9, revenue: 188.00}, ...]
```

**Dashboard visual:** `/admin/analytics` — funil, top segmentos, quiz×conversão, receita por produto, cohort semanal.

### Emails (Resend — validado 2026-06-01)

**Provider:** Resend · **Domínio:** `rotinadepaz.com.br` (verificado, São Paulo sa-east-1, Cloudflare)
**API Key:** `RESEND_API_KEY` configurada no Vercel env vars (production)
**From:** `Rotina de Paz <noreply@rotinadepaz.com.br>` (padronizado, sem hífen)

| # | Email | Trigger | Destinatário | Arquivo |
|---|-------|---------|-------------|---------|
| 1 | **Welcome (compra)** | Webhook Kirvano → `sendWelcomeEmail()` | Aluna (buyer_email) | `src/lib/admin/email.server.ts` |
| 2 | **Novo ticket** | Aluna abre ticket | `rotinadepaz.suporte@gmail.com` | `src/lib/api/send-email.functions.ts` |
| 3 | **Aluna responde** | Aluna responde ticket | `rotinadepaz.suporte@gmail.com` | `src/lib/api/send-email.functions.ts` |
| 4 | **Admin responde** | Admin responde ticket | Aluna (email) | `src/lib/api/send-email.functions.ts` |
| 5 | **Ticket fechado** | Admin fecha ticket | Aluna (email) | `src/lib/api/send-email.functions.ts` |
| 6 | **Confirm signup** | Auth signup | Aluna | Supabase Auth (template padrão) |
| 7 | **Reset senha** | Esqueci senha | Aluna | Supabase Auth (template padrão) |

**Welcome email:** Template premium (cream/gold, Georgia serif, versículo Romanos 12:2). Botão "Criar minha conta e acessar" com magic link do Supabase. Fallback para `/login` se magic link falhar. Subject: "{nome}, bem-vinda ao Círculo da Paz ✨".

**Suporte:** Todos os handlers são **não-bloqueantes** (falha silenciosa). Se o email falhar, o ticket continua salvo no banco. A aluna nunca vê erro na UI.

**Fluxo pós-compra:**
```
Kirvano webhook → cria user (sem senha) → gera magic link → envia welcome email
  → Aluna clica "Criar minha conta e acessar" → redireciona para /app
  → Se não receber email: "Esqueci minha senha" no /login funciona
```

### Deploy

```bash
cd ~/rotina-de-paz-app
git push origin main   # Vercel auto-deploy
```

Sem necessidade de deploy manual — push para `main` triggera build+deploy no Vercel.

---

## 4. Santuário TNB (App principal / PWA)

| Item | Valor |
|------|-------|
| **Repositório** | `github.com/santuariotnb-sys/santuariotnb.git` |
| **Diretório local** | `/Users/guilhermehenrique/santuariotnb/` |
| **Stack** | React 18 + React Router v6 + Radix/shadcn + Tailwind 3 + Capacitor (mobile) + PWA |
| **Hosting** | A definir |

App com suporte a PWA e mobile nativo (Capacitor Android/iOS).

---

## Regras para não errar

1. **Não misture projetos** — Quiz Sacra é independente do Rotina de Paz. Checkout do quiz vai para Kirvano, não Pagar.me.
2. **Deploy do quiz** sempre via cópia manual para `dist/sacra/` + wrangler deploy do rotina-de-paz.
3. **`--branch=main`** obrigatório para produção no Cloudflare Pages.
4. **`--commit-dirty=true`** evita warning de uncommitted changes.
5. **Supabase são diferentes**: Quiz + App usam `cemjibbauvvyfaxilrvm`, LP usa `qcomfdcofxmpurnfpoon`.
6. **Após rebuild da LP**: sempre re-copiar Quiz Sacra para `dist/sacra/`.
7. **Admin login**: usa Supabase Auth + verificação em `admin_users` via RPC `is_admin()`. Não tem cadastro por UI — inserir admin direto no banco.
8. **Hooks do React**: nunca colocar `useState`/`useEffect` depois de early returns condicionais.
9. **syncStudentWithProfile**: é fire-and-forget no login — não bloqueia navegação.
10. **RLS `admin_users`**: policy usa `is_admin()` (SECURITY DEFINER) para evitar recursão circular.
11. **Emails (Resend)**: configurar `RESEND_API_KEY` no Vercel env vars. Domínio remetente `noreply@rotinadepaz.com.br` precisa ser verificado no Resend.
12. **Suporte**: categorias válidas: `duvida`, `dificuldade`, `erro`, `reembolso`. Status: `open` → `answered` → `closed`.
13. **Tipos do suporte**: sempre importar de `@/lib/support/types.ts` — nunca redefinir localmente.
14. **Emails do suporte**: todas as funções usam `escapeHtml()` + validação Zod server-side via `.inputValidator()`.
15. **RLS suporte**: `support_messages` tem SELECT, INSERT, UPDATE e DELETE (admins). Migration: `20260530_support_rls_complete.sql`.
