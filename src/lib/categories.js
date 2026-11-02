/*
 * MOVO transaction categories (docs/TRANSACTION_CATEGORIES.md).
 *
 * Storage: `transactions.category` holds a stable id, never a translated label: a group id ("transport") or
 * "group:sub" ("transport:ride_hailing"). Older records hold labels ("Food & drinks", "Transport", …) or custom text;
 * `categoryOf` maps every value to one shape on read, so nothing stored has to be rewritten. Unknown text is kept as a
 * custom label under Other.
 *
 * The quick picker shows the 12 compact categories (§5). Each detailed group (§3) belongs to one of them; its
 * subcategories are offered once a category is chosen. Income and Transfer are directions, not expense categories.
 */

/* The 12 compact categories for quick entry (§5): id, label, icon, tone. */
export const PRIMARY = [
  { id: 'food', label: 'Food & Dining', icon: 'food', tone: 'orange' },
  { id: 'transport', label: 'Transportation', icon: 'transfer', tone: 'blue' },
  { id: 'housing', label: 'Housing & Home', icon: 'home', tone: 'teal' },
  { id: 'bills', label: 'Bills & Utilities', icon: 'receipt', tone: 'amber' },
  { id: 'shopping', label: 'Shopping', icon: 'tag', tone: 'violet' },
  { id: 'health', label: 'Health & Medical', icon: 'shield', tone: 'red' },
  { id: 'personal_care', label: 'Personal Care', icon: 'face', tone: 'violet' },
  { id: 'entertainment', label: 'Entertainment', icon: 'star', tone: 'violet' },
  { id: 'travel', label: 'Travel', icon: 'globe', tone: 'teal' },
  { id: 'education', label: 'Education', icon: 'doc', tone: 'blue' },
  { id: 'financial', label: 'Financial & Debt', icon: 'bank', tone: 'gray' },
  { id: 'other', label: 'Other', icon: 'layout', tone: 'gray' },
];
const NON_EXPENSE = { income: { id: 'income', label: 'Income', icon: 'arrowDown', tone: 'green' }, transfer: { id: 'transfer', label: 'Transfer', icon: 'transfer', tone: 'gray' } };

/* Generated from docs/TRANSACTION_CATEGORIES.md §3 (22 detailed groups). Stable ids: `group` or `group:sub`. */
export const GROUPS = [
  { id: 'food', label: "Food & Dining", primary: 'food', subs: [["groceries", "Groceries"], ["restaurants", "Restaurants"], ["fast_food", "Fast Food"], ["coffee_and_tea", "Coffee & Tea"], ["food_delivery", "Food Delivery"], ["snacks_and_desserts", "Snacks & Desserts"], ["bakery", "Bakery"], ["alcohol_and_beverages", "Alcohol & Beverages"], ["convenience_stores", "Convenience Stores"], ["dining_out", "Dining Out"]] },
  { id: 'transport', label: "Transportation", primary: 'transport', subs: [["fuel_gas", "Fuel / Gas"], ["public_transportation", "Public Transportation"], ["taxi", "Taxi"], ["ride_hailing", "Ride-Hailing"], ["parking", "Parking"], ["toll_fees", "Toll Fees"], ["car_maintenance", "Car Maintenance"], ["car_wash", "Car Wash"], ["vehicle_registration", "Vehicle Registration"], ["car_insurance", "Car Insurance"], ["motorcycle_expenses", "Motorcycle Expenses"], ["bicycle_expenses", "Bicycle Expenses"], ["car_rental", "Car Rental"], ["airfare", "Airfare"], ["train_and_bus_tickets", "Train & Bus Tickets"], ["ferry_tickets", "Ferry Tickets"]] },
  { id: 'housing', label: "Housing & Home", primary: 'housing', subs: [["rent", "Rent"], ["mortgage", "Mortgage"], ["home_repairs", "Home Repairs"], ["home_maintenance", "Home Maintenance"], ["furniture", "Furniture"], ["home_appliances", "Home Appliances"], ["home_supplies", "Home Supplies"], ["cleaning_services", "Cleaning Services"], ["home_improvement", "Home Improvement"], ["property_taxes", "Property Taxes"], ["condo_association_fees", "Condo Association Fees"], ["security_services", "Security Services"]] },
  { id: 'bills', label: "Bills & Utilities", primary: 'bills', subs: [["electricity", "Electricity"], ["water", "Water"], ["internet", "Internet"], ["mobile_phone", "Mobile Phone"], ["landline", "Landline"], ["cable_tv", "Cable TV"], ["streaming_services", "Streaming Services"], ["gas_utility", "Gas Utility"], ["waste_collection", "Waste Collection"], ["association_dues", "Association Dues"], ["cloud_storage", "Cloud Storage"], ["software_subscriptions", "Software Subscriptions"]] },
  { id: 'shopping', label: "Shopping & Personal Items", primary: 'shopping', subs: [["clothing", "Clothing"], ["shoes", "Shoes"], ["bags_and_accessories", "Bags & Accessories"], ["electronics", "Electronics"], ["gadgets", "Gadgets"], ["household_items", "Household Items"], ["beauty_products", "Beauty Products"], ["personal_care", "Personal Care"], ["jewelry", "Jewelry"], ["online_shopping", "Online Shopping"], ["gifts", "Gifts"], ["general_merchandise", "General Merchandise"]] },
  { id: 'health', label: "Health & Medical", primary: 'health', subs: [["doctor_consultation", "Doctor Consultation"], ["hospital", "Hospital"], ["medicine_and_pharmacy", "Medicine & Pharmacy"], ["laboratory_tests", "Laboratory Tests"], ["dental_care", "Dental Care"], ["eye_care", "Eye Care"], ["health_insurance", "Health Insurance"], ["medical_equipment", "Medical Equipment"], ["vitamins_and_supplements", "Vitamins & Supplements"], ["therapy", "Therapy"], ["fitness_and_wellness", "Fitness & Wellness"]] },
  { id: 'lifestyle', label: "Personal Care & Lifestyle", primary: 'personal_care', subs: [["haircut_and_barber", "Haircut & Barber"], ["salon_and_spa", "Salon & Spa"], ["skincare", "Skincare"], ["cosmetics", "Cosmetics"], ["massage", "Massage"], ["laundry", "Laundry"], ["dry_cleaning", "Dry Cleaning"], ["gym_membership", "Gym Membership"], ["sports_and_recreation", "Sports & Recreation"], ["hobbies", "Hobbies"], ["personal_services", "Personal Services"]] },
  { id: 'entertainment', label: "Entertainment & Recreation", primary: 'entertainment', subs: [["movies", "Movies"], ["concerts", "Concerts"], ["events_and_tickets", "Events & Tickets"], ["gaming", "Gaming"], ["video_games", "Video Games"], ["music_subscriptions", "Music Subscriptions"], ["streaming_entertainment", "Streaming Entertainment"], ["books", "Books"], ["hobbies", "Hobbies"], ["amusement_parks", "Amusement Parks"], ["nightlife", "Nightlife"], ["sports_activities", "Sports Activities"]] },
  { id: 'travel', label: "Travel & Accommodation", primary: 'travel', subs: [["hotels", "Hotels"], ["resorts", "Resorts"], ["vacation_rentals", "Vacation Rentals"], ["flights", "Flights"], ["travel_packages", "Travel Packages"], ["travel_insurance", "Travel Insurance"], ["local_tours", "Local Tours"], ["international_tours", "International Tours"], ["travel_documents", "Travel Documents"], ["visa_fees", "Visa Fees"], ["luggage", "Luggage"], ["travel_supplies", "Travel Supplies"]] },
  { id: 'education', label: "Education & Learning", primary: 'education', subs: [["tuition_fees", "Tuition Fees"], ["school_supplies", "School Supplies"], ["books_and_references", "Books & References"], ["online_courses", "Online Courses"], ["training", "Training"], ["certifications", "Certifications"], ["school_transportation", "School Transportation"], ["examination_fees", "Examination Fees"], ["educational_software", "Educational Software"], ["seminars_and_workshops", "Seminars & Workshops"]] },
  { id: 'family', label: "Family & Children", primary: 'other', subs: [["childcare", "Childcare"], ["baby_supplies", "Baby Supplies"], ["children_s_clothing", "Children's Clothing"], ["school_expenses", "School Expenses"], ["toys", "Toys"], ["allowance", "Allowance"], ["family_support", "Family Support"], ["elderly_care", "Elderly Care"], ["family_activities", "Family Activities"], ["child_health_expenses", "Child Health Expenses"]] },
  { id: 'pets', label: "Pets", primary: 'other', subs: [["pet_food", "Pet Food"], ["veterinary_care", "Veterinary Care"], ["pet_medicine", "Pet Medicine"], ["grooming", "Grooming"], ["pet_supplies", "Pet Supplies"], ["pet_insurance", "Pet Insurance"], ["pet_boarding", "Pet Boarding"], ["pet_training", "Pet Training"], ["pet_accessories", "Pet Accessories"]] },
  { id: 'fees', label: "Financial Expenses", primary: 'financial', subs: [["bank_fees", "Bank Fees"], ["atm_withdrawal_fees", "ATM Withdrawal Fees"], ["credit_card_interest", "Credit Card Interest"], ["loan_interest", "Loan Interest"], ["loan_fees", "Loan Fees"], ["annual_card_fees", "Annual Card Fees"], ["foreign_transaction_fees", "Foreign Transaction Fees"], ["currency_conversion_fees", "Currency Conversion Fees"], ["investment_fees", "Investment Fees"], ["financial_advisory_fees", "Financial Advisory Fees"], ["late_payment_fees", "Late Payment Fees"], ["overdraft_fees", "Overdraft Fees"]] },
  { id: 'debt', label: "Debt Payments", primary: 'financial', subs: [["credit_card_payment", "Credit Card Payment"], ["personal_loan_payment", "Personal Loan Payment"], ["home_loan_payment", "Home Loan Payment"], ["car_loan_payment", "Car Loan Payment"], ["student_loan_payment", "Student Loan Payment"], ["business_loan_payment", "Business Loan Payment"], ["buy_now_pay_later", "Buy Now, Pay Later"], ["installment_payments", "Installment Payments"], ["other_debt_payments", "Other Debt Payments"]] },
  { id: 'insurance', label: "Insurance", primary: 'financial', subs: [["health_insurance", "Health Insurance"], ["life_insurance", "Life Insurance"], ["car_insurance", "Car Insurance"], ["home_insurance", "Home Insurance"], ["travel_insurance", "Travel Insurance"], ["accident_insurance", "Accident Insurance"], ["property_insurance", "Property Insurance"], ["business_insurance", "Business Insurance"], ["other_insurance", "Other Insurance"]] },
  { id: 'work', label: "Work & Professional Expenses", primary: 'other', subs: [["office_supplies", "Office Supplies"], ["work_equipment", "Work Equipment"], ["software_and_tools", "Software & Tools"], ["internet_for_work", "Internet for Work"], ["transportation_for_work", "Transportation for Work"], ["business_meals", "Business Meals"], ["professional_memberships", "Professional Memberships"], ["work_clothing", "Work Clothing"], ["coworking_space", "Coworking Space"], ["professional_services", "Professional Services"], ["advertising", "Advertising"], ["training_and_certifications", "Training & Certifications"]] },
  { id: 'business', label: "Business Expenses", primary: 'other', subs: [["rent_and_office_space", "Rent & Office Space"], ["employee_salaries", "Employee Salaries"], ["contractor_payments", "Contractor Payments"], ["marketing_and_advertising", "Marketing & Advertising"], ["business_utilities", "Business Utilities"], ["inventory_and_supplies", "Inventory & Supplies"], ["equipment", "Equipment"], ["shipping_and_delivery", "Shipping & Delivery"], ["payment_processing_fees", "Payment Processing Fees"], ["business_travel", "Business Travel"], ["accounting_services", "Accounting Services"], ["legal_services", "Legal Services"], ["taxes_and_licenses", "Taxes & Licenses"], ["business_insurance", "Business Insurance"]] },
  { id: 'gifts', label: "Gifts & Donations", primary: 'other', subs: [["birthday_gifts", "Birthday Gifts"], ["holiday_gifts", "Holiday Gifts"], ["wedding_gifts", "Wedding Gifts"], ["charitable_donations", "Charitable Donations"], ["religious_donations", "Religious Donations"], ["community_support", "Community Support"], ["fundraising", "Fundraising"], ["personal_contributions", "Personal Contributions"]] },
  { id: 'government', label: "Government & Legal", primary: 'other', subs: [["income_tax", "Income Tax"], ["property_tax", "Property Tax"], ["local_government_fees", "Local Government Fees"], ["permits_and_licenses", "Permits & Licenses"], ["passport_fees", "Passport Fees"], ["legal_fees", "Legal Fees"], ["document_processing", "Document Processing"], ["registration_fees", "Registration Fees"], ["government_contributions", "Government Contributions"]] },
  { id: 'cash', label: "Cash & ATM", primary: 'financial', subs: [["atm_withdrawal", "ATM Withdrawal"], ["cash_advance", "Cash Advance"], ["cash_purchase", "Cash Purchase"], ["cash_deposit_fees", "Cash Deposit Fees"], ["cash_handling_fees", "Cash Handling Fees"]] },
  { id: 'digital', label: "Digital Services & Technology", primary: 'bills', subs: [["mobile_applications", "Mobile Applications"], ["ai_subscriptions", "AI Subscriptions"], ["website_hosting", "Website Hosting"], ["domains", "Domains"], ["cloud_computing", "Cloud Computing"], ["digital_products", "Digital Products"], ["online_storage", "Online Storage"], ["gaming_subscriptions", "Gaming Subscriptions"], ["vpn_services", "VPN Services"], ["digital_memberships", "Digital Memberships"], ["api_usage", "API Usage"], ["web_services", "Web Services"]] },
  { id: 'misc', label: "Miscellaneous", primary: 'other', subs: [["uncategorized_expense", "Uncategorized Expense"], ["one_time_expense", "One-Time Expense"], ["unexpected_expense", "Unexpected Expense"], ["other_personal_expense", "Other Personal Expense"], ["other_household_expense", "Other Household Expense"], ["other_business_expense", "Other Business Expense"]] },
];

/* "Uncategorized / Needs review" (§7): used when a guess is not clear enough to make. */
export const NEEDS_REVIEW = 'misc:uncategorized_expense';

const PRIMARY_BY_ID = Object.fromEntries(PRIMARY.map(p => [p.id, p]));
const GROUP_BY_ID = Object.fromEntries(GROUPS.map(g => [g.id, g]));
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/* Labels used before this taxonomy, and other common names, mapped to ids. Every primary, group and subcategory
   label (any case) also resolves to its id. */
const LEGACY = {
  'food & drinks': 'food', food: 'food', groceries: 'food:groceries', transport: 'transport', transportation: 'transport',
  bills: 'bills', subscriptions: 'bills', health: 'health', shopping: 'shopping', entertainment: 'entertainment', fun: 'entertainment',
  education: 'education', other: 'other', others: 'other', uncategorized: NEEDS_REVIEW, 'needs review': NEEDS_REVIEW,
  'loan interest': 'fees:loan_interest', 'loan fee': 'fees:loan_fees', 'loan fees': 'fees:loan_fees', income: 'income', transfer: 'transfer',
};
const BY_LABEL = (() => {
  const m = {};
  GROUPS.forEach(g => { g.subs.forEach(([sid, label]) => { const k = norm(label); if (!m[k]) m[k] = `${g.id}:${sid}`; }); });
  GROUPS.forEach(g => { m[norm(g.label)] = g.id; });
  PRIMARY.forEach(p => { if (!m[norm(p.label)]) m[norm(p.label)] = p.id; });
  return { ...m, ...LEGACY };
})();

/** The stable id for any stored value (id, legacy label, label in any case), or '' when it is custom text. */
export function categoryId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const [g, s] = raw.split(':');
  if (NON_EXPENSE[raw] || PRIMARY_BY_ID[raw]) return raw;
  if (GROUP_BY_ID[g] && (!s || GROUP_BY_ID[g].subs.some(([sid]) => sid === s))) return raw;
  return BY_LABEL[norm(raw)] || '';
}

/**
 * Everything the app needs about a stored category value:
 * { id, primary, label (primary label), group, groupLabel, sub, subLabel, icon, tone, custom }.
 */
export function categoryOf(value) {
  const id = categoryId(value);
  if (!id) {
    const custom = String(value || '').trim();
    const p = PRIMARY_BY_ID.other;
    return { id: custom || 'other', primary: 'other', label: custom || p.label, group: '', groupLabel: '', sub: '', subLabel: '', icon: p.icon, tone: p.tone, custom: !!custom };
  }
  if (NON_EXPENSE[id]) return { ...NON_EXPENSE[id], primary: id, group: '', groupLabel: '', sub: '', subLabel: '', custom: false };
  const [gid, sid] = id.split(':');
  const group = GROUP_BY_ID[gid];
  const primary = PRIMARY_BY_ID[group ? group.primary : gid] || PRIMARY_BY_ID.other;
  const subLabel = group && sid ? (group.subs.find(([x]) => x === sid) || [])[1] || '' : '';
  return { id, primary: primary.id, label: primary.label, group: group ? group.id : '', groupLabel: group ? group.label : '', sub: sid || '', subLabel, icon: primary.icon, tone: primary.tone, custom: false };
}

/** Subcategories offered for a compact category, grouped by detailed group: [{ group, label, subs: [[id, label]] }]. */
export function subcategoriesFor(primaryId) {
  return GROUPS.filter(g => g.primary === primaryId).map(g => ({ group: g.id, label: g.label, subs: g.subs.map(([sid, label]) => [`${g.id}:${sid}`, label]) }));
}

/** "Food & Dining · Groceries" for details and exports. */
export const categoryFullLabel = (value) => { const c = categoryOf(value); return c.subLabel ? `${c.label} · ${c.subLabel}` : c.label; };

/*
 * Auto-categorization rules (§6, §7): merchant and description signals only, in order. Merchant names are signals,
 * not fixed categories; when signals point at different compact categories the result is Needs review, not a guess.
 */
export const RULES = [
  ['food:food_delivery', /grab ?food|food ?panda|foodpanda|food ?delivery|lalafood/i],
  ['transport:fuel_gas', /\b(shell|petron|caltex|seaoil|phoenix fuel|cleanfuel)\b|gasolina|\bfuel\b|gas station/i],
  ['transport:ride_hailing', /\bgrab\b(?! ?(food|mart|pay))|angkas|joyride|move ?it|\buber\b|\bindrive\b/i],
  ['transport:toll_fees', /\btoll\b|easytrip|autosweep/i],
  ['transport:parking', /parking/i],
  ['transport:taxi', /\btaxi\b/i],
  ['transport:public_transportation', /\b(lrt|mrt|jeep|jeepney|tricycle|bus|habal(-habal)?|pamasahe|beep card)\b/i],
  ['food:fast_food', /jollibee|mcdo|mcdonald|\bkfc\b|chowking|greenwich|mang inasal|burger king|\bpizza|shakey/i],
  ['food:coffee_and_tea', /starbucks|coffee|\bcafe\b|café|milk ?tea|\bkape\b|tim hortons/i],
  ['food:bakery', /bakery|bakeshop|\bbread\b|tinapay|pandesal|goldilocks|red ribbon/i],
  ['food:convenience_stores', /7-?eleven|alfamart|ministop|lawson|family ?mart|sari-?sari/i],
  ['food:groceries', /supermarket|grocery|groceries|puregold|savemore|landmark|palengke|\bmarket\b|\b(bigas|gulay|prutas|itlog|manok|baboy|isda|saging)\b/i],
  ['food:restaurants', /restaurant|\bgrill\b|carinderia|\b(lunch|dinner|breakfast|meal|kain|pagkain|ulam|merienda)\b/i],
  ['bills:electricity', /meralco|electric|kuryente|davao light/i],
  ['bills:water', /maynilad|manila water|water district|\btubig\b|primewater/i],
  ['bills:internet', /\bpldt\b|converge|sky ?fiber|\binternet\b|\bwifi\b/i],
  ['bills:mobile_phone', /\b(globe|smart|dito|tnt)\b|\bprepaid\b|\bpostpaid\b|\bload\b/i],
  ['entertainment:streaming_entertainment', /netflix|disney\+?|\bhbo\b|prime video|youtube premium|\bviu\b|iwanttfc/i],
  ['entertainment:music_subscriptions', /spotify|apple music|youtube music/i],
  ['digital:ai_subscriptions', /openai|chatgpt|anthropic|claude\.ai|midjourney/i],
  ['digital:online_storage', /icloud|google one|dropbox/i],
  ['health:medicine_and_pharmacy', /mercury drug|\bmercury\b|watsons|southstar|rose pharmacy|pharmacy|botika|\bgamot\b/i],
  ['health:dental_care', /dental|dentist/i],
  ['health:hospital', /hospital|\bclinic\b|medical center/i],
  ['shopping:online_shopping', /lazada|shopee|tiktok shop|amazon|zalora/i],
  ['shopping:clothing', /uniqlo|h&m|\bzara\b|penshoppe|\bbench\b/i],
  ['shopping:general_merchandise', /miniso|daiso|department store|\bmall\b/i],
  ['entertainment:movies', /cinema|\bmovie/i],
  ['entertainment:events_and_tickets', /concert|\btickets?\b/i],
  ['entertainment:video_games', /\bsteam\b|playstation|nintendo|xbox/i],
  ['government:government_contributions', /\bsss\b|philhealth|pag-?ibig/i],
  ['education:tuition_fees', /tuition|review center|enrol?lment/i],
  ['family:family_support', /padala|remittance|allowance/i],
  ['lifestyle:laundry', /laundry|labada/i],
  ['lifestyle:haircut_and_barber', /barber|haircut|gupit/i],
  ['lifestyle:gym_membership', /\bgym\b|anytime fitness/i],
  ['travel:hotels', /\bhotel|airbnb|agoda|booking\.com/i],
  ['travel:flights', /cebu pacific|philippine airlines|airasia|airfare|\bflight/i],
];

/** Best category id for a description, or NEEDS_REVIEW when nothing (or more than one compact category) matches. */
export function guessCategory(text = '') {
  const hits = RULES.filter(([, re]) => re.test(text)).map(([id]) => id);
  if (!hits.length) return NEEDS_REVIEW;
  const primaries = new Set(hits.map(id => categoryOf(id).primary));
  return primaries.size === 1 ? hits[0] : NEEDS_REVIEW;
}
