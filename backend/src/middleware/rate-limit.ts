import rateLimit from "express-rate-limit";

// General rate limit for normal API requests.
// This helps prevent someone from repeatedly hitting the backend.
export const apiLimiter = rateLimit({
    // Each IP gets a fresh request allowance every 15 minutes.
    windowMs: 15 * 60 * 1000,

    // Maximum of 100 requests within the 15 minute window.
    limit: 150,

    // Sends the modern RateLimit headers back to the client.
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        error: "Too many requests. Please try again later."
    }
});

// Uploads have a much stricter limit because each PDF may trigger
export const uploadLimiter = rateLimit({
    // Upload limits are also measured across a 15 minute window.
    windowMs: 15 * 60 * 1000,

    // Document analysis is expensive, so it receives the smallest allowance.
    limit: 5,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        error: "Too many PDF uploads. Please try again later."
    }
});

export const exportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many export requests. Please try again later."
    }
});

// AI insight generation calls the model, so it gets its own strict allowance.
// Only POST (generation) uses this; reading a cached insight does not.
export const insightLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many AI insight requests. Please try again later."
    }
});

// Sign-in attempts (each one verifies a Google ID token).
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many sign-in attempts. Please try again later."
    }
});
