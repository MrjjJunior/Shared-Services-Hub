<script>
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import ApiError from '$lib/components/ApiError.svelte';
	import { api } from '$lib/api.js';
	import { skillsCheck, localYouthProfile } from '$lib/stores/preferences.js';
	import { toast } from '$lib/stores/toast.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const skillOptions = [
		'Excel & Spreadsheets',
		'Bookkeeping',
		'Data Entry',
		'Customer Support',
		'Social Media',
		'Canva Design',
		'Copywriting',
		'IT Support',
		'Web Content',
		'Administration',
		'Sales Support',
		'Research'
	];

	const availabilityOptions = [
		'Immediate · flexible',
		'Weekdays during the day',
		'Weekdays after 2pm',
		'Weekends',
		'Evenings only',
		'Available from next month'
	];

	let step = $state(1);
	let selectedSkills = $state([]);
	let customSkill = $state('');
	let education = $state('');
	let location = $state('');
	let availability = $state('Immediate · flexible');
	let portfolio = $state('');
	let bio = $state('');
	let loadingProfile = $state(true);
	let saving = $state(false);
	let errorMessage = $state(null);

	const progress = $derived(Math.round((step / 3) * 100));

	function toggleSkill(skill) {
		selectedSkills = selectedSkills.includes(skill)
			? selectedSkills.filter((item) => item !== skill)
			: [...selectedSkills, skill];
	}

	function addCustomSkill() {
		const value = customSkill.trim();
		if (!value) return;
		if (!selectedSkills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
			selectedSkills = [...selectedSkills, value];
		}
		customSkill = '';
	}

	function nextStep() {
		errorMessage = null;
		if (step === 1 && selectedSkills.length === 0) {
			errorMessage = 'Choose at least one skill so we can match you to real work.';
			return;
		}
		step = Math.min(3, step + 1);
	}

	async function saveSkillsCheck() {
		errorMessage = null;
		saving = true;
		const idealAvailability = availability || 'Flexible';
		const payload = {
			skills: selectedSkills.join(', '),
			education: education.trim(),
			location: location.trim(),
			availability: idealAvailability,
			portfolio: portfolio.trim(),
			bio: bio.trim()
		};

		try {
			const updated = await api.youth.update(payload);
			localYouthProfile.set(updated);
			skillsCheck.set({ completedAt: new Date().toISOString(), skills: selectedSkills });
			toast.success('Skills check saved. Your task matches are now personalised.');
			goto('/dashboard/youth');
		} catch (err) {
			localYouthProfile.set(payload);
			skillsCheck.set({ completedAt: new Date().toISOString(), skills: selectedSkills });
			toast.warning('Saved locally. The profile will sync when the backend is reachable.');
			console.warn('Skills check save failed:', err);
			goto('/dashboard/youth');
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		try {
			const profile = await api.youth.me();
			selectedSkills = profile?.skills
				? profile.skills.split(',').map((skill) => skill.trim()).filter(Boolean)
				: [];
			education = profile?.education || '';
			location = profile?.location || '';
			availability = profile?.availability || 'Immediate · flexible';
			portfolio = profile?.portfolio || '';
			bio = profile?.bio || '';
		} catch (err) {
			console.warn('Could not prefill skills check:', err);
		} finally {
			loadingProfile = false;
		}
	});
</script>

<svelte:head>
	<title>Skills Check | Shared Services Hub</title>
</svelte:head>

<RoleGuard allowedRoles={['YOUTH']}>
	<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-6 flex items-center justify-between">
			<a href="/dashboard/youth" class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC] hover:text-[#1446A0]">
				← Back to dashboard
			</a>
			<a href="/dashboard/youth" class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC] hover:text-[#1446A0]">
				Skip for now
			</a>
		</div>

		<div class="border border-[#C8D4E8] bg-[#0A1E4A] p-6 sm:p-8 text-white shadow-md">
			<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#D4831A]">Skills check · Step {step} of 3</div>
			<h1 class="mt-2 font-serif text-3xl text-white">Let’s find the work you’re ready for.</h1>
			<p class="mt-2 max-w-xl text-sm text-[#C8D4E8] font-sans">
				Two minutes now means every open task can tell you why it is a match. You can update this at any time from your profile.
			</p>
			<div class="mt-5 h-1.5 border border-white/20 bg-white/10">
				<div class="h-full bg-[#D4831A] transition-[width] duration-300" style={`width: ${progress}%`}></div>
			</div>
		</div>

		<div class="mt-6 border border-[#C8D4E8] bg-white p-6 sm:p-8 shadow-xs">
			<ApiError message={errorMessage} ondismiss={() => (errorMessage = null)} />

			{#if loadingProfile}
				<div class="space-y-3">
					<div class="h-4 w-40 bg-[#EFF4FF] animate-pulse"></div>
					<div class="h-24 w-full bg-[#EFF4FF] animate-pulse"></div>
				</div>
			{:else if step === 1}
				<h2 class="font-serif text-2xl text-[#0D1B3E]">What are you good at?</h2>
				<p class="mt-1 text-xs text-[#6A84AC] font-sans">Choose at least one. These become “why this match” reasons on your task feed.</p>

				<div class="mt-5 flex flex-wrap gap-2">
					{#each skillOptions as skill}
						<button
							type="button"
							class="border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors {selectedSkills.includes(skill) ? 'border-[#1446A0] bg-[#EFF4FF] text-[#1446A0]' : 'border-[#C8D4E8] bg-white text-[#465A7A] hover:border-[#1446A0]'}"
							onclick={() => toggleSkill(skill)}
							aria-pressed={selectedSkills.includes(skill)}
						>
							{selectedSkills.includes(skill) ? '✓ ' : '+ '}{skill}
						</button>
					{/each}
				</div>

				<div class="mt-5">
					<label for="customSkill" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Something else?</label>
					<div class="mt-1.5 flex gap-2">
						<input
							id="customSkill"
							type="text"
							bind:value={customSkill}
							placeholder="e.g. Photography"
							class="cape-input block w-full px-3.5 py-2.5 text-sm"
							onkeydown={(event) => event.key === 'Enter' && (event.preventDefault(), addCustomSkill())}
						/>
						<button type="button" class="cape-btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider" onclick={addCustomSkill}>
							Add
						</button>
					</div>
				</div>

				{#if selectedSkills.length > 0}
					<div class="mt-5 border border-[#C8D4E8] bg-[#F8F9FC] p-4">
						<div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Selected ({selectedSkills.length})</div>
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each selectedSkills as skill}
								<span class="bg-[#1446A0] px-2 py-0.5 font-mono text-[10px] text-white">{skill}</span>
							{/each}
						</div>
					</div>
				{/if}
			{:else if step === 2}
				<h2 class="font-serif text-2xl text-[#0D1B3E]">Where and when can you work?</h2>
				<p class="mt-1 text-xs text-[#6A84AC] font-sans">This helps SMEs see whether the task fits your real schedule.</p>

				<div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="skillsLocation" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">City / province</label>
						<input id="skillsLocation" type="text" bind:value={location} placeholder="Cape Town, Western Cape" class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm" />
					</div>
					<div>
						<label for="skillsAvailability" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Availability</label>
						<select id="skillsAvailability" bind:value={availability} class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm">
							{#each availabilityOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mt-5">
					<label for="skillsEducation" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Education or training</label>
					<input id="skillsEducation" type="text" bind:value={education} placeholder="e.g. BCom Accounting, CPUT · or Matric" class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm" />
				</div>

				<div class="mt-5 border-l-2 border-l-[#D4831A] border-y border-r border-[#F0DDBB] bg-[#FFFBF2] p-4">
					<p class="font-sans text-[11px] leading-relaxed text-[#465A7A]">
						Your location is only shown to an SME when you apply. It is never published on the public ledger.
					</p>
				</div>
			{:else}
				<h2 class="font-serif text-2xl text-[#0D1B3E]">Give your profile a human edge.</h2>
				<p class="mt-1 text-xs text-[#6A84AC] font-sans">A short pitch and a portfolio link help SMEs picture you doing the work.</p>

				<div class="mt-5">
					<label for="skillsBio" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Short bio</label>
					<textarea id="skillsBio" rows="4" maxlength="1000" bind:value={bio} placeholder="What do you enjoy working on? What should an SME know about how you work?" class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm"></textarea>
					<div class="mt-1 text-right font-mono text-[10px] text-[#6A84AC]">{bio.length}/1000</div>
				</div>

				<div class="mt-4">
					<label for="skillsPortfolio" class="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6A84AC]">Portfolio or LinkedIn (optional)</label>
					<input id="skillsPortfolio" type="url" bind:value={portfolio} placeholder="https://..." class="cape-input mt-1.5 block w-full px-3.5 py-2.5 text-sm" />
				</div>

				<div class="mt-6 border border-[#C8D4E8] bg-[#F8F9FC] p-4">
					<div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1446A0]">Review</div>
					<dl class="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
						<div><dt class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Skills</dt><dd class="mt-0.5 text-[#0D1B3E]">{selectedSkills.join(', ') || 'None selected'}</dd></div>
						<div><dt class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Location</dt><dd class="mt-0.5 text-[#0D1B3E]">{location || 'Not set'}</dd></div>
						<div><dt class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Availability</dt><dd class="mt-0.5 text-[#0D1B3E]">{availability || 'Flexible'}</dd></div>
						<div><dt class="font-mono text-[9px] uppercase tracking-wider text-[#6A84AC]">Education</dt><dd class="mt-0.5 text-[#0D1B3E]">{education || 'Not set'}</dd></div>
					</dl>
				</div>
			{/if}

			<div class="mt-7 flex items-center justify-between border-t border-[#C8D4E8] pt-5">
				<button
					type="button"
					class="cape-btn-secondary px-4 py-2.5 text-xs font-mono uppercase tracking-wider disabled:opacity-40"
					disabled={step === 1}
					onclick={() => (step = Math.max(1, step - 1))}
				>
					Back
				</button>
				{#if step < 3}
					<button type="button" class="cape-btn-primary px-6 py-2.5 text-xs font-mono uppercase tracking-widest" onclick={nextStep}>
						Continue →
					</button>
				{:else}
					<button
						type="button"
						disabled={saving}
						class="cape-btn-primary px-6 py-2.5 text-xs font-mono uppercase tracking-widest disabled:opacity-50"
						onclick={saveSkillsCheck}
					>
						{saving ? 'Saving...' : 'Save & see my matches'}
					</button>
				{/if}
			</div>
		</div>
	</div>
</RoleGuard>
