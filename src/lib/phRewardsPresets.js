/**
 * Snapshot of user-supplied "Philippine Loyalty Programs, Cashback & Rewards
 * Master Directory" (13 pages). Reference values are NOT live provider terms.
 * Per-litre rates, conditional campaigns, mile conversion, promotional tiers,
 * and redemption benefits do not become automatic financial ledger entries.
 */
export const PH_REWARD_GROUPS = Object.freeze([
  { id:'retail', name:'Retail & lifestyle' },
  { id:'grocery', name:'Groceries & membership clubs' },
  { id:'health', name:'Pharmacies & beauty' },
  { id:'fuel', name:'Fuel & mobility' },
  { id:'dining', name:'Dining, coffee & cinema' },
  { id:'cashback', name:'Credit card cashback' },
  { id:'miles', name:'Airline miles & travel' },
  { id:'digital', name:'E-wallets & digital rewards' },
]);
const record = (group, id, name, kind, earning, redemption, page, options={}) => Object.freeze({
  group, id, name, kind, earning, redemption, page,
  status:'reference', ...options,
});
const points = (unit, blocks=1, merchant='') => ({ pointUnit:'points', spendUnit:unit, pointsPerBlock:blocks, merchant });
const stars = (unit, blocks=1, merchant='') => ({ ...points(unit,blocks,merchant), pointUnit:'Stars' });
const cash = (rate, category='', monthlyCap=null, options={}) => ({ ratePct:rate, category, monthlyCap, ...options });
export const PH_REWARD_PRESETS = Object.freeze([
  // Retail. Partner-specific eligibility in the supplied directory matters.
  record('retail','smac','SM Advantage Card','points','1 pt / ₱200 at SM Store/SM Markets; ₱400 at select affiliates','1 pt ≈ ₱1; Prestige and sale perks have additional conditions',1,points(200,1)),
  record('retail','go-rewards','Go Rewards','points','1 pt / ₱200 at select department stores; ₱400 at select supermarkets','1 pt ≈ ₱1; affiliate and promo tiers vary',1,points(200,1)),
  record('retail','ayala-rewards','Ayala Rewards Circle','offers','Tier status and qualifying partner benefits; no universal points rate','Discounts and benefits vary by tier',1),
  record('retail','rustans-fsp',"Rustan's Frequent Shopper",'points','1 pt / ₱200 regular items; ₱400 sale/promotional items','1 pt ≈ ₱1 in FSP E-Purse',2,points(200,1)),
  record('retail','muji-passport','Muji Passport','points','1 Muji Mile / ₱1 qualifying spend','Tier rewards at 10k / 30k / 50k / 100k Miles',2,{...points(1,1),pointUnit:'Miles'}),
  record('retail','uniqlo-app','UNIQLO App Membership','offers','App scan / member pricing; no universal points formula','Welcome coupon and member-only offers are conditional',2),
  record('retail','ikea-family','IKEA Family Philippines','points','1 pt / ₱250 qualifying furniture or restaurant spend','Redeemable member vouchers with terms',2,points(250,1)),
  // Grocery / clubs.
  record('grocery','snr-membership','S&R Membership','membership','Membership access; no standard store points','S&R co-branded UnionBank card may offer 3% in-store / 1% outside',2),
  record('grocery','landers','Landers Superstore','membership','Membership access; separate Maya Landers card rewards','Landers voucher value depends on payment product and terms',2),
  record('grocery','puregold','Puregold Perks','points','Perks: 1 pt / ₱400; TNAP reseller: 1 pt / ₱200','1 pt ≈ ₱1 in subsequent purchases',3,points(400,1)),
  record('grocery','allday','AllRewards / AllDay','points','1 pt / ₱400 AllDay; ₱200 AllHome/dining','1 pt ≈ ₱1 in eligible stores',3,points(400,1)),
  record('grocery','metro','Metro Rewards Card','points','1 pt / ₱200 department; ₱400 supermarket','1 pt ≈ ₱1; minimum redemption 20 pts',3,points(200,1)),
  record('grocery','7-eleven','7-Eleven CLiQQ','points','Select products: 1 pt / ₱50–₱100 plus stamps','Redemption catalog varies; item eligibility not universal',3),
  record('grocery','uncle-johns',"Uncle John's / Go Rewards",'points','1 Go Rewards pt / ₱100 on participating food','1 pt ≈ ₱1; restricted eligible items',3,points(100,1,"Uncle John's")),
  record('grocery','lawson','Lawson Club Treats','points','1 pt / ₱50 qualifying spend with app barcode','Voucher and product redemptions',3,points(50,1,'Lawson')),
  // Pharmacy & wellness.
  record('health','watsons','Watsons Club','points','1 pt / ₱200 regular items; 2 pts / ₱200 Watsons Brand','1 pt ≈ ₱1, minimum 5 pts to redeem',3,points(200,1,'Watsons')),
  record('health','mercury','Mercury Drug Suki','points','1 pt / ₱200 qualifying medicines and essentials','1 pt ≈ ₱1 in store',4,points(200,1,'Mercury')),
  record('health','southstar','Southstar Drug / Go Rewards','points','1 Go Rewards pt / ₱200 qualifying items','1 pt ≈ ₱1 shared with Go Rewards',4,points(200,1,'Southstar')),
  record('health','rose-pharmacy','Rose Pharmacy / Go Rewards','points','1 Go Rewards pt / ₱200 participating purchases','1 pt ≈ ₱1 shared with Go Rewards',4,points(200,1,'Rose Pharmacy')),
  record('health','tgp','The Generics Pharmacy Ka-Partner','points','1 pt / ₱100 generic; ₱200 branded medicines','1 pt ≈ ₱1; participating items only',4,points(100,1,'TGP')),
  record('health','sephora','Sephora Beauty Pass','points','1 pt / ₱50 eligible purchases','Reward tiers at 100/250/500 pts and other benefits',4,points(50,1,'Sephora')),
  record('health','body-shop','The Body Shop Club','points','1 pt / ₱200 eligible spend plus separate recycling perks','1 pt ≈ ₱1; conditional vouchers',4,points(200,1,'The Body Shop')),
  // Fuel: litres and instant litre discounts must not be inferred from peso spend.
  record('fuel','petron','Petron Value Card','points','1 pt / ₱250 select fuels; ₱500 other fuels; 5 pts per LPG cylinder','1 pt ≈ ₱1; fuel and product conditions vary',5,points(250,1,'Petron')),
  record('fuel','shell','Shell Go+','points','1 pt / litre FuelSave; 2 pts / litre V-Power; 1 pt / ₱20 select items','2 pts ≈ ₱1; fuel litre rules are manual-only',5,{ pointUnit:'points', perLiter:true, merchant:'Shell' }),
  record('fuel','caltex','Caltex Rewards','points','2 pts / litre qualifying fuel, or 1 Go Rewards pt / 5 litres','5 Caltex pts ≈ ₱1; per-litre earning manual-only',5,{ pointUnit:'points', perLiter:true, merchant:'Caltex' }),
  record('fuel','seaoil','SEAOIL VIP','points','1 pt / ₱200 qualifying fuel; separate PriceLOCQ ₱2–₱6/litre offers','1 pt ≈ ₱1; discount prices vary',5,points(200,1,'SEAOIL')),
  record('fuel','cleanfuel','Cleanfuel VIP','points','1 pt / litre qualifying fuel','Redemption value varies ₱0.50–₱1 by reward item',5,{pointUnit:'points',perLiter:true,merchant:'Cleanfuel'}),
  record('fuel','unioil','Unioil Loyalty','points','1 pt / ₱200 or conditional ₱2–₱7/litre discounts','1 pt ≈ ₱1; partner discounts separate',5,points(200,1,'Unioil')),
  record('fuel','phoenix','Phoenix PULSE / Limitless','points','1 pt / ₱200 station; ₱100 LPG and FamilyMart','1 pt ≈ ₱1 in vouchers',5,points(200,1,'Phoenix')),
  // Dining, coffee and cinema.
  record('dining','starbucks','Starbucks Rewards PH','points','1 Star / ₱25 with loaded card; 1 / ₱50 with other payment','100 Stars → a selected drink/pastry subject to program terms',6,stars(25,1,'Starbucks')),
  record('dining','happyplus','Jollibee HappyPlus','points','1 pt / ₱50 participating Jollibee group stores','1 pt ≈ ₱1 on eligible purchases',6,points(50,1,'Jollibee')),
  record('dining','bistro-bff','Bistro Group BFF','offers','Upfront 30% off Monday / 20% other days at qualifying restaurants','Voucher/discount card; not a points balance',6),
  record('dining','shakeys','Shakey’s SuperCard','points','1 pt / ₱100 qualifying dining; separate 10% dine-in perk','1 pt ≈ ₱1; separate menu promos',6,points(100,1,"Shakey's")),
  record('dining','maxs-access','Max’s / Krispy Kreme Access','offers','Program-specific food vouchers, BOGO and participating dining discounts','No general earning ratio in source',6),
  record('dining','cbtl','CBTL Swirl Rewards','points','1 pt / ₱25 loaded card; 1 / ₱100 other payment','1 pt ≈ ₱1; eligible products and payment modes',6,points(25,1,'Coffee Bean')),
  record('dining','pickup','PICKUP Coffee Club','stamps','1 stamp per eligible drink; 10 stamps = free drink','Per-item stamped earning; monetary transaction alone cannot verify item count',6),
  record('dining','tim-hortons','Tim Hortons Rewards','points','10 pts per qualifying visit / ₱100 spend','Redeemable for selected food or beverages',6,points(100,10,'Tim Hortons')),
  record('dining','sm-cinema','SM Cinema / SMAC','points','1 SMAC pt / ₱200 eligible tickets/snacks','1 pt ≈ ₱1; cinema member benefits vary',7,points(200,1,'SM Cinema')),
  record('dining','robinsons-cinema','Robinsons MovieWorld / Go Rewards','points','1 Go Rewards pt / ₱200 tickets','1 pt ≈ ₱1; some promotions apply',7,points(200,1,'Robinsons')),
  // Cashback card offers: category/channel/receipt/merchant conditions MUST be reviewed.
  record('cashback','eastwest-visa','EastWest Visa Platinum','cashback','8.88% selected categories; 0.30% other eligible spend','₱1,250 monthly cap; redemption minimum 500 points',7,cash(8.88,'',1250,{conditions:'Only selected eligible categories; check merchant/category and cashback caps'})),
  record('cashback','bpi-amore','BPI Amore Cashback','cashback','4% grocery/dept store; 1% drugstore/utilities; 0.3% other','₱15,000/year; full ₱1,000 receipt increments',7,cash(4,'Groceries',null,{fullSpendStep:1000,conditions:'Category-specific rate and annual cap; 1,000-peso full increments'})),
  record('cashback','bpi-amore-platinum','BPI Amore Platinum','cashback','4% dining/food delivery; 1% grocery/dept store; 0.3% other','₱15,000/year; full ₱1,000 receipt increments',7,cash(4,'Dining',null,{fullSpendStep:1000,conditions:'Dining eligible category and annual pooled cap'})),
  record('cashback','hsbc-live','HSBC Live+ Visa Signature','cashback','Up to 8% select dining/shopping; 2% fast food; 3% Caltex; 0.5% other','₱1,250/month bonus cap, spend threshold applies',7,cash(8,'Dining',1250,{conditions:'Monthly spend threshold and bonus/base split; manual review required',manualOnly:true})),
  record('cashback','security-bank','Security Bank Complete Cashback','cashback','5% groceries, 4% gas, 3% utilities, 2% dining, 1% dept store','₱1,000/month; in-store physical POS only',8,cash(5,'Groceries',1000,{conditions:'Eligible physical POS swipes/taps only; do not count online/in-app purchases',manualOnly:true})),
  record('cashback','chinabank-cash','Chinabank Cash Rewards','cashback','6% eligible non-grocery/non-gas/non-drugstore; 1% excluded categories','₱1,000/month; min ₱1,000 single receipt',8,cash(6,'',1000,{minSpend:1000,conditions:'Qualifying merchants and receipt amount must be verified'})),
  record('cashback','chinabank-velvet','Chinabank Velvet Signature','cashback','₱800 if ₱8,000 spent on the 8th with enrollment; 1 pt / ₱30 otherwise','Special date-based promotion plus base points',8,{conditions:'Enrollment and single calendar day threshold; cannot be modeled as an unconditional rate',manualOnly:true}),
  record('cashback','unionbank-titanium','UnionBank Cash Back Titanium','cashback','6% grocery with ₱10,000 qualifying other monthly spend; 2% eligible Meralco; 0.2% base','₱1,000–₱1,500 monthly; tier condition applies',8,cash(6,'Groceries',1000,{conditions:'Other-category spend threshold and tier terms; cannot assume qualification',manualOnly:true})),
  record('cashback','amex-bdo','American Express Cashback (BDO)','cashback','1% eligible local purchases; 2% overseas','No stated cap in directory',8,cash(1,'',null,{conditions:'Local transactions only; forex eligibility requires separate rule'})),
  record('cashback','bdo-promo','BDO ShopMore / Spend Anywhere','cashback','2 pts / ₱1,000 base; 5%–10% enrolled promo campaigns','Promo enrollment and eligible periods required',8,{conditions:'Promotion varies and needs provider-confirmed enrollment',manualOnly:true}),
  record('cashback','maya-landers','Maya Landers Cashback Everywhere','cashback','Up to 5% Landers tiered; 2% dining; 1% other eligible spend','Points/vouchers; annual and monthly limits vary',9,cash(5,'',null,{conditions:'Monthly spend tiers and vouchers vary; do not treat as withdrawable cash',manualOnly:true})),
  // Miles must remain distinct from peso-valued points.
  record('miles','eastwest-krisflyer','EastWest KrisFlyer World','miles','1 mile / ₱12 foreign/airline; ₱36 local','KrisFlyer miles; value is not fixed cash',9,{pointUnit:'miles'}),
  record('miles','metrobank-travel','Metrobank Travel Signature','miles','1 mile / ₱17 foreign; ₱30 local','Airline miles; no fixed peso equivalence',9,{pointUnit:'miles'}),
  record('miles','chinabank-destinations','Chinabank Destinations World','miles','1 mile / ₱30 eligible spending','Airline miles; value changes by redemption',9,{pointUnit:'miles',spendUnit:30,pointsPerBlock:1}),
  record('miles','bpi-signature','BPI Visa Signature','miles','Approx. ₱50 / 1 mile based on conversion','Airline conversions and partners vary',9,{pointUnit:'miles'}),
  record('miles','bdo-diners','BDO Diners Club Premiere','miles','1 mile / ₱30 regular; ₱15 dining','Airline mile conversion; redemption rules vary',10,{pointUnit:'miles'}),
  record('miles','rcbc-airmiles','RCBC Preferred Airmiles','miles','1 mile / ₱25 overseas, ₱48 local, ₱125 select essentials','Variable conversion rates by spend category',10,{pointUnit:'miles'}),
  record('miles','unionbank-miles','UnionBank Miles+','miles','Approx. ₱30–₱48 per mile; travel categories differ','Terms vary by product',10,{pointUnit:'miles'}),
  record('miles','pnb-pal','PNB-PAL Mabuhay Miles','miles','₱30–₱38 per mile; lower on qualifying PAL purchases','Airline miles without fixed cash value',10,{pointUnit:'miles'}),
  // Wallet, platform and promotional offers.
  record('digital','grab','GrabRewards','points','1.5–3 points / ₱100 on eligible GrabUnlimited spend','Variable partner voucher value',10),
  record('digital','gcash','GCash GForest / A+ Rewards','offers','Activity points, random/seasonal cashback vouchers','Program-specific; no stable peso earning ratio',10),
  record('digital','maya-savings','Maya Savings Boost Missions','offers','Interest boost tiers tied to qualifying missions and caps','Savings interest is not cashback or loyalty points',11),
  record('digital','shopee','Shopee Coins','points','Campaign-dependent coin vouchers; no unconditional earn rate','1 Coin ≈ ₱1 with redemption restrictions',11),
  record('digital','globe','GlobeOne Rewards','points','1–2 pts / ₱100 qualifying telco bills/load','Voucher redemptions and expiry rules apply',11,points(100,1,'Globe')),
  record('digital','smart','Smart GigaPoints','points','1 pt / ₱100 qualifying load top-up','Bonus load promotions may vary',11,points(100,1,'Smart')),
  record('digital','shopback','ShopBack Philippines','cashback','1–15% eligible click-through cashback (merchant dependent)','Withdrawal/rebate only once provider confirms',11,{conditions:'Tracking and merchant-specific rates; manual review',manualOnly:true}),
]);

const byId = new Map(PH_REWARD_PRESETS.map(p => [p.id,p]));
export const getPhRewardPreset = id => byId.get(id) || null;
export const presetsForGroup = group => PH_REWARD_PRESETS.filter(p => p.group === group);
export const presetIsCashback = preset => preset?.kind === 'cashback';

/** Explicit action only. Existing edits are preserved; no remote/provider state is altered. */
export function cashbackRuleFromPreset(preset, existing = {}) {
  if (!presetIsCashback(preset)) throw new Error('not_cashback_preset');
  const suggestion = {
    presetId:preset.id, enabled:false, verified:false,
    rate: preset.ratePct == null ? '' : String(preset.ratePct),
    cap:'', monthlyCap:preset.monthlyCap == null ? '' : String(preset.monthlyCap),
    scopeCategory:preset.category || '', merchantContains:'',
    minSpend:preset.minSpend == null ? '' : String(preset.minSpend),
    fullSpendStep:preset.fullSpendStep == null ? '' : String(preset.fullSpendStep),
    manualOnly:!!preset.manualOnly, conditions:preset.conditions || preset.earning,
  };
  return { ...suggestion, ...existing };
}
/** Reference rate creates a disabled, editable rule; cash/stars/miles never mix. */
export function loyaltyRuleFromPreset(preset, existing = {}) {
  if (!preset || presetIsCashback(preset)) throw new Error('not_points_preset');
  const block = Number(preset.spendUnit) > 0 && Number(preset.pointsPerBlock) > 0;
  const suggestion = {
    presetId:preset.id, enabled:false, verified:false,
    rateMode:block ? 'perBlock' : 'manual', spendUnit:block ? String(preset.spendUnit):'',
    pointsPerBlock:block ? String(preset.pointsPerBlock):'',
    pointsPer100:'', merchantContains:preset.merchant || '', currency:'PHP',
    manualOnly:!!preset.perLiter || !block,
    conditions:preset.earning,
  };
  return { ...suggestion, ...existing };
}
