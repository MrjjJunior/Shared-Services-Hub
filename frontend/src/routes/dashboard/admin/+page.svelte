<script>
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import ApiError from '$lib/components/ApiError.svelte';
	import ActivityFeed from '$lib/components/ActivityFeed.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { api } from '$lib/api.js';
	import { lowDataMode } from '$lib/stores/preferences.js';
	import { toast } from '$lib/stores/toast.js';
	import { formatCurrency, formatDate } from '$lib/utils/formatters.js';
	import { onMount } from 'svelte';

	let payments = $state([]);
	let ledgerEntries = $state([]);
	let tasks = $state([]);
	let wallet = $state(null);
	let transactions = $state([]);
	let youthRoster = $state([]);
	let loading = $state(true);
	let errorMessage = $state(null);
	let paymentFilter = $state('PENDING');
	let markingYouthId = $state(null);

	let payoutModalOpen = $state(false);
	let selectedPaymentToPayout = $state(null);
	let payingOut = $state(false);

	const pendingPayments = $derived(payments.filter((payment) => payment.status === 'PENDING'));
	const paidPayments = $derived(payments.filter((payment) => payment.status === 'PAID'));
	const pendingTotal = $derived(
		pendingPayments.reduce((sum, payment) => sum + Number(payment.youthAmount || 0), 0)
	);
	const paidTotal = $derived(
		paidPayments.reduce((sum, payment) => sum + Number(payment.youthAmount || 0), 0)
	);
	const filteredPayments = $derived.by(() => {
		if (paymentFilter === 'ALL') return payments;
		return payments.filter((payment) => payment.status === paymentFilter);
	});

	const ledgerByTask = $derived.by(() => {
		const map = {};
		ledgerEntries.forEach((entry) => {
			map[String(entry.taskId)] = entry;
		});
		return map;
	});

	const lastSeal = $derived(
		[...ledgerEntries].sort(
			(a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()
		)[0] || null
	);

	const activityItems = $derived.by(() => {
		const items = [];

		ledgerEntries.forEach((entry) => {
			items.push({
				id: `ledger-${entry.id}`,
				agent: 'LEDGER',
				action: `Sealed proof #${entry.sequence}`,
				detail: `Task #${entry.taskId} · Youth #${entry.youthId} · ★ ${entry.rating ?? '—'}`,
				time: entry.verifiedAt,
				tone: 'ledger'
			});
		});

		payments.forEach((payment) => {
			items.push({
				id: `payment-${payment.id}`,
				agent: 'PAYOUT',
				action:
					payment.status === 'PAID'
						? `Released ${formatCurrency(payment.youthAmount)}`
						: `Queued ${formatCurrency(payment.youthAmount)}`,
				detail: `${payment.youthName || `Youth #${payment.youthId}`} · ${payment.taskTitle || `Task #${payment.taskId}`}`,
				time: payment.paidAt || payment.createdAt,
				tone: 'payment'
			});
		});

		transactions.forEach((tx) => {
			items.push({
				id: `treasury-${tx.id}`,
				agent: 'TREASURY',
				action: `${tx.type === 'CREDIT' ? 'Credited' : 'Debited'} reserve ${formatCurrency(tx.amount)}`,
				detail: tx.reference || 'Reserve movement',
				time: tx.createdAt,
				tone: 'treasury'
			});
		});

		tasks.forEach((task) => {
			items.push({
				id: `matching-${task.id}`,
				agent: 'MATCH',
				action: 'Published an SME brief',
				detail: `${task.title} · ${formatCurrency(task.budget)}`,
				time: task.createdAt,
				tone: 'matching'
			});
		});

		return items
			.filter((item) => item.time)
			.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
			.slice(0, $lowDataMode ? 6 : 14);
	});

	async function loadAdmin() {
		loading = true;
		errorMessage = null;
		const [paymentResult, ledgerResult, taskResult, walletResult, txResult, youthResult] =
			await Promise.allSettled([
				api.payments.listAll(),
				api.ledger.entries(),
				api.tasks.list(),
				api.wallet.reserve(),
				api.wallet.transactions(),
				api.admin.youth()
			]);

		if (paymentResult.status === 'fulfilled') {
			payments = Array.isArray(paymentResult.value) ? paymentResult.value : [];
		} else {
			console.error('Failed to load payment queue:', paymentResult.reason);
			errorMessage = paymentResult.reason?.message || 'Could not load the payout queue.';
		}

		if (ledgerResult.status === 'fulfilled') {
			ledgerEntries = Array.isArray(ledgerResult.value) ? ledgerResult.value : [];
		} else {
			console.error('Failed to load ledger records:', ledgerResult.reason);
			errorMessage = errorMessage || ledgerResult.reason?.message || 'Could not load ledger records.';
		}

		if (taskResult.status === 'fulfilled') {
			tasks = Array.isArray(taskResult.value) ? taskResult.value : [];
		} else {
			console.error('Failed to load tasks:', taskResult.reason);
		}

		if (walletResult.status === 'fulfilled') {
			wallet = walletResult.value;
		} else {
			console.error('Failed to load reserve wallet:', walletResult.reason);
		}

		if (txResult.status === 'fulfilled') {
			transactions = Array.isArray(txResult.value) ? txResult.value : [];
		} else {
			console.error('Failed to load reserve transactions:', txResult.reason);
		}

		if (youthResult.status === 'fulfilled') {
			youthRoster = Array.isArray(youthResult.value) ? youthResult.value : [];
		} else {
			console.error('Failed to load youth roster:', youthResult.reason);
		}

		loading = false;
	}

	async function handleMarkPlaced(youth) {
		if (!youth || youth.isAlumni) return;
		markingYouthId = youth.id;
		try {
			const updated = await api.admin.markPlaced(youth.id);
			youthRoster = youthRoster.map((row) =>
				row.id === updated.id ? { ...row, ...updated } : row
			);
			toast.success(`${updated.userName || 'Youth'} marked as placed — welcome to the SSH Alumni.`);
		} catch (err) {
			toast.error(err.message || 'Could not mark the youth as placed.');
		} finally {
			markingYouthId = null;
		}
	}

	function openPayoutModal(payment) {
		selectedPaymentToPayout = payment;
		payoutModalOpen = true;
	}

	async function confirmPayout() {
		if (!selectedPaymentToPayout) return;
		payingOut = true;
		try {
			const updated = await api.payments.payout(selectedPaymentToPayout.id);
			payments = payments.map((payment) =>
				payment.id === updated.id ? { ...payment, ...updated } : payment
			);
			toast.success(
				`Payout released for ${selectedPaymentToPayout.youthName || 'the youth'}. Ledger proof is intact.`
			);
			payoutModalOpen = false;
			await loadAdmin();
		} catch (err) {
			toast.error(err.message || 'The payout could not be released.');
		} finally {
			payingOut = false;
		}
	}

	onMount(loadAdmin);
</script>

<svelte:head>
	<title>System Admin Dashboard | Shared Services Hub</title>
</svelte:head>

<RoleGuard allowedRoles={['ADMIN']}>
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="border border-[#C8D4E8] bg-[#0A1E4A] p-8 text-white shadow-md mb-8">
			<div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
				<div>
					<div class="inline-block bg-[#7C3FE4] text-white px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest border border-white/20 mb-2">
						SYSTEM GOVERNANCE
					</div>
					<h1 class="font-serif text-3xl sm:text-4xl font-normal text-white">
						Platform Operations &amp; Governance
					</h1>
					<p class="mt-2 text-sm text-[#C8D4E8] max-w-xl font-light font-sans">
						Manage platform users, monitor matching health, and audit Experience Ledger integrity.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<button
						type="button"
						class="border border-white/30 bg-white/5 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-[#0A1E4A] transition-colors disabled:opacity-50"
						onclick={loadAdmin}
						disabled={loading}
					>
						{loading ? 'Refreshing...' : 'Refresh operations'}
					</button>
					<a href="/ledger" class="border border-white/30 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-[#0A1E4A] transition-colors">
						Public ledger
					</a>
				</div>
			</div>

			<div class="mt-8 pt-6 border-t border-[#1C3565] grid grid-cols-2 sm:grid-cols-4 gap-6">
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Total Platform Users</div>
					<div class="font-mono text-2xl sm:text-3xl font-bold mt-1 text-white">1,240</div>
					<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Directory total</div>
				</div>
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Active SME Tasks</div>
					<div class="font-mono text-2xl sm:text-3xl font-bold mt-1 text-[#1446A0]">{loading ? '—' : tasks.length}</div>
					<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Open task feed</div>
				</div>
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Verified Ledger Records</div>
					<div class="font-mono text-2xl sm:text-3xl font-bold mt-1 text-[#7C3FE4]">{loading ? '—' : ledgerEntries.length}</div>
					<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Chain-sealed proofs</div>
				</div>
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Disbursed Corporate Capital</div>
					<div class="font-mono text-2xl sm:text-3xl font-bold mt-1 text-[#1A8A55]">{loading ? '—' : formatCurrency(paidTotal)}</div>
					<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">{paidPayments.length} paid payout(s)</div>
				</div>
			</div>
		</div>

		<ApiError message={errorMessage} onretry={loadAdmin} />

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Payout queue -->
			<div class="lg:col-span-2">
				<div class="border border-[#C8D4E8] bg-white shadow-xs">
					<div class="border-b border-[#C8D4E8] p-5">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<div class="flex items-center gap-2">
									<span class="h-1.5 w-1.5 bg-[#D4831A]"></span>
									<h2 class="font-serif text-2xl text-[#0D1B3E]">Payout Queue</h2>
								</div>
								<p class="mt-0.5 text-xs text-[#6A84AC] font-sans">Release verified wage payments from the corporate reserve. Every payout is already backed by a ledger record.</p>
							</div>
							<div class="text-left sm:text-right">
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Pending value</div>
								<div class="font-mono text-xl font-bold text-[#D4831A]">{loading ? '—' : formatCurrency(pendingTotal)}</div>
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">{pendingPayments.length} awaiting release</div>
							</div>
						</div>

						<div class="mt-4 flex flex-wrap gap-2">
							{#each ['PENDING', 'PAID', 'ALL'] as filter}
								<button
									type="button"
									class="border px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors {paymentFilter === filter ? 'border-[#1446A0] bg-[#1446A0] text-white' : 'border-[#C8D4E8] bg-white text-[#465A7A] hover:border-[#1446A0]'}"
									onclick={() => (paymentFilter = filter)}
								>
									{filter}
									{#if filter === 'PENDING'}<span class="ml-1">({pendingPayments.length})</span>{/if}
									{#if filter === 'PAID'}<span class="ml-1">({paidPayments.length})</span>{/if}
									{#if filter === 'ALL'}<span class="ml-1">({payments.length})</span>{/if}
								</button>
							{/each}
						</div>
					</div>

					{#if loading}
						<div class="p-5"><StatePanel kind="loading" rows={4} /></div>
					{:else if filteredPayments.length === 0}
						<div class="p-5">
							<StatePanel
								kind="empty"
								title={paymentFilter === 'PENDING' ? 'The payout queue is clear' : 'No payments in this view'}
								message={paymentFilter === 'PENDING'
									? 'Verified tasks automatically create a pending payment. Nothing is waiting for release right now.'
									: 'Change the filter or wait for the next verified task.'}
								compact
							/>
						</div>
					{:else}
						<div class="divide-y divide-[#EFF4FF]">
							{#each filteredPayments as payment (payment.id)}
								<div class="p-5">
									<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<span class="border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider {payment.status === 'PAID' ? 'border-[#1A8A55] bg-[#EDFBF3] text-[#1A8A55]' : 'border-[#D4831A] bg-[#FFFBF2] text-[#8A5A10]'}">
													{payment.status}
												</span>
												<span class="font-mono text-[10px] text-[#6A84AC]">Payment #{payment.id}</span>
												{#if ledgerByTask[String(payment.taskId)]}
													<span class="border border-[#7C3FE4]/40 bg-[#F5EEFF] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#7C3FE4]">
														Ledger #{ledgerByTask[String(payment.taskId)].sequence}
													</span>
												{/if}
											</div>
											<h3 class="mt-2 font-serif text-lg text-[#0D1B3E]">{payment.taskTitle || `Task #${payment.taskId}`}</h3>
											<p class="mt-0.5 text-xs text-[#465A7A] font-sans">
												{payment.youthName || `Youth #${payment.youthId}`} · created {formatDate(payment.createdAt)}
												{#if payment.paidAt} · paid {formatDate(payment.paidAt, true)}{/if}
											</p>
											{#if payment.reference}
												<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Ref: {payment.reference}</div>
											{/if}
										</div>

										<div class="shrink-0 sm:text-right">
											<div class="font-mono text-lg font-bold text-[#1A8A55]">{formatCurrency(payment.youthAmount)}</div>
											<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
												Gross {formatCurrency(payment.totalAmount)} · fee {formatCurrency(payment.platformFee)}
											</div>
											{#if payment.status === 'PENDING'}
												<button
													type="button"
													class="mt-2 w-full bg-[#1446A0] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#0f3680] transition-colors sm:w-auto"
													onclick={() => openPayoutModal(payment)}
												>
													Release payout
												</button>
											{:else}
												<span class="mt-2 inline-block border border-[#1A8A55] bg-[#EDFBF3] px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1A8A55]">
													✓ Paid
												</span>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Quick links preserved from the original admin view -->
				<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
					<a href="/tasks" class="border border-[#C8D4E8] bg-white p-5 shadow-xs hover:border-[#1446A0] transition-colors">
						<h3 class="font-serif text-lg text-[#0D1B3E] mb-1">Task Directory</h3>
						<p class="text-xs text-[#6A84AC] font-sans">Inspect and monitor all active and completed tasks on the platform.</p>
					</a>
					<a href="/dashboard/youth" class="border border-[#C8D4E8] bg-white p-5 shadow-xs hover:border-[#1446A0] transition-colors">
						<h3 class="font-serif text-lg text-[#0D1B3E] mb-1">Candidate View</h3>
						<p class="text-xs text-[#6A84AC] font-sans">Preview experience ledger and open task matching from the youth perspective.</p>
					</a>
					<a href="/dashboard/sme" class="border border-[#C8D4E8] bg-white p-5 shadow-xs hover:border-[#1446A0] transition-colors">
						<h3 class="font-serif text-lg text-[#0D1B3E] mb-1">SME Partner View</h3>
						<p class="text-xs text-[#6A84AC] font-sans">Test task publishing, assignment flows, and experience verification.</p>
					</a>
				</div>

				<!-- Youth outcomes: roster + mark placed -->
				<div class="mt-6 border border-[#C8D4E8] bg-white shadow-xs">
					<div class="border-b border-[#C8D4E8] p-5">
						<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<div class="flex items-center gap-2">
									<span class="h-1.5 w-1.5 bg-[#1A8A55]"></span>
									<h2 class="font-serif text-2xl text-[#0D1B3E]">Youth Outcomes</h2>
								</div>
								<p class="mt-0.5 text-xs text-[#6A84AC] font-sans">
									The hub roster. Once a youth has been permanently placed, mark them as an SSH Alumni —
									the exit stamp keeps their verified history for impact reporting.
								</p>
							</div>
							<div class="text-left sm:text-right">
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Placed alumni</div>
								<div class="font-mono text-xl font-bold text-[#1A8A55]">
									{youthRoster.filter((row) => row.isAlumni).length}/{youthRoster.length || '—'}
								</div>
							</div>
						</div>
					</div>

					{#if youthRoster.length === 0}
						<div class="p-5">
							<StatePanel
								kind="empty"
								title="No youth registered yet"
								message="The roster fills in as candidates complete registration and skills onboarding."
								compact
							/>
						</div>
					{:else}
						<div class="divide-y divide-[#EFF4FF]">
							{#each youthRoster as youth (youth.id)}
								<div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<span class="border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider {youth.tier === 'TIER_3' ? 'border-[#7C3FE4] bg-[#F5EEFF] text-[#7C3FE4]' : youth.tier === 'TIER_2' ? 'border-[#1446A0] bg-[#EFF4FF] text-[#1446A0]' : youth.tier === 'TIER_1' ? 'border-[#D4831A] bg-[#FFFBF2] text-[#8A5A10]' : 'border-[#C8D4E8] bg-[#F8F9FC] text-[#6A84AC]'}">
												{youth.tier || 'TIER_0'}
											</span>
											{#if youth.isAlumni}
												<span class="border border-[#1A8A55] bg-[#EDFBF3] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1A8A55]">
													Alumni {youth.alumniDate ? `since ${formatDate(youth.alumniDate)}` : ''}
												</span>
											{/if}
										</div>
										<h3 class="mt-1.5 font-serif text-base text-[#0D1B3E]">{youth.userName || `Youth #${youth.id}`}</h3>
										<p class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
											{youth.verifiedExperiences} verified experience(s) in the ledger
										</p>
									</div>
									<div class="shrink-0">
										{#if youth.isAlumni}
											<span class="inline-block border border-[#1A8A55] bg-[#EDFBF3] px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1A8A55]">
												✓ Placed
											</span>
										{:else}
											<button
												type="button"
												class="border border-[#1A8A55] bg-[#EDFBF3] px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-bold text-[#1A8A55] hover:bg-[#1A8A55] hover:text-white transition-colors disabled:opacity-50"
												disabled={markingYouthId === youth.id}
												onclick={() => handleMarkPlaced(youth)}
											>
												{markingYouthId === youth.id ? 'Saving...' : 'Mark placed'}
											</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Operational side -->
			<div class="space-y-6">
				<ActivityFeed
					items={activityItems}
					title="Agent Activity"
					subtitle="Live matching, ledger, treasury and payout events."
					limit={$lowDataMode ? 6 : 12}
				/>

				<div class="border border-[#C8D4E8] bg-white p-5 shadow-xs">
					<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1446A0]">Operational health</div>
					<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">Reserve &amp; integrity</h3>
					<div class="mt-4 space-y-2">
						<div class="flex items-center justify-between gap-3 border-b border-[#EFF4FF] pb-2">
							<span class="font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">Reserve balance</span>
							<span class="font-mono text-sm font-bold text-[#1446A0]">{loading ? '—' : formatCurrency(wallet?.balance)}</span>
						</div>
						<div class="flex items-center justify-between gap-3 border-b border-[#EFF4FF] pb-2">
							<span class="font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">Pending payouts</span>
							<span class="font-mono text-sm font-bold text-[#D4831A]">{pendingPayments.length}</span>
						</div>
						<div class="flex items-center justify-between gap-3 border-b border-[#EFF4FF] pb-2">
							<span class="font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">Last ledger seal</span>
							<span class="font-mono text-[10px] font-bold text-[#7C3FE4]">{lastSeal ? `#${lastSeal.sequence}` : '—'}</span>
						</div>
						<div class="flex items-center justify-between gap-3">
							<span class="font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">Chain check</span>
							<a href="/ledger" class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1446A0] hover:underline">Verify →</a>
						</div>
					</div>
					{#if lastSeal}
						<p class="mt-3 border border-[#C8D4E8] bg-[#F8F9FC] p-2 font-mono text-[9px] leading-relaxed text-[#6A84AC]">
							{lastSeal.message || lastSeal.reference || lastSeal.hash || 'Sealed ledger proof'}
						</p>
					{/if}
				</div>

				<div class="border border-[#C8D4E8] bg-[#0A1E4A] p-5 text-white shadow-xs">
					<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#D4831A]">Admin principle</div>
					<p class="mt-2 text-xs leading-relaxed text-[#C8D4E8] font-sans">
						Payouts are the only money movement an admin can trigger. Verification, ratings and ledger proofs stay with the SME; the public chain stays inspectable by anyone.
					</p>
					<a href="/demo" class="mt-3 inline-block font-mono text-[10px] font-bold uppercase tracking-wider text-white underline">Open demo mode →</a>
				</div>
			</div>
		</div>
	</div>
</RoleGuard>

<Modal bind:open={payoutModalOpen} title="Release payout?">
	<div class="space-y-4">
		<p class="text-sm leading-relaxed text-[#465A7A] font-sans">
			This debits the corporate reserve and marks the payment as paid. The ledger proof for <span class="font-semibold text-[#0D1B3E]">{selectedPaymentToPayout?.taskTitle}</span> will remain unchanged.
		</p>
		<div class="grid grid-cols-3 gap-2 border border-[#C8D4E8] bg-[#F8F9FC] p-3">
			<div>
				<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Gross</div>
				<div class="mt-1 font-mono text-sm font-bold text-[#0D1B3E]">{formatCurrency(selectedPaymentToPayout?.totalAmount)}</div>
			</div>
			<div>
				<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Fee</div>
				<div class="mt-1 font-mono text-sm font-bold text-[#6A84AC]">{formatCurrency(selectedPaymentToPayout?.platformFee)}</div>
			</div>
			<div>
				<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Youth receives</div>
				<div class="mt-1 font-mono text-sm font-bold text-[#1A8A55]">{formatCurrency(selectedPaymentToPayout?.youthAmount)}</div>
			</div>
		</div>
		<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-3">
			<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Recipient</div>
			<div class="mt-1 font-sans text-sm font-semibold text-[#0D1B3E]">{selectedPaymentToPayout?.youthName || `Youth #${selectedPaymentToPayout?.youthId}`}</div>
			{#if selectedPaymentToPayout?.reference}
				<div class="mt-1 font-mono text-[9px] text-[#6A84AC]">Existing reference: {selectedPaymentToPayout.reference}</div>
			{/if}
		</div>
	</div>
	{#snippet footer()}
		<button type="button" class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider" onclick={() => (payoutModalOpen = false)}>Cancel</button>
		<button
			type="button"
			disabled={payingOut}
			class="bg-[#1A8A55] px-5 py-2 text-xs font-mono uppercase tracking-widest text-white hover:bg-[#146e43] disabled:opacity-50"
			onclick={confirmPayout}
		>
			{payingOut ? 'Releasing...' : 'Release payout'}
		</button>
	{/snippet}
</Modal>
