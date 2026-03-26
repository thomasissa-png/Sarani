# Sarani Back-Office — Specs Fonctionnelles : Authentification Email/Mot de passe

*Produced by @product-manager — 2026-03-25*
*Language: Français (document interne)*

---

## 1. Objectif

### Problème résolu

L'authentification actuelle repose sur un **mot de passe unique partagé** (`ADMIN_PASSWORD` en variable d'environnement). Ce mécanisme présente trois problèmes :

1. **Sécurité nulle** : un seul credential partagé entre tous les utilisateurs. En cas de fuite ou départ d'un collaborateur, il faut changer le mot de passe pour tout le monde.
2. **Zéro traçabilité** : impossible de savoir qui a fait quoi dans le back-office (aucun audit trail possible).
3. **Pas scalable** : l'arrivée des client managers (v2) et la sensibilité des données (briefs clients, contrats Legal IA, stratégies créatives) exigent un contrôle d'accès différencié.

### Ce que cette feature résout

- Chaque utilisateur a **ses propres credentials** (email + mot de passe personnel)
- Deux niveaux de permissions : `admin` (Thomas + responsable ops) et `user` (client managers)
- Suppression ou désactivation d'un compte sans impact sur les autres
- Base pour un audit trail futur (qui a utilisé quel agent, quand)

### Lien KPI

Cette feature est une **dépendance technique** (pas une feature de croissance) — elle débloque le déploiement du back-office à l'équipe élargie (v2 client managers). Sans elle, le KPI "gagner 2h/jour par utilisateur" (ai-team-specs.md §1) reste limité à 2 utilisateurs.

---

## 2. Rôles et permissions

### Définition des rôles

| Rôle | Qui | Nombre v1 |
|------|-----|-----------|
| `admin` | Thomas (fondateur) + Responsable des opérations | 2 |
| `user` | Client managers (v2) | 0 en Phase 1, ~5 en Phase 2 |

### Tableau de permissions détaillé

| Fonctionnalité | `admin` | `user` |
|---|---|---|
| **Agents IA — accès** | Tous les 13 agents | [QUESTION OUVERTE Q-3] |
| **Agent PM IA** | Oui | Oui (si accès accordé) |
| **Agent Translator** | Oui | Oui |
| **Agent Creative Strategist** | Oui | Oui |
| **Agent Graphic Designer IA** | Oui | Oui |
| **Agent Legal IA** | Oui | [QUESTION OUVERTE Q-3] |
| **Agent Social IA** | Oui | Non — contenu Sarani uniquement |
| **Agent SEO IA** | Oui | Non — contenu Sarani uniquement |
| **Agent Copywriter IA** | Oui | Oui |
| **Agent Proposal/Pitch IA** | Oui | Oui |
| **Agent Presentation IA** | Oui | Oui |
| **Agent Email Drafter IA** | Oui | Oui |
| **Agent Video Script IA** | Oui | Oui |
| **Agent QA/Proofreader IA** | Oui | Oui |
| **Fiches clients — lecture** | Tous les clients | Ses clients uniquement [QUESTION OUVERTE Q-1] |
| **Fiches clients — création/édition** | Oui | Non (lecture seule) |
| **Fiches clients — suppression** | Oui | Non |
| **Outputs IA — lecture** | Tous les clients | Ses clients uniquement [QUESTION OUVERTE Q-1] |
| **Outputs IA — téléchargement** | Oui | Ses outputs uniquement [QUESTION OUVERTE Q-1] |
| **Gestion des utilisateurs** | Oui (CRUD complet) | Non |
| **Dashboard ClickUp/Evoliz** | Oui | Non (Phase 3) |
| **Paramètres back-office** | Oui | Non |
| **Reset password d'un autre user** | Oui | Non |

### Règles métier de permissions

- **BR-AUTH-01** : Un `user` ne peut jamais élever ses propres permissions.
- **BR-AUTH-02** : Un `admin` ne peut pas supprimer son propre compte s'il est le dernier admin actif.
- **BR-AUTH-03** : Un compte désactivé ne peut pas se connecter mais ses données (outputs, historique) sont conservées.
- **BR-AUTH-04** : Le premier compte admin est créé par seed à l'initialisation (voir US-AUTH-04).

---

## 3. User stories

### US-AUTH-01 — Login email/mot de passe

```
GIVEN un utilisateur sur /admin/login
WHEN il saisit un email enregistré et son mot de passe correct
THEN il est redirigé vers /admin/dashboard avec une session active (cookie httpOnly, secure, sameSite=lax)

GIVEN un utilisateur sur /admin/login
WHEN il saisit un email inconnu OU un mot de passe incorrect
THEN un message d'erreur générique s'affiche ("Invalid email or password")
     ET aucun détail ne révèle si l'email existe ou non (protection énumération)

GIVEN un utilisateur qui a échoué 5 tentatives de login consécutives
WHEN il tente une 6ème connexion
THEN le compte est temporairement verrouillé (15 min) et un message l'informe
     ET un email de notification est envoyé à l'admin [QUESTION OUVERTE Q-4]
```

**Edge cases :**
- Email avec majuscules → normaliser en lowercase avant comparaison
- Whitespace en début/fin email → trimmer avant comparaison
- Session expirée (durée : 24h) → redirection vers /admin/login avec message "Session expired"
- Tentative d'accès à /admin/* sans session → redirection vers /admin/login

---

### US-AUTH-02 — Admin crée un utilisateur

```
GIVEN un admin connecté sur /admin/users/new
WHEN il saisit un email valide, un rôle (admin|user) et soumet
THEN un nouveau compte est créé avec un mot de passe temporaire généré
     ET un email est envoyé à l'utilisateur avec un lien de définition de mot de passe (valable 48h)
     ET le compte est en statut "pending" jusqu'au premier login

GIVEN un admin qui tente de créer un compte avec un email déjà existant
WHEN il soumet le formulaire
THEN une erreur s'affiche ("This email is already registered")
     ET aucun email n'est envoyé
```

**Edge cases :**
- Email invalide (format) → validation client-side avant soumission
- Lien d'invitation expiré (>48h) → l'admin doit renvoyer une invitation depuis /admin/users
- Admin crée un autre admin → action autorisée, loggée

---

### US-AUTH-03 — User tente d'accéder à une page admin-only

```
GIVEN un user connecté avec rôle `user`
WHEN il tente d'accéder à /admin/users (gestion utilisateurs)
THEN il est redirigé vers /admin/dashboard avec un message "Access restricted"
     ET l'action est loggée [si audit trail activé — voir Q-4]

GIVEN un user connecté avec rôle `user`
WHEN il tente d'accéder via l'URL directe à /admin/settings
THEN même comportement : redirect + message

GIVEN un user connecté avec rôle `user`
WHEN il navigue normalement dans les sections autorisées
THEN les éléments de navigation admin-only (Users, Settings) sont masqués dans le menu
     ET non seulement masqués mais protégés côté serveur (middleware)
```

**Règle critique** : la protection est **côté serveur** (middleware Next.js), jamais seulement côté client. Masquer un lien dans le menu n'est pas suffisant.

---

### US-AUTH-04 — Premier login (seed admin)

```
GIVEN une instance back-office fraîchement déployée (table users vide)
WHEN le script de seed est exécuté (npm run seed ou automatique au démarrage)
THEN un compte admin est créé avec :
     - Email : défini en variable d'environnement ADMIN_SEED_EMAIL
     - Mot de passe : défini en variable d'environnement ADMIN_SEED_PASSWORD
     ET un warning est loggé en console : "SEED ADMIN CREATED — Change password immediately"

GIVEN le compte admin seed existant
WHEN Thomas se connecte pour la première fois
THEN il est redirigé vers /admin/profile avec un prompt "Please change your password"
     (recommandé — voir Q-2 sur l'obligation ou non du forced password change)
```

**Edge cases :**
- Le script de seed ne s'exécute pas si un compte admin existe déjà (idempotent)
- Si ADMIN_SEED_EMAIL n'est pas défini en env → erreur claire au démarrage, pas de seed silencieux

---

### US-AUTH-05 — Logout

```
GIVEN un utilisateur connecté
WHEN il clique sur "Sign out"
THEN la session est invalidée côté serveur (cookie supprimé + session en BDD marquée invalide)
     ET il est redirigé vers /admin/login
```

---

## 4. Questions ouvertes — à valider avant implémentation

| ID | Question | Impact si non tranché | Défaut suggéré |
|----|-----------|-----------------------|----------------|
| **Q-1** | Les `user` peuvent-ils voir les outputs de TOUS les clients, ou uniquement ceux auxquels ils sont assignés ? | Architecture de la table `user_clients` (relation many-to-many) | Leurs clients uniquement (principe moindre privilège) |
| **Q-2** | Faut-il un "reset password" en self-service (email) pour Phase 1, ou uniquement un reset admin ? | Si oui : intégration Resend requise pour l'email de reset | Reset admin uniquement pour Phase 1 (plus simple, 2 utilisateurs) |
| **Q-3** | Les `user` ont-ils accès à tous les agents ou seulement certains ? Lesquels sont bloqués ? | Granularité des permissions : rôle global vs permissions par agent | Legal IA et Social IA bloqués pour `user` (données sensibles / contenu Sarani) |
| **Q-4** | Faut-il logger les actions utilisateur (audit trail) en Phase 1 ? | Si oui : table `action_logs` à prévoir dans le schema BDD dès maintenant | Non pour Phase 1 — prévoir la table mais ne pas l'afficher |

---

## 5. Risques et edge cases

### Risque 1 — Session token sécurité (CRITIQUE — déjà identifié)

Le code-audit.md (@qa, 2026-03-25) a identifié que le **token de session actuel est en base64 non chiffré** (CRIT-01). La migration vers email/password doit utiliser des sessions sécurisées :
- **Recommandation** : `iron-session` ou `next-auth` avec JWT signé (secret en env var)
- Ne pas répliquer le pattern btoa() existant
- Cookie : httpOnly + secure + sameSite=lax + maxAge 86400 (24h)

### Risque 2 — Hachage des mots de passe

- **Obligatoire** : `bcrypt` avec cost factor 12 (ou `argon2id`)
- Ne jamais stocker le mot de passe en clair ni en base64
- Le sel est automatique avec bcrypt

### Risque 3 — Énumération d'emails

- Le message d'erreur est toujours générique : "Invalid email or password"
- Même durée de réponse pour email inconnu et mot de passe incorrect (éviter le timing attack)

### Risque 4 — Migration depuis le mot de passe partagé

- Le `ADMIN_PASSWORD` actuel doit être **retiré** des env vars après migration
- Toutes les routes actuellement protégées par ce middleware doivent basculer sur le nouveau système
- Vérifier qu'aucune route `/admin/*` ne conserve l'ancien check en parallèle

### Risque 5 — Rate limiting

- Le rate limiting actuel sur `/api/contact` (3 req/IP/heure) doit être adapté pour `/api/auth/login`
- Recommandation : 5 tentatives/IP/15min pour le login (plus permissif que le contact form car usage légitime plus fréquent)

---

## 6. Implémentation existante — état des lieux

### Ce qui est déjà codé (d'après le code-audit.md)

| Composant | État | Notes |
|-----------|------|-------|
| Middleware auth `/admin/*` | Existant | Basé sur `ADMIN_PASSWORD` + btoa — à remplacer intégralement |
| Table `users` (BDD) | À créer | Schema à définir (email, password_hash, role, status, created_at) |
| Cookie de session | Existant mais non sécurisé | CRIT-01 code-audit.md — btoa() reversible |
| Rate limiting | Absent sur routes auth | À implémenter |
| Route `/admin/login` | Existante | Form UI probablement présent, logique à refactorer |

### Décisions d'architecture validées (project-context.md)

- Même app Next.js, route `/admin` (pas de sous-domaine)
- Pas d'OAuth, pas d'IP restriction
- Simple email/password uniquement
- Déploiement : Replit

### Ce qui reste à construire

1. **Schema BDD** : table `users` (id, email, password_hash, role, status, created_at, last_login)
2. **API routes** : POST /api/auth/login, POST /api/auth/logout, POST /api/auth/users (admin only)
3. **Middleware** : vérification session + rôle sur chaque route `/admin/*`
4. **UI** : /admin/login (form email/password), /admin/users (liste + création)
5. **Seed script** : création admin initial depuis env vars

---

## Hypothèses à valider

| ID | Hypothèse | À valider par |
|----|-----------|---------------|
| H-01 | Le reset password self-service n'est pas requis en Phase 1 (2 utilisateurs admin seulement) | Thomas |
| H-02 | Les `user` (client managers) n'ont pas accès à Legal IA et Social IA (contenu interne Sarani) | Thomas |
| H-03 | La durée de session à 24h est acceptable pour l'équipe (usage quotidien) | Thomas + Resp. ops |
| H-04 | L'email de notification en cas de compte verrouillé n'est pas requis Phase 1 | Thomas |

---

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Sarani/docs/product/auth-specs.md`
- Décisions prises :
  - Deux rôles : `admin` et `user` — permissions tableau §2
  - Session sécurisée obligatoire (iron-session ou JWT signé) — le pattern btoa() actuel est un CRIT-01 à éliminer
  - Seed admin depuis env vars ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD (idempotent)
  - Protection middleware côté serveur impérative — jamais côté client seul
  - bcrypt cost 12 pour le hachage des mots de passe
- Points d'attention :
  - CRIT-01 (code-audit.md) : le token session btoa() doit disparaître dans cette migration
  - 4 questions ouvertes (Q-1 à Q-4) à valider avec Thomas avant de coder les permissions granulaires
  - Le script seed doit être idempotent (ne pas recréer l'admin s'il existe déjà)
  - Rate limiting à implémenter sur /api/auth/login (5 tentatives/IP/15min)
  - Migration depuis ADMIN_PASSWORD : vérifier qu'aucun ancien check ne subsiste après migration
