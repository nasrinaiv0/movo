// Synthetic data only; never connects to a user's account.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/App.css';
import '../../src/AdaptiveLayout.css';
import '../../src/screens/Settings.css';
import { UsageSheet } from '../../src/screens/Settings';
import { BudgetsSheet } from '../../src/components/Budgets';
import Menu from '../../src/screens/Menu';
import BillsPanel from '../../src/components/BillsPanel';
import CryptoMarket from '../../src/screens/CryptoMarket';
import FinancialPlanning from '../../src/screens/FinancialPlanning';
import ScheduledDuePrompt from '../../src/components/ScheduledDuePrompt';
const query = new URLSearchParams(location.search);
const accounts = [{id:'cash',name:'Cash',account_type:'cash',currency:'PHP',balance:99999},{id:'bank',name:'BPI Savings',account_type:'bank',currency:'PHP',balance:80000}];
function Fixture() {
 const [panel,setPanel]=useState(query.get('screen')==='usage'?'usage':'');
 const [prefs,setPrefs]=useState({cryptoHoldings:[],cryptoWatchlist:['btc-bitcoin','eth-ethereum']});
 const c={user:{name:'Dirk'},plan:'pro_plus',subSummary:{activeCount:5,monthly:1120},plans:[{id:'trip',name:'Travel fund',target:50000,saved:12500,due:'2027-06-01'}],budgetList:[],openBudgets:()=>setPanel('budgets'),entitlement:{active:true,tier:'pro_plus',expiresAt:'2027-11-09T00:00:00Z'},entitlementReady:true,txs:new Array(120).fill({}),subscriptions:new Array(5).fill({}),base:'PHP',show:true,accountsView:accounts,prefs,setPrefs,updatePrefs:p=>setPrefs(p),cloudMode:true,session:{user:{id:'qa-user'}},go:()=>{},toBase:v=>v,notify:()=>{},refreshFinance:async()=>{}};
 return <div className={`movo-app glass-on theme-${query.get('mode')||'light'} accent-${query.get('accent')||'green'}`} style={{'--on-accent':query.get('accent')==='orange'?'#000000':'#ffffff','--accent-ink':query.get('mode')==='dark'?'#8ce3b6':'#086b3a'}}><div className="app-shell"><main className="screen">{query.get('screen')==='menu'?<Menu c={c}/>:query.get('screen')==='bills'?<BillsPanel c={c} accounts={accounts}/>:query.get('screen')==='crypto'?<CryptoMarket c={c}/>:<FinancialPlanning c={c}/>}</main>{panel==='usage'&&<UsageSheet c={{...c,session:{access_token:'synthetic-ui-only',user:{id:'qa-user'}}}} onClose={()=>setPanel('')} />}{panel==='budgets'&&<BudgetsSheet plans={c.plans} progress={[]} show cloudMode={false} onClose={()=>setPanel('')} initialTab='plans' onOpenLimits={()=>{}} />}{query.get('screen')==='reminder'&&<ScheduledDuePrompt session={c.session} accountsView={accounts}/>}</div></div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
