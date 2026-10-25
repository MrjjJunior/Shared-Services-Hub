/**
 * Shared formatting utilities for SSH frontend
 */

/**
 * Formats a number as South African Rand (ZAR)
 * @param {number} amount
 * @returns {string} e.g. "R 500" or "R 1,250.00"
 */
export function formatCurrency(amount) {
	if (amount === undefined || amount === null || isNaN(amount)) {
		return 'R 0';
	}
	const num = Number(amount);
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
		minimumFractionDigits: num % 1 === 0 ? 0 : 2,
		maximumFractionDigits: 2
	}).format(num);
}

/**
 * Formats an ISO datetime string into human-readable date
 * @param {string|Date} dateVal
 * @param {boolean} includeTime
 * @returns {string}
 */
export function formatDate(dateVal, includeTime = false) {
	if (!dateVal) return 'N/A';
	try {
		const date = new Date(dateVal);
		if (isNaN(date.getTime())) return 'Invalid date';
		
		const options = {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		};
		if (includeTime) {
			options.hour = '2-digit';
			options.minute = '2-digit';
		}
		return new Intl.DateTimeFormat('en-ZA', options).format(date);
	} catch (e) {
		return String(dateVal);
	}
}

/**
 * Formats duration in days
 * @param {number} days
 * @returns {string} e.g. "7 days"
 */
export function formatDuration(days) {
	if (!days && days !== 0) return 'Flexible';
	return days === 1 ? '1 day' : `${days} days`;
}

/**
 * Formats a tier code into a short label.
 * @param {string} tier e.g. TIER_2
 * @param {boolean} includePlus
 * @returns {string}
 */
export function formatTier(tier, includePlus = false) {
	if (!tier || tier === 'ALL') return 'All tiers';
	const label = String(tier).replace('_', ' ');
	return includePlus && tier !== 'TIER_0' ? `${label}+` : label;
}

/**
 * Returns the numeric index of a tier code.
 * @param {string} tier
 * @returns {number}
 */
export function tierIndex(tier) {
	const match = String(tier || '').match(/TIER_(\d)/);
	return match ? Number(match[1]) : 0;
}

/**
 * Formats role into clean user-facing title
 * @param {string} role
 * @returns {string}
 */
export function formatRole(role) {
	switch (role?.toUpperCase()) {
		case 'YOUTH':
			return 'Youth Candidate';
		case 'SME':
			return 'SME Partner';
		case 'CORPORATE':
			return 'Corporate Sponsor';
		case 'ADMIN':
			return 'System Admin';
		default:
			return role || 'User';
	}
}
