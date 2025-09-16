// Option 1: Deploy your own proxy with Vercel (see README_VERCEL_SETUP.md)
// export const API_BASE_URL = 'https://your-project.vercel.app/api/proxy?path=';

// Option 2: Direct API (won't work in browser due to CORS)
export const API_BASE_URL = 'https://omeda.city';

// Option 3: Use environment variable
// export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://omeda.city';

export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const LIVE_MATCH_POLL_INTERVAL = 30 * 1000; // 30 seconds
export const HERO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
export const ITEM_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours