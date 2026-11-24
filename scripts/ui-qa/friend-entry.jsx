import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FriendConversation} from '../../src/components/FriendMessages';
import {rawLedgerTimestamp,sharedLedgerDisplayDate,sharedLedgerEditedTimestamp} from '../../src/lib/sharedLedgerDate';
import {dayKey,monthKey} from '../../src/lib/format';
import '../../src/App.css';
import '../../src/components/FriendMessages.css';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const friend={id:'33333333-3333-4333-8333-333333333333',name:'Synthetic friend'};
const bank='44444444-4444-4444-8444-444444444444';
const mid='55555555-5555-4555-8555-555555555555';
const mode=new URLSearchParams(location.search).get('mode')==='dark'?'dark':'light';
document.documentElement.dataset.theme=mode; document.documentElement.classList.toggle('dark',mode==='dark');
document.body.classList.toggle('dark',mode==='dark');
const row={id:mid,external_reference:'movo-friend:'+mid,occurred_at:'2026-11-30T12:00:00Z'};
function Fixture(){
 const [id,setId]=useState(owner);
 const session=React.useMemo(()=>({user:{id},access_token:'synthetic:'+id}),[id]);
 const accounts=[{id:bank,user_id:owner,account_type:'bank',currency:'PHP',name:'Synthetic bank'},
 {id:'66666666-6666-4666-8666-666666666666',user_id:other,account_type:'bank',currency:'PHP',name:'Other owner bank'}];
 const onImport=async mapping=>{
   const response=await fetch('/fixture-import',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(mapping)});
   if(!response.ok)throw Error('synthetic response lost');
   return response.json();
 };
 const shown=sharedLedgerDisplayDate(row);
 return <div className={'movo-app theme-'+mode+' accent-green'} style={{minHeight:'100vh',padding:'24px 0',background:'var(--bg)',color:'var(--text)'}}><main className="friend-qa" style={{maxWidth:560,margin:'0 auto',padding:12,minWidth:0}}>
 <h1 style={{fontSize:20}}>Private conversation</h1>
 <button type="button" onClick={()=>setId(v=>v===owner?other:owner)}>Switch synthetic owner</button>
 <div data-testid="calendar">{dayKey(shown)} · {monthKey(shown)}</div>
 <output hidden data-testid="raw-date">{rawLedgerTimestamp(row)}</output>
 <output hidden data-testid="unchanged-date">{sharedLedgerEditedTimestamp(row,'2026-11-30','12:00:00',new Date(shown).toISOString())}</output>
 <output hidden data-testid="changed-date">{sharedLedgerEditedTimestamp(row,'2026-12-01','12:00:00',new Date('2026-12-01T12:00:00').toISOString())}</output>
 <output hidden data-testid="changed-clock">{sharedLedgerEditedTimestamp(row,'2026-11-30','13:00:00',new Date('2026-11-30T13:00:00').toISOString())}</output>
 <FriendConversation key={id} session={session} friend={friend} importAccounts={accounts} onImport={onImport} onBack={()=>{}}/>
 </main></div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
