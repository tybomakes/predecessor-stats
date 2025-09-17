<script lang="ts">
	import type { Match, Hero, Item } from '$lib/api/omeda';
	import { getImageUrl } from '$lib/config/api';
	import { gameData } from '$lib/api/gameData';
	import { onMount } from 'svelte';

	interface Props {
		match: Match;
		playerId: string;
		onClose: () => void;
	}

	let { match, playerId, onClose }: Props = $props();
	let heroes = $state<Hero[]>([]);
	let items = $state<Item[]>([]);
	let loading = $state(true);

	// Helper functions
	function getPlayerId(player: any): string {
		return player.id || player.player_id || '';
	}

	function getPlayerName(player: any): string {
		return player.display_name || player.player_name || 'Unknown';
	}

	function formatDuration(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes}m ${secs}s`;
	}

	onMount(async () => {
		try {
			// Load hero and item data
			[heroes, items] = await Promise.all([
				gameData.getHeroes(),
				gameData.getItems()
			]);
		} catch (error) {
			console.error('Failed to load game data:', error);
		} finally {
			loading = false;
		}
	});

	let dawnTeam = $derived(match.players?.filter(p => p.team === 'dawn' || p.team === 'Dawn') || []);
	let duskTeam = $derived(match.players?.filter(p => p.team === 'dusk' || p.team === 'Dusk') || []);
	let winningTeam = $derived(match.winning_team?.toLowerCase());
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div class="bg-predecessor-darker rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
		<!-- Header -->
		<div class="sticky top-0 bg-predecessor-darker border-b border-predecessor-border p-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-bold">Match Details</h2>
					<div class="flex items-center gap-4 text-sm text-gray-400 mt-1">
						<span>{match.game_mode}</span>
						<span>•</span>
						<span>{formatDuration(match.game_duration)}</span>
						<span>•</span>
						<span>{new Date(match.end_time || match.ended_at || '').toLocaleString()}</span>
					</div>
				</div>
				<button
					onclick={onClose}
					class="p-2 hover:bg-predecessor-card rounded-lg transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
		</div>

		<!-- Teams -->
		<div class="p-4 space-y-6">
			<!-- Dawn Team -->
			<div class="space-y-2">
				<h3 class="font-bold text-lg flex items-center gap-2">
					Dawn Team
					{#if winningTeam === 'dawn'}
						<span class="text-sm px-2 py-1 bg-green-500/20 text-green-400 rounded">VICTORY</span>
					{:else}
						<span class="text-sm px-2 py-1 bg-red-500/20 text-red-400 rounded">DEFEAT</span>
					{/if}
				</h3>
				<div class="space-y-2">
					{#each dawnTeam as player}
						{@const isOurPlayer = getPlayerId(player) === playerId}
						{@const hero = heroes.find(h => h.id === player.hero_id)}
						<div class="bg-predecessor-dark rounded-lg p-3 {isOurPlayer ? 'ring-2 ring-blue-500' : ''}">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<!-- Hero Image -->
									{#if hero}
										<img
											src={getImageUrl(hero.image || hero.image_url)}
											alt={hero.display_name}
											class="w-12 h-12 rounded object-cover"
										/>
									{:else}
										<div class="w-12 h-12 rounded bg-predecessor-border flex items-center justify-center">
											<span class="text-xs">?</span>
										</div>
									{/if}

									<!-- Player Info -->
									<div>
										<p class="font-semibold {isOurPlayer ? 'text-blue-400' : ''}">
											{getPlayerName(player)}
										</p>
										<p class="text-sm text-gray-400">
											{hero?.display_name || 'Unknown'} • {player.role}
										</p>
									</div>
								</div>

								<!-- Stats -->
								<div class="flex items-center gap-6 text-sm">
									<!-- KDA -->
									<div class="text-center">
										<p class="font-bold">
											{player.kills}/{player.deaths}/{player.assists}
										</p>
										<p class="text-xs text-gray-500">KDA</p>
									</div>

									<!-- Damage -->
									<div class="text-center">
										<p class="font-bold text-predecessor-orange">
											{((player.total_damage_dealt_to_heroes || player.damage_dealt_to_heroes || 0) / 1000).toFixed(1)}k
										</p>
										<p class="text-xs text-gray-500">Damage</p>
									</div>

									<!-- Gold -->
									<div class="text-center">
										<p class="font-bold text-yellow-500">
											{((player.gold_earned || 0) / 1000).toFixed(1)}k
										</p>
										<p class="text-xs text-gray-500">Gold</p>
									</div>

									<!-- CS -->
									<div class="text-center">
										<p class="font-bold">
											{player.minions_killed || 0}
										</p>
										<p class="text-xs text-gray-500">CS</p>
									</div>

									<!-- Wards -->
									{#if player.wards_placed !== undefined}
										<div class="text-center">
											<p class="font-bold">
												{player.wards_placed}
											</p>
											<p class="text-xs text-gray-500">Wards</p>
										</div>
									{/if}
								</div>
							</div>

							<!-- Additional Stats (expandable) -->
							{#if isOurPlayer}
								<div class="mt-3 pt-3 border-t border-predecessor-border grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
									{#if player.total_damage_dealt}
										<div>
											<span class="text-gray-500">Total Damage:</span>
											<span class="ml-1">{(player.total_damage_dealt / 1000).toFixed(1)}k</span>
										</div>
									{/if}
									{#if player.damage_taken}
										<div>
											<span class="text-gray-500">Damage Taken:</span>
											<span class="ml-1">{(player.damage_taken / 1000).toFixed(1)}k</span>
										</div>
									{/if}
									{#if player.total_healing_done}
										<div>
											<span class="text-gray-500">Healing Done:</span>
											<span class="ml-1">{(player.total_healing_done / 1000).toFixed(1)}k</span>
										</div>
									{/if}
									{#if player.largest_killing_spree}
										<div>
											<span class="text-gray-500">Largest Spree:</span>
											<span class="ml-1">{player.largest_killing_spree}</span>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Dusk Team -->
			<div class="space-y-2">
				<h3 class="font-bold text-lg flex items-center gap-2">
					Dusk Team
					{#if winningTeam === 'dusk'}
						<span class="text-sm px-2 py-1 bg-green-500/20 text-green-400 rounded">VICTORY</span>
					{:else}
						<span class="text-sm px-2 py-1 bg-red-500/20 text-red-400 rounded">DEFEAT</span>
					{/if}
				</h3>
				<div class="space-y-2">
					{#each duskTeam as player}
						{@const isOurPlayer = getPlayerId(player) === playerId}
						{@const hero = heroes.find(h => h.id === player.hero_id)}
						<div class="bg-predecessor-dark rounded-lg p-3 {isOurPlayer ? 'ring-2 ring-purple-500' : ''}">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<!-- Hero Image -->
									{#if hero}
										<img
											src={getImageUrl(hero.image || hero.image_url)}
											alt={hero.display_name}
											class="w-12 h-12 rounded object-cover"
										/>
									{:else}
										<div class="w-12 h-12 rounded bg-predecessor-border flex items-center justify-center">
											<span class="text-xs">?</span>
										</div>
									{/if}

									<!-- Player Info -->
									<div>
										<p class="font-semibold {isOurPlayer ? 'text-purple-400' : ''}">
											{getPlayerName(player)}
										</p>
										<p class="text-sm text-gray-400">
											{hero?.display_name || 'Unknown'} • {player.role}
										</p>
									</div>
								</div>

								<!-- Stats -->
								<div class="flex items-center gap-6 text-sm">
									<!-- KDA -->
									<div class="text-center">
										<p class="font-bold">
											{player.kills}/{player.deaths}/{player.assists}
										</p>
										<p class="text-xs text-gray-500">KDA</p>
									</div>

									<!-- Damage -->
									<div class="text-center">
										<p class="font-bold text-predecessor-orange">
											{((player.total_damage_dealt_to_heroes || player.damage_dealt_to_heroes || 0) / 1000).toFixed(1)}k
										</p>
										<p class="text-xs text-gray-500">Damage</p>
									</div>

									<!-- Gold -->
									<div class="text-center">
										<p class="font-bold text-yellow-500">
											{((player.gold_earned || 0) / 1000).toFixed(1)}k
										</p>
										<p class="text-xs text-gray-500">Gold</p>
									</div>

									<!-- CS -->
									<div class="text-center">
										<p class="font-bold">
											{player.minions_killed || 0}
										</p>
										<p class="text-xs text-gray-500">CS</p>
									</div>

									<!-- Wards -->
									{#if player.wards_placed !== undefined}
										<div class="text-center">
											<p class="font-bold">
												{player.wards_placed}
											</p>
											<p class="text-xs text-gray-500">Wards</p>
										</div>
									{/if}
								</div>
							</div>

							<!-- Additional Stats (expandable) -->
							{#if isOurPlayer}
								<div class="mt-3 pt-3 border-t border-predecessor-border grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
									{#if player.total_damage_dealt}
										<div>
											<span class="text-gray-500">Total Damage:</span>
											<span class="ml-1">{(player.total_damage_dealt / 1000).toFixed(1)}k</span>
										</div>
									{/if}
									{#if player.damage_taken}
										<div>
											<span class="text-gray-500">Damage Taken:</span>
											<span class="ml-1">{(player.damage_taken / 1000).toFixed(1)}k</span>
										</div>
									{/if}
									{#if player.total_healing_done}
										<div>
											<span class="text-gray-500">Healing Done:</span>
											<span class="ml-1">{(player.total_healing_done / 1000).toFixed(1)}k</span>
										</div>
									{/if}
									{#if player.largest_killing_spree}
										<div>
											<span class="text-gray-500">Largest Spree:</span>
											<span class="ml-1">{player.largest_killing_spree}</span>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>