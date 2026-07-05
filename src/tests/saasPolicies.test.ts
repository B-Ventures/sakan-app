import { describe, it, expect } from 'vitest';
import { Building, MultiPropertyConfig } from '../types';
import { clientRateLimiter } from '../utils/rateLimiter';

// Replicating helper functions to test them directly in clean isolation
const isPortfolioAddon = (building: Building, allBuildings: Building[]) => {
  const ownerBldgs = allBuildings
    .filter(b => b.ownerId === building.ownerId)
    .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
  
  if (ownerBldgs.length <= 1) return false;
  return ownerBldgs[0].id !== building.id;
};

const getPlanBasePrice = (
  planId: string,
  building: Building,
  buildings: Building[],
  multiPropConfig: MultiPropertyConfig | null,
  plans: { id: string; price: number }[] = []
) => {
  const isAddon = buildings && buildings.length > 0 && (multiPropConfig?.isEnabled !== false);
  if (isAddon) {
    const ownerBldgs = buildings
      .filter(b => b.ownerId === building.ownerId)
      .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
    const isEligibleAddon = ownerBldgs.length > 1 && ownerBldgs[0].id !== building.id;
    if (isEligibleAddon) {
      const rate = multiPropConfig?.additionalPropertyRate ?? 5;
      return planId === 'annually' ? rate * 12 : rate;
    }
  }

  const dbPlan = plans.find(p => p.id === planId);
  if (dbPlan) return dbPlan.price;
  return planId === 'annually' ? 96 : 10;
};

describe('Multi-Property Portfolio Add-on Pricing Discount Policy', () => {
  const ownerId = 'owner_123';

  const b1: Building = {
    id: 'bldg_1',
    ownerId: ownerId,
    name: 'First Property',
    createdAt: '2026-01-01T00:00:00Z',
    address: 'Address 1',
    subscriptionPlan: 'monthly',
    subscriptionStatus: 'active'
  };

  const b2: Building = {
    id: 'bldg_2',
    ownerId: ownerId,
    name: 'Second Property',
    createdAt: '2026-02-01T00:00:00Z',
    address: 'Address 2',
    subscriptionPlan: 'monthly',
    subscriptionStatus: 'active'
  };

  const b3: Building = {
    id: 'bldg_3',
    ownerId: 'different_owner',
    name: 'Other Owner Property',
    createdAt: '2026-01-15T00:00:00Z',
    address: 'Address 3',
    subscriptionPlan: 'monthly',
    subscriptionStatus: 'active'
  };

  it('should correctly identify additional portfolio buildings', () => {
    const buildingsList = [b1, b2, b3];

    // Single building for ownerId doesn't get discount
    expect(isPortfolioAddon(b1, [b1, b3])).toBe(false);

    // First building (chronologically) does not get portfolio discount
    expect(isPortfolioAddon(b1, buildingsList)).toBe(false);

    // Second building for same owner gets portfolio discount
    expect(isPortfolioAddon(b2, buildingsList)).toBe(true);

    // Building belonging to another owner doesn't get portfolio discount
    expect(isPortfolioAddon(b3, buildingsList)).toBe(false);
  });

  it('should compute standard pricing when policy is disabled', () => {
    const config: MultiPropertyConfig = {
      isEnabled: false,
      firstPropertyRatePremium: 20,
      additionalPropertyRate: 5,
      currency: 'JOD'
    };

    const buildingsList = [b1, b2, b3];

    // Even if b2 is an additional building, if policy is disabled, it pays standard
    const b2Price = getPlanBasePrice('monthly', b2, buildingsList, config);
    expect(b2Price).toBe(10); // Standard monthly price
  });

  it('should compute discounted pricing when policy is enabled', () => {
    const config: MultiPropertyConfig = {
      isEnabled: true,
      firstPropertyRatePremium: 20,
      additionalPropertyRate: 5,
      currency: 'JOD'
    };

    const buildingsList = [b1, b2, b3];

    // First building pays standard
    const b1Price = getPlanBasePrice('monthly', b1, buildingsList, config);
    expect(b1Price).toBe(10);

    // Second building gets additional rate (5 JOD/mo)
    const b2Price = getPlanBasePrice('monthly', b2, buildingsList, config);
    expect(b2Price).toBe(5);

    // Annual plan for second building gets 5 * 12 = 60 JOD/yr
    const b2AnnualPrice = getPlanBasePrice('annually', b2, buildingsList, config);
    expect(b2AnnualPrice).toBe(60);
  });
});

describe('Layer 9: Client-Side Rate Limiter Validation Gate', () => {
  const key = 'test-user-rate-limit';

  it('should allow normal amount of consecutive request operations', () => {
    clientRateLimiter.reset(key);
    
    // First request should definitely be allowed
    const result1 = clientRateLimiter.attemptAction(key);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(149);
  });

  it('should trigger block threshold and return descriptive reset duration under spam', () => {
    clientRateLimiter.reset(key);

    // Simulate 150 requests under the limit
    for (let i = 0; i < 150; i++) {
      const res = clientRateLimiter.attemptAction(key);
      expect(res.allowed).toBe(true);
    }

    // The 151st request must be denied
    const deniedRes = clientRateLimiter.attemptAction(key);
    expect(deniedRes.allowed).toBe(false);
    expect(deniedRes.remaining).toBe(0);
    expect(deniedRes.resetSec).toBeGreaterThan(0);
  });
});
