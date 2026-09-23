const buckets = new Map();

export function analysisRateLimit({ windowMs = 60_000, max = 8 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.startedAt >= windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return next();
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - bucket.startedAt)) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        success: false,
        message: `Too many design analyses. Please try again in about ${retryAfter} seconds.`
      });
    }

    next();
  };
}
