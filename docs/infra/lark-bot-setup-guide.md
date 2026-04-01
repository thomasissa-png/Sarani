# Guide de configuration du bot Lark — Sarani Arya Bot

Guide destiné à Thomas. Durée estimée : 20-30 minutes.

---

## Étape 1 — Créer l'application Lark

1. Ouvre le navigateur et va sur **https://open.larksuite.com/app**
2. Connecte-toi avec ton compte Lark (le compte admin de Sarani)
3. Tu arrives sur un tableau de bord. En haut à droite, clique sur le bouton **"Create Custom App"**
4. Un formulaire s'affiche avec deux champs :
   - **App Name** : tape `Sarani Arya Bot`
   - **App Description** : tape `Internal bot for project intake and client communication monitoring`
5. Clique sur **"Create"**
6. Tu arrives sur la page de configuration de ton app. Laisse cet onglet ouvert — tu y reviendras souvent dans la suite.

---

## Étape 2 — Configurer les permissions

1. Dans le menu de gauche, clique sur **"Permissions & Scopes"**
2. Tu vois un champ de recherche. Ajoute une par une les permissions suivantes en les cherchant et en cliquant **"Add"** à côté de chacune :
   - `im:message` — lire et envoyer des messages
   - `im:message.group_at_msg` — recevoir les messages de groupe
   - `im:chat` — accéder aux informations des conversations
   - `im:chat.group:readonly` — lire les informations des groupes
3. Une fois les 4 permissions ajoutées, elles apparaissent dans la liste avec le statut **"Added"**

> Ce sont les seules permissions nécessaires. N'en ajoute pas d'autres — moins de permissions = moins de risques.

---

## Étape 3 — Activer le bot

1. Dans le menu de gauche, clique sur **"Bot"**
2. Tu vois un bouton **"Enable Bot"** (ou un toggle à activer). Clique dessus.
3. Un formulaire te demande un **Bot Name** : laisse `Sarani Arya Bot` (pré-rempli)
4. Tu peux ignorer les champs "Webhook URL for bot" pour l'instant
5. Clique **"Save"**
6. Le statut passe à **"Bot Enabled"** — c'est bon.

> Le bot écoute seulement les messages — il ne répond pas automatiquement. Pas besoin de configurer de réponses.

---

## Étape 4 — Configurer le webhook (Event Subscription)

1. Dans le menu de gauche, clique sur **"Event Subscriptions"**
2. Dans le champ **"Request URL"**, colle cette adresse exacte :
   ```
   https://sarani-arya-backend.replit.app/api/webhooks/lark
   ```
   (remplace `sarani-arya-backend` par l'URL réelle de ton Replit si elle est différente)
3. **Encryption Strategy** : laisse sur **"None"** (pas de chiffrement — plus simple)
4. Un **Verification Token** s'affiche automatiquement (c'est une longue suite de lettres et chiffres). **Copie-le et note-le quelque part** — c'est ta valeur `LARK_VERIFICATION_TOKEN`
5. Clique sur **"Add Event"**
6. Dans la liste qui s'affiche, cherche `im.message.receive_v1` et clique **"Add"**
7. Clique **"Save"** pour enregistrer

---

## Étape 5 — Récupérer les credentials

1. Dans le menu de gauche, clique sur **"Credentials & Basic Info"**
2. Tu vois deux valeurs sur cette page :
   - **App ID** : une suite de caractères commençant par `cli_` → c'est ta valeur `LARK_APP_ID`
   - **App Secret** : clique sur **"Show"** pour l'afficher → c'est ta valeur `LARK_APP_SECRET`
3. Note tes 3 valeurs quelque part (ex : dans un fichier texte temporaire) :
   ```
   LARK_APP_ID=cli_xxxxxxxxxx
   LARK_APP_SECRET=xxxxxxxxxxxxxxxxxx
   LARK_VERIFICATION_TOKEN=xxxxxxxxxxxxxxxxxx  (récupéré à l'étape 4)
   ```

---

## Étape 6 — Ajouter le bot aux groupes TikTok dans Lark

1. Ouvre **Lark Messenger** (l'appli ou le navigateur)
2. Va dans le groupe TikTok où tu veux que le bot écoute
3. Clique sur le nom du groupe en haut pour ouvrir les **Settings du groupe**
4. Cherche la section **"Bots"** ou **"Add App/Bot"**
5. Clique sur **"Add Bot"**, cherche `Sarani Arya Bot`, et ajoute-le
6. Pour récupérer le **chat_id** du groupe (nécessaire pour la config) :
   - Envoie un message de test dans le groupe
   - Va sur **https://sarani-arya-backend.replit.app/api/admin/setup-webhooks** (POST depuis Postman ou curl) — le chat_id apparaîtra dans les logs Replit
   - Ou demande à l'équipe tech de le récupérer via les logs au premier message reçu
7. Répète l'opération pour chaque groupe TikTok à monitorer
8. Note tous les chat_ids sous cette forme : `["oc_xxxx","oc_yyyy"]`

---

## Étape 7 — Configurer les variables d'environnement dans Replit

1. Dans Replit, ouvre le projet backend Sarani
2. Dans le menu de gauche, clique sur l'icône **"Secrets"** (cadenas)
3. Ajoute ces 4 variables une par une :

| Nom de la variable | Valeur |
|---|---|
| `LARK_APP_ID` | l'App ID récupéré à l'étape 5 |
| `LARK_APP_SECRET` | l'App Secret récupéré à l'étape 5 |
| `LARK_VERIFICATION_TOKEN` | le token récupéré à l'étape 4 |
| `LARK_CHAT_IDS` | les chat_ids au format `["oc_xxxx","oc_yyyy"]` |

4. Redémarre le serveur Replit (bouton **"Run"**)

---

## Étape 8 — Tester que tout fonctionne

1. Dans Postman (ou un outil similaire), envoie une requête :
   ```
   POST https://sarani-arya-backend.replit.app/api/admin/setup-webhooks
   ```
   (avec un header `Authorization: Bearer [ton token admin]`)

2. Envoie un message test dans l'un des groupes TikTok Lark

3. Va dans le back-office Sarani → section **"Inbox"** ou **"Messages"**

4. Le message doit apparaître dans la liste avec le nom du groupe et le texte du message

> Si le message n'apparaît pas : vérifie que le bot a bien été ajouté au groupe (étape 6) et que les 4 variables Replit sont correctement renseignées (étape 7).

---

**En cas de problème** : consulte les logs Replit (onglet "Console") — les erreurs de webhook s'affichent en temps réel.
