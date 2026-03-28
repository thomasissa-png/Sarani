/**
 * P0 — Contact form validation schema tests
 * WHY: Server-side validation is the last line of defense against invalid/malicious data.
 * Invalid data in the inbox = garbage leads. Missing validation = injection risk.
 * Linked AC: AC-103-4, EC-103-7
 */

import { describe, it, expect } from "vitest";
import {
  contactFormSchema,
  contactFormServerSchema,
  COMPANY_SIZE_OPTIONS,
  ATTRIBUTION_OPTIONS,
} from "@/lib/validation";

/* ---------- Valid data factory ---------- */

function validPayload() {
  return {
    name: "Sophie Martin",
    company: "TikTok",
    email: "sophie@tiktok.com",
    message: "We need 50 banners in 3 languages by Friday.",
    companySize: "500M\u20AC+" as const,
    attribution: "Referral" as const,
    honeypot: "",
  };
}

/* ---------- Happy path ---------- */

describe("contactFormSchema — valid submissions", () => {
  it("accepts a complete valid payload", () => {
    const result = contactFormSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("accepts all company size options", () => {
    for (const size of COMPANY_SIZE_OPTIONS) {
      const data = { ...validPayload(), companySize: size };
      const result = contactFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it("accepts all attribution options", () => {
    for (const attr of ATTRIBUTION_OPTIONS) {
      const data = { ...validPayload(), attribution: attr };
      const result = contactFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it("accepts payload without honeypot field (optional)", () => {
    const { honeypot, ...data } = validPayload();
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

/* ---------- Required field validation ---------- */

describe("contactFormSchema — required fields", () => {
  const requiredFields = ["name", "company", "email", "message"] as const;

  for (const field of requiredFields) {
    it(`rejects empty ${field}`, () => {
      const data = { ...validPayload(), [field]: "" };
      const result = contactFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  }

  it("rejects missing companySize", () => {
    const { companySize, ...data } = validPayload();
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("accepts missing attribution (optional field)", () => {
    const { attribution, ...data } = validPayload();
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

/* ---------- Email validation ---------- */

describe("contactFormSchema — email format", () => {
  const invalidEmails = [
    "not-an-email",
    "missing@",
    "@nodomain",
    "spaces in@email.com",
    "",
  ];

  for (const email of invalidEmails) {
    it(`rejects invalid email: "${email}"`, () => {
      const data = { ...validPayload(), email };
      const result = contactFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  }
});

/* ---------- Select value injection (EC-103-7) ---------- */

describe("contactFormSchema — select value injection protection", () => {
  it("rejects invalid companySize value", () => {
    const data = { ...validPayload(), companySize: "INJECTED_VALUE" };
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects invalid attribution value", () => {
    const data = { ...validPayload(), attribution: "<script>alert(1)</script>" };
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

/* ---------- Message length constraints ---------- */

describe("contactFormSchema — message length", () => {
  it("rejects message shorter than 10 characters", () => {
    const data = { ...validPayload(), message: "short" };
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("accepts message with exactly 10 characters", () => {
    const data = { ...validPayload(), message: "1234567890" };
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects message longer than 5000 characters", () => {
    const data = { ...validPayload(), message: "a".repeat(5001) };
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

/* ---------- Honeypot (anti-spam) ---------- */

describe("contactFormSchema — honeypot anti-spam", () => {
  it("rejects non-empty honeypot (bot detection)", () => {
    const data = { ...validPayload(), honeypot: "i am a bot" };
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("accepts empty honeypot string", () => {
    const data = { ...validPayload(), honeypot: "" };
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

/* ---------- Server schema parity ---------- */

describe("contactFormServerSchema — parity with client schema", () => {
  it("validates identical to client schema", () => {
    const data = validPayload();
    const clientResult = contactFormSchema.safeParse(data);
    const serverResult = contactFormServerSchema.safeParse(data);
    expect(clientResult.success).toBe(serverResult.success);
  });

  it("rejects same invalid payloads as client schema", () => {
    const data = { ...validPayload(), email: "not-valid" };
    const clientResult = contactFormSchema.safeParse(data);
    const serverResult = contactFormServerSchema.safeParse(data);
    expect(clientResult.success).toBe(false);
    expect(serverResult.success).toBe(false);
  });
});

/* ---------- Name length constraints ---------- */

describe("contactFormSchema — name length", () => {
  it("rejects name longer than 100 characters", () => {
    const data = { ...validPayload(), name: "A".repeat(101) };
    const result = contactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
