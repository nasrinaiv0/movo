// Actual FinancialPlanning integration only. All repository adapters are synthetic.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/App.css';
import '../../src/AdaptiveLayout.css';
import FinancialPlanning from '../../src/screens/FinancialPlanning';
import { setLanguage } from '../../src/lib/i18n';
setLanguage('en');
const query = new URLSearchParams(location.search);
const mode = query.get('mode') === 'dark' ? 'dark' : 'light';
const layout = innerWidth >= 1024 ? 'desktop' : innerWidth >= 768 ? 'tablet' : 'phone';
const accounts = [{id:'cash',name:'Cash',account_type:'cash',currency:'PHP',balance:99999},{id:'bank',name:'BPI Savings',account_type:'bank',currency:'PHP',balance:80000}];
const c = { cloudMode:true, session:{user:{id:'11111111-1111-4111-8111-111111111111'}}, base:'PHP', show:true, accountsView:accounts, prefs:{}, plans:[], subscriptions:[], txs:[], toBase:v=>v, go:()=>{}, notify:()=>{}, refreshFinance:async()=>{} };
createRoot(document.getElementById('root')).render(<div className={`movo-app glass-on theme-${mode} accent-green layout-${layout}`} style={{'--on-accent':'#ffffff','--accent-ink':mode==='dark'?'#8ce3b6':'#086b3a'}}><div className="app-shell"><main className="screen"><FinancialPlanning c={c}/></main></div></div>);
