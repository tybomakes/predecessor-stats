import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Simple password configuration 
const ACCESS_PASSWORD = 'BLG'; 

interface AuthState {
	isAuthenticated: boolean;
	attemptCount: number;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		isAuthenticated: false,
		attemptCount: 0
	});

	// Check if already authenticated from localStorage
	if (browser) {
		const stored = localStorage.getItem('predecessor_auth');
		if (stored === 'authenticated') {
			set({ isAuthenticated: true, attemptCount: 0 });
		}
	}

	return {
		subscribe,
		login: (password: string): boolean => {
			if (password === ACCESS_PASSWORD) {
				update(state => ({ ...state, isAuthenticated: true }));
				if (browser) {
					localStorage.setItem('predecessor_auth', 'authenticated');
				}
				return true;
			} else {
				update(state => ({ ...state, attemptCount: state.attemptCount + 1 }));
				return false;
			}
		},
		logout: () => {
			set({ isAuthenticated: false, attemptCount: 0 });
			if (browser) {
				localStorage.removeItem('predecessor_auth');
			}
		},
		checkAuth: (): boolean => {
			if (!browser) return false;
			return localStorage.getItem('predecessor_auth') === 'authenticated';
		}
	};
}

export const auth = createAuthStore();
export const isAuthenticated = derived(auth, $auth => $auth.isAuthenticated);