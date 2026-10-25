<script>
	/**
	 * @typedef {Object} Props
	 * @property {any} [tierInfo]
	 * @property {string} [skills]
	 */

	/** @type {Props} */
	let { tierInfo = null, skills = '' } = $props();

	const stages = [
		{
			name: 'TIER_0',
			label: 'First Step',
			range: '0 verified',
			unlock: '1 live reservation',
			description: 'Create your profile, complete the skills check and apply for your first supported task.',
			icon: '01'
		},
		{
			name: 'TIER_1',
			label: 'Proven Contributor',
			range: '1–2 verified',
			unlock: '2 live reservations',
			description: 'One SME sign-off unlocks your first permanent ledger record and a second simultaneous opportunity.',
			icon: '02'
		},
		{
			name: 'TIER_2',
			label: 'Trusted Specialist',
			range: '3–4 verified',
			unlock: '3 live reservations',
			description: 'A consistent track record across categories makes you visible for higher-value, tiered work.',
			icon: '03'
		},
		{
			name: 'TIER_3',
			label: 'Alumni Leader',
			range: '5+ verified',
			unlock: 'Unlimited reservations',
			description: 'Full platform access, unlimited applications and eligibility for advanced SME briefs.',
			icon: '04'
		}
	];

	const tierIndex = $derived(
		Math.max(
			0,
			stages.findIndex((stage) => stage.name === (tierInfo?.tier || 'TIER_0'))
		)
	);
	const skillList = $derived(
		skills
			.split(/[,;]/)
			.map((skill) => skill.trim())
			.filter(Boolean)
			.slice(0, 6)
	);
</script>

<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-[#C8D4E8] pb-4">
		<div>
			<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#D4831A]">Career Path</div>
			<h2 class="mt-1 font-serif text-2xl text-[#0D1B3E]">From first task to alumni leader</h2>
			<p class="mt-1 text-xs text-[#6A84AC] font-sans max-w-2xl">
				Your tier is earned only through verified SME sign-offs. Every stage adds another permanent, portable proof point to your Experience Ledger.
			</p>
		</div>
		<a href="/tasks" class="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#1446A0] hover:underline">
			Browse tiered work →
		</a>
	</div>

	<div class="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
		{#each stages as stage, index}
			<div class="relative border p-4 {index === tierIndex ? 'border-[#7C3FE4] bg-[#FAF8FF] shadow-xs' : index < tierIndex ? 'border-[#1A8A55]/40 bg-[#F7FCF9]' : 'border-[#C8D4E8] bg-[#F8F9FC]'}">
				<div class="flex items-start justify-between gap-2">
					<span class="font-mono text-[10px] font-bold uppercase tracking-widest {index <= tierIndex ? 'text-[#7C3FE4]' : 'text-[#6A84AC]'}">
						STAGE {stage.icon}
					</span>
					<span class="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 {index === tierIndex ? 'bg-[#7C3FE4] text-white' : index < tierIndex ? 'bg-[#1A8A55] text-white' : 'bg-white border border-[#C8D4E8] text-[#6A84AC]'}">
						{index === tierIndex ? 'CURRENT' : index < tierIndex ? 'PASSED' : 'NEXT'}
					</span>
				</div>
				<h3 class="mt-2 font-serif text-lg text-[#0D1B3E]">{stage.label}</h3>
				<div class="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">{stage.range}</div>
				<p class="mt-2 text-[11px] leading-relaxed text-[#465A7A] font-sans">{stage.description}</p>
				<div class="mt-3 border-t border-[#C8D4E8] pt-2 font-mono text-[10px] text-[#1446A0]">
					{stage.unlock}
				</div>
			</div>
		{/each}
	</div>

	{#if skillList.length > 0}
		<div class="mt-5 flex flex-wrap items-center gap-2 border-t border-[#C8D4E8] pt-4">
			<span class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#6A84AC]">Skills on file</span>
			{#each skillList as skill}
				<span class="border border-[#C8D4E8] bg-[#EFF4FF] px-2 py-0.5 font-mono text-[10px] text-[#1446A0]">{skill}</span>
			{/each}
		</div>
	{/if}
</div>
