<script>
	import StatePanel from '$lib/components/StatePanel.svelte';
	import ApiError from '$lib/components/ApiError.svelte';
	import { api } from '$lib/api.js';
	import { lowDataMode } from '$lib/stores/preferences.js';
	import { formatDate } from '$lib/utils/formatters.js';
	import { onMount } from 'svelte';

	let entries = $state([]);
	let loading = $state(true);
	let errorMessage = $state(null);
	let searchQuery = $state('');
	let verifyingChain = $state(false);
	let chainResult = $state(null);
	let proofs = $state({});

	/**
	 * Confirmed skills for display: the live API seals a comma-joined string
	 * into the ledger entry, demo mode provides an array.
	 */
	function skillList(entry) {
		if (Array.isArray(entry.confirmedSkills)) return entry.confirmedSkills;
		if (typeof entry.confirmedSkills === 'string' && entry.confirmedSkills.trim()) {
			return entry.confirmedSkills
				.split(',')
				.map((skill) => skill.trim())
				.filter(Boolean);
		}
		return [];
	}

	const filteredEntries = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		const matches = query
			? entries.filter((entry) =>
					[
						entry.sequence,
						entry.experienceId,
						entry.taskId,
						entry.youthId,
						entry.feedback,
						entry.reference
					]
						.filter(Boolean)
						.some((value) => String(value).toLowerCase().includes(query))
				)
			: entries;
		return [...matches].sort((a, b) => Number(b.sequence) - Number(a.sequence));
	});

	const visibleEntries = $derived($lowDataMode ? filteredEntries.slice(0, 12) : filteredEntries);

	const uniqueYouth = $derived(new Set(entries.map((entry) => entry.youthId)).size);
	const uniqueTasks = $derived(new Set(entries.map((entry) => entry.taskId)).size);
	const averageRating = $derived.by(() => {
		const rated = entries.filter((entry) => entry.rating);
		if (rated.length === 0) return '—';
		return (rated.reduce((sum, entry) => sum + Number(entry.rating), 0) / rated.length).toFixed(1);
	});
	const latestEntry = $derived(
		[...entries].sort((a, b) => Number(b.sequence) - Number(a.sequence))[0] || null
	);
	const ratingCounts = $derived.by(() => {
		const counts = [0, 0, 0, 0, 0];
		entries.forEach((entry) => {
			const rating = Math.round(Number(entry.rating || 0));
			if (rating >= 1 && rating <= 5) counts[rating - 1] += 1;
		});
		const max = Math.max(1, ...counts);
		return counts.map((count, index) => ({ stars: index + 1, count, width: (count / max) * 100 }));
	});

	async function loadEntries() {
		loading = true;
		errorMessage = null;
		try {
			const res = await api.ledger.entries();
			entries = Array.isArray(res) ? res : [];
		} catch (err) {
			console.error('Failed to load public ledger:', err);
			errorMessage = err.message || 'The public ledger could not be loaded.';
		} finally {
			loading = false;
		}
	}

	async function verifyChain() {
		verifyingChain = true;
		chainResult = null;
		try {
			chainResult = await api.ledger.verify();
		} catch (err) {
			chainResult = { valid: false, message: err.message || 'Verification failed.' };
		} finally {
			verifyingChain = false;
		}
	}

	async function verifyEntry(entry) {
		proofs = { ...proofs, [entry.experienceId]: { loading: true } };
		try {
			const result = await api.ledger.verifyExperience(entry.experienceId);
			proofs = { ...proofs, [entry.experienceId]: result };
		} catch (err) {
			proofs = {
				...proofs,
				[entry.experienceId]: { valid: false, message: err.message || 'Could not verify this entry.' }
			};
		}
	}

	onMount(loadEntries);
</script>

<svelte:head>
	<title>Public Experience Ledger | Shared Services Hub</title>
	<meta
		name="description"
		content="Inspect every verified youth work experience sealed in the Shared Services Hub public hash-chained ledger. No login required."
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="border border-[#C8D4E8] bg-[#0A1E4A] p-8 text-white shadow-md">
		<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
			<div>
				<div class="inline-flex items-center gap-2 border border-white/20 bg-[#7C3FE4] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest">
					<span class="h-1.5 w-1.5 bg-white"></span>
					Public · No login required
				</div>
				<h1 class="mt-3 font-serif text-3xl sm:text-4xl font-normal text-white">
					The public Experience Ledger
				</h1>
				<p class="mt-2 max-w-2xl text-sm font-light leading-relaxed text-[#C8D4E8] font-sans">
					Every verified task is sealed into a SHA-256 hash chain. Each record links back to the one before it, so any edit to history would be immediately visible. Verify a single proof or re-walk the full chain.
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					disabled={verifyingChain || entries.length === 0}
					class="bg-white px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0A1E4A] hover:bg-[#EFF4FF] disabled:opacity-50 transition-colors"
					onclick={verifyChain}
				>
					{verifyingChain ? 'Re-walking chain...' : 'Verify full chain'}
				</button>
				<a href="/demo" class="border border-white/30 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-[#0A1E4A] transition-colors">
					Try the demo
				</a>
			</div>
		</div>

		<div class="mt-8 grid grid-cols-2 gap-5 border-t border-[#1C3565] pt-6 sm:grid-cols-4">
			<div>
				<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Sealed records</div>
				<div class="mt-1 font-mono text-2xl font-bold text-white">{loading ? '—' : entries.length}</div>
			</div>
			<div>
				<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Youth with proof</div>
				<div class="mt-1 font-mono text-2xl font-bold text-[#D4831A]">{loading ? '—' : uniqueYouth}</div>
			</div>
			<div>
				<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Tasks verified</div>
				<div class="mt-1 font-mono text-2xl font-bold text-[#7C3FE4]">{loading ? '—' : uniqueTasks}</div>
			</div>
			<div>
				<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Average rating</div>
				<div class="mt-1 font-mono text-2xl font-bold text-[#E8B830]">★ {loading ? '—' : averageRating}</div>
			</div>
		</div>
	</div>

	<ApiError message={errorMessage} onretry={loadEntries} />

	<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2">
			<div class="flex flex-col gap-3 border-b border-[#C8D4E8] pb-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 class="font-serif text-2xl text-[#0D1B3E]">Verified proof records</h2>
					<p class="mt-0.5 text-xs text-[#6A84AC] font-sans">
						Newest first. Search by sequence, experience, task, youth or reference.
					</p>
				</div>
				<div class="w-full sm:w-72">
					<label for="ledgerSearch" class="sr-only">Search ledger</label>
					<input
						id="ledgerSearch"
						type="search"
						bind:value={searchQuery}
						placeholder="Search the ledger..."
						class="cape-input block w-full px-3.5 py-2.5 text-sm"
					/>
				</div>
			</div>

			{#if loading}
				<div class="mt-4">
					<StatePanel kind="loading" rows={5} />
				</div>
			{:else if entries.length === 0}
				<div class="mt-4">
					<StatePanel
						kind="empty"
						title="No verified records yet"
						message="When an SME verifies a completed task, the proof will appear here automatically."
						actionLabel="Browse open tasks"
						onaction={() => (window.location.href = '/tasks')}
					/>
				</div>
			{:else if filteredEntries.length === 0}
				<div class="mt-4">
					<StatePanel
						kind="empty"
						title="No matching records"
						message={`Nothing in the ledger matches “${searchQuery}”. Try an ID or a reference keyword.`}
						actionLabel="Clear search"
						onaction={() => (searchQuery = '')}
					/>
				</div>
			{:else}
				<div class="mt-4 hidden overflow-x-auto border border-[#C8D4E8] bg-white md:block">
					<table class="min-w-full divide-y divide-[#C8D4E8]">
						<thead class="bg-[#F8F9FC]">
							<tr>
								<th class="px-4 py-3 text-left font-mono text-[9px] font-bold uppercase tracking-widest text-[#6A84AC]">Seq</th>
								<th class="px-4 py-3 text-left font-mono text-[9px] font-bold uppercase tracking-widest text-[#6A84AC]">Proof</th>
								<th class="px-4 py-3 text-left font-mono text-[9px] font-bold uppercase tracking-widest text-[#6A84AC]">Rating</th>
								<th class="px-4 py-3 text-left font-mono text-[9px] font-bold uppercase tracking-widest text-[#6A84AC]">Sealed</th>
								<th class="px-4 py-3 text-left font-mono text-[9px] font-bold uppercase tracking-widest text-[#6A84AC]">Hash</th>
								<th class="px-4 py-3 text-right font-mono text-[9px] font-bold uppercase tracking-widest text-[#6A84AC]">Verify</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[#EFF4FF]">
							{#each visibleEntries as entry (entry.id)}
								{@const proof = proofs[entry.experienceId]}
								<tr class="hover:bg-[#F8F9FC]">
									<td class="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-[#7C3FE4]">#{entry.sequence}</td>
									<td class="px-4 py-4">
										<div class="font-sans text-sm font-semibold text-[#0D1B3E]">Experience #{entry.experienceId}</div>
										<div class="mt-0.5 font-mono text-[10px] text-[#6A84AC]">Task #{entry.taskId} · Youth #{entry.youthId}</div>
										{#if entry.feedback}
											<p class="mt-1 max-w-md text-[11px] leading-relaxed text-[#465A7A] line-clamp-2">{entry.feedback}</p>
										{:else}
											<span class="mt-1 inline-block border border-[#C8D4E8] bg-[#F8F9FC] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Protected · visible on request</span>
										{/if}
										{#if skillList(entry).length > 0}
											<div class="mt-1.5 flex flex-wrap gap-1">
												{#each skillList(entry) as skill}
													<span class="border border-[#1A8A55]/40 bg-[#EDFBF3] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#1A8A55]">{skill}</span>
												{/each}
											</div>
										{/if}
										{#if entry.reference}
											<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Ref: {entry.reference}</div>
										{/if}
										{#if proof}
											<div class="mt-1 font-mono text-[9px] {proof.loading ? 'text-[#6A84AC]' : proof.valid ? 'text-[#1A8A55]' : 'text-[#C42B2B]'}">
												{proof.loading ? 'Checking proof...' : proof.message}
											</div>
										{/if}
									</td>
									<td class="whitespace-nowrap px-4 py-4 font-mono text-sm font-bold text-[#E8B830]">★ {entry.rating ?? '—'}</td>
									<td class="whitespace-nowrap px-4 py-4 font-mono text-[11px] text-[#465A7A]">{formatDate(entry.verifiedAt)}</td>
									<td class="px-4 py-4">
										<code class="font-mono text-[10px] text-[#465A7A]" title={entry.hash}>{entry.hash ? `${entry.hash.slice(0, 14)}…` : '—'}</code>
									</td>
									<td class="whitespace-nowrap px-4 py-4 text-right">
										<button
											type="button"
											class="border border-[#C8D4E8] px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1446A0] hover:border-[#1446A0] hover:bg-[#EFF4FF] transition-colors"
											onclick={() => verifyEntry(entry)}
										>
											Verify
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Mobile ledger cards -->
				<div class="mt-4 space-y-3 md:hidden">
					{#each visibleEntries as entry (entry.id)}
						{@const proof = proofs[entry.experienceId]}
						<div class="border border-[#C8D4E8] bg-white p-5">
							<div class="flex items-start justify-between gap-3">
								<div>
									<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C3FE4]">Sequence #{entry.sequence}</div>
									<h3 class="mt-1 font-serif text-lg text-[#0D1B3E]">Experience #{entry.experienceId}</h3>
								</div>
								<span class="font-mono text-sm font-bold text-[#E8B830]">★ {entry.rating ?? '—'}</span>
							</div>
							<div class="mt-1 font-mono text-[10px] text-[#6A84AC]">Task #{entry.taskId} · Youth #{entry.youthId} · {formatDate(entry.verifiedAt)}</div>
							{#if entry.feedback}
								<p class="mt-2 text-xs leading-relaxed text-[#465A7A]">{entry.feedback}</p>
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
							{#if entry.reference}
								<div class="mt-2 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Ref: {entry.reference}</div>
							{/if}
							<code class="mt-3 block truncate font-mono text-[9px] text-[#6A84AC]">{entry.hash}</code>
							{#if proof}
								<div class="mt-2 font-mono text-[9px] {proof.loading ? 'text-[#6A84AC]' : proof.valid ? 'text-[#1A8A55]' : 'text-[#C42B2B]'}">
									{proof.loading ? 'Checking proof...' : proof.message}
								</div>
							{/if}
							<button
								type="button"
								class="mt-3 w-full border border-[#C8D4E8] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1446A0] hover:bg-[#EFF4FF] transition-colors"
								onclick={() => verifyEntry(entry)}
							>
								Verify this proof
							</button>
						</div>
					{/each}
				</div>

				{#if $lowDataMode && filteredEntries.length > visibleEntries.length}
					<p class="mt-3 font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">
						Low-data mode · showing latest {visibleEntries.length} of {filteredEntries.length}. Turn low-data off for the full ledger.
					</p>
				{/if}
			{/if}
		</div>

		<aside class="space-y-6">
			<div class="border border-[#C8D4E8] bg-white p-5 shadow-xs">
				<div class="flex items-start justify-between gap-3">
					<div>
						<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1A8A55]">Chain integrity</div>
						<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">SHA-256 verified</h3>
					</div>
					<span class="border border-[#1A8A55] bg-[#EDFBF3] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1A8A55]">
						{chainResult ? (chainResult.valid ? 'INTACT' : 'BROKEN') : 'READY'}
					</span>
				</div>
				<p class="mt-2 text-xs leading-relaxed text-[#465A7A] font-sans">
					Each entry stores its previous hash. Re-walking the chain proves that no record has been changed or removed.
				</p>
				{#if chainResult}
					<div class="mt-3 border p-3 {chainResult.valid ? 'border-[#1A8A55] bg-[#EDFBF3]' : 'border-[#C42B2B] bg-[#FFF5F5]'}">
						<div class="font-mono text-[9px] font-bold uppercase tracking-wider {chainResult.valid ? 'text-[#1A8A55]' : 'text-[#C42B2B]'}">
							{chainResult.valid ? 'CHAIN INTACT' : 'CHAIN BROKEN'}
						</div>
						<p class="mt-1 text-[11px] leading-relaxed text-[#465A7A]">{chainResult.message}</p>
						<div class="mt-1 font-mono text-[9px] text-[#6A84AC]">Checked {chainResult.checkedEntries} entry/entries</div>
					</div>
				{/if}
				<button
					type="button"
					disabled={verifyingChain || entries.length === 0}
					class="mt-4 w-full cape-btn-primary px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider disabled:opacity-50"
					onclick={verifyChain}
				>
					{verifyingChain ? 'Verifying...' : 'Verify full chain'}
				</button>
			</div>

			<div class="border border-[#C8D4E8] bg-white p-5 shadow-xs">
				<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#6A84AC]">Rating distribution</div>
				<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">SME sign-offs</h3>
				<div class="mt-4 space-y-2">
					{#each [...ratingCounts].reverse() as item}
						<div class="flex items-center gap-2">
							<span class="w-8 font-mono text-[10px] text-[#6A84AC]">★ {item.stars}</span>
							<div class="h-2 flex-1 border border-[#C8D4E8] bg-[#F8F9FC]">
								<div class="h-full bg-[#E8B830]" style={`width: ${item.width}%`}></div>
							</div>
							<span class="w-5 text-right font-mono text-[10px] text-[#6A84AC]">{item.count}</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="border border-[#C8D4E8] bg-[#0A1E4A] p-5 text-white shadow-xs">
				<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#D4831A]">Latest seal</div>
				{#if latestEntry}
					<div class="mt-2 font-serif text-2xl text-white">#{latestEntry.sequence}</div>
					<div class="mt-1 font-mono text-[10px] text-[#C8D4E8]">Experience {latestEntry.experienceId} · {formatDate(latestEntry.verifiedAt, true)}</div>
					<div class="mt-3 border-t border-[#1C3565] pt-3 font-mono text-[9px] leading-relaxed text-[#9FB4D8] break-all">
						{latestEntry.hash}
					</div>
				{:else}
					<div class="mt-2 text-sm text-[#C8D4E8]">No records sealed yet.</div>
				{/if}
			</div>
		</aside>
	</div>
</div>
