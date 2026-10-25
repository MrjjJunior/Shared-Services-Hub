<script>
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import ExperienceCard from '$lib/components/ExperienceCard.svelte';
	import ApiError from '$lib/components/ApiError.svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import TierProgress from '$lib/components/TierProgress.svelte';
	import CareerPath from '$lib/components/CareerPath.svelte';
	import { api } from '$lib/api.js';
	import { currentUser } from '$lib/stores/auth.js';
	import {
		localYouthProfile,
		lowDataMode,
		skillsCheck
	} from '$lib/stores/preferences.js';
	import { toast } from '$lib/stores/toast.js';
	import {
		formatCurrency,
		formatDate,
		formatTier,
		tierIndex as tierNumber
	} from '$lib/utils/formatters.js';
	import { onMount } from 'svelte';

	const user = $derived($currentUser);

	let tasks = $state([]);
	let taskDetails = $state([]);
	let experiences = $state([]);
	let payments = $state([]);
	let applications = $state([]);
	let youthProfile = $state(null);
	let tierInfo = $state(null);
	let loadingTasks = $state(true);
	let loadingExp = $state(true);
	let loadingPayments = $state(true);
	let loadingApplications = $state(true);
	let loadingProfile = $state(true);
	let errorMessage = $state(null);
	let applicationsError = $state(null);

	// Apply modal
	let applyModalOpen = $state(false);
	let selectedTaskToApply = $state(null);
	let applyReason = $state('');
	let applyCoverNote = $state('');
	let applying = $state(false);

	// Withdraw modal
	let withdrawModalOpen = $state(false);
	let selectedApplicationToWithdraw = $state(null);
	let withdrawing = $state(false);

	// Complete modal
	let completeModalOpen = $state(false);
	let selectedApplicationToComplete = $state(null);
	let completing = $state(false);

	// Profile modal
	let profileModalOpen = $state(false);
	let profileSaving = $state(false);
	let profileError = $state(null);
	let profileForm = $state({
		education: '',
		skills: '',
		portfolio: '',
		bio: '',
		location: '',
		availability: ''
	});

	const isAlumni = $derived(Boolean(youthProfile?.isAlumni ?? youthProfile?.alumni));
	const profileSkills = $derived(
		(youthProfile?.skills || $localYouthProfile?.skills || '')
			.split(/[,;]/)
			.map((skill) => skill.trim())
			.filter(Boolean)
	);
	const needsSkillsCheck = $derived(
		!loadingProfile && profileSkills.length === 0 && !$skillsCheck
	);

	// Summary stats
	const verifiedExperiences = $derived(experiences.filter((e) => e.isVerified));
	const averageRating = $derived.by(() => {
		const rated = verifiedExperiences.filter((e) => e.rating);
		if (rated.length === 0) return '5.0';
		const sum = rated.reduce((acc, curr) => acc + Number(curr.rating), 0);
		return (sum / rated.length).toFixed(1);
	});

	const paidPayments = $derived(payments.filter((payment) => payment.status === 'PAID'));
	const pendingPayments = $derived(payments.filter((payment) => payment.status !== 'PAID'));
	const totalEarned = $derived(
		paidPayments.reduce((sum, payment) => sum + Number(payment.youthAmount || 0), 0)
	);
	const pendingEarnings = $derived(
		pendingPayments.reduce((sum, payment) => sum + Number(payment.youthAmount || 0), 0)
	);
	const platformFees = $derived(
		payments.reduce((sum, payment) => sum + Number(payment.platformFee || 0), 0)
	);

	const activeReservations = $derived(
		tierInfo?.activeReservations ?? applications.filter((a) => a.status === 'PENDING').length
	);
	const reservationLimitLabel = $derived(
		tierInfo
			? tierInfo.maxConcurrentReservations >= 1000
				? 'Unlimited'
				: tierInfo.maxConcurrentReservations
			: '—'
	);

	const taskById = $derived.by(() => {
		const map = {};
		[...tasks, ...taskDetails].forEach((task) => {
			if (task?.id !== undefined && task?.id !== null) {
				map[String(task.id)] = task;
			}
		});
		return map;
	});

	const applicationsWithTasks = $derived(
		applications.map((application) => {
			const task = taskById[String(application.taskId)] || {
				id: application.taskId,
				title: application.taskTitle,
				status: 'UNKNOWN',
				category: 'Task',
				budget: 0,
				durationDays: 0
			};
			return { ...application, task };
		})
	);

	function applicationPhase(application) {
		if (application.status === 'PENDING') return 'reserved';
		if (application.status !== 'ACCEPTED') return 'closed';
		const taskStatus = application.task?.status;
		if (taskStatus === 'VERIFIED') return 'verified';
		if (taskStatus === 'COMPLETED') return 'awaiting';
		return 'active';
	}

	const reservedApplications = $derived(
		applicationsWithTasks.filter((application) => applicationPhase(application) === 'reserved')
	);
	const activeApplications = $derived(
		applicationsWithTasks.filter((application) =>
			['active', 'awaiting'].includes(applicationPhase(application))
		)
	);
	const appliedTaskIds = $derived(
		new Set(
			applications
				.filter((application) => ['PENDING', 'ACCEPTED'].includes(application.status))
				.map((application) => String(application.taskId))
		)
	);

	const openTasks = $derived(tasks.filter((task) => task.status === 'OPEN'));

	const matchedTasks = $derived.by(() => {
		const currentTier = tierNumber(tierInfo?.tier || 'TIER_0');
		return openTasks
			.filter((task) => !appliedTaskIds.has(String(task.id)))
			.map((task) => {
				const required = tierNumber(task.requiredTier || 'TIER_0');
				const eligible = currentTier >= required;
				const categoryMatch = profileSkills.some((skill) =>
					task.category?.toLowerCase().includes(skill.toLowerCase())
				);
				return {
					task,
					whyMatch: buildWhyMatch(task),
					eligible,
					categoryMatch,
					score: (eligible ? 10 : 0) + (categoryMatch ? 5 : 0) + Number(task.budget || 0) / 10000
				};
			})
			.sort((a, b) => b.score - a.score);
	});

	const visibleMatchedTasks = $derived(
		$lowDataMode ? matchedTasks.slice(0, 3) : matchedTasks.slice(0, 6)
	);

	const categoryHints = {
		'Digital Operations': ['data', 'excel', 'crm', 'digital', 'catalog', 'web', 'content', 'admin'],
		'Marketing & Creative': ['social', 'canva', 'copy', 'design', 'content', 'photo', 'brand'],
		'Accounting & Finance': ['bookkeep', 'excel', 'invoice', 'reconcil', 'finance', 'data', 'account'],
		'IT & Technical': ['it', 'support', 'hardware', 'pos', 'technical', 'web', 'data'],
		'Customer Support': ['customer', 'support', 'call', 'crm', 'communication', 'sales'],
		'General Administration': ['admin', 'excel', 'data', 'research', 'organis']
	};

	function buildWhyMatch(task) {
		const reasons = [];
		const title = (task.title || '').toLowerCase();
		const category = task.category || '';
		const hints = categoryHints[category] || [];
		const matchingSkills = profileSkills.filter((skill) => {
			const lower = skill.toLowerCase();
			const words = lower.split(/\s+/).filter((word) => word.length > 3);
			return (
				words.some((word) => title.includes(word)) ||
				hints.some((hint) => lower.includes(hint) || hint.includes(lower)) ||
				category.toLowerCase().includes(lower)
			);
		});
		if (matchingSkills.length > 0) {
			reasons.push(`Your ${matchingSkills.slice(0, 2).join(' + ')} skills fit this brief`);
		}

		if (task.requiredTier) {
			const currentTier = tierNumber(tierInfo?.tier || 'TIER_0');
			const required = tierNumber(task.requiredTier);
			if (currentTier >= required) {
				reasons.push(`You meet the ${formatTier(task.requiredTier, true)} guidance`);
			} else {
				reasons.push(`Stretch brief: ${formatTier(task.requiredTier, true)} preferred — apply and let the SME decide`);
			}
		}

		if (task.durationDays && Number(task.durationDays) <= 3) {
			reasons.push(`A ${task.durationDays}-day sprint that fits a short window`);
		}
		if (Number(task.budget) >= 1000) {
			reasons.push(`${formatCurrency(task.budget)} corporate wage reserve`);
		}
		if (reasons.length === 0) {
			reasons.push('Open to every tier with a guaranteed corporate-funded wage');
		}
		return reasons.slice(0, 2).join(' · ');
	}

	function isNetworkError(error) {
		const message = String(error?.message || '').toLowerCase();
		return (
			message.includes('fetch') ||
			message.includes('connect') ||
			message.includes('network') ||
			message.includes('unavailable')
		);
	}

	async function loadDashboardData() {
		errorMessage = null;
		applicationsError = null;
		loadingTasks = true;
		loadingProfile = true;
		loadingExp = true;
		loadingPayments = true;
		loadingApplications = true;

		const [taskResult, profileResult, paymentResult, applicationResult, tierResult] =
			await Promise.allSettled([
				api.tasks.list(),
				api.youth.me(),
				api.payments.mine(),
				api.applications.mine(),
				api.tiers.me()
			]);

		if (taskResult.status === 'fulfilled') {
			tasks = Array.isArray(taskResult.value) ? taskResult.value : [];
		} else {
			console.error('Failed to load tasks:', taskResult.reason);
			errorMessage = taskResult.reason?.message || 'Could not load tasks.';
		}
		loadingTasks = false;

		if (profileResult.status === 'fulfilled') {
			youthProfile = profileResult.value;
			localYouthProfile.set(profileResult.value);
		} else {
			console.warn('Could not resolve youth profile:', profileResult.reason);
			youthProfile = $localYouthProfile;
		}
		loadingProfile = false;

		if (paymentResult.status === 'fulfilled') {
			payments = Array.isArray(paymentResult.value) ? paymentResult.value : [];
		} else {
			console.error('Failed to load payments:', paymentResult.reason);
		}
		loadingPayments = false;

		if (tierResult.status === 'fulfilled') {
			tierInfo = tierResult.value;
		} else {
			console.error('Failed to load tier:', tierResult.reason);
		}

		if (applicationResult.status === 'fulfilled') {
			applications = Array.isArray(applicationResult.value) ? applicationResult.value : [];
		} else {
			console.error('Failed to load applications:', applicationResult.reason);
			applicationsError = applicationResult.reason?.message || 'Could not load your applications.';
			applications = [];
		}

		const youthId = youthProfile?.id;
		if (youthId) {
			try {
				const experienceRes = await api.experiences.listForYouth(youthId);
				experiences = Array.isArray(experienceRes) ? experienceRes : [];
			} catch (err) {
				console.error('Failed to load experience ledger:', err);
			}
		}
		loadingExp = false;

		// The public task feed only contains OPEN work. Fetch the linked task
		// for every application so "My Tasks" can show its real lifecycle state.
		const knownTaskIds = new Set(tasks.map((task) => String(task.id)));
		const idsToFetch = [
			...new Set(
				applications
					.map((application) => String(application.taskId))
					.filter((id) => !knownTaskIds.has(id))
			)
		];
		const detailResults = await Promise.all(
			idsToFetch.map((id) => api.tasks.get(id).catch(() => null))
		);
		taskDetails = detailResults.filter(Boolean);
		loadingApplications = false;
	}

	async function refreshApplicationsAndTier() {
		try {
			const [applicationRes, tierRes, tasksRes] = await Promise.all([
				api.applications.mine(),
				api.tiers.me(),
				api.tasks.list()
			]);
			applications = Array.isArray(applicationRes) ? applicationRes : [];
			tierInfo = tierRes;
			tasks = Array.isArray(tasksRes) ? tasksRes : [];
			const knownTaskIds = new Set(tasks.map((task) => String(task.id)));
			const idsToFetch = [
				...new Set(
					applications
						.map((application) => String(application.taskId))
						.filter((id) => !knownTaskIds.has(id))
				)
			];
			const detailResults = await Promise.all(
				idsToFetch.map((id) => api.tasks.get(id).catch(() => null))
			);
			taskDetails = detailResults.filter(Boolean);
		} catch (err) {
			console.error('Failed to refresh applications:', err);
		}
	}

	function openApplyModal(task) {
		selectedTaskToApply = task;
		applyReason = buildWhyMatch(task);
		applyCoverNote = profileSkills.length
			? `I can bring ${profileSkills.slice(0, 2).join(' and ')} to this brief.`
			: '';
		applyModalOpen = true;
	}

	async function submitApplication() {
		if (!selectedTaskToApply) return;
		applying = true;
		try {
			const created = await api.applications.apply(
				selectedTaskToApply.id,
				applyCoverNote.trim()
			);
			toast.success(
				'Application submitted. The task is reserved for you for 48 hours while the SME reviews it.'
			);
			applyModalOpen = false;
			applications = [created, ...applications.filter((a) => a.id !== created.id)];
			await refreshApplicationsAndTier();
		} catch (err) {
			toast.error(err.message || 'Failed to apply for this task.');
		} finally {
			applying = false;
		}
	}

	function openWithdrawModal(application) {
		selectedApplicationToWithdraw = application;
		withdrawModalOpen = true;
	}

	async function confirmWithdraw() {
		if (!selectedApplicationToWithdraw) return;
		withdrawing = true;
		try {
			await api.applications.withdraw(selectedApplicationToWithdraw.id);
			toast.success('Application withdrawn. Your reservation has been released.');
			withdrawModalOpen = false;
			await refreshApplicationsAndTier();
		} catch (err) {
			toast.error(err.message || 'Failed to withdraw application.');
		} finally {
			withdrawing = false;
		}
	}

	function openCompleteModal(application) {
		selectedApplicationToComplete = application;
		completeModalOpen = true;
	}

	async function confirmComplete() {
		if (!selectedApplicationToComplete) return;
		completing = true;
		try {
			await api.tasks.complete(selectedApplicationToComplete.taskId);
			toast.success('Task marked complete. The SME has been notified to verify your work.');
			completeModalOpen = false;
			await loadDashboardData();
		} catch (err) {
			toast.error(err.message || 'Failed to mark this task complete.');
		} finally {
			completing = false;
		}
	}

	function openProfileModal() {
		profileError = null;
		profileForm = {
			education: youthProfile?.education || '',
			skills: youthProfile?.skills || profileSkills.join(', '),
			portfolio: youthProfile?.portfolio || '',
			bio: youthProfile?.bio || '',
			location: youthProfile?.location || '',
			availability: youthProfile?.availability || ''
		};
		profileModalOpen = true;
	}

	async function saveProfile() {
		profileError = null;
		profileSaving = true;
		const payload = {
			education: profileForm.education.trim(),
			skills: profileForm.skills.trim(),
			portfolio: profileForm.portfolio.trim(),
			bio: profileForm.bio.trim(),
			location: profileForm.location.trim(),
			availability: profileForm.availability.trim()
		};

		try {
			const updated = await api.youth.update(payload);
			youthProfile = updated;
			localYouthProfile.set(updated);
			toast.success('Profile updated. Your matches will use the new details.');
			profileModalOpen = false;
		} catch (err) {
			if (isNetworkError(err)) {
				youthProfile = { ...(youthProfile || {}), ...payload };
				localYouthProfile.set(youthProfile);
				toast.warning('Profile saved locally. It will sync when the backend is reachable.');
				profileModalOpen = false;
			} else {
				profileError = err.message || 'Could not save your profile.';
			}
		} finally {
			profileSaving = false;
		}
	}

	function goToTasks() {
		if (typeof window !== 'undefined') window.location.href = '/tasks';
	}

	onMount(() => {
		loadDashboardData();
	});
</script>

<svelte:head>
	<title>Youth Candidate Dashboard | Shared Services Hub</title>
</svelte:head>

<RoleGuard allowedRoles={['YOUTH', 'ADMIN']}>
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header (Cape Cobalt Surface-Dark #0A1E4A) -->
		<div class="border border-[#C8D4E8] bg-[#0A1E4A] p-8 text-white shadow-md mb-6">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<div class="flex items-center gap-3 flex-wrap">
						<h1 class="font-serif text-3xl sm:text-4xl font-normal text-white">
							Welcome, {user?.name || 'Candidate'}
						</h1>
						{#if isAlumni}
							<span class="inline-block bg-[#1A8A55] text-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest">
								PERMANENT ALUMNI
							</span>
						{:else}
							<span class="inline-block bg-[#1446A0] text-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest border border-white/20">
								ACTIVE CANDIDATE
							</span>
						{/if}
						{#if tierInfo}
							<span class="inline-block bg-[#7C3FE4] text-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest">
								{tierInfo.tier?.replace('_', ' ')}
							</span>
						{/if}
					</div>
					<p class="mt-2 text-sm text-[#C8D4E8] max-w-xl font-light font-sans">
						Complete verified tasks for local SMEs to expand your Experience Ledger and earn corporate-funded wages.
					</p>
					{#if tierInfo}
						<p class="mt-2 font-mono text-[11px] uppercase tracking-wider text-[#9FB4D8]">
							{activeReservations} of {reservationLimitLabel} reservations in use
							· {tierInfo.verifiedExperienceCount} verified experience(s)
						</p>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-2.5">
					<button
						type="button"
						class="border border-white/30 bg-white/5 px-3.5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-[#0A1E4A] transition-colors"
						onclick={openProfileModal}
					>
						Edit Profile
					</button>
					<a
						href="/tasks"
						class="bg-white text-[#0D1B3E] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#EFF4FF] transition-colors"
					>
						Browse All Tasks
					</a>
				</div>
			</div>

			<!-- Stat Counters (Sharp, Editorial) -->
			<div class="mt-8 pt-6 border-t border-[#1C3565] grid grid-cols-2 sm:grid-cols-4 gap-4">
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Available Tasks</div>
					<div class="font-mono text-2xl font-bold mt-1 text-white">{openTasks.length}</div>
				</div>
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Verified Records</div>
					<div class="font-mono text-2xl font-bold mt-1 text-[#7C3FE4]">{verifiedExperiences.length}</div>
				</div>
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Average Rating</div>
					<div class="font-mono text-2xl font-bold mt-1 text-[#E8B830]">
						★ {averageRating}
					</div>
				</div>
				<div>
					<div class="font-mono text-[11px] font-bold uppercase tracking-wider text-[#6A84AC]">Paid To Date</div>
					<div class="font-mono text-2xl font-bold mt-1 text-[#1A8A55]">
						{loadingPayments ? '—' : formatCurrency(totalEarned)}
					</div>
				</div>
			</div>
		</div>

		{#if needsSkillsCheck}
			<div class="mb-6 border border-[#D4831A] bg-[#FFFBF2] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div>
					<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#8A5A10]">Skills check incomplete</div>
					<p class="mt-1 text-sm text-[#465A7A] font-sans">
						Add your skills, availability and location so the task feed can explain why each brief matches you.
					</p>
				</div>
				<a href="/onboarding/skills" class="shrink-0 bg-[#D4831A] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#b56c0f] transition-colors">
					Finish skills check →
				</a>
			</div>
		{/if}

		<!-- Error Banner -->
		<ApiError message={errorMessage} onretry={loadDashboardData} />

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Left Column (2 Cols) -->
			<div class="lg:col-span-2 space-y-8">
				<!-- Reserved for You -->
				<section>
					<div class="flex items-center justify-between border-b border-[#C8D4E8] pb-3">
						<div>
							<div class="flex items-center gap-2">
								<span class="h-1.5 w-1.5 bg-[#D4831A]"></span>
								<h2 class="font-serif text-2xl text-[#0D1B3E]">Reserved for You</h2>
							</div>
							<p class="text-xs text-[#6A84AC] font-sans">Pending applications hold a 48-hour reservation while the SME reviews.</p>
						</div>
						<span class="bg-[#FFFBF2] border border-[#F0DDBB] px-2 py-0.5 text-[10px] font-mono font-bold text-[#8A5A10]">
							{reservedApplications.length} HELD
						</span>
					</div>

					{#if loadingApplications}
						<div class="mt-4">
							<StatePanel kind="loading" rows={1} compact />
						</div>
					{:else if applicationsError}
						<div class="mt-4">
							<StatePanel kind="error" title="Applications unavailable" message={applicationsError} actionLabel="Retry" onaction={loadDashboardData} compact />
						</div>
					{:else if reservedApplications.length === 0}
						<div class="mt-4 border border-dashed border-[#C8D4E8] bg-white p-5">
							<p class="text-sm text-[#465A7A] font-sans">
								No reserved tasks right now. Apply for a matched brief below and it will appear here for 48 hours.
							</p>
						</div>
					{:else}
						<div class="mt-4 space-y-3">
							{#each reservedApplications as application (application.id)}
								<div class="border border-[#C8D4E8] bg-white p-5 shadow-xs border-l-4 border-l-[#D4831A]">
									<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div class="min-w-0">
											<div class="flex items-center gap-2 flex-wrap">
												<span class="bg-[#FFFBF2] border border-[#F0DDBB] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#8A5A10]">RESERVED 48H</span>
												<span class="font-mono text-[10px] text-[#6A84AC]">{application.task?.category || 'SME task'}</span>
											</div>
											<h3 class="mt-2 font-serif text-xl text-[#0D1B3E]">
												<a href={`/tasks/${application.taskId}`} class="hover:text-[#1446A0] hover:underline">{application.taskTitle}</a>
											</h3>
											<p class="mt-1 text-xs text-[#465A7A] line-clamp-2 font-sans">{application.task?.description || application.coverNote || 'Awaiting SME review.'}</p>
											<div class="mt-2 font-mono text-[10px] text-[#6A84AC]">
												Applied {formatDate(application.appliedAt, true)} · expires {formatDate(application.expiresAt, true)}
											</div>
										</div>
										<div class="flex shrink-0 flex-wrap items-center gap-2">
											<a href={`/tasks/${application.taskId}`} class="border border-[#C8D4E8] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#0D1B3E] hover:bg-[#F8F9FC]">Details</a>
											<button
												type="button"
												class="border border-[#C42B2B] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#C42B2B] hover:bg-[#FFF5F5]"
												onclick={() => openWithdrawModal(application)}
											>
												Withdraw
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Matched Open Tasks -->
				<section>
					<div class="flex items-center justify-between border-b border-[#C8D4E8] pb-3">
						<div>
							<h2 class="font-serif text-2xl text-[#0D1B3E]">Matched Open Tasks</h2>
							<p class="text-xs text-[#6A84AC] font-sans">Ranked by tier fit, your skills and the wage reserve. Every card explains why.</p>
						</div>
						<a href="/tasks" class="font-mono text-xs font-bold uppercase tracking-wider text-[#1446A0] hover:underline">
							View All ({openTasks.length}) →
						</a>
					</div>

					{#if loadingTasks}
						<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
							{#each Array($lowDataMode ? 2 : 4) as _}
								<div class="h-56 border border-[#C8D4E8] bg-white animate-pulse"></div>
							{/each}
						</div>
					{:else if openTasks.length === 0}
						<div class="mt-4">
							<StatePanel
								kind="empty"
								title="No open tasks available"
								message="Please check back shortly as new SME tasks are posted daily."
								actionLabel="Refresh"
								onaction={loadDashboardData}
							/>
						</div>
					{:else if matchedTasks.length === 0}
						<div class="mt-4">
							<StatePanel
								kind="info"
								title="You’ve applied for every open match"
								message="Your applications are being reviewed. New SME briefs appear here as soon as they are published."
								actionLabel="View my tasks"
								onaction={() => (window.location.href = '#my-tasks')}
							/>
						</div>
					{:else}
						<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
							{#each visibleMatchedTasks as matched (matched.task.id)}
								<div class="flex flex-col">
									<TaskCard task={matched.task} whyMatch={matched.whyMatch} showActions={true}>
										{#snippet actions()}
											<button
												type="button"
												class="cape-btn-primary px-3.5 py-2 text-[9px] font-mono uppercase tracking-wider"
												onclick={() => openApplyModal(matched.task)}
											>
												Apply with a note
											</button>
											<a href={`/tasks/${matched.task.id}`} class="border border-[#C8D4E8] px-3.5 py-2 text-[9px] font-mono uppercase tracking-wider text-[#0D1B3E] hover:bg-[#F8F9FC]">
												Details
											</a>
										{/snippet}
									</TaskCard>
								</div>
							{/each}
						</div>
						{#if $lowDataMode && matchedTasks.length > visibleMatchedTasks.length}
							<p class="mt-3 font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">
								Low-data mode · showing {visibleMatchedTasks.length} of {matchedTasks.length} matches.
							</p>
						{/if}
					{/if}
				</section>

				<!-- My Tasks -->
				<section id="my-tasks">
					<div class="flex items-center justify-between border-b border-[#C8D4E8] pb-3">
						<div>
							<h2 class="font-serif text-2xl text-[#0D1B3E]">My Tasks</h2>
							<p class="text-xs text-[#6A84AC] font-sans">Accepted work, submission state and the next action you can take.</p>
						</div>
						<span class="bg-[#EFF4FF] border border-[#C8D4E8] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1446A0]">
							{activeApplications.length} ACTIVE
						</span>
					</div>

					{#if loadingApplications}
						<div class="mt-4">
							<StatePanel kind="loading" rows={2} compact />
						</div>
					{:else if activeApplications.length === 0}
						<div class="mt-4">
							<StatePanel
								kind="empty"
								title="No active tasks yet"
								message="Once an SME accepts your application, the task and its next action will appear here."
								actionLabel="Find a task"
								onaction={goToTasks}
								compact
							/>
						</div>
					{:else}
						<div class="mt-4 space-y-3">
							{#each activeApplications as application (application.id)}
								{@const phase = applicationPhase(application)}
								<div class="border border-[#C8D4E8] bg-white p-5 shadow-xs">
									<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
										<div class="min-w-0">
											<div class="flex items-center gap-2 flex-wrap">
												<span class="border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider {phase === 'active' ? 'border-[#1A8A55] bg-[#EDFBF3] text-[#1A8A55]' : 'border-[#C49420] bg-[#FFF8E6] text-[#8A6A12]'}">
													{phase === 'active' ? 'IN PROGRESS' : 'AWAITING SME VERIFICATION'}
												</span>
												<span class="font-mono text-[10px] text-[#6A84AC]">{application.task?.category || 'SME task'}</span>
											</div>
											<h3 class="mt-2 font-serif text-xl text-[#0D1B3E]">
												<a href={`/tasks/${application.taskId}`} class="hover:text-[#1446A0] hover:underline">{application.taskTitle}</a>
											</h3>
											<div class="mt-1 font-mono text-[10px] text-[#6A84AC]">
												Accepted {formatDate(application.decidedAt, true)}
												{#if application.task?.smeBusinessName}
													· {application.task.smeBusinessName}
												{/if}
											</div>
											<p class="mt-2 text-xs leading-relaxed text-[#465A7A] font-sans">
												{#if phase === 'active'}
													Do the work, keep your evidence, then mark it complete so the SME can verify and release the wage.
												{:else}
													Your submission is with the SME. Verification adds a permanent record to your ledger and queues the payout.
												{/if}
											</p>
										</div>
										<div class="flex shrink-0 flex-wrap items-center gap-2">
											<a href={`/tasks/${application.taskId}`} class="border border-[#C8D4E8] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#0D1B3E] hover:bg-[#F8F9FC]">Open brief</a>
											{#if phase === 'active'}
												<button
													type="button"
													class="bg-[#1A8A55] px-3.5 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-white hover:bg-[#146e43] transition-colors"
													onclick={() => openCompleteModal(application)}
												>
													Mark complete
												</button>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>
			</div>

			<!-- Right Column -->
			<div class="space-y-6">
				<TierProgress {tierInfo} />

				<!-- Profile snapshot -->
				<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs">
					<div class="flex items-start justify-between gap-3 border-b border-[#C8D4E8] pb-3">
						<div>
							<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1446A0]">Candidate profile</div>
							<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">{user?.name || youthProfile?.userName || 'Your profile'}</h3>
						</div>
						<button type="button" class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#1446A0] hover:underline" onclick={openProfileModal}>
							Edit
						</button>
					</div>
					{#if loadingProfile}
						<div class="mt-4 space-y-2">
							<div class="h-3 w-3/4 bg-[#EFF4FF] animate-pulse"></div>
							<div class="h-3 w-1/2 bg-[#EFF4FF] animate-pulse"></div>
						</div>
					{:else}
						<div class="mt-3 space-y-2 text-xs text-[#465A7A] font-sans">
							{#if youthProfile?.education}
								<div class="flex gap-2"><span class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC] w-20 shrink-0">Education</span><span>{youthProfile.education}</span></div>
							{/if}
							{#if youthProfile?.location}
								<div class="flex gap-2"><span class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC] w-20 shrink-0">Location</span><span>{youthProfile.location}</span></div>
							{/if}
							{#if youthProfile?.availability}
								<div class="flex gap-2"><span class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC] w-20 shrink-0">Available</span><span>{youthProfile.availability}</span></div>
							{/if}
							{#if youthProfile?.portfolio}
								<div class="flex gap-2"><span class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC] w-20 shrink-0">Portfolio</span><a href={youthProfile.portfolio} target="_blank" rel="noreferrer" class="text-[#1446A0] underline truncate">{youthProfile.portfolio}</a></div>
							{/if}
						</div>
						{#if profileSkills.length > 0}
							<div class="mt-4 flex flex-wrap gap-1.5">
								{#each profileSkills as skill}
									<span class="border border-[#C8D4E8] bg-[#EFF4FF] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#1446A0]">{skill}</span>
								{/each}
							</div>
						{:else}
							<a href="/onboarding/skills" class="mt-4 inline-block border border-[#D4831A] bg-[#FFFBF2] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#8A5A10] hover:bg-[#D4831A] hover:text-white transition-colors">
								Complete skills check →
							</a>
						{/if}
					{/if}
				</div>

				<!-- Earnings -->
				<div class="border border-[#C8D4E8] bg-white p-6 shadow-xs">
					<div class="flex items-start justify-between gap-3 border-b border-[#C8D4E8] pb-3">
						<div>
							<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1A8A55]">Earnings</div>
							<h3 class="mt-1 font-serif text-xl text-[#0D1B3E]">Wage ledger</h3>
						</div>
						<span class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6A84AC]">ZAR</span>
					</div>

					<div class="mt-4 grid grid-cols-2 gap-3">
						<div class="border border-[#C8D4E8] bg-[#EDFBF3] p-3">
							<div class="font-mono text-[9px] uppercase tracking-wider text-[#1A8A55]">Paid</div>
							<div class="mt-1 font-mono text-lg font-bold text-[#1A8A55]">{loadingPayments ? '—' : formatCurrency(totalEarned)}</div>
						</div>
						<div class="border border-[#C8D4E8] bg-[#FFFBF2] p-3">
							<div class="font-mono text-[9px] uppercase tracking-wider text-[#8A5A10]">Pending</div>
							<div class="mt-1 font-mono text-lg font-bold text-[#8A5A10]">{loadingPayments ? '—' : formatCurrency(pendingEarnings)}</div>
						</div>
					</div>

					{#if loadingPayments}
						<div class="mt-4">
							<StatePanel kind="loading" rows={2} compact />
						</div>
					{:else if payments.length === 0}
						<div class="mt-4 border border-dashed border-[#C8D4E8] p-4 text-center">
							<p class="text-xs text-[#6A84AC] font-sans">Your first verified task will create a payment record here.</p>
						</div>
					{:else}
						<div class="mt-4 divide-y divide-[#EFF4FF] border border-[#C8D4E8]">
							{#each payments.slice(0, $lowDataMode ? 3 : 6) as payment (payment.id)}
								<div class="p-3">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0">
											<div class="truncate font-sans text-xs font-semibold text-[#0D1B3E]">{payment.taskTitle || `Task #${payment.taskId}`}</div>
											<div class="mt-0.5 font-mono text-[9px] text-[#6A84AC]">{formatDate(payment.paidAt || payment.createdAt)}</div>
										</div>
										<div class="text-right shrink-0">
											<div class="font-mono text-xs font-bold text-[#0D1B3E]">{formatCurrency(payment.youthAmount)}</div>
											<span class="font-mono text-[8px] font-bold uppercase tracking-wider {payment.status === 'PAID' ? 'text-[#1A8A55]' : 'text-[#D4831A]'}">{payment.status}</span>
										</div>
									</div>
									<div class="mt-1 font-mono text-[8px] uppercase tracking-wider text-[#6A84AC]">
										Gross {formatCurrency(payment.totalAmount)} · fee {formatCurrency(payment.platformFee)}
									</div>
								</div>
							{/each}
						</div>
						<div class="mt-3 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
							Platform fees to date: {formatCurrency(platformFees)}
						</div>
					{/if}
				</div>

				<!-- Experience Ledger -->
				<div>
					<div class="flex items-center justify-between border-b border-[#C8D4E8] pb-3">
						<div>
							<h2 class="font-serif text-2xl text-[#0D1B3E]">Experience Ledger</h2>
							<p class="text-xs text-[#6A84AC] font-sans">Your permanent record of capability.</p>
						</div>
						<span class="bg-[#EFF4FF] border border-[#C8D4E8] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1446A0]">
							{experiences.length} ENTRIES
						</span>
					</div>

					{#if loadingExp}
						<div class="mt-4 space-y-4">
							<div class="h-36 border border-[#C8D4E8] bg-white animate-pulse"></div>
							<div class="h-36 border border-[#C8D4E8] bg-white animate-pulse"></div>
						</div>
					{:else if experiences.length === 0}
						<div class="mt-4">
							<StatePanel
								kind="empty"
								title="No entries recorded"
								message="Complete your first SME task to generate a verified proof entry."
								actionLabel="Find work"
								onaction={goToTasks}
								compact
							/>
						</div>
					{:else}
						<div class="mt-4 space-y-4">
							{#each experiences.slice(0, $lowDataMode ? 3 : experiences.length) as exp (exp.id)}
								<ExperienceCard experience={exp} />
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Career Path -->
		<div class="mt-8">
			<CareerPath {tierInfo} skills={profileSkills.join(', ')} />
		</div>
	</div>
</RoleGuard>

<!-- Modal: Apply -->
<Modal bind:open={applyModalOpen} title={`Apply: ${selectedTaskToApply?.title || ''}`}>
	<div class="space-y-4">
		<div class="border border-[#F0DDBB] bg-[#FFFBF2] p-4">
			<div class="font-mono text-[9px] font-bold uppercase tracking-widest text-[#8A5A10]">Why this match</div>
			<p class="mt-1 text-xs leading-relaxed text-[#465A7A] font-sans">{applyReason}</p>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-3">
				<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Wage reserve</div>
				<div class="mt-1 font-mono text-base font-bold text-[#1446A0]">{formatCurrency(selectedTaskToApply?.budget)}</div>
			</div>
			<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-3">
				<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Duration</div>
				<div class="mt-1 font-mono text-base font-bold text-[#0D1B3E]">{selectedTaskToApply?.durationDays ?? '—'} days</div>
			</div>
		</div>
		<div>
			<label for="applyCoverNote" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#0D1B3E]">Cover note (optional)</label>
			<textarea id="applyCoverNote" rows="4" maxlength="500" bind:value={applyCoverNote} placeholder="Tell the SME why you can do this work and when you can start." class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm"></textarea>
			<p class="mt-1 text-[10px] text-[#6A84AC] font-sans">Applying holds a 48-hour reservation. The SME sees your tier, rating and skills.</p>
		</div>
	</div>
	{#snippet footer()}
		<button type="button" class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider" onclick={() => (applyModalOpen = false)}>Cancel</button>
		<button type="button" disabled={applying} class="cape-btn-primary px-5 py-2 text-xs font-mono uppercase tracking-widest disabled:opacity-50" onclick={submitApplication}>
			{applying ? 'Submitting...' : 'Submit application'}
		</button>
	{/snippet}
</Modal>

<!-- Modal: Withdraw -->
<Modal bind:open={withdrawModalOpen} title="Withdraw application?">
	<div class="space-y-3">
		<p class="text-sm leading-relaxed text-[#465A7A] font-sans">
			This releases your 48-hour reservation for <span class="font-semibold text-[#0D1B3E]">{selectedApplicationToWithdraw?.taskTitle}</span>. You can apply again later if the task is still open.
		</p>
		<div class="border border-[#F0DDBB] bg-[#FFFBF2] p-3 font-mono text-[10px] uppercase tracking-wider text-[#8A5A10]">
			Reservation ends immediately · no wage is affected
		</div>
	</div>
	{#snippet footer()}
		<button type="button" class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider" onclick={() => (withdrawModalOpen = false)}>Keep reservation</button>
		<button type="button" disabled={withdrawing} class="border border-[#C42B2B] bg-[#C42B2B] px-5 py-2 text-xs font-mono uppercase tracking-widest text-white hover:bg-[#a82222] disabled:opacity-50" onclick={confirmWithdraw}>
			{withdrawing ? 'Withdrawing...' : 'Withdraw'}
		</button>
	{/snippet}
</Modal>

<!-- Modal: Complete -->
<Modal bind:open={completeModalOpen} title="Mark task complete?">
	<div class="space-y-3">
		<p class="text-sm leading-relaxed text-[#465A7A] font-sans">
			This tells the SME that <span class="font-semibold text-[#0D1B3E]">{selectedApplicationToComplete?.taskTitle}</span> is ready for review. The SME must verify the work before your wage is released and the ledger entry is sealed.
		</p>
		<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-3 font-mono text-[10px] uppercase tracking-wider text-[#6A84AC]">
			Next: SME verification → payment → permanent ledger proof
		</div>
	</div>
	{#snippet footer()}
		<button type="button" class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider" onclick={() => (completeModalOpen = false)}>Not yet</button>
		<button type="button" disabled={completing} class="bg-[#1A8A55] px-5 py-2 text-xs font-mono uppercase tracking-widest text-white hover:bg-[#146e43] disabled:opacity-50" onclick={confirmComplete}>
			{completing ? 'Submitting...' : 'Submit for verification'}
		</button>
	{/snippet}
</Modal>

<!-- Modal: Edit profile -->
<Modal bind:open={profileModalOpen} title="Edit your profile">
	<div class="space-y-4">
		<ApiError message={profileError} ondismiss={() => (profileError = null)} />
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div>
				<label for="profileEducation" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Education</label>
				<input id="profileEducation" type="text" maxlength="255" bind:value={profileForm.education} placeholder="BCom Accounting, CPUT" class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm" />
			</div>
			<div>
				<label for="profileLocation" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Location</label>
				<input id="profileLocation" type="text" maxlength="100" bind:value={profileForm.location} placeholder="Cape Town, Western Cape" class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm" />
			</div>
		</div>
		<div>
			<label for="profileSkills" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Skills (comma separated)</label>
			<input id="profileSkills" type="text" maxlength="500" bind:value={profileForm.skills} placeholder="Excel, Bookkeeping, Customer Support" class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm" />
		</div>
		<div>
			<label for="profileAvailability" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Availability</label>
			<input id="profileAvailability" type="text" maxlength="50" bind:value={profileForm.availability} placeholder="Weekdays after 2pm · weekends" class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm" />
		</div>
		<div>
			<label for="profilePortfolio" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Portfolio or LinkedIn</label>
			<input id="profilePortfolio" type="url" maxlength="255" bind:value={profileForm.portfolio} placeholder="https://..." class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm" />
		</div>
		<div>
			<label for="profileBio" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Bio</label>
			<textarea id="profileBio" rows="3" maxlength="1000" bind:value={profileForm.bio} placeholder="What should an SME know about how you work?" class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm"></textarea>
		</div>
		<a href="/onboarding/skills" class="inline-block font-mono text-[10px] font-bold uppercase tracking-wider text-[#1446A0] hover:underline">
			Prefer the guided skills check? Open it →
		</a>
	</div>
	{#snippet footer()}
		<button type="button" class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider" onclick={() => (profileModalOpen = false)}>Cancel</button>
		<button type="button" disabled={profileSaving} class="cape-btn-primary px-5 py-2 text-xs font-mono uppercase tracking-widest disabled:opacity-50" onclick={saveProfile}>
			{profileSaving ? 'Saving...' : 'Save profile'}
		</button>
	{/snippet}
</Modal>
