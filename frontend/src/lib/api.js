import { browser } from '$app/environment';
import { auth, TOKEN_KEY } from '$lib/stores/auth.js';
import { isDemoMode } from '$lib/stores/preferences.js';
import { toast } from '$lib/stores/toast.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// In-browser mock fallback data for offline / demo preview
const MOCK_STORAGE_KEY = 'ssh_mock_db_v3';

const daysAgo = (days, hours = 0) =>
	new Date(Date.now() - (days * 24 + hours) * 3600 * 1000).toISOString();

// Seeded applicant profiles used by the demo applicant-review surface.
const DEMO_APPLICANT_PROFILES = {
	1: {
		bio: 'Final-year accounting student in Cape Town. I like turning messy spreadsheets into clear decisions and I am available for short operational sprints.',
		portfolio: '/portfolio/1'
	},
	2: {
		bio: 'Marketing graduate in Johannesburg with a strong eye for clean visuals and product storytelling. I have run content calendars for two local brands and enjoy turning a brief into posts that feel on-brand.',
		portfolio: '/portfolio/2'
	},
	3: {
		bio: 'Matric graduate from Soweto building a track record in accurate data capture and stock counts. I work quickly through repetitive lists and double-check my own work.',
		portfolio: '/portfolio/3'
	},
	4: {
		bio: 'Visual designer in Durban focused on simple, usable brand and document systems. I work in Figma and Canva and like leaving teams with templates they can maintain.',
		portfolio: '/portfolio/4'
	}
};

function demoApplicantProfile(youthId) {
	const profile = DEMO_APPLICANT_PROFILES[Number(youthId)] || {};
	return { youthBio: profile.bio || '', youthPortfolio: profile.portfolio || '' };
}

function getMockDb() {
	if (!browser) return null;
	const existing = localStorage.getItem(MOCK_STORAGE_KEY);
	if (existing) {
		try {
			return JSON.parse(existing);
		} catch (e) {
			// reset if corrupted
		}
	}

	const initialDb = {
		profile: {
			id: 1,
			userId: 1,
			userName: 'Thabo Mokoena',
			education: 'BCom Accounting, CPUT',
			skills: 'Excel, Bookkeeping, Customer Support, Data Entry',
			portfolio: '/portfolio/1',
			bio: 'Final-year accounting student in Cape Town. I like turning messy spreadsheets into clear decisions and I am available for short operational sprints.',
			location: 'Cape Town, Western Cape',
			availability: 'Weekdays after 2pm · weekends',
			isAlumni: false,
			alumniDate: null,
			shareFeedbackPublicly: true,
			createdAt: daysAgo(90),
			updatedAt: daysAgo(2)
		},
		tasks: [
			{
				id: 1,
				title: 'E-commerce Product Catalog Digitization',
				description: 'Digitize 150 local artisan products with high-res photos, descriptions, and SKU tagging for Shopify store.',
				category: 'Digital Operations',
				status: 'OPEN',
				budget: 1200.0,
				durationDays: 5,
				isPaid: true,
				requiredTier: null,
				smeId: 101,
				smeBusinessName: 'Kasi Craftworks Co.',
				assignedToId: null,
				assignedToName: null,
				createdAt: daysAgo(3),
				updatedAt: daysAgo(3)
			},
			{
				id: 2,
				title: 'Social Media Campaign & Content Creation',
				description: 'Design 12 branded Canva posts and schedule 3 reels promoting our spring collection in Gauteng.',
				category: 'Marketing & Creative',
				status: 'IN_PROGRESS',
				budget: 850.0,
				durationDays: 4,
				isPaid: true,
				requiredTier: null,
				smeId: 101,
				smeBusinessName: 'Kasi Craftworks Co.',
				assignedToId: 1,
				assignedToName: 'Thabo Mokoena',
				createdAt: daysAgo(5),
				updatedAt: daysAgo(1)
			},
			{
				id: 3,
				title: 'Financial Records Reconciliation & Invoicing',
				description: 'Reconcile 3 months of bank statements and configure invoice templates in Sage Cloud Accounting.',
				category: 'Accounting & Finance',
				status: 'COMPLETED',
				budget: 1500.0,
				durationDays: 7,
				isPaid: true,
				requiredTier: null,
				smeId: 101,
				smeBusinessName: 'Kasi Craftworks Co.',
				assignedToId: 1,
				assignedToName: 'Thabo Mokoena',
				createdAt: daysAgo(10),
				updatedAt: daysAgo(2)
			},
			{
				id: 4,
				title: 'Customer Onboarding & Verification Calls',
				description: 'Conduct 40 outbound calls to verify delivery addresses and update customer satisfaction notes in CRM.',
				category: 'Customer Support',
				status: 'VERIFIED',
				budget: 700.0,
				durationDays: 3,
				isPaid: true,
				requiredTier: null,
				smeId: 101,
				smeBusinessName: 'Kasi Craftworks Co.',
				assignedToId: 1,
				assignedToName: 'Thabo Mokoena',
				createdAt: daysAgo(14),
				updatedAt: daysAgo(4)
			},
			{
				id: 5,
				title: 'POS Hardware Setup & Inventory Audit',
				description: 'Setup Yoco payment terminals at 2 pop-up stalls and conduct a physical stock count.',
				category: 'IT & Technical',
				status: 'OPEN',
				budget: 950.0,
				durationDays: 2,
				isPaid: true,
				requiredTier: null,
				smeId: 104,
				smeBusinessName: 'Soweto Solar Solutions',
				assignedToId: null,
				assignedToName: null,
				createdAt: daysAgo(0, 12),
				updatedAt: daysAgo(0, 12)
			},
			{
				id: 6,
				title: 'Data Capturing & Excel Reporting',
				description: 'Clean 600 supplier records and build a weekly stock dashboard from existing spreadsheets.',
				category: 'Accounting & Finance',
				status: 'OPEN',
				budget: 1100.0,
				durationDays: 4,
				isPaid: true,
				requiredTier: 'TIER_1',
				smeId: 105,
				smeBusinessName: 'Mzansi Fresh Produce',
				assignedToId: null,
				assignedToName: null,
				createdAt: daysAgo(1),
				updatedAt: daysAgo(1)
			},
			{
				id: 7,
				title: 'Website Copy Refresh',
				description: 'Rewrite six service pages for a clearer, warmer tone and align the calls to action.',
				category: 'Marketing & Creative',
				status: 'VERIFIED',
				budget: 900.0,
				durationDays: 4,
				isPaid: true,
				requiredTier: 'TIER_1',
				smeId: 101,
				smeBusinessName: 'Kasi Craftworks Co.',
				assignedToId: 1,
				assignedToName: 'Thabo Mokoena',
				createdAt: daysAgo(22),
				updatedAt: daysAgo(8)
			},
			{
				id: 8,
				title: 'Monthly Bookkeeping Cleanup',
				description: 'Categorise three months of transactions and prepare a reconciliation pack for the accountant.',
				category: 'Accounting & Finance',
				status: 'VERIFIED',
				budget: 1300.0,
				durationDays: 6,
				isPaid: true,
				requiredTier: 'TIER_1',
				smeId: 106,
				smeBusinessName: 'Lindiwe Logistics',
				assignedToId: 1,
				assignedToName: 'Thabo Mokoena',
				createdAt: daysAgo(30),
				updatedAt: daysAgo(16)
			},
			{
				id: 9,
				title: 'CRM Data Hygiene Sprint',
				description: 'Merge duplicate contacts and document a repeatable cleanup checklist for the sales team.',
				category: 'Digital Operations',
				status: 'OPEN',
				budget: 800.0,
				durationDays: 3,
				isPaid: true,
				requiredTier: 'TIER_2',
				smeId: 107,
				smeBusinessName: 'Cape Agile Studio',
				assignedToId: null,
				assignedToName: null,
				createdAt: daysAgo(2),
				updatedAt: daysAgo(2)
			},
			{
				id: 10,
				title: 'Call Centre QA & Script Review',
				description: 'Listen to 20 recorded calls and flag the top five script improvements for the support lead.',
				category: 'Customer Support',
				status: 'OPEN',
				budget: 600.0,
				durationDays: 2,
				isPaid: true,
				requiredTier: null,
				smeId: 108,
				smeBusinessName: 'Ubuntu Organic Foods',
				assignedToId: null,
				assignedToName: null,
				createdAt: daysAgo(0, 5),
				updatedAt: daysAgo(0, 5)
			},
			{
				id: 11,
				title: 'Invoice Template Design',
				description: 'Create two branded invoice templates and a one-page how-to guide for the finance assistant.',
				category: 'Accounting & Finance',
				status: 'OPEN',
				budget: 750.0,
				durationDays: 3,
				isPaid: true,
				requiredTier: 'TIER_1',
				smeId: 101,
				smeBusinessName: 'Kasi Craftworks Co.',
				assignedToId: null,
				assignedToName: null,
				createdAt: daysAgo(0, 3),
				updatedAt: daysAgo(0, 3)
			}
		],
		experiences: [
			{
				id: 1,
				status: 'VERIFIED',
				isVerified: true,
				feedback: 'Thabo showed exceptional attention to detail and completed customer verification ahead of schedule. Excellent communication skills.',
				rating: 5,
				reference: 'CRM export: customer-verification-batch-04.csv',
				verifiedAt: daysAgo(4),
				taskId: 4,
				taskTitle: 'Customer Onboarding & Verification Calls',
				smeBusinessName: 'Kasi Craftworks Co.',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				createdAt: daysAgo(14),
				updatedAt: daysAgo(4)
			},
			{
				id: 2,
				status: 'PENDING',
				isVerified: false,
				feedback: null,
				rating: null,
				reference: null,
				verifiedAt: null,
				taskId: 3,
				taskTitle: 'Financial Records Reconciliation & Invoicing',
				smeBusinessName: 'Kasi Craftworks Co.',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				createdAt: daysAgo(10),
				updatedAt: daysAgo(2)
			},
			{
				id: 3,
				status: 'VERIFIED',
				isVerified: true,
				feedback: 'Clear, warm copy that sounded like us. Thabo incorporated feedback quickly and delivered ahead of the deadline.',
				rating: 4.5,
				reference: 'Website copy deck v3 · signed off by Thandi',
				verifiedAt: daysAgo(8),
				taskId: 7,
				taskTitle: 'Website Copy Refresh',
				smeBusinessName: 'Kasi Craftworks Co.',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				createdAt: daysAgo(22),
				updatedAt: daysAgo(8)
			},
			{
				id: 4,
				status: 'VERIFIED',
				isVerified: true,
				feedback: 'Reconciliation pack was accurate and easy to audit. Good use of comments and version naming.',
				rating: 4,
				reference: 'Reconciliation pack · Jan–Mar 2026',
				verifiedAt: daysAgo(16),
				taskId: 8,
				taskTitle: 'Monthly Bookkeeping Cleanup',
				smeBusinessName: 'Lindiwe Logistics',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				createdAt: daysAgo(30),
				updatedAt: daysAgo(16)
			}
		],
		applications: [
			{
				id: 1,
				taskId: 2,
				taskTitle: 'Social Media Campaign & Content Creation',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				status: 'ACCEPTED',
				coverNote: 'I can turn the campaign brief into a clear content calendar.',
				appliedAt: daysAgo(6),
				expiresAt: daysAgo(5),
				decidedAt: daysAgo(5),
				youthTier: 'TIER_2',
				youthVerifiedExperienceCount: 3,
				youthAverageRating: 4.5,
				youthSkills: 'Excel, Bookkeeping, Customer Support, Data Entry',
				youthEducation: 'BCom Accounting, CPUT',
				youthLocation: 'Cape Town, Western Cape',
				youthAvailability: 'Weekdays after 2pm · weekends'
			},
			{
				id: 2,
				taskId: 3,
				taskTitle: 'Financial Records Reconciliation & Invoicing',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				status: 'ACCEPTED',
				coverNote: 'I have completed a similar Sage reconciliation for a small retailer.',
				appliedAt: daysAgo(11),
				expiresAt: daysAgo(10),
				decidedAt: daysAgo(10),
				youthTier: 'TIER_2',
				youthVerifiedExperienceCount: 3,
				youthAverageRating: 4.5,
				youthSkills: 'Excel, Bookkeeping, Customer Support, Data Entry',
				youthEducation: 'BCom Accounting, CPUT',
				youthLocation: 'Cape Town, Western Cape',
				youthAvailability: 'Weekdays after 2pm · weekends'
			},
			{
				id: 3,
				taskId: 4,
				taskTitle: 'Customer Onboarding & Verification Calls',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				status: 'ACCEPTED',
				coverNote: 'Comfortable with outbound calls and CRM notes.',
				appliedAt: daysAgo(15),
				expiresAt: daysAgo(14),
				decidedAt: daysAgo(14),
				youthTier: 'TIER_2',
				youthVerifiedExperienceCount: 3,
				youthAverageRating: 4.5,
				youthSkills: 'Excel, Bookkeeping, Customer Support, Data Entry',
				youthEducation: 'BCom Accounting, CPUT',
				youthLocation: 'Cape Town, Western Cape',
				youthAvailability: 'Weekdays after 2pm · weekends'
			},
			{
				id: 4,
				taskId: 5,
				taskTitle: 'POS Hardware Setup & Inventory Audit',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				status: 'PENDING',
				coverNote: 'I am available this week and have done a stock count before.',
				appliedAt: daysAgo(0, 8),
				expiresAt: daysAgo(-2),
				decidedAt: null,
				youthTier: 'TIER_2',
				youthVerifiedExperienceCount: 3,
				youthAverageRating: 4.5,
				youthSkills: 'Excel, Bookkeeping, Customer Support, Data Entry',
				youthEducation: 'BCom Accounting, CPUT',
				youthLocation: 'Cape Town, Western Cape',
				youthAvailability: 'Weekdays after 2pm · weekends'
			},
			{
				id: 5,
				taskId: 7,
				taskTitle: 'Website Copy Refresh',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				status: 'ACCEPTED',
				coverNote: 'I enjoy making services easier to understand.',
				appliedAt: daysAgo(23),
				expiresAt: daysAgo(22),
				decidedAt: daysAgo(22),
				youthTier: 'TIER_2',
				youthVerifiedExperienceCount: 3,
				youthAverageRating: 4.5,
				youthSkills: 'Excel, Bookkeeping, Customer Support, Data Entry',
				youthEducation: 'BCom Accounting, CPUT',
				youthLocation: 'Cape Town, Western Cape',
				youthAvailability: 'Weekdays after 2pm · weekends'
			},
			{
				id: 6,
				taskId: 8,
				taskTitle: 'Monthly Bookkeeping Cleanup',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				status: 'ACCEPTED',
				coverNote: 'Bookkeeping is my strongest subject and I can start immediately.',
				appliedAt: daysAgo(31),
				expiresAt: daysAgo(30),
				decidedAt: daysAgo(30),
				youthTier: 'TIER_2',
				youthVerifiedExperienceCount: 3,
				youthAverageRating: 4.5,
				youthSkills: 'Excel, Bookkeeping, Customer Support, Data Entry',
				youthEducation: 'BCom Accounting, CPUT',
				youthLocation: 'Cape Town, Western Cape',
				youthAvailability: 'Weekdays after 2pm · weekends'
			},
			{
				id: 7,
				taskId: 1,
				taskTitle: 'E-commerce Product Catalog Digitization',
				youthId: 2,
				youthName: 'Naledi Khumalo',
				status: 'PENDING',
				coverNote: 'I have photographed and loaded 200+ products for two local brands.',
				appliedAt: daysAgo(1, 4),
				expiresAt: daysAgo(-1),
				decidedAt: null,
				youthTier: 'TIER_1',
				youthVerifiedExperienceCount: 2,
				youthAverageRating: 4.8,
				youthSkills: 'Social Media, Canva, Copywriting, Product Photography',
				youthEducation: 'Diploma in Marketing, Vega',
				youthLocation: 'Johannesburg, Gauteng',
				youthAvailability: 'Immediate · flexible'
			},
			{
				id: 8,
				taskId: 1,
				taskTitle: 'E-commerce Product Catalog Digitization',
				youthId: 3,
				youthName: 'Sipho Dlamini',
				status: 'PENDING',
				coverNote: 'Fast, accurate data entry. I can work through the full catalogue this week.',
				appliedAt: daysAgo(1, 2),
				expiresAt: daysAgo(-1),
				decidedAt: null,
				youthTier: 'TIER_0',
				youthVerifiedExperienceCount: 0,
				youthAverageRating: null,
				youthSkills: 'Data Entry, Excel',
				youthEducation: 'Matric, Orlando High',
				youthLocation: 'Soweto, Gauteng',
				youthAvailability: 'Weekends'
			},
			{
				id: 9,
				taskId: 6,
				taskTitle: 'Data Capturing & Excel Reporting',
				youthId: 2,
				youthName: 'Naledi Khumalo',
				status: 'PENDING',
				coverNote: 'I am comfortable turning raw lists into a clean weekly dashboard.',
				appliedAt: daysAgo(0, 10),
				expiresAt: daysAgo(-2),
				decidedAt: null,
				youthTier: 'TIER_1',
				youthVerifiedExperienceCount: 2,
				youthAverageRating: 4.8,
				youthSkills: 'Social Media, Canva, Copywriting, Product Photography',
				youthEducation: 'Diploma in Marketing, Vega',
				youthLocation: 'Johannesburg, Gauteng',
				youthAvailability: 'Immediate · flexible'
			},
			{
				id: 10,
				taskId: 11,
				taskTitle: 'Invoice Template Design',
				youthId: 4,
				youthName: 'Lerato Maseko',
				status: 'PENDING',
				coverNote: 'I can design a clean template in Canva and write the handover guide.',
				appliedAt: daysAgo(0, 4),
				expiresAt: daysAgo(-2),
				decidedAt: null,
				youthTier: 'TIER_1',
				youthVerifiedExperienceCount: 1,
				youthAverageRating: 4.2,
				youthSkills: 'Design, Figma, Canva, Brand Systems',
				youthEducation: 'BA Visual Arts, Wits',
				youthLocation: 'Durban, KwaZulu-Natal',
				youthAvailability: 'Flexible'
			}
		],
		payments: [
			{
				id: 1,
				taskId: 4,
				taskTitle: 'Customer Onboarding & Verification Calls',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				totalAmount: 700,
				platformFee: 70,
				youthAmount: 630,
				status: 'PAID',
				reference: 'SANDBOX-2026-04-04-001',
				paidAt: daysAgo(3),
				createdAt: daysAgo(4)
			},
			{
				id: 2,
				taskId: 7,
				taskTitle: 'Website Copy Refresh',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				totalAmount: 900,
				platformFee: 90,
				youthAmount: 810,
				status: 'PAID',
				reference: 'SANDBOX-2026-04-08-002',
				paidAt: daysAgo(7),
				createdAt: daysAgo(8)
			},
			{
				id: 3,
				taskId: 8,
				taskTitle: 'Monthly Bookkeeping Cleanup',
				youthId: 1,
				youthName: 'Thabo Mokoena',
				totalAmount: 1300,
				platformFee: 130,
				youthAmount: 1170,
				status: 'PENDING',
				reference: null,
				paidAt: null,
				createdAt: daysAgo(16)
			}
		],
		wallet: {
			id: 1,
			name: 'Corporate ESD Reserve',
			balance: 100000,
			currency: 'ZAR',
			updatedAt: daysAgo(3)
		},
		walletTransactions: [
			{
				id: 1,
				type: 'CREDIT',
				amount: 150000,
				balanceAfter: 150000,
				reference: 'Initial ESD funding · Standard Bank Foundation',
				createdAt: daysAgo(120)
			},
			{
				id: 2,
				type: 'DEBIT',
				amount: 630,
				balanceAfter: 149370,
				reference: 'Payout for payment #1 · Customer Onboarding',
				createdAt: daysAgo(3)
			},
			{
				id: 3,
				type: 'DEBIT',
				amount: 810,
				balanceAfter: 148560,
				reference: 'Payout for payment #2 · Website Copy Refresh',
				createdAt: daysAgo(7)
			},
			{
				id: 4,
				type: 'DEBIT',
				amount: 1170,
				balanceAfter: 147390,
				reference: 'Reserved for payment #3 · Monthly Bookkeeping Cleanup',
				createdAt: daysAgo(16)
			}
		]
	};

	saveMockDb(initialDb);
	return initialDb;
}

function saveMockDb(db) {
	if (!browser) return;
	localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
}

/**
 * Wipes local demo changes and reseeds the sample database.
 * Used by the /demo page so every reviewer starts from the same story.
 */
export function resetMockDb() {
	if (!browser) return;
	localStorage.removeItem(MOCK_STORAGE_KEY);
	return getMockDb();
}

/**
 * Executes a simulated mock response for offline/fallback mode
 */
function handleMockFallback(endpoint, method, body) {
	const db = getMockDb();
	const cleanPath = endpoint.split('?')[0];
	const urlObj = new URL(endpoint, 'http://localhost');
	const params = urlObj.searchParams;

	// AUTH: Register
	if (cleanPath === '/api/v1/auth/register' && method === 'POST') {
		const user = {
			id: Math.floor(Math.random() * 1000) + 10,
			name: body.name,
			email: body.email,
			role: body.role,
			isActive: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		return {
			token: 'mock-jwt-token-' + Date.now(),
			tokenType: 'Bearer',
			expiresIn: 86400000,
			user
		};
	}

	// AUTH: Login
	if (cleanPath === '/api/v1/auth/login' && method === 'POST') {
		let role = 'YOUTH';
		let name = 'Thabo Mokoena';
		const email = body.email || '';
		if (email.includes('sme') || email.includes('business')) {
			role = 'SME';
			name = 'Kasi Craftworks Co.';
		} else if (email.includes('corp') || email.includes('sponsor')) {
			role = 'CORPORATE';
			name = 'Standard Bank Foundation';
		} else if (email.includes('admin')) {
			role = 'ADMIN';
			name = 'Platform Admin';
		}

		const user = {
			id: 1,
			name,
			email: body.email,
			role,
			isActive: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		return {
			token: 'mock-jwt-token-' + Date.now(),
			tokenType: 'Bearer',
			expiresIn: 86400000,
			user
		};
	}

	// TASKS: List (the real API exposes open tasks only)
	if (cleanPath === '/api/v1/tasks' && method === 'GET') {
		return db.tasks.filter((task) => task.status === 'OPEN');
	}

	// TASKS: My posted tasks (SME)
	if (cleanPath === '/api/v1/tasks/mine' && method === 'GET') {
		return db.tasks.filter((t) => Number(t.smeId) === 101);
	}

	// TASKS: Get single
	const taskGetMatch = cleanPath.match(/^\/api\/v1\/tasks\/(\d+)$/);
	if (taskGetMatch && method === 'GET') {
		const id = Number(taskGetMatch[1]);
		const found = db.tasks.find((t) => t.id === id);
		if (!found) throw new Error('Task not found');
		return found;
	}

	// TASKS: Create
	if (cleanPath === '/api/v1/tasks' && method === 'POST') {
		const newTask = {
			id: db.tasks.length > 0 ? Math.max(...db.tasks.map((t) => t.id)) + 1 : 1,
			title: body.title,
			description: body.description || '',
			category: body.category,
			status: 'OPEN',
			budget: Number(body.budget) || 0,
			durationDays: Number(body.durationDays) || 7,
			isPaid: Boolean(body.isPaid),
			requiredTier: body.requiredTier && body.requiredTier !== 'ALL' ? body.requiredTier : null,
			smeId: 101,
			smeBusinessName: 'Kasi Craftworks Co.',
			assignedToId: null,
			assignedToName: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		db.tasks.unshift(newTask);
		saveMockDb(db);
		return newTask;
	}

	// TASKS: Assign
	const taskAssignMatch = cleanPath.match(/^\/api\/v1\/tasks\/(\d+)\/assign$/);
	if (taskAssignMatch && method === 'PATCH') {
		const id = Number(taskAssignMatch[1]);
		const youthId = Number(params.get('youthId') || 1);
		const task = db.tasks.find((t) => t.id === id);
		if (!task) throw new Error('Task not found');
		const application = db.applications.find(
			(a) => a.taskId === id && Number(a.youthId) === youthId && a.status === 'PENDING'
		);
		if (!application) throw new Error('Youth has not applied for this task');
		db.applications.forEach((a) => {
			if (a.taskId === id && a.status === 'PENDING') {
				a.status = Number(a.youthId) === youthId ? 'ACCEPTED' : 'REJECTED';
				a.decidedAt = new Date().toISOString();
			}
		});
		task.assignedToId = youthId;
		task.assignedToName = application.youthName || 'Youth Candidate #' + youthId;
		task.status = 'IN_PROGRESS';
		task.updatedAt = new Date().toISOString();
		saveMockDb(db);
		return task;
	}

	// APPLICATIONS: Apply
	const applyMatch = cleanPath.match(/^\/api\/v1\/tasks\/(\d+)\/apply$/);
	if (applyMatch && method === 'POST') {
		const id = Number(applyMatch[1]);
		const task = db.tasks.find((t) => t.id === id);
		if (!task || task.status !== 'OPEN') throw new Error('Task is not open for applications');
		const youthId = 1;
		let application = db.applications.find(
			(a) => a.taskId === id && Number(a.youthId) === youthId
		);
		if (application && ['PENDING', 'ACCEPTED'].includes(application.status)) {
			throw new Error('An application for this task is already pending');
		}
		const verified = db.experiences.filter(
			(e) => Number(e.youthId) === youthId && e.isVerified
		).length;
		const limits = [1, 2, 3, Infinity];
		const tierIndex = verified >= 5 ? 3 : verified >= 3 ? 2 : verified >= 1 ? 1 : 0;
		const active =
			db.applications.filter(
				(a) => Number(a.youthId) === youthId && a.status === 'PENDING'
			).length +
			db.tasks.filter(
				(t) => t.status === 'IN_PROGRESS' && Number(t.assignedToId) === youthId
			).length;
		if (active >= limits[tierIndex]) {
			throw new Error(
				`Tier TIER_${tierIndex} allows at most ${limits[tierIndex]} active reservation(s)`
			);
		}
		const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
		const profile = db.profile || {};
		const rated = db.experiences.filter(
			(e) => Number(e.youthId) === youthId && e.isVerified && e.rating
		);
		const averageRating = rated.length
			? Math.round((rated.reduce((sum, e) => sum + Number(e.rating), 0) / rated.length) * 10) / 10
			: null;
		const applicantMeta = {
			youthTier: `TIER_${tierIndex}`,
			youthVerifiedExperienceCount: verified,
			youthAverageRating: averageRating,
			youthSkills: profile.skills || '',
			youthEducation: profile.education || '',
			youthLocation: profile.location || '',
			youthAvailability: profile.availability || '',
			youthBio: profile.bio || '',
			youthPortfolio: profile.portfolio || ''
		};
		if (!application) {
			application = {
				id: db.applications.length + 1,
				taskId: id,
				taskTitle: task.title,
				youthId,
				youthName: profile.userName || 'Thabo Mokoena',
				status: 'PENDING',
				coverNote: body?.coverNote || '',
				appliedAt: new Date().toISOString(),
				expiresAt,
				decidedAt: null,
				...applicantMeta
			};
			db.applications.push(application);
		} else {
			application.status = 'PENDING';
			application.coverNote = body?.coverNote || '';
			application.appliedAt = new Date().toISOString();
			application.expiresAt = expiresAt;
			application.decidedAt = null;
			Object.assign(application, applicantMeta);
		}
		saveMockDb(db);
		return application;
	}

	// APPLICATIONS: Mine
	if (cleanPath === '/api/v1/applications/mine' && method === 'GET') {
		return db.applications.filter((a) => Number(a.youthId) === 1);
	}

	// APPLICATIONS: For a task (SME)
	const taskApplicationsMatch = cleanPath.match(/^\/api\/v1\/tasks\/(\d+)\/applications$/);
	if (taskApplicationsMatch && method === 'GET') {
		const id = Number(taskApplicationsMatch[1]);
		return db.applications
			.filter((a) => a.taskId === id)
			.map((application) => ({ ...application, ...demoApplicantProfile(application.youthId) }));
	}

	// APPLICATIONS: Withdraw
	const withdrawMatch = cleanPath.match(/^\/api\/v1\/applications\/(\d+)\/withdraw$/);
	if (withdrawMatch && method === 'PATCH') {
		const id = Number(withdrawMatch[1]);
		const application = db.applications.find((a) => a.id === id);
		if (!application) throw new Error('Application not found');
		application.status = 'WITHDRAWN';
		application.decidedAt = new Date().toISOString();
		saveMockDb(db);
		return application;
	}

	// TIERS: Mine
	if (cleanPath === '/api/v1/tiers/me' && method === 'GET') {
		const verified = db.experiences.filter(
			(e) => Number(e.youthId) === 1 && e.isVerified
		).length;
		const tierIndex = verified >= 5 ? 3 : verified >= 3 ? 2 : verified >= 1 ? 1 : 0;
		const limits = [1, 2, 3, 2147483647];
		const active =
			db.applications.filter((a) => Number(a.youthId) === 1 && a.status === 'PENDING')
				.length +
			db.tasks.filter(
				(t) => t.status === 'IN_PROGRESS' && Number(t.assignedToId) === 1
			).length;
		return {
			tier: `TIER_${tierIndex}`,
			verifiedExperienceCount: verified,
			minVerifiedExperiences: [0, 1, 3, 5][tierIndex],
			maxVerifiedExperiences: [0, 2, 4, 2147483647][tierIndex],
			activeReservations: active,
			maxConcurrentReservations: limits[tierIndex],
			reservationWindowHours: 48,
			canApply: active < limits[tierIndex],
			checkedAt: new Date().toISOString()
		};
	}

	// YOUTH: My profile
	if (cleanPath === '/api/v1/youth/me' && method === 'GET') {
		if (!db.profile) {
			db.profile = {
				id: 1,
				userId: 1,
				userName: 'Thabo Mokoena',
				education: '',
				skills: '',
				portfolio: '',
				bio: '',
				location: 'Cape Town',
				availability: 'Immediate',
				isAlumni: false
			};
			saveMockDb(db);
		}
		return db.profile;
	}

	if (cleanPath === '/api/v1/youth/me' && method === 'PATCH') {
		if (!db.profile) db.profile = { id: 1, userId: 1, userName: 'Thabo Mokoena' };
		['education', 'skills', 'portfolio', 'bio', 'location', 'availability'].forEach((field) => {
			if (body && body[field] !== undefined) db.profile[field] = body[field];
		});
		if (body && body.shareFeedbackPublicly !== undefined) {
			db.profile.shareFeedbackPublicly = Boolean(body.shareFeedbackPublicly);
		}
		db.profile.updatedAt = new Date().toISOString();
		saveMockDb(db);
		return db.profile;
	}

	// TASKS: Complete
	const taskCompleteMatch = cleanPath.match(/^\/api\/v1\/tasks\/(\d+)\/complete$/);
	if (taskCompleteMatch && method === 'PATCH') {
		const id = Number(taskCompleteMatch[1]);
		const task = db.tasks.find((t) => t.id === id);
		if (!task) throw new Error('Task not found');
		task.status = 'COMPLETED';
		task.updatedAt = new Date().toISOString();

		// Auto create pending experience if not exists
		let exp = db.experiences.find((e) => e.taskId === id);
		if (!exp) {
			exp = {
				id: db.experiences.length + 1,
				status: 'PENDING',
				isVerified: false,
				feedback: null,
				rating: null,
				reference: null,
				verifiedAt: null,
				taskId: task.id,
				taskTitle: task.title,
				smeBusinessName: task.smeBusinessName || 'SME Partner',
				youthId: task.assignedToId || 1,
				youthName: task.assignedToName || 'Youth Candidate',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};
			db.experiences.unshift(exp);
		} else {
			exp.status = 'PENDING';
			exp.isVerified = false;
			exp.verifiedAt = null;
		}
		saveMockDb(db);
		return task;
	}

	// TASKS: Verify (rating + feedback + reference in the body)
	const taskVerifyMatch = cleanPath.match(/^\/api\/v1\/tasks\/(\d+)\/verify$/);
	if (taskVerifyMatch && method === 'PATCH') {
		const id = Number(taskVerifyMatch[1]);
		const task = db.tasks.find((t) => t.id === id);
		if (!task) throw new Error('Task not found');
		if (task.status !== 'COMPLETED') throw new Error('Only a COMPLETED task can be verified');
		if (!body?.feedback || !body?.reference || !body?.rating) {
			throw new Error('Rating, feedback and reference are required');
		}

		task.status = 'VERIFIED';
		task.updatedAt = new Date().toISOString();

		let exp = db.experiences.find((e) => e.taskId === id);
		if (!exp) {
			exp = {
				id: db.experiences.length + 1,
				taskId: task.id,
				taskTitle: task.title,
				smeBusinessName: task.smeBusinessName || 'SME Partner',
				youthId: task.assignedToId || 1,
				youthName: task.assignedToName || 'Youth Candidate',
				createdAt: new Date().toISOString()
			};
			db.experiences.unshift(exp);
		}
		exp.status = 'VERIFIED';
		exp.isVerified = true;
		exp.feedback = body.feedback;
		exp.rating = Number(body.rating);
		exp.reference = body.reference;
		exp.confirmedSkills = Array.isArray(body?.confirmedSkills)
			? body.confirmedSkills.filter((s) => s && s.trim()).map((s) => s.trim())
			: [];
		exp.chainVersion = 2;
		exp.verifiedAt = new Date().toISOString();
		exp.updatedAt = new Date().toISOString();

		let payment = db.payments.find((p) => p.taskId === id);
		if (!payment) {
			const total = Number(task.budget) || 0;
			const platformFee = Math.round(total * 0.1 * 100) / 100;
			payment = {
				id: db.payments.length + 1,
				taskId: id,
				taskTitle: task.title,
				youthId: exp.youthId,
				youthName: exp.youthName,
				totalAmount: total,
				platformFee,
				youthAmount: Math.round((total - platformFee) * 100) / 100,
				status: 'PENDING',
				reference: null,
				paidAt: null,
				createdAt: new Date().toISOString()
			};
			db.payments.push(payment);
		}
		saveMockDb(db);
		return { task, experience: exp, payment };
	}

	// TASKS: Send back for revision
	const taskRejectMatch = cleanPath.match(/^\/api\/v1\/tasks\/(\d+)\/reject$/);
	if (taskRejectMatch && method === 'PATCH') {
		const id = Number(taskRejectMatch[1]);
		const task = db.tasks.find((t) => t.id === id);
		if (!task) throw new Error('Task not found');
		if (task.status !== 'COMPLETED') throw new Error('Only a COMPLETED task can be revised');
		if (!body?.reason) throw new Error('A revision reason is required');
		task.status = 'IN_PROGRESS';
		task.revisionReason = body.reason;
		task.revisionCount = (task.revisionCount || 0) + 1;
		task.updatedAt = new Date().toISOString();
		const exp = db.experiences.find((e) => e.taskId === id);
		if (exp) {
			exp.status = 'REJECTED';
			exp.rejectionReason = body.reason;
			exp.updatedAt = new Date().toISOString();
		}
		saveMockDb(db);
		return task;
	}

	// TASKS: Cancel (owner SME; releases outstanding PENDING applications)
	const taskCancelMatch = cleanPath.match(/^\/api\/v1\/tasks\/(\d+)\/cancel$/);
	if (taskCancelMatch && method === 'PATCH') {
		const id = Number(taskCancelMatch[1]);
		const task = db.tasks.find((t) => t.id === id);
		if (!task) throw new Error('Task not found');
		if (task.status !== 'OPEN' && task.status !== 'IN_PROGRESS') {
			throw new Error('Only an OPEN or IN_PROGRESS task can be cancelled');
		}
		task.status = 'CANCELLED';
		task.updatedAt = new Date().toISOString();
		if (!Array.isArray(db.applications)) db.applications = [];
		db.applications
			.filter((a) => a.taskId === id && a.status === 'PENDING')
			.forEach((a) => {
				a.status = 'REJECTED';
				a.decidedAt = new Date().toISOString();
			});
		saveMockDb(db);
		return task;
	}

	// ADMIN: Youth roster (verified tiers + alumni status)
	if (cleanPath === '/api/v1/admin/youth' && method === 'GET') {
		const tierFromVerified = (verified) =>
			verified >= 5 ? 'TIER_3' : verified >= 3 ? 'TIER_2' : verified >= 1 ? 'TIER_1' : 'TIER_0';
		const roster = [];
		const totalVerified = Array.isArray(db.experiences)
			? db.experiences.filter((e) => e.isVerified && Number(e.youthId) === 1).length
			: 0;
		roster.push({
			id: Number(db.profile?.id) || 1,
			userName: db.profile?.userName || 'Demo Youth',
			tier: tierFromVerified(totalVerified),
			verifiedExperiences: totalVerified,
			isAlumni: Boolean(db.profile?.isAlumni),
			alumniDate: db.profile?.alumniDate || null
		});
		// Demo applicants 2..4 (names known to the demo seed)
		const applicantNames = { 2: 'Naledi Khumalo', 3: 'Sibusiso Mathonsi', 4: 'Lerato Maseko' };
		Object.keys(applicantNames).forEach((key) => {
			const youthId = Number(key);
			const verified = Array.isArray(db.experiences)
				? db.experiences.filter(
						(e) => e.isVerified && Number(e.youthId) === youthId
					).length
				: 0;
			roster.push({
				id: youthId,
				userName: applicantNames[key],
				tier: tierFromVerified(verified),
				verifiedExperiences: verified,
				isAlumni: false,
				alumniDate: null
			});
		});
		return roster.sort((a, b) => Number(a.isAlumni) - Number(b.isAlumni) || a.id - b.id);
	}

	// ADMIN: Mark a youth as placed (alumni)
	const adminYouthMatch = cleanPath.match(/^\/api\/v1\/admin\/youth\/(\d+)\/mark-placed$/);
	if (adminYouthMatch && method === 'PATCH') {
		const id = Number(adminYouthMatch[1]);
		const alumniDate = new Date().toISOString();
		if (id === Number(db.profile?.id)) {
			db.profile.isAlumni = true;
			if (!db.profile.alumniDate) db.profile.alumniDate = alumniDate;
			db.profile.updatedAt = alumniDate;
			saveMockDb(db);
			return {
				id,
				userName: db.profile.userName,
				tier: 'TIER_2',
				verifiedExperiences: Array.isArray(db.experiences)
					? db.experiences.filter((e) => e.isVerified).length
					: 0,
				isAlumni: true,
				alumniDate: db.profile.alumniDate
			};
		}
		const names = { 2: 'Naledi Khumalo', 3: 'Sibusiso Mathonsi', 4: 'Lerato Maseko' };
		if (names[id]) {
			const verified = Array.isArray(db.experiences)
				? db.experiences.filter(
						(e) => e.isVerified && Number(e.youthId) === id
					).length
				: 0;
			const tier = verified >= 5 ? 'TIER_3' : verified >= 3 ? 'TIER_2' : verified >= 1 ? 'TIER_1' : 'TIER_0';
			return { id, userName: names[id], tier, verifiedExperiences: verified, isAlumni: true, alumniDate };
		}
		throw new Error('Youth not found');
	}

	// CORPORATE: Consolidated funder impact report
	if (cleanPath === '/api/v1/corporate/impact' && method === 'GET') {
		if (!db.wallet) {
			db.wallet = { id: 1, name: 'Corporate ESD Reserve', balance: 100000, currency: 'ZAR' };
		}
		const transactions = db.walletTransactions || [];
		const totalPledged = transactions
			.filter((t) => t.type === 'CREDIT')
			.reduce((sum, t) => sum + Number(t.amount || 0), 0);
		const paid = db.payments.filter((p) => p.status === 'PAID');
		const pending = db.payments.filter(
			(p) => p.status === 'PENDING' || p.status === 'PROCESSING'
		);
		const round2 = (v) => Math.round(v * 100) / 100;
		const verifiedExps = db.experiences.filter((e) => e.isVerified);
		const ratings = verifiedExps.map((e) => Number(e.rating)).filter((r) => !Number.isNaN(r) && r > 0);
		return {
			reserveBalance: Number(db.wallet.balance),
			totalPledged: round2(totalPledged || 100000),
			totalDisbursed: round2(paid.reduce((sum, p) => sum + Number(p.youthAmount || 0), 0)),
			platformFees: round2(paid.reduce((sum, p) => sum + Number(p.platformFee || 0), 0)),
			pendingPayoutCount: pending.length,
			pendingPayoutValue: round2(pending.reduce((sum, p) => sum + Number(p.youthAmount || 0), 0)),
			youthImpacted: new Set(paid.map((p) => p.youthId)).size,
			verifiedExperiences: verifiedExps.length,
			ledgerSeals: verifiedExps.length,
			tasksDelivered: db.tasks.filter((t) => t.status === 'VERIFIED').length,
			averageRating: ratings.length
				? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
				: 0
		};
	}

	// EXPERIENCES: List for youth
	const expYouthMatch = cleanPath.match(/^\/api\/v1\/experiences\/youth\/(\d+)$/);
	if (expYouthMatch && method === 'GET') {
		const youthId = Number(expYouthMatch[1]);
		return db.experiences.filter((e) => Number(e.youthId) === youthId);
	}

	// EXPERIENCES: Get single
	const expGetMatch = cleanPath.match(/^\/api\/v1\/experiences\/(\d+)$/);
	if (expGetMatch && method === 'GET') {
		const id = Number(expGetMatch[1]);
		const exp = db.experiences.find((e) => e.id === id);
		if (!exp) throw new Error('Experience not found');
		return exp;
	}

	// EXPERIENCES: Verify
	const expVerifyMatch = cleanPath.match(/^\/api\/v1\/experiences\/(\d+)\/verify$/);
	if (expVerifyMatch && method === 'PATCH') {
		const id = Number(expVerifyMatch[1]);
		const feedback = body?.feedback || '';
		const rating = Number(body?.rating || 5);
		const reference = body?.reference || '';
		const exp = db.experiences.find((e) => e.id === id);
		if (!exp) throw new Error('Experience not found');
		if (!feedback || !reference) throw new Error('Feedback and reference are required');

		exp.isVerified = true;
		exp.status = 'VERIFIED';
		exp.feedback = feedback;
		exp.rating = rating;
		exp.reference = reference;
		exp.confirmedSkills = Array.isArray(body?.confirmedSkills)
			? body.confirmedSkills.filter((s) => s && s.trim()).map((s) => s.trim())
			: [];
		exp.chainVersion = 2;
		exp.verifiedAt = new Date().toISOString();
		exp.updatedAt = new Date().toISOString();

		// Also update corresponding task if available
		const task = db.tasks.find((t) => t.id === exp.taskId);
		if (task) {
			task.status = 'VERIFIED';
			task.updatedAt = new Date().toISOString();
		}

		saveMockDb(db);
		return exp;
	}

	// PAYMENTS: My payments
	if (cleanPath === '/api/v1/payments/mine' && method === 'GET') {
		return db.payments.filter((p) => Number(p.youthId) === 1);
	}

	// PAYMENTS: Admin payout queue
	if (cleanPath === '/api/v1/payments' && method === 'GET') {
		return [...db.payments].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
	}

	// PAYMENTS: Payout (sandbox)
	const payoutMatch = cleanPath.match(/^\/api\/v1\/payments\/(\d+)\/payout$/);
	if (payoutMatch && method === 'POST') {
		const id = Number(payoutMatch[1]);
		const payment = db.payments.find((p) => p.id === id);
		if (!payment) throw new Error('Payment not found');
		if (payment.status === 'PAID') throw new Error('Payment has already been paid');
		payment.status = 'PAID';
		payment.reference = 'SANDBOX-' + Date.now();
		payment.paidAt = new Date().toISOString();
		if (!db.wallet) {
			db.wallet = { id: 1, name: 'Corporate ESD Reserve', balance: 100000, currency: 'ZAR' };
		}
		db.wallet.balance = Math.max(0, Number(db.wallet.balance) - Number(payment.youthAmount || 0));
		db.wallet.updatedAt = new Date().toISOString();
		if (!db.walletTransactions) db.walletTransactions = [];
		db.walletTransactions.unshift({
			id: db.walletTransactions.length + 1,
			type: 'DEBIT',
			amount: Number(payment.youthAmount || 0),
			balanceAfter: db.wallet.balance,
			reference: `Payout for payment #${payment.id} · ${payment.taskTitle}`,
			createdAt: new Date().toISOString()
		});
		saveMockDb(db);
		return payment;
	}

	// WALLET: Reserve balance
	if (cleanPath === '/api/v1/wallets/reserve' && method === 'GET') {
		if (!db.wallet) {
			db.wallet = {
				id: 1,
				name: 'Corporate ESD Reserve',
				balance: 100000,
				currency: 'ZAR',
				updatedAt: new Date().toISOString()
			};
			saveMockDb(db);
		}
		return db.wallet;
	}

	// WALLET: Transactions
	if (cleanPath === '/api/v1/wallets/reserve/transactions' && method === 'GET') {
		return db.walletTransactions || [];
	}

	// WALLET: Fund reserve
	if (cleanPath === '/api/v1/wallets/reserve/fund' && method === 'POST') {
		if (!db.wallet) {
			db.wallet = { id: 1, name: 'Corporate ESD Reserve', balance: 0, currency: 'ZAR' };
		}
		const amount = Number(body?.amount) || 0;
		if (amount <= 0) throw new Error('Funding amount must be greater than zero');
		db.wallet.balance = Number(db.wallet.balance) + amount;
		db.wallet.updatedAt = new Date().toISOString();
		if (!db.walletTransactions) db.walletTransactions = [];
		db.walletTransactions.unshift({
			id: db.walletTransactions.length + 1,
			type: 'CREDIT',
			amount,
			balanceAfter: db.wallet.balance,
			reference: body?.reference || 'Corporate reserve funding',
			createdAt: new Date().toISOString()
		});
		saveMockDb(db);
		return db.wallet;
	}

	// LEDGER: Public entries
	if (cleanPath === '/api/v1/ledger/entries' && method === 'GET') {
		return db.experiences
			.filter((e) => e.isVerified)
			.map((e, index) => {
				// POPIA whitelist: a reference is operational evidence and is
				// never published anonymously; the feedback quote shows only
				// when the youth opted in (demo Thabo has opted in).
				const feedbackShared = Number(e.youthId) === 1 && (db.profile?.shareFeedbackPublicly ?? false);
				return {
					id: index + 1,
					sequence: index + 1,
					experienceId: e.id,
					taskId: e.taskId,
					youthId: e.youthId,
					rating: e.rating,
					feedback: feedbackShared ? e.feedback : null,
					reference: null,
					confirmedSkills: Array.isArray(e.confirmedSkills) ? e.confirmedSkills : [],
					chainVersion: 2,
					verifiedAt: e.verifiedAt,
					previousHash: index === 0 ? 'GENESIS' : 'demo-hash-' + index,
					hash: 'demo-hash-' + (index + 1)
				};
			});
	}

	// LEDGER: Verify chain
	if (cleanPath === '/api/v1/ledger/verify' && method === 'GET') {
		const count = db.experiences.filter((e) => e.isVerified).length;
		return {
			valid: true,
			checkedEntries: count,
			brokenAtSequence: null,
			message: `Ledger chain is intact (${count} entries verified)`
		};
	}

	// LEDGER: Verify one experience
	const ledgerExperienceMatch = cleanPath.match(/^\/api\/v1\/ledger\/verify\/(\d+)$/);
	if (ledgerExperienceMatch && method === 'GET') {
		const experienceId = Number(ledgerExperienceMatch[1]);
		const exp = db.experiences.find((e) => e.id === experienceId && e.isVerified);
		if (!exp) throw new Error('No ledger entry for this experience');
		const count = db.experiences.filter((e) => e.isVerified).length;
		return {
			valid: true,
			checkedEntries: count,
			brokenAtSequence: null,
			message: `Entry for experience #${experienceId} is valid and chains back to genesis`
		};
	}

	throw new Error(`Unhandled mock route: ${method} ${endpoint}`);
}

/**
 * Main HTTP request wrapper
 * @param {string} endpoint
 * @param {RequestInit & { isAuth?: boolean }} options
 */
export async function request(endpoint, options = {}) {
	const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
	const headers = new Headers(options.headers || {});
	const method = options.method || 'GET';
	let parsedBody = options.body;
	if (typeof options.body === 'string') {
		try {
			parsedBody = JSON.parse(options.body);
		} catch {
			parsedBody = options.body;
		}
	}

	// Demo mode deliberately bypasses the network so the full story works
	// without a backend, seeded accounts, or a clean database.
	if (browser && isDemoMode()) {
		await new Promise((resolve) => setTimeout(resolve, 140));
		try {
			return handleMockFallback(endpoint, method, parsedBody);
		} catch (mockError) {
			throw new Error(mockError.message || 'Demo route is unavailable.');
		}
	}

	if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
		headers.set('Content-Type', 'application/json');
	}

	// Add Bearer token for authenticated requests
	if (browser) {
		const token = localStorage.getItem(TOKEN_KEY);
		if (token && !headers.has('Authorization')) {
			headers.set('Authorization', `Bearer ${token}`);
		}
	}

	let response;
	try {
		response = await fetch(url, {
			...options,
			headers
		});
	} catch (networkError) {
		// If backend is not running or network fails, gracefully fallback to mock database in browser
		if (browser) {
			console.warn(`[API] Backend unavailable at ${API_BASE_URL}. Using browser fallback data.`, networkError);
			try {
				const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
				const mockData = handleMockFallback(endpoint, options.method || 'GET', body);
				return mockData;
			} catch (mockErr) {
				console.error('[API] Fallback handler failed:', mockErr);
				throw new Error(mockErr.message || 'Network connection failed and mock response was unavailable.');
			}
		}
		throw new Error('Could not connect to backend server at ' + API_BASE_URL);
	}

	// Handle 401 Unauthorized
	if (response.status === 401) {
		if (browser && !endpoint.includes('/auth/')) {
			toast.error('Session expired. Please log in again.');
			auth.logout();
		}
		throw new Error('Unauthorized');
	}

	let json;
	try {
		json = await response.json();
	} catch (e) {
		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status} (${response.statusText})`);
		}
		return null;
	}

	if (!response.ok || (json && json.success === false)) {
		const msg = json?.message || `Request failed with status ${response.status}`;
		throw new Error(msg);
	}

	// Envelope: { success: true, message: "...", data: { ... } }
	return json.data !== undefined ? json.data : json;
}

export const api = {
	get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
	post: (endpoint, body, options = {}) =>
		request(endpoint, {
			...options,
			method: 'POST',
			body: body instanceof FormData ? body : JSON.stringify(body)
		}),
	patch: (endpoint, body, options = {}) =>
		request(endpoint, {
			...options,
			method: 'PATCH',
			body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
		}),
	delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),

	// Domain helpers
	auth: {
		login: (credentials) => api.post('/api/v1/auth/login', credentials),
		register: (userData) => api.post('/api/v1/auth/register', userData)
	},
	tasks: {
		list: () => api.get('/api/v1/tasks'),
		mine: () => api.get('/api/v1/tasks/mine'),
		get: (id) => api.get(`/api/v1/tasks/${id}`),
		create: (task) => api.post('/api/v1/tasks', task),
		assign: (id, youthId) =>
			api.patch(`/api/v1/tasks/${id}/assign?youthId=${encodeURIComponent(youthId)}`),
		complete: (id) => api.patch(`/api/v1/tasks/${id}/complete`),
		verify: (id, feedback, rating, reference, confirmedSkills = []) =>
			api.patch(`/api/v1/tasks/${id}/verify`, {
				feedback,
				rating: Number(rating),
				reference,
				confirmedSkills
			}),
		reject: (id, reason) => api.patch(`/api/v1/tasks/${id}/reject`, { reason }),
		cancel: (id, reason = '') => api.patch(`/api/v1/tasks/${id}/cancel`, { reason })
	},
	applications: {
		apply: (taskId, coverNote = '') =>
			api.post(`/api/v1/tasks/${taskId}/apply`, { coverNote }),
		mine: () => api.get('/api/v1/applications/mine'),
		forTask: (taskId) => api.get(`/api/v1/tasks/${taskId}/applications`),
		withdraw: (id) => api.patch(`/api/v1/applications/${id}/withdraw`)
	},
	tiers: {
		me: () => api.get('/api/v1/tiers/me')
	},
	youth: {
		me: () => api.get('/api/v1/youth/me'),
		update: (profile) => api.patch('/api/v1/youth/me', profile)
	},
	experiences: {
		get: (id) => api.get(`/api/v1/experiences/${id}`),
		listForYouth: (youthId) => api.get(`/api/v1/experiences/youth/${youthId}`),
		verify: (id, feedback, rating, reference, confirmedSkills = []) =>
			api.patch(`/api/v1/experiences/${id}/verify`, {
				feedback,
				rating: Number(rating),
				reference,
				confirmedSkills
			})
	},
	admin: {
		youth: () => api.get('/api/v1/admin/youth'),
		markPlaced: (id) => api.patch(`/api/v1/admin/youth/${id}/mark-placed`)
	},
	corporate: {
		impact: () => api.get('/api/v1/corporate/impact')
	},
	payments: {
		mine: () => api.get('/api/v1/payments/mine'),
		listAll: () => api.get('/api/v1/payments'),
		get: (id) => api.get(`/api/v1/payments/${id}`),
		payout: (id) => api.post(`/api/v1/payments/${id}/payout`)
	},
	wallet: {
		reserve: () => api.get('/api/v1/wallets/reserve'),
		fund: (amount, reference) =>
			api.post('/api/v1/wallets/reserve/fund', { amount: Number(amount), reference }),
		transactions: () => api.get('/api/v1/wallets/reserve/transactions')
	},
	ledger: {
		entries: () => api.get('/api/v1/ledger/entries'),
		verify: () => api.get('/api/v1/ledger/verify'),
		verifyExperience: (experienceId) =>
			api.get(`/api/v1/ledger/verify/${experienceId}`)
	},
	demo: {
		reset: () => resetMockDb()
	}
};

export default api;
