# UX Audit — Sarani.studio
**Agent** : @ux | **Date** : 2026-03-24 | **Scope** : Homepage, Work, Pricing, Contact, Header/Nav

---

## Note globale : 7.2 / 10

Site vitrine agence créative B2B enterprise avec une direction claire et un positionnement fort. La structure narrative homepage est solide. Les principales frictions concernent la conversion B2B enterprise (Sophie, 38 ans, Head of Marketing sous pression), l'absence de page About dans la nav et quelques lacunes dans le parcours de qualification avant contact.

---

## 1. Architecture de l'information — 7 / 10

**Points forts**
- Hiérarchie homepage logique : Hero → Valeur → Services → Preuves (métriques) → Références clients → CTA. Parcours narratif cohérent.
- Pages principales accessibles directement depuis la nav : Work, Pricing, About. Peu de clics pour accéder aux informations clés.

**Points faibles**
- "About" est dans la nav mais absent de la homepage — aucun lien vers l'équipe/l'histoire entre le hero et le footer. Sophie a besoin de savoir à qui elle confie ses campagnes.
- Absence de page Services dédiée : les services sont listés sur la homepage uniquement (AnimatedServicesList), sans profondeur. Pas de page dédiée par type de service pour le SEO et la qualification.

**Recommandations**
- Ajouter un bloc "About the team" ou "35 experts, 5 continents" entre les métriques et les témoignages sur la homepage, avec lien vers /about.
- Créer des pages services individuelles ou un /services avec ancres par domaine (design, video, presentations), linkées depuis la homepage.

---

## 2. Parcours de conversion — 6.5 / 10

**Points forts**
- Double CTA sur la homepage (mid-page "Are you ready?" + footer CTA AnimatedFooterCta) avec tracking Umami intégré (trackingLocation/trackingLabel). Bonne visibilité des points de sortie vers /contact.
- La page /pricing se termine par un CTA fort avec la garantie satisfaction répétée — friction de risque réduite au bon moment du parcours.

**Points faibles**
- Le parcours Sophie → hero → contact comporte trop peu de "qualification" : elle arrive sur /contact sans avoir encore vu de preuves concrètes (case studies, témoignages nommés). Le CTA "Let's chat" du header est présent dès la page 1 sans avoir construit suffisamment de confiance.
- Aucun CTA contextuel sur la page /work : les case studies affichent des projets mais aucun bouton "Start a similar project" par card. Le visiteur doit retourner manuellement vers /contact.

**Recommandations**
- Sur /work, ajouter un CTA contextuel par case study card : "Need this type of work? Let's talk →" avec tracking `work_card_cta`.
- Reordonner le parcours homepage pour que le CTA mid-page arrive après les métriques ET les témoignages, pas avant.

---

## 3. Proposition de valeur — 8 / 10

**Points forts**
- La page /pricing est exceptionnellement claire pour une agence B2B : tarifs fixes affichés, comparaison vs network agency, garantie satisfaction. Réduit directement les 3 frustrations du persona (coût, opacité, rigidité).
- La guarantee strip "Not satisfied with your first project? No invoice" est positionnée au bon endroit (juste après le titre pricing) et répétée en footer de page.

**Points faibles**
- Le hero homepage repose sur un texte générique ("We envision a world where every dream...") qui ne parle pas directement à Sophie. Elle ne se reconnaît pas dans ce vocabulaire — elle veut entendre "bannières en 24h, prix fixes, zéro engagement".
- Les métriques (Section 4 "Our metrics") sont le point fort du site mais elles arrivent en 4ème position sur la homepage, après deux sections trop abstraites. Les chiffres concrets (D+1, illimited revisions, etc.) devraient être visible dès le hero ou en Section 2.

**Recommandations**
- Reformuler le sous-titre hero pour adresser directement le persona : "24-hour delivery. Fixed prices. Unlimited revisions. For the brands that can't wait."
- Remonter les métriques en Section 2, ou intégrer les 3 KPIs clés (D+1, illimited revisions, -60% cost) directement sous le CTA principal du hero.

---

## 4. Navigation — 7.5 / 10

**Points forts**
- Header sticky avec backdrop blur au scroll, bonne lisibilité. L'état actif (text-brand-flame) sur le lien courant est implémenté.
- Menu mobile plein écran avec animation slide-down, aria-expanded et aria-controls correctement renseignés. Fermeture du scroll body pendant l'overlay — bonne pratique.

**Points faibles**
- La nav desktop ne contient que 3 liens (Work, Pricing, About) + CTA. Contact n'est accessible que via le bouton "Let's chat" — ce n'est pas une page nommée dans la nav, ce qui peut dérouter les utilisateurs cherchant "Contact" ou "Start a project" explicitement.
- Sur mobile, le menu n'inclut pas de lien /contact distinct — le seul accès est via le bouton "Let's chat" en bas du menu overlay. Un label "Contact" ou "Start a project" dans les nav links renforcerait la clarté.

**Recommandations**
- Ajouter "Contact" ou "Start a project" comme lien textuel dans la nav mobile (en plus du bouton CTA), pour la scannabilité.
- Envisager un 4ème lien nav desktop "Services" si une page dédiée est créée, pour mieux structurer l'IA.

---

## 5. Formulaires et CTAs — 7 / 10

**Points forts**
- La page /contact est épurée et focalisée : titre direct "Start a project.", promesse de réponse dans l'heure, fallback email. Zéro distraction.
- L'alternative email `team@sarani.studio` en bas du formulaire est un bon filet de sécurité pour les utilisateurs qui préfèrent l'email direct.

**Points faibles**
- Le composant ContactForm n'est pas visible dans ce fichier — impossible d'auditer les champs, validation, états d'erreur et microcopy depuis page.tsx. Point de risque : un formulaire trop long ou avec trop de champs obligatoires peut faire chuter le taux de complétion sur une cible B2B pressée.
- Les CTAs homepage ont des labels différents ("Yes, let's talk!" mid-page, "Let's chat" header) — manque de cohérence dans le message d'action. Sophie doit sentir la même urgence et la même facilité partout.

**Recommandations**
- Auditer ContactForm séparément : max 4-5 champs (nom, email, entreprise, brief en 2 lignes, budget optionnel). Validation inline, états d'erreur explicites, confirmation visible post-envoi.
- Unifier le CTA label sur toute la homepage et la nav : choisir entre "Let's chat" et "Start a project" et s'y tenir. Recommandation : "Start a project" pour la nav et les CTAs contextuels, "Let's talk" uniquement pour le mid-page plus conversationnel.

---

## 6. Mobile UX — 7.5 / 10

**Points forts**
- min-h-dvh sur le hero (dynamic viewport height) — bonne pratique mobile pour éviter les problèmes de barre d'adresse navigateur.
- Menu mobile plein écran avec lock du body scroll : empêche le double scroll, pattern correct sur mobile.

**Points faibles**
- La grille pricing (`lg:grid-cols-3` puis `lg:max-w-[calc(66.666%+0.75rem)]`) est complexe. Sur tablette (768-1024px), le rendu peut être sous-optimal — les 2 dernières cards se retrouvent seules dans une rangée centrée avec un calcul de max-width qui dépend d'une valeur magique.
- Aucune information visible sur la gestion du ProjectSlider auto-scrolling sur mobile : absence de pause-on-touch, pas d'indication visuelle que le carrousel est scrollable, risque d'accessibilité pour les utilisateurs avec prefers-reduced-motion.

**Recommandations**
- Vérifier que ProjectSlider respecte `prefers-reduced-motion` et s'arrête au touch sur mobile. Ajouter des indicateurs de position (dots ou compteur).
- Simplifier la grille pricing sur tablette : passer à 2 colonnes uniformes pour toutes les cards entre 768 et 1024px.

---

## 7. Confiance et preuve sociale — 7 / 10

**Points forts**
- Page /work avec case studies TikTok, Sony, GEODIS, Adidas, L'Oréal — marques enterprise immédiatement reconnaissables par Sophie. Le positionnement "Real briefs. Real deadlines. Real results." est efficace.
- ClientLogos strip en homepage après les témoignages — double validation (testimonials + logos) dans la même section. Bon schéma de preuve.

**Points faibles**
- Les témoignages (section 7 homepage) sont sous un titre "With happiness comes trust" — formule trop douce pour une cible B2B enterprise. Sophie ne cherche pas le "bonheur", elle cherche la fiabilité et le résultat.
- Aucune métrique de résultat visible sur les case study cards depuis /work (résumé du livrable, délai tenu, économies réalisées). L'impact business n'est pas quantifié à la liste — Sophie doit cliquer dans chaque card pour évaluer la pertinence.

**Recommandations**
- Renommer la section témoignages : "What enterprise teams say" ou "Trusted by global brands" pour un registre plus B2B.
- Sur les case study cards (/work), afficher 1-2 métriques clés en badge ou sous-titre : "300 videos/week", "Delivered in 24h", "5,700 slides in 3 weeks". Visibles sans clic.

---

## 8. Accessibilité — 7 / 10

**Points forts**
- `aria-label` sur toutes les sections homepage et nav principale. `aria-expanded`, `aria-controls`, `aria-label` sur le bouton hamburger mobile — implémentation ARIA correcte.
- `aria-hidden="true"` sur les SVG décoratifs dans le header — bonne pratique screen reader.

**Points faibles**
- Le header transparent sur fond blanc (état non-scrollé) peut créer des problèmes de contraste sur le logo et les liens nav si le fond hero est clair — à vérifier contre WCAG 2.2 AA (ratio 4.5:1 texte normal, 3:1 texte large).
- `aria-hidden={!mobileOpen}` sur le mobile overlay est une valeur dynamique correcte en intention mais insuffisante seule : le focus doit être piégé dans le menu mobile quand il est ouvert (focus trap). Sans focus trap, les utilisateurs clavier peuvent sortir du menu sans le fermer.

**Recommandations**
- Implémenter un focus trap dans le menu mobile overlay : le Tab doit cycler entre le bouton close et les liens de navigation uniquement quand le menu est ouvert. Utiliser `focus-trap-react` ou une implémentation native.
- Auditer les contrastes du header transparent sur les différents fonds de page (hero blanc, sections sombres) avec un outil comme axe DevTools ou Contrast Checker.

---

## Verdict final

**Note globale : 7.2 / 10**

Le site Sarani est au-dessus de la moyenne des sites d'agences créatives : proposition de valeur claire, pricing transparent et courageux, case studies enterprise crédibles. La structure de preuve est solide.

Les 3 chantiers prioritaires pour augmenter la conversion sur le persona Sophie :

1. **Hero homepage** : reformuler le sous-titre pour parler directement aux frustrations du persona (vitesse, prix, révisions) et remonter les métriques clés dès le premier écran.
2. **Parcours /work vers /contact** : ajouter des CTAs contextuels sur les case study cards pour capter l'intention d'achat au moment de la preuve.
3. **Accessibilité focus trap** : bloquer la navigation clavier dans le menu mobile — risque WCAG AA actuellement.

Le site peut passer à 8.5+/10 avec ces corrections, sans refonte — ce sont des optimisations ciblées sur des points de friction documentés.

---

## Hypothèses à valider

- [HYPOTHÈSE : le composant ContactForm n'a pas été audité — les champs, validations et états d'erreur sont inconnus. Un audit séparé est requis.]
- [HYPOTHÈSE : le contenu des AnimatedMetrics, AnimatedServicesList et AnimatedHeroContent n'a pas été lu — le texte exact du hero et des métriques peut différer des recommandations ci-dessus.]

---

**Handoff → @orchestrator**
- Fichiers produits : `/home/user/Sarani/docs/reviews/ux-audit.md`
- Décisions prises : audit des 8 critères UX sur homepage, nav, pricing, work, contact. Priorisation des 3 chantiers conversion.
- Points d'attention : (1) ContactForm non audité — à examiner séparément par @ux ou @fullstack. (2) Focus trap menu mobile manquant — risque WCAG AA à corriger en priorité par @fullstack. (3) Le hero homepage sous-performe sur le persona Sophie — reformulation à confier à @copywriter.
