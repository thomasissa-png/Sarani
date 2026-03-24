# Sarani — Legal Audit
*Produced by @legal — 2026-03-24*
*Language: English*

---

## Executive Summary — Top 5 Risks

1. **Guarantee "First project satisfaction or no invoice"** — Legally unenforceable as written. "Satisfaction" is entirely subjective; no cap, no process, no trigger definition. Highest priority fix before go-live.
2. **Comparative advertising (70–95% savings)** — Figures marked [HYPOTHESE] in pricing-strategy.md. Publishing unverified comparative claims in France exposes Sarani to unfair commercial practice proceedings (Code de la consommation L.122-1). Must be validated with primary invoice data before publication.
3. **Dual-currency display (EUR/USD)** — No live exchange rate = no VAT mention = non-compliant in France for any visitor who could be a French-taxable entity. Statutory disclosure required.
4. **Contact form** — Legal basis for data processing must be documented (legitimate interest or consent). Privacy policy and cookie notice must be live at go-live.
5. **Intellectual property transfer** — No clause in any existing document transfers ownership of delivered assets to the client. Without it, Sarani retains copyright by default (Code de la propriété intellectuelle L.111-1). This will block enterprise procurement validation.

---

## 1. Pricing Display Compliance

### France (primary legal domicile)
- **VAT display (TVA):** Under French consumer law (Code de la consommation L.112-1), prices displayed to consumers must include TVA. For B2B-only audiences with a clear professional context, HT display is acceptable if "HT" is explicitly labelled next to each price. The Sarani pricing page must display either "150€ HT" or "150€ TTC" — not "150€" alone.
- **Obligation:** Add "All prices exclude VAT (HT). VAT applied according to applicable regulations." as a footnote on the pricing page. This covers both B2B (HT standard) and international buyers.

### United Kingdom
- Since Brexit, UK VAT rules apply independently. For B2B services sold to UK-established businesses, reverse charge applies (client self-accounts for VAT). No price adjustment required, but the invoicing process must mention "VAT reverse charge applies." No display obligation on the website for B2B.

### UAE (Dubai/Abu Dhabi)
- UAE VAT (5%) applies to digital services supplied to UAE-resident businesses. However, for an EU-based supplier (Sarani, France), the obligation sits with the UAE recipient under the reverse-charge mechanism for B2B. No mandatory display on the website, but invoices to UAE clients must flag this.
- No specific e-commerce pricing display law applies to a French-registered entity's website for UAE visitors.

### International / General
- **Dual currency (EUR/USD):** Displaying two currencies without a live exchange rate is legally acceptable for informational purposes, provided it is clear these are approximate equivalents. Add: "USD prices are indicative. Invoices are issued in EUR. Exchange rate applied at invoice date."
- **"Starting at" vs. fixed prices:** pricing-strategy.md correctly recommends fixed prices. From a legal standpoint, fixed prices reduce the risk of misleading pricing claims (pratiques commerciales trompeuses, Code de la consommation L.121-2). "On demand — contact us" for variable services (Production Days, Website) is legally clean as long as the website does not imply a fixed price exists for those services.

---

## 2. Guarantee "First Project Satisfaction or No Invoice"

### Legal Analysis

This guarantee is the highest legal risk on the site. As currently written, it is legally problematic on three dimensions:

**a) "Satisfaction" is subjective.** French contract law (Code civil art. 1178) voids contracts where one party's discretionary appreciation is the sole performance condition. A client could refuse to pay any invoice by simply claiming dissatisfaction, with no obligation to demonstrate objective grounds. Sarani has no recourse.

**b) No cap on covered value.** The guarantee currently applies to "any first project" — which, under the pricing grid, could be a Production Day Package (20,000€+) or a Part-Time CMO engagement. Uncapped guarantees create unlimited financial exposure.

**c) No contestation process.** Without a defined dispute resolution mechanism, a client invoking the guarantee creates an immediate payment dispute with no contractual path to resolution.

### Recommended CGV Clause (draft for legal review)

> "For new clients, Sarani guarantees satisfaction on the first project. If the client is not satisfied with the final delivered assets, the invoice will be cancelled, provided that: (i) the client submits a written request within 5 business days of final delivery; (ii) the project value does not exceed 2,000 EUR (projects above this threshold are excluded from the guarantee unless explicitly agreed in writing); (iii) the client has participated in the revision process (minimum 1 revision round completed); (iv) the grounds for dissatisfaction are communicated in writing. Cancellation of the invoice does not entitle the client to retain or use the delivered assets."

**Key guardrails added:** written notice requirement, 5-day window, 2,000€ cap, revision participation condition, asset return obligation.

**Recommendation:** Validate this clause with a French commercial lawyer before publishing. The cap amount (2,000€) is a suggested figure — Sarani team to confirm based on acceptable financial exposure.

---

## 3. Comparative Advertising

### Legal Framework

**France (Code de la consommation L.122-1):** Comparative advertising is legal if: (a) it is not misleading; (b) it compares objectively verifiable features; (c) it does not discredit or denigrate competitors; (d) the compared products/services are equivalent.

**UK (CAP Code, rule 3.33):** Comparisons must be factual, verifiable, and not mislead by omission.

**UAE:** No specific comparative advertising code, but misleading commercial practices are prohibited under Federal Law No. 15 of 2020 on Consumer Protection.

### Analysis of Sarani's Comparison Table

The pricing-strategy.md comparison table (e.g., "Static banner: Sarani 150€ vs. Traditional Agency 500–2,000€ → 70–92% savings") is explicitly marked [HYPOTHESE] — based on the Sarani commercial deck, not primary invoices from competitors. Publishing these figures on the website as fact creates legal risk in France under the misleading practices provisions.

**What Sarani CAN say:**
- "Our clients report savings of up to 60% vs. their previous agency" (client-reported, sourced from the commercial deck — cite the source)
- "Most large network agencies charge 500€–2,000€ for a single banner production. We charge 150€." — acceptable IF Sarani can substantiate the range with a minimum of 3 verifiable quotes or invoices
- "No subscription. No hidden fees." — factual and verifiable

**What Sarani CANNOT say (without substantiation):**
- "70–95% savings" — this range requires invoice-level primary data, not estimates
- Any specific competitor named with a price claim (e.g., "Superside charges $10,000/month") without linking to their published pricing page as the source

**Recommendation:** Before go-live, replace the comparison table with client-reported savings data or remove specific percentage claims. If Sarani holds client invoices from former agency relationships (as evidence of prior agency spend), those can be the basis for a legally defensible claim. The legal team (or @legal review) must validate the final wording.

---

## 4. Contract Terms (CGV)

### Mandatory Elements for an International Creative Agency

Under French law (Code de la consommation + Code civil), CGV for a B2B service provider must include:

| Element | Requirement | Status |
|---------|-------------|--------|
| Identification of parties | Legal name, registered address, SIRET, VAT number | Not found in any current document — required |
| Scope of services | Clear description of what is/isn't included | Partially in pricing page — needs formalization |
| Pricing and payment terms | Price, currency, VAT treatment, payment deadline | Needs "HT" label and payment deadline (legal default: 30 days for B2B, art. L.441-10) |
| Intellectual property assignment | Transfer of copyright to client upon full payment | ABSENT — critical gap (see below) |
| Revisions policy | Scope of "unlimited revisions" | Needs definition: unlimited within project scope, not unlimited new briefs |
| Satisfaction guarantee | As detailed in Section 2 above | Needs the guardrails from Section 2 |
| Liability limitation | Cap on Sarani's liability per project | Standard: capped at the invoice amount for that project |
| Dispute resolution | Jurisdiction, governing law | French law + Paris commercial court (Tribunal de commerce de Paris) recommended |
| Right of withdrawal | Not applicable for B2B. For B2C: 14-day withdrawal right (art. L.221-18) | Sarani's target is B2B — state explicitly "These CGV apply to professional clients only (B2B)" |

### Intellectual Property — Critical Gap

Under French law (Code de la propriété intellectuelle L.111-1), copyright belongs by default to the author (Sarani's designers). Without an explicit IP assignment clause, delivered banners, videos, and presentations remain Sarani's intellectual property even after payment. Enterprise procurement (Marc) will flag this during vendor validation.

**Required clause:**
> "Upon receipt of full payment for a project, Sarani assigns to the client all economic rights (droits patrimoniaux) to the delivered assets for the agreed usage scope. This assignment does not include the right to claim authorship (droit moral) or to modify assets without Sarani's prior written consent."

---

## 5. GDPR / Data

### Contact Form

**Data collected (per functional-specs.md US-103):** First name, last name, company, role/title, email, company size, attribution source, project description.

**Legal basis:** Legitimate interest (Art. 6(1)(f) GDPR) — Sarani has a legitimate interest in receiving and responding to business inquiries. This is the correct basis; consent is not required for a professional contact form, but the privacy policy must document the legitimate interest assessment.

**Retention:** Contact form data should not be retained beyond 3 years from last interaction (recommended standard for B2B prospects). This must be stated in the privacy policy.

**Required actions:**
- Add a checkbox or statement on the contact form: "By submitting this form, you acknowledge that Sarani will process your data to respond to your inquiry. See our Privacy Policy."
- No opt-in checkbox required (legitimate interest basis), but the link to the privacy policy must be visible before submission.

### Privacy Policy — Mandatory Elements (Art. 13 GDPR)
- Identity and contact details of data controller (Sarani legal entity, registered address)
- Purposes and legal bases for each processing activity
- Data retention periods
- Recipients of data (CRM, email service — identify tools used)
- International transfers (if data is stored outside EU — Replit hosting location must be confirmed)
- Data subject rights (access, rectification, erasure, portability, objection)
- Right to lodge a complaint with CNIL

**Replit hosting note:** If the Replit server is located outside the EU/EEA, a data transfer mechanism is required (Standard Contractual Clauses with Replit). @infrastructure must confirm the server location.

### Cookie Consent — Umami

Umami is self-hosted and cookieless by design. This is the key legal advantage: no cookie consent banner is required for Umami's core tracking (no cookies, no persistent identifiers, no cross-site tracking). CNIL guidelines (2022) confirm that privacy-by-design analytics tools that collect only aggregated, non-identifiable data do not require consent.

**Caveat:** If any other third-party script is added (Google Fonts loaded remotely, YouTube embeds, social share buttons), a cookie consent mechanism becomes required for those scripts. @fullstack must ensure all external resources are either self-hosted or consent-gated.

**Required:** Even without a consent banner, a brief cookie notice stating "This site uses Umami Analytics, a privacy-first tool that does not use cookies or collect personal data" is recommended as a trust signal and demonstrates CNIL compliance proactively.

---

## 6. Checklist Before Go-Live

| Item | Status | Priority | Action Required |
|------|--------|----------|-----------------|
| Privacy policy page live at /privacy | Not done | P0 — blocks go-live | Write and publish. Must cover contact form data, Umami, retention, CNIL. |
| Legal mentions page (Mentions légales) live at /legal | Not done | P0 — required by French law (LCEN art. 6) | Sarani legal entity name, SIRET, registered address, hosting provider (Replit). |
| Contact form: privacy policy link visible | Not done | P0 | Add link before submit button. No checkbox required (legitimate interest basis). |
| VAT/HT label on all prices | Not done | P0 | Add "All prices exclude VAT (HT)" footnote on pricing page. |
| CGV published (link in footer) | Not done | P1 — required before first invoice | Draft CGV with IP assignment, guarantee guardrails, payment terms, jurisdiction. Validate with lawyer. |
| USD price disclaimer | Not done | P1 | "USD prices are indicative. Invoices issued in EUR." |
| Comparative advertising claims validated | Not done — marked [HYPOTHESE] | P1 | Replace "70–95% savings" with client-reported data or remove until primary data available. |
| IP assignment clause in CGV | Not done | P1 | Critical for enterprise procurement (Marc). See Section 4. |
| Satisfaction guarantee defined in CGV | Not done | P1 | Add guardrails: written request, 5-day window, 2,000€ cap, asset return. Validate with lawyer. |
| Replit server location confirmed | Unknown | P1 | @infrastructure to confirm EU/non-EU. If non-EU: SCCs required with Replit. |
| Umami cookie notice (informational) | Not done | P2 | One-line footer notice: "Privacy-first analytics. No cookies." |
| CGV reviewed by French commercial lawyer | Not done | P2 — before first dispute | IP assignment, guarantee clause, payment terms. Budget: 500–2,000€ for a commercial lawyer review. |
| CNIL registration (if DPO required) | Not applicable | N/A | Sarani does not process sensitive data and is not a public body. DPO not required. CNIL registration not required for standard B2B data processing. |

---

## Hypotheses to Validate

- [HYPOTHESE: Sarani legal entity details (SIRET, registered address, VAT number) — required for mentions légales and CGV. Not found in any project document. Sarani team to provide.]
- [HYPOTHESE: Replit server location (EU or non-EU) — determines whether Standard Contractual Clauses are required for GDPR compliance. @infrastructure to confirm.]
- [HYPOTHESE: Traditional agency price ranges in comparison table — marked as estimates in pricing-strategy.md. Sarani team to validate with primary invoice data before publishing comparative claims.]
- [HYPOTHESE: Satisfaction guarantee cap at 2,000€ — suggested figure. Sarani team to confirm acceptable financial exposure per project.]
- [HYPOTHESE: CRM/email tool used to manage contact form submissions — must be documented in privacy policy as a data recipient. Not specified in current project documents.]

---

**Handoff → @fullstack**

Files produced: `/home/user/Sarani/docs/legal/legal-audit.md`

Decisions taken:
- Legal basis for contact form processing: legitimate interest (Art. 6(1)(f) GDPR) — no consent checkbox required, but privacy policy link mandatory before submit
- Umami: no cookie consent banner required (cookieless, non-identifying) — CNIL-compliant by design
- Dual currency: acceptable with "indicative USD" disclaimer — no live rate required
- CGV jurisdiction: French law + Paris commercial court recommended

Points of attention for @fullstack:
- **/privacy page must be live at go-live (P0)** — page must exist before any public traffic
- **/legal page (mentions légales) must be live at go-live (P0)** — mandatory under French law (LCEN art. 6); requires Sarani's SIRET and registered address (get from Sarani team)
- **Contact form (US-103):** add a visible link to /privacy before the submit button — no checkbox, just "By submitting, you agree to our Privacy Policy [link]"
- **Footer:** add links to /legal, /privacy, and /cgv in the footer on all pages
- **External scripts:** do NOT load Google Fonts remotely or any third-party script without consent gating — Umami's cookieless advantage is lost if another script sets cookies
- **CGV page at /cgv:** create the route and page — content to be provided once CGV draft is validated by lawyer
- **USD disclaimer:** add footnote below pricing grid: "USD prices are indicative. Invoices issued in EUR at the applicable exchange rate."
- **VAT footnote on pricing page:** add "All prices exclude VAT (HT). VAT is applied according to applicable regulations."

Note: CGV draft and privacy policy text will be produced as separate deliverables (`cgu-draft.md`, `privacy-policy.md`) once Sarani legal entity details (SIRET, registered address) are confirmed by the Sarani team.
