# Préférences Fondateur — Thomas (Sarani)

> Ce fichier est la source de vérité pour l'agent @moi.
> Chaque entrée est une observation factuelle extraite des sessions.
> URL cross-projets : https://raw.githubusercontent.com/thomasissa-png/Agent-Team/main/docs/founder-preferences.md

---

## Identité et communication

- [S6] Thomas ne veut JAMAIS être mentionné par son nom sur le site public — "the founding team" uniquement. Pas de storytelling individuel.
- [S6] La communication client est informelle et chaleureuse : "on connait nos clients et on les aime bien". Matcher le registre du client, utiliser le prénom, jamais de corporate boilerplate ("I hope this email finds you well").
- [S6] Thomas préfère left-aligned pour les pages web — positionnement premium agence, pas SaaS.

## Qualité et standards

- [S6] Les documents client-facing (devis, proposals) doivent être au même niveau de design que le site web. Thomas juge "simpliste" un devis sans branding — pour une agence de designers, c'est rédhibitoire.
- [S6] Le format de brief interne utilise des emojis spécifiques (🌟 Introduction, ✈️ Brief, 🚚 Deliverables, 📍 Source Files, 💬 Branding, ➡️ Others). Les templates doivent correspondre aux outils réels de l'équipe.
- [S6] Thomas insiste sur les garde-fous : un champ "description" ne doit JAMAIS contenir une URL brute, un brief complet, ou des métadonnées internes. Toujours sanitizer.

## Décisions techniques

- [S6] Back-office : les icônes seules ne suffisent pas pour les actions — Thomas préfère des labels texte lisibles (Quote/Excel/ClickUp/Files).
- [S6] Les devis doivent supporter EN et FR — sélecteur de langue dans le formulaire. Les conditions de paiement sont par client, pas globales.
- [S6] La sidebar du back-office doit être simple et opérationnelle. Thomas a validé la simplification de 20+ items à 16, avec Translator en tête des agents IA (usage quotidien le plus fréquent).

## Processus et workflow

- [S6] Thomas veut que le flux email→brief soit automatisé : import depuis la boîte team@sarani.studio, pré-remplissage du formulaire par le PM IA, génération de la réponse client.
- [S6] Les PO ouverts depuis > 60 jours doivent être visuellement flaggés dans le tracker (badge warning orange).
- [S6] Division/pays doit être visible dans le tracker (Sony France, pas juste Sony) mais les suffixes internes (- Hors CM) doivent être retirés.

## IA et prompts

- [S15→S16 CORRIGÉ] Thomas préfère un alias de modèle stable (`claude-sonnet-4-6-latest`) plutôt qu'une version datée. ATTENTION : `claude-sonnet-4-latest` (sans le -6-) n'est PAS un alias Anthropic valide — retourne 404. Le bon alias est `claude-sonnet-4-6-latest`. À mettre à jour quand la famille 4.7 sortira.
- [S6] Thomas considère le prompt engineering comme un actif stratégique — veut "le meilleur prompt du monde possible" avant toute implémentation IA (vidéo, image, texte). Le prompt library est un livrable à part entière, pas un détail technique.
- [S6] Pour la vidéo IA : le prompt doit contrôler composition, mouvement caméra, éclairage, cohérence inter-scènes, style. @ia doit le tester sur les 4 cas d'usage Sarani et itérer jusqu'à 9/10.
- [S7] Thomas a validé l'abandon de PiAPI + Kling 2.6 au profit de Veo 3.1 + Runway Gen-4 + Kling 3.0 — critère #1 : qualité du rendu, pas le prix.

## Qualité et standards

- [S7] Thomas exige 10/10 sur TOUS les livrables, pas de "bon enough". Chaque livrable doit être audité par les agents spécialisés (@reviewer, @design, @qa) AVANT présentation.
- [S7] Grille de validation visuelle Thomas (7 critères, chacun 10/10) : PRO, BEAU, SARANI, MÊME IDENTITÉ QUE LE SITE, PROPRE, BIEN ALIGNÉ, AÉRÉ.
- [S7] Les montants dans les tableaux financiers DOIVENT être alignés à droite. Standard comptable non négociable.

## UX et design des pages

- [S8] **Conviction-first, not conversion-first.** Chaque page doit correspondre à l'INTENTION du visiteur. Les CTAs commerciaux ("Start a project") ne doivent apparaître qu'en conclusion d'une page de conviction, PAS en hero. Seules les pages d'action (homepage hero, contact) ont des CTAs above-the-fold. Pages d'évaluation (Services, Work), d'éducation (Blog), de conviction (About) = CTA en fin de parcours uniquement.
- [S8] **H1 uniques par page.** Chaque page doit avoir un H1 qui répond à "pourquoi suis-je sur CETTE page ?". Si le H1 pourrait être sur une autre page du site, il est trop générique.
- [S8] **CTA texte BLANC sur Flame.** Thomas a explicitement rejeté le texte noir sur Flame (ne ressort pas). Le blanc est WCAG AA pour le large text (bold 16px+ = 3.94:1 > 3:1 seuil).
- [S8] **Hero homepage = dots animés uniquement.** Le grid d'images a été rejeté ("cata"). Les dots colorés (Flame/Cerulean/Lemon) sont la signature créative du logo Sarani — ne JAMAIS remplacer par des images, carrousel, ou visuel statique.
- [S8] **Footer categories = liens avec filtre actif.** Cliquer une catégorie dans le footer doit amener directement sur /work avec le filtre correspondant pré-activé.

## Ton des réponses client (registre Sarani)

- [S9] **Le ton Sarani dans les réponses client** : dynamiques, pro et bons, toujours cool et toujours dispo. On ne fait jamais "corporate lourd". On est l'agence qui répond vite, qui comprend le besoin, et qui donne confiance.
- [S9] **Miroir de la langue reçue** : si le client écrit en français → réponse en français. En anglais → anglais. En allemand → allemand. Toujours la même langue que le mail reçu.
- [S9] **Miroir du registre** : si le client écrit casual → casual. Formel → formel. Mais toujours dans le style Sarani (jamais "Nous accusons réception de votre demande" → plutôt "Reçu ! On s'en occupe.").
- [S9] **Prénom du client** : toujours utiliser le prénom. On connait nos clients et on les aime bien.
- [S9] **Structure d'une réponse client type** : (1) Confirmation de réception, (2) Résumé de ce qu'on a compris (montre la compréhension), (3) Si infos manquantes → les demander naturellement (pas une liste froide), (4) Délai estimé ou "on revient vers toi d'ici [X]", (5) Signature Sarani.
- [S9] **La réponse est un draft** que Thomas/le client manager valide avant envoi — jamais envoyée automatiquement.

## Automatisation et autonomie

- [S7] Thomas veut l'automatisation maximale — les case studies doivent être "générés tout seul" sans intervention humaine. Chaque feature doit fonctionner en autonomie par défaut.
- [S7] Les proposals commerciaux doivent être des liens web (pas PDF), pré-remplis avec les données Sarani (case studies, conditions unlimited revisions/D+1, références clients).
- [S7] Thomas préfère les flux progressifs avec points de validation intermédiaires (brief → storyboard → vidéo) plutôt que les flux directs (brief → vidéo).
- [S8] **Les images des livrables clients sont dans SharePoint** — toujours les utiliser (via API Graph) plutôt que demander à Thomas de fournir des assets. Les dossiers "Batch" contiennent les visuels de production réels.

## Back-office et workflow PM

- [S10] **Le back-office est une inbox de validation, pas un panneau de contrôle.** Arya prépare, la PM valide. 5 écrans max (Inbox, Projects, Clients, Arya, Settings), pas 20 pages d'outils.
- [S10] **Emails = brouillons, pas d'envoi direct.** Arya crée des drafts Outlook. La PM a toujours le dernier mot — elle ouvre le brouillon et clique "Envoyer" elle-même.
- [S10] **Arya n'est pas soumise.** Elle prend du recul, challenge les briefs flous, recommande des alternatives, et escalade à Thomas (@moi) quand elle ne sait pas. Comme une vraie chef de projet.
- [S10] **Les connaissances Arya doivent être PERTINENTES et UTILISÉES.** Chaque entrée passe le test "est-ce que ça change la façon dont on traite le prochain projet ?" Et Arya charge activement ses connaissances à chaque interaction.
- [S10] **Knowledge base par client/division/individu ET par membre d'équipe.** Arya connaît ses clients ET son équipe — style, forces, axes d'amélioration, préférences.
- [S10] **L'audit par l'agent utilisateur est le meilleur test.** Arya qui audite son propre back-office détecte des gaps que @qa/@design/@ux ratent — perspective métier terrain.
- [S10] **Les équipes IA doivent couvrir TOUTES les familles de projets** (vidéo, design, social, marketing, événementiel, traduction, présentation, juridique, email, publicité, identité, SEO). Thomas veut une review à 10/10 via gates spécifiques par type.

## Contenu LinkedIn et case studies

- [S17] **Pas de CTA commercial systématique sur LinkedIn.** 7 types de fermeture créatifs (Open Debate, Uncomfortable Observation, Experience Prompt, Quiet Teaser, Peer Acknowledgement, Provocation Without Resolution, Nothing/Strong Close). "Start a project → sarani.studio" va dans la bio LinkedIn, PAS dans les posts.
- [S17] **Pas de hashtags sur les posts LinkedIn.** Thomas les trouve inutiles.
- [S18] **Ton LinkedIn RÉVISÉ :** léger, un peu drôle, tout en restant pro. On connaît nos forces, on s'assume et on joue avec. L'objectif n'est PAS de se mettre en avant mais d'**entertainer**. Un post qui dit "on a fait ça, c'était bien et pas cher" = tout le monde s'en fout. Il faut des éléments de story, du wit, quelque chose qui donne envie de lire.
- [S18] **Le hook est CLÉ.** LinkedIn n'a pas de titre — la première ligne EST le post. Elle doit stopper le scroll immédiatement.
- [S18] **Les posts ne sont pas forcément longs** mais ils doivent apporter une VALEUR (insight, histoire, humour, angle inattendu).
- [S18] **5-10 façons d'écrire les posts** pour éviter la monotonie, mais TOUTES doivent respecter : entertaining, ton léger+pro, hook fort, valeur ajoutée.
- [S17] **Titre visuel LinkedIn = 2-4 mots style poster** ("I RUN STORE", "BLACK FRIDAY", "350 SLIDES"). Pas une phrase. Comme un titre de magazine.
- [S17] **Visuels LinkedIn auto-générés via Satori (0$).** DALL-E écarté car impossible d'injecter des logos fidèles. Template : fond dark, pill Sarani + client, titre gros, 2-3 photos asymétriques.
- [S17] **Auto-sélection visuels + possibilité de changer.** L'IA sélectionne les 3 meilleures images du dossier SP, Thomas peut les changer via l'interface.
- [S17] **Logo client éditable.** Thomas veut pouvoir changer le logo client sur le visuel LinkedIn depuis l'interface.
