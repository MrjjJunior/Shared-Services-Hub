<script>
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import ApiError from '$lib/components/ApiError.svelte';
	import { api } from '$lib/api.js';
	import { currentUser } from '$lib/stores/auth.js';
	import { lowDataMode } from '$lib/stores/preferences.js';
	import { toast } from '$lib/stores/toast.js';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';
	import { onMount } from 'svelte';

	const user = $derived($currentUser);

	let wallet = $state(null);
	let transactions = $state([]);
	let ledgerEntries = $state([]);
	let impactTasks = $state([]);
	let impactMetrics = $state(null);
	let loading = $state(true);
	let errorMessage = $state(null);
	let chainLoading = $state(false);
	let chainResult = $state(null);

	const palette = ['#1446A0', '#1A8A55', '#D4831A', '#7C3FE4', '#6A84AC', '#C42B2B'];

	const fallbackCategoryMix = [
		{ name: 'Digital & E-Commerce Operations', percent: 40, count: 0, color: '#1446A0' },
		{ name: 'Accounting & Financial Reconciliations', percent: 28, count: 0, color: '#1A8A55' },
		{ name: 'Marketing & Content Design', percent: 22, count: 0, color: '#D4831A' },
		{ name: 'Technical & IT Support', percent: 10, count: 0, color: '#7C3FE4' }
	];

	const taskById = $derived.by(() => {
		const map = {};
		impactTasks.forEach((task) => {
			if (task?.id !== undefined) map[String(task.id)] = task;
		});
		return map;
	});

	const debits = $derived(transactions.filter((tx) => tx.type === 'DEBIT'));
	const credits = $derived(transactions.filter((tx) => tx.type === 'CREDIT'));
	// Headline figures prefer the consolidated funder-impact endpoint (verified
	// work only) and fall back to client-side derivations when the endpoint
	// has not been wired yet.
	const wagesDisbursed = $derived(
		impactMetrics?.totalDisbursed ?? debits.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
	);
	const fundingReceived = $derived(
		impactMetrics?.totalPledged ?? credits.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
	);
	const uniqueYouth = $derived(
		impactMetrics?.youthImpacted ?? new Set(ledgerEntries.map((entry) => entry.youthId)).size
	);
	const uniqueTasks = $derived(
		impactMetrics?.tasksDelivered ?? new Set(ledgerEntries.map((entry) => entry.taskId)).size
	);
	const uniqueSmes = $derived(
		new Set(
			ledgerEntries
				.map((entry) => taskById[String(entry.taskId)]?.smeBusinessName)
				.filter(Boolean)
		).size
	);
	const averageRating = $derived.by(() => {
		if (impactMetrics?.averageRating != null && Number(impactMetrics.averageRating) > 0) {
			return String(impactMetrics.averageRating);
		}
		const rated = ledgerEntries.filter((entry) => entry.rating);
		if (rated.length === 0) return '—';
		return (
			rated.reduce((sum, entry) => sum + Number(entry.rating), 0) / rated.length
		).toFixed(1);
	});
	const lastVerified = $derived(
		[...ledgerEntries].sort(
			(a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()
		)[0] || null
	);
	const complianceRate = $derived(ledgerEntries.length > 0 ? 100 : 0);

	const categoryMix = $derived.by(() => {
		if (ledgerEntries.length === 0) return fallbackCategoryMix;
		const counts = {};
		ledgerEntries.forEach((entry) => {
			const category = taskById[String(entry.taskId)]?.category || 'Other SME work';
			counts[category] = (counts[category] || 0) + 1;
		});
		const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.map(([name, count], index) => ({
				name,
				count,
				percent: total > 0 ? Math.round((count / total) * 100) : 0,
				color: palette[index % palette.length]
			}));
	});

	const fundingSeries = $derived.by(() => {
		const months = [];
		const now = new Date();
		for (let index = 5; index >= 0; index -= 1) {
			const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
			months.push({
				key: `${date.getFullYear()}-${date.getMonth()}`,
				label: date.toLocaleString('en-ZA', { month: 'short' }),
				value: 0
			});
		}
		debits.forEach((tx) => {
			const date = new Date(tx.createdAt);
			if (Number.isNaN(date.getTime())) return;
			const match = months.find(
				(month) => month.key === `${date.getFullYear()}-${date.getMonth()}`
			);
			if (match) match.value += Number(tx.amount || 0);
		});
		const max = Math.max(1, ...months.map((month) => month.value));
		return months.map((month) => ({
			...month,
			height: month.value > 0 ? Math.max(6, (month.value / max) * 100) : 2
		}));
	});

	const recentLedger = $derived(
		[...ledgerEntries]
			.sort((a, b) => Number(b.sequence) - Number(a.sequence))
			.slice(0, $lowDataMode ? 3 : 6)
	);

	const recentTransactions = $derived(
		[...transactions]
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.slice(0, $lowDataMode ? 3 : 6)
	);

	async function loadImpact() {
		loading = true;
		errorMessage = null;
		const [walletResult, txResult, ledgerResult, impactResult] = await Promise.allSettled([
			api.wallet.reserve(),
			api.wallet.transactions(),
			api.ledger.entries(),
			api.corporate.impact()
		]);

		if (walletResult.status === 'fulfilled') {
			wallet = walletResult.value;
		} else {
			console.error('Failed to load reserve wallet:', walletResult.reason);
			errorMessage = walletResult.reason?.message || 'Could not load the reserve wallet.';
		}

		if (txResult.status === 'fulfilled') {
			transactions = Array.isArray(txResult.value) ? txResult.value : [];
		} else {
			console.error('Failed to load reserve transactions:', txResult.reason);
		}

		if (ledgerResult.status === 'fulfilled') {
			ledgerEntries = Array.isArray(ledgerResult.value) ? ledgerResult.value : [];
		} else {
			console.error('Failed to load ledger entries:', ledgerResult.reason);
			errorMessage = errorMessage || ledgerResult.reason?.message || 'Could not load ledger impact.';
		}

		if (impactResult.status === 'fulfilled') {
			impactMetrics = impactResult.value || null;
		} else {
			console.error('Failed to load funder impact metrics:', impactResult.reason);
			impactMetrics = null;
		}

		const taskIds = [
			...new Set(ledgerEntries.map((entry) => String(entry.taskId)).filter(Boolean))
		];
		const taskResults = await Promise.all(
			taskIds.map((id) => api.tasks.get(id).catch(() => null))
		);
		impactTasks = taskResults.filter(Boolean);
		loading = false;
	}

	async function verifyChain() {
		chainLoading = true;
		chainResult = null;
		try {
			chainResult = await api.ledger.verify();
			if (chainResult.valid) toast.success('Public ledger chain verified.');
		} catch (err) {
			chainResult = { valid: false, message: err.message || 'Chain verification failed.' };
			toast.error(chainResult.message);
		} finally {
			chainLoading = false;
		}
	}

	function shortCurrency(amount) {
		const value = Number(amount || 0);
		if (value >= 1000) return `R${(value / 1000).toFixed(1)}k`;
		return `R${Math.round(value)}`;
	}

	function csvCell(value) {
		return `"${String(value ?? '').replaceAll('"', '""')}"`;
	}

	function downloadAuditPack() {
		const generatedAt = new Date().toISOString();
		const summary = [
			['Shared Services Hub — B-BBEE impact audit pack'],
			['Generated at', generatedAt],
			['Corporate sponsor', user?.name || 'Corporate partner'],
			['Reserve balance', wallet?.balance ?? 0],
			['Funding received', fundingReceived],
			['Wages disbursed', wagesDisbursed],
			['Verified ledger records', ledgerEntries.length],
			['Youth with verified proof', uniqueYouth],
			['SMEs represented', uniqueSmes],
			['Average verified rating', averageRating],
			[]
		];
		const headers = [
			'Ledger sequence',
			'Experience ID',
			'Task ID',
			'Task title',
			'SME',
			'Category',
			'Youth ID',
			'Rating',
			'Verified at',
			'Evidence reference',
			'Feedback'
		];
		const rows = [...ledgerEntries]
			.sort((a, b) => Number(a.sequence) - Number(b.sequence))
			.map((entry) => {
				const task = taskById[String(entry.taskId)];
				return [
					entry.sequence,
					entry.experienceId,
					entry.taskId,
					task?.title || '',
					task?.smeBusinessName || '',
					task?.category || '',
					entry.youthId,
					entry.rating ?? '',
					entry.verifiedAt || '',
					entry.reference || '',
					entry.feedback || ''
				];
			});
		const csv = [...summary, headers, ...rows]
			.map((row) => row.map(csvCell).join(','))
			.join('\r\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `ssh-bbbee-audit-pack-${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
		toast.success('Audit CSV generated from the current verified ledger.');
	}

	onMount(loadImpact);
</script>

<svelte:head>
	<title>Corporate Sponsor Dashboard | Shared Services Hub</title>
</svelte:head>

<RoleGuard allowedRoles={['CORPORATE', 'ADMIN']}>
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header (Cape Cobalt Surface-Dark #0A1E4A) -->
		<div class="border border-[#C8D4E8] bg-[#0A1E4A] p-8 text-white shadow-md mb-8">
			<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
				<div>
					<div class="inline-block bg-[#1446A0] text-white px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest border border-white/20 mb-2">
						CORPORATE SPONSOR &amp; ESD
					</div>
					<h1 class="font-serif text-3xl sm:text-4xl font-normal text-white">
						Welcome, {user?.name || 'Corporate Partner'}
					</h1>
					<p class="mt-2 text-sm text-[#C8D4E8] max-w-xl font-light font-sans">
						Monitor youth wage disbursements, SME capacity development, and download verified audit reports for B-BBEE scorecard compliance.
					</p>
					<div class="mt-4 inline-flex flex-wrap items-center gap-x-4 gap-y-1 border border-white/20 bg-white/5 px-3 py-2">
						<span class="font-mono text-[9px] font-bold uppercase tracking-widest text-[#6A84AC]">Reserve available</span>
						<span class="font-mono text-lg font-bold text-[#E8B830]">{loading ? '—' : formatCurrency(wallet?.balance)}</span>
						<span class="font-mono text-[9px] uppercase tracking-wider text-[#C8D4E8]">Updated {formatDate(wallet?.updatedAt)}</span>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-2.5">
					<button
						type="button"
						class="border border-white/30 bg-white/5 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-[#0A1E4A] transition-colors"
						onclick={loadImpact}
						disabled={loading}
					>
						{loading ? 'Refreshing...' : 'Refresh impact'}
					</button>
					<button
						type="button"
						class="bg-[#D4831A] text-white px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#b56c0f] transition-colors"
						onclick={downloadAuditPack}
						disabled={loading || ledgerEntries.length === 0}
					>
						Download B-BBEE Audit Pack
					</button>
				</div>
			</div>

			<!-- Metrics Row (Sharp) -->
			<div class="mt-8 pt-6 border-t border-[#1C3565] grid grid-cols-2 sm:grid-cols-4 gap-6">
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Youth Candidates Funded</div>
					<div class="font-mono text-2xl sm:text-3xl font-bold mt-1 text-white">{loading ? '—' : uniqueYouth} Candidates</div>
					<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">With verified ledger proof</div>
				</div>
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Wages Disbursed</div>
					<div class="font-mono text-2xl sm:text-3xl font-bold mt-1 text-[#1A8A55]">{loading ? '—' : formatCurrency(wagesDisbursed)}</div>
					<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">{debits.length} reserve debit(s)</div>
				</div>
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">SMEs Supported</div>
					<div class="font-mono text-2xl sm:text-3xl font-bold mt-1 text-white">{loading ? '—' : uniqueSmes} Businesses</div>
					<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">{uniqueTasks} verified tasks</div>
				</div>
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">B-BBEE Scorecard Points</div>
					<div class="font-mono text-2xl sm:text-3xl font-bold mt-1 text-[#D4831A]">25 / 25 Pts</div>
					<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Target · evidence package included</div>
				</div>
			</div>
		</div>

		<ApiError message={errorMessage} onretry={loadImpact} />

		<!-- Impact Visuals -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div class="lg:col-span-2 space-y-6">
				<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs">
					<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1A8A55]">Live impact</div>
							<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">Cohort Skill Distribution</h3>
							<p class="text-xs text-[#6A84AC] font-sans">Current allocation of verified sponsored work across SME industry sectors.</p>
						</div>
						<span class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">{ledgerEntries.length} verified record(s)</span>
					</div>

					{#if loading}
						<div class="mt-6">
							<StatePanel kind="loading" rows={3} compact />
						</div>
					{:else}
						<div class="mt-6 space-y-4">
							{#each categoryMix as item}
								<div>
									<div class="flex justify-between gap-3 font-mono text-xs text-[#0D1B3E] mb-1">
										<span>{item.name}{#if item.count} <span class="text-[#6A84AC]">({item.count})</span>{/if}</span>
										<span class="font-bold">{item.percent}%</span>
									</div>
									<div class="h-2 bg-[#F8F9FC] border border-[#C8D4E8]">
										<div class="h-full" style={`width: ${item.percent}%; background-color: ${item.color};`}></div>
									</div>
								</div>
							{/each}
						</div>
						{#if ledgerEntries.length === 0}
							<p class="mt-4 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
								Illustrative sector split shown until the first verified record is sealed.
							</p>
						{/if}
					{/if}
				</div>

				<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs">
					<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1446A0]">Funding velocity</div>
							<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">Disbursements over six months</h3>
							<p class="text-xs text-[#6A84AC] font-sans">Payments released from the corporate reserve, grouped by month.</p>
						</div>
						<div class="text-right">
							<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Lifetime funding</div>
							<div class="font-mono text-sm font-bold text-[#1446A0]">{formatCurrency(fundingReceived)}</div>
						</div>
					</div>

					{#if loading}
						<div class="mt-6 h-40 border border-[#C8D4E8] bg-[#F8F9FC] animate-pulse"></div>
					{:else}
						<div class="mt-6 flex h-44 items-end gap-2 border-b border-[#C8D4E8] pb-0">
							{#each fundingSeries as month}
								<div class="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${month.label}: ${formatCurrency(month.value)}`}>
									<span class="font-mono text-[9px] text-[#6A84AC]">{month.value > 0 ? shortCurrency(month.value) : ''}</span>
									<div class="w-full bg-[#1446A0]" style={`height: ${month.height}%`}></div>
									<span class="w-full border-t border-[#C8D4E8] py-1 text-center font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">{month.label}</span>
								</div>
							{/each}
						</div>
						<div class="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
							<span>Average verified rating: <span class="text-[#E8B830]">★ {averageRating}</span></span>
							<span>Last seal: {lastVerified ? formatDate(lastVerified.verifiedAt, true) : 'None yet'}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Compliance -->
			<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs flex flex-col justify-between">
				<div>
					<h3 class="font-serif text-xl text-[#0D1B3E] mb-2">Verified Ledger Compliance</h3>
					<p class="text-xs text-[#6A84AC] font-sans mb-6">Every cent disbursed is backed by an immutable SME sign-off.</p>
					<div class="border border-[#1A8A55] bg-[#EDFBF3] p-4 mb-4">
						<div class="font-mono text-xs font-bold uppercase tracking-wider text-[#1A8A55] mb-1">
							[ {loading ? '—' : complianceRate}% Verification Rate ]
						</div>
						<p class="text-xs text-[#0D1B3E] leading-relaxed font-sans">
							Wages are held in corporate-funded escrow and disbursed strictly upon dual digital verification by both the youth candidate and SME enterprise partner.
						</p>
					</div>

					<div class="space-y-2 border border-[#C8D4E8] bg-[#F8F9FC] p-3">
						<div class="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider">
							<span class="text-[#6A84AC]">Ledger records</span>
							<span class="font-bold text-[#0D1B3E]">{ledgerEntries.length}</span>
						</div>
						<div class="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider">
							<span class="text-[#6A84AC]">Chain status</span>
							<span class="font-bold {chainResult?.valid === false ? 'text-[#C42B2B]' : 'text-[#1A8A55]'}">
								{chainResult ? (chainResult.valid ? 'INTACT' : 'BROKEN') : 'NOT CHECKED'}
							</span>
						</div>
						{#if chainResult}
							<p class="text-[10px] leading-relaxed text-[#465A7A] font-sans">{chainResult.message}</p>
						{/if}
					</div>
				</div>

				<div class="pt-4 mt-4 border-t border-[#C8D4E8] space-y-3">
					<button
						type="button"
						class="w-full border border-[#1446A0] bg-[#EFF4FF] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#1446A0] hover:bg-[#1446A0] hover:text-white transition-colors disabled:opacity-50"
						onclick={verifyChain}
						disabled={chainLoading || loading}
					>
						{chainLoading ? 'Re-walking chain...' : 'Run public chain check'}
					</button>
					<a href="/ledger" class="block font-mono text-xs font-bold uppercase tracking-wider text-[#1446A0] hover:underline">
						Open public ledger →
					</a>
					<a href="/tasks" class="block font-mono text-xs font-bold uppercase tracking-wider text-[#1446A0] hover:underline">
						Inspect Platform Task Directory →
					</a>
				</div>
			</div>
		</div>

		<!-- Recent ledger + transactions -->
		<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div class="lg:col-span-2 border border-[#C8D4E8] bg-white shadow-xs">
				<div class="flex items-center justify-between gap-3 border-b border-[#C8D4E8] p-5">
					<div>
						<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C3FE4]">Recent verified impact</div>
						<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">Proof records</h3>
					</div>
					<a href="/ledger" class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1446A0] hover:underline">View all →</a>
				</div>
				{#if loading}
					<div class="p-5"><StatePanel kind="loading" rows={3} compact /></div>
				{:else if ledgerEntries.length === 0}
					<div class="p-5"><StatePanel kind="empty" title="No verified records yet" message="When an SME signs off the first task, the proof will appear here and in the audit pack." compact /></div>
				{:else}
					<div class="divide-y divide-[#EFF4FF]">
						{#each recentLedger as entry (entry.id)}
							<div class="p-4">
								<div class="flex flex-wrap items-start justify-between gap-2">
									<div>
										<div class="font-mono text-[9px] font-bold uppercase tracking-widest text-[#7C3FE4]">Sequence #{entry.sequence}</div>
										<div class="mt-1 font-sans text-sm font-semibold text-[#0D1B3E]">
											{taskById[String(entry.taskId)]?.title || `Task #${entry.taskId}`}
										</div>
										<div class="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
											{taskById[String(entry.taskId)]?.smeBusinessName || `SME #${entry.taskId}`} · Youth #{entry.youthId} · {formatDate(entry.verifiedAt)}
										</div>
									</div>
									<span class="font-mono text-sm font-bold text-[#E8B830]">★ {entry.rating ?? '—'}</span>
								</div>
								{#if entry.feedback && !$lowDataMode}
									<p class="mt-2 text-xs leading-relaxed text-[#465A7A] font-sans line-clamp-2">{entry.feedback}</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="border border-[#C8D4E8] bg-white shadow-xs">
				<div class="border-b border-[#C8D4E8] p-5">
					<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1446A0]">Reserve movements</div>
					<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">Transactions</h3>
				</div>
				{#if loading}
					<div class="p-5"><StatePanel kind="loading" rows={3} compact /></div>
				{:else if transactions.length === 0}
					<div class="p-5"><StatePanel kind="empty" title="No reserve activity" message="Funding and payout movements will appear here." compact /></div>
				{:else}
					<div class="divide-y divide-[#EFF4FF]">
						{#each recentTransactions as tx (tx.id)}
							<div class="p-4">
								<div class="flex items-start justify-between gap-2">
									<span class="border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider {tx.type === 'CREDIT' ? 'border-[#1A8A55] bg-[#EDFBF3] text-[#1A8A55]' : 'border-[#D4831A] bg-[#FFFBF2] text-[#8A5A10]'}">
										{tx.type}
									</span>
									<span class="font-mono text-xs font-bold {tx.type === 'CREDIT' ? 'text-[#1A8A55]' : 'text-[#0D1B3E]'}">
										{tx.type === 'CREDIT' ? '+' : '−'}{formatCurrency(tx.amount)}
									</span>
								</div>
								<p class="mt-1.5 text-[11px] leading-relaxed text-[#465A7A] font-sans">{tx.reference || 'Reserve movement'}</p>
								<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									{formatDate(tx.createdAt)} · balance {formatCurrency(tx.balanceAfter)}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</RoleGuard>
