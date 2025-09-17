import { omedaAPI, type Hero, type Item } from './omeda';
import { cache, cacheKeys } from './cache';
import { HERO_CACHE_DURATION, ITEM_CACHE_DURATION, getImageUrl } from '$lib/config/api';

// Cache keys for game data
const HEROES_CACHE_KEY = 'game:heroes';
const ITEMS_CACHE_KEY = 'game:items';

// Hero and Item data service
export const gameData = {
	heroes: null as Hero[] | null,
	items: null as Item[] | null,

	async getHeroes(): Promise<Hero[]> {
		// Check cache first
		const cached = cache.get<Hero[]>(HEROES_CACHE_KEY);
		if (cached) {
			this.heroes = cached;
			return cached;
		}

		// Fetch from API
		try {
			const heroes = await omedaAPI.getHeroes();
			// Add full image URLs
			const heroesWithImages = heroes.map(hero => ({
				...hero,
				image_url: getImageUrl(hero.image_url || hero.image)
			}));

			// Cache the data
			cache.set(HEROES_CACHE_KEY, heroesWithImages, HERO_CACHE_DURATION);
			this.heroes = heroesWithImages;
			return heroesWithImages;
		} catch (error) {
			console.error('Failed to fetch heroes:', error);
			throw error;
		}
	},

	async getItems(): Promise<Item[]> {
		// Check cache first
		const cached = cache.get<Item[]>(ITEMS_CACHE_KEY);
		if (cached) {
			this.items = cached;
			return cached;
		}

		// Fetch from API
		try {
			const items = await omedaAPI.getItems();
			// Add full image URLs
			const itemsWithImages = items.map(item => ({
				...item,
				image_url: getImageUrl(item.image_url || item.image)
			}));

			// Cache the data
			cache.set(ITEMS_CACHE_KEY, itemsWithImages, ITEM_CACHE_DURATION);
			this.items = itemsWithImages;
			return itemsWithImages;
		} catch (error) {
			console.error('Failed to fetch items:', error);
			throw error;
		}
	},

	getHeroById(id: number): Hero | undefined {
		if (!this.heroes) return undefined;
		return this.heroes.find(h => h.id === id);
	},

	getHeroByName(name: string): Hero | undefined {
		if (!this.heroes) return undefined;
		return this.heroes.find(h => h.name === name || h.display_name === name);
	},

	getItemById(id: number): Item | undefined {
		if (!this.items) return undefined;
		return this.items.find(i => i.id === id);
	},

	getItemByName(name: string): Item | undefined {
		if (!this.items) return undefined;
		return this.items.find(i => i.name === name || i.display_name === name);
	},

	// Preload all game data
	async preloadAll(): Promise<void> {
		await Promise.all([
			this.getHeroes(),
			this.getItems()
		]);
	}
};