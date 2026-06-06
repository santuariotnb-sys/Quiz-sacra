# Analytics Framework — Quiz Sacra / Rotina de Paz

> Estrutura conceitual para analytics de quiz + funil de vendas.
> Objetivo: identificar lead campea, nicho vencedor, e dar visibilidade de receita ao Claude Code via SQL.

---

## 1. Modelo de Dados (estado atual + extensoes necessarias)

### Tabelas existentes
- `leads` — nome, email, archetype, scores (jsonb), desire, situation, risk_flag, UTMs, timestamps
- `quiz_responses` — lead_id, question_key, answer_value, answer_text, time_to_answer
- `risk_events` — source, created_at
- `tracking_sessions` — external_id, fbp, fbc, fbclid, client_ip, user_agent

### Tabelas novas necessarias

```sql
-- Eventos do funil (cada etapa gera uma linha)
CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  external_id text,           -- correlacao com tracking_sessions
  event_type text NOT NULL,   -- quiz_start, quiz_complete, email_captured, initiate_checkout, purchase, upsell_view, upsell_accept, upsell_decline, downsell_view, downsell_accept, downsell_decline
  event_data jsonb DEFAULT '{}',  -- {product, value, transaction_id, ...}
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_funnel_events_lead ON public.funnel_events (lead_id, created_at);
CREATE INDEX idx_funnel_events_type ON public.funnel_events (event_type, created_at);

-- Compras (uma linha por transacao confirmada via webhook)
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  external_id text,
  transaction_id text UNIQUE,  -- ID do Kirvano, dedup natural
  product text NOT NULL,       -- rotina_de_paz, chave_gratidao, chave_gratidao_downsell
  product_type text NOT NULL,  -- principal, order_bump, upsell, downsell
  gross_value numeric(10,2) NOT NULL,
  net_value numeric(10,2),     -- apos taxas gateway
  status text NOT NULL DEFAULT 'confirmed', -- confirmed, refunded, chargeback
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchases_lead ON public.purchases (lead_id);
CREATE INDEX idx_purchases_product ON public.purchases (product, created_at);

-- Metricas pre-calculadas (refresh periodico via cron/RPC)
CREATE TABLE public.analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL,   -- daily, weekly, monthly
  period_start date NOT NULL,
  metric_name text NOT NULL,
  dimension jsonb DEFAULT '{}', -- {archetype, situation, desire, utm_source, ...}
  value numeric NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_type, period_start, metric_name, dimension)
);
CREATE INDEX idx_snapshots_metric ON public.analytics_snapshots (metric_name, period_start);
```

---

## 2. Lead Scoring / Lead Campea

### Score de qualidade do lead

| Componente | Peso | Calculo | Fonte |
|---|---|---|---|
| Quiz completion | 20 | 1.0 se completou, 0 se abandonou | `leads.archetype IS NOT NULL` |
| Email capture | 15 | 1.0 se email preenchido, 0 se nao | `leads.email IS NOT NULL` |
| Engagement depth | 20 | `avg(time_to_answer)` normalizado (mais tempo = mais engajado) | `quiz_responses.time_to_answer` |
| Archetype strength | 15 | `max(scores) / sum(scores)` — quanto mais dominante, mais definido | `leads.scores` |
| Desire alignment | 15 | Score fixo por desire (`dormir`=0.9, `descansar`=0.85, `orar`=0.8, `parar-pior`=0.75) — calibrar com dados reais | `leads.desire` |
| Risk flag | 15 | 0 se risk_flag=true (lead em crise converte menos em produto digital) | `leads.risk_flag` |

**Formula:**
```
lead_score = (completion * 20 + email * 15 + engagement * 20 + strength * 15 + desire_align * 15 + risk_inv * 15) / 100
```

**SQL para calcular:**
```sql
SELECT
  l.id,
  l.archetype,
  l.desire,
  l.situation,
  -- completion
  CASE WHEN l.archetype IS NOT NULL THEN 1.0 ELSE 0 END AS f_completion,
  -- email
  CASE WHEN l.email IS NOT NULL THEN 1.0 ELSE 0 END AS f_email,
  -- engagement (normalizado 0-1, cap em 60s media)
  LEAST(1.0, COALESCE(avg_time, 0) / 60000.0) AS f_engagement,
  -- archetype strength
  CASE WHEN score_sum > 0 THEN score_max::numeric / score_sum ELSE 0 END AS f_strength,
  -- risk inverse
  CASE WHEN l.risk_flag THEN 0 ELSE 1.0 END AS f_risk_inv
FROM leads l
LEFT JOIN LATERAL (
  SELECT AVG(time_to_answer) AS avg_time
  FROM quiz_responses qr WHERE qr.lead_id = l.id
) t ON true
LEFT JOIN LATERAL (
  SELECT
    GREATEST(
      COALESCE((l.scores->>'vigilante')::int, 0),
      COALESCE((l.scores->>'sobrecarga')::int, 0),
      COALESCE((l.scores->>'culposa')::int, 0),
      COALESCE((l.scores->>'antecipatoria')::int, 0)
    ) AS score_max,
    COALESCE((l.scores->>'vigilante')::int, 0) +
    COALESCE((l.scores->>'sobrecarga')::int, 0) +
    COALESCE((l.scores->>'culposa')::int, 0) +
    COALESCE((l.scores->>'antecipatoria')::int, 0) AS score_sum
) s ON true
WHERE l.created_at >= now() - interval '30 days';
```

### Perfil da lead campea (segmento ideal)
- Combinacao de `archetype x situation x desire` com maior taxa de conversao
- Atualizar semanalmente via snapshot

---

## 3. Nicho Vencedor

### Metricas de segmento

| Metrica | Formula | Granularidade | Fonte |
|---|---|---|---|
| Volume de leads | `COUNT(leads)` por segmento | archetype x situation x desire | `leads` |
| Quiz completion rate | `COUNT(archetype IS NOT NULL) / COUNT(quiz_start)` | por segmento | `leads` + `funnel_events` |
| Email capture rate | `COUNT(email IS NOT NULL) / COUNT(archetype IS NOT NULL)` | por segmento | `leads` |
| Checkout rate | `COUNT(initiate_checkout) / COUNT(quiz_complete)` | por segmento | `funnel_events` |
| Purchase rate | `COUNT(purchase) / COUNT(initiate_checkout)` | por segmento | `funnel_events` |
| Conversion rate total | `COUNT(purchase) / COUNT(quiz_start)` | por segmento | `funnel_events` |
| Upsell take rate | `COUNT(upsell_accept) / COUNT(upsell_view)` | por segmento | `funnel_events` |
| Downsell take rate | `COUNT(downsell_accept) / COUNT(downsell_view)` | por segmento | `funnel_events` |
| Ticket medio | `SUM(gross_value) / COUNT(DISTINCT lead_id)` por comprador | por segmento | `purchases` |
| LTV potencial | `ticket_medio * (1 + upsell_rate * upsell_value/principal_value)` | por segmento | `purchases` |

### Dimensoes de segmentacao
1. **Archetype** (4): vigilante, sobrecarga, culposa, antecipatoria
2. **Situation** (5): casada-filhos-pequenos, casada-filhos-grandes, casada-sem-filhos, mae-solo, solteira
3. **Desire** (4): dormir, descansar, orar, parar-pior
4. **UTM source** (N): fonte de trafego
5. **Risk flag** (2): true/false

Total combinacoes possiveis: 4 x 5 x 4 = 80 segmentos (sem UTM).
Na pratica, 10-15 terao volume suficiente para decisao.

### SQL — Top 5 segmentos por conversao
```sql
SELECT
  l.archetype,
  l.situation,
  l.desire,
  COUNT(*) AS total_leads,
  COUNT(p.id) AS purchasers,
  ROUND(COUNT(p.id)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS conv_rate,
  COALESCE(SUM(p.gross_value), 0) AS revenue,
  ROUND(COALESCE(SUM(p.gross_value), 0) / NULLIF(COUNT(p.id), 0), 2) AS avg_ticket
FROM leads l
LEFT JOIN purchases p ON p.lead_id = l.id AND p.status = 'confirmed'
WHERE l.archetype IS NOT NULL
  AND l.created_at >= now() - interval '30 days'
GROUP BY l.archetype, l.situation, l.desire
HAVING COUNT(*) >= 10  -- volume minimo para significancia
ORDER BY conv_rate DESC
LIMIT 5;
```

---

## 4. Analytics de Receita e Conversao

### Metricas de receita

| Metrica | Formula | Frequencia | Fonte |
|---|---|---|---|
| Receita bruta total | `SUM(gross_value) WHERE status='confirmed'` | diaria | `purchases` |
| Receita por produto | `SUM(gross_value) GROUP BY product` | diaria | `purchases` |
| Receita por tipo | `SUM(gross_value) GROUP BY product_type` | diaria | `purchases` |
| Ticket medio por comprador | `SUM(gross_value) / COUNT(DISTINCT lead_id)` | diaria | `purchases` |
| Take rate upsell | `COUNT(upsell_accept) / COUNT(upsell_view) * 100` | diaria | `funnel_events` |
| Take rate downsell | `COUNT(downsell_accept) / COUNT(downsell_view) * 100` | diaria | `funnel_events` |
| Valor medio upsell stack | `47 + (upsell_rate * 67) + (downsell_rate * 37)` | semanal | calculado |
| Refund rate | `COUNT(status='refunded') / COUNT(status='confirmed') * 100` | semanal | `purchases` |
| CPL (custo por lead) | dado externo (Meta Ads) / `COUNT(quiz_complete)` | semanal | externo |
| CPA (custo por aquisicao) | dado externo (Meta Ads) / `COUNT(purchase)` | semanal | externo |
| ROAS | `receita_bruta / gasto_ads` | semanal | externo + `purchases` |

### Produtos e valores

| Produto | Tipo | Valor |
|---|---|---|
| Rotina de Paz | principal | R$ 47,00 |
| A Chave da Gratidao (upsell) | upsell | R$ 67,00 |
| A Chave da Gratidao (downsell) | downsell | R$ 37,00 |

### Cenarios de ticket medio

| Cenario | Calculo | Ticket |
|---|---|---|
| So principal | R$ 47 | R$ 47,00 |
| Principal + upsell | R$ 47 + R$ 67 | R$ 114,00 |
| Principal + downsell | R$ 47 + R$ 37 | R$ 84,00 |
| Ponderado (ex: 30% upsell, 20% downsell) | 47 + 0.3*67 + 0.2*37 | R$ 74,50 |

### Cohort analysis — receita por semana
```sql
SELECT
  date_trunc('week', l.created_at)::date AS cohort_week,
  COUNT(DISTINCT l.id) AS leads,
  COUNT(DISTINCT p.lead_id) AS buyers,
  COALESCE(SUM(p.gross_value), 0) AS revenue,
  ROUND(COUNT(DISTINCT p.lead_id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0) * 100, 1) AS conv_pct
FROM leads l
LEFT JOIN purchases p ON p.lead_id = l.id AND p.status = 'confirmed'
WHERE l.archetype IS NOT NULL
GROUP BY cohort_week
ORDER BY cohort_week DESC
LIMIT 12;
```

---

## 5. Analytics de Respostas do Quiz

### Distribuicao de respostas
```sql
SELECT
  qr.question_key,
  qr.answer_value,
  qr.answer_text,
  COUNT(*) AS total,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY qr.question_key) * 100, 1) AS pct
FROM quiz_responses qr
JOIN leads l ON l.id = qr.lead_id
WHERE l.created_at >= now() - interval '30 days'
GROUP BY qr.question_key, qr.answer_value, qr.answer_text
ORDER BY qr.question_key, total DESC;
```

### Correlacao resposta x conversao
```sql
SELECT
  qr.question_key,
  qr.answer_value,
  COUNT(DISTINCT qr.lead_id) AS respondents,
  COUNT(DISTINCT p.lead_id) AS buyers,
  ROUND(COUNT(DISTINCT p.lead_id)::numeric / NULLIF(COUNT(DISTINCT qr.lead_id), 0) * 100, 1) AS conv_rate
FROM quiz_responses qr
JOIN leads l ON l.id = qr.lead_id
LEFT JOIN purchases p ON p.lead_id = qr.lead_id AND p.status = 'confirmed'
WHERE l.created_at >= now() - interval '30 days'
GROUP BY qr.question_key, qr.answer_value
ORDER BY qr.question_key, conv_rate DESC;
```

### Drop-off por pergunta
O quiz tem 7 perguntas (keys: situacao, risco, sintoma, comportamento, frase, espiritual, desejo).
Drop-off = quem respondeu a pergunta N mas nao respondeu N+1.

```sql
WITH question_order AS (
  SELECT unnest(ARRAY['situacao','risco','sintoma','comportamento','frase','espiritual','desejo']) AS qkey,
         generate_series(1,7) AS step
),
lead_progress AS (
  SELECT
    qr.lead_id,
    MAX(qo.step) AS max_step
  FROM quiz_responses qr
  JOIN question_order qo ON qo.qkey = qr.question_key
  GROUP BY qr.lead_id
)
SELECT
  qo.step,
  qo.qkey AS question,
  COUNT(lp.lead_id) AS reached,
  LAG(COUNT(lp.lead_id)) OVER (ORDER BY qo.step) AS prev_reached,
  ROUND(
    (1 - COUNT(lp.lead_id)::numeric / NULLIF(LAG(COUNT(lp.lead_id)) OVER (ORDER BY qo.step), 0)) * 100
  , 1) AS dropoff_pct
FROM question_order qo
LEFT JOIN lead_progress lp ON lp.max_step >= qo.step
GROUP BY qo.step, qo.qkey
ORDER BY qo.step;
```

### Tempo medio por pergunta
Nota: atualmente `time_to_answer` e calculado como `totalTime / QUESTIONS.length` (media uniforme). Para dados precisos, capturar timestamp por pergunta no frontend.

**Melhoria necessaria no frontend:**
```ts
// Em QuizApp.tsx, no handler answer():
const questionStartTs = useRef<number>(Date.now());
// Ao responder:
const elapsed = Date.now() - questionStartTs.current;
// Gravar elapsed real por pergunta no quiz_responses.time_to_answer
questionStartTs.current = Date.now(); // reset para proxima
```

---

## 6. Funil Completo — Etapas e Taxas

### Etapas do funil

| # | Evento | Trigger | Onde registrar |
|---|---|---|---|
| 1 | `quiz_start` | Usuario clica "Estou pronta" | frontend -> funnel_events |
| 2 | `quiz_q{N}_answered` | Responde pergunta N | frontend -> quiz_responses (ja existe) |
| 3 | `quiz_complete` | Responde ultima pergunta | frontend -> funnel_events (+ persistLead) |
| 4 | `email_captured` | Preenche email na tela de resultado | frontend -> funnel_events |
| 5 | `offer_viewed` | Entra na tela de oferta | frontend -> funnel_events |
| 6 | `initiate_checkout` | Clica no CTA de compra | frontend -> pixel + funnel_events |
| 7 | `purchase` | Webhook Kirvano confirma pagamento | backend -> purchases + funnel_events |
| 8 | `upsell_viewed` | Abre pagina de upsell | frontend -> funnel_events |
| 9 | `upsell_accepted` | Compra upsell | backend -> purchases + funnel_events |
| 10 | `upsell_declined` | Recusa upsell | frontend -> funnel_events |
| 11 | `downsell_viewed` | Abre pagina de downsell | frontend -> funnel_events |
| 12 | `downsell_accepted` | Compra downsell | backend -> purchases + funnel_events |
| 13 | `downsell_declined` | Recusa downsell | frontend -> funnel_events |

### Taxas esperadas (benchmarks para calibracao)

| De -> Para | Benchmark mercado infoproduto BR | Meta inicial |
|---|---|---|
| quiz_start -> quiz_complete | 60-80% | 70% |
| quiz_complete -> email_captured | 15-30% | 20% |
| quiz_complete -> offer_viewed | 70-90% | 80% |
| offer_viewed -> initiate_checkout | 5-15% | 8% |
| initiate_checkout -> purchase | 30-60% | 40% |
| quiz_start -> purchase (total) | 1-5% | 2% |
| purchase -> upsell_accepted | 15-30% | 20% |
| upsell_declined -> downsell_accepted | 10-25% | 15% |

---

## 7. Dashboard Acessivel ao Claude Code

### Estrategia: RPCs + Views + Tabela de snapshots

**Camada 1 — RPCs para consultas ad-hoc**
O Claude Code chama via Supabase client JS:
```ts
const { data } = await supabase.rpc('analytics_funnel_summary', { days: 30 });
```

**RPCs recomendadas:**

| RPC | Parametros | Retorno |
|---|---|---|
| `analytics_funnel_summary` | days (int) | steps, counts, rates do funil |
| `analytics_revenue_summary` | days (int) | receita por produto, ticket medio, take rates |
| `analytics_segment_ranking` | days (int), min_leads (int) | top segmentos por conversao |
| `analytics_quiz_distribution` | days (int) | distribuicao de respostas |
| `analytics_quiz_correlation` | days (int) | resposta x conversao |
| `analytics_cohort_weekly` | weeks (int) | cohort semanal |
| `analytics_lead_score` | lead_id (uuid) | score detalhado do lead |

**Camada 2 — Views materializadas para queries pesadas**
```sql
CREATE MATERIALIZED VIEW mv_daily_metrics AS
SELECT
  date_trunc('day', l.created_at)::date AS day,
  l.archetype,
  l.situation,
  l.desire,
  COUNT(*) AS leads,
  COUNT(l.email) AS emails,
  COUNT(p.id) AS purchases,
  COALESCE(SUM(p.gross_value), 0) AS revenue
FROM leads l
LEFT JOIN purchases p ON p.lead_id = l.id AND p.status = 'confirmed'
WHERE l.archetype IS NOT NULL
GROUP BY day, l.archetype, l.situation, l.desire;

-- Refresh via cron (Supabase pg_cron ou Edge Function agendada)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics;
```

**Camada 3 — analytics_snapshots para historico**
Tabela `analytics_snapshots` armazena metricas pre-calculadas.
Uma Edge Function roda diariamente e insere/atualiza:
- `total_leads`, `total_purchases`, `total_revenue`, `conversion_rate`
- Por dimensao: archetype, situation, desire, utm_source
- Isso permite ao Claude Code fazer `SELECT * FROM analytics_snapshots WHERE metric_name = 'conversion_rate' AND period_type = 'daily' ORDER BY period_start DESC LIMIT 30` sem query pesada.

### Formato de acesso pelo Claude Code

1. **Consulta rapida**: `supabase.rpc('analytics_funnel_summary', { days: 7 })`
2. **Exploracao**: `supabase.from('analytics_snapshots').select('*').eq('metric_name', 'revenue').order('period_start', { ascending: false })`
3. **Ad-hoc**: SQL direto via `supabase.rpc('run_analytics_query', { sql: '...' })` — RPC restrita a admin com whitelist de tabelas

### Frequencia de atualizacao

| Dado | Frequencia | Metodo |
|---|---|---|
| Leads + quiz_responses | Tempo real | Insert direto do frontend |
| Purchases | Tempo real | Webhook Kirvano |
| funnel_events | Tempo real | Insert direto |
| mv_daily_metrics | 1x/dia 06:00 UTC | pg_cron ou Edge Function |
| analytics_snapshots | 1x/dia 06:00 UTC | Edge Function |

---

## 8. Prioridade de Implementacao

| Fase | O que | Esforco |
|---|---|---|
| 1 | Criar tabela `purchases` + webhook Kirvano | 4h |
| 2 | Criar tabela `funnel_events` + tracking no frontend | 3h |
| 3 | Fix `time_to_answer` real por pergunta | 1h |
| 4 | RPCs: funnel_summary, revenue_summary, segment_ranking | 4h |
| 5 | View materializada + snapshot diario | 3h |
| 6 | Lead scoring RPC | 2h |
| 7 | Correlacao resposta x conversao RPC | 2h |
| **Total** | | **~19h** |

---

## 9. Insights que o Claude Code podera gerar

Com essa estrutura, numa proxima sessao o Claude pode:

1. "Qual o arquetipo que mais converte?" -> `rpc analytics_segment_ranking`
2. "Qual o ticket medio esta semana?" -> `rpc analytics_revenue_summary`
3. "Em qual pergunta as pessoas abandonam?" -> query `quiz_responses` com drop-off
4. "Quem marca 'peito apertado' converte mais?" -> `rpc analytics_quiz_correlation`
5. "Qual UTM source tem melhor ROAS?" -> join `analytics_snapshots` com dados externos
6. "Gera um report semanal" -> combina todas as RPCs e formata
7. "Qual o LTV de sobrecarga + mae-solo + dormir?" -> `rpc analytics_segment_ranking` filtrado
8. "A taxa de upsell caiu?" -> `analytics_snapshots` serie temporal
