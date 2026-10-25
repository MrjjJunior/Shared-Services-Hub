<script>
	/**
	 * Reusable loading / empty / error surface used by the Slot 5 screens.
	 *
	 * @typedef {Object} Props
	 * @property {'loading'|'empty'|'error'|'info'} [kind]
	 * @property {string} [title]
	 * @property {string} [message]
	 * @property {string} [actionLabel]
	 * @property {() => void} [onaction]
	 * @property {number} [rows]
	 * @property {boolean} [compact]
	 */

	/** @type {Props} */
	let {
		kind = 'empty',
		title = '',
		message = '',
		actionLabel = '',
		onaction = null,
		rows = 3,
		compact = false
	} = $props();
</script>

{#if kind === 'loading'}
	<div class="space-y-3" aria-live="polite" aria-label="Loading content">
		{#each Array(rows) as _, index (index)}
			<div class="border border-[#C8D4E8] bg-white {compact ? 'p-4' : 'p-6'}">
				<div class="h-3 w-24 bg-[#EFF4FF] animate-pulse"></div>
				<div class="mt-3 h-5 w-2/3 bg-[#EFF4FF] animate-pulse"></div>
				<div class="mt-2 h-3 w-full max-w-md bg-[#EFF4FF] animate-pulse"></div>
				{#if !compact}
					<div class="mt-1.5 h-3 w-4/5 bg-[#EFF4FF] animate-pulse"></div>
				{/if}
			</div>
		{/each}
	</div>
{:else if kind === 'error'}
	<div class="border-l-4 border-l-[#C42B2B] border border-[#F0C0C0] bg-[#FFF5F5] {compact ? 'p-4' : 'p-6'}" role="alert">
		<div class="flex items-start gap-3">
			<span class="font-mono text-xs font-bold text-[#C42B2B]">[ERR]</span>
			<div class="flex-1">
				<h3 class="font-serif text-lg text-[#0D1B3E]">{title || 'Could not load this section'}</h3>
				{#if message}
					<p class="mt-1 text-xs text-[#465A7A] leading-relaxed font-sans">{message}</p>
				{/if}
				{#if onaction && actionLabel}
					<div class="mt-3">
						<button
							type="button"
							class="border border-[#C42B2B] bg-white px-3.5 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#C42B2B] hover:bg-[#C42B2B] hover:text-white transition-colors"
							onclick={onaction}
						>
							{actionLabel}
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else if kind === 'info'}
	<div class="border border-[#C8D4E8] bg-[#EFF4FF] {compact ? 'p-4' : 'p-6'}">
		<h3 class="font-serif text-lg text-[#0D1B3E]">{title}</h3>
		{#if message}
			<p class="mt-1 text-xs text-[#465A7A] leading-relaxed font-sans">{message}</p>
		{/if}
		{#if onaction && actionLabel}
			<button
				type="button"
				class="mt-3 border border-[#1446A0] bg-white px-3.5 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#1446A0] hover:bg-[#1446A0] hover:text-white transition-colors"
				onclick={onaction}
			>
				{actionLabel}
			</button>
		{/if}
	</div>
{:else}
	<div class="border border-dashed border-[#C8D4E8] bg-white {compact ? 'p-6' : 'p-10'} text-center">
		<div class="mx-auto mb-3 flex h-8 w-8 items-center justify-center border border-[#C8D4E8] bg-[#F8F9FC] font-mono text-[10px] font-bold text-[#6A84AC]">
			SSH
		</div>
		<h3 class="font-serif text-lg text-[#0D1B3E]">{title || 'Nothing here yet'}</h3>
		{#if message}
			<p class="mx-auto mt-1 max-w-sm text-xs text-[#6A84AC] leading-relaxed font-sans">{message}</p>
		{/if}
		{#if onaction && actionLabel}
			<button
				type="button"
				class="mt-4 cape-btn-primary px-4 py-2 text-[10px] font-mono uppercase tracking-wider"
				onclick={onaction}
			>
				{actionLabel}
			</button>
		{/if}
	</div>
{/if}
