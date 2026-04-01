# Arya — Grille de compétences PM (pré-auto-execute)

> AVIS CONSULTATIF — 2026-04-01
> Diagnostic ciblé sur la question : "qu'est-ce qu'il manque pour lui faire confiance en autonomie ?"

---

## Grille de compétences — Arya vs PM humaine

| # | Compétence | Score | Verdict |
|---|---|---|---|
| 1 | Classification email | 8/10 | Solide |
| 2 | Connaissance client | 2/10 | Broken |
| 3 | Brief ops | 7/10 | Solide |
| 4 | Feedback ops | 7/10 | Solide |
| 5 | Draft reply | 7/10 | Solide |
| 6 | Estimation charge | 0/10 | Inexistant |
| 7 | Assignation | 1/10 | Broken |
| 8 | Priorisation | 0/10 | Inexistant |
| 9 | Détection d'anomalies | 2/10 | Broken |
| 10 | Proactivité | 0/10 | Inexistant |

---

### 1. Classification email — 8/10

Ce qui marche : 4 catégories, routing propre, noise filter, fallback "prefer false positive". La règle "si confidence < 0.6 → flag" est correcte.

Gap résiduel : classification entre `new_project` et `project_feedback` est floue pour un client récurrent qui envoie un nouveau brief dans un thread existant. Pas de règle explicite pour ce cas — c'est le type d'email qui arrive le plus souvent chez Sony et TikTok.

---

### 2. Connaissance client — 2/10

C'est LE gap bloquant pour l'autonomie. Arya reçoit un email Sony et ne sait pas :
- Que Sony envoie systématiquement 48h avant deadline réelle
- Que le contact habituel est Camille, pas l'adresse générique creative@sony.com
- Que le brand folder Sony est sur SharePoint > 02. Sony
- Que les projets Sony vont toujours dans l'espace ClickUp `90100452675`

Ce qu'elle a : 10 mappings dans `CLIENT_MAPPINGS` (ClickUp space → tracker → SharePoint folder). C'est utile pour le routing technique, pas pour la connaissance métier du client.

Ce qu'il manque : historique, préférences de communication, interlocuteurs habituels, patterns de demande. La knowledge base existe dans le code (loaders, pipeline `scan-knowledge`) mais elle n'est injectée nulle part dans les prompts classifier, brief-extractor ou feedback-extractor. Cerveau déconnecté de ses yeux.

---

### 3. Brief ops — 7/10

Le format 7 sections est rigoureux. Les règles "ne jamais copy-paste", "calculer les totaux", "FLAG toute ambiguïté" sont correctes. Un graphiste peut commencer.

Gap : aucun contexte client injecté. Le brief dit "Check brand guidelines on SharePoint > {client_name} folder" mais ne sait pas quel sous-dossier exact, quelle version des guidelines, quel template. Un graphiste Sony junior perd 15 min à chercher ce qu'un graphiste senior trouve en 30 secondes parce qu'il sait.

---

### 4. Feedback ops — 7/10

Fix S12 a résolu le problème majeur (liens SharePoint = fichiers annotés). La règle "ARYA NOTES en tête" est bonne — le PM voit les ambiguïtés avant d'approuver.

Gap : même lacune qu'en #2. Arya ne sait pas quels fichiers étaient en cours pour ce projet, quelle version avait été livrée, qui travaillait dessus. Elle reconstruit depuis l'email uniquement. Un PM humain dirait "c'est la v3 du banner 1200x628, Maria avait livré hier, la correction porte sur le logo en haut à droite". Arya dit "FILES AFFECTED: [file mentioned by client]".

---

### 5. Draft reply — 7/10

Le ton est bon : dynamique, pas corporate, premier prénom, pas d'engagement sur les délais. La règle "[PM_NAME]" comme signature est correcte.

Gap : la réponse est générique par rapport au client. Elle ne reflète pas que Thomas "les connait et les aime bien" (S6 learning). Un email Sony mérite une réponse différente d'un email prospect froid — Arya ne fait pas la distinction. Le tone mirroring existe dans les specs mais n'est pas implémenté dans le classifier prompt.

---

### 6. Estimation charge — 0/10

Inexistant. Aucune ligne dans les 3 prompts sur le sujet. Arya ne sait pas combien de temps prend un banner Sony 1200x628 vs une vidéo TikTok 60 secondes. Elle ne peut pas évaluer si la deadline est réaliste, ni alerter Thomas que "300 fichiers pour demain c'est 3x la capacité de l'équipe". C'est la compétence qui manque le plus pour une vraie PM.

---

### 7. Assignation — 1/10

`CLICKUP_TEAM_MEMBERS` liste 36 personnes avec leurs IDs. C'est tout. Arya ne sait pas :
- Qui fait quoi (design, video, translation, social)
- Qui est disponible
- Qui a déjà travaillé avec Sony/TikTok et connaît leurs standards
- Qui parle quelle langue (critique pour les projets multilingues)

Le 1/10 c'est pour le fait que la liste existe. L'assignation réelle est faite par Thomas manuellement sur chaque brief.

---

### 8. Priorisation — 0/10

Arya attribue une priorité binaire : `new_project` et `project_feedback` = HIGH, `enquiry` = MEDIUM. C'est une règle de catégorie, pas de priorisation. Elle ne sait pas que la deadline Sony de demain est plus urgente que le brief TikTok pour dans 2 semaines. Pas de comparaison inter-projets, pas de tri par deadline, pas d'alerte "3 projets HIGH en même temps, voici l'ordre recommandé".

---

### 9. Détection d'anomalies — 2/10

Ce qu'elle détecte : confidence < 0.6 (classification incertaine). C'est tout.

Ce qu'elle ne détecte pas :
- Deadline irréaliste (300 fichiers pour demain avec une équipe de 35)
- Client inconnu qui se présente comme existant
- Email en doublon (même brief envoyé 2 fois)
- Brief incomplet où il manque des specs critiques (pas juste [TO CONFIRM] — alerte active)
- Ton agressif du client qui signale un problème relationnel à gérer

---

### 10. Proactivité — 0/10

Arya est 100% réactive. Elle répond aux emails qui arrivent, elle n'anticipe rien. Pas de relance client si deadline approche sans validation. Pas d'alerte si un projet est "in progress" depuis 5 jours sans mise à jour ClickUp. Pas de digest matinal. Pas de détection "ce client n'a pas donné signe de vie depuis 3 semaines — relancer ?".

---

## Plan de formation concret

### Compétences 1-5 (scores 7-8) : injecter du contexte client

Un seul fix débloquerait 4 compétences simultanément : injecter le profil client dans tous les prompts.

Format concret à ajouter dans `buildBriefExtractionUserMessage()` et `buildFeedbackExtractionUserMessage()` :

```
CLIENT PROFILE (from knowledge base):
- Interlocuteurs habituels: [noms extraits de l'historique]
- Ton préféré: [formel/informel, langue]
- Brand folder SharePoint: [chemin exact]
- Projets récents: [3 derniers titres ClickUp]
- Pattern deadlines: [Sony = deadline réelle J+2, TikTok = souvent ASAP]
```

Source des données : les appels ClickUp et SharePoint sont déjà câblés. Ce n'est pas un problème d'infrastructure, c'est un problème de prompt engineering. Le knowledge scanner tourne — ses outputs ne sont injectés nulle part dans les prompts opérationnels. Corriger ça = +2 points sur les compétences 2, 3, 4, 5.

### Compétence 6 — Estimation charge : base de données des projets passés

Il manque une table simple : `project_type` × `quantity` × `duration_hours` × `assignee_type`. 10 projets réels de l'historique suffisent pour calibrer. Arya peut ensuite dire "brief similaire aux 3 derniers Sony = 8h de design, deadline réaliste si livraison J+2".

Action concrète : Thomas remplit une feuille Google Sheets avec les 10 derniers projets (type, volume, temps réel). @ia l'injecte dans le prompt brief-extractor sous forme de few-shot examples. Pas de machine learning — juste des exemples.

### Compétence 7 — Assignation : profil d'équipe

`CLICKUP_TEAM_MEMBERS` a les noms et IDs. Il manque un objet `TEAM_PROFILES` avec au minimum :
- `skills: ["design", "video", "translation"]`
- `languages: ["fr", "en", "es"]`
- `clients: ["Sony", "TikTok"]` (clients avec qui ils ont déjà travaillé)

Avec ça, Arya peut proposer "Camilla Palermo recommandée — design, parle EN/IT, 3 projets Sony". Thomas valide ou ajuste. Ce n'est pas une décision autonome, c'est une recommandation argumentée. Différence énorme.

### Compétences 8, 9, 10 — Priorisation, anomalies, proactivité : changer l'architecture

Ces 3 compétences ne peuvent pas être fixées par du prompt engineering. Elles nécessitent un agent qui :
1. Tourne sur cron (pas seulement sur déclenchement email)
2. Consulte l'état global (tous les projets en cours, toutes les deadlines)
3. Génère des alertes proactives

C'est le "daily digest" de l'audit v2. C'est la vraie différence entre un pipeline d'extraction et un agent PM. Sans ce cron de supervision, Arya restera un extracteur réactif peu importe la qualité de ses prompts.

---

## Verdict : ce qui bloque l'autonomie

Deux choses seulement bloquent le passage en auto-execute, et elles sont différentes en nature :

**Blocage #1 — Connaissance client (quick fix, 1-2 jours).**
Injecter le profil client dans les prompts. L'infrastructure est là. C'est un problème de câblage, pas d'architecture.

**Blocage #2 — Zéro capacité de supervision proactive (chantier, 1-2 semaines).**
Arya ne peut pas être autonome si elle ne détecte pas les anomalies et n'anticipe rien. Un pilote automatique sans capteurs d'alerte n'est pas un pilote automatique — c'est un danger.

En pratique : activer l'auto-execute sur les cas high-confidence (> 0.95, client connu, deadline > 48h) MAINTENANT, sans attendre le fix proactivité. Mais documenter clairement que l'auto-execute S1 est aveugle sur la charge équipe et les anomalies. Thomas reste en supervision active sur ces dimensions jusqu'au fix #2.

---

**Handoff → Thomas (décision directe)**
- Fichier produit : `docs/reviews/elon-arya-gaps.md`
- Verdict : 4 compétences inexistantes (0/10), 2 broken (1-2/10), 4 solides (7-8/10)
- Priorité absolue : injecter profil client dans les prompts (fix rapide, impact sur 4 compétences)
- Priorité structurelle : cron de supervision proactive (sans ça, l'autonomie est partielle)
- Ces recommandations sont des AVIS. Thomas décide du scope du mode auto-execute.
