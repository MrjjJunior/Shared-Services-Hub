<script>
	import { formatDate, formatTier, tierIndex } from '$lib/utils/formatters.js';

	/**
	 * Ranked applicant review with the selected applicant's full profile.
	 *
	 * @typedef {Object} Props
	 * @property {Array<any>} [applicants]
	 * @property {any} [task]
	 * @property {boolean} [loading]
	 * @property {string|null} [error]
	 * @property {string} [selectedYouthId]
	 * @property {boolean} [assigning]
	 * @property {(youthId: string) => void} [onassign]
	 * @property {() => void} [onretry]
	 */

	/** @type {Props} */
	let {
		applicants = [],
		task = null,
		loading = false,
		error = null,
		selectedYouthId = $bindable(''),
		assigning = false,
		onassign = () => {},
		onretry = () => {}
	} = $props();

	function taskHaystack() {
		return `${task?.title || ''} ${task?.category || ''} ${task?.description || ''}`.toLowerCase();
	}

	function skillMatches(applicant) {
		const haystack = taskHaystack();
		return String(applicant?.youthSkills || '')
			.split(',')
			.map((skill) => skill.trim())
			.filter(Boolean)
			.filter((skill) => {
				const lower = skill.toLowerCase();
				const words = lower.split(/\s+/).filter((word) => word.length > 3);
				return haystack.includes(lower) || words.some((word) => haystack.includes(word));
			});
	}

	function applicantScore(applicant) {
		const tier = tierIndex(applicant?.youthTier);
		const verified = Number(applicant?.youthVerifiedExperienceCount || 0);
		const rating = Number(applicant?.youthAverageRating || 0);
		const matches = skillMatches(applicant).length;
		return tier * 30 + verified * 5 + rating * 4 + matches * 9;
	}

	const rankedApplicants = $derived.by(() =>
		[...applicants].sort((a, b) => {
			const scoreDiff = applicantScore(b) - applicantScore(a);
			if (scoreDiff !== 0) return scoreDiff;
			return new Date(a.appliedAt || 0).getTime() - new Date(b.appliedAt || 0).getTime();
		})
	);

	const selectedApplicant = $derived(
		rankedApplicants.find((applicant) => String(applicant.youthId) === String(selectedYouthId)) ||
			rankedApplicants[0] ||
			null
	);

	const selectedRank = $derived(
		selectedApplicant
			? rankedApplicants.findIndex(
					(applicant) => String(applicant.youthId) === String(selectedApplicant.youthId)
				) + 1
			: 0
	);

	const otherPendingCount = $derived(Math.max(rankedApplicants.length - 1, 0));

	const selectedSkillKeys = $derived(
		new Set(
			(selectedApplicant ? skillMatches(selectedApplicant) : []).map((skill) =>
				skill.toLowerCase()
			)
		)
	);

	// Keep a valid selection as the list loads, ranks, or changes.
	$effect(() => {
		if (rankedApplicants.length === 0) return;
		const current = String(selectedYouthId || '');
		const stillPresent = rankedApplicants.some(
			(applicant) => String(applicant.youthId) === current
		);
		if (!stillPresent) {
			selectedYouthId = String(rankedApplicants[0].youthId);
		}
	});

	function selectApplicant(applicant) {
		selectedYouthId = String(applicant.youthId);
		if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
			setTimeout(() => {
				document
					.getElementById('applicant-profile-review')
					?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 40);
		}
	}

	function safeExternalUrl(value) {
		if (!value) return null;
		// Internal demo portfolio links (e.g. /portfolio/2 on the sign-in
		// demo roster) pass through untouched so they stay on the site.
		if (value.startsWith('/')) return value;
		try {
			const url = new URL(value, 'https://');
			return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
		} catch {
			return null;
		}
	}

	function isInternalPortfolio(value) {
		return Boolean(value && value.startsWith('/'));
	}
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1446A0]">
				Applicant review
			</div>
			<p class="mt-0.5 text-[11px] font-sans text-[#6A84AC]">
				Ranked by tier, verified experience, rating, skill fit and application time. Select a
				candidate to read their full profile before assigning.
			</p>
		</div>
		<span class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
			{applicants.length} pending
		</span>
	</div>

	{#if loading}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
			<div class="space-y-2">
				{#each Array(3) as _}
					<div class="h-24 animate-pulse border border-[#C8D4E8] bg-[#F8F9FC]"></div>
				{/each}
			</div>
			<div class="h-96 animate-pulse border-2 border-[#C8D4E8] bg-[#F8F9FC]"></div>
		</div>
	{:else if error}
		<div class="border border-[#F0C0C0] border-l-4 border-l-[#C42B2B] bg-[#FFF5F5] p-4">
			<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C42B2B]">
				Could not load applicants
			</div>
			<p class="mt-1 font-sans text-xs text-[#465A7A]">{error}</p>
			<button
				type="button"
				class="mt-2 border border-[#C42B2B] px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#C42B2B] hover:bg-[#C42B2B] hover:text-white"
				onclick={onretry}
			>
				Retry
			</button>
		</div>
	{:else if applicants.length === 0}
		<div class="border border-[#C49420] bg-[#FFF8E6] p-4 font-sans text-xs text-[#8A6A12]">
			No pending applications yet. Youth must apply before you can review a profile and assign
			this task.
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
			<!-- Ranked applicant list -->
			<div class="space-y-2" aria-label="Ranked applicants">
				{#each rankedApplicants as applicant, index (applicant.id || applicant.youthId)}
					{@const selected = String(selectedYouthId) === String(applicant.youthId)}
					{@const matches = skillMatches(applicant)}
					<button
						type="button"
						class="w-full border-2 p-3 text-left transition-colors {selected
							? 'border-[#1446A0] bg-[#F5F8FF]'
							: 'border-[#C8D4E8] bg-white hover:border-[#1446A0]'}"
						onclick={() => selectApplicant(applicant)}
						aria-pressed={selected}
						aria-label={`Review ${applicant.youthName || `Youth #${applicant.youthId}`}`}
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex min-w-0 items-start gap-2.5">
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-[10px] font-bold {index === 0
										? 'border-[#D4831A] bg-[#FFFBF2] text-[#8A5A10]'
										: 'border-[#C8D4E8] bg-[#F8F9FC] text-[#6A84AC]'}"
								>
									#{index + 1}
								</span>
								<div class="min-w-0">
									<div class="truncate font-serif text-base text-[#0D1B3E]">
										{applicant.youthName || `Youth #${applicant.youthId}`}
									</div>
									<div
										class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]"
									>
										<span
											class="border border-[#7C3FE4]/40 bg-[#F5EEFF] px-1.5 py-0.5 font-bold text-[#7C3FE4]"
										>
											{formatTier(applicant.youthTier || 'TIER_0', true)}
										</span>
										<span>{applicant.youthVerifiedExperienceCount ?? 0} verified</span>
										<span class="text-[#E8B830]">★ {applicant.youthAverageRating ?? '—'}</span>
									</div>
								</div>
							</div>
							<span
								class="shrink-0 border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider {selected
									? 'border-[#1446A0] bg-[#1446A0] text-white'
									: 'border-[#C8D4E8] bg-[#F8F9FC] text-[#6A84AC]'}"
							>
								{selected ? 'Under review' : 'View profile'}
							</span>
						</div>

						{#if matches.length > 0}
							<div class="mt-2 font-mono text-[9px] uppercase tracking-wider text-[#1A8A55]">
								{matches.length} skill {matches.length === 1 ? 'match' : 'matches'} · {matches
									.slice(0, 3)
									.join(', ')}
							</div>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Selected applicant profile -->
			{#if selectedApplicant}
				<aside
					id="applicant-profile-review"
					class="border-2 border-[#1446A0] bg-white"
					aria-live="polite"
					aria-label="Applicant profile under review"
				>
					<div class="border-b border-[#C8D4E8] bg-[#F5F8FF] p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<div
									class="font-mono text-[9px] font-bold uppercase tracking-widest text-[#1446A0]"
								>
									Applicant profile · under review
								</div>
								<h3 class="mt-1 truncate font-serif text-2xl text-[#0D1B3E]">
									{selectedApplicant.youthName || `Youth #${selectedApplicant.youthId}`}
								</h3>
								<div
									class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]"
								>
									<span>Rank #{selectedRank} of {rankedApplicants.length}</span>
									<span>·</span>
									<span>Applied {formatDate(selectedApplicant.appliedAt, true)}</span>
								</div>
								{#if selectedApplicant.expiresAt}
									<div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#C49420]">
										Reservation ends {formatDate(selectedApplicant.expiresAt, true)}
									</div>
								{/if}
							</div>
							<span
								class="shrink-0 border border-[#7C3FE4]/40 bg-[#F5EEFF] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#7C3FE4]"
							>
								{formatTier(selectedApplicant.youthTier || 'TIER_0', true)}
							</span>
						</div>
					</div>

					<div class="space-y-4 p-4">
						<div class="grid grid-cols-3 gap-2">
							<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-2.5">
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									Verified
								</div>
								<div class="mt-0.5 font-mono text-lg font-bold text-[#1446A0]">
									{selectedApplicant.youthVerifiedExperienceCount ?? 0}
								</div>
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									experiences
								</div>
							</div>
							<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-2.5">
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									Average rating
								</div>
								<div class="mt-0.5 font-mono text-lg font-bold text-[#D4831A]">
									{selectedApplicant.youthAverageRating ?? '—'}
								</div>
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									out of 5
								</div>
							</div>
							<div class="border border-[#C8D4E8] bg-[#F8F9FC] p-2.5">
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									Status
								</div>
								<div class="mt-0.5 font-mono text-[11px] font-bold uppercase text-[#1A8A55]">
									Pending
								</div>
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									reservation
								</div>
							</div>
						</div>

						<div>
							<div class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6A84AC]">
								Short bio
							</div>
							{#if selectedApplicant.youthBio}
								<p class="mt-1 font-sans text-xs leading-relaxed text-[#465A7A]">
									{selectedApplicant.youthBio}
								</p>
							{:else}
								<p class="mt-1 font-sans text-xs italic leading-relaxed text-[#6A84AC]">
									This candidate has not added a bio yet.
								</p>
							{/if}
						</div>

						<div>
							<div class="flex items-center justify-between gap-2">
								<div
									class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6A84AC]"
								>
									Skills
								</div>
								{#if selectedSkillKeys.size > 0}
									<span class="font-mono text-[9px] uppercase tracking-wider text-[#1A8A55]">
										{selectedSkillKeys.size} match this task
									</span>
								{/if}
							</div>
							{#if selectedApplicant.youthSkills}
								<div class="mt-1.5 flex flex-wrap gap-1.5">
									{#each selectedApplicant.youthSkills.split(',').map((skill) => skill.trim()).filter(Boolean) as skill}
										{@const matched = selectedSkillKeys.has(skill.toLowerCase())}
										<span
											class="border px-1.5 py-0.5 font-mono text-[9px] {matched
												? 'border-[#1A8A55]/40 bg-[#EDFBF3] font-bold text-[#1A8A55]'
												: 'border-[#C8D4E8] bg-[#F8F9FC] text-[#465A7A]'}"
										>
											{skill}{matched ? ' ✓' : ''}
										</span>
									{/each}
								</div>
							{:else}
								<p class="mt-1 font-sans text-xs italic text-[#6A84AC]">No skills listed yet.</p>
							{/if}
						</div>

						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<div class="border border-[#C8D4E8] p-2.5">
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									Education
								</div>
								<div class="mt-0.5 font-sans text-[11px] text-[#0D1B3E]">
									{selectedApplicant.youthEducation || 'Not provided'}
								</div>
							</div>
							<div class="border border-[#C8D4E8] p-2.5">
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									Location
								</div>
								<div class="mt-0.5 font-sans text-[11px] text-[#0D1B3E]">
									{selectedApplicant.youthLocation || 'Not provided'}
								</div>
							</div>
							<div class="border border-[#C8D4E8] p-2.5">
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									Availability
								</div>
								<div class="mt-0.5 font-sans text-[11px] text-[#0D1B3E]">
									{selectedApplicant.youthAvailability || 'Not provided'}
								</div>
							</div>
							<div class="border border-[#C8D4E8] p-2.5">
								<div class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">
									Portfolio
								</div>
								{#if safeExternalUrl(selectedApplicant.youthPortfolio)}
									<a
										href={safeExternalUrl(selectedApplicant.youthPortfolio)}
										target="_blank"
										rel="noreferrer"
										class="mt-0.5 block truncate font-sans text-[11px] text-[#1446A0] underline"
									>
										{#if isInternalPortfolio(selectedApplicant.youthPortfolio)}
											View demo portfolio
										{:else}
											{selectedApplicant.youthPortfolio}
										{/if}
									</a>
								{:else}
									<div class="mt-0.5 font-sans text-[11px] text-[#0D1B3E]">Not provided</div>
								{/if}
							</div>
						</div>

						<div>
							<div class="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6A84AC]">
								Cover note
							</div>
							{#if selectedApplicant.coverNote}
								<blockquote
									class="mt-1 border-l-2 border-l-[#1446A0] bg-[#F8F9FC] py-2 pl-3 pr-2 font-sans text-xs leading-relaxed text-[#465A7A]"
								>
									“{selectedApplicant.coverNote}”
								</blockquote>
							{:else}
								<p class="mt-1 font-sans text-xs italic text-[#6A84AC]">
									No cover note was included with this application.
								</p>
							{/if}
						</div>

						<div class="border border-[#1A8A55]/40 bg-[#EDFBF3] p-3">
							<div class="font-mono text-[9px] font-bold uppercase tracking-widest text-[#1A8A55]">
								Assignment impact
							</div>
							<p class="mt-1 font-sans text-[11px] leading-relaxed text-[#465A7A]">
								Assigning {selectedApplicant.youthName || 'this applicant'} accepts this
								application, releases {otherPendingCount} other pending
								{otherPendingCount === 1 ? 'applicant' : 'applicants'} and moves the task to
								<span class="font-mono font-bold text-[#D4831A]">IN_PROGRESS</span>.
							</p>
						</div>

						<button
							type="button"
							disabled={assigning}
							class="w-full bg-[#1446A0] px-4 py-3 font-mono text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#0D1B3E] disabled:opacity-50"
							onclick={() => onassign(String(selectedApplicant.youthId))}
						>
							{assigning
								? 'Assigning applicant...'
								: `Assign ${selectedApplicant.youthName || 'this applicant'} to this task`}
						</button>
					</div>
				</aside>
			{/if}
		</div>
	{/if}
</div>
