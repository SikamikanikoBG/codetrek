// Minimal in-memory fixed-window rate limiter for the auth endpoints. No
// Redis/external store — this API runs as a single instance (see deploy/
// docker-compose.yml), so an in-process Map is the right amount of
// infrastructure for "stop brute-forcing a password," not a general-purpose
// distributed limiter.

interface Bucket {
  count: number;
  windowStart: number;
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return function isAllowed(key: string): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.windowStart >= windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (bucket.count >= maxRequests) return false;
    bucket.count += 1;
    return true;
  };
}
