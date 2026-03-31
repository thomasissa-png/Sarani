# Arya — Protocoles opérationnels

*Produit par @product-manager — 2026-03-31*

> Arya travaille en binôme avec une PM humaine. Chaque protocole a des gates de validation ⏸️ où la PM humaine valide avant de continuer.

---

## Vue d'ensemble

| Protocole | Trigger | Output | Durée estimée |
|-----------|---------|--------|---------------|
| PROTO-EMAIL-INTAKE | Email reçu sur team@sarani.studio | Brief structuré + projet créé | 5-10 min |
| PROTO-CLIENT-REPLY | Besoin de répondre à un client | Brouillon email Outlook | 2-3 min |
| PROTO-ASSET-REVIEW | Assets uploadés sur SharePoint | Rapport d'anomalies + statut ClickUp | 5-15 min |
| PROTO-QUOTE | Devis demandé | PDF devis premium | 5-10 min |
| PROTO-PROJECT-FOLLOWUP | Scan quotidien / relance | Drafts de relance | 5 min |
| PROTO-AI-TEAM | Brief faisable par IA | Livrables complets à 10/10 | 30-60 min |
| PROTO-PITCH | Pitch/présentation client | Deck de pitch | 20-30 min |

## Mode binôme PM humaine

Arya fait le travail. La PM humaine valide. Le symbole ⏸️ marque les points de validation humaine.

**Principes** :
- Arya ne fait RIEN d'irréversible sans validation (pas d'envoi email, pas de mise à jour ClickUp, pas de livraison client)
- Si la PM valide → Arya continue
- Si la PM corrige → Arya intègre et repropose
- Si la PM refuse → Arya escalade à @moi

---

## PROTO-EMAIL-INTAKE — Email reçu → Brief structuré

**Trigger** : Nouvel email sur team@sarani.studio
**Endpoint** : POST /api/admin/emails/classify + POST /api/admin/emails/[id]/import

### Étapes

1. **Classifier l'email** → POST /api/admin/emails/classify
   - client_brief → continuer le protocole
   - client_followup → rediriger vers PROTO-CLIENT-REPLY
   - noise → archiver automatiquement
   - new_client_potential → ⏸️ VALIDATION PM ("Nouveau prospect. Traiter ?")

2. **Matcher le client** → identification par domaine email
   - Client connu → charger le contexte (brand guidelines, tarifs, historique)
   - Client inconnu → ⏸️ VALIDATION PM ("Client non reconnu. Créer fiche client ?")

3. **Extraire et structurer le brief** → 6 sections Sarani (🌟✈️🚚📍💬➡️)
   - ⏸️ VALIDATION PM — "Voici le brief structuré. Corrections ?"
   - Critères : toutes les 6 sections remplies, deadline identifiée, 0 donnée inventée

4. **Brief-check IA** → POST /api/admin/brief-check
   - Si gaps détectés → préparer un draft de questions au client (PROTO-CLIENT-REPLY)
   - ⏸️ VALIDATION PM — "Le brief a X gaps. Envoyer les questions au client ?"

5. **Créer le projet** → ClickUp + SharePoint + Excel
   - Tâche ClickUp avec statut "Open", custom fields remplis
   - Dossier SharePoint dans l'arborescence client
   - Ligne ajoutée au tracker Excel
   - ⏸️ VALIDATION PM — "Projet créé. Confirmer ?"

**Output** : Brief structuré dans docs/pm/briefs/ + projet créé dans les 3 systèmes

---

## PROTO-CLIENT-REPLY — Réponse email client

**Trigger** : Email client nécessitant une réponse
**Endpoint** : POST /api/admin/emails/draft

### Étapes

1. **Analyser le contexte** → lire l'email, l'historique du projet ClickUp, les livrables en cours
2. **Rédiger le brouillon** au ton Sarani (miroir registre client, prénom, dynamique/pro/cool)
   - ⏸️ VALIDATION PM — "Voici le brouillon. Ajuster le ton ? Le contenu ?"
   - Critères : prénom du client, ton miroir, 0 donnée inventée, action claire
3. **Créer le draft Outlook** → POST /api/admin/emails/draft
   - La PM ouvre le lien Outlook, relit, et clique "Envoyer"

**Output** : Brouillon dans Outlook, prêt à envoyer

---

## PROTO-ASSET-REVIEW — Revue de livrables

**Trigger** : Assets uploadés dans le dossier SharePoint du projet
**Endpoint** : SharePoint Graph API (lecture fichiers)

### Étapes

1. **Scanner les assets** → lister les fichiers dans le dossier du projet SharePoint
2. **Vérifier vs le brief** → comparer :
   - Dimensions et formats attendus vs livrés
   - Nombre de livrables vs demandés
   - Langues/versions vs spécifiées dans le brief
3. **Détecter les anomalies** → rapport structuré :
   - ✅ Conforme : fichier X — dimensions OK, format OK
   - ❌ Anomalie : fichier Y — dimensions 728x90 attendu, reçu 600x400
   - ⚠️ Manquant : version FR non livrée
   - ⏸️ VALIDATION PM — "Voici le rapport de revue. Valider pour envoi au client ou retour designer ?"
4. **Mettre à jour ClickUp** → statut Internal Review → Client Review (si OK) ou retour au designer avec commentaires

**Output** : Rapport de revue dans docs/pm/asset-reviews/ + statut ClickUp mis à jour

---

## PROTO-QUOTE — Génération de devis

**Trigger** : Demande de devis pour un client/projet
**Endpoint** : POST /api/admin/quotes/prefill + POST /api/admin/quotes

### Étapes

1. **Identifier le client et le projet** → lookup dans le tracker Excel
2. **Récupérer les tarifs** → Excel tracker du client (colonne prix)
   - Si tarif trouvé → utiliser
   - Si tarif NON trouvé → STOP, marquer [PRIX À CONFIRMER PAR THOMAS], escalader à @moi
3. **Pré-remplir le devis** → POST /api/admin/quotes/prefill
   - Purpose of Work : 2 phrases (compréhension + livrables)
   - Line items depuis le brief
   - TVA auto si client français
   - ⏸️ VALIDATION PM — "Voici le devis pré-rempli. Prix corrects ? Scope complet ?"
4. **Générer le PDF** → POST /api/admin/quotes
   - PDF premium Sarani
   - Upload SharePoint
   - ⏸️ VALIDATION PM — "PDF généré. Envoyer au client ?"
5. **Préparer l'email d'envoi** → PROTO-CLIENT-REPLY avec le devis en pièce jointe

**Output** : PDF devis dans SharePoint + brouillon email Outlook
