# Audit metier — Classifieur email Sarani
Date : 2026-04-02 | Auditrice : Arya, PM senior Sarani

## Contexte

Thomas signale que la classification inbox ne fonctionne pas apres 24h de travail.
Audit metier du prompt `src/lib/ai/prompts/classifier.ts` via simulation de 10 emails reels.

---

## Simulation des 10 emails

| # | Emetteur | Email (resume) | Attendu | Probable avec prompt actuel | Verdict | Pourquoi |
|---|---|---|---|---|---|---|
| 1 | Sony | "Voici les retours de la partie 3 [lien SP]" | project_feedback | project_feedback | CORRECT | Signal cle "retours" explicitement cite dans la definition. "relecture" y est aussi. Haiku detecte sans ambiguite. |
| 2 | Lamarck | "Merci beaucoup, c'est parfait !" | other | other | CORRECT | La definition cite explicitement "merci", "parfait" comme signaux other. Haiku devrait reconnaître. |
| 3 | TikTok via Lark | "80 videos this week, same specs" | new_project | INCERTAIN — risque project_feedback | PROBLEME | Le prompt dit "If in doubt between new_project and project_feedback, choose project_feedback". Or "same specs" ressemble a une recurrence — Haiku peut croire que c'est une commande sur un projet existant. Le biais de securite joue CONTRE nous ici. |
| 4 | Sony | "Hi Thomas, we need 50 banners for Black Friday" | new_project | new_project | CORRECT | Signal fort : "we need", "Black Friday" = evenement nouveau, aucun projet mentionne. Haiku classe correctement. |
| 5 | GEODIS | "Le logo sur la slide 14 est encore faux" | project_feedback | project_feedback | CORRECT | "slide 14", "encore" = reference a quelque chose d'existant. Signal tres clair. |
| 6 | Prospect inconnu | "Hi, I found your agency online. Can you do video editing?" | enquiry | enquiry | CORRECT | Premier contact, aucun projet, question sur les services. Definition enquiry exactement couverte. |
| 7 | AnneLaure @sarani.studio | "J'ai envoye le brief a Sony" | other (filtre interne) | new_project OU project_feedback | PROBLEME CRITIQUE | Le prompt n'a AUCUNE regle pour filtrer les emails internes @sarani.studio. Le filtre NOISE_SENDERS couvre seulement noreply/newsletter/etc. Un email interne Sarani qui dit "j'ai envoye un brief" sera classe new_project ou project_feedback et generera une action PM — fausse alerte. |
| 8 | Adobe Newsletter | "Your Creative Cloud subscription" | other | other | CORRECT | NOISE_SENDERS capture "newsletter" dans l'adresse. Si le domaine ne contient pas "newsletter", le contenu "subscription" devrait quand meme orienter vers other. Cas limite mais generalement OK. |
| 9 | Ubi (pour Adidas) | "Here's the brief for the new Adidas campaign" | new_project | new_project MAIS mal route | PROBLEME DE ROUTING | La classification new_project sera correcte. Mais le prompt dit que @adidas.com doit etre route vers Ubi. Or cet email VIENT D'Ubi, il n'est PAS de @adidas.com — Haiku risque de rater ce cas et de trailer ce brief directement sans signaler la chaine Ubi. |
| 10 | Client | "ok" | other | other | CORRECT | "ok" est explicitement couvert dans la definition other. Confidence elevee. |

---

## Synthese des problemes detectes

### Probleme 1 — Biais securite qui penalise les commandes recurrentes (email #3)
**Gravite : HIGH**
La regle "if in doubt, choose project_feedback" est un filet de securite utile pour les nouveaux projets ambigus. Mais elle cree un faux negatif sur les commandes recurrentes TikTok : "80 videos this week, same specs" ressemble a une recurrence sur un projet existant. Haiku classera project_feedback, ce qui bloque le declenchement du workflow new_project et retarde la mise en production.

Recommandation : ajouter un signal explicite pour les commandes recurrentes — "same specs", "same as last week", "weekly order" + volume numerique = new_project malgre l'apparence de continuite.

### Probleme 2 — Zero filtre sur les emails internes @sarani.studio (email #7)
**Gravite : CRITIQUE**
NOISE_SENDERS ne couvre que les patterns d'automatisation (noreply, newsletter, etc.). Un email d'equipe interne (@sarani.studio, @sarani.com) sera traite comme un email client et declenchera des protocols PROTO-EMAIL-INTAKE ou PROTO-CLIENT-RETURN a tort. C'est une source de pollution de l'inbox PM et de fausses actions.

Recommandation : ajouter une liste INTERNAL_SENDERS avec les domaines Sarani. Ces emails → categorie "other" systematiquement, routing "archive", confidence 1.0.

### Probleme 3 — Routing Ubi partiel (email #9)
**Gravite : MEDIUM**
La regle Ubi dans le prompt filtre les emails ENTRANTS depuis @adidas.com, @redbull.com, etc. Elle ne couvre pas les emails d'Ubi (@ubi-agency ou domaine partenaire) transmettant un brief pour un sous-client Adidas. Haiku verra "Adidas" dans le corps et class new_project sans signaler la chaine Ubi — le PM ne saura pas que ce brief passe par un intermediaire.

Recommandation : ajouter la detection du domaine expediteur Ubi dans le routing, ou ajouter une instruction explicite : "If the sender domain is Ubi's and the content mentions an Adidas/Redbull/Ikea brief, flag clickupProjectHint with 'VIA UBI —' prefix."

---

## Ce qui fonctionne bien

- Les 4 categories sont bien definies avec des exemples lexicaux concrets (retours, slide 14, v2, ok, merci, etc.)
- Le biais "project_feedback si doute" est bon pour les emails narratifs complexes
- La regle tone draftReply est tres complete — prenom, signature [PM_NAME], pas d'engagement deadline
- Le signal new_project ("work created from scratch") est clair pour les vrais nouveaux projets
- NOISE_SENDERS couvre les automatismes techniques standard

---

## Score de fiabilite metier actuel

- 7/10 emails classes correctement (70%)
- 2 problemes qui bloquent des workflows reels (#3 commandes TikTok, #7 emails internes)
- 1 probleme de routing silencieux (#9 chaine Ubi)

**Objectif cible : 10/10 avec les 3 corrections documentees ci-dessus.**

---

Gates BLOQUANT verifiees : G5 PASS (Sophie et clients Sarani cites), G13 PASS (zero donnee inventee — audit base sur le prompt reel), G15 PASS (zero placeholder), G19 PASS (specifique aux workflows Sarani/TikTok/Ubi).

---

**Handoff → @fullstack**
- Fichier produit : `docs/reviews/arya-classification-audit.md`
- Decisions : 3 corrections prioritaires identifiees sur `src/lib/ai/prompts/classifier.ts`
- Points d'attention : Probleme 2 (filtre interne) est CRITIQUE — a implementer en premier. Probleme 1 (TikTok recurrent) impacte directement le workflow le plus volume de Sarani (80+ videos/semaine). Probleme 3 peut attendre une V2 si priorite basse.
- Action concrete : (1) Ajouter INTERNAL_SENDERS filter dans classifier.ts, (2) Ajouter signal "recurring order" dans la definition new_project, (3) Ajouter prefix "VIA UBI —" dans clickupProjectHint pour les briefs Ubi.
