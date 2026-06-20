/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalizes phone numbers to standard international format (no spaces, dashes, or plus signs for wa.me)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  // Remove all non-numeric characters, keeping digits
  let cleaned = phone.replace(/\D/g, '');
  // If number starts with 00, replace with no prefix
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  // If it doesn't start with a country code (for US, standard is 1)
  // Let's assume standard international numbers are already provided. If not, don't over-manipulate.
  return cleaned;
}

/**
 * Generates a WhatsApp wa.me Link for a Rent Payment Receipt
 */
export function getReceiptWhatsAppLink(
  phone: string,
  tenantName: string,
  unit: string,
  amount: number,
  monthPaidFor: string,
  receiptNumber: string,
  datePaid: string,
  paymentMethod: string,
  customTemplate?: string,
  currencySymbol: string = 'JOD',
  transferId?: string
): string {
  const normalizedPhone = formatPhoneForWhatsApp(phone);
  
  let text = '';
  if (customTemplate) {
    const formattedAmount = `${amount.toLocaleString()} ${currencySymbol}`;
    text = customTemplate
      .replace(/{TenantName}/g, tenantName)
      .replace(/{BeneficiaryName}/g, tenantName)
      .replace(/{Unit}/g, unit)
      .replace(/{AmountPaid}/g, formattedAmount)
      .replace(/{BillingMonth}/g, monthPaidFor)
      .replace(/{PaymentMethod}/g, paymentMethod)
      .replace(/{DatePaid}/g, datePaid)
      .replace(/{ReceiptNo}/g, receiptNumber)
      .replace(/{transfer_ID}/g, transferId || '');
  } else {
    text = `Hello *${tenantName}* 👋,\n\n` +
      `Thank you for your rent payment! Here is your official payment receipt:\n\n` +
      `🏢 *Unit:* ${unit}\n` +
      `🛢️ *Amount Paid:* ${amount.toLocaleString()} ${currencySymbol}\n` +
      `📅 *Billing Month:* ${monthPaidFor}\n` +
      `💳 *Payment Method:* ${paymentMethod}\n` +
      (transferId ? `🔑 *Transfer ID:* ${transferId}\n` : '') +
      `📅 *Date Paid:* ${datePaid}\n` +
      `🧾 *Receipt No:* ${receiptNumber}\n\n` +
      `*Status:* ✅ Fully Paid & Settled\n\n` +
      `If you have any questions, please feel free to reach out. Thank you for being a wonderful tenant!`;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Helper to parse custom template tags using tenant and billing info
 */
export function parseReminderTemplate(
  template: string,
  tenantName: string,
  unit: string,
  amount: number,
  dueDateDesc: string,
  monthName: string,
  currencySymbol: string = 'JOD',
  transferId?: string
): string {
  const cleanDueDay = dueDateDesc.replace(/\D/g, '');
  const displayDueDay = cleanDueDay || dueDateDesc;
  const formattedAmount = `${amount.toLocaleString()} ${currencySymbol}`;

  return template
    .replace(/{TenantName}/g, tenantName)
    .replace(/{BeneficiaryName}/g, tenantName)
    .replace(/{Unit}/g, unit)
    .replace(/{RentAmount}/g, formattedAmount)
    .replace(/{ShareAmount}/g, formattedAmount)
    .replace(/{DueDay}/g, displayDueDay)
    .replace(/{Month}/g, monthName)
    .replace(/{transfer_ID}/g, transferId || '');
}

/**
 * Generates a WhatsApp wa.me Link for a Monthly Rent Payment Due Reminder
 */
export function getReminderWhatsAppLink(
  phone: string,
  tenantName: string,
  unit: string,
  amount: number,
  dueDateDesc: string,
  monthName: string,
  customTemplate?: string,
  currencySymbol: string = 'JOD',
  transferId?: string
): string {
  const normalizedPhone = formatPhoneForWhatsApp(phone);

  let text = '';
  if (customTemplate) {
    text = parseReminderTemplate(customTemplate, tenantName, unit, amount, dueDateDesc, monthName, currencySymbol, transferId);
  } else {
    text = `Hello *${tenantName}* 👋,\n\n` +
      `This is a friendly reminder regarding the upcoming rent payment for *Unit ${unit}*.\n\n` +
      `📊 *Due Amount:* ${amount.toLocaleString()} ${currencySymbol}\n` +
      `📅 *Billing Month:* ${monthName}\n` +
      `⏰ *Due Date:* ${dueDateDesc}\n\n` +
      (transferId ? `🏦 *Please remit to Bank Transfer ID (IBAN/ALIAS):* ${transferId}\n\n` : '') +
      `Please settle your rent balance on or before the due date. You can reply with a screenshot list of your payment receipt once completed.\n\n` +
      `Thank you, and have a great day! ✨`;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}
