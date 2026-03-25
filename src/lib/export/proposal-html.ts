import type { ProposalResponse } from "@/lib/validations/proposal";

// ─── Brand colors ────────────────────────────────────────────────────────────

const COLORS = {
  black: "#000000",
  flame: "#da5126",
  cerulean: "#0babe8",
  lemon: "#f1c217",
  white: "#ffffff",
} as const;

const DOT_COLORS = [COLORS.flame, COLORS.cerulean, COLORS.lemon];

function coloredDot(index: number): string {
  const color = DOT_COLORS[index % DOT_COLORS.length];
  return `<span style="color: ${color}">.</span>`;
}

// ─── Submark (3 circles) ─────────────────────────────────────────────────────

function submark(): string {
  return `<div style="position: absolute; top: 32px; right: 40px; display: flex; gap: 6px;">
    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${COLORS.flame};"></div>
    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${COLORS.cerulean};"></div>
    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${COLORS.lemon};"></div>
  </div>`;
}

// ─── Slide wrapper ───────────────────────────────────────────────────────────

function slideWrapper(
  content: string,
  opts: { bg?: string; pageNumber?: number; totalPages?: number }
): string {
  const bg = opts.bg || COLORS.white;
  const textColor = bg === COLORS.white ? COLORS.black : COLORS.white;
  const footer =
    opts.pageNumber != null && opts.totalPages != null
      ? `<div style="position: absolute; bottom: 24px; right: 40px; font-size: 12px; color: ${textColor}; opacity: 0.5;">${opts.pageNumber} / ${opts.totalPages}</div>`
      : "";

  return `<div style="position: relative; width: 100%; min-height: 700px; background: ${bg}; color: ${textColor}; padding: 60px 64px 48px; box-sizing: border-box; page-break-after: always; overflow: hidden;">
    ${submark()}
    ${content}
    ${footer}
  </div>`;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Cover slide ─────────────────────────────────────────────────────────────

function coverSlide(prospectName: string): string {
  const content = `
    <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; min-height: 580px;">
      <div style="margin-bottom: 48px;">
        <div style="font-size: 28px; font-weight: 700; letter-spacing: -0.5px; color: ${COLORS.white};">sarani</div>
      </div>
      <h1 style="font-size: 48px; font-weight: 700; line-height: 1.15; margin: 0 0 20px 0; max-width: 80%;">Proposal for ${escapeHtml(prospectName)}${coloredDot(0)}</h1>
      <p style="font-size: 20px; font-weight: 400; opacity: 0.85; margin: 0 0 16px 0;">Unlimited Creativity.</p>
    </div>`;
  return slideWrapper(content, { bg: COLORS.cerulean });
}

// ─── Section divider ─────────────────────────────────────────────────────────

function sectionDivider(
  sectionNumber: number,
  title: string,
  pageNumber: number,
  totalPages: number
): string {
  const padded = String(sectionNumber).padStart(2, "0");
  const content = `
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 580px; text-align: center;">
      <div style="font-size: 120px; font-weight: 700; opacity: 0.15; margin-bottom: -20px;">${padded}</div>
      <div style="width: 180px; height: 180px; border-radius: 50%; background: ${COLORS.white}; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 22px; font-weight: 700; color: ${COLORS.cerulean}; text-align: center; padding: 20px; line-height: 1.3;">${escapeHtml(title)}${coloredDot(sectionNumber)}</span>
      </div>
    </div>`;
  return slideWrapper(content, {
    bg: COLORS.cerulean,
    pageNumber,
    totalPages,
  });
}

// ─── Who We Are slide ────────────────────────────────────────────────────────

function whoWeAreSlide(pageNumber: number, totalPages: number): string {
  const metrics = [
    { value: "35+", label: "Creative experts" },
    { value: "5", label: "Continents" },
    { value: "18", label: "Languages" },
    { value: "24/7", label: "Availability" },
    { value: "\u221E", label: "Unlimited revisions" },
  ];

  const cards = metrics
    .map(
      (m) => `
      <div style="background: ${COLORS.cerulean}; color: ${COLORS.white}; border-radius: 12px; padding: 24px; text-align: center; flex: 1; min-width: 120px;">
        <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px;">${m.value}</div>
        <div style="font-size: 13px; font-weight: 500; opacity: 0.85;">${m.label}</div>
      </div>`
    )
    .join("");

  const content = `
    <div style="padding-top: 20px;">
      <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 40px 0; color: ${COLORS.black}; line-height: 1.2;">
        Who We Are${coloredDot(1)}
      </h2>
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        ${cards}
      </div>
    </div>`;
  return slideWrapper(content, { bg: COLORS.white, pageNumber, totalPages });
}

// ─── Text section slide ──────────────────────────────────────────────────────

function textSlide(
  title: string,
  body: string,
  pageNumber: number,
  totalPages: number,
  dotIndex: number
): string {
  // Split body by newlines into paragraphs
  const paragraphs = body
    .split(/\n\n?/)
    .filter((p) => p.trim())
    .map(
      (p) =>
        `<p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px 0; color: ${COLORS.black};">${escapeHtml(p.trim())}</p>`
    )
    .join("");

  const content = `
    <div style="padding-top: 20px;">
      <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 32px 0; color: ${COLORS.black}; line-height: 1.2;">
        ${escapeHtml(title)}${coloredDot(dotIndex)}
      </h2>
      ${paragraphs}
    </div>`;
  return slideWrapper(content, { bg: COLORS.white, pageNumber, totalPages });
}

// ─── Case studies slide ──────────────────────────────────────────────────────

function caseStudiesSlide(
  caseStudies: ProposalResponse["relevantCaseStudies"],
  pageNumber: number,
  totalPages: number
): string {
  const cards = caseStudies
    .map(
      (cs) => `
      <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 16px; font-weight: 700; margin: 0; color: ${COLORS.black};">${escapeHtml(cs.client)} — ${escapeHtml(cs.deliverable)}</h4>
          <span style="background: ${COLORS.cerulean}; color: ${COLORS.white}; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; white-space: nowrap;">${escapeHtml(cs.keyMetric)}</span>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 0;">${escapeHtml(cs.relevanceExplanation)}</p>
      </div>`
    )
    .join("");

  const content = `
    <div style="padding-top: 20px;">
      <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 32px 0; color: ${COLORS.black}; line-height: 1.2;">
        Case Studies${coloredDot(0)}
      </h2>
      ${cards}
    </div>`;
  return slideWrapper(content, { bg: COLORS.white, pageNumber, totalPages });
}

// ─── Scope of work slide ─────────────────────────────────────────────────────

function scopeSlide(
  scopeOfWork: ProposalResponse["scopeOfWork"],
  timeline: string,
  pageNumber: number,
  totalPages: number
): string {
  const phases = scopeOfWork
    .map(
      (phase) => `
      <div style="border-left: 3px solid ${COLORS.cerulean}; padding-left: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="font-size: 16px; font-weight: 700; margin: 0; color: ${COLORS.black};">${escapeHtml(phase.phase)}</h4>
          <span style="font-size: 13px; color: #999; font-weight: 500;">${escapeHtml(phase.duration)}</span>
        </div>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${phase.deliverables.map((d) => `<li style="font-size: 14px; line-height: 1.8; color: #444; padding-left: 16px; position: relative;"><span style="position: absolute; left: 0; color: ${COLORS.cerulean};">\u2022</span>${escapeHtml(d)}</li>`).join("")}
        </ul>
      </div>`
    )
    .join("");

  const content = `
    <div style="padding-top: 20px;">
      <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 32px 0; color: ${COLORS.black}; line-height: 1.2;">
        Scope &amp; Timeline${coloredDot(1)}
      </h2>
      ${phases}
      ${timeline ? `<div style="background: #f5f5f5; border-radius: 8px; padding: 16px 20px; margin-top: 16px;"><p style="font-size: 14px; font-weight: 600; margin: 0 0 4px 0; color: ${COLORS.black};">Timeline</p><p style="font-size: 14px; line-height: 1.6; margin: 0; color: #666;">${escapeHtml(timeline)}</p></div>` : ""}
    </div>`;
  return slideWrapper(content, { bg: COLORS.white, pageNumber, totalPages });
}

// ─── Pricing slide ───────────────────────────────────────────────────────────

function pricingSlide(
  pricingApproach: string,
  pageNumber: number,
  totalPages: number
): string {
  const content = `
    <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; min-height: 580px;">
      <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 32px 0; color: ${COLORS.black}; line-height: 1.2;">
        Investment${coloredDot(2)}
      </h2>
      <div style="background: #f5f5f5; border-radius: 12px; padding: 32px;">
        <p style="font-size: 16px; line-height: 1.7; margin: 0; color: ${COLORS.black};">${escapeHtml(pricingApproach)}</p>
      </div>
    </div>`;
  return slideWrapper(content, { bg: COLORS.white, pageNumber, totalPages });
}

// ─── Why Sarani slide ────────────────────────────────────────────────────────

function whySaraniSlide(
  reasons: string[],
  pageNumber: number,
  totalPages: number
): string {
  const items = reasons
    .map(
      (r, i) => `
      <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${COLORS.cerulean}; color: ${COLORS.white}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0;">${i + 1}</div>
        <p style="font-size: 16px; line-height: 1.6; margin: 4px 0 0 0; color: ${COLORS.black};">${escapeHtml(r)}</p>
      </div>`
    )
    .join("");

  const content = `
    <div style="padding-top: 20px;">
      <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 32px 0; color: ${COLORS.black}; line-height: 1.2;">
        Why Sarani${coloredDot(0)}
      </h2>
      ${items}
    </div>`;
  return slideWrapper(content, { bg: COLORS.white, pageNumber, totalPages });
}

// ─── Next steps + CTA slide ─────────────────────────────────────────────────

function nextStepsSlide(
  nextSteps: string[],
  prospectName: string,
  pageNumber: number,
  totalPages: number
): string {
  const steps = nextSteps
    .map(
      (s, i) => `
      <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px;">
        <div style="width: 28px; height: 28px; border-radius: 50%; background: ${COLORS.white}; color: ${COLORS.cerulean}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.3);">${i + 1}</div>
        <p style="font-size: 16px; line-height: 1.6; margin: 2px 0 0 0; color: ${COLORS.white};">${escapeHtml(s)}</p>
      </div>`
    )
    .join("");

  const content = `
    <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; min-height: 580px;">
      <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 32px 0; color: ${COLORS.white}; line-height: 1.2;">
        Next Steps${coloredDot(2)}
      </h2>
      ${steps}
      <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.2);">
        <p style="font-size: 18px; font-weight: 500; margin: 0; color: ${COLORS.white}; opacity: 0.9;">Let&rsquo;s make ${escapeHtml(prospectName)}&rsquo;s vision a reality.</p>
        <p style="font-size: 14px; margin: 8px 0 0 0; color: ${COLORS.white}; opacity: 0.6;">hello@sarani.studio</p>
      </div>
    </div>`;
  return slideWrapper(content, { bg: COLORS.cerulean, pageNumber, totalPages });
}

// ─── Trusted by slide ────────────────────────────────────────────────────────

function trustedBySlide(pageNumber: number, totalPages: number): string {
  const clients = [
    "TikTok",
    "Sony",
    "Adidas",
    "GEODIS",
    "Pernod Ricard",
    "L\u2019Or\u00e9al",
    "Air Corsica",
    "PICO",
  ];

  const logos = clients
    .map(
      (name) =>
        `<span style="font-size: 18px; font-weight: 500; color: #999; padding: 12px 24px;">${name}</span>`
    )
    .join("");

  const content = `
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 580px; text-align: center;">
      <p style="font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px; color: #bbb; margin: 0 0 32px 0;">Trusted by</p>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
        ${logos}
      </div>
    </div>`;
  return slideWrapper(content, { bg: COLORS.white, pageNumber, totalPages });
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateProposalHTML(data: {
  proposal: ProposalResponse;
  prospectName: string;
  industry?: string;
}): string {
  const { proposal, prospectName } = data;

  // Calculate total pages
  // Cover + Agenda + Who We Are + Client Understanding + Case Studies
  // + Scope & Timeline + Pricing + Why Sarani + Next Steps + Trusted By
  // Plus section dividers for major sections
  const sections: string[] = [];
  let pageNum = 0;

  // We calculate total first, then generate
  // Sections: cover, who-we-are, client-understanding, proposed-approach,
  //   case-studies, scope, pricing, team, why-sarani, next-steps, trusted-by
  // Section dividers before: who-we-are(01), client-understanding(02),
  //   case-studies(03), scope(04), why-sarani(05), next-steps(06)
  const totalPages = 17; // cover + 6 dividers + 10 content pages + trusted-by

  // 1. Cover
  pageNum++;
  sections.push(coverSlide(prospectName));

  // 2. Section 01: Who We Are
  pageNum++;
  sections.push(sectionDivider(1, "Who We Are", pageNum, totalPages));
  pageNum++;
  sections.push(whoWeAreSlide(pageNum, totalPages));

  // 3. Section 02: Client Understanding + Proposed Approach
  pageNum++;
  sections.push(
    sectionDivider(2, "Understanding & Approach", pageNum, totalPages)
  );
  pageNum++;
  sections.push(
    textSlide(
      "Client Understanding",
      proposal.clientUnderstanding,
      pageNum,
      totalPages,
      2
    )
  );
  pageNum++;
  sections.push(
    textSlide(
      "Proposed Approach",
      proposal.proposedApproach,
      pageNum,
      totalPages,
      0
    )
  );

  // 4. Section 03: Case Studies
  if (proposal.relevantCaseStudies.length > 0) {
    pageNum++;
    sections.push(sectionDivider(3, "Case Studies", pageNum, totalPages));
    pageNum++;
    sections.push(
      caseStudiesSlide(proposal.relevantCaseStudies, pageNum, totalPages)
    );
  }

  // 5. Section 04: Scope, Timeline, Pricing
  pageNum++;
  sections.push(
    sectionDivider(4, "Scope & Investment", pageNum, totalPages)
  );
  pageNum++;
  sections.push(
    scopeSlide(proposal.scopeOfWork, proposal.timeline, pageNum, totalPages)
  );
  pageNum++;
  sections.push(pricingSlide(proposal.pricingApproach, pageNum, totalPages));

  // Team overview as text slide
  if (proposal.teamOverview) {
    pageNum++;
    sections.push(
      textSlide("Your Team", proposal.teamOverview, pageNum, totalPages, 1)
    );
  }

  // 6. Section 05: Why Sarani
  if (proposal.whySarani.length > 0) {
    pageNum++;
    sections.push(sectionDivider(5, "Why Sarani", pageNum, totalPages));
    pageNum++;
    sections.push(whySaraniSlide(proposal.whySarani, pageNum, totalPages));
  }

  // 7. Section 06: Next Steps
  if (proposal.nextSteps.length > 0) {
    pageNum++;
    sections.push(sectionDivider(6, "Next Steps", pageNum, totalPages));
    pageNum++;
    sections.push(
      nextStepsSlide(proposal.nextSteps, prospectName, pageNum, totalPages)
    );
  }

  // 8. Trusted by
  pageNum++;
  sections.push(trustedBySlide(pageNum, totalPages));

  const slidesHtml = sections.join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal for ${escapeHtml(prospectName)} — Sarani</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: 'Outfit', sans-serif; background: #f5f5f5; }
    @media print {
      body { background: white; }
      div[style*="page-break-after"] { page-break-after: always; }
      @page { margin: 0; size: landscape; }
    }
  </style>
</head>
<body>
  ${slidesHtml}
</body>
</html>`;
}
