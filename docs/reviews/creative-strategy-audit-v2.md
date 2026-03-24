# Sarani — Creative Strategy Audit V2
*Produced by @creative-strategy — 2026-03-24*
*Scope: Full site audit post V2 implementation (light-first redesign)*
*Files reviewed: page.tsx, about, pricing, work, contact, case-studies, header, footer, logo, all home components, brand-platform.md, value-proposition.md, brand-voice.md*

---

## Note globale : 7.2 / 10

> Un site qui a une fondation stratégique solide et une copy excellente — mais qui manque de l'impact visuel qu'une agence créative doit incarner. La promesse "Unlimited Creativity" est tenue dans les mots. Elle n'est pas encore tenue dans l'expérience.

---

## 1. Points forts

### 1.1 Copywriting : niveau rare pour une agence

C'est le point fort le plus solide du site. La copy est directement tirée de la brand-voice.md et de la brand-platform.md — et ça se voit, dans le bon sens.

Exemples qui fonctionnent exactement comme ils doivent :

- Hero : "Unlimited Creativity" + 4 value props courtes + "First project satisfaction or no invoice." — 3 lignes qui disent tout.
- Section footer CTA : "The creative agency enterprises call when every other agency says two weeks." — C'est la phrase-test de la brand platform. Elle est là, in fine, là où elle doit être.
- About, section "What we believe" : "TikTok trusted us with 1,500+ video edits a month. Sony called us the day their Black Friday banners were needed — not the week before, that day — and we delivered at 155€ per banner." — Ce sont des phrases qui respectent à la lettre la règle "Never praise yourself. Point at the work."
- 404 : "This page doesn't exist. But we do. 35 experts ready to work on your next project." — Parfait. Zéro "Oops!", zéro humour de startup. Ton d'entreprise qui se permet d'être légèrement humain.
- Contact form placeholder : `"We need 50 banners in 3 languages by Friday..."` — Sophie se reconnaît immédiatement.

Le copywriter qui a produit ce contenu a compris le persona. Chaque phrase est écrite pour une personne sous pression qui lit vite.

### 1.2 Structure stratégique de la homepage : bonne séquence de conviction

La séquence des sections sur la homepage suit une logique de conviction bien construite :

1. Hero : promesse + value props + CTA + logos clients (above the fold — correct)
2. What we do : scope du service (immédiatement après la promesse)
3. Our metrics : preuve quantitative (<24h, ∞ révisions, 100% fixed prices, 6 continents)
4. Real results. Real clients. Real prices. : preuve sociale nominative (Sony, GEODIS, TikTok)
5. See how we deliver : case studies (approfondissement des preuves)
6. Footer CTA : phrase d'accroche finale + call to action

Cette séquence répond au parcours cognitif de Sophie : "Qu'est-ce qu'ils font ? → Prouvez-le en chiffres → Prouvez-le avec des noms → Comment peuvent-ils m'aider, moi ?" C'est une construction intentionnelle et efficace.

### 1.3 Le "proof-first" est systématique et cohérent

Conformément à la brand-platform, le site ne fait jamais de l'auto-promotion vide. Chaque affirmation est suivie d'un chiffre ou d'un nom :

- "1,500+ edits per month" → TikTok
- "5,700 slides in 3 weeks" → GEODIS, 8,500€
- "Same-day banners" → Sony, 155€

Les ProofCards sont structurées correctement : client, stat, prix, détail. C'est la preuve dans sa forme la plus épurée. L'exclusion de "world-class", "industry-leading" et autres termes bannis de brand-voice.md est respectée sur l'ensemble du site — ce qui est plus rare qu'il n'y paraît.

### 1.4 Les case studies : structure solide

La page case-study `[slug]` a une architecture correcte : hero client + brief + "At a Glance" sidebar sticky + stats + résultats + CTA + related. Le layout à 2 colonnes (8/4) pour le brief avec sidebar sticky est une bonne décision UX — Sophie peut consulter les métriques clés pendant qu'elle lit. La présence de JSON-LD structuré est un bonus SEO/GEO non négligeable.

### 1.5 La page Pricing : transparence exemplaire

La page Pricing incarne exactement la promesse de "Radical Transparency" de la brand platform. Elle publie des prix réels, avec un tableau de comparaison Sarani vs. Network Agency (bannière 155€ vs 500–2,000€, révisions incluses vs 200–800€ chacune, turnaround 24h vs 10–15 jours). Le guarantee strip "Not satisfied with your first project? No invoice." en bandeau immédiatement sous le H1 est bien placé — c'est l'objection "et si ça ne me convient pas ?" résolue dès le premier scroll.

La note "All prices exclude VAT (HT)" en bas est une bonne pratique pour éviter les surprises chez Marc (Procurement).

### 1.6 Le formulaire contact : micro-copy irréprochable

Le formulaire de contact est le meilleur formulaire B2B de ce type vu dans cet exercice depuis plusieurs projets. Détails qui font la différence :

- Placeholder company : "TikTok, Sony, Adidas..." — signal immédiat que le site parle aux grandes entreprises
- Placeholder message : `"We need 50 banners in 3 languages by Friday..."` — Sophie se reconnaît dans la seconde
- Help text : "No formal brief? A sentence on what you need, your deadline, and your budget is enough." — baisse la friction de la manière la plus directe possible
- Success state : "Brief received. We'll respond within the hour." — court, crédible, sans fioriture
- Error messages : directs, jamais apologétiques ("That didn't go through. Try again — or email us directly")
- Garantie en fin de formulaire : "First project satisfaction or no invoice." — la dernière chose que Sophie lit avant de cliquer

La question d'attribution ("How did you hear about us?") en champ obligatoire est une décision analytique intelligente documentée dans le kpi-framework.md.

### 1.7 Le 404 : détail révélateur d'une vraie maîtrise de marque

"This page doesn't exist. But we do. 35 experts ready to work on your next project." — C'est la définition d'une marque qui contrôle son ton jusqu'aux extrémités. Pas de jeu de mots creux, pas d'"Oops!", pas de dessin de robot triste. Juste la marque qui parle comme elle parle partout. Un détail — mais les détails sont là où les grandes marques se distinguent des agences qui font du bon boulot.

---

## 2. Points faibles critiques

### 2.1 CRITIQUE — Absence totale de visuels créatifs

C'est le problème central de ce site. Une agence qui s'appelle "Unlimited Creativity" et dont le tagline est "Unlimited Creativity" a un site entièrement composé de typographie, de blocs gris et de texte.

Aucune image. Aucune vidéo. Aucun visuel de campagne. Aucun screenshot d'une bannière Sony. Aucun frame d'une vidéo TikTok. Aucune slide GEODIS.

Ce que le code révèle dans les case studies : `<div className="aspect-video w-full rounded-2xl bg-surface-elevated" />` — ce sont des placeholders gris. Deux dans chaque case study. Vides.

**Impact sur Sophie :** Elle arrive sur le site d'une agence créative et voit... des mots. Des mots excellents, certes. Mais des mots. Son instinct de directrice marketing lui dit : "Si vous êtes vraiment créatifs, montrez-le. Ne me le dites pas."

Chaque concurrent — Superside, Design Pickle, n'importe quelle agence créative — montre des visuels en homepage. Sarani non.

**Niveau de criticité :** Un site vitrine d'agence créative sans visuels est comme un restaurant dont le menu ne montre pas les plats. C'est le problème numéro 1 et il prime sur tout le reste.

### 2.2 CRITIQUE — La homepage n'a pas de "wow moment"

Le hero actuel est : "Unlimited Creativity" en très grand, 4 value props en texte, 2 boutons, et les logos clients en texte en dessous.

C'est propre. C'est lisible. Ce n'est pas "wow".

Une agence créative dont le pitch central est "nous sommes les meilleurs créatifs sur 5 continents" doit avoir un hero qui crée une réaction physique dans les 3 premières secondes. Ce n'est pas une question de goût — c'est une question de cohérence entre la promesse et l'expérience.

Les 6 HeroDots décoratifs (petits cercles colorés positionnés en absolu) sont un geste visuel identitaire intéressant mais insuffisant. Des points colorés de 8px de diamètre ne constituent pas un statement créatif.

Comparaison directe : Superside.com charge avec des animations Framer et des grilles de travaux client en movement. Design Pickle montre une interface produit animée. Sarani montre du texte bold sur fond blanc.

**Ce que "Unlimited Creativity" devrait produire comme réaction chez Sophie en 3 secondes :** "Ces gens-là savent ce qu'ils font." Ce que le hero actuel produit : "Cette agence semble sérieuse." C'est un écart énorme.

### 2.3 MAJEUR — Les logos clients sont du texte, pas des logos

Dans `client-logos.tsx`, les logos de TikTok, Sony, GEODIS, Adidas, L'Oréal et PICO sont rendus en texte :

```
className="text-lg font-bold uppercase tracking-widest text-neutral-400"
```

Il s'agit de spans textuels, en majuscules, gris neutres (`text-neutral-400`), sans image, sans SVG logomark.

**Le problème :** Pour Sophie — et n'importe qui dans sa position — voir le logo TikTok (le vrai logo, avec son icône musicale reconnaissable) génère une reconnaissance immédiate et une validation émotionnelle forte. Voir "TIKTOK" en lettres grises majuscules produit un effet proche de zéro.

La puissance d'un logo client tient au fait que le cerveau reconnaît ces marques en quelques millisecondes avant même de lire. Le texte doit d'abord être décodé. C'est toute la différence entre "signal" et "information".

**Note supplémentaire :** Sur mobile, le marquee animé est là — c'est bien. Mais des mots qui défilent restent des mots.

### 2.4 MAJEUR — Les case studies sont des placeholders visuels

Dans `case-studies/[slug]/page.tsx` :

```
{/* Hero image placeholder */}
<div className="aspect-video w-full rounded-2xl bg-surface-elevated" />

{/* Gallery placeholder */}
<div className="grid gap-4 sm:grid-cols-2">
  <div className="aspect-video rounded-2xl bg-surface-elevated" />
  <div className="aspect-video rounded-2xl bg-surface-elevated" />
</div>
```

Trois blocs gris dans chaque case study. Les textes sont excellents — la structure est solide — mais l'absence d'images réelles des livrables (bannières Sony, présentations GEODIS, vidéos TikTok) transforme les case studies en études de cas abstraites.

**Le paradoxe :** C'est précisément dans les case studies que Sarani a les preuves les plus puissantes. GEODIS 5,700 slides en 3 semaines — on voudrait voir ces slides. Sony Black Friday banners — on voudrait voir ces bannières. TikTok 400M de vues — on voudrait voir les thumbnails des vidéos.

Le texte dit "look what we made". Il n'y a rien à regarder.

### 2.5 MAJEUR — Incohérence critique des chiffres : "6 Continents" vs "5 continents"

Dans `page.tsx` (homepage), section métriques :
```
{ value: "6", label: "Continents covered", sublabel: "" },
```

Dans `brand-platform.md`, `project-context.md`, `about/page.tsx`, `footer.tsx` et toute la documentation stratégique : **5 continents**.

Il y a 6 continents habités sur la planète (si on compte l'Antarctique, 7). Mais Sarani opère sur 5 continents selon toute sa propre documentation. Cette métrique homepage contredit la brand platform et tous les autres textes du site.

**Impact :** Pour Sophie ou Marc qui lisent attentivement, c'est une incohérence qui fragilise la crédibilité de toutes les autres données chiffrées. Si "6 continents" est faux, les "1,500+ edits/month" sont-ils exacts aussi ?

Ce chiffre doit être corrigé immédiatement en "5" ou justifié avec une source.

### 2.6 MOYEN — La valeur des preuves TikTok (vues) est absente du site

La brand platform documente des chiffres extraordinaires : #RoadToParis (51M views), GimmeTheMic (94M views), Gaming Showcase (300M views), Community Fest (400M views), Alan Walker Tour (200M views).

Ces chiffres n'apparaissent nulle part sur le site visible. Ni dans les ProofCards, ni dans les case study teasers, ni dans la homepage. Le case study TikTok mentionne "1,500+ edits per month" et "Ongoing video production at scale" — mais pas les vues.

**Le manque :** "400 millions de vues" est un chiffre qui arrête le défilement de n'importe quel directeur marketing. Il devrait être une arme dans l'arsenal de preuve homepage.

### 2.7 MOYEN — La page Work est sous-exploitée

La page `/work` contient : un H1, un sous-titre de 12 mots, et une grille de CaseStudyCards qui affichent client + headline + description courte + lien. C'est fonctionnel, mais pour une page intitulée "Work" d'une agence créative, c'est d'une maigreur problématique.

Il n'y a :
- Aucune catégorisation par type de travail (video, branding, presentations, social...)
- Aucun filtre par client ou secteur
- Aucune indication du volume ou de l'échelle (on ne sait pas combien de case studies existent)
- Aucun visuel de portfolio en dehors des cards textuelles

Pour Sophie qui arrive via la homepage et clique "Work" pour valider la qualité créative, cette page ne lui apporte pas ce qu'elle cherche.

### 2.8 MOYEN — Répétition excessive de "First project satisfaction or no invoice"

La garantie "First project satisfaction or no invoice" apparaît dans le code aux endroits suivants :

1. Hero (sous les CTAs) — `page.tsx` ligne 123
2. Footer CTA section — `page.tsx` ligne 214
3. Pricing — guarantee strip (`pricing/page.tsx`)
4. Pricing — closing CTA (`pricing/page.tsx`)
5. About — closing CTA (`about/page.tsx`)
6. Contact form — sous le bouton submit (`contact-form.tsx`)
7. Case study — closing CTA section (`case-studies/[slug]/page.tsx`)

7 occurrences sur le site. La première occurrence (hero) est excellente et justifiée. Les suivantes dans leur répétition mécanique diluent l'impact. Une garantie répétée 7 fois commence à ressembler à une petite ligne de bas de page standard — pas à un engagement fort.

**Recommandation :** Conserver hero + pricing + formulaire contact. Retirer ou reformuler dans les autres contextes avec des variations : "Zero risk on project one." ou "Not the right fit? Not an invoice."

### 2.9 FAIBLE — Navigation : "Contact" absent du menu principal

Le header expose : Work, Pricing, About + CTA "Let's chat".

Il n'y a pas de lien "Contact" dans la navigation principale. C'est un choix délibéré (le CTA "Let's chat" remplace ce lien), et il est défendable. Mais pour Marc (Procurement) qui cherche une adresse email ou un formulaire sans vouloir "chat", l'absence d'un lien "Contact" clairement libellé peut créer une friction.

**Impact limité** — le CTA "Let's chat" est visible et le footer expose l'email. Mais pour une cible enterprise B2B, un lien "Contact" est souvent un réflexe de navigation.

---

## 3. Analyse par axe d'évaluation

### 3.1 Alignement marque / site — Note : 7/10

**Ce qui est aligné :** Le territoire de marque ("always-on enterprise creative partner") est parfaitement traduit dans la copy. La promesse brand platform ("Enterprise-quality creative, delivered in 24 hours — unlimited revisions, fixed prices, zero surprises") est visible dans chaque section. Le ton Assured/Direct/Warm est respecté avec une constance remarquable. Les exclusions de la brand-voice (pas de "cheap", "boutique", "world-class", "innovative") sont respectées partout.

**Ce qui n'est pas aligné :** La plateforme de marque positionne Sarani comme "l'intersection de enterprise-grade quality et operational speed" — et précise que l'ADN créatif doit être visible. Un site entièrement en noir, blanc et texte pour une agence créative est en désaccord structurel avec cette promesse. La brand platform dit "unlimited creativity" ; le site dit "unlimited words about creativity".
### 3.2 Parcours Sophie — Les 3 premières secondes — Note : 6/10

Sophie arrive sur la homepage. Voici ce qu'elle voit above the fold :

- "Unlimited Creativity" en très grand (bold, noir sur blanc)
- "24/7 availability — D+1 deliveries — Fixed prices — Unlimited revisions" en texte
- Deux boutons : "Let's chat" (jaune) + "Discover our prices" (outline)
- "First project satisfaction or no invoice." (texte gris, petite taille)
- Logos clients : "TIKTOK SONY GEODIS ADIDAS L'OREAL PICO" en texte gris majuscules

**Ce qui convainc en 3 secondes :** Le tagline + les 4 value props + les logos clients. Sophie lit vite. Le message est clair. Elle comprend en 5 secondes que c'est une agence de production créative rapide et fixe en prix, qui travaille avec TikTok et Sony.

**Ce qui ne convainc pas en 3 secondes :** Elle est directrice création ou marketing dans une grande boîte. Elle évalue des agences créatives régulièrement. Quand elle arrive sur le site de Sarani — une agence qui revendique "Unlimited Creativity" — et qu'elle ne voit aucun travail créatif, aucune image, aucune preuve visuelle, son évaluation instinctive est diminuée.

**Le test décisif :** Sophie fait défiler jusqu'aux ProofCards (Sony, GEODIS, TikTok). Elle est convaincue par les chiffres. Elle clique sur un case study TikTok. Elle arrive sur une page avec deux blocs gris à la place des visuels. Elle referme l'onglet ou repart sans avoir vu le travail.
### 3.3 Exploitation de la preuve sociale — Note : 6/10

Sarani dispose d'un arsenal de preuve sociale parmi les meilleurs que j'aie vus pour une agence de cette taille : TikTok, Sony, Adidas, GEODIS, L'Oréal, Pernod Ricard, PICO. Des noms qui font la conversation dans n'importe quelle direction marketing internationale.

**Ce qui fonctionne :** La section ProofCards (Sony, GEODIS, TikTok avec stats et prix) est bien construite. La séquence homepage utilise ces noms correctement. La page About cite les preuves avec précision.

**Ce qui est sous-exploité :**

1. Les chiffres TikTok (51M, 94M, 200M, 300M, 400M views) ne sont nulle part sur le site visible. Ce sont des preuves d'impact extraordinaires pour une cible marketing.
2. Le ROI Air Corsica (29.9%) est un proof point exceptionnel pour les directions marketing qui doivent justifier leur spend — il est dans la brand platform mais absent du site.
3. Adidas (92 assets pour un marathon booth showcase) — présent dans la page Work via les case study cards, mais aucune preuve chiffrée visible.
4. L'Oréal, Pernod Ricard — mentionnés dans la liste clients mais sans aucun chiffre associé sur le site.

**Le verdict :** Les preuves existent. Elles sont documentées. Elles ne sont pas toutes à l'écran.
### 3.4 Différenciation vs concurrence — Note : 8/10

C'est le point le plus fort de la stratégie et il est bien traduit.

La brand platform identifie l'espace libre : unique à combiner (1) client enterprise tier, (2) D+1 standard, (3) full-service, (4) per-project pricing sans subscription, (5) garantie first project. Le site traduit cela correctement.

La page Pricing mentionne explicitement "$10,000/month" (Superside) dans le texte About page — sans nommer Superside, mais en évoquant "A $10,000/month subscription before a single asset is produced." C'est précisément le bon niveau : pointer l'argument sans nommer le concurrent.

Le tableau de comparaison Pricing (Sarani vs Network Agency) est une arme efficace pour Marc (Procurement).

**Ce qui pourrait être renforcé :** La différenciation "18 langues — un contact, une facture" est mentionnée dans About mais pas dans le hero ni dans une section dédiée. Pour une Sophie qui gère des campagnes multi-marchés, c'est un différenciateur fort qui mérite plus de visibilité.
### 3.5 Cohérence tonale — Note : 9/10

Exceptionnel. C'est la note la plus haute de l'audit. Sur l'ensemble des pages lues (homepage, about, pricing, contact, case study, 404), le ton Assured/Direct/Warm est maintenu avec une cohérence rare.

**Assured** : Pas une seule occurence de "we believe we can", "we strive to", "we aim to deliver". Tout est factuel : chiffres, noms, résultats.

**Direct** : Les phrases dépassent rarement 20 mots. Pas de jargon agence ("synergies", "holistic", "best-in-class"). Les CTA sont directs : "Let's chat", "Send my brief", "Start a project".

**Warm** : Le formulaire contact ("No formal brief? A sentence... is enough."), le success state ("We'll respond within the hour."), le about ("When you wake up, it's done.") — la chaleur est là, discrète et humaine.

La seule note mineure : le CTA "Let's chat" en header est légèrement en décalage avec le ton enterprise — "Discuss a project" ou "Start a project" serait plus aligné avec la cible Sophie/Marc qui n'est pas en mode "chat" quand elle évalue une agence pour un contrat-cadre. C'est une nuance, pas une faute.
### 3.6 Impact émotionnel — Note : 5/10

C'est là que le site perd des points de manière significative. Pour une agence créative, l'impact émotionnel n'est pas optionnel — c'est le produit.

Le design V2 (light-first, typo bold noire sur blanc, touches de brand-lemon/cerulean/flame) est propre et lisible. Mais propre n'est pas impressionnant. Lisible n'est pas mémorable.

**Ce que le site produit comme émotion :** "Cette agence est sérieuse, organisée, directe." C'est bien. C'est insuffisant.

**Ce que le site devrait produire :** "Ces gens-là ont du talent. Je veux travailler avec eux." C'est un saut qualitatif énorme que seuls des visuels créatifs de qualité peuvent opérer.

**La règle non-négociable des agences créatives :** Votre site est votre premier projet client. Si votre site n'est pas époustouflant, vous avez déjà perdu la comparaison avec Superside (qui montre des animations Framer motion et une grille de travaux premium) avant même que Sophie lise un mot de votre copy.
### 3.7 Storytelling — Note : 7.5/10

La page About est le meilleur exercice de storytelling du site. La séquence narrative :

1. "The traditional agency model was broken before anyone admitted it." — ouverture qui prend position
2. "Every Head of Marketing we spoke to had the same story." — empathie et reconnaissance du persona
3. "In 2020, Thomas and the founding team built Sarani..." — origine et mission
4. "We built a different architecture." — la solution structurelle
5. "We are the creative agency enterprises call when every other agency says two weeks. We say: tomorrow." — le manifeste en 2 phrases

C'est du bon storytelling B2B. La mention de "Thomas" (le fondateur) est un détail humanisant — mais elle arrive et repart sans jamais être développée. On ne sait pas qui est Thomas, ce qui affaiblit légèrement l'aspect "partner, not vendor" que la brand platform défend.

**Ce qui manque :** Une phrase sur l'origine de "Sarani" comme nom. Une photo de l'équipe ou du fondateur (même une seule). Quelque chose qui ancre l'histoire dans des visages, pas seulement dans des chiffres.

---

## 4. Recommandations prioritaires

### Priorité 1 — Intégrer des visuels réels (bloquant pour la crédibilité créative)

**Problème :** Le site d'une agence créative sans visuels est une contradiction stratégique.

**Actions concrètes :**

1. **Remplacer les placeholders gris dans les case studies** par des captures d'écran réelles des livrables : bannières Sony, slides GEODIS, frames de vidéos TikTok. Si les clients ont des NDAs, demander des permissions limitées ou flouter partiellement.

2. **Ajouter une section "Work" ou "Portfolio" en homepage** — pas un carousel (trop lent à charger), mais une grille statique de 6 à 9 thumbnails de livrables réels, cliquables vers les case studies.

3. **Hero upgrade** : envisager un fond de vidéo ou d'images en loop lent derrière le H1, montrant des frames de productions TikTok, des bannières Sony, des slides GEODIS. Pas un élément distrayant — un fond de preuves.

4. **Logos clients SVG** : remplacer les spans textuels dans `client-logos.tsx` par des SVG des logos officiels de TikTok, Sony, Adidas, GEODIS, L'Oréal, PICO. C'est un investissement d'une heure pour un impact de conversion majeur.

**Responsable côté Sarani :** L'équipe créative interne dispose de tous ces assets. Ce n'est pas un problème de production — c'est un problème d'autorisation et d'intégration.
### Priorité 2 — Hero upgrade : ajouter une métrique TikTok "vues"

**Problème :** Les chiffres les plus impressionnants de Sarani (400M de vues, 300M de vues) sont absents du site.

**Action concrète :** Ajouter une métrique dans la section "Our metrics" ou dans les ProofCards TikTok. Exemple de card enrichie :

```
TikTok
1,500+ edits per month
Campaigns: up to 400M views
```

Ou ajouter une 5e métrique dans la grille : `400M` / `Views. One campaign.` — c'est un chiffre qui s'impose dans n'importe quel esprit marketing.

**Action secondaire :** Ajouter le ROI Air Corsica (29.9%) comme proof point dans une section dédiée ou comme 4e ProofCard. 29.9% ROI mesurable est un argument qui parle directement au persona Marc (Procurement).
### Priorité 3 — Corriger "6 continents" en "5 continents" (1 ligne de code)

**Problème :** Incohérence factuelle entre homepage metrics (6) et toute la documentation (5).

**Action :** Dans `src/app/page.tsx`, ligne de la const METRICS :
```
{ value: "6", label: "Continents covered", sublabel: "" },
```
Corriger en `"5"`. Ou si Sarani opère désormais sur 6 continents, mettre à jour toute la documentation en conséquence.

C'est 1 caractère à changer. Le laisser est une erreur de crédibilité.
### Priorité 4 — Enrichir les case studies avec les données disponibles

**Problème :** Les case studies ont une structure solide mais manquent de profondeur narrative et de visuels.

**Actions concrètes :**

1. Pour le case study TikTok : ajouter les chiffres de vues par campagne dans les Stats (51M, 94M, 200M, 300M, 400M). Ils sont dans la brand platform — il suffit de les passer dans les données `case-studies.ts`.

2. Pour le case study Sony : mentionner les 15 langues de localisation vidéo et les 125 assets TV launch — ce sont des preuves de scale absentes du teaser.

3. Ajouter Adidas (92 assets marathon), L'Oréal (TikTok sizzle), Air Corsica (ROI 29.9%) comme case studies complets — ils sont dans la brand platform mais semblent absents ou peu développés.

4. Une section "What the client said" (quote client) dans chaque case study serait le proof point le plus puissant manquant. Si des témoignages existent — c'est une priorité absolue.
### Priorité 5 — Navigation et micro-ajustements

**Recommandations légères :**

1. Envisager d'ajouter "Contact" dans le footer navigation column "Company" (il y est déjà — bien). Vérifier que Marc trouve l'email de contact sans avoir à parcourir le site.

2. Réduire les occurrences de "First project satisfaction or no invoice" de 7 à 3-4 occurrences stratégiques (hero, pricing, formulaire). Introduire des variations pour maintenir l'impact.

3. Dans le footer, les 4 liens "Services" pointent tous vers `/work` — ce sont des liens génériques. À terme, créer des landing pages par service (video production, branding, presentations) pour améliorer le SEO et adapter le message par intention.

4. Envisager "Start a project" plutôt que "Let's chat" dans le header desktop — plus précis pour une cible enterprise B2B qui n'est pas en mode "chat informel".

---

## 5. Verdict final

### Note globale : 7.2 / 10

| Axe d'évaluation | Note |
|---|---|
| Alignement marque / site | 7/10 |
| Parcours Sophie — 3 premières secondes | 6/10 |
| Exploitation de la preuve sociale | 6/10 |
| Différenciation vs concurrence | 8/10 |
| Cohérence tonale | 9/10 |
| Impact émotionnel | 5/10 |
| Storytelling | 7.5/10 |
| **Moyenne** | **6.9/10** |

*Note finale ajustée à 7.2 en tenant compte de la qualité exceptionnelle de la copy et de la solidité de la structure stratégique — qui sont deux avantages rares.*

---

### Ce site a deux visages.

**Le premier visage :** stratégiquement, c'est un des sites B2B les mieux écrits que j'aie audités dans ce secteur. La copy est directe, les preuves sont réelles, le ton est maîtrisé, la structure de conviction est logique. L'alignement entre la brand platform et le site est exceptionnel. Les décisions de copywriting (de la homepage au 404) montrent un niveau de discipline de marque que la plupart des agences n'atteignent pas après 5 ans.

**Le second visage :** visuellement et émotionnellement, c'est un site de consulting, pas un site d'agence créative. Une agence qui revendique "Unlimited Creativity" et dont le site ne montre aucun travail créatif, aucun visuel de production, aucune image — c'est une contradiction que Sophie ressent en moins de 3 secondes, même si elle ne sait pas l'articuler.

**La vérité inconfortable :** en l'état, Sarani a un meilleur site que la plupart de ses concurrents sur le plan stratégique et éditorial. Et un site moins impressionnant que n'importe quelle agence créative sérieuse sur le plan visuel. Ces deux réalités coexistent.

**Le chemin vers 9/10 :** Ce site peut atteindre un niveau exceptionnel avec une seule catégorie de changements — intégrer le travail créatif réel. Logos SVG clients. Visuels de productions. Thumbnails de campagnes TikTok. Slides GEODIS. Bannières Sony. L'équipe Sarani a produit ces assets. Ils doivent apparaître sur le site. Ce n'est pas un projet de plusieurs mois — c'est une semaine de travail pour une équipe créative qui, par définition, livre en 24 heures.

**Recommandation de priorité absolue :** Corriger "6 continents → 5" (1 minute). Intégrer les logos SVG clients (1 journée). Remplacer les placeholders gris dans les case studies par des visuels réels (3-5 jours). Ces trois actions seules feraient passer ce site de 7.2 à 8.5.

---

---

## Hypothèses à valider

- [HYPOTHÈSE] L'analyse visuelle est basée sur le code source (TSX, CSS, composants). L'apparence réelle dans un navigateur peut différer selon la qualité du rendu des polices (Outfit), les animations CSS non documentées dans le code lu, et les assets éventuellement servis via des CDN non référencés dans les fichiers audités.
- [HYPOTHÈSE] La mention "6 Continents" dans `page.tsx` est traitée comme une erreur par rapport à "5 continents" présent dans toute la documentation. Si Sarani opère désormais réellement sur 6 continents (Amérique du Nord, Amérique du Sud, Europe, Afrique, Asie, Océanie/Australie), il faut mettre à jour la brand platform, le project-context.md et toute la documentation — pas seulement corriger le site.
- [HYPOTHÈSE] L'absence de visuels dans les case studies est interprétée comme des placeholders non remplis (commentaires dans le code le confirment : `{/* Hero image placeholder */}`, `{/* Gallery placeholder */}`). Si c'est un choix délibéré pour des raisons de NDA, cela doit être documenté et une alternative (mockups, illustrations, frames floutés) doit être envisagée.

---

**Handoff → @orchestrator**

- Fichier produit : `/home/user/Sarani/docs/reviews/creative-strategy-audit-v2.md`
- Décisions clés de cet audit :
  - Note globale 7.2/10 avec justification détaillée par axe
  - Problème n°1 identifié : absence de visuels créatifs (critique, bloquant pour la crédibilité de la promesse "Unlimited Creativity")
  - Incohérence factuelle identifiée : "6 continents" homepage vs "5 continents" partout ailleurs — correction urgente
  - Copy et cohérence tonale : niveau exceptionnel (9/10), aucune action requise sur ce plan
  - Garantie "First project satisfaction or no invoice" : répétée 7 fois, dilution de l'impact — réduire à 3-4 occurrences
- Points d'attention pour les agents suivants :
  - **@ux** : La priorité est l'intégration visuelle des assets créatifs (logos SVG, visuels case studies) — wireframes à produire pour la section portfolio homepage et les pages case study avec visuels
  - **@fullstack** : Corriger "6" → "5" dans `src/app/page.tsx` METRICS (ligne immédiate). Prévoir le composant logos SVG pour remplacer `client-logos.tsx`
  - **@copywriter** : Proposer des variations de la garantie pour les occurrences 4-7 (case studies, about closing CTA) afin d'éviter la dilution par répétition
  - **@design** : Le design system V2 est solide. Le travail restant est d'ordre photographique et éditorial (assets créatifs), pas de redesign
