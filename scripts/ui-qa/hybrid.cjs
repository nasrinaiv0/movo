const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  await page.goto('http://127.0.0.1:4176');
  const result=await page.evaluate(async()=>{
   const api=window.hybridQA,owner='123e4567-e89b-42d3-a456-426614174000',account='123e4567-e89b-42d3-a456-426614174001';
   await api.clearHybridOwner(owner);localStorage.clear();
   const groups={financial_accounts:[{id:account,name:'Cash',account_type:'cash',currency:'PHP',opening_balance:100}],transactions:[]};
   api.saveOfflineWorkspace(owner,{owner,baseline:groups,working:groups,dirty:false});
   await api.migrateHybridWorkspace(owner,api.loadOfflineWorkspace(owner));
   const record={id:crypto.randomUUID(),account_id:account,transaction_type:'expense',amount:12.34,currency:'PHP',merchant:'Groceries',occurred_at:'2026-11-10T00:00:00Z'};
   const operationId=crypto.randomUUID();
   await api.commitLocalFinanceChange({ownerId:owner,group:'transactions',kind:'create',record,origin:'offline',operationId});
   return {owner,account,operationId,record};
  });
  await page.reload();
  const recovered=await page.evaluate(async({owner})=>{
   const api=window.hybridQA;await api.recoverHybridWorkspace(owner);
   const saved=api.loadOfflineWorkspace(owner),claimed=await api.claimHybridSyncBatch({ownerId:owner});
   return {count:saved.working.transactions.length,held:saved.requiresManualSync,claimed:claimed.length,
    balance:api.buildIndexedBalances(saved.working.financial_accounts,saved.working.transactions).values().next().value.settled};
  },result);
  assert.deepEqual(recovered,{count:1,held:true,claimed:0,balance:87.66});
  const second=await context.newPage();await second.goto('http://127.0.0.1:4176');
  const claims=await Promise.all([page,second].map(p=>p.evaluate(async({owner,operationId})=>
   (await window.hybridQA.claimHybridSyncBatch({ownerId:owner,approvedOfflineIds:[operationId],limit:1})).length,result)));
  assert.equal(claims[0]+claims[1],1,'only one tab owns the lease');
  const measurements=await page.evaluate(async({owner,account})=>{
   const api=window.hybridQA,measurements=[];
   await api.clearHybridOwner(owner);
   for(const size of [10000,100000]){
    const records=Array.from({length:size},(_,i)=>({id:crypto.randomUUID(),account_id:account,transaction_type:'expense',amount:1,currency:'PHP',merchant:'Benchmark',occurred_at:'2026-11-10T00:00:00Z'}));
    let start=performance.now();const balances=api.buildIndexedBalances([{id:account,account_type:'cash',opening_balance:size*2,currency:'PHP'}],records);
    const balanceMs=performance.now()-start;
    start=performance.now();await api.commitLocalFinanceBatch(owner,records.map(record=>({group:'transactions',kind:'create',record})));
    const commitMs=performance.now()-start;
    start=performance.now();const loaded=await api.listLocalFinanceRecords(owner,'transactions');const readMs=performance.now()-start;
    measurements.push({records:size,balance:balances.get(account).settled,loaded:loaded.length,balanceMs,commitMs,readMs});
    await api.clearHybridOwner(owner);
   }
   return measurements;
  },result);
  for(const measurement of measurements){assert.equal(measurement.loaded,measurement.records);assert.equal(measurement.balance,measurement.records);}
  const report={browser:'Chromium in Vercel Sandbox; not a physical phone',reloadRecovery:recovered,crossTabLeaseClaims:claims,measurements};
  fs.writeFileSync('/tmp/hybrid-browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
