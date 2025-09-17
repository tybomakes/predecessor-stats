<script lang="ts">
	import type { Hero, Item } from '$lib/api/omeda';
	import { getImageUrl } from '$lib/config/api';

	interface Props {
		build: any;
		hero: Hero | undefined;
		items: Item[];
		onClose: () => void;
	}

	let { build, hero, items, onClose }: Props = $props();

	function getItem(itemId: number) {
		return items.find(i => i.id === itemId);
	}
</script>

<div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
	<div class="bg-predecessor-darker rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
		<!-- Header -->
		<div class="bg-predecessor-dark border-b border-predecessor-border p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					{#if hero}
						<img
							src={getImageUrl(hero.image || hero.image_url)}
							alt={hero.display_name}
							class="w-16 h-16 rounded object-cover"
						/>
					{/if}
					<div>
						<h2 class="text-xl font-bold">{build.title || build.name}</h2>
						<p class="text-sm text-gray-400">
							{hero?.display_name || 'Unknown Hero'} • {build.role}
						</p>
					</div>
				</div>
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
		</div>

		<!-- Content -->
		<div class="p-6 space-y-6">
			<!-- Items -->
			<div>
				<h3 class="text-lg font-semibold mb-3">Build Order</h3>
				<div class="grid grid-cols-6 gap-3 bg-predecessor-dark rounded-lg p-4">
					{#each build.items as itemId, index}
						{@const item = getItem(itemId)}
						{#if item}
							<div class="relative group">
								<img
									src={getImageUrl(item.image || item.image_url)}
									alt={item.display_name}
									class="w-full aspect-square rounded border-2 border-predecessor-border group-hover:border-predecessor-orange transition-colors"
								/>
								<span class="absolute top-0 right-0 bg-black/70 text-xs px-1 rounded-bl">
									{index + 1}
								</span>
								<!-- Tooltip -->
								<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
									<div class="bg-black/95 rounded-lg p-2 whitespace-nowrap">
										<p class="text-sm font-semibold">{item.display_name}</p>
										<p class="text-xs text-predecessor-orange">{item.price}g</p>
									</div>
								</div>
							</div>
						{:else}
							<div class="w-full aspect-square rounded border-2 border-predecessor-border bg-predecessor-card"></div>
						{/if}
					{/each}
					{#each Array(6 - build.items.length) as _}
						<div class="w-full aspect-square rounded border-2 border-predecessor-border bg-predecessor-card"></div>
					{/each}
				</div>
			</div>

			<!-- Skill Order -->
			{#if build.skill_order && build.skill_order.length > 0}
				<div>
					<h3 class="text-lg font-semibold mb-3">Skill Order</h3>
					<div class="bg-predecessor-dark rounded-lg p-4 overflow-x-auto">
						<!-- Level headers -->
						<div class="flex gap-1 mb-2 min-w-fit">
							<div class="w-12 text-sm font-semibold text-gray-400">Level</div>
							{#each Array(18) as _, level}
								<div class="w-7 text-center text-sm text-gray-400">{level + 1}</div>
							{/each}
						</div>

						<!-- Skills rows -->
						{#each ['Q', 'E', 'RMB', 'R'] as skill, skillIndex}
							<div class="flex gap-1 mb-1 min-w-fit">
								<div class="w-12 text-sm font-semibold">{skill}</div>
								{#each Array(18) as _, level}
									{@const skillAtLevel = build.skill_order[level]}
									{@const isSelected = skillAtLevel === skill || skillAtLevel === String(skillIndex)}
									<div
										class="w-7 h-7 rounded flex items-center justify-center text-xs {isSelected ? 'bg-predecessor-orange text-black font-bold' : 'bg-predecessor-border/30'}"
									>
										{isSelected ? '●' : ''}
									</div>
								{/each}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Description -->
			{#if build.description}
				<div>
					<h3 class="text-lg font-semibold mb-3">Description</h3>
					<div class="bg-predecessor-dark rounded-lg p-4">
						<p class="text-gray-300 whitespace-pre-wrap">{build.description}</p>
					</div>
				</div>
			{/if}

			<!-- Notes -->
			{#if build.notes}
				<div>
					<h3 class="text-lg font-semibold mb-3">Notes</h3>
					<div class="bg-predecessor-dark rounded-lg p-4">
						<p class="text-gray-300 whitespace-pre-wrap">{build.notes}</p>
					</div>
				</div>
			{/if}

			<!-- Metadata -->
			<div class="text-sm text-gray-400">
				<p>Created: {new Date(build.created_at).toLocaleDateString()}</p>
				{#if build.updated_at !== build.created_at}
					<p>Updated: {new Date(build.updated_at).toLocaleDateString()}</p>
				{/if}
			</div>
		</div>
	</div>
</div>