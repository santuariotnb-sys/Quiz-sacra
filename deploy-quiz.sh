#!/usr/bin/env bash
# deploy-quiz.sh — Deploy do Quiz Sacra via rotina-de-paz (CF Pages)
#
# Processo verificado em 2026-06-17 após incidente de tela branca.
# CAUSA DO INCIDENTE: wrangler pages deploy executado de dentro do Quiz-sacra/
# deployou só o quiz como site inteiro, matando LP+checkout.
#
# VERDADE: o deploy SEMPRE sai de rotina-de-paz/dist/ (site completo).
# O quiz é copiado para dist/sacra/ antes do deploy.
#
# Uso:
#   ./deploy-quiz.sh              → deploy preview (--branch=preview-quiz)
#   ./deploy-quiz.sh --prod       → deploy produção (--branch=main)
#
# ROLLBACK: no dashboard CF → Workers & Pages → rotina-de-paz → Deployments
#           → escolher deploy anterior → "Reverter para esta implantação"

set -euo pipefail

QUIZ_DIR="$(cd "$(dirname "$0")" && pwd)"
RDP_DIR="$HOME/rotina-de-paz"
PROJECT="rotina-de-paz"

# ── Validações ────────────────────────────────────────────────
if [ ! -d "$RDP_DIR" ]; then
  echo "❌ Diretório $RDP_DIR não encontrado"
  exit 1
fi

if [ ! -f "$QUIZ_DIR/vite.config.ts" ]; then
  echo "❌ Execute este script de dentro do Quiz-sacra/"
  exit 1
fi

# Verificar base: "/sacra/" no vite.config
if ! grep -q 'base: "/sacra/"' "$QUIZ_DIR/vite.config.ts"; then
  echo "❌ vite.config.ts não tem base: \"/sacra/\" — ABORTANDO"
  exit 1
fi

# ── Determinar branch ────────────────────────────────────────
BRANCH="preview-quiz"
if [ "${1:-}" = "--prod" ]; then
  BRANCH="main"
  echo "⚠️  DEPLOY DE PRODUÇÃO"
  echo "    Tem certeza? O preview foi testado? (y/N)"
  read -r confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Abortado."
    exit 0
  fi
fi

echo "📦 [1/5] Build Quiz-sacra..."
cd "$QUIZ_DIR"
npm run build

echo "📦 [2/5] Build rotina-de-paz..."
cd "$RDP_DIR"
npm run build

echo "📂 [3/5] Copiar quiz → dist/sacra/..."
rm -rf "$RDP_DIR/dist/sacra"
cp -r "$QUIZ_DIR/dist" "$RDP_DIR/dist/sacra"
# Remover pasta nested sacra/sacra (artefato do base: "/sacra/")
rm -rf "$RDP_DIR/dist/sacra/sacra"
# Criar subrotas físicas (CF Pages não lê _redirects nested)
mkdir -p "$RDP_DIR/dist/sacra/quiz" "$RDP_DIR/dist/sacra/obrigado"
cp "$RDP_DIR/dist/sacra/index.html" "$RDP_DIR/dist/sacra/quiz/index.html"
cp "$RDP_DIR/dist/sacra/index.html" "$RDP_DIR/dist/sacra/obrigado/index.html"

echo "🔀 [4/5] Ajustar _redirects..."
# /sacra/* ANTES do catch-all (ordem importa)
cat > "$RDP_DIR/dist/_redirects" <<'REDIRECTS'
/sacra/*  /sacra/index.html  200
/*  /index.html  200
REDIRECTS

echo "🚀 [5/5] Deploy → branch=$BRANCH..."
cd "$RDP_DIR"
npx wrangler pages deploy dist --project-name="$PROJECT" --branch="$BRANCH" --commit-dirty=true

if [ "$BRANCH" = "main" ]; then
  echo ""
  echo "✅ PRODUÇÃO DEPLOYADA"
  echo "   Verificar: rotinadepaz.com.br/sacra/quiz"
  echo "   Verificar: rotinadepaz.com.br/"
else
  echo ""
  echo "✅ PREVIEW DEPLOYADO"
  echo "   URL: https://$BRANCH.$PROJECT.pages.dev/sacra/quiz"
  echo "   LP:  https://$BRANCH.$PROJECT.pages.dev/"
  echo ""
  echo "   Depois de verificar, promova com:"
  echo "   ./deploy-quiz.sh --prod"
fi
