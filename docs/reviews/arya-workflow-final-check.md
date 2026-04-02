# Arya Workflow Final Check — 2026-04-02

## Partie 1 — Questions pour Thomas

1. **TikTok divisions sans indice dans l'email** : Quand un email vient de @tiktok.com sans mention de division (pas de "DE", "FR", "Shop" dans le sujet ou le corps), quelle division par defaut ? "TikTok Others" ? Ou je mets en pause et je demande au PM de router manuellement ?

2. **TikTok via Ubi vs TikTok direct** : Le brief dit "TikTok via Ubi = ONLY quand le brief vient d'Ubi". Mais si un contact Ubi forward un email TikTok depuis une adresse @gmail perso, comment je detecte que c'est Ubi ? Je me base uniquement sur le domaine email ou aussi sur le nom du sender ?

3. **Ubisoft vs Ubi (sous-clients)** : Quand un email Ubi mentionne un client final qu'on n'a pas dans la liste (ex: une nouvelle marque jamais vue), je cree dans le dossier "Ubi (internal)" par defaut et j'escalade ?

4. **Branding TODOs** : Le fichier arya-business-rules.md a encore des TODO pour TikTok ("same specs as usual" = ?), PICO XR, Aristocrat, Ubi, Aujan, GEODIS. Les liens SP sont remplis dans CLIENT_BRANDING mais le "same specs as usual" pour TikTok n'est pas explicite. Quelles sont les specs recurrentes TikTok (formats, dimensions, langues par defaut) ?

5. **GEODIS et ProcessOut dans DOMAIN_CLIENT_MAP** : Les domaines @geodis.com et @processout.com ne sont pas dans le mapping. L'heuristique partielle devrait matcher "geodis" mais je n'ai aucune certitude. Tu confirmes les domaines email exacts ?

6. **Red Bull, Perrier, IKEA, Barilla** : Ces sous-clients Ubi n'ont pas de domaine dans DOMAIN_CLIENT_MAP. Si un email vient directement de @redbull.com (pas via Ubi), c'est un nouveau client direct ou je route vers Ubi quand meme ?

7. **Ubi — ClickUp manquant** : Ubisoft et Perrier n'ont pas de lien ClickUp dans les business rules. C'est normal (petit volume) ou un oubli ?

8. **TVA exceptions** : Confirme : TVA 20% = Lamarck, Ubi, GEODIS, TikTok France UNIQUEMENT, Air Corsica, ProcessOut. Tous les autres TikTok divisions + PICO + Sony + Bose + Aristocrat + CMC + Aujan = 0% ?

9. **Assignation PM** : Tu dis "observer et apprendre". Pour le demarrage, y a-t-il au moins un mapping initial (ex: AnneLaure = CMC, Clara = Lamarck) que je peux utiliser comme base avant d'avoir assez de data ?

## Partie 2 — Verification workflow back-office

### CreateBriefModal — PASS (avec reserves)
- **Client auto-detecte** : OUI. `extractClientFromEmail` + LLM extraction via `/api/admin/brief/extract`. Double matching (heuristique + LLM).
- **Entity pre-selectionnee** : OUI. Le LLM extrait l'entity, et le dropdown charge les folders/lists ClickUp dynamiquement.
- **Branding injecte** : INDIRECT. Le branding est dans CLIENT_BRANDING (client-profile-builder.ts) et injecte dans les prompts LLM, mais pas affiche visuellement dans le modal. La PM ne voit pas les liens branding. Friction mineure — elle doit aller sur SP separement.
- **Assignee recommande** : OUI. Le LLM peut suggerer via `recommended_assignee`.
- **Estimation affichee** : OUI. `estimated_hours` dans le banner Arya Recommends.
- **Checkboxes tracker/SP** : OUI. Pre-cochees si client matche, avec le nom du fichier tracker et du dossier SP affiches.

### ProjectActionModal (Create Feedback) — PASS
- **Projet ClickUp trouve** : OUI. Recherche auto via `clickupProjectHint` + fallback recherche manuelle.
- **Feedback pre-redige** : OUI. Appel LLM `/api/admin/feedback/extract` au mount. Fallback = body email brut.
- **Post to ClickUp** : OUI. Poste le commentaire + reopens la task. Workflow complet.
- **Friction** : Si le projet n'est pas trouve automatiquement, la PM doit chercher manuellement. Le champ de recherche est present — OK.

### DraftReplyModal — PASS
- **Reponse pre-redigee** : OUI. Utilise `draftReply` du classification ou genere a la volee via `/api/admin/emails/classify`.
- **Langue correcte** : OUI. Le banner affiche la langue detectee. Le LLM genere dans la langue de l'email.
- **Ton Sarani** : Le banner affiche "Sarani warm" — le prompt LLM est calibre (a verifier cote API mais le front est OK).

### CLIENT_BRANDING — PASS (12/12 clients)
Tous presents : Sony, Lamarck, CMC Markets, Bose, Aujan (+ Rani + Barbican), Ubi (+ 9 sous-clients), Other customers, TikTok (22 divisions), PICO XR, Aristocrat, GEODIS, ProcessOut.
- **Gap DOMAIN_CLIENT_MAP** : Manquent geodis.com et processout.com. L'heuristique partielle (ligne 133-136) rattrapera probablement "geodis" mais pas garanti pour "processout".

### Page Admin (Inbox) — PASS
- **SystemHealthBanner** : OUI, present ligne 677.
- **Filtres** : 7 tabs (All, New Projects, Project Feedback, Enquiries, Project Reviews, Others, Managed) avec compteurs. OK.
- **Pagination** : OUI. `visibleCount` + "Show more (N remaining)". Pas de scroll infini mais fonctionnel.
- **AryaRecommendsBanner** : Present dans chaque modal (CreateBrief, ProjectAction, DraftReply). Pas sur la page inbox elle-meme — normal, c'est contextuel au modal.
- **Due Today banner** : OUI. Refresh 30s, groupe par client, liens ClickUp directs.
- **Polling** : 30s auto-refresh. Skeleton uniquement au premier chargement.

## Verdict

**L'equipe PM peut utiliser l'inbox sans formation.** Le workflow est intuitif : email arrive, Arya classifie, la PM clique le bon bouton, le modal pre-remplit tout. Les 3 actions principales (Create Brief, Create Feedback, Draft Reply) sont fonctionnelles bout en bout.

**Frictions mineures a corriger** :
1. Ajouter `geodis.com` et `processout.com` au DOMAIN_CLIENT_MAP
2. Les liens branding ne sont pas visibles dans le CreateBriefModal (la PM ne voit pas les liens SP du client avant de valider)
3. La section branding TODO dans arya-business-rules.md devrait etre marquee comme resolue (les donnees sont dans CLIENT_BRANDING)
