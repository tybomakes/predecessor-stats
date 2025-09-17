import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Admin authentication state
function createAdminStore() {
	const { subscribe, set, update } = writable({
		isAuthenticated: false,
		sessionExpiry: null as number | null
	});

	return {
		subscribe,

		login(password: string): boolean {
			// Get the admin password from environment or use a default
			// In production, this should be set via environment variable
			const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

			if (password === adminPassword) {
				const expiry = Date.now() + (2 * 60 * 60 * 1000); // 2 hour session

				set({
					isAuthenticated: true,
					sessionExpiry: expiry
				});

				// Store in sessionStorage for persistence during session
				if (browser) {
					sessionStorage.setItem('adminAuth', JSON.stringify({
						isAuthenticated: true,
						sessionExpiry: expiry
					}));
				}

				return true;
			}

			return false;
		},

		logout() {
			set({
				isAuthenticated: false,
				sessionExpiry: null
			});

			if (browser) {
				sessionStorage.removeItem('adminAuth');
			}
		},

		checkAuth() {
			if (!browser) return;

			const stored = sessionStorage.getItem('adminAuth');
			if (stored) {
				const auth = JSON.parse(stored);

				// Check if session is still valid
				if (auth.sessionExpiry && auth.sessionExpiry > Date.now()) {
					set(auth);
				} else {
					this.logout();
				}
			}
		}
	};
}

export const adminStore = createAdminStore();