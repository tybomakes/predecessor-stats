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
	let notes = $state(existingBuild?.notes || '');

	// Wizard state
	let currentStep = $state(1);
	const totalSteps = 5;

	// UI state for item selection
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
	const abilityIcons = ['🟪', '🔵', '🟢', '🟠'];
	const abilityColors = ['#9333ea', '#3b82f6', '#10b981', '#f59e0b'];

	// Get selected hero
	let selectedHero = $derived(heroes.find(h => h.id === selectedHeroId));

	// Filter items safely
	function getFilteredItems() {
		if (!items || items.length === 0) return [];

		let filtered = [...items];

		if (searchQuery && searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();
			filtered = filtered.filter(item =>
				item.display_name?.toLowerCase().includes(query) ||
				item.name?.toLowerCase().includes(query)
			);
		}

		if (selectedCategory !== 'all') {
			filtered = filtered.filter(item => {
				// Check various possible category fields
				return item.slot_type === selectedCategory ||
					item.rarity === selectedCategory ||
					item.category === selectedCategory ||
					item.type === selectedCategory;
			});
		}

		return filtered;
	}

	async function loadHeroAbilities() {
		if (!selectedHeroId) return;

		try {
			// In a real app, you'd fetch hero details to get abilities
			// For now, we'll use placeholder ability names
			heroAbilities = [
				{ name: 'Q Ability', slot: 'Q' },
				{ name: 'RMB Ability', slot: 'RMB' },
				{ name: 'E Ability', slot: 'E' },
				{ name: 'Ultimate', slot: 'R' }
			];
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

	function moveItem(fromIndex: number, toIndex: number) {
		if (toIndex < 0 || toIndex >= 6) return;

		const newItems = [...selectedItems];
		const item = newItems[fromIndex];

		// If target slot is empty
		if (toIndex >= newItems.length) {
			newItems.splice(fromIndex, 1);
			newItems[toIndex] = item;
		} else {
			// Swap items
			[newItems[fromIndex], newItems[toIndex]] = [newItems[toIndex], newItems[fromIndex]];
		}

		selectedItems = newItems;
	}

	function setSkillAtLevel(level: number, skill: number) {
		const newOrder = [...skillOrder];
		newOrder[level - 1] = skill;
		skillOrder = newOrder;
	}

	function canProceed() {
		switch (currentStep) {
			case 1: return title.trim() !== '';
			case 2: return selectedHeroId > 0;
			case 3: return selectedItems.length > 0;
			case 4: return true; // Skill order is optional
			case 5: return true; // Notes are optional
			default: return false;
		}
	}

	function nextStep() {
		if (canProceed() && currentStep < totalSteps) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function saveBuild() {
		if (!title.trim() || !selectedHeroId) {
			alert('Please complete required fields');
			return;
		}

		const build = {
			id: existingBuild?.id || Date.now().toString(),
			title: title.trim(),
			hero_id: selectedHeroId,
			role: selectedRole,
			items: selectedItems,
			skill_order: skillOrder,
			description: description.trim(),
			notes: notes.trim(),
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
	<div class="bg-predecessor-darker rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
		<!-- Header -->
		<div class="bg-predecessor-dark border-b border-predecessor-border p-4">
			<div class="flex items-center justify-between mb-4">
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

			<!-- Progress Steps -->
			<div class="flex items-center justify-between">
				{#each [1, 2, 3, 4, 5] as step}
					<div class="flex items-center">
						<button
							onclick={() => currentStep = step}
							disabled={step === 1 ? false : (step === 2 && !title.trim()) || (step === 3 && !selectedHeroId) || (step > 3 && !selectedHeroId)}
							class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors {currentStep === step ? 'bg-predecessor-orange text-black' : currentStep > step ? 'bg-predecessor-orange/50 text-black' : 'bg-predecessor-border text-gray-400'} {step <= currentStep ? 'cursor-pointer hover:bg-predecessor-orange/70' : 'cursor-not-allowed'}"
						>
							{step}
						</button>
						{#if step < 5}
							<div class="w-8 md:w-16 h-0.5 {currentStep > step ? 'bg-predecessor-orange' : 'bg-predecessor-border'}"></div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="text-sm text-gray-400 mt-2">
				Step {currentStep} of {totalSteps}:
				{currentStep === 1 && 'Build Title'}
				{currentStep === 2 && 'Select Hero & Role'}
				{currentStep === 3 && 'Choose Items'}
				{currentStep === 4 && 'Skill Order'}
				{currentStep === 5 && 'Notes & Review'}
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-6">
			{#if currentStep === 1}
				<!-- Step 1: Build Title -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold mb-4">Name Your Build</h3>
					<div>
						<label for="build-title" class="block text-sm text-gray-400 mb-2">Build Title *</label>
						<input
							id="build-title"
							type="text"
							bind:value={title}
							placeholder="e.g., High DPS Carry Build, Tank Support Build..."
							class="w-full bg-predecessor-dark border border-predecessor-border rounded-lg px-4 py-3 text-lg"
							maxlength="50"
						/>
						<p class="text-xs text-gray-500 mt-1">{title.length}/50 characters</p>
					</div>
					<div class="mt-6 p-4 bg-predecessor-dark rounded-lg">
						<p class="text-sm text-gray-400">💡 <strong>Tip:</strong> Choose a descriptive name that helps you remember this build's strategy</p>
					</div>
				</div>

			{:else if currentStep === 2}
				<!-- Step 2: Hero Selection -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold mb-4">Select Hero & Role</h3>

					<!-- Role Selection -->
					<div>
						<label class="block text-sm text-gray-400 mb-2">Role</label>
						<div class="flex flex-wrap gap-2">
							{#each roles as role}
								<button
									onclick={() => selectedRole = role}
									class="px-4 py-2 rounded-lg capitalize transition-colors {selectedRole === role ? 'bg-predecessor-orange text-black' : 'bg-predecessor-dark hover:bg-predecessor-border'}"
								>
									{role}
								</button>
							{/each}
						</div>
					</div>

					<!-- Selected Hero Display -->
					{#if selectedHero}
						<div class="bg-predecessor-dark rounded-lg p-4 flex items-center gap-4">
							{#if selectedHero.image || selectedHero.image_url}
								<img
									src={getImageUrl(selectedHero.image || selectedHero.image_url)}
									alt={selectedHero.display_name}
									class="w-20 h-20 rounded object-cover"
								/>
							{/if}
							<div>
								<p class="text-sm text-gray-400">Selected Hero:</p>
								<p class="text-xl font-semibold">{selectedHero.display_name}</p>
								<p class="text-sm text-predecessor-orange capitalize">{selectedRole}</p>
							</div>
						</div>
					{/if}

					<!-- Hero Grid -->
					<div>
						<label class="block text-sm text-gray-400 mb-2">Choose Your Hero *</label>
						<div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
							{#each heroes as hero}
								<button
									onclick={() => selectHero(hero.id)}
									class="relative group {selectedHeroId === hero.id ? 'ring-2 ring-predecessor-orange' : ''}"
								>
									{#if hero.image || hero.image_url}
										<img
											src={getImageUrl(hero.image || hero.image_url)}
											alt={hero.display_name}
											class="w-full aspect-square rounded object-cover hover:scale-110 transition-transform"
										/>
									{:else}
										<div class="w-full aspect-square rounded bg-predecessor-border flex items-center justify-center">
											<span class="text-xs">{hero.display_name?.substring(0, 3)}</span>
										</div>
									{/if}
									<div class="absolute inset-x-0 bottom-0 bg-black/90 text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
										{hero.display_name}
									</div>
								</button>
							{/each}
						</div>
					</div>
				</div>

			{:else if currentStep === 3}
				<!-- Step 3: Item Selection -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold mb-4">Choose Your Items</h3>

					<!-- Selected Items Display -->
					<div>
						<label class="block text-sm text-gray-400 mb-2">Build Order ({selectedItems.length}/6)</label>
						<div class="grid grid-cols-6 gap-2 p-4 bg-predecessor-dark rounded-lg">
							{#each Array(6) as _, index}
								{@const itemId = selectedItems[index]}
								{@const item = itemId ? items.find(i => i.id === itemId) : null}
								<div class="relative group">
									{#if item}
										<img
											src={getImageUrl(item.image || item.image_url)}
											alt={item.display_name}
											class="w-full aspect-square rounded border-2 border-predecessor-border"
										/>
										<button
											onclick={() => removeItem(index)}
											class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-xs hover:bg-red-600"
										>
											×
										</button>
										<div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
											<div class="text-center p-1">
												<p class="text-xs">{item.display_name}</p>
												{#if item.price}
													<p class="text-xs text-predecessor-orange">{item.price}g</p>
												{/if}
											</div>
										</div>
									{:else}
										<div class="w-full aspect-square rounded border-2 border-dashed border-predecessor-border bg-predecessor-darker flex flex-col items-center justify-center">
											<span class="text-2xl text-gray-600">{index + 1}</span>
											<span class="text-xs text-gray-500">Empty</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
						<p class="text-xs text-gray-500 mt-2">Click items below to add them to your build</p>
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
					<div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
						{#each getFilteredItems() as item}
							<button
								onclick={() => toggleItem(item.id)}
								class="relative group {selectedItems.includes(item.id) ? 'ring-2 ring-predecessor-orange' : ''}"
								disabled={!selectedItems.includes(item.id) && selectedItems.length >= 6}
							>
								{#if item.image || item.image_url}
									<img
										src={getImageUrl(item.image || item.image_url)}
										alt={item.display_name}
										class="w-full aspect-square rounded object-cover {!selectedItems.includes(item.id) && selectedItems.length >= 6 ? 'opacity-30' : ''} hover:scale-110 transition-transform"
									/>
								{:else}
									<div class="w-full aspect-square rounded bg-predecessor-border flex items-center justify-center">
										<span class="text-xs">?</span>
									</div>
								{/if}
								<div class="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 pointer-events-none">
									<span class="text-xs text-center">{item.display_name}</span>
									{#if item.price}
										<span class="text-xs text-predecessor-orange">{item.price}g</span>
									{/if}
								</div>
								{#if selectedItems.includes(item.id)}
									<div class="absolute top-0 right-0 w-5 h-5 bg-predecessor-orange rounded-full flex items-center justify-center text-black text-xs font-bold">
										{selectedItems.indexOf(item.id) + 1}
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>

			{:else if currentStep === 4}
				<!-- Step 4: Skill Order -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold mb-4">Set Your Skill Order (Optional)</h3>

					<div class="bg-predecessor-dark rounded-lg p-4">
						<p class="text-sm text-gray-400 mb-4">Click on the grid to set which ability to level at each level</p>

						<div class="overflow-x-auto">
							<div class="grid grid-cols-[auto_repeat(18,_minmax(32px,_1fr))] gap-1 min-w-[600px]">
								<!-- Level headers -->
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
											class="w-8 h-8 rounded border transition-all {skillOrder[level] === abilityIndex + 1 ? 'border-2' : 'border-predecessor-border'} {isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-predecessor-border/50'}"
											style="{skillOrder[level] === abilityIndex + 1 ? `background-color: ${abilityColors[abilityIndex]}` : ''}"
											disabled={isDisabled}
										>
											{#if skillOrder[level] === abilityIndex + 1}
												<span class="text-xs font-bold">{level + 1}</span>
											{/if}
										</button>
									{/each}
								{/each}
							</div>
						</div>

						<button
							onclick={() => skillOrder = Array(18).fill(0)}
							class="mt-4 text-sm text-gray-400 hover:text-white"
						>
							Clear All
						</button>
					</div>

					<div class="bg-predecessor-dark rounded-lg p-4">
						<p class="text-sm text-gray-400">💡 <strong>Tip:</strong> Ultimate (R) can only be leveled starting at level 6</p>
					</div>
				</div>

			{:else if currentStep === 5}
				<!-- Step 5: Notes & Review -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold mb-4">Add Notes & Review</h3>

					<!-- Build Summary -->
					<div class="bg-predecessor-dark rounded-lg p-4 space-y-3">
						<h4 class="font-semibold text-predecessor-orange">Build Summary</h4>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<p class="text-sm text-gray-400">Title:</p>
								<p class="font-semibold">{title || 'Not set'}</p>
							</div>
							<div>
								<p class="text-sm text-gray-400">Hero:</p>
								<p class="font-semibold">{selectedHero?.display_name || 'Not selected'}</p>
							</div>
							<div>
								<p class="text-sm text-gray-400">Role:</p>
								<p class="font-semibold capitalize">{selectedRole}</p>
							</div>
							<div>
								<p class="text-sm text-gray-400">Items:</p>
								<p class="font-semibold">{selectedItems.length} selected</p>
							</div>
						</div>

						<!-- Items Preview -->
						{#if selectedItems.length > 0}
							<div>
								<p class="text-sm text-gray-400 mb-2">Build Order:</p>
								<div class="flex gap-2">
									{#each selectedItems as itemId}
										{@const item = items.find(i => i.id === itemId)}
										{#if item}
											<img
												src={getImageUrl(item.image || item.image_url)}
												alt={item.display_name}
												class="w-10 h-10 rounded border border-predecessor-border"
												title={item.display_name}
											/>
										{/if}
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Description -->
					<div>
						<label for="build-desc" class="block text-sm text-gray-400 mb-2">Build Description (Optional)</label>
						<textarea
							id="build-desc"
							bind:value={description}
							placeholder="Describe your build strategy, when to use it, power spikes, etc..."
							rows="3"
							class="w-full bg-predecessor-dark border border-predecessor-border rounded-lg px-4 py-2"
						></textarea>
					</div>

					<!-- Notes -->
					<div>
						<label for="build-notes" class="block text-sm text-gray-400 mb-2">Additional Notes (Optional)</label>
						<textarea
							id="build-notes"
							bind:value={notes}
							placeholder="Any tips, combos, situational items, matchup notes..."
							rows="4"
							class="w-full bg-predecessor-dark border border-predecessor-border rounded-lg px-4 py-2"
						></textarea>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="bg-predecessor-dark border-t border-predecessor-border p-4 flex justify-between">
			<button
				onclick={prevStep}
				disabled={currentStep === 1}
				class="px-4 py-2 bg-predecessor-darker rounded-lg hover:bg-predecessor-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				← Previous
			</button>

			<div class="flex gap-2">
				<button
					onclick={onClose}
					class="px-4 py-2 bg-predecessor-darker rounded-lg hover:bg-predecessor-border transition-colors"
				>
					Cancel
				</button>

				{#if currentStep < totalSteps}
					<button
						onclick={nextStep}
						disabled={!canProceed()}
						class="px-4 py-2 bg-predecessor-orange text-black font-semibold rounded-lg hover:bg-predecessor-orange/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Next →
					</button>
				{:else}
					<button
						onclick={saveBuild}
						class="px-4 py-2 bg-predecessor-orange text-black font-semibold rounded-lg hover:bg-predecessor-orange/80 transition-colors"
					>
						{existingBuild ? 'Update Build' : 'Save Build'}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>