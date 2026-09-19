/**
 * Session Replay and Privacy Compliance Utility
 * 
 * Enforces privacy-by-default rules:
 * 1. Session Replay is OFF by default to eliminate wiretapping / CIPA / GDPR legal exposure.
 * 2. Mandatory masking of all sensitive inputs (credit card numbers, CVVs, passwords, tenant personal details).
 * 3. Adds data-mask and data-private attributes to DOM elements.
 */

const STORAGE_KEY = 'bprop_privacy_session_replay_enabled';

class PrivacyComplianceManager {
  private isReplayEnabled: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    // Session replay is OFF by default
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        this.isReplayEnabled = stored === 'true'; // false if null or 'false'
      } catch {
        this.isReplayEnabled = false;
      }
    }
  }

  /**
   * Initializes privacy safeguards and DOM input masking
   */
  public initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Apply strict input masking attributes to DOM mutations
    this.setupInputMaskingObserver();

    // Log compliance status
    console.info(
      `[Privacy Safeguard] Session Replay is ${
        this.isReplayEnabled ? 'ENABLED (User Opt-in)' : 'DISABLED BY DEFAULT (Protected)'
      }. Input masking active.`
    );
  }

  /**
   * Checks if session recording is allowed (Default: false)
   */
  public isReplayAllowed(): boolean {
    return this.isReplayEnabled;
  }

  /**
   * Allows user to explicitly opt-in or out
   */
  public setReplayPermission(allowed: boolean) {
    this.isReplayEnabled = allowed;
    try {
      localStorage.setItem(STORAGE_KEY, allowed ? 'true' : 'false');
    } catch (e) {
      console.warn('Unable to persist session replay preference', e);
    }
  }

  /**
   * Automatically tags sensitive inputs with privacy mask attributes
   * recognized by all major replay engines (LogRocket, Clarity, Hotjar, PostHog, FullStory)
   */
  private setupInputMaskingObserver() {
    if (typeof document === 'undefined') return;

    const maskElements = () => {
      // Selector for inputs that should always be masked
      const sensitiveInputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input, textarea, select'
      );

      sensitiveInputs.forEach((el) => {
        // Enforce privacy attributes
        if (!el.hasAttribute('data-mask')) {
          el.setAttribute('data-mask', 'true');
        }
        if (!el.hasAttribute('data-private')) {
          el.setAttribute('data-private', 'true');
        }
        // Universal class for masking in tools like FullStory / LogRocket / PostHog
        if (!el.classList.contains('fs-mask')) {
          el.classList.add('fs-mask');
        }
        if (!el.classList.contains('ph-no-capture')) {
          el.classList.add('ph-no-capture');
        }
      });
    };

    // Run once on load
    maskElements();

    // Watch for dynamic modal/form openings
    const observer = new MutationObserver(() => {
      maskElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Helper to mask arbitrary strings in audit logs or previews
   */
  public maskValue(value: string | undefined | null): string {
    if (!value) return '';
    if (value.length <= 4) return '••••';
    return `${value.slice(0, 2)}••••${value.slice(-2)}`;
  }
}

export const privacyManager = new PrivacyComplianceManager();

export function initSessionReplayPrivacy() {
  privacyManager.initialize();
}
