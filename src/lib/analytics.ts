/**
 * Umami Analytics — Safe Tracking Wrapper
 * Source: docs/analytics/tracking-plan.md
 *
 * Silent failure if Umami is not loaded (ad-block, script error).
 * Never throws. Never blocks rendering.
 * Privacy rule: never pass PII in event properties.
 */

/* ---------- Types ---------- */

type DeviceType = "desktop" | "mobile" | "tablet";

/** Standard properties included on every manual event */
interface StandardProperties {
  page: string;
  device: DeviceType;
  referrer?: string;
}

/** CTA click event — tracking-plan Flow 1/2/3/4 */
interface CtaClickProperties extends StandardProperties {
  location: string;
  label: string;
  client?: string;
}

/** Case study click — tracking-plan Flow 1 */
interface CaseStudyClickProperties extends StandardProperties {
  client: string;
  location: string;
  slug?: string;
}

/** Scroll depth — tracking-plan Flow 1/2/3 */
interface ScrollDepthProperties extends StandardProperties {
  depth: "50" | "100";
}

/** Form events — tracking-plan Flow 1/2 */
interface FormViewProperties extends StandardProperties {}
interface FormStartProperties extends StandardProperties {}
interface FormSubmitProperties extends StandardProperties {
  company_size: string;
  attribution: string;
}
interface FormErrorProperties extends StandardProperties {
  error_type: string;
}

/** Logo click */
interface LogoClickProperties extends StandardProperties {
  client: string;
}

/** Nav click */
interface NavClickProperties extends StandardProperties {
  label: string;
}

/** Engagement — section-based */
interface EngagementProperties extends StandardProperties {
  section: string;
}

/** Event map — maps event names to their property types */
interface EventMap {
  cta_click: CtaClickProperties;
  case_study_click: CaseStudyClickProperties;
  scroll_depth: ScrollDepthProperties;
  form_view: FormViewProperties;
  form_start: FormStartProperties;
  form_submit: FormSubmitProperties;
  form_error: FormErrorProperties;
  logo_click: LogoClickProperties;
  nav_click: NavClickProperties;
  engagement: EngagementProperties;
}

type EventName = keyof EventMap;

/* ---------- Umami global type ---------- */

interface UmamiTracker {
  track: (name: string, data?: Record<string, string | number>) => void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

/* ---------- Helpers ---------- */

export function getDevice(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function getReferrer(): string {
  if (typeof document === "undefined") return "direct";
  return document.referrer || "direct";
}

/* ---------- Track function ---------- */

/**
 * Send a custom event to Umami.
 * Silently no-ops if Umami is not available.
 *
 * @example
 * track("cta_click", {
 *   location: "hero",
 *   label: "start_a_project",
 *   page: "/",
 *   device: getDevice(),
 * });
 */
export function track<T extends EventName>(
  eventName: T,
  properties: EventMap[T]
): void {
  try {
    if (typeof window !== "undefined" && window.umami) {
      window.umami.track(eventName, properties as unknown as Record<string, string>);
    }
  } catch {
    // Silent failure — ad-blocker, script error, or SSR
  }
}
