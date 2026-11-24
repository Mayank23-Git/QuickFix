const buckets = new Map();

/**
 * Simple sliding-window rate limiter keyed by authenticated user ID (or IP).
 * Avoids external Redis dependency while protecting sensitive XP/badge/admin mutations.
 */
export function createRateLimiter({ windowMs = 60_000, maxRequests = 20, keyPrefix = 'global' } = {}) {
  return (req, res, next) => {
    const identity = req.user?._id ? `u:${req.user._id}` : `ip:${req.ip || 'unknown'}`;
    const bucketKey = `${keyPrefix}:${identity}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    let timestamps = buckets.get(bucketKey) || [];
    timestamps = timestamps.filter((t) => t > cutoff);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests in a short period. Please wait a moment and try again.',
      });
    }

    timestamps.push(now);
    buckets.set(bucketKey, timestamps);

    // Occasional cleanup to keep memory bounded
    if (buckets.size > 5000) {
      for (const [k, list] of buckets.entries()) {
        if (list.length === 0 || list[list.length - 1] <= cutoff) {
          buckets.delete(k);
        }
      }
    }

    return next();
  };
}
