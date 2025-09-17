import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { db, type TrackedPlayer } from '$lib/supabase';
import { TRACKED_USERS } from '$lib/config/users';

// Create a store for tracked users with Supabase persistence
function createSupabaseTrackedUsersStore() {
	const { subscribe, set, update } = writable<TrackedPlayer[]>([]);
	let initialized = false;

	return {
		subscribe,

		async init() {
			if (initialized) return;
			initialized = true;

			// If Supabase is configured, load from database
			if (db.isConfigured()) {
				try {
					const players = await db.getTrackedPlayers();

					// If no players in database, seed with default users
					if (players.length === 0 && TRACKED_USERS.length > 0) {
						console.log('Seeding database with default tracked users...');
						for (const user of TRACKED_USERS) {
							await db.addTrackedPlayer({
								player_id: user.id,
								display_name: user.displayName,
								region: user.region || 'na',
								is_active: true
							});
						}
						// Reload from database
						const seededPlayers = await db.getTrackedPlayers();
						set(seededPlayers);
					} else {
						set(players);
					}
				} catch (error) {
					console.error('Error loading tracked players from Supabase:', error);
					// Fall back to localStorage
					this.loadFromLocalStorage();
				}
			} else {
				// Fall back to localStorage if Supabase is not configured
				this.loadFromLocalStorage();
			}
		},

		loadFromLocalStorage() {
			if (!browser) return;

			const stored = localStorage.getItem('trackedUsers');
			if (stored) {
				try {
					const users = JSON.parse(stored);
					// Convert to TrackedPlayer format
					const players: TrackedPlayer[] = users.map((u: any) => ({
						id: crypto.randomUUID(),
						player_id: u.id,
						display_name: u.displayName || u.name,
						region: u.region || 'na',
						added_at: new Date().toISOString(),
						is_active: true
					}));
					set(players);
				} catch (e) {
					console.error('Failed to parse stored users:', e);
					this.reset();
				}
			} else {
				// Use default users
				const players: TrackedPlayer[] = TRACKED_USERS.map(u => ({
					id: crypto.randomUUID(),
					player_id: u.id,
					display_name: u.displayName,
					region: u.region || 'na',
					added_at: new Date().toISOString(),
					is_active: true
				}));
				set(players);
			}
		},

		async addUser(displayName: string, playerId: string, region = 'na') {
			if (db.isConfigured()) {
				const player = await db.addTrackedPlayer({
					player_id: playerId,
					display_name: displayName,
					region,
					is_active: true
				});

				if (player) {
					update(users => [...users, player]);
				}
			} else {
				// Fall back to localStorage
				const newPlayer: TrackedPlayer = {
					id: crypto.randomUUID(),
					player_id: playerId,
					display_name: displayName,
					region,
					added_at: new Date().toISOString(),
					is_active: true
				};

				update(users => {
					const newUsers = [...users, newPlayer];
					if (browser) {
						localStorage.setItem('trackedUsers', JSON.stringify(
							newUsers.map(p => ({
								id: p.player_id,
								displayName: p.display_name,
								region: p.region
							}))
						));
					}
					return newUsers;
				});
			}
		},

		async removeUser(playerId: string) {
			if (db.isConfigured()) {
				const success = await db.removeTrackedPlayer(playerId);
				if (success) {
					update(users => users.filter(u => u.player_id !== playerId));
				}
			} else {
				// Fall back to localStorage
				update(users => {
					const newUsers = users.filter(u => u.player_id !== playerId);
					if (browser) {
						localStorage.setItem('trackedUsers', JSON.stringify(
							newUsers.map(p => ({
								id: p.player_id,
								displayName: p.display_name,
								region: p.region
							}))
						));
					}
					return newUsers;
				});
			}
		},

		async updateUser(playerId: string, updates: Partial<TrackedPlayer>) {
			if (db.isConfigured()) {
				const success = await db.updateTrackedPlayer(playerId, updates);
				if (success) {
					update(users => users.map(u =>
						u.player_id === playerId ? { ...u, ...updates } : u
					));
				}
			} else {
				// Fall back to localStorage
				update(users => {
					const newUsers = users.map(u =>
						u.player_id === playerId ? { ...u, ...updates } : u
					);
					if (browser) {
						localStorage.setItem('trackedUsers', JSON.stringify(
							newUsers.map(p => ({
								id: p.player_id,
								displayName: p.display_name,
								region: p.region
							}))
						));
					}
					return newUsers;
				});
			}
		},

		reset() {
			const defaultPlayers: TrackedPlayer[] = TRACKED_USERS.map(u => ({
				id: crypto.randomUUID(),
				player_id: u.id,
				display_name: u.displayName,
				region: u.region || 'na',
				added_at: new Date().toISOString(),
				is_active: true
			}));

			set(defaultPlayers);

			if (browser) {
				localStorage.setItem('trackedUsers', JSON.stringify(TRACKED_USERS));
			}
		},

		// Subscribe to real-time changes if Supabase is configured
		subscribeToChanges() {
			if (!db.isConfigured()) return null;

			// Import supabase client directly
			import('$lib/supabase').then(({ supabase }) => {
				if (!supabase) return;

				const subscription = supabase
					.channel('tracked_players_changes')
					.on('postgres_changes', {
						event: '*',
						schema: 'public',
						table: 'tracked_players'
					}, async () => {
						// Reload data when changes occur
						const players = await db.getTrackedPlayers();
						set(players);
					})
					.subscribe();

				return () => {
					subscription.unsubscribe();
				};
			});

			return null;
		}
	};
}

export const supabaseTrackedUsers = createSupabaseTrackedUsersStore();

// Derived store for easy access to player IDs
export const trackedPlayerIds = derived(
	supabaseTrackedUsers,
	$users => $users.map(u => u.player_id)
);