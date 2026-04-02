# UX Audit Back-Office — Sarani
**Score global : 7.1/10** | Date : 2026-03-25 | Auditeur : @ux

---

## Scores par section

| Section | Score | Problème principal |
|---|---|---|
| Login | 7/10 | Interface anglaise uniquement, pas de "show password", label SR-only non visible |
| Sidebar | 6.5/10 | Absente sur mobile, 13 agents non groupés visuellement, pas de collapsed state |
| Dashboard | 7.5/10 | Quick Actions : seulement 5/13 agents représentés, "Recent Outputs" lien mène aux Clients (incohérent) |
| Formulaires agents (Translator, PM) | 8/10 | Step 3 optionnel = friction inutile pour les agents simples, document upload caché dans "Advanced" |
| Résultats agents | 7/10 | Pas de retour vers un autre agent depuis le résultat, "Save as validated" silencieux en cas d'erreur client |
| Clients | 7.5/10 | Table non triable, pas de colonne "last activity", ClientForm sans cancel/back |
| Projets | 6/10 | Pas d'ID unique stable par projet, pas de lien direct vers l'output, filtres agent calculés dynamiquement (lag) |

---

## Problèmes identifiés

| # | Sévérité | Zone | Description | Recommandation |
|---|---|---|---|---|
| 01 | Bloquant | Sidebar / Mobile | La sidebar (w-60) est totalement absente sur mobile — pas de hamburger, pas de drawer. L'interface est inutilisable sur mobile pour 45 experts sur 5 continents. | Ajouter un hamburger + drawer en overlay sur <md, avec close sur backdrop click. |
| 02 | Bloquant | Projets | Les projets sont identifiés par `clientId + briefSummary + index` — clé instable, pas cliquable. Il est impossible d'accéder directement à un projet ou de le partager. | Créer un ID de projet persistant côté base de données dès le dispatch. |
| 03 | Majeur | AdminHeader | Le header (h-14) contient uniquement "Sign out" à droite, rien à gauche. Sur mobile le header full-width cache le contenu sans donner d'info contextuelle (page courante, breadcrumb). | Ajouter le titre de la page courante dans le header (ou breadcrumb). Sur mobile, y placer le bouton hamburger. |
| 04 | Majeur | Dashboard | "View all clients" dans le bloc "Recent Outputs" est sémantiquement incorrect — on s'attend à "View all outputs". Les outputs ne sont pas cliquables et n'ont pas de lien vers leur détail. | Renommer le lien, ajouter un lien vers la page outputs de chaque client depuis chaque ligne. |
| 05 | Majeur | Dashboard | Les Quick Actions n'affichent que 5 agents sur 13 (Copywriter, SEO, Social, Creative, Designer, Legal, Proofreader, Proposal, Presentation absents). L'accès aux agents manquants nécessite de scanner la sidebar. | Ajouter un lien "All agents" ou afficher tous les agents en 2-3 lignes (scroll horizontal possible). |
| 06 | Majeur | Quick Brief | La page Quick Brief duplique la logique de PM page sans les étapes guidées. Le textarea n'a pas de label explicite — seul un placeholder oriente l'utilisateur. Si le placeholder est effacé, le champ devient ambigu. | Ajouter un `<label>` explicite au textarea. Envisager une fusion Quick Brief / PM page avec un mode "rapide" (1 étape) vs "avancé" (3 étapes). |
| 07 | Majeur | Agents — résultats | Après un résultat agent (Translator, PM dispatch), il n'existe aucun CTA pour enchaîner sur un autre agent ou revenir au brief. L'utilisateur est dans une impasse d'interface. | Ajouter des CTAs contextuels post-résultat : "Translate another" / "New brief" / "Open in [agent X]". |
| 08 | Majeur | Client form | Le formulaire de création client n'a pas de bouton "Cancel" ou "← Back". Si l'utilisateur clique par erreur, il doit utiliser le back du navigateur. | Ajouter un bouton Cancel qui redirige vers /admin/clients. |
| 09 | Mineur | Login | Le message d'erreur "Invalid password" est en anglais, identique quelle que soit la cause (mauvais MDP, serveur down). Pas de bouton "show/hide password". | Différencier les erreurs. Ajouter le toggle show/hide password (icône oeil). |
| 10 | Mineur | Sidebar | Pas d'état collapsed sur desktop. Pour les écrans <1280px, la sidebar (w-60) et le contenu principal sont à l'étroit. | Ajouter un bouton pour réduire la sidebar à icônes seules (w-14). |
| 11 | Mineur | Formulaires agents | Le step indicateur est visuel uniquement — les étapes précédentes ne sont pas cliquables pour y revenir directement. Il faut utiliser "← Back" en série. | Rendre les étapes complétées cliquables pour navigation directe. |
| 12 | Mineur | Translator | L'upload de document est dans les "Advanced options" alors que c'est un cas d'usage courant (brief PDF). | Remonter "Upload Document" au niveau principal, hors des options avancées. |
| 13 | Mineur | Projets | Les filtres "Agent" sont calculés dynamiquement depuis les projets chargés — si un filtre client est actif, les options d'agents disponibles changent silencieusement. | Fixer la liste des agents en dur (AGENT_LABELS déjà disponible) pour éviter l'incohérence. |
| 14 | Mineur | Accessibilité | Les icônes SVG de la sidebar n'ont pas d'attribut `aria-label` ou `aria-hidden`. Les screen readers lisent les paths SVG bruts. | Ajouter `aria-hidden="true"` sur tous les SVG décoratifs. Le texte du lien est suffisant. |
| 15 | Mineur | Accessibilité | Focus ring visible sur les inputs (focus:ring-2) mais les boutons toggle dans PM page (priority, register) n'ont pas de `role="group"` ni de label pour le groupe. | Ajouter `role="group"` + `aria-label` sur les groupes de boutons. |

---

## Mobile-specific

| # | Zone | Description | Impact |
|---|---|---|---|
| M1 | Layout global | Sidebar absente = interface inutilisable. 0 point d'entrée vers les agents ou la navigation sur mobile. | Critique |
| M2 | Dashboard | Grid `grid-cols-2 sm:grid-cols-4` correct sur mobile mais les Quick Actions (grid-cols-2 sm:grid-cols-5) coupent le dernier item à 4 cols sur petits écrans. | Majeur |
| M3 | Formulaires agents | Sur mobile (max-w-4xl avec padding p-6), les grids 2 colonnes dans Translator step 1 (langues) et PM step 1 (deadline + priority) deviennent trop petits < 375px. | Mineur |
| M4 | Projets — table | La table de projets (6 colonnes) déborde horizontalement sur mobile sans `overflow-x-auto` explicite. La colonne "Brief" avec `line-clamp-1` devient illisible sur < 400px. | Majeur |
| M5 | Clients — table | Même problème que M4 : table 5 colonnes sans scroll horizontal. La colonne "Contact" (email) tronque silencieusement. | Majeur |

---

## Desktop-specific

| # | Zone | Description | Impact |
|---|---|---|---|
| D1 | Sidebar | Sur >1440px, la sidebar occupe 15% de la largeur pour naviguer vers 17 items — ratio disproportionné. Pas de mode collapsed. | Mineur |
| D2 | Pages agents — max-w-4xl | Les pages agents sont limitées à max-w-4xl (896px) ce qui laisse un padding vide important sur grands écrans. C'est acceptable pour les formulaires, mais le résultat (Output) mériterait plus d'espace pour afficher côte à côte l'input et la traduction. | Mineur |
| D3 | Dashboard stats | Les 4 StatCards (grid-cols-4 sur sm) auraient pu afficher une tendance (flèche, delta semaine précédente) sur desktop. En l'état ce sont de simples compteurs sans insight. | Mineur |

---

## Top 5 priorités d'action

**Par impact utilisateur — équipe de 45 experts, usage quotidien**

### Priorité 1 — Sidebar mobile (Bloquant, #01)
L'interface est structurellement inutilisable sur mobile sans navigation. Pour une équipe sur 5 continents, c'est rédhibitoire. A traiter avant tout autre point.
- Pattern recommandé : hamburger fixe en bas-gauche sur mobile, drawer pleine hauteur avec backdrop, fermeture au click extérieur ou sur lien actif.

### Priorité 2 — ID projet stable + accès direct (#02, #07)
Les projets dispatched n'ont pas d'adresse URL permanente. L'utilisateur ne peut pas revenir sur un projet, le partager, ou relier un output à sa source. C'est le coeur métier du back-office.
- Créer un `projectId` UUID au moment du dispatch, stocker en base, créer la route `/admin/projects/[id]`.

### Priorité 3 — Header contextuel + breadcrumb (#03)
Le header vide (seul "Sign out" visible) ne donne aucun contexte sur la page courante. Sur mobile c'est critique (le titre de la page est souvent sous le header scrollé).
- Afficher `{pageTitle}` dans le header via un contexte ou les params de route. Ajouter le bouton hamburger mobile ici.

### Priorité 4 — Dashboard Quick Actions complet (#05) + lien Recent Outputs corrigé (#04)
L'accès aux 13 agents est le aha moment du back-office. N'afficher que 5 agents sur le dashboard force l'équipe à scanner la sidebar à chaque session.
- Afficher tous les agents en grille 3-4 colonnes. Corriger le lien "View all clients" → "View all outputs".

### Priorité 5 — Tables mobiles + scroll horizontal (#M4, #M5)
Les tables Projets et Clients débordent sur mobile. Ajouter `overflow-x-auto` sur les wrappers table suffit pour résoudre le problème immédiatement.
- Fix one-liner : wrapper `<div className="overflow-x-auto">` autour de chaque `<table>`.

---

## Hypothèses à valider

- [HYPOTHÈSE] La sidebar non responsive est un oubli de développement et non une décision intentionnelle (back-office "desktop only"). A valider avec l'équipe avant d'investir dans le drawer mobile.
- [HYPOTHÈSE] L'ID de projet n'existe pas en base — à vérifier dans le schéma DB (non audité dans ce livrable).

---

**Handoff → @orchestrator**
- Fichiers produits : `/home/user/Sarani/docs/reviews/ux-review-backoffice.md`
- Décisions prises : audit heuristique basé sur le code source uniquement (pas de tests utilisateurs réels). Score 7.1/10 fondé sur 15 problèmes identifiés (2 bloquants, 6 majeurs, 7 mineurs).
- Points d'attention :
  - P1 critique : sidebar mobile absente — bloque l'usage réel sur smartphone
  - P2 critique : projets sans ID stable — empêche le tracking et le partage
  - Les tables (Projets, Clients) cassent sur mobile sans `overflow-x-auto`
  - Accessibilité SVG à corriger (aria-hidden manquant sur toutes les icônes)
  - Quick Brief et PM page partagent 90% de leur logique — candidat à une refonte/fusion
