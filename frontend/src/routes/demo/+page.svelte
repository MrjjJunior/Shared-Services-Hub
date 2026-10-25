<script>
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.js';
	import { demoMode, lowDataMode, toggleLowDataMode } from '$lib/stores/preferences.js';
	import { resetMockDb } from '$lib/api.js';
	import { toast } from '$lib/stores/toast.js';

	const roles = [
		{
			id: 'YOUTH',
			label: 'Youth Candidate',
			name: 'Thabo Mokoena',
			email: 'demo.youth@ssh.local',
			dashboard: '/dashboard/youth',
			accent: '#1446A0',
			kicker: 'TIER 2 · 3 VERIFIED',
			description: 'See a matched task feed, reserved work, tier progress, earnings, career path and a complete experience ledger.',
			highlights: ['Why this match', 'Apply + withdraw', 'Career path']
		},
		{
			id: 'SME',
			label: 'SME Partner',
			name: 'Thandi Nkosi',
			businessName: 'Kasi Craftworks Co.',
			email: 'demo.sme@ssh.local',
			dashboard: '/dashboard/sme',
			accent: '#D4831A',
			kicker: '6 TASKS · RANKED APPLICANTS',
			description: 'Post from a template, choose a preferred tier, review each applicant profile and assign, then verify work with rating, feedback and reference.',
			highlights: ['Task templates', 'Ranked applicants', 'Profile review & assign', 'Verification form']
		},
		{
			id: 'CORPORATE',
			label: 'Funder / Corporate',
			name: 'Standard Bank Foundation',
			email: 'demo.funder@ssh.local',
			dashboard: '/dashboard/corporate',
			accent: '#1A8A55',
			kicker: 'R 100,000 RESERVE',
			description: 'Track live reserve balance, wages disbursed, verified ledger compliance and funding velocity, then export an audit pack.',
			highlights: ['Live charts', 'Impact ledger', 'Audit CSV']
		},
		{
			id: 'ADMIN',
			label: 'Platform Admin',
			name: 'Platform Admin',
			email: 'demo.admin@ssh.local',
			dashboard: '/dashboard/admin',
			accent: '#7C3FE4',
			kicker: 'PAYOUT QUEUE · AGENT FEED',
			description: 'Release pending payouts, inspect the agent activity feed and jump into the youth or SME view for support.',
			highlights: ['Payout queue', 'Agent activity', 'Role previews']
		}
	];

	let resetting = $state(false);

	function enterDemo(role) {
		demoMode.set(true);
		auth.login(
			{
				token: `demo-token-${role.id.toLowerCase()}-${Date.now()}`,
				user: {
					id: role.id === 'YOUTH' ? 1 : role.id === 'SME' ? 101 : role.id === 'CORPORATE' ? 201 : 301,
					name: role.name,
					businessName: role.businessName || null,
					email: role.email,
					role: role.id,
					isActive: true
				}
			},
			false
		);
		toast.info(`Demo mode: signed in as ${role.label}.`);
		goto(role.dashboard);
	}

	function resetDemoData() {
		resetting = true;
		resetMockDb();
		resetting = false;
		toast.success('Sample data reset to the original story.');
	}
</script>

<svelte:head>
	<title>Interactive Demo | Shared Services Hub</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
	<div class="border border-[#C8D4E8] bg-[#0A1E4A] p-8 text-white shadow-md">
		<div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
			<div>
				<div class="inline-block border border-white/20 bg-[#D4831A] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
					Guided Demo · No Backend Required
				</div>
				<h1 class="mt-3 font-serif text-3xl sm:text-4xl font-normal text-white">
					Walk through the whole hub.
				</h1>
				<p class="mt-2 max-w-2xl text-sm font-light leading-relaxed text-[#C8D4E8] font-sans">
					Choose a role to enter the live interface with a complete sample story: one youth, one SME, a funded reserve, a verified ledger and a pending payout queue. Everything is stored in your browser and can be reset.
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					class="border border-white/30 bg-white/5 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-[#0A1E4A] transition-colors"
					onclick={toggleLowDataMode}
					aria-pressed={$lowDataMode}
				>
					Low-data: {$lowDataMode ? 'On' : 'Off'}
				</button>
				<button
					type="button"
					disabled={resetting}
					class="bg-[#D4831A] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#b56c0f] disabled:opacity-50 transition-colors"
					onclick={resetDemoData}
				>
					{resetting ? 'Resetting...' : 'Reset sample data'}
				</button>
				<a
					href="/ledger"
					class="border border-white/30 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-[#0A1E4A] transition-colors"
				>
					Public ledger
				</a>
			</div>
		</div>
	</div>

	<div class="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
		{#each roles as role}
			<div class="flex flex-col justify-between border border-[#C8D4E8] bg-white p-6 shadow-xs border-t-4" style={`border-top-color: ${role.accent}`}>
				<div>
					<div class="flex items-start justify-between gap-3">
						<div>
							<div class="font-mono text-[10px] font-bold uppercase tracking-widest" style={`color: ${role.accent}`}>
								{role.kicker}
							</div>
							<h2 class="mt-2 font-serif text-2xl text-[#0D1B3E]">{role.label}</h2>
						</div>
						<span class="border border-[#C8D4E8] bg-[#F8F9FC] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">
							{role.id}
						</span>
					</div>
					<p class="mt-3 text-sm leading-relaxed text-[#465A7A] font-sans">{role.description}</p>
					<ul class="mt-4 flex flex-wrap gap-2">
						{#each role.highlights as highlight}
							<li class="border border-[#C8D4E8] bg-[#F8F9FC] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#465A7A]">
								{highlight}
							</li>
						{/each}
					</ul>
				</div>
				<button
					type="button"
					class="mt-6 w-full px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-white transition-colors"
					style={`background-color: ${role.accent}; border: 1px solid ${role.accent};`}
					onclick={() => enterDemo(role)}
				>
					Enter as {role.label} →
				</button>
			</div>
		{/each}
	</div>

	<div class="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
		<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs">
			<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1446A0]">What is seeded</div>
			<ul class="mt-3 space-y-2 text-xs leading-relaxed text-[#465A7A] font-sans">
				<li class="flex gap-2"><span class="font-mono text-[#1A8A55]">✓</span> A Tier 2 youth with three verified experiences, active work, one reserved application and three payments.</li>
				<li class="flex gap-2"><span class="font-mono text-[#1A8A55]">✓</span> An SME with open, in-progress, completed and verified tasks plus ranked applicants.</li>
				<li class="flex gap-2"><span class="font-mono text-[#1A8A55]">✓</span> A R100,000 corporate reserve with funding and payout transactions.</li>
				<li class="flex gap-2"><span class="font-mono text-[#1A8A55]">✓</span> A pending payout and a public hash-chained ledger.</li>
			</ul>
		</div>

		<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs">
			<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#D4831A]">Low-data PWA mode</div>
			<p class="mt-3 text-xs leading-relaxed text-[#465A7A] font-sans">
				Low-data mode trims long lists, hides decorative detail, disables animation and keeps the same information hierarchy. Toggle it here, in the top utility strip, in the footer, or from the mobile menu. The app also ships with a manifest and offline shell.
			</p>
		</div>

		<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs">
			<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C3FE4]">Real or sample?</div>
			<p class="mt-3 text-xs leading-relaxed text-[#465A7A] font-sans">
				Demo mode intercepts every API call in the browser, so your real database is never touched. Exit demo from the orange banner to return to the live backend. The sample data lives under a separate local-storage key.
			</p>
		</div>
	</div>
</div>
