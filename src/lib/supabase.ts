import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Database types
export interface TrackedPlayer {
	id: string;
	player_id: string;
	display_name: string;
	region: string;
	added_at: string;
	added_by?: string;
	is_active: boolean;
}

export interface Build {
	id: string;
	player_id: string;
	name: string;
	hero_id: number;
	role: string;
	items: number[];
	skill_order: string[];
	description?: string;
	notes?: string;
	is_public: boolean;
	created_at: string;
	updated_at: string;
	created_by?: string;
}

// Initialize Supabase client
const supabaseUrl = PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Initializing Supabase with URL:', supabaseUrl);
console.log('Anon key present:', !!supabaseAnonKey);
console.log('Anon key length:', supabaseAnonKey?.length || 0);
console.log('URL valid:', supabaseUrl?.startsWith('https://'));

if (!supabaseUrl || !supabaseAnonKey) {
	console.warn('Supabase credentials not configured. Database features will be disabled.');
	console.warn('URL:', supabaseUrl || 'MISSING');
	console.warn('Key present:', !!supabaseAnonKey);
	console.warn('Key length:', supabaseAnonKey?.length || 0);
}

export const supabase = supabaseUrl && supabaseAnonKey
	? createClient(supabaseUrl, supabaseAnonKey)
	: null;

console.log('Supabase client initialized:', !!supabase);

// Add a test function to verify Supabase connection
export async function testSupabaseConnection() {
	if (!supabase) {
		console.error('Supabase client not initialized');
		return false;
	}

	try {
		const { data, error } = await supabase
			.from('tracked_players')
			.select('count')
			.limit(1);

		if (error) {
			console.error('Supabase connection test failed:', error);
			return false;
		}

		console.log('Supabase connection successful');
		return true;
	} catch (err) {
		console.error('Supabase connection test error:', err);
		return false;
	}
}

// Helper functions for database operations
export const db = {
	// Tracked Players
	async getTrackedPlayers(): Promise<TrackedPlayer[]> {
		if (!supabase) return [];

		const { data, error } = await supabase
			.from('tracked_players')
			.select('*')
			.eq('is_active', true)
			.order('added_at', { ascending: false });

		if (error) {
			console.error('Error fetching tracked players:', error);
			return [];
		}

		return data || [];
	},

	async addTrackedPlayer(player: Omit<TrackedPlayer, 'id' | 'added_at'>): Promise<TrackedPlayer | null> {
		if (!supabase) return null;

		const { data, error } = await supabase
			.from('tracked_players')
			.insert([player])
			.select()
			.single();

		if (error) {
			console.error('Error adding tracked player:', error);
			return null;
		}

		return data;
	},

	async updateTrackedPlayer(playerId: string, updates: Partial<TrackedPlayer>): Promise<boolean> {
		if (!supabase) return false;

		const { error } = await supabase
			.from('tracked_players')
			.update(updates)
			.eq('player_id', playerId);

		if (error) {
			console.error('Error updating tracked player:', error);
			return false;
		}

		return true;
	},

	async removeTrackedPlayer(playerId: string): Promise<boolean> {
		if (!supabase) return false;

		// Soft delete by setting is_active to false
		const { error } = await supabase
			.from('tracked_players')
			.update({ is_active: false })
			.eq('player_id', playerId);

		if (error) {
			console.error('Error removing tracked player:', error);
			return false;
		}

		return true;
	},

	// Builds
	async getBuilds(playerId?: string): Promise<Build[]> {
		if (!supabase) return [];

		let query = supabase.from('builds').select('*');

		if (playerId) {
			query = query.eq('player_id', playerId);
		}

		const { data, error } = await query.order('updated_at', { ascending: false });

		if (error) {
			console.error('Error fetching builds:', error);
			return [];
		}

		return data || [];
	},

	async getBuildsByHero(heroId: number, playerId?: string): Promise<Build[]> {
		if (!supabase) return [];

		let query = supabase
			.from('builds')
			.select('*')
			.eq('hero_id', heroId);

		if (playerId) {
			query = query.eq('player_id', playerId);
		}

		const { data, error } = await query.order('updated_at', { ascending: false });

		if (error) {
			console.error('Error fetching builds by hero:', error);
			return [];
		}

		return data || [];
	},

	async createBuild(build: Omit<Build, 'id' | 'created_at' | 'updated_at'>): Promise<Build | null> {
		if (!supabase) {
			console.error('Supabase client not initialized');
			return null;
		}

		console.log('Attempting to create build with data:', build);

		const { data, error } = await supabase
			.from('builds')
			.insert([build])
			.select()
			.single();

		if (error) {
			console.error('Error creating build:', error);
			console.error('Error details:', error.message, error.details, error.hint);
			return null;
		}

		console.log('Build created successfully:', data);
		return data;
	},

	async updateBuild(buildId: string, updates: Partial<Build>): Promise<boolean> {
		if (!supabase) return false;

		const { error } = await supabase
			.from('builds')
			.update(updates)
			.eq('id', buildId);

		if (error) {
			console.error('Error updating build:', error);
			return false;
		}

		return true;
	},

	async deleteBuild(buildId: string): Promise<boolean> {
		if (!supabase) return false;

		const { error } = await supabase
			.from('builds')
			.delete()
			.eq('id', buildId);

		if (error) {
			console.error('Error deleting build:', error);
			return false;
		}

		return true;
	},

	// Utility function to check if Supabase is configured
	isConfigured(): boolean {
		return supabase !== null;
	}
};