import { describe, it, expect } from 'vitest';
import {
  formatPhoneForWhatsApp,
  getReceiptWhatsAppLink,
  parseReminderTemplate,
  getReminderWhatsAppLink
} from '../utils/whatsapp';

describe('WhatsApp Integration Utility Tests', () => {
  describe('formatPhoneForWhatsApp', () => {
    it('should strip non-numeric symbols', () => {
      expect(formatPhoneForWhatsApp('+1 (555) 123-4567')).toBe('15551234567');
      expect(formatPhoneForWhatsApp('0096279123456')).toBe('96279123456'); // strips '00' prefix
    });

    it('should return empty string for falsy input', () => {
      expect(formatPhoneForWhatsApp('')).toBe('');
    });
  });

  describe('getReceiptWhatsAppLink', () => {
    it('should generate accurate link with default standard template', () => {
      const link = getReceiptWhatsAppLink(
        '+15550001',
        'John Doe',
        'Apt 101',
        1200,
        'June 2026',
        'REC-123456',
        '2026-06-05',
        'Bank Transfer'
      );

      // Verify wa.me target phone number is formatted
      expect(link).toContain('https://wa.me/15550001?text=');

      // Verify the generated message body has the main info
      const decodedText = decodeURIComponent(link.split('?text=')[1]);
      expect(decodedText).toContain('John Doe');
      expect(decodedText).toContain('Apt 101');
      expect(decodedText).toContain('1,200 JOD');
      expect(decodedText).toContain('REC-123456');
    });

    it('should replace tags correctly if custom template is specified', () => {
      const customTemplate = 'Receipt {ReceiptNo} for {TenantName}: Paid {AmountPaid} on {DatePaid}';
      const link = getReceiptWhatsAppLink(
        '0096279111',
        'Sarah Jenkins',
        '302',
        1550,
        'July 2026',
        'REC-999',
        '2026-07-01',
        'Cash',
        customTemplate,
        'USD'
      );

      const decodedText = decodeURIComponent(link.split('?text=')[1]);
      expect(decodedText).toBe('Receipt REC-999 for Sarah Jenkins: Paid 1,550 USD on 2026-07-01');
    });
  });

  describe('parseReminderTemplate & getReminderWhatsAppLink', () => {
    it('should parse custom tags for payment reminder notices', () => {
      const customTemplate = 'Dear {TenantName}, Unit {Unit} rent of {DueAmount} is due on day {DueDay} for {Month}.';
      const message = parseReminderTemplate(
        customTemplate,
        'Michael Chang',
        '102',
        1250,
        'the 5th',
        'June 2026',
        'JOD'
      );

      expect(message).toBe('Dear Michael Chang, Unit 102 rent of 1,250 JOD is due on day 5 for June 2026.');
    });

    it('should construct a reminder link correctly', () => {
      const link = getReminderWhatsAppLink(
        '+15550244',
        'Michael Chang',
        '102',
        1250,
        'the 5th',
        'June 2026'
      );

      expect(link).toContain('https://wa.me/15550244?text=');
      const decodedText = decodeURIComponent(link.split('?text=')[1]);
      expect(decodedText).toContain('Michael Chang');
      expect(decodedText).toContain('1,250 JOD');
      expect(decodedText).toContain('the 5th');
    });
  });
});
