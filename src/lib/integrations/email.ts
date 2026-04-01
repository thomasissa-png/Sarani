// ─── Microsoft Graph Email Client ──────────────────────────────────────────
// Server-side only. Reuses the same OAuth2 client_credentials flow as SharePoint.
// No npm dependencies beyond what sharepoint.ts already uses.

import { graphFetch } from "./sharepoint";

// ─── Configuration ─────────────────────────────────────────────────────────

const EMAIL_ADDRESS =
  process.env.MICROSOFT_EMAIL_ADDRESS || "team@sarani.studio";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EmailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  bodyPreview: string;
  hasAttachments: boolean;
  conversationId: string; // Microsoft Graph conversationId — groups email threads
}

export interface EmailMessageFull extends EmailMessage {
  body: {
    contentType: string;
    content: string;
  };
  conversationId: string; // Microsoft Graph conversationId — groups email threads
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

// ─── Email Operations ──────────────────────────────────────────────────────

/**
 * Fetch recent unread emails from the configured mailbox.
 * Returns emails sorted by receivedDateTime desc, limited to `limit` (default 20).
 */
export async function getRecentEmails(
  limit: number = 20
): Promise<EmailMessage[]> {
  // Build query string manually — URLSearchParams encodes $ as %24 which Graph API rejects
  // Filter: unread emails NOT sent from any @sarani.studio address
  const query = [
    "$filter=isRead eq false and not(startswith(from/emailAddress/address,'team@sarani.studio'))",
    "$orderby=receivedDateTime desc",
    `$top=${limit}`,
    "$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,conversationId",
  ].join("&");

  const data = await graphFetch<{ value: EmailMessage[] }>(
    `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages?${query}`
  );

  // Additional client-side filter: exclude ALL @sarani.studio senders
  // (the Graph filter above only catches team@, this catches fanny@, etc.)
  return data.value.filter((email) => {
    const fromAddr = email.from?.emailAddress?.address?.toLowerCase() ?? "";
    return !fromAddr.endsWith("@sarani.studio");
  });
}

/**
 * Fetch a single email by ID, including the full HTML body.
 */
export async function getEmailById(
  messageId: string
): Promise<EmailMessageFull> {
  const select = "id,subject,from,receivedDateTime,bodyPreview,hasAttachments,body,conversationId";
  return graphFetch<EmailMessageFull>(
    `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages/${encodeURIComponent(messageId)}?$select=${select}`
  );
}

/**
 * Fetch attachments metadata for an email (without contentBytes to keep payload small).
 */
export async function getEmailAttachments(
  messageId: string
): Promise<EmailAttachment[]> {
  const select = "id,name,contentType,size";
  const data = await graphFetch<{ value: EmailAttachment[] }>(
    `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages/${encodeURIComponent(messageId)}/attachments?$select=${select}`
  );
  return data.value;
}

/**
 * Mark an email as read.
 */
export async function markEmailAsRead(messageId: string): Promise<void> {
  await graphFetch<Record<string, unknown>>(
    `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isRead: true }),
    }
  );
}

// ─── Send / Reply ─────────────────────────────────────────────────────────

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string; // HTML body
  replyToMessageId?: string; // for replies — sets In-Reply-To header
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a new email or reply to an existing message.
 * Uses Microsoft Graph: POST /me/sendMail (new) or POST /me/messages/{id}/reply (reply).
 * Retries once on 429 (throttled) or 503 (service unavailable).
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const { to, subject, body, replyToMessageId } = params;

  const sendWithRetry = async (attempt: number): Promise<SendEmailResult> => {
    try {
      if (replyToMessageId) {
        // Reply to existing message
        await graphFetch<Record<string, unknown>>(
          `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages/${encodeURIComponent(replyToMessageId)}/reply`,
          {
            method: "POST",
            body: JSON.stringify({
              message: {
                toRecipients: [
                  {
                    emailAddress: { address: to },
                  },
                ],
                subject,
                body: {
                  contentType: "HTML",
                  content: body,
                },
              },
              comment: "",
            }),
          }
        );

        // Graph /reply returns 202 with no body — no messageId available
        return { success: true };
      } else {
        // Send new email
        await graphFetch<Record<string, unknown>>(
          `/users/${encodeURIComponent(EMAIL_ADDRESS)}/sendMail`,
          {
            method: "POST",
            body: JSON.stringify({
              message: {
                subject,
                body: {
                  contentType: "HTML",
                  content: body,
                },
                toRecipients: [
                  {
                    emailAddress: { address: to },
                  },
                ],
              },
              saveToSentItems: true,
            }),
          }
        );

        // Graph /sendMail returns 202 with no body — no messageId available
        return { success: true };
      }
    } catch (error: unknown) {
      // Retry once on 429 or 503
      const statusMatch =
        error instanceof Error &&
        (error.message.includes("429") || error.message.includes("503"));

      if (statusMatch && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return sendWithRetry(1);
      }

      const message =
        error instanceof Error ? error.message : "Failed to send email";
      return { success: false, error: message };
    }
  };

  return sendWithRetry(0);
}

// ─── Draft Creation ───────────────────────────────────────────────────────

export interface CreateDraftParams {
  to: string;
  subject: string;
  body: string; // HTML body
  replyToMessageId?: string;
}

export interface CreateDraftResult {
  success: boolean;
  draftId?: string;
  webLink?: string; // Outlook web link for the PM to review and send
  error?: string;
}

/**
 * Create a draft email (NOT sent). The PM reviews and sends manually.
 * Uses Graph API: POST /me/messages (creates in Drafts folder).
 * For replies: POST /me/messages/{id}/createReply then PATCH the draft body.
 */
export async function createDraft(
  params: CreateDraftParams
): Promise<CreateDraftResult> {
  const { to, subject, body, replyToMessageId } = params;

  try {
    if (replyToMessageId) {
      // Create a reply draft
      const replyDraft = await graphFetch<{ id: string; webLink?: string }>(
        `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages/${encodeURIComponent(replyToMessageId)}/createReply`,
        { method: "POST", body: JSON.stringify({}) }
      );

      // Update the draft body with our content
      const updated = await graphFetch<{ id: string; webLink?: string }>(
        `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages/${encodeURIComponent(replyDraft.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            body: { contentType: "HTML", content: body },
          }),
        }
      );

      return {
        success: true,
        draftId: updated.id,
        webLink: updated.webLink,
      };
    }

    // Create a new draft (not a reply)
    const draft = await graphFetch<{ id: string; webLink?: string }>(
      `/users/${encodeURIComponent(EMAIL_ADDRESS)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          subject,
          body: { contentType: "HTML", content: body },
          toRecipients: [
            { emailAddress: { address: to } },
          ],
        }),
      }
    );

    return {
      success: true,
      draftId: draft.id,
      webLink: draft.webLink,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create draft";
    return { success: false, error: message };
  }
}

// ─── HTML Stripping ────────────────────────────────────────────────────────

/**
 * Convert HTML email body to plain text.
 * Handles common email HTML patterns: <br>, <p>, <div>, <li>, tables.
 * No external dependency — uses regex-based stripping.
 */
export function stripHtml(html: string): string {
  let text = html;

  // Replace <br>, <br/>, <br /> with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Replace closing block tags with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n");

  // Replace <li> with bullet
  text = text.replace(/<li[^>]*>/gi, "- ");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, "\u201D")
    .replace(/&ldquo;/gi, "\u201C")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&#\d+;/g, "");

  // Collapse multiple newlines to max 2
  text = text.replace(/\n{3,}/g, "\n\n");

  // Collapse multiple spaces to single space
  text = text.replace(/[ \t]+/g, " ");

  // Trim each line
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  return text;
}

// ─── Health Check ──────────────────────────────────────────────────────────

/**
 * Check if Microsoft Graph email integration is configured.
 * Returns false if the required env vars are missing.
 */
export function isEmailConfigured(): boolean {
  return !!(
    process.env.MICROSOFT_TENANT_ID &&
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET
  );
}
