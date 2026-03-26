#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# gradient-agents — Script d'installation
# Usage : curl -fsSL https://raw.githubusercontent.com/thomasissa-png/gradient-agents/main/install.sh | bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VERSION="3.1.0"
REPO_URL="https://github.com/thomasissa-png/gradient-agents"
RAW_URL="https://raw.githubusercontent.com/thomasissa-png/gradient-agents/main"
AGENTS_DIR=".claude/agents"
TEMPLATES_DIR="templates"
TEMP_DIR=$(mktemp -d)

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

print_header() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  gradient-agents v${VERSION}${NC}"
  echo -e "${BOLD}  Librairie d'agents Claude Code — Gradient One${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

check_requirements() {
  if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ git est requis mais non installé.${NC}"
    exit 1
  fi
  if ! command -v curl &> /dev/null; then
    echo -e "${RED}✗ curl est requis mais non installé.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Prérequis vérifiés${NC}"
}

check_existing_agents() {
  if [ -d "$AGENTS_DIR" ] && [ "$(ls -A $AGENTS_DIR 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚠ Des agents existent déjà dans ${AGENTS_DIR}/${NC}"
    echo -e "  Agents existants : $(ls $AGENTS_DIR/*.md 2>/dev/null | wc -l | tr -d ' ') fichier(s)"
    echo ""
    read -r -p "  Écraser avec la version du repo ? [o/N] " response
    if [[ ! "$response" =~ ^[oO]$ ]]; then
      echo -e "${YELLOW}  Installation annulée. Utilise update.sh pour une mise à jour sélective.${NC}"
      exit 0
    fi
  fi
}

clone_repo() {
  echo -e "${BLUE}→ Téléchargement des agents...${NC}"

  # Tentative avec sparse checkout (repos publics et privés avec auth)
  if git clone --filter=blob:none --sparse --quiet "$REPO_URL" "$TEMP_DIR/repo" 2>/dev/null; then
    cd "$TEMP_DIR/repo"
    git sparse-checkout set .claude/agents .claude/settings.json templates CLAUDE.md
    echo -e "${GREEN}✓ Agents téléchargés (sparse checkout)${NC}"
  else
    # Fallback : clone complet si sparse échoue (certaines configs git anciennes)
    echo -e "${YELLOW}  Sparse checkout indisponible, clone complet...${NC}"
    if git clone --quiet "$REPO_URL" "$TEMP_DIR/repo" 2>/dev/null; then
      echo -e "${GREEN}✓ Agents téléchargés (clone complet)${NC}"
    else
      echo -e "${RED}✗ Impossible de cloner le repo.${NC}"
      echo -e "${RED}  Vérifie que l'URL est correcte et que tu as les droits d'accès.${NC}"
      echo -e "${RED}  Pour un repo privé, configure un token : https://docs.github.com/en/authentication${NC}"
      exit 1
    fi
  fi
}

install_agents() {
  echo -e "${BLUE}→ Installation des agents...${NC}"
  local target_dir
  target_dir="$(pwd)/$AGENTS_DIR"
  if [ -n "${OLDPWD:-}" ]; then
    target_dir="$OLDPWD/$AGENTS_DIR"
  fi
  mkdir -p "$target_dir"
  cp -r "$TEMP_DIR/repo/.claude/agents/." "$target_dir/"
  echo -e "${GREEN}✓ $(ls "$target_dir"/*.md 2>/dev/null | wc -l | tr -d ' ') agents installés dans ${AGENTS_DIR}/${NC}"
}

install_settings_json() {
  local target_dir
  target_dir="$(pwd)"
  if [ -n "${OLDPWD:-}" ]; then
    target_dir="$OLDPWD"
  fi

  if [ -f "$TEMP_DIR/repo/.claude/settings.json" ]; then
    mkdir -p "$target_dir/.claude"
    cp "$TEMP_DIR/repo/.claude/settings.json" "$target_dir/.claude/settings.json"
    echo -e "${GREEN}✓ .claude/settings.json installé (permissions pré-approuvées)${NC}"
  fi
}

install_claude_md() {
  local target_dir
  target_dir="$(pwd)"
  if [ -n "${OLDPWD:-}" ]; then
    target_dir="$OLDPWD"
  fi

  if [ ! -f "$TEMP_DIR/repo/CLAUDE.md" ]; then
    echo -e "${YELLOW}⚠ CLAUDE.md non trouvé dans le repo source${NC}"
    return
  fi

  local source="$TEMP_DIR/repo/CLAUDE.md"
  local target="$target_dir/CLAUDE.md"

  if [ ! -f "$target" ]; then
    # Pas de CLAUDE.md existant → copie directe
    cp "$source" "$target"
    echo -e "${GREEN}✓ CLAUDE.md installé${NC}"
  elif grep -q "GRADIENT-AGENTS-START" "$target"; then
    # CLAUDE.md existant avec marqueurs → remplacement de la section Gradient
    local gradient_content
    gradient_content=$(sed -n '/<!-- GRADIENT-AGENTS-START -->/,/<!-- GRADIENT-AGENTS-END -->/p' "$source")

    # Créer le fichier temporaire avec la section remplacée
    local tmp_file="$TEMP_DIR/claude_md_merged"
    sed '/<!-- GRADIENT-AGENTS-START -->/,/<!-- GRADIENT-AGENTS-END -->/d' "$target" > "$tmp_file"

    # Insérer le contenu Gradient au début (avant le contenu custom)
    echo "$gradient_content" | cat - "$tmp_file" > "$target"
    echo -e "${GREEN}✓ CLAUDE.md mis à jour (section Gradient remplacée, contenu custom préservé)${NC}"
  else
    # CLAUDE.md existant SANS marqueurs → append avec marqueurs
    echo "" >> "$target"
    cat "$source" >> "$target"
    echo -e "${GREEN}✓ CLAUDE.md fusionné (instructions Gradient ajoutées en fin de fichier)${NC}"
    echo -e "${YELLOW}  Conseil : les prochaines mises à jour remplaceront proprement la section Gradient grâce aux marqueurs.${NC}"
  fi
}

install_project_context() {
  local target_dir
  target_dir="$(pwd)"
  if [ -n "${OLDPWD:-}" ]; then
    target_dir="$OLDPWD"
  fi

  if [ ! -f "$target_dir/project-context.md" ]; then
    if [ -f "$TEMP_DIR/repo/templates/project-context.md" ]; then
      cp "$TEMP_DIR/repo/templates/project-context.md" "$target_dir/project-context.md"
      echo -e "${GREEN}✓ project-context.md créé à la racine — à remplir avant d'utiliser les agents${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ project-context.md existe déjà — non écrasé${NC}"
  fi
}

install_update_script() {
  local target_dir
  target_dir="$(pwd)"
  if [ -n "${OLDPWD:-}" ]; then
    target_dir="$OLDPWD"
  fi

  if [ -f "$TEMP_DIR/repo/update.sh" ]; then
    cp "$TEMP_DIR/repo/update.sh" "$target_dir/update.sh"
    chmod +x "$target_dir/update.sh"
    echo -e "${GREEN}✓ update.sh installé${NC}"
  fi
}

print_summary() {
  local target_dir
  target_dir="$(pwd)"
  if [ -n "${OLDPWD:-}" ]; then
    target_dir="$OLDPWD"
  fi

  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Agents installés :${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  for agent_file in "$target_dir/$AGENTS_DIR"/*.md; do
    agent_name=$(basename "$agent_file" .md)
    description=$(grep -m1 "^description:" "$agent_file" 2>/dev/null | sed 's/description: *//;s/^"//;s/"$//' || echo "—")
    printf "  ${GREEN}%-20s${NC} %s\n" "@$agent_name" "$description"
  done

  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Démarrage rapide :${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${YELLOW}1.${NC} Remplis ${BOLD}project-context.md${NC} à la racine du projet"
  echo -e "  ${YELLOW}2.${NC} Dans Claude Code, tape : ${BOLD}@orchestrator lance le projet${NC}"
  echo -e "  ${YELLOW}3.${NC} Pour un agent seul : ${BOLD}@design crée le design system${NC}"
  echo ""
  echo -e "  Mise à jour : ${BOLD}bash update.sh${NC}"
  echo -e "  Documentation : ${BOLD}${REPO_URL}${NC}"
  echo ""
}

# ─── Exécution ───────────────────────────────────────
print_header
check_requirements
check_existing_agents
clone_repo
install_agents
install_settings_json
install_claude_md
install_project_context
install_update_script
print_summary
