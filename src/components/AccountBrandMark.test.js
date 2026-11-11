import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AccountBrandMark from './AccountBrandMark';
global.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host)});
afterEach(()=>{act(()=>root.unmount());host.remove()});
test('unreviewed BPI uses a local icon without any Google request',()=>{
  act(()=>root.render(<AccountBrandMark account={{name:'BPI',institution_name:'BPI',account_type:'card'}}/>));
  expect(host.querySelector('img')).toBeNull();
  expect(host.querySelector('svg')).not.toBeNull();
});
test('e-wallet and unknown banks use local icons until verified brand clearance',()=>{
  act(()=>root.render(<AccountBrandMark account={{name:'GCash',account_type:'e_wallet'}}/>));
  expect(host.querySelector('img')).toBeNull();
  expect(host.querySelector('svg')).not.toBeNull();
  act(()=>root.render(<AccountBrandMark account={{name:'Random Unregistered Bank',account_type:'bank'}}/>));
  expect(host.querySelector('img')).toBeNull();
  expect(host.querySelector('svg')).not.toBeNull();
});
