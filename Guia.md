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
| `/sacra/obrigado` | `src/routes/obrigado.tsx` | Thank you + Upsell (R$67) — redirect pós-compra Kirvano |
| `/sacra/obrigado?offer=downsell` | `src/routes/obrigado.tsx` | Downsell (R$37) — quando recusa upsell |

### Arquivos-chave

```
src/
├── routes/           → Rotas TanStack Router (auto-generated routeTree.gen.ts)
├── components/quiz/
│   ├── QuizApp.tsx   → Componente principal (stages: hero→questions→loading→result→bridge→offer)
│   ├── Avatar.tsx    → Avatar da guia
│   └── SpeechBubble.tsx, EmotionalProgress.tsx
├── data/quiz.ts      → Perguntas, arquétipos, transições, confirmações
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
| **Pixel (browser)** | PageView em toda página. InitiateCheckout no clique do checkout. Purchase na /obrigado (event_id = sale_id do Kirvano). |
| **CAPI (server)** | Purchase disparado pelo webhook Kirvano no app (processKirvanoPayload). Dedup com pixel via event_id = sale_id. |
| **Bridge** | external_id (qs_UUID) viaja como ?src= na URL Kirvano. Client salva fbp/fbc/ua em `tracking_sessions`. Server busca por external_id e junta com email/phone do webhook. |

**Pixel ID:** `838169472100225` (hardcoded no index.html)

**Tabelas Supabase (cemjibbauvvyfaxilrvm):**
- `tracking_sessions` — bridge browser→server (external_id PK, fbp, fbc, fbclid, user_agent)
- `processed_events` — idempotência CAPI (sale_id PK, previne Purchase duplicado em retries)

### Fluxo completo do funil

```
Quiz (7 perguntas)
  → Resultado (arquétipo)
    → Bridge (ponte emocional)
      → Oferta (Rotina de Paz R$67)
        → [InitiateCheckout pixel + salva tracking_session]
        → Checkout Kirvano (redirect com ?src=external_id)
          → Kirvano processa pagamento
            → Webhook → app → entitlements + CAPI Purchase (server)
            → Redirect → /sacra/obrigado
              → Purchase pixel (client, dedup via sale_id)
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
| `/admin/membros` | Membros — KPIs, tabela, drawer grant/revoke | ✅ |
| `/admin/vendas` | Vendas — receita, estornos, breakdown por produto | ✅ |
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
