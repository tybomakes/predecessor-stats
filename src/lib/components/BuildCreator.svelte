<script lang="ts">
	import type { Hero, Item } from '$lib/api/omeda';
	import { getImageUrl } from '$lib/config/api';
	import { gameData } from '$lib/api/gameData';
	import { onMount } from 'svelte';

	interface Props {
		heroes: Hero[];
		items: Item[];
		existingBuild?: any;
		onSave: (build: any) => void;
		onClose: () => void;
	}

	let { heroes, items, existingBuild, onSave, onClose }: Props = $props();

	// Build state
	let title = $state(existingBuild?.title || '');
	let selectedHeroId = $state<number>(existingBuild?.hero_id || 0);
	let selectedRole = $state(existingBuild?.role || 'carry');
	let selectedItems = $state<number[]>(existingBuild?.items || []);
	let skillOrder = $state<number[]>(existingBuild?.skill_order || Array(18).fill(0));
	let description = $state(existingBuild?.description || '');

	// UI state
	let currentTab = $state<'hero' | 'items' | 'abilities'>('hero');
	let searchQuery = $state('');
	let selectedCategory = $state('all');

	// Hero abilities (will be populated when hero is selected)
	let heroAbilities = $state<any[]>([]);

	const roles = ['carry', 'support', 'mid', 'jungle', 'solo'];

	// Item categories
	const itemCategories = [
		{ value: 'all', label: 'All Items' },
		{ value: 'physical', label: 'Physical' },
		{ value: 'magical', label: 'Magical' },
		{ value: 'vitality', label: 'Vitality' },
		{ value: 'utility', label: 'Utility' }
	];

	// Ability slots
	const abilitySlots = ['Q', 'RMB', 'E', 'R'];
	const abilityColors = ['#9333ea', '#3b82f6', '#10b981', '#f59e0b'];

	// Filter items based on search and category
	let filteredItems = $derived(() => {
		let filtered = items;

		if (searchQuery) {
			filtered = filtered.filter(item =>
				item.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.name?.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		if (selectedCategory !== 'all') {
			filtered = filtered.filter(item =>
				item.slot_type === selectedCategory ||
				item.rarity === selectedCategory
			);
		}

		return filtered;
	});

	// Get selected hero
	let selectedHero = $derived(heroes.find(h => h.id === selectedHeroId));

	async function loadHeroAbilities() {
		if (!selectedHeroId) return;

		try {
			// Fetch hero details to get abilities
			const heroData = await gameData.getHeroById(selectedHeroId);
			if (heroData?.abilities) {
				heroAbilities = heroData.abilities;
			}
		} catch (error) {
			console.error('Failed to load hero abilities:', error);
		}
	}

	function selectHero(heroId: number) {
		selectedHeroId = heroId;
		loadHeroAbilities();
	}

	function toggleItem(itemId: number) {
		if (selectedItems.includes(itemId)) {
			selectedItems = selectedItems.filter(id => id !== itemId);
		} else if (selectedItems.length < 6) {
			selectedItems = [...selectedItems, itemId];
		}
	}

	function removeItem(index: number) {
		selectedItems = selectedItems.filter((_, i) => i !== index);
	}

	function setSkillAtLevel(level: number, skill: number) {
		const newOrder = [...skillOrder];
		newOrder[level - 1] = skill;
		skillOrder = newOrder;
	}

	function validateBuild() {
		if (!title.trim()) {
			alert('Please enter a build title');
			return false;
		}
		if (!selectedHeroId) {
			alert('Please select a hero');
			return false;
		}
		if (selectedItems.length === 0) {
			alert('Please select at least one item');
			return false;
		}
		return true;
	}

	function saveBuild() {
		if (!validateBuild()) return;

		const build = {
			id: existingBuild?.id,
			title: title.trim(),
			hero_id: selectedHeroId,
			role: selectedRole,
			items: selectedItems,
			skill_order: skillOrder,
			description: description.trim(),
			created_at: existingBuild?.created_at || new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		onSave(build);
	}

	onMount(() => {
		if (selectedHeroId) {
			loadHeroAbilities();
		}
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div class="bg-predecessor-darker rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
		<!-- Header -->
		<div class="bg-predecessor-dark border-b border-predecessor-border p-4">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold">{existingBuild ? 'Edit Build' : 'Create New Build'}</h2>
				<button
					onclick={onClose}
					class="p-2 hover:bg-predecessor-card rounded-lg transition-colors"
					aria-label="Close"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>

			<!-- Build Title -->
			<div class="mt-4">
				<input
					type="text"
					bind:value={title}
					placeholder="Enter build title..."
					class="w-full bg-predecessor-darker border border-predecessor-border rounded-lg px-4 py-2"
				/>
			</div>

			<!-- Tabs -->
			<div class="flex gap-2 mt-4">
				<button
					onclick={() => currentTab = 'hero'}
					class="px-4 py-2 rounded-lg transition-colors {currentTab === 'hero' ? 'bg-predecessor-orange text-black' : 'bg-predecessor-darker'}"
				>
					1. Select Hero
				</button>
				<button
					onclick={() => currentTab = 'items'}
					class="px-4 py-2 rounded-lg transition-colors {currentTab === 'items' ? 'bg-predecessor-orange text-black' : 'bg-predecessor-darker'}"
					disabled={!selectedHeroId}
				>
					2. Choose Items
				</button>
				<button
					onclick={() => currentTab = 'abilities'}
					class="px-4 py-2 rounded-lg transition-colors {currentTab === 'abilities' ? 'bg-predecessor-orange text-black' : 'bg-predecessor-darker'}"
					disabled={!selectedHeroId}
				>
					3. Skill Order
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if currentTab === 'hero'}
				<!-- Hero Selection -->
				<div class="space-y-4">
					<!-- Role Selection -->
					<div>
						<label class="block text-sm text-gray-400 mb-2">Role</label>
						<div class="flex gap-2">
							{#each roles as role}
								<button
									onclick={() => selectedRole = role}
									class="px-4 py-2 rounded-lg capitalize transition-colors {selectedRole === role ? 'bg-predecessor-orange text-black' : 'bg-predecessor-dark'}"
								>
									{role}
								</button>
							{/each}
						</div>
					</div>

					<!-- Hero Grid -->
					<div>
						<label class="block text-sm text-gray-400 mb-2">Select Hero</label>
						<div class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
							{#each heroes as hero}
								<button
									onclick={() => selectHero(hero.id)}
									class="relative group {selectedHeroId === hero.id ? 'ring-2 ring-predecessor-orange' : ''}"
								>
									{#if hero.image || hero.image_url}
										<img
											src={getImageUrl(hero.image || hero.image_url)}
											alt={hero.display_name}
											class="w-full aspect-square rounded object-cover"
										/>
									{:else}
										<div class="w-full aspect-square rounded bg-predecessor-border flex items-center justify-center">
											<span class="text-xs">{hero.display_name?.substring(0, 3)}</span>
										</div>
									{/if}
									<div class="absolute inset-x-0 bottom-0 bg-black/80 text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
										{hero.display_name}
									</div>
								</button>
							{/each}
						</div>
					</div>

					{#if selectedHero}
						<div class="bg-predecessor-dark rounded-lg p-4">
							<p class="text-sm text-gray-400">Selected:</p>
							<p class="text-lg font-semibold">{selectedHero.display_name}</p>
						</div>
					{/if}
				</div>

			{:else if currentTab === 'items'}
				<!-- Item Selection -->
				<div class="space-y-4">
					<!-- Selected Items -->
					<div>
						<label class="block text-sm text-gray-400 mb-2">Selected Items ({selectedItems.length}/6)</label>
						<div class="flex gap-2 p-4 bg-predecessor-dark rounded-lg min-h-[80px]">
							{#each Array(6) as _, index}
								{@const itemId = selectedItems[index]}
								{@const item = itemId ? items.find(i => i.id === itemId) : null}
								<div class="relative">
									{#if item}
										<img
											src={getImageUrl(item.image || item.image_url)}
											alt={item.display_name}
											class="w-16 h-16 rounded border-2 border-predecessor-border"
										/>
										<button
											onclick={() => removeItem(index)}
											class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-xs hover:bg-red-600"
										>
											×
										</button>
									{:else}
										<div class="w-16 h-16 rounded border-2 border-dashed border-predecessor-border bg-predecessor-darker flex items-center justify-center">
											<span class="text-xs text-gray-500">{index + 1}</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<!-- Filters -->
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search items..."
							class="flex-1 bg-predecessor-dark border border-predecessor-border rounded-lg px-4 py-2"
						/>
						<select
							bind:value={selectedCategory}
							class="bg-predecessor-dark border border-predecessor-border rounded-lg px-4 py-2"
						>
							{#each itemCategories as category}
								<option value={category.value}>{category.label}</option>
							{/each}
						</select>
					</div>

					<!-- Item Grid -->
					<div class="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
						{#each filteredItems() as item}
							<button
								onclick={() => toggleItem(item.id)}
								class="relative group {selectedItems.includes(item.id) ? 'ring-2 ring-predecessor-orange' : ''}"
								disabled={!selectedItems.includes(item.id) && selectedItems.length >= 6}
							>
								{#if item.image || item.image_url}
									<img
										src={getImageUrl(item.image || item.image_url)}
										alt={item.display_name}
										class="w-full aspect-square rounded object-cover {!selectedItems.includes(item.id) && selectedItems.length >= 6 ? 'opacity-50' : ''}"
									/>
								{:else}
									<div class="w-full aspect-square rounded bg-predecessor-border flex items-center justify-center">
										<span class="text-xs">?</span>
									</div>
								{/if}
								<div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
									<span class="text-xs text-center">{item.display_name}</span>
									{#if item.price}
										<span class="text-xs text-predecessor-orange">{item.price}g</span>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>

			{:else if currentTab === 'abilities'}
				<!-- Skill Order -->
				<div class="space-y-4">
					<label class="block text-sm text-gray-400">Skill Order (Click to set priority at each level)</label>

					<div class="bg-predecessor-dark rounded-lg p-4">
						<div class="grid grid-cols-[auto_repeat(18,_1fr)] gap-1">
							<!-- Ability labels -->
							<div></div>
							{#each Array(18) as _, level}
								<div class="text-center text-xs text-gray-400">{level + 1}</div>
							{/each}

							<!-- Ability rows -->
							{#each abilitySlots as slot, abilityIndex}
								<div
									class="flex items-center justify-center w-8 h-8 rounded font-bold text-sm"
									style="background-color: {abilityColors[abilityIndex]}"
								>
									{slot}
								</div>
								{#each Array(18) as _, level}
									{@const isUltimate = abilityIndex === 3}
									{@const isDisabled = isUltimate ? (level + 1) < 6 : false}
									<button
										onclick={() => setSkillAtLevel(level + 1, abilityIndex + 1)}
										class="w-8 h-8 rounded border {skillOrder[level] === abilityIndex + 1 ? 'border-2' : 'border-predecessor-border'} {isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-predecessor-border/50'}"
										style="{skillOrder[level] === abilityIndex + 1 ? `background-color: ${abilityColors[abilityIndex]}` : ''}"
										disabled={isDisabled}
									>
										{skillOrder[level] === abilityIndex + 1 ? level + 1 : ''}
									</button>
								{/each}
							{/each}
						</div>

						<button
							onclick={() => skillOrder = Array(18).fill(0)}
							class="mt-4 text-sm text-gray-400 hover:text-white"
						>
							Clear All
						</button>
					</div>

					<!-- Build Description -->
					<div>
						<label class="block text-sm text-gray-400 mb-2">Build Notes (Optional)</label>
						<textarea
							bind:value={description}
							placeholder="Add notes about this build..."
							rows="4"
							class="w-full bg-predecessor-dark border border-predecessor-border rounded-lg px-4 py-2"
						></textarea>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="bg-predecessor-dark border-t border-predecessor-border p-4 flex justify-end gap-2">
			<button
				onclick={onClose}
				class="px-4 py-2 bg-predecessor-darker rounded-lg hover:bg-predecessor-border transition-colors"
			>
				Cancel
			</button>
			<button
				onclick={saveBuild}
				class="px-4 py-2 bg-predecessor-orange text-black font-semibold rounded-lg hover:bg-predecessor-orange/80 transition-colors"
			>
				{existingBuild ? 'Update Build' : 'Save Build'}
			</button>
		</div>
	</div>
</div>