import { API_BASE_URL, VERCEL_PROXY_URL, USE_PROXY } from '$lib/config/api';
import { browser } from '$app/environment';

// Types
export interface Player {
	id: string;
	name?: string;
	display_name?: string;
	region?: string;
	rank?: number;
	rank_title?: string;
	rank_image?: string;
	mmr?: number;
	leaderboard_rank?: number;
	top_percentage?: number;
	vp_total?: number;
	vp_current?: number;
	games_played?: number;
	wins?: number;
	losses?: number;
	winrate?: number;
	is_active?: boolean;
	avatar_id?: number;
	last_match_ended_at?: string;
	flags?: any[];
}

export interface Match {
	id: string;
	game_mode: string;
	game_region: string;
	game_duration: number;
	winning_team: string;
	started_at: string;
	ended_at: string;
	players: MatchPlayer[];
}

export interface MatchPlayer {
	player_id: string;
	player_name: string;
	hero_id: number;
	hero_name: string;
	role: string;
	team: string;
	kills: number;
	deaths: number;
	assists: number;
	minions_killed: number;
	gold_earned: number;
	damage_dealt_to_heroes: number;
	damage_taken: number;
	wards_placed: number;
}

export interface Hero {
	id: number;
	name: string;
	display_name: string;
	image?: string;
	image_url?: string;
	abilities: any[];
	stats: any;
	classes?: string[];
	roles?: string[];
}

export interface Item {
	id: number;
	name: string;
	display_name: string;
	image?: string;
	image_url?: string;
	price?: number;
	total_price?: number;
	stats?: any;
	slot_type?: string;
	rarity?: string;
	effects?: any[];
}

// Fetch options builder
const buildFetchOptions = (params?: Record<string, any>): RequestInit => ({
	method: 'GET',
	headers: {
		'Accept': 'application/json',
	},
});

// Generic fetch wrapper with error handling
async function fetchAPI<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
	let finalUrl: string;

	// Use Vercel proxy if available and we're in the browser
	if (browser && USE_PROXY && VERCEL_PROXY_URL) {
		// Build the path with query parameters
		const pathUrl = new URL(`${API_BASE_URL}${endpoint}`);

		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					pathUrl.searchParams.append(key, String(value));
				}
			});
		}

		// Remove the base URL to get just the path
		const path = pathUrl.toString().replace(API_BASE_URL, '');

		// Use the Vercel proxy endpoint
		finalUrl = `${VERCEL_PROXY_URL}/api/proxy?path=${encodeURIComponent(path)}`;
	} else {
		// Direct API call (for server-side or when no proxy is configured)
		const url = new URL(`${API_BASE_URL}${endpoint}`);

		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					url.searchParams.append(key, String(value));
				}
			});
		}

		finalUrl = url.toString();
	}

	try {
		console.log(`Fetching from: ${finalUrl}`);
		const fetchOptions = buildFetchOptions();

		// Add timeout to prevent hanging requests
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

		const response = await fetch(finalUrl, {
			...fetchOptions,
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			console.error(`API Error Response:`, response.status, response.statusText);
			throw new Error(`API Error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		console.log(`Data received from ${endpoint}:`, data);
		return data;
	} catch (error) {
		console.error(`Failed to fetch ${endpoint}:`, error);
		console.error(`URL was: ${finalUrl}`);
		if (browser && !USE_PROXY) {
			throw new Error('CORS error: Please configure the Vercel proxy. See README for setup instructions.');
		}
		throw new Error('Unable to fetch data. Please try again later.');
	}
}

// API Methods
export const omedaAPI = {
	// Player endpoints
	async getPlayer(playerId: string): Promise<Player> {
		return fetchAPI<Player>(`/players/${playerId}.json`);
	},

	async getPlayerMatches(playerId: string, options?: {
		time_frame?: string;
		page?: number;
		per_page?: number;
		filter?: {
			hero_id?: number;
			role?: string;
			player_name?: string;
			game_mode?: string;
		};
	}): Promise<{ matches: Match[]; cursor?: string }> {
		const params: any = {};

		if (options?.time_frame) params.time_frame = options.time_frame;
		if (options?.page) params.page = options.page;
		if (options?.per_page) params.per_page = options.per_page;

		if (options?.filter) {
			Object.entries(options.filter).forEach(([key, value]) => {
				if (value) params[`filter[${key}]`] = value;
			});
		}

		return fetchAPI(`/players/${playerId}/matches.json`, params);
	},

	async getPlayerStatistics(playerId: string, timeFrame?: string): Promise<any> {
		const params = timeFrame ? { time_frame: timeFrame } : undefined;
		return fetchAPI(`/players/${playerId}/statistics.json`, params);
	},

	async getPlayerHeroStatistics(playerId: string, options?: {
		hero_ids?: number[];
		time_frame?: string;
		filter?: { role?: string };
	}): Promise<any> {
		const params: any = {};

		if (options?.hero_ids) params.hero_ids = options.hero_ids;
		if (options?.time_frame) params.time_frame = options.time_frame;
		if (options?.filter?.role) params['filter[role]'] = options.filter.role;

		return fetchAPI(`/players/${playerId}/hero_statistics.json`, params);
	},

	async getPlayerCommonTeammates(playerId: string, options?: {
		time_frame?: string;
		count?: number;
	}): Promise<any> {
		const params: any = {};

		if (options?.time_frame) params.time_frame = options.time_frame;
		if (options?.count) params.count = options.count;

		return fetchAPI(`/players/${playerId}/common_teammates.json`, params);
	},

	// Match endpoints
	async getMatch(matchId: string): Promise<Match> {
		return fetchAPI<Match>(`/matches/${matchId}.json`);
	},

	async getMatches(options?: {
		timestamp?: number;
		cursor?: string;
		per_page?: number;
	}): Promise<{ matches: Match[]; cursor?: string }> {
		return fetchAPI('/matches.json', options);
	},

	async getCurrentMatch(playerId: string): Promise<Match | null> {
		// Get the most recent matches to check if player is in game
		const recentMatches = await this.getPlayerMatches(playerId, { per_page: 1 });
		if (recentMatches.matches && recentMatches.matches.length > 0) {
			const lastMatch = recentMatches.matches[0];
			// Check if match ended recently (within last hour could mean still in progress)
			const matchEndTime = new Date(lastMatch.ended_at).getTime();
			const now = Date.now();
			const timeSinceEnd = now - matchEndTime;

			// If match ended less than 5 minutes ago, might still be in progress
			if (timeSinceEnd < 5 * 60 * 1000) {
				return lastMatch;
			}
		}
		return null;
	},

	// Hero endpoints
	async getHeroes(): Promise<Hero[]> {
		return fetchAPI<Hero[]>('/heroes.json');
	},

	async getHero(heroName: string): Promise<Hero> {
		return fetchAPI<Hero>(`/heroes/${heroName}.json`);
	},

	// Item endpoints
	async getItems(): Promise<Item[]> {
		return fetchAPI<Item[]>('/items.json');
	},

	async getItem(itemName: string): Promise<Item> {
		return fetchAPI<Item>(`/items/${itemName}.json`);
	},

	// Build endpoints
	async getBuilds(options?: {
		page?: number;
		filter?: {
			player_id?: string;
			hero_id?: number;
			role?: string;
			name?: string;
			skill_order?: any;
			current_version?: any;
			modules?: any;
			order?: 'latest' | 'trending' | 'popular';
		};
	}): Promise<any> {
		const params: any = {};

		if (options?.page) params.page = options.page;

		if (options?.filter) {
			Object.entries(options.filter).forEach(([key, value]) => {
				if (value !== undefined) params[`filter[${key}]`] = value;
			});
		}

		return fetchAPI('/builds.json', params);
	},

	async getBuild(buildId: string): Promise<any> {
		return fetchAPI(`/builds/${buildId}.json`);
	},

	// Leaderboard
	async getLeaderboard(options?: {
		page?: number;
		filter?: {
			name?: string;
			include_inactive?: 0 | 1;
			include_unranked?: 0 | 1;
		};
	}): Promise<{ players: Player[] }> {
		const params: any = {};

		if (options?.page) params.page = options.page;

		if (options?.filter) {
			if (options.filter.name) params['filter[name]'] = options.filter.name;
			if (options.filter.include_inactive !== undefined) {
				params['filter[include_inactive]'] = options.filter.include_inactive;
			}
			if (options.filter.include_unranked !== undefined) {
				params['filter[include_unranked]'] = options.filter.include_unranked;
			}
		}

		return fetchAPI('/players.json', params);
	}
};