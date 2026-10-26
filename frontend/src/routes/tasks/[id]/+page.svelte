<script>
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ApiError from '$lib/components/ApiError.svelte';
	import ApplicantReview from '$lib/components/ApplicantReview.svelte';
	import { api } from '$lib/api.js';
	import { currentUser } from '$lib/stores/auth.js';
	import { toast } from '$lib/stores/toast.js';
	import {
		formatCurrency,
		formatDuration,
		formatDate,
		formatTier,
		tierIndex
	} from '$lib/utils/formatters.js';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const user = $derived($currentUser);
	const taskId = $derived(page.params.id);

	let task = $state(null);
	let loading = $state(true);
	let errorMessage = $state(null);
	let actionLoading = $state(false);

	// Modals
	let assignModalOpen = $state(false);
	let youthIdToAssign = $state('');
	let applicants = $state([]);
	let loadingApplicants = $state(false);
	let applicantError = $state(null);
	let verifyModalOpen = $state(false);
	let verifyRating = $state(5);
	let verifyFeedback = $state('');
	let verifyReference = $state('');
	let verifyConfirmedSkills = $state([]);
	let cancelModalOpen = $state(false);
	let rejectModalOpen = $state(false);
	let rejectReason = $state('');

	// The logged-in youth's application for this task (if any)
	let myApplication = $state(null);
	let youthProfile = $state(null);
	let youthTier = $state(null);

	const isYouth = $derived(user?.role === 'YOUTH');
	const isSme = $derived(user?.role === 'SME');
	const isAssignedToMe = $derived(
		isYouth && myApplication?.status === 'ACCEPTED'
	);

	const matchSkills = $derived.by(() => {
		const haystack = `${task?.title || ''} ${task?.category || ''} ${task?.description || ''}`.toLowerCase();
		return (youthProfile?.skills || '')
			.split(',')
			.map((skill) => skill.trim())
			.filter(Boolean)
			.filter((skill) => {
				const lower = skill.toLowerCase();
				const words = lower.split(/\s+/).filter((word) => word.length > 3);
				return haystack.includes(lower) || words.some((word) => haystack.includes(word));
			});
	});

	const tierMatch = $derived.by(() => {
		if (!task?.requiredTier || task.requiredTier === 'ALL') {
			return { ok: true, label: 'Open to every tier', detail: 'This brief has no tier preference.' };
		}
		const current = tierIndex(youthTier?.tier || 'TIER_0');
		const preferred = tierIndex(task.requiredTier);
		return {
			ok: current >= preferred,
			label: current >= preferred ? 'Tier preference met' : 'Stretch opportunity',
			detail:
				current >= preferred
					? `You meet the preferred ${formatTier(task.requiredTier, true)} level.`
					: `The SME prefers ${formatTier(task.requiredTier, true)}. You can still apply and be ranked on fit.`
		};
	});

	async function loadTask() {
		loading = true;
		errorMessage = null;
		try {
			const res = await api.tasks.get(taskId);
			task = res;
		} catch (err) {
			console.error('Failed to load task detail:', err);
			errorMessage = err.message || 'Task not found or could not be loaded.';
		} finally {
			loading = false;
		}
	}

	async function loadYouthContext() {
		if (!task) return;
		const [appsResult, profileResult, tierResult] = await Promise.allSettled([
			api.applications.mine(),
			api.youth.me(),
			api.tiers.me()
		]);

		if (appsResult.status === 'fulfilled') {
			const apps = appsResult.value || [];
			myApplication =
				apps.find((a) => Number(a.taskId) === Number(task.id)) || null;
		} else {
			console.warn('Could not load my application:', appsResult.reason);
		}

		if (profileResult.status === 'fulfilled') {
			youthProfile = profileResult.value;
		} else {
			console.warn('Could not load youth profile:', profileResult.reason);
		}

		if (tierResult.status === 'fulfilled') {
			youthTier = tierResult.value;
		} else {
			console.warn('Could not load youth tier:', tierResult.reason);
		}
	}

	// Wait for auth hydration so the youth-only application lookup has a role.
	$effect(() => {
		if (isYouth && task) {
			loadYouthContext();
		}
	});

	async function handleCompleteTask() {
		if (!task) return;
		actionLoading = true;
		try {
			const res = await api.tasks.complete(task.id);
			task = res;
			toast.success('Task marked as completed! SME has been notified to verify your work.');
		} catch (err) {
			toast.error(err.message || 'Failed to complete task.');
		} finally {
			actionLoading = false;
		}
	}

	async function handleApplyTask() {
		if (!task) return;
		actionLoading = true;
		try {
			myApplication = await api.applications.apply(task.id, '');
			toast.success(
				'Application submitted. The task is reserved for you for 48 hours while the SME reviews it.'
			);
		} catch (err) {
			toast.error(err.message || 'Failed to apply for task.');
		} finally {
			actionLoading = false;
		}
	}

	async function handleWithdrawApplication() {
		if (!myApplication) return;
		actionLoading = true;
		try {
			await api.applications.withdraw(myApplication.id);
			myApplication = { ...myApplication, status: 'WITHDRAWN' };
			toast.success('Application withdrawn. Your reservation has been released.');
		} catch (err) {
			toast.error(err.message || 'Failed to withdraw application.');
		} finally {
			actionLoading = false;
		}
	}

	async function openAssignModal() {
		if (!task) return;
		assignModalOpen = true;
		loadingApplicants = true;
		applicantError = null;
		applicants = [];
		youthIdToAssign = '';
		try {
			const res = await api.applications.forTask(task.id);
			applicants = (res || []).filter((a) => a.status === 'PENDING');
		} catch (err) {
			applicantError = err.message || 'Failed to load applicants.';
			toast.error(applicantError);
		} finally {
			loadingApplicants = false;
		}
	}

	async function handleAssignSubmit(youthId = youthIdToAssign) {
		const targetYouthId = String(youthId || youthIdToAssign || '');
		if (!task || !targetYouthId) return;
		actionLoading = true;
		try {
			const res = await api.tasks.assign(task.id, targetYouthId);
			task = res;
			const chosen = applicants.find((a) => String(a.youthId) === targetYouthId);
			toast.success(
				`Task assigned to ${chosen?.youthName || `Youth #${targetYouthId}`}!`
			);
			assignModalOpen = false;
		} catch (err) {
			toast.error(err.message || 'Failed to assign task.');
		} finally {
			actionLoading = false;
		}
	}

	function openVerifyModal() {
		verifyRating = 5;
		verifyFeedback = '';
		verifyReference = '';
		verifyConfirmedSkills = Array.isArray(task?.assignedYouthSkills)
			? task.assignedYouthSkills.map((label) => ({ label, checked: false }))
			: [];
		verifyModalOpen = true;
	}

	function toggleVerifySkill(index) {
		if (!verifyConfirmedSkills[index]) return;
		verifyConfirmedSkills = verifyConfirmedSkills.map((skill, i) =>
			i === index ? { ...skill, checked: !skill.checked } : skill
		);
	}

	async function handleVerifySubmit() {
		if (!task) return;
		if (!Number(verifyRating)) {
			toast.error('Choose a performance rating before signing off.');
			return;
		}
		if (verifyFeedback.trim().length < 20) {
			toast.error('Please write at least 20 characters of specific feedback.');
			return;
		}
		if (verifyReference.trim().length < 5) {
			toast.error('A clear reference to the work you checked is required.');
			return;
		}
		actionLoading = true;
		try {
			await api.tasks.verify(
				task.id,
				verifyFeedback.trim(),
				verifyRating,
				verifyReference.trim(),
				verifyConfirmedSkills
					.filter((skill) => skill.checked)
					.map((skill) => skill.label)
			);
			toast.success('Experience verified and recorded to Experience Ledger!');
			verifyModalOpen = false;
			await loadTask();
		} catch (err) {
			toast.error(err.message || 'Failed to verify experience.');
		} finally {
			actionLoading = false;
		}
	}

	async function handleCancelSubmit() {
		if (!task) return;
		actionLoading = true;
		try {
			task = await api.tasks.cancel(task.id);
			toast.success('Task cancelled. Pending applications were released.');
			cancelModalOpen = false;
		} catch (err) {
			toast.error(err.message || 'Failed to cancel task.');
		} finally {
			actionLoading = false;
		}
	}

	function openRejectModal() {
		rejectReason = '';
		rejectModalOpen = true;
	}

	async function handleRejectSubmit() {
		if (!task) return;
		if (!rejectReason.trim()) {
			toast.error('A revision reason is required.');
			return;
		}
		actionLoading = true;
		try {
			const res = await api.tasks.reject(task.id, rejectReason.trim());
			task = res;
			toast.success('Task sent back to the youth for revision.');
			rejectModalOpen = false;
		} catch (err) {
			toast.error(err.message || 'Failed to send task back for revision.');
		} finally {
			actionLoading = false;
		}
	}

	onMount(() => {
		loadTask();
	});
</script>

<svelte:head>
	<title>{task ? task.title : 'Task Details'} | Shared Services Hub</title>
</svelte:head>

<RoleGuard requireAuth={true}>
	<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Back Button -->
		<div class="mb-6">
			<a
				href="/tasks"
				class="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#6A84AC] hover:text-[#1446A0] transition-colors"
			>
				<span>← Back to Task Directory</span>
			</a>
		</div>

		<!-- Error Banner -->
		<ApiError message={errorMessage} onretry={loadTask} />

		{#if loading}
			<div class="space-y-6">
				<div class="h-40 border border-[#C8D4E8] bg-white animate-pulse"></div>
				<div class="h-64 border border-[#C8D4E8] bg-white animate-pulse"></div>
			</div>
		{:else if task}
			<div class="space-y-8">
				<!-- Main Card (Sharp, Cape Cobalt) -->
				<div class="border border-[#C8D4E8] bg-white p-8 shadow-xs border-t-4 border-t-[#1446A0]">
					<!-- Top Meta -->
					<div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
						<div class="flex flex-wrap items-center gap-2">
							<span class="bg-[#EFF4FF] border border-[#C8D4E8] px-2.5 py-0.5 text-xs font-mono font-bold text-[#1446A0]">
								{task.category}
							</span>
							<StatusBadge status={task.status} size="md" />
							{#if task.requiredTier}
								<span class="border border-[#7C3FE4]/40 bg-[#F5EEFF] px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#7C3FE4]">
									{task.requiredTier === 'ALL'
										? 'All tiers welcome'
										: `Preferred ${formatTier(task.requiredTier, true)}`}
								</span>
							{/if}
						</div>

						<span class="font-mono text-xs text-[#6A84AC]">
							Posted {formatDate(task.createdAt, true)}
						</span>
					</div>

					<!-- Title (Serif Display) -->
					<h1 class="font-serif text-3xl sm:text-4xl text-[#0D1B3E] font-normal leading-snug">
						{task.title}
					</h1>

					<!-- SME Issuer -->
					<div class="mt-4 flex items-center gap-3 p-3 bg-[#F8F9FC] border border-[#C8D4E8] max-w-md">
						<div>
							<div class="font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">Issuer / SME Partner</div>
							<div class="font-sans text-sm font-bold text-[#0D1B3E]">{task.smeBusinessName || 'Verified SME Partner'}</div>
						</div>
					</div>

					<!-- Key Parameters Grid (Sharp Boxes) -->
					<div class="mt-8 pt-6 border-t border-[#C8D4E8] grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-4">
							<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Corporate Reserve</div>
							<div class="font-mono text-xl font-bold text-[#1446A0] mt-1">{formatCurrency(task.budget)}</div>
							<span class="font-mono text-[10px] text-[#1A8A55] uppercase">Direct Payout</span>
						</div>

						<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-4">
							<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Duration</div>
							<div class="font-mono text-xl font-semibold text-[#0D1B3E] mt-1">{formatDuration(task.durationDays)}</div>
							<span class="font-mono text-[10px] text-[#6A84AC] uppercase">Milestone Track</span>
						</div>

						<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-4">
							<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Assigned Candidate</div>
							<div class="font-sans text-sm font-bold text-[#0D1B3E] mt-1 truncate">
								{task.assignedToName || 'Unassigned'}
							</div>
							<span class="font-mono text-[10px] text-[#6A84AC] uppercase">
								{task.assignedToId ? `ID #${task.assignedToId}` : 'Open to claim'}
							</span>
						</div>

						<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-4">
							<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Compensation</div>
							<div class="font-mono text-sm font-bold text-[#1A8A55] mt-1">
								{task.isPaid ? 'PAID TASK' : 'VOLUNTEER'}
							</div>
							<span class="font-mono text-[10px] text-[#6A84AC] uppercase">Escrow Locked</span>
						</div>
					</div>

					<!-- Why this match (youth context) -->
					{#if isYouth && task.status === 'OPEN'}
						<div class="mt-6 border border-[#7C3FE4]/30 bg-[#FAF8FF] p-5">
							<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7C3FE4]">
										Why this match
									</div>
									<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">Your profile signals</h3>
								</div>
								<span class="self-start border border-[#7C3FE4]/40 bg-white px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#7C3FE4]">
									{matchSkills.length > 0 || tierMatch.ok ? 'Matched for you' : 'Open application'}
								</span>
							</div>

							<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
								<div class="border border-[#C8D4E8] bg-white p-3">
									<div class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6A84AC]">Skill overlap</div>
									{#if matchSkills.length > 0}
										<div class="mt-1.5 flex flex-wrap gap-1">
											{#each matchSkills.slice(0, 4) as skill}
												<span class="border border-[#1A8A55]/30 bg-[#EDFBF3] px-1.5 py-0.5 font-mono text-[9px] text-[#1A8A55]">{skill}</span>
											{/each}
										</div>
									{:else}
										<p class="mt-1.5 text-[11px] leading-relaxed text-[#465A7A] font-sans">
											No direct skill overlap yet. You can still apply; the SME sees your profile.
										</p>
									{/if}
								</div>

								<div class="border border-[#C8D4E8] bg-white p-3">
									<div class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6A84AC]">Tier fit</div>
									<div class="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider {tierMatch.ok ? 'text-[#1A8A55]' : 'text-[#D4831A]'}">
										{tierMatch.label}
									</div>
									<p class="mt-1 text-[11px] leading-relaxed text-[#465A7A] font-sans">{tierMatch.detail}</p>
									<p class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
										Your level: {formatTier(youthTier?.tier || 'TIER_0')}
									</p>
								</div>

								<div class="border border-[#C8D4E8] bg-white p-3">
									<div class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6A84AC]">Logistics</div>
									<div class="mt-1.5 space-y-1 font-sans text-[11px] text-[#465A7A]">
										<p>{youthProfile?.location || 'Add your location'}</p>
										<p>{youthProfile?.availability || 'Add your availability'}</p>
										<p class="font-mono text-[9px] uppercase tracking-wider text-[#1A8A55]">
											{task.isPaid ? 'Guaranteed wage' : 'Volunteer experience'}
										</p>
									</div>
								</div>
							</div>

							<div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#C8D4E8] pt-3">
								<p class="text-[10px] leading-relaxed text-[#6A84AC] font-sans">
									Match reasons are advisory. Applying never requires a minimum tier.
								</p>
								<a href="/dashboard/youth" class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#1446A0] hover:underline">
									Refine your profile →
								</a>
							</div>
						</div>
					{/if}

					<!-- Task Description Body -->
					<div class="mt-8">
						<h3 class="font-mono text-xs font-bold uppercase tracking-wider text-[#0D1B3E] mb-3">
							Deliverables &amp; Description
						</h3>
						<div class="font-sans text-sm text-[#465A7A] leading-relaxed whitespace-pre-line border border-[#C8D4E8] bg-[#F8F9FC] p-6">
							{task.description || 'No additional instructions specified by the SME partner.'}
						</div>
					</div>

					<!-- Revision Request Banner -->
					{#if task.revisionReason}
						<div class="mt-6 border-l-4 border-l-[#C49420] border border-[#C8D4E8] bg-[#FFF8E6] p-4">
							<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8A6A12]">
								SME Requested a Revision
								{#if task.revisionCount}
									· Round {task.revisionCount}
								{/if}
							</div>
							<p class="mt-1 font-sans text-sm text-[#465A7A]">{task.revisionReason}</p>
						</div>
					{/if}

					<!-- Role-Specific Action Bar -->
					<div class="mt-8 pt-6 border-t border-[#C8D4E8] flex flex-wrap items-center justify-between gap-4">
						<div class="font-mono text-xs text-[#6A84AC]">
							Status: <span class="font-bold text-[#0D1B3E]">{task.status}</span>
						</div>

						<div class="flex items-center gap-3 flex-wrap">
							<!-- YOUTH ACTIONS -->
							{#if isYouth}
								{#if task.status === 'OPEN'}
									{#if myApplication?.status === 'PENDING'}
										<span class="border border-[#C49420] bg-[#FFF8E6] px-4 py-2 text-xs font-mono font-bold text-[#C49420] uppercase">
											Application Pending · Reserved 48h
										</span>
										<button
											type="button"
											disabled={actionLoading}
											class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider disabled:opacity-50"
											onclick={handleWithdrawApplication}
										>
											Withdraw
										</button>
									{:else if myApplication?.status === 'ACCEPTED'}
										<span class="border border-[#1A8A55] bg-[#EDFBF4] px-4 py-2 text-xs font-mono font-bold text-[#1A8A55] uppercase">
											Accepted · Awaiting Task Start
										</span>
									{:else}
										<button
											type="button"
											disabled={actionLoading}
											class="cape-btn-primary px-6 py-2.5 text-xs font-mono uppercase tracking-wider disabled:opacity-50"
											onclick={handleApplyTask}
										>
											{actionLoading ? 'Submitting...' : 'Apply for Task'}
										</button>
									{/if}
								{:else if task.status === 'IN_PROGRESS'}
									{#if isAssignedToMe}
										<button
											type="button"
											disabled={actionLoading}
											class="bg-[#1A8A55] text-white px-6 py-2.5 text-xs font-mono uppercase tracking-wider font-bold hover:bg-[#146e43] transition-colors disabled:opacity-50"
											onclick={handleCompleteTask}
										>
											{actionLoading ? 'Submitting...' : 'Mark as Completed'}
										</button>
									{:else}
										<span class="border border-[#C8D4E8] bg-[#F8F9FC] px-4 py-2 text-xs font-mono font-bold text-[#6A84AC] uppercase">
											Already Assigned to Another Candidate
										</span>
									{/if}
								{:else if task.status === 'COMPLETED'}
									<span class="border border-[#C49420] bg-[#FFF8E6] px-4 py-2 text-xs font-mono font-bold text-[#C49420] uppercase">
										Awaiting SME Evaluation
									</span>
								{:else if task.status === 'VERIFIED'}
									<span class="border border-[#7C3FE4] bg-[#F5EEFF] px-4 py-2 text-xs font-mono font-bold text-[#7C3FE4] uppercase">
										✓ Verified in Experience Ledger
									</span>
								{/if}
							{/if}

							<!-- SME ACTIONS -->
							{#if isSme || user?.role === 'ADMIN'}
								{#if task.status === 'OPEN'}
									<button
										type="button"
										class="cape-btn-primary px-5 py-2.5 text-xs font-mono uppercase tracking-wider"
										onclick={openAssignModal}
									>
										Review Applicants &amp; Assign
									</button>
									<button
										type="button"
										class="border border-[#B23A48] bg-[#FCF2F3] px-4 py-2.5 text-xs font-mono uppercase tracking-wider font-bold text-[#B23A48] hover:bg-[#B23A48] hover:text-white transition-colors"
										onclick={() => (cancelModalOpen = true)}
									>
										Cancel Task
									</button>
								{:else if task.status === 'COMPLETED'}
									<button
										type="button"
										class="bg-[#7C3FE4] text-white px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-bold hover:bg-[#682ec7] transition-colors"
										onclick={openVerifyModal}
									>
										Verify Experience
									</button>
									<button
										type="button"
										class="cape-btn-secondary px-4 py-2.5 text-xs font-mono uppercase tracking-wider"
										onclick={openRejectModal}
									>
										Send Back for Revision
									</button>
								{:else if task.status === 'IN_PROGRESS'}
									<span class="border border-[#C8D4E8] bg-[#F8F9FC] px-4 py-2 text-xs font-mono font-bold text-[#6A84AC] uppercase">
										Awaiting Youth Completion
									</span>
									<button
										type="button"
										class="border border-[#B23A48] bg-[#FCF2F3] px-4 py-2.5 text-xs font-mono uppercase tracking-wider font-bold text-[#B23A48] hover:bg-[#B23A48] hover:text-white transition-colors"
										onclick={() => (cancelModalOpen = true)}
									>
										Cancel Task
									</button>
								{:else if task.status === 'VERIFIED'}
									<span class="border border-[#7C3FE4] bg-[#F5EEFF] px-4 py-2 text-xs font-mono font-bold text-[#7C3FE4] uppercase">
										✓ Verified &amp; Payment Created
									</span>
								{/if}
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</RoleGuard>

<!-- Modal: Review Applicants and Assign (Sharp) -->
<Modal
	bind:open={assignModalOpen}
	title={`Review Applicants: ${task?.title || ''}`}
	size="xl"
>
	<div class="space-y-4">
		<p class="text-xs text-[#465A7A] leading-relaxed font-sans">
			Review each applicant's profile before choosing who should do this work. Assigning accepts that
			application, releases the other pending applicants and moves the task to
			<span class="font-mono font-bold text-[#D4831A]">IN_PROGRESS</span>.
		</p>

		<ApplicantReview
			bind:selectedYouthId={youthIdToAssign}
			{applicants}
			{task}
			loading={loadingApplicants}
			error={applicantError}
			assigning={actionLoading}
			onassign={handleAssignSubmit}
			onretry={openAssignModal}
		/>
	</div>

	{#snippet footer()}
		<button
			type="button"
			class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider"
			onclick={() => (assignModalOpen = false)}
		>
			Close
		</button>
	{/snippet}
</Modal>

<!-- Modal: Verify Experience (Sharp) -->
<Modal
	bind:open={verifyModalOpen}
	title={`Verify Experience: ${task?.title || ''}`}
>
	<div class="space-y-4">
		<p class="text-xs text-[#465A7A] leading-relaxed font-sans">
			Your rating and feedback will be added to the permanent Experience Ledger and release corporate wage payment.
		</p>

		<div>
			<div class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E] mb-1.5">
				Performance Rating (1 to 5 Stars) *
			</div>
			<StarRating bind:rating={verifyRating} interactive={true} size="lg" />
			<p class="mt-1 font-sans text-[10px] text-[#6A84AC]">
				The rating is permanent and feeds the youth’s tier progress and public proof record.
			</p>
		</div>

		{#if verifyConfirmedSkills.length > 0}
			<div>
				<div class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E] mb-1.5">
					Skills the Youth Demonstrated (optional)
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each verifyConfirmedSkills as skill, i}
						<button
							type="button"
							class="border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors {skill.checked
								? 'bg-[#1446A0] border-[#1446A0] text-white font-bold'
								: 'border-[#C8D4E8] bg-white text-[#465A7A] hover:border-[#1446A0] hover:text-[#1446A0]'}"
							onclick={() => toggleVerifySkill(i)}
						>
							{skill.checked ? '✓ ' : '+ '}{skill.label}
						</button>
					{/each}
				</div>
				<p class="mt-1 font-sans text-[10px] text-[#6A84AC]">
					Tick the skills you can confirm from the delivered work — confirmed skills are sealed into the public ledger entry.
				</p>
			</div>
		{/if}

		<div>
			<label for="detailFeedback" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
				Written Feedback &amp; Capability Assessment *
			</label>
			<textarea
				id="detailFeedback"
				rows="3"
				maxlength="1000"
				bind:value={verifyFeedback}
				placeholder="Be specific: what was delivered, how well, and what stood out? (at least 20 characters)"
				class="cape-input mt-1.5 block w-full px-4 py-2.5 text-sm font-sans"
			></textarea>
			<div class="mt-1 flex items-center justify-between font-mono text-[9px] text-[#6A84AC]">
				<span>Required · appears on the public ledger</span>
				<span>{verifyFeedback.length}/1000</span>
			</div>
		</div>

		<div>
			<label for="detailReference" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
				Evidence Reference *
			</label>
			<input
				id="detailReference"
				type="text"
				maxlength="255"
				bind:value={verifyReference}
				placeholder="e.g. Invoice batch #INV-2026-04 or shared drive link"
				class="cape-input mt-1.5 block w-full px-4 py-2.5 text-sm font-sans"
			/>
			<p class="mt-1 font-sans text-[11px] text-[#6A84AC]">
				Stored on the public verification record so anyone can confirm what was checked.
			</p>
		</div>

		<div class="border border-[#7C3FE4]/30 bg-[#FAF8FF] p-3">
			<div class="font-mono text-[9px] font-bold uppercase tracking-widest text-[#7C3FE4]">What happens when you sign</div>
			<ol class="mt-1.5 space-y-1 text-[11px] leading-relaxed text-[#465A7A] font-sans">
				<li>1. The task is marked verified and the youth’s ledger record is sealed.</li>
				<li>2. A payment is queued for admin release.</li>
				<li>3. The rating and feedback become part of the youth’s permanent proof history.</li>
			</ol>
		</div>
	</div>

	{#snippet footer()}
		<button
			type="button"
			class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider"
			onclick={() => (verifyModalOpen = false)}
		>
			Cancel
		</button>
		<button
			type="button"
			disabled={actionLoading}
			class="bg-[#7C3FE4] text-white px-5 py-2 text-xs font-mono uppercase tracking-widest font-bold hover:bg-[#682ec7] disabled:opacity-50"
			onclick={handleVerifySubmit}
		>
			{actionLoading ? 'Verifying...' : 'Sign & Record to Ledger'}
		</button>
	{/snippet}
</Modal>

<!-- Modal: Send Back for Revision -->
<Modal
	bind:open={rejectModalOpen}
	title={`Request Revision: ${task?.title || ''}`}
>
	<div class="space-y-4">
		<p class="text-xs text-[#465A7A] leading-relaxed font-sans">
			Explain what must be fixed. The task returns to IN_PROGRESS for the same youth, and no payment is created until the work is verified.
		</p>

		<div>
			<label for="rejectReason" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
				Revision Reason *
			</label>
			<textarea
				id="rejectReason"
				rows="3"
				bind:value={rejectReason}
				placeholder="e.g. Please reconcile the March invoices and attach the updated spreadsheet."
				class="cape-input mt-1.5 block w-full px-4 py-2.5 text-sm font-sans"
			></textarea>
		</div>
	</div>

	{#snippet footer()}
		<button
			type="button"
			class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider"
			onclick={() => (rejectModalOpen = false)}
		>
			Cancel
		</button>
		<button
			type="button"
			disabled={actionLoading}
			class="bg-[#C49420] text-white px-5 py-2 text-xs font-mono uppercase tracking-widest font-bold hover:bg-[#a87c14] disabled:opacity-50"
			onclick={handleRejectSubmit}
		>
			{actionLoading ? 'Sending...' : 'Send Back for Revision'}
		</button>
	{/snippet}
</Modal>

<!-- Modal: Cancel Task -->
<Modal
	bind:open={cancelModalOpen}
	title={`Cancel Task: ${task?.title || ''}`}
>
	<div class="space-y-4">
		<p class="text-xs text-[#465A7A] leading-relaxed font-sans">
			Cancelling withdraws this task permanently
			{#if task?.assignedToName}
				— the assigned youth’s work will be closed without payment
			{/if}. Every pending application is released immediately, so applicants get
			their 48-hour reservation back and can apply elsewhere.
		</p>

		<div class="border border-[#B23A48]/30 bg-[#FCF2F3] p-3">
			<div class="font-mono text-[9px] font-bold uppercase tracking-widest text-[#B23A48]">Before you cancel</div>
			<ol class="mt-1.5 space-y-1 text-[11px] leading-relaxed text-[#465A7A] font-sans">
				<li>1. Cancelled tasks cannot be reopened — to reject completed work use Send Back for Revision instead.</li>
				<li>2. Pending applicants return to the task queue with their reservation released.</li>
				<li>3. No youth is paid for a cancelled task, so cancel before any work is verified.</li>
			</ol>
		</div>
	</div>

	{#snippet footer()}
		<button
			type="button"
			class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider"
			onclick={() => (cancelModalOpen = false)}
		>
			Keep Task
		</button>
		<button
			type="button"
			disabled={actionLoading}
			class="bg-[#B23A48] text-white px-5 py-2 text-xs font-mono uppercase tracking-widest font-bold hover:bg-[#95303c] disabled:opacity-50"
			onclick={handleCancelSubmit}
		>
			{actionLoading ? 'Cancelling...' : 'Cancel Task'}
		</button>
	{/snippet}
</Modal>
