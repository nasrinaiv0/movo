import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AccountBrandMark from './AccountBrandMark';
global.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host)});
afterEach(()=>{act(()=>root.unmount());host.remove()});
test('Your Cards picker shows approved Google BPI favicon, not initials',()=>{
  act(()=>root.render(<AccountBrandMark account={{name:'BPI',institution_name:'BPI',account_type:'card'}}/>));
  const img=host.querySelector('img');
  expect(img).not.toBeNull();
  expect(img.src).toBe('https://www.google.com/s2/favicons?domain=bpi.com.ph&sz=128');
  expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
  expect(host.textContent).not.toContain('BP');
});
test('bank and e-wallet names fetch curated favicons and unknown names retain an icon fallback',()=>{
  act(()=>root.render(<AccountBrandMark account={{name:'GCash',account_type:'e_wallet'}}/>));
  expect(host.querySelector('img').src).toContain('domain=gcash.com');
  act(()=>root.render(<AccountBrandMark account={{name:'Random Unregistered Bank',account_type:'bank'}}/>));
  expect(host.querySelector('img')).toBeNull();
  expect(host.querySelector('svg')).not.toBeNull();
});
