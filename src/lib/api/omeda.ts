import { API_BASE_URL } from '$lib/config/api';
import { browser } from '$app/environment';

// CORS Proxy configuration - only use in browser
// Using corsproxy.org which is a free, open CORS proxy
const CORS_PROXY = 'https://corsproxy.org/?';

// Types
export interface Player {
	id: string;
	name: string;
	rank: number;
	rank_title: string;
	mmr: number;
	games_played: number;
	wins: number;
	losses: number;
	winrate: number;
	is_active: boolean;
	avatar_id: number;
	last_match_ended_at: string;
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
	image_url: string;
	abilities: any[];
	stats: any;
}

export interface Item {
	id: number;
	name: string;
	display_name: string;
	image_url: string;
	price: number;
	stats: any;
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
	const url = new URL(`${API_BASE_URL}${endpoint}`);

	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.append(key, String(value));
			}
		});
	}

	try {
		// Use CORS proxy when in browser environment
		// This is necessary because Omeda.city API doesn't allow browser CORS requests
		const finalUrl = browser
			? `${CORS_PROXY}${url.toString()}`
			: url.toString();

		const response = await fetch(finalUrl, buildFetchOptions());

		if (!response.ok) {
			throw new Error(`API Error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		// Some CORS proxies wrap the response, check if we need to unwrap
		if (data && typeof data === 'object' && 'contents' in data) {
			// If the proxy wraps the response, extract the actual data
			const contents = typeof data.contents === 'string'
				? JSON.parse(data.contents)
				: data.contents;
			return contents;
		}

		return data;
	} catch (error) {
		console.error(`Failed to fetch ${endpoint}:`, error);

		// Provide more helpful error messages
		if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
			throw new Error('Network error: Unable to reach the API. The CORS proxy may be down. Please try again later.');
		}

		throw error;
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