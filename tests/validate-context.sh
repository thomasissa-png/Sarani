#!/usr/bin/env bash
# Gradient Agents — Project Context Validation
# Vérifie qu'un project-context.md est correctement rempli.
# Usage: bash tests/validate-context.sh [chemin-vers-project-context.md]

set -euo pipefail

CONTEXT="${1:-./project-context.md}"
ERRORS=0
WARNINGS=0

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }

err()  { red  "[VIDE] $1"; ERRORS=$((ERRORS + 1)); }
warn() { yellow "[PARTIEL] $1"; WARNINGS=$((WARNINGS + 1)); }
ok()   { green "[OK] $1"; }

if [ ! -f "$CONTEXT" ]; then
  red "Fichier $CONTEXT introuvable."
  exit 1
fi

echo "=== Validation de $CONTEXT ==="
echo ""

# Champs critiques (bloquants pour la plupart des agents)
CRITICAL_FIELDS=(
  "Nom du projet"
  "Secteur"
  "Persona principal"
  "Problème principal"
  "Promesse unique"
  "Objectif principal à 6 mois"
  "KPI North Star"
)

# Champs importants (non bloquants mais recommandés)
IMPORTANT_FIELDS=(
  "Stade"
  "Ton de marque"
  "Concurrent principal"
  "Frontend"
  "Hébergement"
  "Modèle économique"
  "Pays de commercialisation"
  "Données sensibles collectées"
  "Budget mensuel infrastructure"
  "Timeline de lancement"
  "Ressources disponibles"
)

echo "--- Champs critiques (bloquants) ---"
# Detect format: template (- **Field** : value) or table (| Field | value |)
IS_TABLE=false
grep -q "^|.*|.*|" "$CONTEXT" 2>/dev/null && IS_TABLE=true

extract_value() {
  local field="$1"
  local line
  # Try bold format first: **Field** : value
  line=$(grep -i "\\*\\*$field\\*\\*" "$CONTEXT" 2>/dev/null | head -1 || true)
  if [ -n "$line" ]; then
    echo "$line" | sed "s/.*\\*\\*[^*]*\\*\\* *: *//" | sed 's/^ *//' | sed 's/ *$//'
    return
  fi
  # Try table format: | Field | value |
  line=$(grep -i "| *$field *|" "$CONTEXT" 2>/dev/null | head -1 || true)
  if [ -n "$line" ]; then
    echo "$line" | sed "s/.*| *$field *| *//" | sed 's/ *|.*//' | sed 's/^ *//' | sed 's/ *$//' | tr -d '*'
    return
  fi
  # Not found
  echo ""
}

field_exists() {
  local field="$1"
  grep -qi "\\*\\*$field\\*\\*\| *$field *|" "$CONTEXT" 2>/dev/null
}

for field in "${CRITICAL_FIELDS[@]}"; do
  if ! field_exists "$field"; then
    err "$field : champ absent du fichier"
    continue
  fi
  VALUE=$(extract_value "$field")
  if [ -z "$VALUE" ] || echo "$VALUE" | grep -qP '^\[.*\]$'; then
    err "$field : non rempli"
  else
    ok "$field"
  fi
done

echo ""
echo "--- Champs importants (recommandés) ---"
for field in "${IMPORTANT_FIELDS[@]}"; do
  if ! field_exists "$field"; then
    warn "$field : champ absent"
    continue
  fi
  VALUE=$(extract_value "$field")
  if [ -z "$VALUE" ] || echo "$VALUE" | grep -qP '^\[.*\]$'; then
    warn "$field : non rempli"
  else
    ok "$field"
  fi
done

# Vérifier la date de mise à jour
echo ""
echo "--- Métadonnées ---"
if grep -q "Dernière mise à jour" "$CONTEXT"; then
  DATE_VAL=$(grep "Dernière mise à jour" "$CONTEXT" | sed 's/.*: *//')
  if echo "$DATE_VAL" | grep -q '\[DATE\]'; then
    warn "Date de mise à jour non renseignée"
  else
    ok "Date de mise à jour : $DATE_VAL"
  fi
fi

# Validation conditionnelle : stade Production ou Croissance
echo ""
echo "--- Validation conditionnelle (stade avancé) ---"
if grep -qP '\[x\]\s*(Production|Croissance)' "$CONTEXT" 2>/dev/null; then
  # URL du site actuel
  URL_LINE=$(grep -i "URL du site actuel" "$CONTEXT" 2>/dev/null | head -1 || true)
  URL_VAL=$(echo "$URL_LINE" | sed 's/.*: *//' | sed 's/^ *//' | sed 's/ *$//')
  if [ -z "$URL_VAL" ] || echo "$URL_VAL" | grep -qP '^\[.*\]$'; then
    warn "Stade Production/Croissance mais 'URL du site actuel' non renseigné"
  else
    ok "URL du site actuel renseignée"
  fi

  # Outils analytics en place
  ANALYTICS_LINE=$(grep -i "Outils analytics en place" "$CONTEXT" 2>/dev/null | head -1 || true)
  ANALYTICS_VAL=$(echo "$ANALYTICS_LINE" | sed 's/.*: *//' | sed 's/^ *//' | sed 's/ *$//')
  if [ -z "$ANALYTICS_VAL" ] || echo "$ANALYTICS_VAL" | grep -qP '^\[.*\]$'; then
    warn "Stade Production/Croissance mais 'Outils analytics en place' non renseigné"
  else
    ok "Outils analytics renseignés"
  fi
else
  ok "Stade pré-production — pas de vérification URL/analytics requise"
fi

# Résumé
echo ""
echo "=== Résumé ==="
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  green "Context complet. Tous les champs sont remplis."
elif [ "$ERRORS" -eq 0 ]; then
  yellow "$WARNINGS champ(s) recommandé(s) manquant(s), mais les champs critiques sont OK."
else
  red "$ERRORS champ(s) critique(s) vide(s). Les agents refuseront de travailler."
  echo "Remplis les champs critiques avant d'invoquer un agent."
fi

exit "$ERRORS"
