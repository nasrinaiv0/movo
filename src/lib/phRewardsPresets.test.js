import { PH_REWARD_GROUPS, PH_REWARD_PRESETS, getPhRewardPreset, cashbackRuleFromPreset, loyaltyRuleFromPreset } from './phRewardsPresets';

test('the supplied reference catalog covers eight program categories with only unique identifiers', () => {
  expect(PH_REWARD_GROUPS).toHaveLength(8);
  expect(PH_REWARD_PRESETS.length).toBeGreaterThanOrEqual(60);
  expect(new Set(PH_REWARD_PRESETS.map(p => p.id)).size).toBe(PH_REWARD_PRESETS.length);
  expect(PH_REWARD_PRESETS.every(p => Number.isInteger(p.page) && p.page >= 1 && p.page <= 13)).toBe(true);
});
test('preserves distinct source terms instead of flattening tiered programs', () => {
  expect(getPhRewardPreset('smac').spendUnit).toBe(200);
  expect(getPhRewardPreset('starbucks').spendUnit).toBe(25);
  expect(getPhRewardPreset('starbucks').pointUnit).toBe('Stars');
  expect(getPhRewardPreset('watsons').earning).toContain('2 pts / ₱200');
  expect(getPhRewardPreset('shell').perLiter).toBe(true);
  expect(getPhRewardPreset('eastwest-visa').monthlyCap).toBe(1250);
  expect(getPhRewardPreset('bpi-amore').fullSpendStep).toBe(1000);
  expect(getPhRewardPreset('security-bank').manualOnly).toBe(true);
});
test('a credit cashback preset cannot auto-post by default or erase user overrides', () => {
  const preset=getPhRewardPreset('eastwest-visa');
  expect(cashbackRuleFromPreset(preset)).toMatchObject({ enabled:false, verified:false, rate:'8.88', monthlyCap:'1250' });
  expect(cashbackRuleFromPreset(preset,{rate:'3.5',enabled:true,cap:'125'}))
    .toMatchObject({rate:'3.5',enabled:true,cap:'125'});
  expect(() => cashbackRuleFromPreset(getPhRewardPreset('smac'))).toThrow();
});
test('points presets start disabled and preserve manual customized rates', () => {
  const rule=loyaltyRuleFromPreset(getPhRewardPreset('smac'));
  expect(rule).toMatchObject({rateMode:'perBlock', spendUnit:'200', pointsPerBlock:'1',enabled:false,verified:false});
  expect(loyaltyRuleFromPreset(getPhRewardPreset('smac'),{spendUnit:'250',pointsPerBlock:'2'}))
    .toMatchObject({spendUnit:'250',pointsPerBlock:'2'});
  const shell=loyaltyRuleFromPreset(getPhRewardPreset('shell'));
  expect(shell.manualOnly).toBe(true);
  expect(shell.enabled).toBe(false);
});
