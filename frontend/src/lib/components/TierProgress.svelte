<script>
	import { lowDataMode } from '$lib/stores/preferences.js';

	/**
	 * @typedef {Object} Props
	 * @property {any} [tierInfo]
	 * @property {boolean} [compact]
	 * @property {boolean} [showLadder]
	 */

	/** @type {Props} */
	let { tierInfo = null, compact = false, showLadder = true } = $props();

	const levels = [
		{ name: 'TIER_0', label: 'Tier 0', min: 0, next: 1, unlock: '1 reserved task' },
		{ name: 'TIER_1', label: 'Tier 1', min: 1, next: 3, unlock: '2 reserved tasks' },
		{ name: 'TIER_2', label: 'Tier 2', min: 3, next: 5, unlock: '3 reserved tasks' },
		{ name: 'TIER_3', label: 'Tier 3', min: 5, next: null, unlock: 'Unlimited reservations' }
	];

	const tierName = $derived(tierInfo?.tier || 'TIER_0');
	const tierIndex = $derived(
		Math.max(
			0,
			levels.findIndex((level) => level.name === tierName)
		)
	);
	const verified = $derived(Number(tierInfo?.verifiedExperienceCount ?? 0));
	const level = $derived(levels[tierIndex] ?? levels[0]);
	const nextLevel = $derived(tierIndex < levels.length - 1 ? levels[tierIndex + 1] : null);
	const remaining = $derived(nextLevel ? Math.max(0, nextLevel.min - verified) : 0);
	const progress = $derived.by(() => {
		if (!nextLevel) return 100;
		const span = nextLevel.min - level.min;
		if (span <= 0) return 100;
		return Math.min(100, Math.max(0, ((verified - level.min) / span) * 100));
	});
	const reservationLimit = $derived(
		tierInfo?.maxConcurrentReservations >= 1000
			? 'Unlimited'
			: (tierInfo?.maxConcurrentReservations ?? 1)
	);
</script>

<div class="border border-[#C8D4E8] bg-white shadow-xs {compact ? 'p-5' : 'p-6'}">
	<div class="flex items-start justify-between gap-3">
		<div>
			<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C3FE4]">Progression</div>
			<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">Tier {tierIndex}</h3>
		</div>
		<span class="border border-[#7C3FE4]/40 bg-[#F5EEFF] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#7C3FE4]">
			{tierInfo ? 'Live tier' : 'Tier pending'}
		</span>
	</div>

	<div class="mt-4">
		<div class="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">
			<span>{verified} verified experience{verified === 1 ? '' : 's'}</span>
			<span>{nextLevel ? `Next: ${nextLevel.label}` : 'Maximum tier'}</span>
		</div>
		<div class="mt-2 h-2.5 border border-[#C8D4E8] bg-[#F8F9FC]">
			<div class="h-full bg-[#7C3FE4] transition-[width] duration-500" style={`width: ${progress}%`}></div>
		</div>
		<p class="mt-2 font-sans text-[11px] leading-relaxed text-[#465A7A]">
			{#if nextLevel}
				{remaining} more verified experience{remaining === 1 ? '' : 's'} to reach {nextLevel.label} and unlock
				<span class="font-semibold text-[#0D1B3E]">{nextLevel.unlock}</span>.
			{:else}
				You are at the highest tier. You can hold unlimited task reservations.
			{/if}
		</p>
	</div>

	{#if !compact && showLadder}
		<div class="mt-5 pt-4 border-t border-[#C8D4E8] grid grid-cols-4 gap-2">
			{#each levels as item, index}
				<div class="border px-2 py-2 text-center {index === tierIndex ? 'border-[#7C3FE4] bg-[#F5EEFF]' : index < tierIndex ? 'border-[#C8D4E8] bg-[#EDFBF3]' : 'border-[#C8D4E8] bg-[#F8F9FC]'}">
					<div class="font-mono text-[10px] font-bold {index <= tierIndex ? 'text-[#0D1B3E]' : 'text-[#6A84AC]'}">T{index}</div>
					<div class="mt-0.5 font-mono text-[9px] uppercase tracking-wider {index <= tierIndex ? 'text-[#7C3FE4]' : 'text-[#6A84AC]'}">
						{index === tierIndex ? 'NOW' : index < tierIndex ? 'PASSED' : 'LOCKED'}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#C8D4E8] pt-3 font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">
		<span>Reservations {tierInfo?.activeReservations ?? 0} / {reservationLimit}</span>
		<span class="text-[#C8D4E8]">|</span>
		<span>Window {tierInfo?.reservationWindowHours ?? 48}h</span>
		{#if !$lowDataMode}
			<span class="text-[#C8D4E8]">|</span>
			<span class="text-[#1A8A55]">{tierInfo?.canApply === false ? 'Reservation limit reached' : 'Eligible to apply'}</span>
		{/if}
	</div>
</div>
