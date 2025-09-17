import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { TrackedUser } from '$lib/config/users';
import { TRACKED_USERS } from '$lib/config/users';

// Create a store for tracked users with localStorage persistence
function createTrackedUsersStore() {
	// Initialize with default users or from localStorage
	const storedUsers = browser ? localStorage.getItem('trackedUsers') : null;
	const initialUsers = storedUsers ? JSON.parse(storedUsers) : TRACKED_USERS;

	const { subscribe, set, update } = writable<TrackedUser[]>(initialUsers);

	return {
		subscribe,

		addUser(user: TrackedUser) {
			update(users => {
				// Check if user already exists
				if (users.find(u => u.id === user.id)) {
					console.warn('User already exists:', user.id);
					return users;
				}

				const newUsers = [...users, user];

				// Save to localStorage
				if (browser) {
					localStorage.setItem('trackedUsers', JSON.stringify(newUsers));
				}

				return newUsers;
			});
		},

		removeUser(userId: string) {
			update(users => {
				const newUsers = users.filter(u => u.id !== userId);

				// Save to localStorage
				if (browser) {
					localStorage.setItem('trackedUsers', JSON.stringify(newUsers));
				}

				return newUsers;
			});
		},

		updateUser(userId: string, updates: Partial<TrackedUser>) {
			update(users => {
				const newUsers = users.map(u =>
					u.id === userId ? { ...u, ...updates } : u
				);

				// Save to localStorage
				if (browser) {
					localStorage.setItem('trackedUsers', JSON.stringify(newUsers));
				}

				return newUsers;
			});
		},

		reset() {
			set(TRACKED_USERS);
			if (browser) {
				localStorage.setItem('trackedUsers', JSON.stringify(TRACKED_USERS));
			}
		},

		loadFromStorage() {
			if (!browser) return;

			const stored = localStorage.getItem('trackedUsers');
			if (stored) {
				try {
					const users = JSON.parse(stored);
					set(users);
				} catch (e) {
					console.error('Failed to parse stored users:', e);
					this.reset();
				}
			}
		}
	};
}

export const trackedUsersStore = createTrackedUsersStore();