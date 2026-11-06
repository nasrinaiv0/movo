// Synthetic data only; never connects to a user's account.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/App.css';
import BillsPanel from '../../src/components/BillsPanel';
import CryptoMarket from '../../src/screens/CryptoMarket';
import FinancialPlanning from '../../src/screens/FinancialPlanning';
import ScheduledDuePrompt from '../../src/components/ScheduledDuePrompt';
const query = new URLSearchParams(location.search);
const accounts = [{id:'cash',name:'Cash',account_type:'cash',currency:'PHP',balance:99999},{id:'bank',name:'BPI Savings',account_type:'bank',currency:'PHP',balance:80000}];
function Fixture() {
 const [prefs,setPrefs]=useState({cryptoHoldings:[],cryptoWatchlist:['btc-bitcoin','eth-ethereum']});
 const c={base:'PHP',show:true,accountsView:accounts,prefs,setPrefs,updatePrefs:p=>setPrefs(p),cloudMode:true,session:{user:{id:'qa-user'}},go:()=>{},toBase:v=>v,notify:()=>{},refreshFinance:async()=>{}};
 return <div className={`movo-app theme-${query.get('mode')||'light'} accent-${query.get('accent')||'green'}`} style={{'--on-accent':query.get('accent')==='orange'?'#000000':'#ffffff','--accent-ink':query.get('mode')==='dark'?'#8ce3b6':'#086b3a'}}><div className="app-shell"><main className="screen">{query.get('screen')==='bills'?<BillsPanel c={c} accounts={accounts}/>:query.get('screen')==='crypto'?<CryptoMarket c={c}/>:<FinancialPlanning c={c}/>}</main>{query.get('screen')==='reminder'&&<ScheduledDuePrompt session={c.session} accountsView={accounts}/>}</div></div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
