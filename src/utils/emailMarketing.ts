/**
 * CAN-SPAM and International Email Compliance Utility
 * 
 * Mandates for all commercial and marketing communications:
 * 1. Valid Physical Postal Address of the sender.
 * 2. Clear, conspicuous, functioning Unsubscribe link.
 * 3. Transparent sender identification.
 */

export const COMPANY_PHYSICAL_ADDRESS = {
  companyName: "b ventures (owning company of amra solution)",
  streetAddress: "30 N Gould St",
  city: "Sheridan",
  state: "WY",
  postalCode: "82801",
  country: "United States",
  supportEmail: "compliance@bprop.app",
  formatted: "b ventures (owning company of amra solution), 30 N Gould St, Sheridan, WY, USA, 82801"
};

const UNSUBSCRIBE_STORAGE_KEY = 'bprop_unsubscribed_marketing_emails';

/**
 * Checks if a specific email address has opted out of marketing communications
 */
export function isEmailUnsubscribed(email: string): boolean {
  if (!email || typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(UNSUBSCRIBE_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(email.trim().toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Opts out an email address from receiving marketing communications
 */
export function recordUnsubscribe(email: string): boolean {
  if (!email || typeof window === 'undefined') return false;
  try {
    const normalized = email.trim().toLowerCase();
    const raw = localStorage.getItem(UNSUBSCRIBE_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(normalized)) {
      list.push(normalized);
      localStorage.setItem(UNSUBSCRIBE_STORAGE_KEY, JSON.stringify(list));
    }
    return true;
  } catch (err) {
    console.error('Failed to save unsubscribe preference:', err);
    return false;
  }
}

/**
 * Generates an unsubscribe URL for email footers
 */
export function getUnsubscribeUrl(recipientEmail: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bprop.app';
  return `${origin}/#unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
}

/**
 * CAN-SPAM compliant HTML email footer with physical address and unsubscribe link
 */
export function getCompliantEmailFooterHtml(recipientEmail: string, customPhysicalAddress?: string): string {
  const unsubUrl = getUnsubscribeUrl(recipientEmail);
  const physicalAddr = customPhysicalAddress || COMPANY_PHYSICAL_ADDRESS.formatted;

  return `
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 1.6; color: #64748b; text-align: center;">
      <p style="margin: 0 0 8px 0;">
        You received this email because you are registered as an occupant, property owner, or manager on the bProp Platform.
      </p>
      <p style="margin: 0 0 8px 0; font-weight: 500;">
        <strong>Our Physical Mailing Address:</strong><br />
        ${physicalAddr}
      </p>
      <p style="margin: 8px 0 0 0;">
        No longer wish to receive non-transactional marketing notices? 
        <a href="${unsubUrl}" style="color: #2563eb; text-decoration: underline; font-weight: 600;" target="_blank" rel="noopener noreferrer">
          Click here to safely unsubscribe
        </a> or reply with "UNSUBSCRIBE" in the subject line.
      </p>
    </div>
  `;
}

/**
 * CAN-SPAM compliant plain-text email footer with physical address and unsubscribe link
 */
export function getCompliantEmailFooterText(recipientEmail: string, customPhysicalAddress?: string): string {
  const unsubUrl = getUnsubscribeUrl(recipientEmail);
  const physicalAddr = customPhysicalAddress || COMPANY_PHYSICAL_ADDRESS.formatted;

  return `\n\n------------------------------------------------------------\n` +
    `Mailing Address:\n` +
    `${physicalAddr}\n\n` +
    `Unsubscribe Link:\n` +
    `To opt out of future marketing updates, click or visit:\n` +
    `${unsubUrl}\n` +
    `You may also reply to this email with "UNSUBSCRIBE".\n` +
    `------------------------------------------------------------\n`;
}

/**
 * Creates a ready-to-send or copyable email body containing CAN-SPAM compliant footer
 */
export function formatMarketingEmail({
  recipientName,
  recipientEmail,
  subject,
  contentBody,
  senderBuildingName
}: {
  recipientName: string;
  recipientEmail: string;
  subject: string;
  contentBody: string;
  senderBuildingName?: string;
}): {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  mailtoLink: string;
} {
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
  const senderNotice = senderBuildingName ? `Sent on behalf of ${senderBuildingName}` : 'Sent via bProp Platform';

  const bodyText = `${greeting}\n\n${contentBody}\n\nBest regards,\n${senderNotice}\n${getCompliantEmailFooterText(recipientEmail)}`;
  
  const bodyHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p style="margin-bottom: 16px;">${greeting}</p>
      <div style="line-height: 1.6; margin-bottom: 24px;">
        ${contentBody.replace(/\n/g, '<br />')}
      </div>
      <p style="margin-top: 24px; color: #475569;">
        Best regards,<br />
        <strong>${senderNotice}</strong>
      </p>
      ${getCompliantEmailFooterHtml(recipientEmail)}
    </div>
  `;

  const mailtoLink = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

  return {
    subject,
    bodyText,
    bodyHtml,
    mailtoLink
  };
}
