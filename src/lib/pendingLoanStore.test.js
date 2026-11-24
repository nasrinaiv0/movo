import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { readPendingLoan, reservePendingLoan, acknowledgePendingLoan, clearPendingLoanOwner } from './pendingLoanStore';
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const request = '33333333-3333-4333-8333-333333333333';
const payload = { p_expected_user_id:owner, p_request_id:request, p_name:'Private loan fixture', p_principal:5000 };
beforeAll(() => Object.defineProperty(globalThis,'crypto',{configurable:true,writable:true,value:webcrypto}));
beforeEach(async()=>{await clearPendingLoanOwner(owner);await clearPendingLoanOwner(other);});
function raw(mode, action) {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('movo.loan.requests.v1',1);
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{
      const db=req.result,tx=db.transaction('pending',mode),store=tx.objectStore('pending');
      let result;
      const get=store.get(owner);
      get.onsuccess=()=>{result=get.result;action?.(store,result);};
      tx.oncomplete=()=>{db.close();resolve(result);};
      tx.onabort=()=>{db.close();reject(tx.error);};
    };
  });
}
test('durable encrypted payload is reread across independent IndexedDB connections, isolated by owner',async()=>{
  await reservePendingLoan(owner,payload);
  expect(await readPendingLoan(owner)).toEqual(payload);
  expect(await readPendingLoan(other)).toBeNull();
  const record=await raw('readonly');
  expect(JSON.stringify(record)).not.toContain('Private loan fixture');
  expect(JSON.stringify(record)).not.toContain('5000');
  expect(record.sealedData.alg).toBe('XCHACHA20-POLY1305');
});
test('cross-tab competing drafts cannot overwrite the first persisted request',async()=>{
  const rival={...payload,p_request_id:'44444444-4444-4444-8444-444444444444'};
  const results=await Promise.allSettled([reservePendingLoan(owner,payload),reservePendingLoan(owner,rival)]);
  expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);
  const kept=await readPendingLoan(owner);
  expect(kept).toEqual(results.find(x=>x.status==='fulfilled').value);
  expect(await reservePendingLoan(owner,kept)).toEqual(kept);
});
test('tamper or owner swap fails closed and preserves bytes',async()=>{
  await reservePendingLoan(owner,payload);
  const original=await raw('readonly');
  await raw('readwrite',(s,r)=>s.put({...r,sealedData:{...r.sealedData,c:(r.sealedData.c[0]==='A'?'B':'A')+r.sealedData.c.slice(1)}}));
  await expect(readPendingLoan(owner)).rejects.toThrow();
  await expect(reservePendingLoan(owner,payload)).rejects.toThrow();
  await raw('readwrite',s=>s.put({...original,owner:other}));
  await expect(readPendingLoan(other)).rejects.toThrow();
});
test('unverified acknowledgements retain pending data; only matching request clears it',async()=>{
  await reservePendingLoan(owner,payload);
  expect(()=>acknowledgePendingLoan(owner,request,{id:request,user_id:other})).toThrow();
  expect(await readPendingLoan(owner)).toEqual(payload);
  await acknowledgePendingLoan(owner,'44444444-4444-4444-8444-444444444444',{id:request,user_id:owner});
  expect(await readPendingLoan(owner)).toEqual(payload);
  await acknowledgePendingLoan(owner,request,{id:request,user_id:owner});
  expect(await readPendingLoan(owner)).toBeNull();
});
