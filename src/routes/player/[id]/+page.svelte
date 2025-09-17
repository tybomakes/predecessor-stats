<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { omedaAPI, type Player, type Match, type Hero } from '$lib/api/omeda';
	import { cache, cacheKeys } from '$lib/api/cache';
	import { CACHE_DURATION, getImageUrl } from '$lib/config/api';
	import { gameData } from '$lib/api/gameData';

	const playerId = $page.params.id;
	let player = $state<Player | null>(null);
	let matches = $state<Match[]>([]);
	let playerStats = $state<any>(null);
	let heroStats = $state<any[]>([]);
	let heroes = $state<Hero[]>([]);
	let commonTeammates = $state<any[]>([]);
	let currentMatch = $state<Match | null>(null);
	let opponentBuilds = $state<Map<string, any>>(new Map());
	let loading = $state(true);
	let error = $state('');
	let refreshing = $state(false);
	let activeTab = $state('current');
	let autoRefresh = $state(false);
	let refreshInterval: NodeJS.Timeout | null = null;

	async function loadPlayerData(useCache = true) {
		if (!playerId) {
			error = 'No player ID provided';
			loading = false;
			return;
		}

		try {
			loading = true;
			error = '';

			// Try cache first
			if (useCache) {
				const cachedPlayer = cache.get<Player>(cacheKeys.player(playerId));
				if (cachedPlayer) {
					player = cachedPlayer;
				}

				const cachedMatches = cache.get<{ matches: Match[] }>(cacheKeys.playerMatches(playerId));
				if (cachedMatches) {
					matches = cachedMatches.matches;
				}
			}

			// If no cache or force refresh, fetch from API
			if (!player || !useCache) {
				const [playerData, matchData, statsData, heroStatsData, teammatesData] = await Promise.all([
					omedaAPI.getPlayer(playerId),
					omedaAPI.getPlayerMatches(playerId, { per_page: 20 }),
					omedaAPI.getPlayerStatistics(playerId),
					omedaAPI.getPlayerHeroStatistics(playerId),
					omedaAPI.getPlayerCommonTeammates(playerId, { count: 20 })
				]);

				player = playerData;
				matches = matchData.matches || [];
				playerStats = statsData;
				heroStats = heroStatsData?.hero_statistics || [];
				commonTeammates = teammatesData?.teammates || [];

				// Cache the data
				cache.set(cacheKeys.player(playerId), playerData, CACHE_DURATION);
				cache.set(cacheKeys.playerMatches(playerId), matchData, CACHE_DURATION);
			}
		} catch (err) {
			error = 'Failed to load player data';
			console.error(err);
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	async function refreshData() {
		refreshing = true;
		await loadPlayerData(false);
		await checkCurrentMatch();
	}

	async function checkCurrentMatch() {
		try {
			// Get the player's most recent match
			const recentMatches = await omedaAPI.getPlayerMatches(playerId, { per_page: 1 });
			if (recentMatches.matches && recentMatches.matches.length > 0) {
				const match = recentMatches.matches[0];

				// Check if match is recent (within last hour)
				const matchEndTime = new Date(match.ended_at).getTime();
				const matchStartTime = new Date(match.started_at).getTime();
				const now = Date.now();

				// If match started recently and duration suggests it might be ongoing
				const expectedDuration = 30 * 60 * 1000; // 30 minutes average
				const matchAge = now - matchStartTime;

				if (matchAge < expectedDuration * 1.5) {
					currentMatch = match;
					await loadOpponentBuilds(match);
				} else {
					currentMatch = null;
				}
			}
		} catch (error) {
			console.error('Failed to check current match:', error);
		}
	}

	async function loadOpponentBuilds(match: Match) {
		if (!match.players) return;

		// Find which team our player is on
		const ourPlayer = match.players.find(p => p.player_id === playerId);
		if (!ourPlayer) return;

		const ourTeam = ourPlayer.team;
		const opponents = match.players.filter(p => p.team !== ourTeam);

		// Load build data for each opponent
		for (const opponent of opponents) {
			try {
				// Get the opponent's recent matches with the same hero
				const heroMatches = await omedaAPI.getPlayerMatches(opponent.player_id, {
					per_page: 5,
					filter: { hero_id: opponent.hero_id }
				});

				// Get builds for this hero
				const builds = await omedaAPI.getBuilds({
					filter: {
						player_id: opponent.player_id,
						hero_id: opponent.hero_id
					}
				});

				opponentBuilds.set(opponent.player_id, {
					player: opponent,
					recentMatches: heroMatches.matches || [],
					builds: builds.builds || []
				});
			} catch (error) {
				console.error(`Failed to load builds for ${opponent.player_name}:`, error);
			}
		}
	}

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;

		if (autoRefresh) {
			// Start auto-refresh every 30 seconds
			refreshInterval = setInterval(() => {
				checkCurrentMatch();
			}, 30000);
		} else if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	onMount(async () => {
		// Load hero data for images
		try {
			heroes = await gameData.getHeroes();
		} catch (err) {
			console.error('Failed to load hero data:', err);
		}
		loadPlayerData();
		checkCurrentMatch();

		// Clean up interval on unmount
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}
		};
	});

	// Calculate KDA using derived
	const kda = $derived(player ? ((player.wins || 0) / Math.max(1, player.losses || 1)).toFixed(2) : '-');

	// Get player's main role from hero stats
	const mainRole = $derived(() => {
		if (!heroStats || heroStats.length === 0) return 'Unknown';
		const roleCounts: Record<string, number> = {};
		heroStats.forEach(stat => {
			if (stat.role) {
				roleCounts[stat.role] = (roleCounts[stat.role] || 0) + stat.games_played;
			}
		});
		const sortedRoles = Object.entries(roleCounts).sort(([,a], [,b]) => b - a);
		return sortedRoles.length > 0 ? sortedRoles[0][0] : 'Unknown';
	});
</script>

<svelte:head>
	<title>{player?.display_name || player?.name || 'Loading...'} - Predecessor Stats</title>
</svelte:head>

<div class="space-y-8">
	{#if loading && !player}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div class="animate-spin text-4xl mb-4">⚡</div>
				<p class="text-gray-400">Loading player data...</p>
			</div>
		</div>
	{:else if error}
		<div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
			<p class="text-red-400">{error}</p>
			<button
				onclick={() => loadPlayerData()}
				class="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else if player}
		<!-- Player Header -->
		<div class="bg-predecessor-card border border-predecessor-border rounded-lg p-6">
			<div class="flex items-start justify-between">
				<div class="flex items-center space-x-6">
					<!-- Avatar Placeholder -->
					<div class="w-24 h-24 rounded-lg bg-gradient-to-br from-predecessor-orange/20 to-predecessor-orange/10 flex items-center justify-center border border-predecessor-orange/30">
						<span class="text-4xl font-bold text-predecessor-orange">{player.display_name?.charAt(0) || player.name?.charAt(0) || '?'}</span>
					</div>
					<div>
						<h1 class="text-3xl font-bold mb-2">{player.display_name || player.name}</h1>
						<div class="flex items-center space-x-4 text-sm">
							<span class="text-predecessor-orange font-semibold text-lg">{player.rank_title || 'Unranked'}</span>
							<span class="text-gray-400">Rank #{player.leaderboard_rank || '-'}</span>
							<span class="text-gray-400">Top {player.top_percentage || '-'}%</span>
							{#if player.vp_total !== undefined}
								<span class="text-gray-400">VP: {player.vp_total}</span>
							{/if}
						</div>
						<div class="flex items-center space-x-4 text-sm text-gray-400 mt-2">
							<span>Main Role: <span class="text-white">{mainRole()}</span></span>
							<span>Region: <span class="text-white">NA</span></span>
							{#if player.last_match_ended_at}
								<span>Last Match: <span class="text-white">{new Date(player.last_match_ended_at).toLocaleDateString()}</span></span>
							{/if}
						</div>
					</div>
				</div>

				<button
					onclick={refreshData}
					disabled={refreshing}
					class="px-4 py-2 bg-predecessor-dark hover:bg-predecessor-border rounded-lg transition-colors disabled:opacity-50"
				>
					{#if refreshing}
						<span class="animate-spin inline-block">⚡</span> Refreshing...
					{:else}
						🔄 Refresh
					{/if}
				</button>
			</div>

			<!-- Stats Grid -->
			<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Games</p>
					<p class="text-2xl font-bold">{player.games_played || 0}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Wins</p>
					<p class="text-2xl font-bold text-green-500">{player.wins || 0}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Losses</p>
					<p class="text-2xl font-bold text-red-500">{player.losses || 0}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Win Rate</p>
					<p class="text-2xl font-bold text-predecessor-orange">{player.winrate ? `${player.winrate.toFixed(1)}%` : '-'}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg KDA</p>
					<p class="text-2xl font-bold">{playerStats?.kda_ratio ? playerStats.kda_ratio.toFixed(2) : '-'}</p>
				</div>
			</div>
		</div>

		<!-- Navigation Tabs -->
		<div class="bg-predecessor-card border border-predecessor-border rounded-lg">
			<div class="flex border-b border-predecessor-border">
				<button
					onclick={() => activeTab = 'current'}
					class="px-6 py-3 font-semibold transition-colors"
					class:text-predecessor-orange={activeTab === 'current'}
					class:border-b-2={activeTab === 'current'}
					class:border-predecessor-orange={activeTab === 'current'}
					class:text-gray-400={activeTab !== 'current'}
				>
					Current Game
				</button>
				<button
					onclick={() => activeTab = 'matches'}
					class="px-6 py-3 font-semibold transition-colors"
					class:text-predecessor-orange={activeTab === 'matches'}
					class:border-b-2={activeTab === 'matches'}
					class:border-predecessor-orange={activeTab === 'matches'}
					class:text-gray-400={activeTab !== 'matches'}
				>
					Matches
				</button>
				<button
					onclick={() => activeTab = 'heroes'}
					class="px-6 py-3 font-semibold transition-colors"
					class:text-predecessor-orange={activeTab === 'heroes'}
					class:border-b-2={activeTab === 'heroes'}
					class:border-predecessor-orange={activeTab === 'heroes'}
					class:text-gray-400={activeTab !== 'heroes'}
				>
					Heroes
				</button>
				<button
					onclick={() => activeTab = 'statistics'}
					class="px-6 py-3 font-semibold transition-colors"
					class:text-predecessor-orange={activeTab === 'statistics'}
					class:border-b-2={activeTab === 'statistics'}
					class:border-predecessor-orange={activeTab === 'statistics'}
					class:text-gray-400={activeTab !== 'statistics'}
				>
					Statistics
				</button>
				<button
					onclick={() => activeTab = 'teammates'}
					class="px-6 py-3 font-semibold transition-colors"
					class:text-predecessor-orange={activeTab === 'teammates'}
					class:border-b-2={activeTab === 'teammates'}
					class:border-predecessor-orange={activeTab === 'teammates'}
					class:text-gray-400={activeTab !== 'teammates'}
				>
					Teammates
				</button>
			</div>

			<div class="p-6">
				{#if activeTab === 'current'}
					<!-- Current Game -->
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold">Live Match Status</h3>
						<div class="flex items-center gap-4">
							<button
								onclick={toggleAutoRefresh}
								class="px-4 py-2 rounded-lg transition-colors"
								class:bg-green-600={autoRefresh}
								class:bg-predecessor-dark={!autoRefresh}
							>
								{autoRefresh ? '⏸ Auto-Refresh ON' : '▶ Auto-Refresh OFF'}
							</button>
							<button
								onclick={() => checkCurrentMatch()}
								class="px-4 py-2 bg-predecessor-orange hover:bg-predecessor-orange/80 rounded-lg transition-colors"
							>
								🔄 Check Now
							</button>
						</div>
					</div>

					{#if currentMatch}
						{@const ourPlayer = currentMatch.players?.find(p => p.player_id === playerId)}
						{@const dawnTeam = currentMatch.players?.filter(p => p.team === 'Dawn') || []}
						{@const duskTeam = currentMatch.players?.filter(p => p.team === 'Dusk') || []}

						<div class="bg-predecessor-dark rounded-lg p-4 mb-6">
							<div class="flex items-center justify-between mb-2">
								<p class="text-sm text-gray-400">Game Mode: {currentMatch.game_mode}</p>
								<p class="text-sm text-gray-400">Duration: {Math.floor(currentMatch.game_duration / 60)}m</p>
							</div>
							<p class="text-xs text-gray-500">Started: {new Date(currentMatch.started_at).toLocaleTimeString()}</p>
						</div>

						<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<!-- Dawn Team -->
							<div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
								<h4 class="font-bold mb-3 text-blue-400">Dawn Team {ourPlayer?.team === 'Dawn' ? '(Your Team)' : ''}</h4>
								<div class="space-y-3">
									{#each dawnTeam as player}
										{@const isOurPlayer = player.player_id === playerId}
										{@const heroImage = heroes.find(h => h.display_name === player.hero_name || h.name === player.hero_name)}
										<div class="flex items-center justify-between p-2 rounded" class:bg-blue-500/10={isOurPlayer}>
											<div class="flex items-center space-x-3">
												{#if heroImage?.image || heroImage?.image_url}
													<img
														src={getImageUrl(heroImage.image || heroImage.image_url)}
														alt={player.hero_name}
														class="w-10 h-10 rounded object-cover"
													/>
												{:else}
													<div class="w-10 h-10 rounded bg-predecessor-border flex items-center justify-center">
														<span class="text-xs">{player.hero_name?.substring(0, 3)}</span>
													</div>
												{/if}
												<div>
													<p class="font-semibold" class:text-predecessor-orange={isOurPlayer}>
														{player.player_name}
													</p>
													<p class="text-xs text-gray-400">{player.hero_name} • {player.role}</p>
												</div>
											</div>
											<div class="text-right">
												<p class="text-sm font-bold">
													{player.kills}/{player.deaths}/{player.assists}
												</p>
											</div>
										</div>
									{/each}
								</div>
							</div>

							<!-- Dusk Team -->
							<div class="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
								<h4 class="font-bold mb-3 text-purple-400">Dusk Team {ourPlayer?.team === 'Dusk' ? '(Your Team)' : ''}</h4>
								<div class="space-y-3">
									{#each duskTeam as player}
										{@const isOurPlayer = player.player_id === playerId}
										{@const heroImage = heroes.find(h => h.display_name === player.hero_name || h.name === player.hero_name)}
										{@const buildData = opponentBuilds.get(player.player_id)}
										<div class="flex items-center justify-between p-2 rounded" class:bg-purple-500/10={isOurPlayer}>
											<div class="flex items-center space-x-3">
												{#if heroImage?.image || heroImage?.image_url}
													<img
														src={getImageUrl(heroImage.image || heroImage.image_url)}
														alt={player.hero_name}
														class="w-10 h-10 rounded object-cover"
													/>
												{:else}
													<div class="w-10 h-10 rounded bg-predecessor-border flex items-center justify-center">
														<span class="text-xs">{player.hero_name?.substring(0, 3)}</span>
													</div>
												{/if}
												<div>
													<p class="font-semibold" class:text-predecessor-orange={isOurPlayer}>
														{player.player_name}
													</p>
													<p class="text-xs text-gray-400">{player.hero_name} • {player.role}</p>
												</div>
											</div>
											<div class="text-right">
												<p class="text-sm font-bold">
													{player.kills}/{player.deaths}/{player.assists}
												</p>
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>

						<!-- Opponent Analysis -->
						{#if ourPlayer && opponentBuilds.size > 0}
							<div class="mt-6">
								<h4 class="font-bold mb-4">Opponent Analysis</h4>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									{#each Array.from(opponentBuilds.entries()) as [playerId, data]}
										{@const opponent = data.player}
										{#if opponent.team !== ourPlayer.team}
											<div class="bg-predecessor-dark rounded-lg p-4">
												<p class="font-semibold mb-2">{opponent.player_name} - {opponent.hero_name}</p>
												<p class="text-sm text-gray-400 mb-2">Recent performance with this hero:</p>
												{#if data.recentMatches.length > 0}
													<div class="text-xs space-y-1">
														{#each data.recentMatches.slice(0, 3) as match}
															{@const playerData = match.players?.find(p => p.player_id === playerId)}
															{#if playerData}
																<p>
																	KDA: {playerData.kills}/{playerData.deaths}/{playerData.assists}
																	• {((playerData.damage_dealt_to_heroes || 0) / 1000).toFixed(1)}k dmg
																</p>
															{/if}
														{/each}
													</div>
												{:else}
													<p class="text-xs text-gray-500">No recent matches found</p>
												{/if}
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/if}
					{:else}
						<div class="bg-predecessor-dark rounded-lg p-8 text-center">
							<p class="text-gray-400 mb-4">No active game detected</p>
							<p class="text-sm text-gray-500">Click "Check Now" to search for a live match</p>
							<p class="text-xs text-gray-600 mt-2">Note: Live match detection is based on recent match data</p>
						</div>
					{/if}
				{:else if activeTab === 'matches'}

					<!-- Match History -->
					<h3 class="text-lg font-semibold mb-4">Recent Matches</h3>
					{#if matches.length > 0}
						<div class="space-y-3">
							{#each matches as match}
								{@const playerMatch = match.players?.find(p => p.player_id === playerId)}
								{@const isWin = playerMatch?.team === match.winning_team}
								{@const hero = heroes.find(h => h.display_name === playerMatch?.hero_name || h.name === playerMatch?.hero_name)}
								<div class="bg-predecessor-dark rounded-lg overflow-hidden hover:bg-predecessor-border/30 transition-colors">
									<div class="flex">
										<!-- Win/Loss Indicator -->
										<div class="w-1" class:bg-green-500={isWin} class:bg-red-500={!isWin}></div>

										<div class="flex-1 p-4">
											<div class="flex items-center justify-between">
												<div class="flex items-center space-x-4">
													<!-- Hero Icon -->
													{#if hero?.image || hero?.image_url}
														<img
															src={getImageUrl(hero.image || hero.image_url)}
															alt={hero.display_name}
															class="w-12 h-12 rounded object-cover"
														/>
													{:else}
														<div class="w-12 h-12 rounded bg-predecessor-border flex items-center justify-center">
															<span class="text-sm">{playerMatch?.hero_name?.substring(0, 3) || '?'}</span>
														</div>
													{/if}
													<div>
														<div class="flex items-center space-x-2">
															<p class="font-semibold">{playerMatch?.hero_name || 'Unknown Hero'}</p>
															<span class="text-xs px-2 py-1 bg-predecessor-border rounded">{playerMatch?.role || 'Any'}</span>
														</div>
														<p class="text-sm text-gray-400">{match.game_mode} • {Math.floor(match.game_duration / 60)}m {match.game_duration % 60}s</p>
													</div>
												</div>

												<!-- KDA -->
												<div class="flex items-center space-x-6">
													<div class="text-center">
														<p class="text-lg font-bold">
															<span>{playerMatch?.kills || 0}</span>
															<span class="text-gray-400 mx-1">/</span>
															<span>{playerMatch?.deaths || 0}</span>
															<span class="text-gray-400 mx-1">/</span>
															<span>{playerMatch?.assists || 0}</span>
														</p>
														<p class="text-xs text-gray-400">KDA: {playerMatch ? ((playerMatch.kills + playerMatch.assists) / Math.max(1, playerMatch.deaths)).toFixed(2) : '-'}</p>
													</div>

													<!-- CS -->
													<div class="text-center">
														<p class="text-lg font-bold">{playerMatch?.minions_killed || 0}</p>
														<p class="text-xs text-gray-400">CS</p>
													</div>

													<!-- Damage -->
													<div class="text-center">
														<p class="text-lg font-bold text-orange-500">{((playerMatch?.damage_dealt_to_heroes || 0) / 1000).toFixed(1)}k</p>
														<p class="text-xs text-gray-400">Damage</p>
													</div>

													<!-- Gold -->
													<div class="text-center">
														<p class="text-lg font-bold text-yellow-500">{((playerMatch?.gold_earned || 0) / 1000).toFixed(1)}k</p>
														<p class="text-xs text-gray-400">Gold</p>
													</div>

													<!-- Wards -->
													<div class="text-center">
														<p class="text-lg font-bold text-cyan-500">{playerMatch?.wards_placed || 0}</p>
														<p class="text-xs text-gray-400">Wards</p>
													</div>

													<!-- Time -->
													<div class="text-right text-sm text-gray-400">
														<p>{new Date(match.ended_at).toLocaleDateString()}</p>
														<p>{new Date(match.ended_at).toLocaleTimeString()}</p>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-400 text-center py-8">No recent matches found</p>
					{/if}
				{:else if activeTab === 'heroes'}
					<!-- Hero Statistics -->
					<h3 class="text-lg font-semibold mb-4">Hero Performance</h3>
					{#if heroStats && heroStats.length > 0}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each heroStats as hero}
								{@const heroData = heroes.find(h => h.display_name === hero.hero_name || h.name === hero.hero_name)}
								<div class="bg-predecessor-dark rounded-lg p-4">
									<div class="flex items-center justify-between mb-3">
										<div class="flex items-center space-x-3">
											{#if heroData?.image || heroData?.image_url}
												<img
													src={getImageUrl(heroData.image || heroData.image_url)}
													alt={heroData.display_name}
													class="w-12 h-12 rounded object-cover"
												/>
											{:else}
												<div class="w-12 h-12 rounded bg-predecessor-border flex items-center justify-center">
													<span class="text-sm">{hero.hero_name?.substring(0, 3) || '?'}</span>
												</div>
											{/if}
											<div>
												<p class="font-semibold">{hero.hero_name || 'Unknown'}</p>
												<p class="text-sm text-gray-400">{hero.role || 'Any Role'}</p>
											</div>
										</div>
										<div class="text-right">
											<p class="text-lg font-bold" class:text-green-500={hero.winrate >= 50} class:text-red-500={hero.winrate < 50}>
												{hero.winrate?.toFixed(1) || 0}%
											</p>
											<p class="text-xs text-gray-400">Win Rate</p>
										</div>
									</div>
									<div class="grid grid-cols-3 gap-2 text-center">
										<div>
											<p class="text-sm font-semibold">{hero.games_played || 0}</p>
											<p class="text-xs text-gray-400">Games</p>
										</div>
										<div>
											<p class="text-sm font-semibold">{hero.avg_kda?.toFixed(2) || '-'}</p>
											<p class="text-xs text-gray-400">KDA</p>
										</div>
										<div>
											<p class="text-sm font-semibold">{hero.avg_cs?.toFixed(0) || '-'}</p>
											<p class="text-xs text-gray-400">CS</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-400 text-center py-8">No hero statistics available</p>
					{/if}
				{:else if activeTab === 'statistics'}
					<!-- Detailed Statistics -->
					<h3 class="text-lg font-semibold mb-4">Performance Statistics</h3>
					{#if playerStats}
						<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
							<div class="bg-predecessor-dark rounded-lg p-4">
								<p class="text-sm text-gray-400 mb-1">Total Kills</p>
								<p class="text-xl font-bold">{playerStats.total_kills || 0}</p>
							</div>
							<div class="bg-predecessor-dark rounded-lg p-4">
								<p class="text-sm text-gray-400 mb-1">Total Deaths</p>
								<p class="text-xl font-bold">{playerStats.total_deaths || 0}</p>
							</div>
							<div class="bg-predecessor-dark rounded-lg p-4">
								<p class="text-sm text-gray-400 mb-1">Total Assists</p>
								<p class="text-xl font-bold">{playerStats.total_assists || 0}</p>
							</div>
							<div class="bg-predecessor-dark rounded-lg p-4">
								<p class="text-sm text-gray-400 mb-1">Avg Damage</p>
								<p class="text-xl font-bold">{playerStats.avg_damage_dealt_to_heroes?.toFixed(0) || '-'}</p>
							</div>
							<div class="bg-predecessor-dark rounded-lg p-4">
								<p class="text-sm text-gray-400 mb-1">Avg Gold/Min</p>
								<p class="text-xl font-bold">{playerStats.avg_gold_per_minute?.toFixed(0) || '-'}</p>
							</div>
							<div class="bg-predecessor-dark rounded-lg p-4">
								<p class="text-sm text-gray-400 mb-1">Avg CS/Min</p>
								<p class="text-xl font-bold">{playerStats.avg_cs_per_minute?.toFixed(1) || '-'}</p>
							</div>
							<div class="bg-predecessor-dark rounded-lg p-4">
								<p class="text-sm text-gray-400 mb-1">Avg Wards</p>
								<p class="text-xl font-bold">{playerStats.avg_wards_placed?.toFixed(1) || '-'}</p>
							</div>
							<div class="bg-predecessor-dark rounded-lg p-4">
								<p class="text-sm text-gray-400 mb-1">Longest Win Streak</p>
								<p class="text-xl font-bold">{playerStats.longest_win_streak || 0}</p>
							</div>
							<div class="bg-predecessor-dark rounded-lg p-4">
								<p class="text-sm text-gray-400 mb-1">Current Streak</p>
								<p class="text-xl font-bold" class:text-green-500={playerStats.current_win_streak > 0} class:text-red-500={playerStats.current_win_streak < 0}>
									{playerStats.current_win_streak > 0 ? `W${playerStats.current_win_streak}` : playerStats.current_win_streak < 0 ? `L${Math.abs(playerStats.current_win_streak)}` : '0'}
								</p>
							</div>
						</div>
					{:else}
						<p class="text-gray-400 text-center py-8">No statistics available</p>
					{/if}
				{:else if activeTab === 'teammates'}
					<!-- Common Teammates -->
					<h3 class="text-lg font-semibold mb-4">Common Teammates</h3>
					{#if commonTeammates && commonTeammates.length > 0}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each commonTeammates as teammate}
								<div class="bg-predecessor-dark rounded-lg p-4">
									<div class="flex items-center justify-between">
										<div>
											<p class="font-semibold">{teammate.player_name || 'Unknown'}</p>
											<p class="text-sm text-gray-400">
												{teammate.games_played || 0} games together
											</p>
											<p class="text-sm">
												<span class="text-green-500">{teammate.wins || 0}W</span>
												<span class="text-gray-400"> - </span>
												<span class="text-red-500">{teammate.losses || 0}L</span>
											</p>
										</div>
										<div class="text-right">
											<p class="text-2xl font-bold" class:text-green-500={teammate.winrate >= 50} class:text-red-500={teammate.winrate < 50}>
												{teammate.winrate?.toFixed(1) || 0}%
											</p>
											<p class="text-xs text-gray-400">Win Rate</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-400 text-center py-8">No teammate data available</p>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>