# Specs techniques -- Automatisation visuelle du pipeline Case Study

> Date : 2026-04-03
> Auteur : @ia
> Statut : SPEC (pas encore code)
> Dependances : pipeline de generation existant (`src/app/api/admin/case-studies/candidates/[id]/generate/route.ts`)

---

## Vue d'ensemble

Deux features ajoutees au pipeline case study existant (3 steps) :

- **Feature 1 -- Auto-generation du visuel LinkedIn** (Step 5) : generer une image 1200x1200 au format du template Sarani via Satori (`next/og`)
- **Feature 2 -- Selection automatique de visuels SharePoint** (Step 4) : selectionner automatiquement les 3 meilleures images du dossier SharePoint du projet

Ordre du pipeline apres implementation :

```
Step 1: Creative Strategy (existant)
Step 2: Copywriter (existant)
Step 3: Social Media (existant)
Step 4: Auto-select visuals from SharePoint (NEW)
Step 5: Generate LinkedIn visual (NEW)
```

Step 4 avant Step 5 car le visuel LinkedIn a besoin des photos projet selectionnees.

---

## Feature 1 -- Auto-generation du visuel LinkedIn

### Decision d'architecture : Satori (`next/og`) -- pas DALL-E

**Verdict : Satori (via `next/og`)**

| Critere | Satori (`next/og`) | DALL-E 3 / OpenAI |
|---|---|---|
| Cout / image | 0$ (CPU local) | ~0.04$ (1024x1024) |
| Latence | < 500ms | 10-20s |
| Controle layout | Pixel-perfect, CSS deterministe | Aleatoire, pas de controle precis |
| Logos / photos | Embed direct (PNG/SVG) | Impossible d'injecter des logos fideles |
| Reproductibilite | 100% identique a chaque run | Variations a chaque generation |
| Fonts custom | Supportees (Outfit Bold via fetch) | Non |
| Deja en place | Oui (7 fichiers opengraph-image.tsx) | Non (API key OpenAI non configuree) |

DALL-E est ecarte : on a besoin d'un layout deterministe avec des logos precis, des photos reelles, et une police specifique. Satori fait ca nativement, gratuitement, en < 500ms. C'est le seul choix rationnel.

### Layout cible (template Thomas)

```
+------------------------------------------+
|           [gradient dark bg]              |
|                                           |
|    [pill: logo Sarani + logo client]      |
|                                           |
|    Titre du projet en Outfit Bold         |
|    (blanc + mot cle en #DA5126 Flame)     |
|                                           |
|  +-------+  +---------------------------+|
|  | photo |  |                           ||
|  |  sm   |  |       photo grande        ||
|  +-------+  |                           ||
|  +-------+  |                           ||
|  | photo |  +---------------------------+|
|  |  sm   |                               |
|  +-------+                               |
+------------------------------------------+
```

Dimensions : 1200 x 1200 px (format carre LinkedIn)

### Fichiers a creer

#### 1. `src/lib/case-studies/linkedin-visual.tsx`

Fonction principale qui genere l'image via `ImageResponse` (re-export de Satori depuis `next/og`).

```typescript
// Signature cible
export async function generateLinkedInVisual(params: {
  clientName: string;
  projectTitle: string;       // headline du case study
  accentWord: string;         // mot a mettre en Flame (#DA5126)
  clientLogoUrl?: string;     // URL du logo client (PNG)
  projectImages: string[];    // 2-3 URLs des photos projet (depuis SharePoint)
}): Promise<Buffer>
```

**Implementation** :
- Utiliser `ImageResponse` de `next/og` avec `size: { width: 1200, height: 1200 }`
- Background : gradient CSS `linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)`
- Pill en haut : `border-radius: 999px`, fond `rgba(255,255,255,0.08)`, bord `rgba(255,255,255,0.12)`. Contient logo Sarani (embed depuis `public/images/logo-sarani-white.png`) + logo client cote a cote
- Titre : Outfit Bold, 56px, blanc. Le `accentWord` en `#DA5126`. Determiner `accentWord` automatiquement : dernier mot du headline, ou le nom du client
- Photos : disposition asymetrique via flexbox. 1 grande a droite (~60% width), 2 petites empilees a gauche (~38% width). `border-radius: 16px`, `object-fit: cover`
- Font Outfit Bold : fetch depuis Google Fonts URL au runtime (pattern deja utilise par Satori)

**Contrainte Satori** : Satori ne supporte qu'un sous-ensemble de CSS (pas de `gap` parfois, pas de `grid`). Utiliser flexbox uniquement, `marginRight` au lieu de `gap`. Les images sont injectees via leur URL (fetch automatique par Satori).

**Contrainte images SharePoint** : les thumbnails SharePoint sont des URLs temporaires (auth Microsoft). Deux options :
- Option A : utiliser `createAnonymousSharingLink()` pour generer des URLs publiques temporaires avant de passer a Satori
- Option B : fetch les images server-side, les convertir en base64 data URIs, et passer les data URIs a Satori

**Recommandation : Option B** (base64). Plus fiable, pas de probleme d'expiration de lien, pas d'appel Graph supplementaire. Le fetch se fait dans le meme runtime Node.js.

#### 2. `src/app/api/admin/case-studies/candidates/[id]/linkedin-visual/route.ts`

Endpoint API qui :
1. Charge le candidate + ses outputs depuis la DB
2. Extrait le headline du case study output
3. Extrait les URLs des visuels selectionnes (heroImage, linkedInImage, emailHeader du case study output, ou `visualSuggestions` du candidate)
4. Appelle `generateLinkedInVisual()`
5. Retourne l'image en `Content-Type: image/png`

Cet endpoint peut aussi etre appele manuellement par le PM pour regenerer le visuel.

#### 3. Integration dans le pipeline (`generate/route.ts`)

Apres le Step 3 (Social) et le Step 4 (Visual selection -- voir Feature 2), ajouter :

```typescript
// Step 5: Generate LinkedIn Visual
await updatePipelineStatus(id, "step_5_linkedin_visual");
const visualBuffer = await generateLinkedInVisual({
  clientName: candidate.clientName,
  projectTitle: copyData.caseStudy.headline,
  accentWord: candidate.clientName, // fallback: dernier mot du headline
  clientLogoUrl: getClientLogoUrl(candidate.clientName),
  projectImages: [
    selectedVisuals.heroImage,
    selectedVisuals.linkedInImage,
    selectedVisuals.emailHeader,
  ].filter(Boolean),
});
```

Le buffer PNG est ensuite :
- Stocke sur SharePoint (meme dossier projet, sous-dossier `_sarani-generated/`) via l'API Graph `PUT` existante
- OU stocke en base64 dans un nouveau `caseStudyOutput` de type `linkedin_visual`

**Recommandation : stocker comme output DB** (type `linkedin_visual`) avec le buffer base64. Plus simple, pas de write SharePoint a implementer. Le PM peut telecharger depuis l'admin.

#### 4. `src/lib/case-studies/client-logos.ts`

Map statique des logos clients disponibles localement :

```typescript
const CLIENT_LOGOS: Record<string, string> = {
  "Sony": "/client-logo-sony.png",
  "IKEA": "/client-logo-ikea.png",
  "Bose": "/client-logo-bose.png",
  "adidas": "/client-logo-adidas.png",
  "TikTok": "/client-logo-tiktok.png",
  "LEGO": "/client-logo-lego.png",
};

export function getClientLogoUrl(clientName: string): string | undefined {
  // Exact match first, then case-insensitive
  return CLIENT_LOGOS[clientName]
    ?? Object.entries(CLIENT_LOGOS).find(
      ([k]) => k.toLowerCase() === clientName.toLowerCase()
    )?.[1];
}
```

Si pas de logo local, la pill n'affiche que le logo Sarani. Pas de generation/approximation de logo (regle absolue project-context.md).

### Schema DB : nouveau output type

Ajouter `linkedin_visual` aux output types acceptes :

```typescript
// Dans caseStudyOutputs, le champ outputType accepte deja du varchar(20)
// Valeurs existantes : case_study | linkedin_post | nurturing_email
// Nouvelle valeur : linkedin_visual
```

Le `content` pour ce type : `{ base64: string, width: 1200, height: 1200, mimeType: "image/png" }`

### Pipeline status : ajouter les nouveaux steps

```
pipelineStatus: idle | step_1_creative | step_2_copywriter | step_3_social
             | step_4_visuals | step_5_linkedin_visual | complete | failed
```

### Frontend : affichage du visuel genere

Dans le detail du candidate admin, afficher le visuel LinkedIn genere avec :
- Preview de l'image (decode base64 -> img src data URI)
- Bouton "Download" (declenche download du PNG)
- Bouton "Regenerate" (appelle l'endpoint `/linkedin-visual`)

---

## Feature 2 -- Selection automatique de visuels SharePoint

### Logique de selection

Apres le Step 3 (Social termine), le pipeline execute automatiquement :

1. **Fetch** les fichiers du dossier SharePoint du projet via l'API existante (`/api/admin/integrations/sharepoint/folders?url={sharePointFolderUrl}`)
2. **Filtrer** : garder uniquement les `mimeType.startsWith("image/")`
3. **Trier** par taille decroissante (hypothese validee : les fichiers les plus lourds sont les assets finaux haute qualite, pas les sources Photoshop/Illustrator). Exclure les fichiers > 50MB (probablement des PSDs)
4. **Selectionner** les 3 premiers comme : `heroImage` (le plus grand), `linkedInImage` (2e), `emailHeader` (3e)
5. **Stocker** dans `visualSuggestions` du candidate (champ existant dans le schema) ET dans le content du case study output

### Cas particuliers

- **Sous-dossiers** : le dossier SharePoint peut contenir des sous-dossiers (ex: `Sources/`, `Exports/`, `Final/`). Strategie : chercher d'abord un dossier nomme `Final`, `Export`, `Exports`, `Delivered`, `Livrables` (case-insensitive). Si trouve, chercher les images la-dedans. Sinon, chercher au root du dossier.
- **Pas assez d'images** : si < 3 images trouvees, remplir ce qui est disponible. Si 0 images, marquer `visualSuggestions` comme vide et logger un warning (pas d'erreur bloquante -- le pipeline continue).
- **Pas de `sharePointFolderUrl`** : si le candidate n'a pas de lien SharePoint, skip le Step 4 entierement. Logger un warning.

### Fichier a creer

#### `src/lib/case-studies/auto-select-visuals.ts`

```typescript
export interface AutoSelectedVisuals {
  heroImage?: { url: string; thumbnailUrl: string; name: string; size: number };
  linkedInImage?: { url: string; thumbnailUrl: string; name: string; size: number };
  emailHeader?: { url: string; thumbnailUrl: string; name: string; size: number };
  allImages: Array<{ url: string; thumbnailUrl: string; name: string; size: number }>;
  source: "auto" | "manual";
}

export async function autoSelectVisuals(
  sharePointFolderUrl: string,
  clientName?: string | null,
): Promise<AutoSelectedVisuals>
```

**Implementation** :
- Appeler directement les fonctions SharePoint (`listDriveItems`, `resolveSharePointUrl`, etc.) depuis `src/lib/integrations/sharepoint.ts` -- pas passer par l'API HTTP (on est deja server-side)
- Chercher un sous-dossier "final" d'abord
- Filtrer images, trier par taille, selectionner top 3
- Pour chaque image selectionnee, generer une URL de partage anonyme via `createAnonymousSharingLink()` (necessaire pour que Satori puisse fetch les images, et pour le stockage dans la DB)

### Integration dans le pipeline

Dans `generate/route.ts`, apres Step 3 :

```typescript
// Step 4: Auto-select visuals
let selectedVisuals: AutoSelectedVisuals | null = null;
if (candidate.sharePointFolderUrl) {
  try {
    await updatePipelineStatus(id, "step_4_visuals");
    selectedVisuals = await autoSelectVisuals(
      candidate.sharePointFolderUrl,
      candidate.clientName,
    );
    await savePipelineStep(id, 4, "visual-selector", {
      heroImage: selectedVisuals.heroImage?.url,
      linkedInImage: selectedVisuals.linkedInImage?.url,
      emailHeader: selectedVisuals.emailHeader?.url,
      totalImagesFound: selectedVisuals.allImages.length,
    });

    // Update visualSuggestions on candidate
    await db.update(caseStudyCandidates)
      .set({
        visualSuggestions: selectedVisuals.allImages.map((img) => ({
          url: img.url,
          name: img.name,
          thumbnailUrl: img.thumbnailUrl,
          selected: [
            selectedVisuals?.heroImage?.url,
            selectedVisuals?.linkedInImage?.url,
            selectedVisuals?.emailHeader?.url,
          ].includes(img.url),
        })),
        updatedAt: new Date(),
      })
      .where(eq(caseStudyCandidates.id, id));
  } catch (err) {
    // Non-bloquant : le pipeline continue sans visuels
    console.warn("Step 4 (visual selection) failed:", err);
    await savePipelineStep(id, 4, "visual-selector", {
      error: err instanceof Error ? err.message : "Unknown error",
      skipped: true,
    });
  }
}
```

### Update du case study output avec les visuels

Apres la selection, les URLs sont injectees dans le `content` du case study output :

```typescript
// Dans la transaction finale de sauvegarde des outputs
const caseStudyContent = {
  ...copyData.caseStudy,
  heroImage: selectedVisuals?.heroImage?.url,
  linkedInImage: selectedVisuals?.linkedInImage?.url,
  emailHeader: selectedVisuals?.emailHeader?.url,
};
```

Les champs `heroImage`, `linkedInImage`, `emailHeader` existent deja dans `CaseStudyOutputSchema` (optionnels, type `z.string().url().optional()`).

### Frontend : indication auto vs manual

Le `VisualSelector` existant continue de fonctionner pour la correction manuelle. Ajouts :
- Badge "Auto-selected" sur les visuels qui ont ete selectionnes automatiquement
- Le PM peut changer les visuels via le selecteur existant (override manuel)
- Si le PM change un visuel manuellement, le champ `source` passe de `"auto"` a `"manual"`

---

## Schema de sortie complet du pipeline (apres implementation)

```
Pipeline Step 1 -> StrategyOutput (existant)
Pipeline Step 2 -> CopyOutput (existant, case study + nurturing email)
Pipeline Step 3 -> SocialOutput (existant, LinkedIn post text)
Pipeline Step 4 -> AutoSelectedVisuals (NEW)
Pipeline Step 5 -> Buffer PNG LinkedIn visual (NEW)

DB outputs :
- case_study (enrichi avec heroImage/linkedInImage/emailHeader)
- linkedin_post (existant)
- nurturing_email (existant)
- linkedin_visual (NEW -- base64 PNG 1200x1200)
```

---

## Estimation cout / ROI

### Feature 1 (LinkedIn visual via Satori)
- **Cout** : 0$ (CPU local, pas d'API externe)
- **Temps humain economise** : ~15 min par case study (ouvrir Figma, placer les elements, exporter)
- **ROI** : infini (cout = 0, temps economise > 0)

### Feature 2 (Auto-selection visuels)
- **Cout** : 0$ supplementaire (appels SharePoint Graph API deja inclus dans le tenant M365)
- **Temps humain economise** : ~5 min par case study (ouvrir SharePoint, browse, selectionner, copier les URLs)
- **ROI** : infini (cout = 0, temps economise > 0)

### Latence ajoutee au pipeline
- Step 4 (auto-select) : ~2-5s (1-3 appels Graph API pour lister les fichiers + generer sharing links)
- Step 5 (LinkedIn visual) : < 1s (Satori render local)
- **Total ajoute** : ~3-6s sur un pipeline qui prend deja ~30-60s (negligeable)

---

## Ordre d'implementation recommande

1. **`src/lib/case-studies/client-logos.ts`** -- map statique, aucune dependance
2. **`src/lib/case-studies/auto-select-visuals.ts`** -- logique de selection SharePoint
3. **Integration Step 4 dans `generate/route.ts`** -- branche dans le pipeline
4. **`src/lib/case-studies/linkedin-visual.tsx`** -- composant Satori pour le visuel
5. **`src/app/api/admin/case-studies/candidates/[id]/linkedin-visual/route.ts`** -- endpoint standalone
6. **Integration Step 5 dans `generate/route.ts`** -- branche dans le pipeline
7. **Frontend : preview + download du visuel LinkedIn** -- dans la page detail admin
8. **Frontend : badge "Auto-selected" sur VisualSelector** -- indication UX

---

## Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Images SharePoint inaccessibles (token expire) | Step 4 echoue | Step 4 non-bloquant (try/catch, pipeline continue) |
| Pas de dossier SharePoint sur le candidate | Pas de visuels auto | Skip Step 4 + 5, le PM selectionne manuellement |
| Satori ne supporte pas certains CSS | Layout casse | Tester avec flexbox only, valider sur 3 case studies existants avant deploy |
| Images trop lourdes pour base64 en DB | Colonne jsonb trop grosse | Limiter le PNG a 1200x1200 (Satori gere ca nativement), compresser si > 2MB |
| Logo client absent | Pill incomplete | Afficher uniquement le logo Sarani (fallback gracieux) |
| Tri par taille ne donne pas les "meilleurs" visuels | Selection mediocre | Le PM peut corriger via VisualSelector (override manuel). V2 : utiliser vision model pour scorer la qualite |

---

**Handoff -> @fullstack**
- Fichiers produits : `docs/ia/case-study-visual-automation-specs.md`
- Decisions prises :
  - Satori (`next/og`) retenu pour la generation d'image (0$, < 500ms, controle pixel-perfect). DALL-E ecarte (cout, latence, pas de controle layout).
  - Selection par taille de fichier (heuristique simple). V2 possible avec vision model.
  - Step 4 (visuels) non-bloquant dans le pipeline. Step 5 (LinkedIn visual) depend de Step 4.
  - Stockage du PNG LinkedIn en base64 dans `caseStudyOutputs` (type `linkedin_visual`).
  - Images SharePoint convertie en base64 data URI avant passage a Satori (pas de sharing links temporaires).
- Points d'attention :
  - Tester le render Satori avec le layout asymetrique sur 2-3 case studies existants AVANT de deployer
  - La font Outfit Bold doit etre fetchee au runtime (Google Fonts URL) -- voir pattern utilise dans les `opengraph-image.tsx` existants
  - Le champ `pipelineStatus` du schema accepte `varchar(20)` -- les nouveaux statuts (`step_4_visuals`, `step_5_linkedin_visual`) tiennent en 20 chars
  - Les logos clients sont en `public/` -- utiliser les chemins absolus avec le host URL pour que Satori puisse les fetch
  - Aucun nouveau secret a configurer (pas d'API externe ajoutee)
