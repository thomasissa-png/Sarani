"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactFormSchema,
  COMPANY_SIZE_OPTIONS,
  ATTRIBUTION_OPTIONS,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  type ContactFormData,
} from "@/lib/validation";
import { track, getDevice } from "@/lib/analytics";

/* ---------- Types ---------- */

type FormStatus = "idle" | "submitting" | "success" | "server_error" | "rate_limited";

/* ---------- Field Components ---------- */

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-error">
      {message}
    </p>
  );
}

const inputStyles = [
  "w-full rounded-lg border bg-brand-white px-4 py-3",
  "text-brand-black placeholder:text-neutral-400",
  "border-neutral-300 focus:border-brand-cerulean focus:outline-none focus:ring-1 focus:ring-brand-cerulean",
  "transition-colors duration-150",
  "min-h-[44px]",
].join(" ");

const inputErrorStyles = "border-error focus:border-error focus:ring-error";

const labelStyles = "mb-1.5 block text-sm font-medium text-neutral-700";

/* ---------- ContactForm ---------- */

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const formStartFired = useRef(false);
  const formViewFired = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      message: "",
      honeypot: "",
    },
  });

  /* ---------- Analytics: form_view (IntersectionObserver) ---------- */

  useEffect(() => {
    if (!formRef.current || formViewFired.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !formViewFired.current) {
          formViewFired.current = true;
          track("form_view", { page: "/contact", device: getDevice() });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(formRef.current);
    return () => observer.disconnect();
  }, []);

  /* ---------- Analytics: form_start (first interaction) ---------- */

  function handleFieldInteraction() {
    if (!formStartFired.current) {
      formStartFired.current = true;
      track("form_start", { page: "/contact", device: getDevice() });
    }
  }

  /* ---------- File validation ---------- */

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    setSelectedFile(null);

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError(
        "That file is too large. Max 10MB \u2014 or share a link instead."
      );
      track("form_error", {
        error_type: "file_too_large",
        page: "/contact",
        device: getDevice(),
      });
      e.target.value = "";
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setFileError("Accepted: PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, ZIP.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  /* ---------- Submit ---------- */

  async function onSubmit(data: ContactFormData) {
    if (status === "submitting") return;

    setStatus("submitting");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000); // EC-103-4: 15s timeout

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        track("form_submit", {
          company_size: data.companySize,
          attribution: data.attribution ?? "not_specified",
          page: "/contact",
          device: getDevice(),
        });
        setStatus("success");
        reset();
        setSelectedFile(null);
      } else if (response.status === 429) {
        setStatus("rate_limited");
        track("form_error", {
          error_type: "rate_limited",
          page: "/contact",
          device: getDevice(),
        });
      } else {
        setStatus("server_error");
        track("form_error", {
          error_type: "server_error",
          page: "/contact",
          device: getDevice(),
        });
      }
    } catch {
      clearTimeout(timeout);
      setStatus("server_error");
      track("form_error", {
        error_type: "server_error",
        page: "/contact",
        device: getDevice(),
      });
    }
  }

  /* ---------- Focus first error field on validation failure ---------- */

  function onInvalid() {
    const fieldOrder: (keyof ContactFormData)[] = [
      "name",
      "company",
      "email",
      "message",
      "companySize",
      "attribution",
    ];
    const firstErrorField = fieldOrder.find((field) => errors[field]);
    if (firstErrorField) {
      setFocus(firstErrorField);
    }

    track("form_error", {
      error_type: "validation_error",
      page: "/contact",
      device: getDevice(),
    });
  }

  /* ---------- Success State ---------- */

  if (status === "success") {
    return (
      <div
        aria-live="polite"
        className="rounded-lg border border-neutral-300 bg-surface-elevated p-8 text-center sm:p-12"
      >
        <div className="mb-6 flex justify-center">
          <svg
            className="h-12 w-12 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-brand-black">
          Brief received.
        </h2>
        <p className="text-lg text-neutral-600">
          We'll respond within the hour.
        </p>
      </div>
    );
  }

  /* ---------- Form Render ---------- */

  const isSubmitting = status === "submitting";

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      onFocus={handleFieldInteraction}
      noValidate
      className="space-y-6"
    >
      {/* Honeypot — hidden from real users */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="contact-honeypot">Do not fill this field</label>
        <input
          id="contact-honeypot"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("honeypot")}
        />
      </div>

      {/* Server error banner */}
      {status === "server_error" && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border-l-4 border-error bg-error-light p-4"
        >
          <p className="text-sm text-brand-black">
            That didn't go through. Try again — or email us directly:{" "}
            <a
              href="mailto:team@sarani.studio"
              className="underline underline-offset-2"
            >
              team@sarani.studio
            </a>
          </p>
        </div>
      )}

      {/* Rate limit banner */}
      {status === "rate_limited" && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border-l-4 border-warning bg-warning-light p-4"
        >
          <p className="text-sm text-brand-black">
            Too many requests. Give it a minute and try again.
          </p>
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="contact-name" className={labelStyles}>
          Your name <span className="text-error">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          placeholder="Sophie Martin"
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
          disabled={isSubmitting}
          className={`${inputStyles} ${errors.name ? inputErrorStyles : ""}`}
          {...register("name")}
        />
        <FieldError id="contact-name-error" message={errors.name?.message} />
      </div>

      {/* Company */}
      <div>
        <label htmlFor="contact-company" className={labelStyles}>
          Company <span className="text-error">*</span>
        </label>
        <input
          id="contact-company"
          type="text"
          placeholder="TikTok, Sony, Adidas..."
          autoComplete="organization"
          aria-invalid={!!errors.company}
          aria-describedby={
            errors.company ? "contact-company-error" : undefined
          }
          disabled={isSubmitting}
          className={`${inputStyles} ${errors.company ? inputErrorStyles : ""}`}
          {...register("company")}
        />
        <FieldError
          id="contact-company-error"
          message={errors.company?.message}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className={labelStyles}>
          Email <span className="text-error">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          placeholder="you@yourcompany.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          disabled={isSubmitting}
          className={`${inputStyles} ${errors.email ? inputErrorStyles : ""}`}
          {...register("email")}
        />
        <FieldError
          id="contact-email-error"
          message={errors.email?.message}
        />
      </div>

      {/* Message / Brief */}
      <div>
        <label htmlFor="contact-message" className={labelStyles}>
          What do you need? <span className="text-error">*</span>
        </label>
        <textarea
          id="contact-message"
          placeholder={
            '"We need 50 banners in 3 languages by Friday..."'
          }
          rows={4}
          aria-invalid={!!errors.message}
          aria-describedby={
            errors.message
              ? "contact-message-error"
              : "contact-message-help"
          }
          disabled={isSubmitting}
          className={`${inputStyles} resize-y ${errors.message ? inputErrorStyles : ""}`}
          {...register("message")}
        />
        {errors.message ? (
          <FieldError
            id="contact-message-error"
            message={errors.message.message}
          />
        ) : (
          <p id="contact-message-help" className="mt-1.5 text-xs text-neutral-600">
            No formal brief? A sentence on what you need, your deadline, and
            your budget is enough.
          </p>
        )}
      </div>

      {/* Company size */}
      <div>
        <label htmlFor="contact-company-size" className={labelStyles}>
          Company size <span className="text-error">*</span>
        </label>
        <select
          id="contact-company-size"
          aria-invalid={!!errors.companySize}
          aria-describedby={
            errors.companySize ? "contact-company-size-error" : undefined
          }
          disabled={isSubmitting}
          className={`${inputStyles} appearance-none ${errors.companySize ? inputErrorStyles : ""}`}
          defaultValue=""
          {...register("companySize")}
        >
          <option value="" disabled>
            Select company size
          </option>
          {COMPANY_SIZE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <FieldError
          id="contact-company-size-error"
          message={errors.companySize?.message}
        />
      </div>

      {/* Attribution */}
      <div>
        <label htmlFor="contact-attribution" className={labelStyles}>
          How did you hear about us?
        </label>
        <select
          id="contact-attribution"
          aria-invalid={!!errors.attribution}
          aria-describedby={
            errors.attribution ? "contact-attribution-error" : undefined
          }
          disabled={isSubmitting}
          className={`${inputStyles} appearance-none ${errors.attribution ? inputErrorStyles : ""}`}
          defaultValue=""
          {...register("attribution")}
        >
          <option value="" disabled>
            Select an option
          </option>
          {ATTRIBUTION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <FieldError
          id="contact-attribution-error"
          message={errors.attribution?.message}
        />
      </div>

      {/* File attachment */}
      <div>
        <label htmlFor="contact-file" className={labelStyles}>
          Attach a brief or reference{" "}
          <span className="text-neutral-600">(optional)</span>
        </label>
        <input
          id="contact-file"
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
          aria-label="Attach a brief or reference file"
          aria-describedby={fileError ? "contact-file-error" : "contact-file-help"}
          disabled={isSubmitting}
          onChange={handleFileChange}
          className="w-full text-sm text-neutral-500 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-200 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-black hover:file:bg-neutral-300 file:cursor-pointer file:transition-colors"
        />
        {fileError ? (
          <p id="contact-file-error" role="alert" className="mt-1.5 text-sm text-error">
            {fileError}
          </p>
        ) : (
          <p id="contact-file-help" className="mt-1.5 text-xs text-neutral-600">
            Accepted: PDF, DOC, PPT, JPG, PNG, ZIP. Max 10MB.
          </p>
        )}
        {selectedFile && !fileError && (
          <p className="mt-1 text-xs text-neutral-500">
            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
          </p>
        )}
      </div>

      {/* Privacy notice */}
      <p className="text-xs text-neutral-500">
        By submitting this form, you acknowledge that Sarani will process your
        data to respond to your inquiry. See our{" "}
        <a
          href="/legal"
          className="text-brand-cerulean-dark underline underline-offset-2 transition-colors hover:text-brand-cerulean"
        >
          Privacy Policy
        </a>
        .
      </p>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-label={isSubmitting ? "Sending your brief" : "Send my brief"}
        className={[
          "w-full rounded-full py-4 text-base font-bold transition-all duration-150",
          isSubmitting
            ? "cursor-not-allowed bg-brand-flame-dark text-brand-white/60"
            : "cursor-pointer bg-brand-flame text-brand-white hover:bg-brand-flame-dark hover:scale-[1.02] active:scale-[0.98]",
          "focus-visible:outline-3 focus-visible:outline-brand-cerulean focus-visible:outline-offset-2",
        ].join(" ")}
      >
        {isSubmitting ? "Sending..." : "Send my brief"}
      </button>

      {/* Guarantee micro-reassurance */}
      <p className="text-center text-sm text-neutral-400">
        First project satisfaction or no invoice.
      </p>
    </form>
  );
}
