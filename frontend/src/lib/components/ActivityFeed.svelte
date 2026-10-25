<script>
	import { formatDate } from '$lib/utils/formatters.js';

	/**
	 * @typedef {Object} FeedItem
	 * @property {string|number} id
	 * @property {string} agent
	 * @property {string} action
	 * @property {string} [detail]
	 * @property {string} [time]
	 * @property {'ledger'|'payment'|'treasury'|'matching'|'admin'} [tone]
	 */

	/**
	 * @typedef {Object} Props
	 * @property {FeedItem[]} [items]
	 * @property {string} [title]
	 * @property {string} [subtitle]
	 * @property {number} [limit]
	 * @property {boolean} [compact]
	 */

	/** @type {Props} */
	let {
		items = [],
		title = 'Agent Activity',
		subtitle = 'Live platform events, newest first.',
		limit = 10,
		compact = false
	} = $props();

	const toneClass = {
		ledger: 'border-[#7C3FE4] bg-[#F5EEFF] text-[#7C3FE4]',
		payment: 'border-[#1A8A55] bg-[#EDFBF3] text-[#1A8A55]',
		treasury: 'border-[#1446A0] bg-[#EFF4FF] text-[#1446A0]',
		matching: 'border-[#D4831A] bg-[#FFFBF2] text-[#8A5A10]',
		admin: 'border-[#6A84AC] bg-[#F8F9FC] text-[#465A7A]'
	};
</script>

<div class="border border-[#C8D4E8] bg-white shadow-xs">
	<div class="flex items-start justify-between gap-3 border-b border-[#C8D4E8] p-5">
		<div>
			<div class="flex items-center gap-2">
				<span class="h-1.5 w-1.5 bg-[#1A8A55]" aria-hidden="true"></span>
				<h3 class="font-serif text-xl text-[#0D1B3E]">{title}</h3>
			</div>
			{#if !compact}
				<p class="mt-0.5 text-[11px] text-[#6A84AC] font-sans">{subtitle}</p>
			{/if}
		</div>
		<span class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">{items.length} EVENTS</span>
	</div>

	{#if items.length === 0}
		<div class="p-6 text-center">
			<p class="text-xs text-[#6A84AC] font-sans">No agent activity recorded yet.</p>
		</div>
	{:else}
		<ol class="divide-y divide-[#EFF4FF]">
			{#each items.slice(0, limit) as item (item.id)}
				<li class="flex gap-3 p-4 hover:bg-[#F8F9FC] transition-colors">
					<span class="mt-0.5 inline-flex h-7 w-12 shrink-0 items-center justify-center border font-mono text-[9px] font-bold uppercase tracking-wider {toneClass[item.tone] || toneClass.admin}">
						{item.agent}
					</span>
					<div class="min-w-0 flex-1">
						<div class="text-xs font-semibold text-[#0D1B3E] font-sans">{item.action}</div>
						{#if item.detail}
							<div class="mt-0.5 truncate font-mono text-[10px] text-[#6A84AC]" title={item.detail}>{item.detail}</div>
						{/if}
					</div>
					<span class="shrink-0 font-mono text-[9px] text-[#6A84AC]">{formatDate(item.time, true)}</span>
				</li>
			{/each}
		</ol>
	{/if}
</div>
