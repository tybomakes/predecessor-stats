<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { omedaAPI, type Player, type Match, type Hero, type Build, type Item } from '$lib/api/omeda';
	import { cache, cacheKeys } from '$lib/api/cache';
	import { CACHE_DURATION, getImageUrl } from '$lib/config/api';
	import { gameData } from '$lib/api/gameData';
	import BuildRecommendation from '$lib/components/BuildRecommendation.svelte';
	import MatchDetail from '$lib/components/MatchDetail.svelte';
	import BuildCreator from '$lib/components/BuildCreator.svelte';
	import BuildDetail from '$lib/components/BuildDetail.svelte';
	import { browser } from '$app/environment';

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
	let selectedMatch = $state<Match | null>(null);

	// Builds state
	let userBuilds = $state<any[]>([]);
	let selectedHeroFilter = $state<number | string>('');
	let showBuildCreator = $state(false);
	let editingBuild = $state<any>(null);
	let selectedBuild = $state<any>(null);
	let items = $state<Item[]>([]);

	// Filtered builds based on hero selection
	let filteredBuilds = $derived(
		selectedHeroFilter
			? userBuilds.filter(b => b.hero_id === Number(selectedHeroFilter))
			: userBuilds
	);

	// Helper to get player ID (handles both id and player_id fields)
	function getPlayerId(player: any): string {
		return player.id || player.player_id || '';
	}

	// Helper to get player name (handles both display_name and player_name fields)
	function getPlayerName(player: any): string {
		return player.display_name || player.player_name || 'Unknown';
	}

	// Helper to get relative time
	function getRelativeTime(dateStr: string | undefined): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 60) return `about ${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `about ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
		if (diffDays < 7) return `about ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
		return date.toLocaleDateString();
	}

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
			if (!playerId) return;
			const recentMatches = await omedaAPI.getPlayerMatches(playerId, { per_page: 1 });
			if (recentMatches.matches && recentMatches.matches.length > 0) {
				const match = recentMatches.matches[0];

				// Check if match is recent (within last hour)
				const matchEndTime = new Date(match.end_time || match.ended_at || '').getTime();
				const matchStartTime = new Date(match.start_time || match.started_at || '').getTime();
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
		const ourPlayer = match.players.find(p => getPlayerId(p) === playerId);
		if (!ourPlayer) return;

		const ourTeam = ourPlayer.team;
		const opponents = match.players.filter(p => p.team !== ourTeam);

		// Load build data for each opponent
		for (const opponent of opponents) {
			try {
				const opponentId = getPlayerId(opponent);
				// Get the opponent's recent matches with the same hero
				const heroMatches = await omedaAPI.getPlayerMatches(opponentId, {
					per_page: 5,
					filter: { hero_id: opponent.hero_id }
				});

				// First try to get player-specific builds for this hero
				let builds: Build[] = [];

				try {
					// Try to get builds by this player for this specific hero
					const playerBuilds = await omedaAPI.getBuilds({
						filter: {
							player_id: opponentId,
							hero_id: opponent.hero_id
						}
					});

					if (playerBuilds && playerBuilds.length > 0) {
						builds = playerBuilds.slice(0, 2); // Get top 2 player builds
						console.log(`Found ${playerBuilds.length} builds by ${getPlayerName(opponent)} for ${opponent.hero_name}`);
					}
				} catch (error) {
					console.error(`Failed to get player builds for ${getPlayerName(opponent)}:`, error);
				}

				// If no player-specific builds, get popular builds for this hero/role
				if (builds.length === 0) {
					try {
						const popularBuilds = await omedaAPI.getBuilds({
							filter: {
								hero_id: opponent.hero_id,
								role: opponent.role,
								order: 'popular'
							}
						});

						if (popularBuilds && popularBuilds.length > 0) {
							builds = popularBuilds.slice(0, 2); // Get top 2 popular builds
							console.log(`Using popular builds for ${opponent.hero_name} (${opponent.role})`);
						}
					} catch (error) {
						console.error(`Failed to get popular builds for ${opponent.hero_name}:`, error);
					}
				}

				opponentBuilds.set(opponentId, {
					player: opponent,
					recentMatches: heroMatches.matches || [],
					builds: builds
				});
			} catch (error) {
				console.error(`Failed to load builds for ${getPlayerName(opponent)}:`, error);
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

	// Build management functions
	function loadBuilds() {
		if (!browser) return;
		const stored = localStorage.getItem(`builds_${playerId}`);
		if (stored) {
			userBuilds = JSON.parse(stored);
		}
	}

	function saveBuilds() {
		if (!browser) return;
		localStorage.setItem(`builds_${playerId}`, JSON.stringify(userBuilds));
	}

	function deleteBuild(buildId: string) {
		userBuilds = userBuilds.filter(b => b.id !== buildId);
		saveBuilds();
	}

	function editBuild(build: any) {
		editingBuild = build;
		showBuildCreator = true;
	}

	function saveBuild(build: any) {
		if (editingBuild) {
			// Update existing build
			const index = userBuilds.findIndex(b => b.id === editingBuild.id);
			if (index !== -1) {
				userBuilds[index] = build;
			}
		} else {
			// Add new build
			build.id = Date.now().toString();
			userBuilds = [...userBuilds, build];
		}
		saveBuilds();
		showBuildCreator = false;
		editingBuild = null;
	}

	onMount(() => {
		// Load hero and item data for images
		(async () => {
			try {
				[heroes, items] = await Promise.all([
					gameData.getHeroes(),
					gameData.getItems()
				]);
			} catch (err) {
				console.error('Failed to load game data:', err);
			}

			await loadPlayerData();
			checkCurrentMatch();
			loadBuilds();
		})();

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

	// Get player's favorite (most played) hero
	const favoriteHero = $derived(() => {
		if (!heroStats || heroStats.length === 0) return null;
		// Sort by games played (handle both games_played and total_games fields)
		const sorted = [...heroStats].sort((a, b) => {
			const aGames = a.games_played || a.total_games || 0;
			const bGames = b.games_played || b.total_games || 0;
			return bGames - aGames;
		});
		if (sorted.length === 0 || sorted[0].games_played === 0) return null;
		const heroId = sorted[0].hero_id;
		return heroes.find(h => h.id === heroId) || null;
	});

	// Helper to format game mode names
	function formatGameMode(mode: string | undefined): string {
		if (!mode) return 'PVP';
		// Convert TEAM_VS_TEAM_RUSH to Nitro
		if (mode === 'TEAM_VS_TEAM_RUSH') return 'Nitro';
		// Convert underscores to spaces and capitalize words
		return mode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
	}
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
					<!-- Favorite Hero or Avatar -->
					{#if favoriteHero()}
						<div class="relative">
							<img
								src={getImageUrl(favoriteHero().image || favoriteHero().image_url)}
								alt={favoriteHero().display_name}
								class="w-24 h-24 rounded-lg object-cover border-2 border-predecessor-orange/50"
							/>
							<div class="absolute -bottom-2 -right-2 bg-predecessor-dark rounded px-2 py-1 text-xs border border-predecessor-border">
								<span class="text-gray-400">Favorite</span>
							</div>
						</div>
					{:else}
						<div class="w-24 h-24 rounded-lg bg-gradient-to-br from-predecessor-orange/20 to-predecessor-orange/10 flex items-center justify-center border border-predecessor-orange/30">
							<span class="text-4xl font-bold text-predecessor-orange">{player.display_name?.charAt(0) || player.name?.charAt(0) || '?'}</span>
						</div>
					{/if}
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
					<p class="text-2xl font-bold">{player.total_matches_played || player.games_played || playerStats?.games_played || playerStats?.total_matches_played || 0}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Wins</p>
					<p class="text-2xl font-bold text-green-500">{player.total_matches_won || player.wins || playerStats?.wins || playerStats?.matches_won || playerStats?.total_matches_won || 0}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Losses</p>
					<p class="text-2xl font-bold text-red-500">{player.total_matches_lost || player.losses || playerStats?.losses || playerStats?.matches_lost || playerStats?.total_matches_lost || 0}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">24hr W/L</p>
					<p class="text-2xl font-bold">
						<span class="text-green-500">{player.last_24_hours_wins || playerStats?.last_24_hours_wins || playerStats?.wins_24h || 0}</span>
						<span class="text-gray-400">/</span>
						<span class="text-red-500">{player.last_24_hours_losses || playerStats?.last_24_hours_losses || playerStats?.losses_24h || 0}</span>
					</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg KDA</p>
					<p class="text-2xl font-bold">{player.avg_kda_ratio || player.kda_ratio || playerStats?.avg_kda_ratio || playerStats?.kda_ratio || '-'}</p>
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
					onclick={() => activeTab = 'builds'}
					class="px-6 py-3 font-semibold transition-colors"
					class:text-predecessor-orange={activeTab === 'builds'}
					class:border-b-2={activeTab === 'builds'}
					class:border-predecessor-orange={activeTab === 'builds'}
					class:text-gray-400={activeTab !== 'builds'}
				>
					Builds
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
						{@const ourPlayer = currentMatch.players?.find(p => getPlayerId(p) === playerId)}
						{@const dawnTeam = currentMatch.players?.filter(p => p.team === 'Dawn' || p.team === 'dawn') || []}
						{@const duskTeam = currentMatch.players?.filter(p => p.team === 'Dusk' || p.team === 'dusk') || []}

						<div class="bg-predecessor-dark rounded-lg p-4 mb-6">
							<div class="flex items-center justify-between mb-2">
								<p class="text-sm text-gray-400">Game Mode: {formatGameMode(currentMatch.game_mode)}</p>
								<p class="text-sm text-gray-400">Duration: {Math.floor(currentMatch.game_duration / 60)}m</p>
							</div>
							<p class="text-xs text-gray-500">Started: {new Date(currentMatch.started_at || currentMatch.start_time || '').toLocaleTimeString()}</p>
						</div>

						<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<!-- Dawn Team -->
							<div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
								<h4 class="font-bold mb-3 text-blue-400">Dawn Team {ourPlayer?.team === 'Dawn' ? '(Your Team)' : ''}</h4>
								<div class="space-y-3">
									{#each dawnTeam as player}
										{@const isOurPlayer = getPlayerId(player) === playerId}
										{@const heroImage = heroes.find(h => h.id === player.hero_id)}
										<div class="flex items-center justify-between p-2 rounded {isOurPlayer ? 'bg-blue-500/10' : ''}">
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
														{getPlayerName(player)}
													</p>
													<p class="text-xs text-gray-400">{heroImage?.display_name || 'Unknown'} • {player.role}</p>
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
										{@const isOurPlayer = getPlayerId(player) === playerId}
										{@const heroImage = heroes.find(h => h.id === player.hero_id)}
										{@const buildData = opponentBuilds.get(getPlayerId(player))}
										<div class="flex items-center justify-between p-2 rounded {isOurPlayer ? 'bg-purple-500/10' : ''}">
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
														{getPlayerName(player)}
													</p>
													<p class="text-xs text-gray-400">{heroImage?.display_name || 'Unknown'} • {player.role}</p>
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
												<div class="flex items-start justify-between mb-2">
													<div>
														<p class="font-semibold">{opponent.player_name}</p>
														<p class="text-sm text-gray-400">{opponent.hero_name} • {opponent.role}</p>
													</div>
													{#if opponent.rank_title}
														<span class="text-xs px-2 py-1 bg-predecessor-border rounded">
															{opponent.rank_title}
														</span>
													{/if}
												</div>

												<!-- Recent Performance -->
												<div class="mb-3">
													<p class="text-sm text-gray-400 mb-2">Recent performance:</p>
													{#if data.recentMatches.length > 0}
														<div class="text-xs space-y-1">
															{#each data.recentMatches.slice(0, 3) as match}
																{@const playerData = match.players?.find((p: any) => getPlayerId(p) === playerId)}
																{#if playerData}
																	<div class="flex items-center justify-between">
																		<span>
																			{playerData.kills}/{playerData.deaths}/{playerData.assists} KDA
																		</span>
																		<span class="text-gray-500">
																			{((playerData.damage_dealt_to_heroes || 0) / 1000).toFixed(1)}k dmg
																		</span>
																	</div>
																{/if}
															{/each}
														</div>
													{:else}
														<p class="text-xs text-gray-500">No recent matches found</p>
													{/if}
												</div>

												<!-- Build Recommendations -->
												{#if data.builds && data.builds.length > 0}
													<div class="border-t border-predecessor-border pt-3">
														<p class="text-sm text-gray-400 mb-2">
															{data.builds[0].author_player?.id === opponent.player_id ?
																"Player's builds:" :
																"Recommended builds:"}
														</p>
														<div class="space-y-2">
															{#each data.builds as build}
																<BuildRecommendation {build} compact={true} />
															{/each}
														</div>
													</div>
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
								{@const playerMatch = match.players?.find(p => getPlayerId(p) === playerId)}
								{@const isWin = playerMatch?.team === match.winning_team}
								{@const hero = heroes.find(h => h.id === playerMatch?.hero_id)}
								<button
									onclick={() => selectedMatch = match}
									class="w-full text-left bg-predecessor-dark rounded-lg overflow-hidden hover:bg-predecessor-border/30 transition-colors cursor-pointer">
									<div class="flex">
										<!-- Victory/Defeat Badge -->
										<div class="p-4 flex flex-col items-center justify-center" style="min-width: 100px">
											<div class="px-3 py-1 rounded text-sm font-bold {isWin ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">
												{isWin ? 'Victory' : 'Defeat'}
											</div>
											<div class="mt-2 text-center">
												<p class="text-xs text-gray-400 uppercase">{formatGameMode(match.game_mode)}</p>
												{#if playerMatch?.vp_change !== undefined && playerMatch.vp_change !== 0}
													<p class="text-sm font-semibold {playerMatch.vp_change > 0 ? 'text-green-400' : 'text-red-400'}">
														{playerMatch.vp_change > 0 ? '+' : ''}{playerMatch.vp_change} VP
													</p>
												{/if}
												<p class="text-xs text-gray-500">{getRelativeTime(match.end_time || match.ended_at)}</p>
											</div>
										</div>

										<div class="flex-1 p-4">
											<div class="flex items-center justify-between">
												<div class="flex items-center space-x-4">
													<!-- Hero Icon -->
													{#if hero?.image || hero?.image_url}
														<img
															src={getImageUrl(hero.image || hero.image_url)}
															alt={hero.display_name}
															class="w-14 h-14 rounded object-cover"
														/>
													{:else}
														<div class="w-14 h-14 rounded bg-predecessor-border flex items-center justify-center">
															<span class="text-sm">{playerMatch?.hero_name?.substring(0, 3) || '?'}</span>
														</div>
													{/if}
													<div>
														<div class="flex items-center space-x-2">
															<p class="font-semibold text-lg">{hero?.display_name || playerMatch?.hero_name || 'Unknown'}</p>
															<span class="text-xs px-2 py-1 bg-predecessor-border rounded capitalize">{playerMatch?.role || 'Any'}</span>
														</div>
														<div class="flex items-center gap-3 text-sm">
															<span class="text-gray-400">Level {playerMatch?.player_level || '-'}</span>
														</div>
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
														<p class="text-lg font-bold text-orange-500">{((playerMatch?.damage_dealt_to_heroes || playerMatch?.damage_dealt || playerMatch?.total_damage || 0) / 1000).toFixed(1)}k</p>
														<p class="text-xs text-gray-400">Damage</p>
													</div>

													<!-- Gold -->
													<div class="text-center">
														<p class="text-lg font-bold text-yellow-500">{((playerMatch?.gold_earned || 0) / 1000).toFixed(1)}k</p>
														<p class="text-xs text-gray-400">Gold</p>
													</div>

													<!-- Performance Score if available -->
													{#if playerMatch?.performance_score}
														<div class="text-center">
															<p class="text-lg font-bold">{playerMatch.performance_score.toFixed(1)}</p>
															<p class="text-xs text-gray-400">PS</p>
														</div>
													{/if}
												</div>
											</div>
										</div>
									</div>
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-gray-400 text-center py-8">No recent matches found</p>
					{/if}
				{:else if activeTab === 'builds'}
					{#if showBuildCreator}
						<!-- Build Creator -->
						<BuildCreator
							{heroes}
							{items}
							existingBuild={editingBuild}
							onSave={saveBuild}
							onClose={() => {
								showBuildCreator = false;
								editingBuild = null;
							}}
						/>
					{:else}
						<!-- Builds List Section -->
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-semibold">My Builds</h3>
							<button
								onclick={() => showBuildCreator = true}
								class="px-4 py-2 bg-predecessor-orange text-black font-semibold rounded-lg hover:bg-predecessor-orange/80 transition-colors"
							>
								+ Create Build
							</button>
						</div>

						<!-- Hero Filter -->
						<div class="mb-4">
							<select
								bind:value={selectedHeroFilter}
								class="bg-predecessor-dark border border-predecessor-border rounded-lg px-4 py-2 text-sm"
							>
								<option value="">All Heroes</option>
								{#each heroes as hero}
									<option value={hero.id}>{hero.display_name}</option>
								{/each}
							</select>
						</div>

						<!-- Builds List -->
						{#if filteredBuilds.length > 0}
							<div class="space-y-4">
								{#each filteredBuilds as build}
									{@const hero = heroes.find(h => h.id === build.hero_id)}
									<div
										class="bg-predecessor-dark rounded-lg p-4 hover:bg-predecessor-card transition-colors cursor-pointer"
										onclick={() => selectedBuild = build}
									>
										<div class="flex items-center gap-4">
											<!-- Hero Image -->
											<div class="flex-shrink-0">
												{#if hero}
													<img
														src={getImageUrl(hero.image || hero.image_url)}
														alt={hero.display_name}
														class="w-20 h-20 rounded object-cover"
													/>
												{:else}
													<div class="w-20 h-20 rounded bg-predecessor-border flex items-center justify-center">
														<span class="text-2xl">?</span>
													</div>
												{/if}
											</div>

											<!-- Build Info -->
											<div class="flex-1">
												<div class="flex items-start justify-between mb-2">
													<div>
														<h4 class="font-semibold text-lg">{build.title}</h4>
														<p class="text-sm text-gray-400">
															{hero?.display_name || 'Unknown Hero'} • {build.role}
														</p>
													</div>
													<div class="flex gap-2">
														<button
															onclick={(e) => {
																e.stopPropagation();
																editBuild(build);
															}}
															class="text-predecessor-orange hover:text-predecessor-orange/80 text-sm"
														>
															Edit Build
														</button>
														<button
															onclick={(e) => {
																e.stopPropagation();
																deleteBuild(build.id);
															}}
															class="text-red-500 hover:text-red-400 text-sm"
														>
															Delete
														</button>
													</div>
												</div>

												<!-- Items Display -->
												<div class="flex gap-2">
													{#each build.items as itemId}
														{@const item = items.find(i => i.id === itemId)}
														{#if item}
															<div class="relative group">
																<img
																	src={getImageUrl(item.image || item.image_url)}
																	alt={item.display_name}
																	class="w-14 h-14 rounded border-2 border-predecessor-border"
																/>
																<!-- Tooltip -->
																<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
																	<div class="bg-black/95 rounded-lg p-2 whitespace-nowrap">
																		<p class="text-sm font-semibold">{item.display_name}</p>
																		<p class="text-xs text-predecessor-orange">{item.price}g</p>
																	</div>
																</div>
															</div>
														{:else}
															<div class="w-14 h-14 rounded border-2 border-predecessor-border bg-predecessor-darker"></div>
														{/if}
													{/each}
													{#each Array(6 - build.items.length) as _}
														<div class="w-14 h-14 rounded border-2 border-predecessor-border bg-predecessor-darker opacity-30"></div>
													{/each}
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-400 text-center py-8">
								{selectedHeroFilter ? 'No builds found for this hero' : 'No builds created yet'}
							</p>
						{/if}
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Match Detail Modal -->
{#if selectedMatch}
	<MatchDetail
		match={selectedMatch}
		playerId={playerId || ''}
		onClose={() => selectedMatch = null}
	/>
{/if}

<!-- Build Detail Modal -->
{#if selectedBuild}
	<BuildDetail
		build={selectedBuild}
		hero={heroes.find(h => h.id === selectedBuild.hero_id)}
		{items}
		onClose={() => selectedBuild = null}
	/>
{/if}

