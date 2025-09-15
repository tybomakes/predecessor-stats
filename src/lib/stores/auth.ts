import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { hashPassword } from '$lib/utils/crypto';
import { AUTH_CONFIG, ENV_PASSWORD } from '$lib/config/auth.config';

// Use environment variable if available, otherwise use a default
// FOR SECURITY: Set VITE_ACCESS_PASSWORD in your .env.local file
const ACCESS_PASSWORD = ENV_PASSWORD || 'tacotaco';

interface AuthState {
	isAuthenticated: boolean;
	attemptCount: number;
	lockedUntil: number | null;
}

interface AuthSession {
	authenticated: boolean;
	timestamp: number;
}

function createAuthStore() {
	const initialState: AuthState = {
		isAuthenticated: false,
		attemptCount: 0,
		lockedUntil: null
	};

	const { subscribe, set, update } = writable<AuthState>(initialState);

	// Check if already authenticated from localStorage
	if (browser) {
		try {
			const stored = localStorage.getItem('predecessor_auth');
			if (stored) {
				const session: AuthSession = JSON.parse(stored);
				const now = Date.now();

				// Check if session is still valid
				if (session.authenticated &&
					(now - session.timestamp) < AUTH_CONFIG.sessionDuration) {
					set({
						isAuthenticated: true,
						attemptCount: 0,
						lockedUntil: null
					});
				} else {
					// Session expired
					localStorage.removeItem('predecessor_auth');
				}
			}
		} catch (e) {
			// Invalid session data
			localStorage.removeItem('predecessor_auth');
		}

		// Check lockout status
		const lockout = localStorage.getItem('predecessor_lockout');
		if (lockout) {
			const lockedUntil = parseInt(lockout);
			if (Date.now() < lockedUntil) {
				update(state => ({ ...state, lockedUntil }));
			} else {
				localStorage.removeItem('predecessor_lockout');
			}
		}
	}

	return {
		subscribe,
		login: async (password: string): Promise<boolean> => {
			const state = get({ subscribe });

			// Check if locked out
			if (state.lockedUntil && Date.now() < state.lockedUntil) {
				return false;
			}

			// Verify password
			const isValid = password === ACCESS_PASSWORD;

			if (isValid) {
				const session: AuthSession = {
					authenticated: true,
					timestamp: Date.now()
				};

				update(s => ({
					isAuthenticated: true,
					attemptCount: 0,
					lockedUntil: null
				}));

				if (browser) {
					localStorage.setItem('predecessor_auth', JSON.stringify(session));
					localStorage.removeItem('predecessor_lockout');
				}
				return true;
			} else {
				// Failed attempt
				update(s => {
					const newCount = s.attemptCount + 1;
					const locked = newCount >= AUTH_CONFIG.maxAttempts;
					const lockedUntil = locked ? Date.now() + AUTH_CONFIG.lockoutDuration : null;

					if (locked && browser) {
						localStorage.setItem('predecessor_lockout', lockedUntil.toString());
					}

					return {
						...s,
						attemptCount: newCount,
						lockedUntil
					};
				});
				return false;
			}
		},
		logout: () => {
			set(initialState);
			if (browser) {
				localStorage.removeItem('predecessor_auth');
				localStorage.removeItem('predecessor_lockout');
			}
		},
		checkAuth: (): boolean => {
			if (!browser) return false;
			try {
				const stored = localStorage.getItem('predecessor_auth');
				if (!stored) return false;

				const session: AuthSession = JSON.parse(stored);
				const now = Date.now();

				return session.authenticated &&
					(now - session.timestamp) < AUTH_CONFIG.sessionDuration;
			} catch {
				return false;
			}
		},
		isLocked: (): boolean => {
			const state = get({ subscribe });
			return !!(state.lockedUntil && Date.now() < state.lockedUntil);
		}
	};
}

export const auth = createAuthStore();
export const isAuthenticated = derived(auth, $auth => $auth.isAuthenticated);