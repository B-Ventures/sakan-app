/**
 * satisfaction of Layer 9: Rate Limiting
 * Throttles client-side database modification requests to prevent accidental infinite loops
 * or rapid click spam, protecting Firestore database quota limits.
 */

class ClientRateLimiter {
  private requestHistory: Map<string, number[]> = new Map();
  private maxRequests: number = 150; // Allowing max 150 key modifications to accommodate bulk updates like Autopilot Sync
  private timeWindowMs: number = 10000; // in a rolling 10 seconds window

  /**
   * Check if a specific action (identified by userId or actionName) is permitted.
   */
  public attemptAction(actionKey: string): { allowed: boolean; remaining: number; resetSec: number } {
    const now = Date.now();
    const timestamps = this.requestHistory.get(actionKey) || [];

    // Filter out timestamps older than the window
    const activeTimestamps = timestamps.filter(ts => now - ts < this.timeWindowMs);

    if (activeTimestamps.length >= this.maxRequests) {
      const oldestActive = activeTimestamps[0];
      const resetMs = this.timeWindowMs - (now - oldestActive);
      this.requestHistory.set(actionKey, activeTimestamps);
      return {
        allowed: false,
        remaining: 0,
        resetSec: Math.ceil(resetMs / 1000)
      };
    }

    activeTimestamps.push(now);
    this.requestHistory.set(actionKey, activeTimestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - activeTimestamps.length,
      resetSec: 0
    };
  }

  public reset(actionKey: string): void {
    this.requestHistory.delete(actionKey);
  }
}

export const clientRateLimiter = new ClientRateLimiter();
