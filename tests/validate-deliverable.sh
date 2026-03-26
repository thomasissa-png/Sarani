#!/usr/bin/env bash
# Gradient Agents — Deliverable Validation
# Vérifie qu'un livrable produit par un agent respecte les standards.
# Usage: bash tests/validate-deliverable.sh <chemin-fichier> [--agent <nom>]

set -euo pipefail

FILE=""
AGENT_NAME=""
ERRORS=0
WARNINGS=0

# Parse arguments
while [ $# -gt 0 ]; do
  case "$1" in
    --agent) AGENT_NAME="$2"; shift 2 ;;
    --agent=*) AGENT_NAME="${1#--agent=}"; shift ;;
    *) [ -z "$FILE" ] && FILE="$1"; shift ;;
  esac
done

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }

err()  { red  "[ERREUR] $1"; ERRORS=$((ERRORS + 1)); }
warn() { yellow "[AVERTISSEMENT] $1"; WARNINGS=$((WARNINGS + 1)); }
ok()   { green "[OK] $1"; }

# Safe grep count — always returns a valid integer
gcount() {
  local result
  result=$(grep -ci "$1" "$2" 2>/dev/null) || true
  echo "${result:-0}"
}

gcount_e() {
  local result
  result=$(grep -c "$1" "$2" 2>/dev/null) || true
  echo "${result:-0}"
}

if [ -z "$FILE" ]; then
  echo "Usage: bash tests/validate-deliverable.sh <chemin-fichier> [--agent <nom>]"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  red "Fichier $FILE introuvable."
  exit 1
fi

BASENAME=$(basename "$FILE")
LINE_COUNT=$(wc -l < "$FILE")

echo "=== Validation du livrable: $BASENAME ==="
echo "Lignes: $LINE_COUNT"
echo ""

# 1. Taille minimale
echo "--- Structure ---"
if [ "$LINE_COUNT" -lt 30 ]; then
  err "Livrable trop court ($LINE_COUNT lignes, minimum 30). Probable timeout ou échec."
elif [ "$LINE_COUNT" -lt 50 ]; then
  warn "Livrable court ($LINE_COUNT lignes). Fichier probablement incomplet."
else
  ok "Taille acceptable ($LINE_COUNT lignes)"
fi

# 2. Handoff présent + sous-éléments
if grep -qi "Handoff" "$FILE"; then
  ok "Bloc Handoff présent"
  # Vérifier les sous-éléments du Handoff
  HANDOFF_SUBS=0
  grep -qi "Fichiers produits" "$FILE" && HANDOFF_SUBS=$((HANDOFF_SUBS + 1))
  grep -qi "Décisions prises" "$FILE" && HANDOFF_SUBS=$((HANDOFF_SUBS + 1))
  grep -qi "Points d'attention" "$FILE" && HANDOFF_SUBS=$((HANDOFF_SUBS + 1))
  grep -qi "Interactions validées" "$FILE" && HANDOFF_SUBS=$((HANDOFF_SUBS + 1))
  if [ "$HANDOFF_SUBS" -ge 2 ]; then
    ok "Handoff structuré ($HANDOFF_SUBS/4 sous-éléments présents)"
  else
    warn "Handoff incomplet ($HANDOFF_SUBS/4 sous-éléments — minimum 2 attendus parmi: Fichiers produits, Décisions prises, Points d'attention, Interactions validées)"
  fi
else
  err "Pas de bloc Handoff en fin de livrable"
fi

# 2b. Vérification --agent : fichier dans le bon dossier
if [ -n "$AGENT_NAME" ]; then
  FILE_DIR=$(dirname "$FILE")
  if echo "$FILE_DIR" | grep -q "docs/$AGENT_NAME"; then
    ok "Fichier dans le bon dossier (docs/$AGENT_NAME/)"
  else
    err "Fichier attendu dans docs/$AGENT_NAME/ mais trouvé dans $FILE_DIR"
  fi
fi

# 3. Placeholders non remplis
PLACEHOLDER_COUNT=0
for pattern in '\[TODO\]' '\[A COMPLETER\]' '\[À COMPLÉTER\]' '\[PLACEHOLDER\]' '\[INSERT\]' '\[XXX\]'; do
  MATCHES=$(gcount "$pattern" "$FILE")
  PLACEHOLDER_COUNT=$((PLACEHOLDER_COUNT + MATCHES))
done
if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
  err "$PLACEHOLDER_COUNT placeholder(s) non rempli(s) détecté(s)"
else
  ok "Pas de placeholders non remplis"
fi

# 4. Hypothèses marquées correctement
HYPO_COUNT=$(gcount_e '\[HYPOTHÈSE' "$FILE")
if [ "$HYPO_COUNT" -gt 0 ]; then
  if grep -qi "Hypothèses à valider" "$FILE"; then
    ok "$HYPO_COUNT hypothèse(s) marquée(s), bloc récapitulatif présent"
  else
    warn "$HYPO_COUNT hypothèse(s) marquée(s) mais pas de bloc 'Hypothèses à valider' en fin de document"
  fi
else
  ok "Pas d'hypothèses (toutes les données sont factuelles)"
fi

# 5. Sections avec contenu (pas juste des titres vides)
SECTION_COUNT=$(gcount_e "^## " "$FILE")
if [ "$SECTION_COUNT" -lt 2 ]; then
  warn "Peu de sections structurées ($SECTION_COUNT). Le livrable manque peut-être de structure."
else
  ok "$SECTION_COUNT sections structurées"
fi

# 6. Références à project-context.md ou au projet
if grep -qi "project-context\|persona\|objectif.*mois\|KPI" "$FILE"; then
  ok "Références au contexte projet détectées (spécificité)"
else
  warn "Pas de référence explicite au contexte projet — livrable potentiellement générique"
fi

# Résumé
echo ""
echo "=== Résumé ==="
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  green "Livrable valide. 0 erreurs, 0 avertissements."
elif [ "$ERRORS" -eq 0 ]; then
  yellow "$WARNINGS avertissement(s), 0 erreur."
else
  red "$ERRORS erreur(s), $WARNINGS avertissement(s)."
fi

exit "$ERRORS"
