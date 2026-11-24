export const BASE_SESSION_POINTS = 20;
export const MAX_BOUNTY_POINTS = 100;
export const SESSION_DURATION_MINUTES = 15;

export function calculateSessionReward(bountyPoints = 0) {
  const safeBounty = Math.max(0, Math.min(MAX_BOUNTY_POINTS, Number(bountyPoints) || 0));
  return BASE_SESSION_POINTS + safeBounty;
}
