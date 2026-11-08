import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { PlanProvider } from '../lib/PlanContext';
import MoneyFlow from './MoneyFlow';
import CardArt from './CardArt';
import PlanOffer from './PlanOffer';
import { PlanComparison } from './PlanOffer';

let host, root;
beforeEach(() => { host=document.createElement('div');document.body.append(host);root=createRoot(host); });
afterEach(() => { act(() => root.unmount());host.remove(); });
const paid = tier => ({ tier,active:true,expiresAt:new Date(Date.now()+86400000).toISOString() });
test.each([null, paid('pro'), paid('pro_plus')])('custom Money Flow is gated by current entitlement: %p', entitlement => {
  const upgrade=jest.fn();
  act(() => root.render(<PlanProvider entitlement={entitlement} onUpgrade={upgrade}><MoneyFlow restrictCustom txs={[]} show /></PlanProvider>));
  const custom=[...host.querySelectorAll('button')].find(x=>x.textContent==='Custom');
  act(()=>custom.click());
  expect(!!host.querySelector('.flow-custom')).toBe(!!entitlement);
  expect(upgrade).toHaveBeenCalledTimes(entitlement ? 0 : 1);
});
test('portrait saved preferences stop rendering on expiry', () => {
  const render = value => <PlanProvider entitlement={value}><CardArt a={{id:'card',name:'Test',balance:0}} orientation="portrait" show /></PlanProvider>;
  act(()=>root.render(render(paid('pro'))));
  expect(host.querySelector('.orientation-portrait')).not.toBeNull();
  act(()=>root.render(render(null)));
  expect(host.querySelector('.orientation-portrait')).toBeNull();
  expect(host.querySelector('.orientation-landscape')).not.toBeNull();
});
test('trial offer requires sign-in and states no automatic charge', () => {
  const signIn=jest.fn();
  act(()=>root.render(<PlanOffer onSignIn={signIn} onClose={()=>{}} onPlans={()=>{}} />));
  expect(host.textContent).toContain('no automatic charge');
  act(()=>[...host.querySelectorAll('button')].find(x=>x.textContent.includes('Sign in to claim')).click());
  expect(signIn).toHaveBeenCalledTimes(1);
});
test('future mascots and native widgets are not advertised as available', () => {
  act(()=>root.render(<PlanComparison />));
  expect(host.textContent).toContain('future release');
  expect(host.textContent).toContain('current ram stays the same');
  expect(host.textContent).toContain('Gold badges');
  expect(host.textContent).toContain('Platinum badges');
});

test('switching cloud to local suspends premium card UI and restores it without touching subscription', () => {
  const subscription = paid('pro_plus');
  const show = cloudMode => <PlanProvider entitlement={subscription} cloudMode={cloudMode}>
    <CardArt a={{id:'card',name:'Offline tester',balance:0}} orientation="portrait" show />
  </PlanProvider>;
  act(()=>root.render(show(true)));
  expect(host.querySelector('.orientation-portrait')).toBeTruthy();
  act(()=>root.render(show(false)));
  expect(host.querySelector('.orientation-portrait')).toBeNull();
  expect(host.querySelector('.orientation-landscape')).toBeTruthy();
  expect(subscription.active).toBe(true);
  act(()=>root.render(show(true)));
  expect(host.querySelector('.orientation-portrait')).toBeTruthy();
});
test('offline feature requests explain paused access instead of encouraging a second purchase', () => {
  const open=jest.fn(), signin=jest.fn();
  act(()=>root.render(<PlanOffer cloudMode={false} feature="receiptScan" entitlement={paid('pro')} onClose={()=>{}} onOpenCloudSettings={open} onSignIn={signin} />));
  expect(host.textContent).toContain('Pro and Pro+ features are paused');
  expect(host.textContent).toContain('does not cancel or refund');
  act(()=>[...host.querySelectorAll('button')].find(x=>x.textContent==='Cloud Sync settings').click());
  expect(open).toHaveBeenCalledTimes(1);
  expect(signin).not.toHaveBeenCalled();
  expect(host.textContent).not.toContain('Claim my free month');
});
