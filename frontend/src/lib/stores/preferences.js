import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const PREFIX = 'ssh_pref_';

/**
 * A tiny persisted store. Values survive refreshes and are safe during SSR.
 * @template T
 * @param {string} key
 * @param {T} initial
 */
function persisted(key, initial) {
	const storageKey = PREFIX + key;
	let value = initial;

	if (browser) {
		try {
			const raw = localStorage.getItem(storageKey);
			if (raw !== null) value = JSON.parse(raw);
		} catch {
			value = initial;
		}
	}

	const store = writable(value);
	store.subscribe((next) => {
		if (!browser) return;
		try {
			localStorage.setItem(storageKey, JSON.stringify(next));
		} catch {
			// Storage can be unavailable in private browsing; keep the in-memory value.
		}
	});

	return {
		subscribe: store.subscribe,
		set: store.set,
		update: store.update,
		reset: () => store.set(initial)
	};
}

/** Demo mode routes every API call through the in-browser sample database. */
export const demoMode = persisted('demo_mode', false);

/** Low-data mode trims non-essential sections and disables heavy animation. */
export const lowDataMode = persisted('low_data_mode', false);

/** Set when a youth completes the skills-check onboarding. */
export const skillsCheck = persisted('skills_check', null);

/** Local copy of the youth profile so offline/demo edits still show up. */
export const localYouthProfile = persisted('youth_profile', null);

export function toggleDemoMode() {
	demoMode.update((value) => !value);
}

export function toggleLowDataMode() {
	lowDataMode.update((value) => !value);
}

export function isDemoMode() {
	if (!browser) return false;
	try {
		return localStorage.getItem(PREFIX + 'demo_mode') === 'true';
	} catch {
		return false;
	}
}

export function saveLocalYouthProfile(profile) {
	localYouthProfile.set(profile);
}

export function clearDemoPreferences() {
	demoMode.set(false);
	skillsCheck.set(null);
}
