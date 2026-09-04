export const STORAGE_TIERS = {
  free: { label: 'Free', bytes: 4 * 1024 * 1024 * 1024 },        // 4GB (supports up to 4GB long video upload capacity)
  creator: { label: 'Creator', bytes: 500 * 1024 * 1024 * 1024 },  // 500GB
  studio: { label: 'Studio', bytes: 2 * 1024 * 1024 * 1024 * 1024 }, // 2TB
  cinema: { label: 'Cinema', bytes: 5 * 1024 * 1024 * 1024 * 1024 }, // 5TB
} as const;

export type StorageTier = keyof typeof STORAGE_TIERS;

export function getStorageLimit(tier: StorageTier): number {
  return STORAGE_TIERS[tier].bytes;
}

export function formatStorage(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
  }
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function getStorageTierFromPlan(planId: string): StorageTier {
  // Map Paddle plan IDs to tiers. Adjust these to match your actual Paddle plan IDs.
  if (planId.includes('creator')) return 'creator';
  if (planId.includes('studio')) return 'studio';
  if (planId.includes('cinema')) return 'cinema';
  return 'free';
}
