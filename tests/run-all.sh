#!/usr/bin/env bash
# Gradient Agents — Run all validation scripts
# Usage: bash tests/run-all.sh [chemin-racine] [--strict]
# Exit code = total errors across all validations

set -uo pipefail

ROOT="${1:-.}"
STRICT_FLAG=""
for arg in "$@"; do
  [ "$arg" = "--strict" ] && STRICT_FLAG="--strict"
done
# If first arg is a flag, default ROOT to .
if [[ "${1:-}" == --* ]]; then
  ROOT="."
fi

TOTAL_ERRORS=0
TOTAL_WARNINGS=0
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }

echo "=== Gradient Agents — Validation complete ==="
echo "Racine: $ROOT"
[ -n "$STRICT_FLAG" ] && echo "Mode: STRICT"
echo ""

# --- 1/3 Framework validation ---
echo "--- 1/3 Framework validation ---"
if bash "$SCRIPT_DIR/validate-framework.sh" "$ROOT" $STRICT_FLAG; then
  green "Framework: OK"
else
  EXIT_CODE=$?
  TOTAL_ERRORS=$((TOTAL_ERRORS + EXIT_CODE))
  red "Framework: $EXIT_CODE erreur(s)"
fi

echo ""

# --- 2/3 Context validation ---
echo "--- 2/3 Context validation ---"
if [ -f "$ROOT/project-context.md" ]; then
  if bash "$SCRIPT_DIR/validate-context.sh" "$ROOT/project-context.md"; then
    green "Context: OK"
  else
    EXIT_CODE=$?
    TOTAL_ERRORS=$((TOTAL_ERRORS + EXIT_CODE))
    red "Context: $EXIT_CODE champ(s) critique(s) vide(s)"
  fi
else
  yellow "SKIP: project-context.md non trouve (normal si pas encore rempli)"
fi

echo ""

# --- 3/3 Deliverable validation ---
echo "--- 3/3 Deliverable validation ---"
if [ -d "$ROOT/docs" ]; then
  DELIVERABLE_COUNT=0
  DELIVERABLE_ERRORS=0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    DELIVERABLE_COUNT=$((DELIVERABLE_COUNT + 1))
    if ! bash "$SCRIPT_DIR/validate-deliverable.sh" "$f"; then
      EXIT_CODE=$?
      DELIVERABLE_ERRORS=$((DELIVERABLE_ERRORS + EXIT_CODE))
    fi
    echo ""
  done < <(find "$ROOT/docs" -name "*.md" -not -name ".gitkeep" 2>/dev/null)

  if [ "$DELIVERABLE_COUNT" -eq 0 ]; then
    yellow "SKIP: Aucun livrable trouve dans docs/"
  else
    TOTAL_ERRORS=$((TOTAL_ERRORS + DELIVERABLE_ERRORS))
    if [ "$DELIVERABLE_ERRORS" -eq 0 ]; then
      green "Livrables: $DELIVERABLE_COUNT fichier(s) valide(s)"
    else
      red "Livrables: $DELIVERABLE_ERRORS erreur(s) sur $DELIVERABLE_COUNT fichier(s)"
    fi
  fi
else
  yellow "SKIP: Dossier docs/ non trouve"
fi

echo ""
echo "=== Validation terminee ==="
if [ "$TOTAL_ERRORS" -eq 0 ]; then
  green "Tout est OK. 0 erreurs."
else
  red "$TOTAL_ERRORS erreur(s) totale(s)."
fi

exit "$TOTAL_ERRORS"
