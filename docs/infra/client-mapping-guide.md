# Sarani — Mapping ClickUp ↔ SharePoint ↔ Excel

> Ce fichier documente comment les 3 systemes sont connectes.
> Source de verite : `src/lib/integrations/config.ts`
> Derniere mise a jour : 2026-03-28

---

## Comment ca marche

Quand un projet est cree ou synchronise, le systeme fait le lien entre :

1. **ClickUp** (gestion de projet) → chaque client a un "Space" avec un ID unique
2. **SharePoint** (fichiers et assets) → chaque client a un dossier dans `Documents/03. Customers/`
3. **Excel** (suivi financier) → chaque client a un fichier tracker dans `00. Administrative/03. Financials (Trackers)/`

---

## Tableau de mapping

| Client | ClickUp Space | ClickUp ID | Fichier Excel Tracker | Dossier SharePoint Assets |
|--------|--------------|------------|----------------------|--------------------------|
| **Sony** | Sony | 90100452675 | 01. Sarani_Sony Projects.xlsx | 02. Sony |
| **TikTok** | TikTok | 90050434316 | 02. Sarani_Bytedance Projects.xlsx | 05. TikTok |
| **PICO XR** | PICO XR | 90050434327 | 02. Sarani_Bytedance Projects.xlsx | 05. TikTok |
| **Clients divers** | Other customers | 90050435651 | 03. Sarani_Other Projects.xlsx | 01. Single Projects |
| **Aristocrat** | Aristocrat | 90174878459 | 04. Sarani_Aristocrat Projects.xlsx | 11. Aristocrat |
| **Ubi** | Ubi | 90171040997 | 09. Sarani_Projets Ubi.xlsx | 17. Ubi |
| **Aujan** | Aujan | 90171121804 | 10. Sarani_Aujan Projects.xlsx | 18. Aujan |
| **Bose** | Bose | 90171343766 | 11. Sarani_Bose Projects.xlsx | 19. Bose |
| **Lamarck** | Lamarck | 90172906076 | 12. Sarani_Lamarck Projects.xlsx | 21. Lamarck |
| **CMC Markets** | CMC Markets | 90172572190 | 13. Sarani_CMC Markets Project.xlsx | 20. CMC Markets |

---

## Clients sans mapping (pas de tracker Excel)

| Client | ClickUp Space | ClickUp ID | Note |
|--------|--------------|------------|------|
| Brand Native | Brand Native | 90050436581 | Pas de tracker ni de dossier assets mappe |
| Sarani (interne) | Sarani | 90050433950 | Projets internes |

---

## Chemins SharePoint

| Systeme | Drive | Chemin de base |
|---------|-------|---------------|
| **Trackers Excel** | OneDrive team@sarani.studio | `/00. Administrative/03. Financials (Trackers)/` |
| **Assets clients** | Site SaraniAssets | `/Documents/03. Customers/` |
| **Tracker global** | OneDrive team@sarani.studio | `/00. Administrative/03. Financials (Trackers)/00. Global Overview.xlsx` |

---

## Noms des feuilles Excel

Le systeme essaie ces noms de feuille dans l'ordre :
1. `Sheet1`
2. `Feuil1`
3. `Feuille1`

---

## Comment ajouter un nouveau client

1. Creer le Space dans ClickUp → noter l'ID du Space
2. Creer le fichier Excel tracker dans SharePoint (`/00. Administrative/03. Financials (Trackers)/XX. Sarani_[Client] Projects.xlsx`)
3. Creer le dossier assets dans SharePoint (`/Documents/03. Customers/XX. [Client]`)
4. Ajouter l'entree dans `src/lib/integrations/config.ts` → `CLIENT_MAPPINGS`
5. Deployer

---

## Notes

- **PICO XR** et **TikTok** partagent le meme fichier Excel (Bytedance) et le meme dossier assets (05. TikTok) car PICO est une filiale de ByteDance
- **"Other customers"** est un fourre-tout pour les clients ponctuels sans Space dedie
- Le **Global Overview** (`00. Global Overview.xlsx`) est un recapitulatif cross-clients, pas un tracker individuel
- Les **statuts ClickUp** sont : Open → in progress → review → Closed (definis dans `CLICKUP_STATUS_MAPPINGS` du meme fichier config)
