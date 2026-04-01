# Guide de configuration du bot Lark — Sarani Arya Bot

Guide pour Thomas. Durée : ~15 minutes. Suit chaque étape dans l'ordre.

---

## Étape 1 — Créer l'application

1. Va sur **https://open.larksuite.com** dans ton navigateur
2. Connecte-toi avec ton compte Lark admin Sarani
3. Tu arrives sur le **Developer Backend** — un tableau de bord avec tes apps
4. Clique sur le gros bouton **"Create Custom App"** (en haut ou au centre de la page)
5. Un formulaire apparaît avec 3 champs :
   - **App Name** → tape : `Sarani Arya Bot`
   - **Description** → tape : `Internal bot — monitors project messages`
   - **App Icon** → tu peux ignorer (optionnel)
6. Clique **"Create"** en bas du formulaire
7. Tu es maintenant sur la page de configuration de ton app. **Le menu de gauche** a plusieurs sections — on va les parcourir une par une.

---

## Étape 2 — Ajouter la capacité Bot

**Avant** d'ajouter les permissions, il faut activer le bot.

1. Dans le **menu de gauche**, cherche **"Add Features"** ou **"Add App Capabilities"**
   - C'est dans la section du haut du menu, souvent sous "Credentials & Basic Info"
   - Sur certaines versions, ça s'appelle **"Features"** tout court
2. Tu vois une liste de capacités (Bot, Web App, Gadget, etc.)
3. Clique sur **"Bot"** → puis **"Add"** ou **"Enable"**
4. Un petit formulaire peut s'afficher :
   - **Bot Name** : laisse `Sarani Arya Bot`
   - **Bot Description** : `Monitors messages for project intake`
   - Ignore les autres champs (Webhook URL, etc.)
5. Clique **"Save"** ou **"Confirm"**
6. Tu devrais voir un check vert ✓ à côté de "Bot" — le bot est activé

---

## Étape 3 — Configurer les permissions

1. Dans le **menu de gauche**, clique sur **"Permissions & Scopes"**
   - Si tu ne vois pas ce nom exact, cherche **"Permission Management"** ou une icône de cadenas/bouclier
2. Tu arrives sur une page avec un **champ de recherche** en haut et une liste de permissions
3. Dans le champ de recherche, tape : `im:message`
4. Un résultat apparaît → clique sur le bouton **"Add"** (ou le "+" à droite)
5. Répète pour chaque permission ci-dessous (tape dans la recherche, puis "Add") :

| Permission à chercher | Ce qu'elle fait |
|---|---|
| `im:message` | Lire les messages |
| `im:message.group_at_msg` | Recevoir les messages de groupe |
| `im:chat` | Accéder aux conversations |
| `im:chat:readonly` | Lire les infos des groupes |

6. Vérifie que les 4 sont listées avec le statut **"Added"** ou **"Granted"**
7. Certaines permissions nécessitent une **approbation admin**. Si tu vois un bouton **"Request approval"** ou **"Batch activate"** en haut → clique dessus et approuve

---

## Étape 4 — Configurer les événements (webhook)

C'est ici que tu dis à Lark "quand un message arrive, préviens mon serveur".

1. Dans le **menu de gauche**, cherche **"Event Subscriptions"** ou **"Events & Callbacks"**
   - C'est souvent sous la section **"Features"** ou juste en dessous dans le menu
2. Tu vois une page avec deux options de mode :
   - **Long Connection (WebSocket)** — NE PAS choisir celui-là
   - **HTTP Callback / Webhook** — **CHOISIS celui-là**
3. Un champ **"Request URL"** apparaît. Colle cette adresse :
   ```
   https://TON-APP.replit.app/api/webhooks/lark
   ```
   ⚠️ Remplace `TON-APP` par le vrai nom de ton Replit (ex: `sarani-site.replit.app`)

4. **Verification Token** : sur cette même page, tu vois un token affiché (une longue chaîne de caractères).
   → **Copie-le** et garde-le — c'est ta variable `LARK_VERIFICATION_TOKEN`

5. **Encryption Key** : laisse vide (ou "None") — on n'en a pas besoin

6. Plus bas sur la page, il y a un bouton **"Add Event"**
7. Clique dessus → une fenêtre/popup s'ouvre avec un champ de recherche
8. Tape : `im.message.receive_v1`
9. Le résultat apparaît → clique **"Add"** ou **"Confirm"**
10. Clique **"Save"** en bas de la page

> ⚠️ Lark va tester l'URL immédiatement. Si ton serveur Replit n'est pas encore démarré, ça affichera une erreur — c'est normal. On reviendra valider après la configuration Replit.

---

## Étape 5 — Récupérer les credentials

1. Dans le **menu de gauche**, clique sur **"Credentials & Basic Info"**
   - C'est toujours le premier item du menu
2. Tu vois deux valeurs sur cette page :
   - **App ID** : commence par `cli_` → c'est ta variable `LARK_APP_ID`
   - **App Secret** : caché par défaut. Clique sur **"Show"** ou l'icône œil 👁 → c'est ta variable `LARK_APP_SECRET`
3. Récap — tu as maintenant 3 valeurs :
   ```
   LARK_APP_ID = cli_xxxxxxxxxx        (étape 5)
   LARK_APP_SECRET = xxxxxxxxxxxxxxxxx  (étape 5)
   LARK_VERIFICATION_TOKEN = xxxxxxxxx  (étape 4)
   ```

---

## Étape 6 — Publier l'app

L'app ne fonctionne pas tant qu'elle n'est pas publiée dans ton workspace.

1. Dans le **menu de gauche**, cherche **"Version Management & Release"** ou **"Publish"**
2. Clique sur **"Create Version"** ou **"Create a new version"**
3. Remplis :
   - **Version Number** : `1.0.0`
   - **Update Description** : `Initial release`
   - Vérifie que **"All employees"** est sélectionné comme scope (ou au minimum les utilisateurs concernés)
4. Clique **"Submit for review"** ou **"Publish"**
5. Si tu es admin du workspace, l'approbation est automatique
6. Attends quelques secondes — le statut passe à **"Published"** ou **"Approved"**

---

## Étape 7 — Ajouter le bot aux groupes TikTok

1. Ouvre **Lark Messenger** (l'appli desktop, mobile, ou web)
2. Va dans le **groupe TikTok** où tu veux que le bot écoute
3. Clique sur le **nom du groupe** en haut (barre de titre) → ça ouvre les paramètres du groupe
4. Cherche la section **"Bots"** ou **"Apps"** dans les paramètres
5. Clique **"Add Bot"** ou **"Add App"**
6. Cherche `Sarani Arya Bot` dans la liste
7. Clique **"Add"** → le bot apparaît dans la liste des membres du groupe
8. **Répète** pour chaque groupe TikTok à surveiller

**Pour récupérer les chat_ids :**
- Quand le bot est ajouté et que le serveur tourne, envoie un message test dans le groupe
- Regarde les logs Replit (onglet Console) — le chat_id s'affiche dans les logs (`chat_id: "oc_xxxx"`)
- Note chaque chat_id

---

## Étape 8 — Configurer Replit

1. Dans **Replit**, ouvre ton projet Sarani
2. Dans le panneau de gauche, clique sur **"Secrets"** (icône cadenas 🔒)
   - Ou va dans **Tools → Secrets**
3. Ajoute ces 4 variables (clique "New Secret" pour chaque) :

| Key | Value |
|---|---|
| `LARK_APP_ID` | `cli_xxxxxxxxxx` (étape 5) |
| `LARK_APP_SECRET` | `xxxxxxxxxxxxxxxxx` (étape 5) |
| `LARK_VERIFICATION_TOKEN` | `xxxxxxxxx` (étape 4) |
| `LARK_CHAT_IDS` | `oc_xxxx,oc_yyyy` (étape 7, séparés par des virgules) |

4. **Redémarre** le serveur Replit (Stop → Run)

---

## Étape 9 — Tester

1. Va dans ton navigateur et tape :
   ```
   https://TON-APP.replit.app/admin
   ```
2. Connecte-toi au back-office
3. Envoie un **message test** dans l'un des groupes TikTok sur Lark (ex: "Test message for Arya")
4. Reviens dans le back-office → **Inbox**
5. Le message devrait apparaître dans les secondes qui suivent

**Si ça ne marche pas :**
- Vérifie les logs Replit (Console) — les erreurs s'affichent en temps réel
- Vérifie que l'app est publiée (étape 6)
- Vérifie que le bot est dans le groupe (étape 7)
- Vérifie que les 4 Secrets Replit sont corrects (pas d'espace en trop)
- Retourne dans la console Lark → Event Subscriptions → re-sauvegarde l'URL webhook

---

**C'est terminé.** Arya écoute maintenant les messages Lark en temps réel. Chaque message dans les groupes TikTok sera classifié et apparaîtra dans ton inbox.
