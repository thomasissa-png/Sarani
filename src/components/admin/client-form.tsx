"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  clientFormSchema,
  type ClientFormData,
  INDUSTRY_OPTIONS,
  LANGUAGE_OPTIONS,
  STATUS_OPTIONS,
  CONTRACT_TEMPLATE_OPTIONS,
} from "@/lib/validations/client";

type ClientFormProps = {
  defaultValues?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => Promise<void>;
  submitLabel: string;
  loading?: boolean;
  cancelHref?: string;
};

export function ClientForm({
  defaultValues,
  onSubmit,
  submitLabel,
  loading,
  cancelHref,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      status: "prospect",
      primaryLanguage: "EN",
      secondaryLanguages: [],
      signedFrameworkAgreement: false,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Bloc 1: Identity */}
      <FormSection title="Identity" description="Core client information (required)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Client Name" error={errors.name?.message} required>
            <input {...register("name")} className={inputClass} placeholder="e.g. TikTok, Sony, GEODIS" />
          </Field>

          <Field label="Industry" error={errors.industry?.message} required>
            <select {...register("industry")} className={inputClass}>
              <option value="">Select...</option>
              {INDUSTRY_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>

          <Field label="Status" error={errors.status?.message}>
            <select {...register("status")} className={inputClass}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>

          <Field label="Primary Language" error={errors.primaryLanguage?.message} required>
            <select {...register("primaryLanguage")} className={inputClass}>
              {LANGUAGE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>

          <Field label="Contact Name" error={errors.primaryContactName?.message}>
            <input {...register("primaryContactName")} className={inputClass} placeholder="John Doe" />
          </Field>

          <Field label="Contact Email" error={errors.primaryContactEmail?.message}>
            <input {...register("primaryContactEmail")} type="email" className={inputClass} placeholder="john@company.com" />
          </Field>

          <Field label="ClickUp Project ID" error={errors.clickupProjectId?.message}>
            <input {...register("clickupProjectId")} className={inputClass} placeholder="Optional" />
          </Field>
        </div>
      </FormSection>

      {/* Bloc 2: Brand */}
      <FormSection title="Brand" description="Visual identity and tone (optional, used by Designer IA)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Primary Color (hex)" error={errors.primaryColor?.message}>
            <input {...register("primaryColor")} className={inputClass} placeholder="#FF5500" />
          </Field>

          <Field label="Secondary Colors" error={errors.secondaryColors?.message}>
            <input {...register("secondaryColors")} className={inputClass} placeholder="#000000, #FFFFFF" />
          </Field>

          <Field label="Font Name" error={errors.fontName?.message}>
            <input {...register("fontName")} className={inputClass} placeholder="Gotham, Helvetica Neue" />
          </Field>
        </div>

        <Field label="Brand Tone" error={errors.brandTone?.message}>
          <textarea {...register("brandTone")} className={textareaClass} rows={3} placeholder="Describe the brand's tone of voice in 3-5 sentences..." />
        </Field>

        <Field label="Brand Guidelines Notes" error={errors.brandGuidelinesNotes?.message}>
          <textarea {...register("brandGuidelinesNotes")} className={textareaClass} rows={3} placeholder="Specific notes from the brand book..." />
        </Field>
      </FormSection>

      {/* Bloc 3: Translation */}
      <FormSection title="Translation" description="Glossary and preferences (optional, used by Translator)">
        <Field label="Translation Memory" error={errors.translationMemory?.message}>
          <textarea {...register("translationMemory")} className={textareaClass} rows={3} placeholder="Previously validated translations..." />
        </Field>

        <Field label="Prohibited Terms" error={errors.prohibitedTerms?.message}>
          <textarea {...register("prohibitedTerms")} className={textareaClass} rows={2} placeholder="Words to avoid in translations..." />
        </Field>
      </FormSection>

      {/* Bloc 4: Legal */}
      <FormSection title="Legal" description="Legal entity information (optional, used by Legal IA)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Legal Entity Name" error={errors.legalEntityName?.message}>
            <input {...register("legalEntityName")} className={inputClass} placeholder="Company Inc." />
          </Field>

          <Field label="Legal Country" error={errors.legalCountry?.message}>
            <input {...register("legalCountry")} className={inputClass} placeholder="FR, US, UK..." />
          </Field>

          <Field label="VAT Number" error={errors.vatNumber?.message}>
            <input {...register("vatNumber")} className={inputClass} placeholder="FR12345678901" />
          </Field>

          <Field label="Contract Template" error={errors.preferredContractTemplate?.message}>
            <select {...register("preferredContractTemplate")} className={inputClass}>
              <option value="">None</option>
              {CONTRACT_TEMPLATE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700 mt-2">
          <input type="checkbox" {...register("signedFrameworkAgreement")} className="rounded border-neutral-300" />
          Framework agreement signed
        </label>
      </FormSection>

      {/* Bloc 5: Workspace */}
      <FormSection title="Workspace" description="ClickUp, SharePoint, and asset links (optional)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="ClickUp Space ID" error={errors.clickupSpaceId?.message}>
            <input {...register("clickupSpaceId")} className={inputClass} placeholder="e.g. 12345678" />
          </Field>

          <Field label="SharePoint Folder" error={errors.sharepointFolder?.message}>
            <input {...register("sharepointFolder")} className={inputClass} placeholder="e.g. /Clients/TikTok/Assets" />
          </Field>

          <Field label="Excel Tracker Filename" error={errors.excelTrackerFilename?.message}>
            <input {...register("excelTrackerFilename")} className={inputClass} placeholder="e.g. TikTok_Tracker_2026.xlsx" />
          </Field>

          <Field label="Brand Guidelines Link" error={errors.brandGuidelinesLink?.message}>
            <input {...register("brandGuidelinesLink")} type="url" className={inputClass} placeholder="https://sharepoint.com/..." />
          </Field>

          <Field label="Logo Folder Link" error={errors.logoFolderLink?.message}>
            <input {...register("logoFolderLink")} type="url" className={inputClass} placeholder="https://sharepoint.com/..." />
          </Field>

          <Field label="Font Folder Link" error={errors.fontFolderLink?.message}>
            <input {...register("fontFolderLink")} type="url" className={inputClass} placeholder="https://sharepoint.com/..." />
          </Field>
        </div>

        <Field label="Notes" error={errors.notes?.message}>
          <textarea {...register("notes")} className={textareaClass} rows={4} placeholder="Free-form notes about the client..." />
        </Field>
      </FormSection>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
        {cancelHref && (
          <Link
            href={cancelHref}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </Link>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-brand-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent transition-all";

const textareaClass =
  "w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-brand-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-cerulean focus:border-transparent transition-all resize-y";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-brand-black">{title}</h2>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
