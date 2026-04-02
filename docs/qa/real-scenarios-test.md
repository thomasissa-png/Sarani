# Real Scenarios Test Report — Inbox Client Filter

**Date**: 2026-04-02
**Agent**: @qa
**File tested**: `src/lib/inbox/client-filter.ts`
**Test file**: `tests/unit/inbox-client-filter.test.ts`
**Total tests**: 48 | **PASS**: 48 | **FAIL**: 0

---

## Why this test file exists

Previous QA sessions validated structure (types, tabs, empty arrays) but never tested the **client filter with real production data shapes**. The client filter is critical business logic: it determines which inbox items Thomas sees when he clicks "TikTok", "Sony", or "Ubi". A broken filter means items processed in the wrong client context — wrong ClickUp project, wrong PM, wrong response.

---

## Scenarios tested — PASS/FAIL

| # | Scenario | Data shape | Assertion | Result |
|---|---|---|---|---|
| 1a | TikTok review item, filter = TikTok | `review_human` with `clientName: "TikTok"` in summary JSON | Item appears | **PASS** |
| 1b | TikTok review item, filter = Sony | Same item | Item does NOT appear | **PASS** |
| 1c | TikTok review item, filter = Ubi | Same item | Item does NOT appear | **PASS** |
| 1d | TikTok review item, filter = all | Same item | Item appears (no filter) | **PASS** |
| 1e | TikTok review item, filter = Others | Same item | Item does NOT appear (known client) | **PASS** |
| 2a | Sony email with Sarani thread, filter = Sony | `from: Mayumi.Donovan@sony.com`, bodyPreview contains `fanny@sarani.studio` | Item appears under Sony | **PASS** |
| 2b | Sony email with Sarani thread, filter = TikTok | Same item | Item does NOT appear | **PASS** |
| 2c | Sony email with Sarani thread, filter = Others | Same item | Item does NOT appear | **PASS** |
| 2d | Sony email with Sarani thread — text analysis | Same item | `buildSearchableText` contains both "sony" and "sarani" (body thread) | **PASS** |
| 3a | Sarani internal email, filter = Others | `from: fanny@sarani.studio` | Item appears in Others (sarani is not a client) | **PASS** |
| 3b | Sarani internal email, filter = Sony | Same item | Item does NOT appear | **PASS** |
| 3c | Sarani internal email, filter = TikTok | Same item | Item does NOT appear | **PASS** |
| 3d | Sarani internal email — text analysis | Same item | `buildSearchableText` includes from address | **PASS** |
| 4a | Lamarck feedback with SharePoint link, filter = Lamarck | `from: philippe@lamarck.fr`, bodyPreview contains SP URL | Item appears under Lamarck | **PASS** |
| 4b | Lamarck feedback with SP link — text includes SP URL | Same item | `buildSearchableText` contains "sharepoint.com" | **PASS** |
| 4c | Lamarck feedback with SP link, filter = Sony | Same item | Item does NOT appear | **PASS** |
| 4d | Lamarck feedback with SP link, filter = Others | Same item | Item does NOT appear | **PASS** |
| 5a | "Merci" email from @lamarck.fr, filter = Lamarck | `from: mylene@lamarck.fr`, bodyPreview = "Merci!" | Item appears under Lamarck | **PASS** |
| 5b | "Merci" email, filter = Others | Same item | Item does NOT appear (known client) | **PASS** |
| 5c | "Merci" email, filter = TikTok | Same item | Item does NOT appear | **PASS** |
| 6a | Adidas email, filter = Ubi | `from: contact@adidas.com` | Item appears (Adidas = Ubi sub-client) | **PASS** |
| 6b | Adidas email, filter = Adidas | Same item | Item also appears (direct text match) | **PASS** |
| 6c | Adidas email, filter = Sony | Same item | Item does NOT appear | **PASS** |
| 6d | Adidas email, filter = Others | Same item | Item does NOT appear (adidas is known) | **PASS** |
| 7 | All Ubi sub-clients (ubisoft, adidas, lego, red bull, ikea, perrier, barilla, @ubi. domain) | One item per sub-client | Each appears under Ubi filter | **PASS** (7 sub-tests) |
| 8a | ByteDance email, filter = TikTok | `from: recruiter@bytedance.com` | Item appears (alias) | **PASS** |
| 8b | PICO email, filter = PICO XR | `from: contact@pico.com` | Item appears (alias) | **PASS** |
| 8c | CMC email, filter = CMC Markets | `from: contact@cmc.com` | Item appears (alias) | **PASS** |
| 9a | Unknown sender, filter = Others | `from: noreply@mailchimp.com` | Item appears in Others | **PASS** |
| 9b | Unknown sender, no specific client match | Same item | Does NOT match any of TikTok/Sony/Ubi/Lamarck/Bose | **PASS** |
| 9c | Empty item (no title, no summary), filter = Others | `title: ""`, `summary: null` | Item appears in Others | **PASS** |
| 9d | Empty item, filter = Sony | Same item | Item does NOT appear | **PASS** |
| 10a | buildSearchableText — all fields extracted | Full summary with all 7 fields | All fields present in lowercase text | **PASS** |
| 10b | buildSearchableText — malformed JSON | `summary: "{invalid json!!!"` | No throw, falls back to title | **PASS** |
| 10c | buildSearchableText — null summary | `summary: null` | Returns title only | **PASS** |
| 10d | buildSearchableText — null title | `title: null` | Returns summary fields | **PASS** |
| 11a | Mixed 4 items, filter = TikTok | TikTok review + Sony feedback + Adidas brief + newsletter | Returns only TikTok (1 item) | **PASS** |
| 11b | Mixed 4 items, filter = Sony | Same set | Returns only Sony (1 item) | **PASS** |
| 11c | Mixed 4 items, filter = Ubi | Same set | Returns only Adidas/Ubi (1 item) | **PASS** |
| 11d | Mixed 4 items, filter = Others | Same set | Returns only newsletter (1 item) | **PASS** |
| 11e | Mixed 4 items, filter = all | Same set | Returns all 4 items | **PASS** |

---

## Execution details

```
vitest v4.1.1
Test Files  1 passed (1)
     Tests  48 passed (48)
  Duration  3.04s

tsc --noEmit: 0 errors
```

---

## Key findings

1. **Client filter logic is sound.** All 6 real-world scenarios requested by Thomas produce correct results.
2. **Sub-client mapping works.** Adidas, Lego, Red Bull, IKEA, Perrier, Barilla all correctly map to the Ubi parent filter.
3. **Alias mapping works.** ByteDance to TikTok, PICO to PICO XR, CMC to CMC Markets.
4. **Edge case: Sony email with Sarani thread.** The `bodyPreview` containing `fanny@sarani.studio` does NOT cause the item to be mis-classified. The item correctly appears under Sony only. Note: `buildSearchableText` does include the body content (including "sarani"), so a hypothetical "Sarani" client filter would match. This is acceptable because: (a) Sarani is not in the client filter list, and (b) the `sarani-filter.ts` module handles from-address-only Sarani detection separately.
5. **"Others" bucket is exclusive.** Items with a known client in any searchable field are excluded from Others. Only truly unrecognized items land there.
6. **Malformed data is handled.** Invalid JSON, null fields, empty strings — all gracefully handled without throws.

---

**Handoff -> @orchestrator**
- Fichiers produits : `tests/unit/inbox-client-filter.test.ts`, `docs/qa/real-scenarios-test.md`
- Decisions prises : tested against `src/lib/inbox/client-filter.ts` (already extracted from page.tsx), used real production data shapes (actual client names, actual email formats, actual summary JSON structures)
- Points d'attention : 0 bugs found in current client filter logic. The sub-client mapping (Adidas to Ubi) and alias mapping (ByteDance to TikTok) are correctly implemented.
