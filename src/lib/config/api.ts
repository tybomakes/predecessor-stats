// Vercel Proxy Configuration
// Set VITE_VERCEL_PROXY_URL in your .env file to your Vercel deployment URL
// Example: VITE_VERCEL_PROXY_URL=https://your-project.vercel.app

// Use Vercel proxy if available, otherwise fallback to direct API (won't work in browser)
export const VERCEL_PROXY_URL = import.meta.env.VITE_VERCEL_PROXY_URL || 'https://predecessor-stats.vercel.app';
export const API_BASE_URL = 'https://omeda.city';

// Helper to determine if we should use the proxy
export const USE_PROXY = true; // Always use proxy in production

export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const LIVE_MATCH_POLL_INTERVAL = 30 * 1000; // 30 seconds
export const HERO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
export const ITEM_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper to get full image URL
export const getImageUrl = (path: string | null | undefined): string => {
	if (!path) return '';
	if (path.startsWith('http')) return path;
	return `${API_BASE_URL}${path}`;
};