<script>
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ApiError from '$lib/components/ApiError.svelte';
	import ApplicantReview from '$lib/components/ApplicantReview.svelte';
	import { api } from '$lib/api.js';
	import { currentUser } from '$lib/stores/auth.js';
	import { lowDataMode } from '$lib/stores/preferences.js';
	import { toast } from '$lib/stores/toast.js';
	import {
		formatCurrency,
		formatDuration,
		formatDate,
		formatTier
	} from '$lib/utils/formatters.js';
	import { onMount } from 'svelte';

	const user = $derived($currentUser);

	let tasks = $state([]);
	let loading = $state(true);
	let errorMessage = $state(null);

	// Post a Task Form State
	let showPostForm = $state(false);
	let posting = $state(false);
	let postError = $state(null);
	let taskTitle = $state('');
	let taskCategory = $state('Digital Operations');
	let taskBudget = $state(1000);
	let taskDuration = $state(7);
	let taskPaid = $state(true);
	let taskDescription = $state('');
	let taskRequiredTier = $state('ALL');

	// Assign Task Modal State
	let assignModalOpen = $state(false);
	let selectedTaskToAssign = $state(null);
	let youthIdToAssign = $state('');
	let applicants = $state([]);
	let loadingApplicants = $state(false);
	let applicantError = $state(null);
	let assigning = $state(false);

	// Verify Experience Modal State
	let verifyModalOpen = $state(false);
	let selectedTaskToVerify = $state(null);
	let verifyRating = $state(5);
	let verifyFeedback = $state('');
	let verifyReference = $state('');
	let verifying = $state(false);

	// Send Back for Revision Modal State
	let rejectModalOpen = $state(false);
	let selectedTaskToReject = $state(null);
	let rejectReason = $state('');
	let rejecting = $state(false);

	const categories = [
		'Digital Operations',
		'Marketing & Creative',
		'Accounting & Finance',
		'IT & Technical',
		'Customer Support',
		'General Administration'
	];

	const tierOptions = [
		{ value: 'ALL', label: 'All tiers — open to every candidate' },
		{ value: 'TIER_0', label: 'Tier 0+ — first opportunity' },
		{ value: 'TIER_1', label: 'Tier 1+ — one verified experience' },
		{ value: 'TIER_2', label: 'Tier 2+ — three verified experiences' },
		{ value: 'TIER_3', label: 'Tier 3 — alumni leader only' }
	];

	const templates = [
		{
			id: 'social-sprint',
			label: 'Social media sprint',
			kicker: 'MARKETING',
			title: 'Social Media Campaign & Content Creation',
			category: 'Marketing & Creative',
			budget: 850,
			duration: 4,
			requiredTier: 'TIER_1',
			description:
				'Create 12 branded social posts and schedule three short-form videos around a product or service launch. Deliver captions, hashtags and a simple posting calendar.'
		},
		{
			id: 'data-cleanup',
			label: 'Spreadsheet rescue',
			kicker: 'OPERATIONS',
			title: 'Data Cleanup & Weekly Reporting',
			category: 'Digital Operations',
			budget: 1100,
			duration: 5,
			requiredTier: 'TIER_1',
			description:
				'Clean an existing supplier or customer list, remove duplicates, standardise fields and build a one-page weekly summary dashboard with clear notes for the team.'
		},
		{
			id: 'customer-followup',
			label: 'Customer follow-up',
			kicker: 'SUPPORT',
			title: 'Customer Follow-up & CRM Notes',
			category: 'Customer Support',
			budget: 650,
			duration: 3,
			requiredTier: 'ALL',
			description:
				'Contact a supplied list of recent customers to confirm details, answer basic questions and capture concise notes in the CRM. Escalate unresolved issues to the owner.'
		},
		{
			id: 'invoice-pack',
			label: 'Invoice & bookkeeping',
			kicker: 'FINANCE',
			title: 'Invoice Reconciliation & Bookkeeping Pack',
			category: 'Accounting & Finance',
			budget: 1300,
			duration: 7,
			requiredTier: 'TIER_2',
			description:
				'Reconcile bank transactions against invoices, flag missing supporting documents and prepare a tidy month-end pack with a short summary of unresolved items.'
		}
	];

	const verificationPayout = $derived.by(() => {
		const total = Number(selectedTaskToVerify?.budget || 0);
		const platformFee = Math.round(total * 0.1 * 100) / 100;
		return { total, platformFee, youthAmount: Math.round((total - platformFee) * 100) / 100 };
	});

	function prepareTemplate(template) {
		showPostForm = true;
		postError = null;
		taskTitle = template.title;
		taskCategory = template.category;
		taskBudget = template.budget;
		taskDuration = template.duration;
		taskDescription = template.description;
		taskRequiredTier = template.requiredTier;
		taskPaid = true;
		setTimeout(() => {
			document.getElementById('postTaskForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 60);
	}

	async function loadTasks() {
		loading = true;
		errorMessage = null;
		try {
			const res = await api.tasks.mine();
			tasks = Array.isArray(res) ? res : [];
		} catch (err) {
			console.error('Failed to load SME tasks:', err);
			errorMessage = err.message || 'Could not load your tasks.';
		} finally {
			loading = false;
		}
	}

	async function handlePostTask(event) {
		event?.preventDefault();
		if (!taskTitle.trim()) {
			postError = 'Please provide a task title.';
			return;
		}

		posting = true;
		postError = null;

		const payload = {
			title: taskTitle.trim(),
			description: taskDescription.trim(),
			category: taskCategory,
			budget: Number(taskBudget) || 0,
			durationDays: Number(taskDuration) || 7,
			isPaid: Boolean(taskPaid),
			requiredTier: taskRequiredTier
		};

		try {
			const created = await api.tasks.create(payload);
			toast.success(`Task "${created.title}" published!`);
			showPostForm = false;
			taskTitle = '';
			taskDescription = '';
			taskBudget = 1000;
			taskDuration = 7;
			taskRequiredTier = 'ALL';
			await loadTasks();
		} catch (err) {
			postError = err.message || 'Failed to post task.';
		} finally {
			posting = false;
		}
	}

	async function openAssignModal(task) {
		selectedTaskToAssign = task;
		youthIdToAssign = '';
		applicants = [];
		applicantError = null;
		assignModalOpen = true;
		loadingApplicants = true;
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
		if (!selectedTaskToAssign || !targetYouthId) return;

		assigning = true;
		try {
			await api.tasks.assign(selectedTaskToAssign.id, targetYouthId);
			const chosen = applicants.find(
				(a) => String(a.youthId) === targetYouthId
			);
			toast.success(
				`Task assigned to ${chosen?.youthName || `Youth #${targetYouthId}`}!`
			);
			assignModalOpen = false;
			await loadTasks();
		} catch (err) {
			toast.error(err.message || 'Failed to assign task.');
		} finally {
			assigning = false;
		}
	}

	function openVerifyModal(task) {
		selectedTaskToVerify = task;
		verifyRating = 5;
		verifyFeedback = '';
		verifyReference = '';
		verifyModalOpen = true;
	}

	async function handleVerifySubmit() {
		if (!selectedTaskToVerify) return;
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

		verifying = true;
		try {
			await api.tasks.verify(
				selectedTaskToVerify.id,
				verifyFeedback.trim(),
				verifyRating,
				verifyReference.trim()
			);
			toast.success('Experience verified, payment created and ledger entry sealed!');
			verifyModalOpen = false;
			await loadTasks();
		} catch (err) {
			toast.error(err.message || 'Failed to verify experience.');
		} finally {
			verifying = false;
		}
	}

	function openRejectModal(task) {
		selectedTaskToReject = task;
		rejectReason = '';
		rejectModalOpen = true;
	}

	async function handleRejectSubmit() {
		if (!selectedTaskToReject) return;
		if (!rejectReason.trim()) {
			toast.error('A revision reason is required.');
			return;
		}

		rejecting = true;
		try {
			await api.tasks.reject(selectedTaskToReject.id, rejectReason.trim());
			toast.success('Task sent back to the youth for revision.');
			rejectModalOpen = false;
			await loadTasks();
		} catch (err) {
			toast.error(err.message || 'Failed to send task back for revision.');
		} finally {
			rejecting = false;
		}
	}

	onMount(() => {
		loadTasks();
	});
</script>

<svelte:head>
	<title>SME Partner Dashboard | Shared Services Hub</title>
</svelte:head>

<RoleGuard allowedRoles={['SME', 'ADMIN']}>
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="border border-[#C8D4E8] bg-white p-8 shadow-xs mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-l-4 border-l-[#1446A0]">
			<div>
				<div class="inline-flex items-center gap-1.5 bg-[#EFF4FF] border border-[#C8D4E8] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#1446A0] uppercase mb-2">
					<span>SME ENTERPRISE PARTNER</span>
				</div>
				<h1 class="font-serif text-3xl sm:text-4xl font-normal text-[#0D1B3E] tracking-tight">
					Welcome, {user?.businessName || user?.name || 'SME Partner'}
				</h1>
				<p class="mt-1 text-sm text-[#465A7A] max-w-xl font-sans">
					Post high-priority tasks at zero cost. Corporates fund the youth wages, providing your business with operational leverage.
				</p>
			</div>

			<div class="flex items-center gap-3">
				<button
					type="button"
					class="cape-btn-primary px-5 py-3 text-xs font-mono uppercase tracking-widest shadow-xs flex items-center gap-2"
					onclick={() => (showPostForm = !showPostForm)}
				>
					<span>{showPostForm ? '✕ Close Form' : '+ Post New Task'}</span>
				</button>
			</div>
		</div>

		<!-- Error Banner -->
		<ApiError message={errorMessage} onretry={loadTasks} />

		<!-- Section: Post a Task Form (Sharp, Cape Cobalt) -->
		{#if showPostForm}
			<div id="postTaskForm" class="border-2 border-[#1446A0] bg-white p-6 sm:p-8 mb-8 shadow-md">
				<div class="flex items-center justify-between pb-4 border-b border-[#C8D4E8] mb-6">
					<div>
						<h2 class="font-serif text-2xl text-[#0D1B3E]">Post a New SME Task (Free)</h2>
						<p class="text-xs text-[#6A84AC] font-sans">Funded by Corporate Enterprise Development reserves.</p>
					</div>
					<button
						type="button"
						class="text-[#6A84AC] hover:text-[#0D1B3E] p-1 font-mono text-sm"
						onclick={() => (showPostForm = false)}
						aria-label="Close form"
					>
						[ESC]
					</button>
				</div>

				<ApiError message={postError} ondismiss={() => (postError = null)} />

				<!-- Templates -->
				<div class="mb-6 border border-[#C8D4E8] bg-[#F8F9FC] p-4">
					<div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#D4831A]">Start from a template</div>
							<p class="mt-0.5 text-[11px] text-[#6A84AC] font-sans">Pre-fills the brief, category, wage and preferred tier. Edit anything before publishing.</p>
						</div>
						<span class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">4 ready-to-use briefs</span>
					</div>
					<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
						{#each templates as template, index}
							<button
								type="button"
								class="border border-[#C8D4E8] bg-white p-3 text-left hover:border-[#1446A0] hover:bg-[#EFF4FF] transition-colors"
								onclick={() => prepareTemplate(template)}
							>
								<div class="flex items-center justify-between gap-2">
									<span class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#1446A0]">{template.kicker}</span>
									<span class="font-mono text-[9px] text-[#6A84AC]">0{index + 1}</span>
								</div>
								<div class="mt-1 font-serif text-base text-[#0D1B3E]">{template.label}</div>
								<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									{formatCurrency(template.budget)} · {template.duration}d · {formatTier(template.requiredTier, true)}
								</div>
							</button>
						{/each}
					</div>
				</div>

				<form onsubmit={handlePostTask} class="space-y-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Title -->
						<div class="md:col-span-2">
							<label for="taskTitle" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
								Task Title *
							</label>
							<input
								id="taskTitle"
								type="text"
								required
								maxlength="200"
								bind:value={taskTitle}
								placeholder="e.g. Social Media Design & Scheduling"
								class="cape-input mt-1.5 block w-full px-4 py-2.5 text-sm"
							/>
						</div>

						<!-- Category -->
						<div>
							<label for="taskCategory" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
								Category *
							</label>
							<select
								id="taskCategory"
								bind:value={taskCategory}
								class="cape-input mt-1.5 block w-full px-4 py-2.5 text-sm"
							>
								{#each categories as cat}
									<option value={cat}>{cat}</option>
								{/each}
							</select>
						</div>

						<!-- Budget (Corporate Funded) -->
						<div>
							<label for="taskBudget" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
								Youth Wage Budget (ZAR)
							</label>
							<div class="relative mt-1.5">
								<span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#6A84AC] text-sm font-mono font-bold">
									R
								</span>
								<input
									id="taskBudget"
									type="number"
									step="50"
									min="0"
									bind:value={taskBudget}
									class="cape-input block w-full pl-8 pr-4 py-2.5 text-sm font-mono font-semibold"
								/>
							</div>
						</div>

						<!-- Duration Days -->
						<div>
							<label for="taskDuration" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
								Duration (Days)
							</label>
							<input
								id="taskDuration"
								type="number"
								min="1"
								max="90"
								bind:value={taskDuration}
								class="cape-input mt-1.5 block w-full px-4 py-2.5 text-sm font-mono"
							/>
						</div>

						<!-- Preferred Tier -->
						<div>
							<label for="taskRequiredTier" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
								Preferred Candidate Tier
							</label>
							<select
								id="taskRequiredTier"
								bind:value={taskRequiredTier}
								class="cape-input mt-1.5 block w-full px-4 py-2.5 text-sm"
							>
								{#each tierOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							<p class="mt-1 text-[10px] text-[#6A84AC] font-sans">
								Guidance only. Lower-tier candidates can still apply; the ranking shows the fit.
							</p>
						</div>

						<!-- Paid Flag -->
						<div class="flex items-center pt-6">
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									bind:checked={taskPaid}
									class="h-4 w-4 rounded-none text-[#1446A0] focus:ring-0 border-[#C8D4E8]"
								/>
								<span class="text-sm font-sans font-semibold text-[#0D1B3E]">
									Corporate Sponsored Stipend
								</span>
							</label>
						</div>

						<!-- Description -->
						<div class="md:col-span-2">
							<label for="taskDescription" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
								Detailed Deliverables &amp; Requirements
							</label>
							<textarea
								id="taskDescription"
								rows="3"
								maxlength="1000"
								bind:value={taskDescription}
								placeholder="Describe the objectives, deliverables, and expectations..."
								class="cape-input mt-1.5 block w-full px-4 py-2.5 text-sm"
							></textarea>
						</div>
					</div>

					<div class="flex items-center justify-end gap-3 pt-4 border-t border-[#C8D4E8]">
						<button
							type="button"
							class="cape-btn-secondary px-4 py-2.5 text-xs font-mono uppercase tracking-wider"
							onclick={() => (showPostForm = false)}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={posting}
							class="cape-btn-primary px-6 py-2.5 text-xs font-mono uppercase tracking-widest disabled:opacity-50"
						>
							{posting ? 'Publishing...' : 'Commit Task to Hub'}
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Section: My Tasks Management -->
		<div class="space-y-4">
			<div class="flex items-center justify-between border-b border-[#C8D4E8] pb-3">
				<div>
					<h2 class="font-serif text-2xl text-[#0D1B3E]">My Posted Tasks</h2>
					<p class="text-xs text-[#6A84AC] font-sans">Track assignments, progress, and verify completed work records.</p>
				</div>
				<span class="font-mono text-xs font-bold text-[#1446A0] bg-[#EFF4FF] border border-[#C8D4E8] px-2.5 py-0.5">
					{tasks.length} TOTAL
				</span>
			</div>

			{#if loading}
				<div class="space-y-3">
					{#each Array(3) as _}
						<div class="h-28 border border-[#C8D4E8] bg-white animate-pulse"></div>
					{/each}
				</div>
			{:else if tasks.length === 0}
				<div class="border border-dashed border-[#C8D4E8] bg-white p-12 text-center">
					<h3 class="font-serif text-lg text-[#0D1B3E]">No tasks created yet</h3>
					<p class="mt-1 text-xs text-[#6A84AC] max-w-sm mx-auto">
						Start delegating work to skilled youth program alumni.
					</p>
					<div class="mt-4">
						<button
							type="button"
							class="cape-btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
							onclick={() => (showPostForm = true)}
						>
							Post Task Now
						</button>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					{#each tasks as task (task.id)}
						<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-[#1446A0] transition-colors">
							<div class="space-y-2 flex-1">
								<div class="flex items-center gap-3 flex-wrap">
									<StatusBadge status={task.status} />
									<span class="bg-[#EFF4FF] border border-[#C8D4E8] px-2 py-0.5 text-xs font-mono text-[#1446A0]">
										{task.category}
									</span>
									{#if task.requiredTier}
										<span class="border border-[#7C3FE4]/40 bg-[#F5EEFF] px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#7C3FE4]">
											{formatTier(task.requiredTier, true)}
										</span>
									{/if}
									<span class="text-xs font-mono text-[#6A84AC]">
										Created {formatDate(task.createdAt)}
									</span>
								</div>

								<h3 class="font-serif text-xl text-[#0D1B3E]">
									<a href={`/tasks/${task.id}`} class="hover:text-[#1446A0] hover:underline">
										{task.title}
									</a>
								</h3>

								{#if task.description && !$lowDataMode}
									<p class="text-xs text-[#465A7A] line-clamp-1 max-w-2xl font-sans">{task.description}</p>
								{/if}

								<div class="flex items-center gap-4 text-xs font-mono text-[#6A84AC] pt-1">
									<span class="font-bold text-[#1446A0]">{formatCurrency(task.budget)}</span>
									<span>•</span>
									<span>{formatDuration(task.durationDays)}</span>
									{#if task.assignedToName}
										<span>•</span>
										<span class="text-[#0D1B3E] font-semibold">Assigned: {task.assignedToName}</span>
									{/if}
								</div>
							</div>

							<!-- Action Buttons -->
							<div class="flex items-center gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#C8D4E8] flex-wrap">
								{#if task.status === 'OPEN'}
									<button
										type="button"
										class="border border-[#1446A0] bg-[#EFF4FF] px-4 py-2 text-xs font-mono uppercase tracking-wider font-bold text-[#1446A0] hover:bg-[#1446A0] hover:text-white transition-colors"
										onclick={() => openAssignModal(task)}
									>
										Review Applicants
									</button>
								{:else if task.status === 'IN_PROGRESS'}
									<span class="border border-[#C8D4E8] bg-[#F8F9FC] px-3 py-1.5 text-xs font-mono font-bold text-[#6A84AC] uppercase">
										Awaiting Completion
									</span>
								{:else if task.status === 'COMPLETED'}
									<button
										type="button"
										class="bg-[#7C3FE4] px-4 py-2 text-xs font-mono uppercase tracking-wider font-bold text-white shadow-xs hover:bg-[#682ec7] transition-colors"
										onclick={() => openVerifyModal(task)}
									>
										Verify Experience
									</button>
									<button
										type="button"
										class="border border-[#C49420] bg-[#FFF8E6] px-3.5 py-2 text-xs font-mono uppercase tracking-wider font-bold text-[#8A6A12] hover:bg-[#C49420] hover:text-white transition-colors"
										onclick={() => openRejectModal(task)}
									>
										Revise
									</button>
								{:else if task.status === 'VERIFIED'}
									<span class="border border-[#7C3FE4] bg-[#F5EEFF] px-3 py-1.5 text-xs font-mono font-bold text-[#7C3FE4] uppercase">
										✓ Verified in Ledger
									</span>
								{/if}

								<a
									href={`/tasks/${task.id}`}
									class="border border-[#C8D4E8] px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-[#0D1B3E] hover:bg-[#F8F9FC] transition-colors"
								>
									Details
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</RoleGuard>

<!-- Modal: Review Applicants and Assign (Sharp) -->
<Modal
	bind:open={assignModalOpen}
	title={`Review Applicants: ${selectedTaskToAssign?.title || ''}`}
	size="xl"
>
	<div class="space-y-4">
		<p class="text-xs text-[#465A7A] leading-relaxed font-sans">
			Open an applicant's profile to review their bio, skills, education, availability, portfolio and
			cover note. Assigning accepts that application, releases the other pending applicants and moves
			the task to
			<span class="font-mono font-bold text-[#D4831A]">IN_PROGRESS</span>.
		</p>

		<ApplicantReview
			bind:selectedYouthId={youthIdToAssign}
			{applicants}
			task={selectedTaskToAssign}
			loading={loadingApplicants}
			error={applicantError}
			assigning={assigning}
			onassign={handleAssignSubmit}
			onretry={() => openAssignModal(selectedTaskToAssign)}
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
	title={`Verify Work: ${selectedTaskToVerify?.title || ''}`}
>
	<div class="space-y-4">
		<p class="text-xs text-[#465A7A] leading-relaxed font-sans">
			Your evaluation unlocks the candidate's guaranteed corporate wage disbursement and adds permanent proof to their Experience Ledger.
		</p>

		<div class="grid grid-cols-3 gap-2 border border-[#C8D4E8] bg-[#F8F9FC] p-3">
			<div>
				<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Wage reserve</div>
				<div class="mt-1 font-mono text-sm font-bold text-[#1446A0]">{formatCurrency(verificationPayout.total)}</div>
			</div>
			<div>
				<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Platform fee</div>
				<div class="mt-1 font-mono text-sm font-bold text-[#6A84AC]">{formatCurrency(verificationPayout.platformFee)}</div>
			</div>
			<div>
				<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Youth receives</div>
				<div class="mt-1 font-mono text-sm font-bold text-[#1A8A55]">{formatCurrency(verificationPayout.youthAmount)}</div>
			</div>
		</div>

		<div>
			<div class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E] mb-1.5">
				Performance Rating (1 to 5 Stars) *
			</div>
			<StarRating bind:rating={verifyRating} interactive={true} size="lg" />
			<p class="mt-1 font-sans text-[10px] text-[#6A84AC]">The rating is permanent. It feeds the youth’s tier progress and public proof record.</p>
		</div>

		<div>
			<label for="verifyFeedbackInput" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
				Written Recommendation &amp; Feedback *
			</label>
			<textarea
				id="verifyFeedbackInput"
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
			<label for="verifyReferenceInput" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
				Evidence Reference *
			</label>
			<input
				id="verifyReferenceInput"
				type="text"
				maxlength="255"
				bind:value={verifyReference}
				placeholder="e.g. Reconciled workbook FIN-MAR-2026.xlsx"
				class="cape-input mt-1.5 block w-full px-4 py-2.5 text-sm font-sans"
			/>
			<p class="mt-1 font-sans text-[11px] text-[#6A84AC]">
				This reference is sealed into the public ledger entry for the experience.
			</p>
		</div>

		<div class="border border-[#7C3FE4]/30 bg-[#FAF8FF] p-3">
			<div class="font-mono text-[9px] font-bold uppercase tracking-widest text-[#7C3FE4]">What happens when you sign</div>
			<ol class="mt-1.5 space-y-1 text-[11px] leading-relaxed text-[#465A7A] font-sans">
				<li>1. The task is marked verified and the youth’s ledger record is sealed.</li>
				<li>2. A payment is queued for admin release at the amount shown above.</li>
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
			disabled={verifying}
			class="bg-[#7C3FE4] text-white px-5 py-2 text-xs font-mono uppercase tracking-widest font-bold hover:bg-[#682ec7] disabled:opacity-50"
			onclick={handleVerifySubmit}
		>
			{verifying ? 'Verifying...' : 'Sign & Record to Ledger'}
		</button>
	{/snippet}
</Modal>

<!-- Modal: Send Back for Revision -->
<Modal
	bind:open={rejectModalOpen}
	title={`Request Revision: ${selectedTaskToReject?.title || ''}`}
>
	<div class="space-y-4">
		<p class="text-xs text-[#465A7A] leading-relaxed font-sans">
			The task returns to <span class="font-mono font-bold text-[#D4831A]">IN_PROGRESS</span> for the
			same youth. No payment is created until the resubmitted work is verified.
		</p>

		<div>
			<label for="rejectReasonInput" class="block text-xs font-mono font-bold uppercase tracking-wider text-[#0D1B3E]">
				What needs to change? *
			</label>
			<textarea
				id="rejectReasonInput"
				rows="3"
				bind:value={rejectReason}
				placeholder="e.g. Please attach the signed delivery note and correct the invoice totals."
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
			disabled={rejecting}
			class="bg-[#C49420] text-white px-5 py-2 text-xs font-mono uppercase tracking-widest font-bold hover:bg-[#a87c14] disabled:opacity-50"
			onclick={handleRejectSubmit}
		>
			{rejecting ? 'Sending...' : 'Send Back for Revision'}
		</button>
	{/snippet}
</Modal>
