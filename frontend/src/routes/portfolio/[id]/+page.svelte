<script>
	import StatePanel from '$lib/components/StatePanel.svelte';
	import ApiError from '$lib/components/ApiError.svelte';
	import { api } from '$lib/api.js';
	import { formatDate } from '$lib/utils/formatters.js';
	import { onMount } from 'svelte';

	// Route id param (rune mode props).
	let { id } = $props();

	let profile = $state(null);
	let verifiedEntries = $state([]);
	let loading = $state(true);
	let errorMessage = $state(null);

	// The demo roster that appears on the sign-in quick switcher and in the
	// SME applicant review. Portfolio pages exist for these four so every
	// portfolio link in the demo surfaces opens something real.
	const DEMO_PORTFOLIOS = {
		1: {
			id: 1,
			name: 'Thabo Mokoena',
			email: 'thabo@example.com',
			headline: 'Bookkeeping & operations support',
			location: 'Cape Town, Western Cape',
			availability: 'Weekdays after 2pm · weekends',
			accent: '#1446A0',
			skills: ['Excel', 'Bookkeeping', 'Data Entry', 'Customer Support'],
			summary:
				'Final-year accounting student turning messy spreadsheets into clear decisions. Comfortable with short operational sprints: catalogue cleanups, reconciliations, and support shifts that need to hit a deadline.',
			links: [
				'Shopfront backend audit — before/after shelf-count sheets (showcase)',
				'Order-book to simple P&L — worked example workbook (showcase)',
				'Customer support turnaround — annotated ticket log (showcase)'
			],
			works: [
				{
					title: '150-product catalogue digitized',
					blurb: 'Took a Kasi craft shop from a shoebox of notes to a clean online catalogue — tags, descriptions and photos.',
					meta: 'Digital operations · 3 sprints'
				},
				{
					title: 'Six months of order book to P&L',
					blurb: 'Rebuilt a spaza shop’s delivery order log into an Excel income statement the owner actually reads. Weekly close.',
					meta: 'Bookkeeping · 2 weeks'
				},
				{
					title: 'Saturday support shift',
					blurb: 'Covered WhatsApp support for a small retailer — 31 tickets, all answered same day.',
					meta: 'Support · ongoing'
				}
			]
		},
		2: {
			id: 2,
			name: 'Naledi Khumalo',
			email: 'naledi.example@ssh.org.za',
			headline: 'Content & brand storytelling',
			location: 'Johannesburg, Gauteng',
			availability: 'Weekdays 9am to 5pm',
			accent: '#D4831A',
			skills: ['Content writing', 'Visual design', 'Social media scheduling', 'Brand storytelling'],
			summary:
				'Marketing graduate with a strong eye for clean visuals and product storytelling. I have run content calendars for two local brands and enjoy turning a brief into posts that feel on-brand.',
			links: [
				'4-week launch campaign — post grid & captions (showcase)',
				'Brand voice one-pager — do’s and don’ts (showcase)',
				'Relaunch teaser tiles — 12-piece Canva kit (showcase)'
			],
			works: [
				{
					title: '4-week campaign content calendar',
					blurb: 'Turned a campaign brief into a week-by-week calendar of 16 posts, captions and creative directions.',
					meta: 'Campaign ops · 4 weeks'
				},
				{
					title: 'Brand voice one-pager',
					blurb: 'Wrote the do’s and don’ts that keep a two-person team sounding like one brand.',
					meta: 'Writing · 1 week'
				},
				{
					title: 'Launch teaser visuals',
					blurb: 'Canva kits of 12 teaser tiles for a food brand relaunch, in the brand palette.',
					meta: 'Design · 1 sprint'
				}
			]
		},
		3: {
			id: 3,
			name: 'Sibusiso Mathonsi',
			email: 'sibusiso.example@ssh.org.za',
			headline: 'Field operations & data capture',
			location: 'Soweto, Gauteng',
			availability: 'Weekdays · short notice',
			accent: '#1A8A55',
			skills: ['Data capture', 'Stock counting', 'Attention to detail', 'Teamwork'],
			summary:
				'Matric graduate building a track record in accurate data capture and stock counts. I work quickly through repetitive lists and double-check my own work.',
			links: [
				'Front-of-shop re-count — stocktake correction list (showcase)',
				'Delivery check-in sheet — bakkie handover process (showcase)',
				'Invoice capture spot-check — 210 invoices, Sage (showcase)'
			],
			works: [
				{
					title: 'Store stock-take re-count',
					blurb: 'Second-pass count of a mini-market’s front-of-shop: found 97 stock mismatches and corrected the master list.',
					meta: 'Stocktaking · 3 days'
				},
				{
					title: 'Delivery check-in sheet',
					blurb: 'Built the check-in list now used on both of a supplier’s delivery bakkies.',
					meta: 'Ops tooling · 1 week'
				},
				{
					title: 'Invoice capture sprint',
					blurb: 'Captured 210 invoices into Sage with a 100% spot-check accuracy pass.',
					meta: 'Data capture · 2 weeks'
				}
			]
		},
		4: {
			id: 4,
			name: 'Lerato Maseko',
			email: 'lerato.example@ssh.org.za',
			headline: 'Brand & document systems',
			location: 'Durban, KwaZulu-Natal',
			availability: 'Weekdays · remote',
			accent: '#7C3FE4',
			skills: ['Figma', 'Canva', 'Layout design', 'Facilitation'],
			summary:
				'Visual designer focused on simple, usable brand and document systems. I work in Figma and Canva and like leaving teams with templates they can maintain.',
			links: [
				'Market-day stall layouts — storyboard plan (showcase)',
				'Signage & print templates — signage board (showcase)',
				'Microsite concept — desktop layout mock (showcase)'
			],
			works: [
				{
					title: 'Quote-approval template set',
					blurb: 'Invoice, quote and delivery-note templates a two-person plumbing firm now maintains themselves.',
					meta: 'Templates · 2 sprints'
				},
				{
					title: 'SME price-list redesign',
					blurb: 'Re-laid-out a 9-page price list into 2 printable pages customers actually read.',
					meta: 'Print design · 1 week'
				},
				{
					title: 'Till handover checklist',
					blurb: 'Poster checklists used at registers — till-handover questions down to zero.',
					meta: 'Process design · 1 sprint'
				}
			]
		}
	};

	function skillList(entry) {
		if (Array.isArray(entry.confirmedSkills)) return entry.confirmedSkills;
		if (typeof entry.confirmedSkills === 'string' && entry.confirmedSkills.trim()) {
			return entry.confirmedSkills
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}
		return [];
	}

	onMount(async () => {
		profile = DEMO_PORTFOLIOS[(id || '').toString()] || null;
		if (!profile) {
			loading = false;
			return;
		}
		try {
			const entries = await api.ledger.entries();
			verifiedEntries = (Array.isArray(entries) ? entries : [])
				.filter((entry) => Number(entry.youthId) === Number(id))
				.sort((a, b) => Number(a.sequence) - Number(b.sequence));
		} catch (err) {
			// The portfolio still renders; the verified-proof strip is a bonus.
			errorMessage = err?.message || null;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{profile ? `${profile.name} · Portfolio` : 'Portfolio'} | Shared Services Hub</title>
</svelte:head>

<div class="min-h-[70vh] bg-[#F8F9FC] py-10">
	<div class="mx-auto max-w-4xl px-4 sm:px-6">
		<ApiError message={errorMessage} ondismiss={() => (errorMessage = null)} />

		{#if loading}
			<StatePanel
				kind="loading"
				title="Loading portfolio…"
				message="Fetching the candidate's verified proof of work."
				compact
			/>
		{:else if !profile}
			<StatePanel
				kind="error"
				title="Portfolio not available"
				message="Demo portfolios exist for the showcase candidates on the sign-in screen (candidates 1–4). Registered youth share portfolio links on their own profile."
			/>
		{:else}
			<!-- Header -->
			<div class="border border-[#C8D4E8] bg-white p-6 sm:p-8 shadow-xs">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<div class="flex items-center gap-2">
							<span class="h-2 w-2" style="background: {profile.accent}"></span>
							<span class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#6A84AC]">
								SSH Demo Candidate · #{profile.id}
							</span>
						</div>
						<h1 class="mt-2 font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#0D1B3E]">
							{profile.name}
						</h1>
						<p class="mt-1 font-serif text-lg" style="color: {profile.accent}">{profile.headline}</p>
					</div>
					<div class="grid grid-cols-2 gap-2 w-full max-w-xs">
						<div class="border border-[#C8D4E8] p-2.5">
							<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Location</div>
							<div class="mt-0.5 text-[11px] text-[#0D1B3E]">{profile.location}</div>
						</div>
						<div class="border border-[#C8D4E8] p-2.5">
							<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Availability</div>
							<div class="mt-0.5 text-[11px] text-[#0D1B3E]">{profile.availability}</div>
						</div>
					</div>
				</div>

				<div class="mt-4 flex flex-wrap gap-1.5">
					{#each profile.skills as skill}
						<span class="border border-[#C8D4E8] bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#465A7A]">
							{skill}
						</span>
					{/each}
				</div>

				<p class="mt-5 max-w-2xl font-sans text-sm leading-relaxed text-[#465A7A]">{profile.summary}</p>
			</div>

			<!-- Verified proof from the SSH ledger -->
			<div class="mt-8">
				<div class="mb-3 flex items-end justify-between">
					<h2 class="font-serif text-2xl text-[#0D1B3E]">Verified on the SSH ledger</h2>
					<span class="font-mono text-[10px] uppercase tracking-widest text-[#6A84AC]">
						{verifiedEntries.length ? `${verifiedEntries.length} sealed record(s)` : 'pending'}
					</span>
				</div>
				{#if verifiedEntries.length === 0}
					<StatePanel
						kind="empty"
						title="No verified work yet"
						message="When a task assigned to this candidate is completed and verified, its ledger proof appears here with the SME rating and confirmed skills."
						compact
					/>
				{:else}
					<div class="space-y-3">
						{#each verifiedEntries as entry (entry.experienceId)}
							<div class="border border-[#C8D4E8] bg-white p-5 shadow-xs">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C3FE4]">
										Ledger entry #{entry.sequence}
									</div>
									<span class="font-mono text-sm font-bold text-[#E8B830]">★ {entry.rating ?? '—'}</span>
								</div>
								<div class="mt-1 font-mono text-[10px] text-[#6A84AC]">
									Task #{entry.taskId} · {formatDate(entry.verifiedAt)}
								</div>
								{#if entry.feedback}
									<blockquote class="mt-2 border-l-2 bg-[#F8F9FC] py-2 pl-3 pr-2 font-sans text-xs leading-relaxed text-[#465A7A]" style="border-left-color: {profile.accent}">
										“{entry.feedback}”
									</blockquote>
								{:else}
									<span class="mt-2 inline-block border border-[#C8D4E8] bg-[#F8F9FC] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Protected · visible on request</span>
								{/if}
								{#if skillList(entry).length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each skillList(entry) as skill}
											<span class="border border-[#1A8A55]/40 bg-[#EDFBF3] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#1A8A55]">{skill}</span>
										{/each}
									</div>
								{/if}
								<div class="mt-2 truncate font-mono text-[9px] text-[#6A84AC]" title={entry.hash}>hash {entry.hash}</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Sample work -->
			<div class="mt-8">
				<h2 class="mb-3 font-serif text-2xl text-[#0D1B3E]">Sample work</h2>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{#each profile.works as work}
						<div class="border border-[#C8D4E8] bg-white p-5 shadow-xs">
							<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">{work.meta}</div>
							<h3 class="mt-1.5 font-serif text-lg text-[#0D1B3E]">{work.title}</h3>
							<p class="mt-1.5 font-sans text-xs leading-relaxed text-[#465A7A]">{work.blurb}</p>
						</div>
					{/each}
				</div>
			</div>

			<!-- Reference links + contact -->
			<div class="mt-8 border border-[#C8D4E8] bg-white p-6 sm:p-8 shadow-xs">
				<h2 class="font-serif text-xl text-[#0D1B3E]">Reference links</h2>
				<ul class="mt-2 space-y-1.5">
					{#each profile.links as link}
						<li class="font-sans text-xs text-[#465A7A]">· {link}</li>
					{/each}
				</ul>
				<p class="mt-3 font-sans text-[11px] text-[#6A84AC]">
					Reference links are fictional showcase placeholders that ship with this demo portfolio.
				</p>
				<div class="mt-5 flex flex-wrap gap-2">
					<a href="/tasks" class="cape-btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider">
						Back to open tasks
					</a>
					<a href="/login" class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider">
						Sign in
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>
