# Re-audit rapide — Prompts AI (Brief / Feedback / Classifier)
**Arya — Sarani PM | 2026-04-01**

---

## Scores

| Prompt | Score | Verdict |
|---|---|---|
| `brief-extractor.ts` | 9/10 | Solide — 1 point bloquant résiduel |
| `feedback-extractor.ts` | 8/10 | Fonctionnel — 2 gaps opérationnels |
| `classifier.ts` | 9.5/10 | Quasi parfait — 1 détail mineur |

---

## brief-extractor.ts — 9/10

**Ce qui va :** format 7 sections avec emojis, calcul des totaux explicite (50 × 3 × 2 = 300), règle "jamais copy-paste", schema Zod propre avec tous les champs critiques (deadline, dimensions, quantity, output_languages).

**Ce qui manque pour 10/10 :**
- Le fallback `💬 Branding` écrit en dur "Check brand guidelines on SharePoint > [Client] folder" — mais `[Client]` n'est jamais remplacé dynamiquement. Le designer arrive sur SharePoint sans savoir quel dossier chercher. Corriger : injecter `client_name` ou marquer `[TO CONFIRM — verify SharePoint folder name for this client]`.
- `project_type = "generic"` existe dans le schema mais son cas d'usage n'est pas documenté par rapport à "other". Risque de classification incohérente entre les reviewers.

---

## feedback-extractor.ts — 8/10

**Ce qui va :** structure ClickUp-ready avec impératifs, transformation émotionnelle ("I'm disappointed" → Priority: URGENT), section "DO NOT MODIFY" qui protège les éléments validés, gestion des feedbacks vagues avec flag pour le PM.

**Ce qui manque pour 10/10 :**
- Pas de section "FILES AFFECTED" — sur un projet avec 300 fichiers Sony, le designer ne sait pas sur quelle version appliquer les corrections. Ajouter : `FILES AFFECTED: [filename(s) — version number if applicable]`.
- La langue de sortie n'est pas spécifiée. Si le client écrit en français, le feedbackComment sort en français ? L'ops team est internationale — la règle "always output in English" du brief-extractor doit s'appliquer ici aussi, à documenter explicitement.

---

## classifier.ts — 9.5/10

**Ce qui va :** 4 catégories nettes avec routing explicite, règle "false positive over missed client email", ton Sarani dans le draftReply (prénom, jamais corporate, jamais de deadline promise), helpers `priorityFromCategory`/`protocolFromCategory`, filtre bruit `isNoiseByEmail`.

**Ce qui manque pour 10/10 :**
- `clickupProjectHint` retourne null pour `new_project` selon la règle documentée — mais un nouveau projet Sony a clairement un hint ("Sony Music France"). Résultat : les tâches ClickUp créées depuis un `new_project` arrivent sans lien client. Corriger : retourner le client name pour `new_project`, réserver null uniquement pour `other`.

---

## Simulation Sony — Email Marc

**Input :**
> "Hi Thomas, we need 50 banners for our Black Friday campaign. 3 sizes: 1200x628, 1080x1080, 1920x1080. EN and FR versions. Product shots attached. Deadline: tomorrow 6pm CET. — Marc, Sony Music France"

**Classifier :** category `new_project`, confidence 0.97, routeTo `PROTO-EMAIL-INTAKE`.
Bug actuel : `clickupProjectHint` retournerait null. Attendu : `"Sony Music France"`.

**Brief-extractor — output attendu :**

```
🌟 Introduction / Goal:
Sony Music France needs 50 Black Friday campaign banners in 3 sizes, EN and FR.
Deadline is critical: tomorrow 6pm CET.

✈️ Brief:
Design 50 Black Friday banners for Sony Music France. Deliver in 3 sizes
(1200x628, 1080x1080, 1920x1080) with EN and FR versions. Use client product shots
as main visual. Adapt copy per language.

🚚 Deliverables:
- Banners × 50 designs — 1200x628, 1080x1080, 1920x1080 — EN + FR
Total: 50 × 3 sizes × 2 languages = 300 files

⏰ Deadline:
Tomorrow 6pm CET — URGENT

📍 Source Files:
Product shots attached to original email — [TO CONFIRM — confirm upload to SharePoint]

💬 Branding:
[TO CONFIRM — verify Sony Music France folder name on SharePoint]

➡️ Others:
- Naming convention not specified — confirm with PM before delivery
- "Black Friday" copy: confirm exact wording EN/FR ("Black Friday" vs "Vendredi Noir" ?)
- 50 unique designs or 1 template × 50 products ? Clarify with PM.
```

Verdict simulation : exploitable par un senior designer en 5 minutes. Calcul 300 fichiers correct. 3 ambiguités clés détectées. Seul bug confirmé : SharePoint placeholder non résolu — cohérent avec l'audit ci-dessus.

---

## Verdict global

**GO pour le lancement — 2 corrections avant déploiement :**

1. `brief-extractor` : remplacer le fallback SharePoint statique par un placeholder dynamique ou marqueur TO CONFIRM incluant le nom client
2. `classifier` : `clickupProjectHint` retourne le client name pour `new_project` (pas null)

`feedback-extractor` : 2 améliorations non bloquantes (langue de sortie + FILES AFFECTED) — intégrer en V1.1.

---

**Handoff → @fullstack**
- Fichiers audités : `src/lib/ai/prompts/brief-extractor.ts`, `feedback-extractor.ts`, `classifier.ts`
- Corrections bloquantes : 2 (détaillées ci-dessus)
- Améliorations V1.1 : 2 sur `feedback-extractor` (langue + fichiers concernés)
- Gates BLOQUANT vérifiées : G5 PASS, G7 PASS, G12 PASS, G15 PASS, G19 PASS
