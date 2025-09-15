interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

class CacheManager {
	private prefix = 'predecessor_stats_';

	/**
	 * Get cached data if it exists and hasn't expired
	 */
	get<T>(key: string): T | null {
		try {
			const stored = localStorage.getItem(this.prefix + key);
			if (!stored) return null;

			const entry: CacheEntry<T> = JSON.parse(stored);
			const now = Date.now();

			// Check if cache has expired
			if (now - entry.timestamp > entry.ttl) {
				this.remove(key);
				return null;
			}

			return entry.data;
		} catch (error) {
			console.error('Cache read error:', error);
			return null;
		}
	}

	/**
	 * Store data in cache with TTL
	 */
	set<T>(key: string, data: T, ttl: number): void {
		try {
			const entry: CacheEntry<T> = {
				data,
				timestamp: Date.now(),
				ttl
			};

			localStorage.setItem(this.prefix + key, JSON.stringify(entry));
		} catch (error) {
			console.error('Cache write error:', error);
			// If localStorage is full, try to clear old entries
			if (error instanceof DOMException && error.code === 22) {
				this.clearExpired();
				// Try once more
				try {
					localStorage.setItem(this.prefix + key, JSON.stringify({ data, timestamp: Date.now(), ttl }));
				} catch {
					// If still failing, clear all cache
					this.clearAll();
				}
			}
		}
	}

	/**
	 * Remove specific cache entry
	 */
	remove(key: string): void {
		localStorage.removeItem(this.prefix + key);
	}

	/**
	 * Clear all expired cache entries
	 */
	clearExpired(): void {
		const now = Date.now();
		const keys = Object.keys(localStorage);

		keys.forEach(key => {
			if (key.startsWith(this.prefix)) {
				try {
					const stored = localStorage.getItem(key);
					if (stored) {
						const entry: CacheEntry<any> = JSON.parse(stored);
						if (now - entry.timestamp > entry.ttl) {
							localStorage.removeItem(key);
						}
					}
				} catch {
					// Remove corrupted entries
					localStorage.removeItem(key);
				}
			}
		});
	}

	/**
	 * Clear all cache entries
	 */
	clearAll(): void {
		const keys = Object.keys(localStorage);
		keys.forEach(key => {
			if (key.startsWith(this.prefix)) {
				localStorage.removeItem(key);
			}
		});
	}

	/**
	 * Get cache size in bytes
	 */
	getSize(): number {
		let size = 0;
		const keys = Object.keys(localStorage);

		keys.forEach(key => {
			if (key.startsWith(this.prefix)) {
				const item = localStorage.getItem(key);
				if (item) {
					size += item.length * 2; // UTF-16 uses 2 bytes per character
				}
			}
		});

		return size;
	}
}

// Export singleton instance
export const cache = new CacheManager();

// Cache key generators
export const cacheKeys = {
	player: (id: string) => `player_${id}`,
	playerMatches: (id: string, page?: number) => `player_matches_${id}_${page || 1}`,
	playerStats: (id: string, timeFrame?: string) => `player_stats_${id}_${timeFrame || 'all'}`,
	playerHeroStats: (id: string) => `player_hero_stats_${id}`,
	match: (id: string) => `match_${id}`,
	heroes: () => 'heroes',
	hero: (name: string) => `hero_${name}`,
	items: () => 'items',
	item: (name: string) => `item_${name}`,
	builds: (heroId?: number, role?: string) => `builds_${heroId || 'all'}_${role || 'all'}`
};