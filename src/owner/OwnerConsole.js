import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import OwnerWorkBoard from './OwnerWorkBoard';
import OwnerSignupChart from './OwnerSignupChart';
import './OwnerConsole.css';

const MODULES = [
  ['overview','Overview','▦','KPI dashboard'], ['analytics','Analytics','⌁','Growth and engagement'],
  ['users','Users','♙','Accounts and grants'], ['billing','Billing & Credits','▤','Store entitlements'],
  ['grants','Plans & Promotions','✧','Complimentary grants'], ['sync','Cloud & Local Sync','⇄','Reconciliation'],
  ['security','Security & Audit','◇','Owner action history'], ['health','System Health','◫','Services and checks'],
  ['support','Support Center','☏','Customer operations'], ['compliance','Compliance & Release','✓','App-store readiness'],
  ['promotions','Announcements','◉','Feature releases'], ['settings','Owner Settings','⚙','Owner configuration'],
];
const INVALID='—';
const num=(v)=>Number.isFinite(Number(v))&&v!==null?Number(v).toLocaleString('en-US'):INVALID;
const date=(d)=>d?new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):INVALID;
const mask=(email)=>{const [local,domain]=String(email||'').split('@');return local&&domain?local.slice(0,2)+'•••@'+domain:'Email unavailable';};
const label=(tier)=>tier==='pro_plus'?'Pro+':tier==='pro'?'Pro':tier==='free'?'Free':'Not verified';
function Glyph({name,size=19}) {
  const paths={
    menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
    shield:<><path d="m12 2 8 3v6c0 5-3.4 8.7-8 11-4.6-2.3-8-6-8-11V5l8-3Z"/><path d="m9 12 2 2 4-4"/></>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15 15 5 5"/></>,
    refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 14-2m0 8a8 8 0 0 1-14 2"/></>,
    arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    plus:<path d="M12 5v14M5 12h14"/>,
    x:<path d="M6 6l12 12M18 6 6 18"/>,
    chevron:<path d="m9 6 6 6-6 6"/>,
    logout:<><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M15 7l5 5-5 5m5-5H9"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.shield}</svg>;
}
async function api(session,view,params={},action) {
  const query=new URLSearchParams({view,...params});
  const response=await fetch('/api/owner?'+query.toString(), {
    method:action?'POST':'GET',
    headers:{Authorization:'Bearer '+session.access_token,...(action?{'Content-Type':'application/json'}:{})},
    ...(action?{body:JSON.stringify(action)}:{}),
    cache:'no-store',credentials:'same-origin'
  });
  const body=await response.json().catch(()=>({error:'invalid_response'}));
  if(!response.ok)throw Object.assign(new Error(body.error||'owner_data_unavailable'),{status:response.status});
  return body;
}
function Surface({children,className=''}) {return <section className={'occ-card '+className}>{children}</section>;}
function Stat({title,value,sub,accent}) {return <Surface className="occ-stat"><div className="occ-stat-top"><span>{title}</span><span className={'occ-stat-dot'+(accent?' occ-dot-green':'')}/></div><div className="occ-stat-number">{value}</div><small>{sub}</small></Surface>;}
function Bars({metrics}) {
  const points=[['Pro',metrics?.pro?.value],['Pro+',metrics?.plus?.value],['Subscriptions',metrics?.subscriptions?.value],['Manual grants',metrics?.grants?.value]];
  const has=points.some(([,n])=>typeof n==='number');
  const max=Math.max(1,...points.map(([,n])=>typeof n==='number'?n:0));
  return <Surface className="occ-chart"><div className="occ-heading"><div><h3>Entitlements overview</h3><p>Current database records, not revenue</p></div><span className="occ-chip">Verified counts</span></div>
    {has?<div className="occ-bar-list">{points.map(([title,n])=><div className="occ-bar-item" key={title}>
      <div className="occ-bar-label"><span>{title}</span><strong>{num(n)}</strong></div><div className="occ-track"><span style={{width:(typeof n==='number'?(n/max*100):0)+'%'}}/></div>
    </div>)}</div>:<Empty title="No reliable metrics" desc="Connect and verify the production database to show real counts."/>}
    <p className="occ-chart-note">Store entitlements can include expired records and multiple renewals. They are not unique paying customers.</p>
  </Surface>;
}
function Empty({title,desc}) {return <div className="occ-empty"><div className="occ-empty-glyph">◇</div><strong>{title}</strong><p>{desc}</p></div>;}
function Tag({children,tone=''}) {return <span className={'occ-tag '+tone}>{children}</span>;}
function useSession(){
  const [session,setSession]=useState(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(!supabase){setReady(true);return;}
    let active=true;
    supabase.auth.getSession().then(({data})=>{if(active){setSession(data.session||null);setReady(true);}}).catch(()=>setReady(true));
    const {data:subscription}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return ()=>{active=false;subscription.subscription.unsubscribe();};
  },[]);
  return {session,ready};
}
function OwnerGate({session,ready,onUnlock}) {
  const [email,setEmail]=useState('');
  const [otp,setOtp]=useState('');
  const [otpSent,setOtpSent]=useState(false);
  const [enroll,setEnroll]=useState(null);
  const [factor,setFactor]=useState('');
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const action=async fn=>{setBusy(true);setError('');try{await fn();}catch(e){setError(e?.message||'Action unavailable');}finally{setBusy(false);}};
  return <main className="occ-gate-wrap"><div className="occ-gate-mark"><Glyph name="shield" size={28}/></div><div className="occ-gate">
    <span className="occ-eyebrow">PRIVATE ADMINISTRATION</span><h1>MOVO Owner Access</h1>
    <p>Secure operations for people authorized to administer MOVO. Owner rights are never derived from a Pro subscription.</p>
    {!supabase?<div role="alert" className="occ-alert">Authentication is not configured. Add the MOVO Supabase public connection details before using this portal.</div>
    :!ready?<p>Checking session…</p>
    :!session?<form onSubmit={e=>{e.preventDefault();action(async()=>{await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:false}}).then(({error})=>{if(error)throw error;});setOtpSent(true);});}}>
      <label>Email address<input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Owner account email"/></label>
      <button className="occ-primary" type="submit" disabled={busy}>{otpSent?'Send another sign-in code':'Continue securely'} <Glyph name="arrow" size={17}/></button>
      {otpSent&&<div className="occ-otp"><label>One-time email code<input value={otp} onChange={e=>setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="Enter your code"/></label>
      <button type="button" className="occ-secondary" disabled={busy||otp.length<6} onClick={()=>action(async()=>{const {error}=await supabase.auth.verifyOtp({email,token:otp,type:'email'});if(error)throw error;})}>Verify code</button></div>}
    </form>
    :<div className="occ-mfa">
      <Tag>Signed in</Tag><h3>Multi-factor verification required</h3>
      <p>Use your authenticator app to unlock the owner console. Database authorization will still verify your owner UID.</p>
      {!enroll&&<button className="occ-secondary" disabled={busy} onClick={()=>action(async()=>{
        const {data,error}=await supabase.auth.mfa.listFactors();if(error)throw error;
        const existing=(data?.totp||[]).find(f=>f.status==='verified');
        if(existing){setFactor(existing.id);setEnroll({existing:true});return;}
        const result=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'MOVO Owner'});
        if(result.error)throw result.error;
        setFactor(result.data.id);setEnroll(result.data.totp);
      })}>Set up / use authenticator</button>}
      {enroll&&<div className="occ-otp">
        {enroll.qr_code&&<img alt="Scan authenticator setup QR code" className="occ-qr" src={enroll.qr_code}/>}
        <label>Authenticator code<input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code"/></label>
        <button className="occ-primary" disabled={busy||code.length!==6} onClick={()=>action(async()=>{
          const {error}=await supabase.auth.mfa.challengeAndVerify({factorId:factor,code});
          if(error)throw error;onUnlock();
        })}>Verify and unlock</button>
      </div>}
      <button type="button" className="occ-text-button" onClick={()=>supabase.auth.signOut()}>Sign out</button>
    </div>}
    {error&&<p role="alert" className="occ-alert">{error}</p>}
    <small className="occ-gate-note">Encrypted connection · MFA enforced · Owner-only API</small>
  </div></main>;
}
function GrantForm({userId,session,onDone}) {
  const [tier,setTier]=useState('pro');
  const [days,setDays]=useState(30);
  const [reason,setReason]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e) {
    e.preventDefault();if(!confirmed||busy)return;
    setBusy(true);setError('');
    try{await api(session,'grants',{}, {action:'grant',userId,tier,days:Number(days),reason});
      onDone('Complimentary access granted and recorded in the audit log.');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <form className="occ-grant-form" onSubmit={submit}>
    <div className="occ-grant-fields"><label>Plan<select value={tier} onChange={e=>setTier(e.target.value)}><option value="pro">Pro</option><option value="pro_plus">Pro+</option></select></label>
    <label>Duration<select value={days} onChange={e=>setDays(Number(e.target.value))}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">365 days</option></select></label></div>
    <label>Reason (audit log)<input required minLength={5} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Complimentary support grant"/></label>
    <label className="occ-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I verified this user's identity and approve the complimentary grant.</label>
    {error&&<p className="occ-alert" role="alert">{error}</p>}
    <button type="submit" className="occ-primary" disabled={!confirmed||reason.trim().length<5||busy}>{busy?'Saving…':'Confirm and grant access'}</button>
  </form>;
}
function OwnerContent({session}) {
  const [view,setView]=useState('overview');
  const [payload,setPayload]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [ownerLocked,setOwnerLocked]=useState(false);
  const [selected,setSelected]=useState('');
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const [banner,setBanner]=useState('');
  const [revoke,setRevoke]=useState(null);
  const [reason,setReason]=useState('');
  const [revokeConfirm,setRevokeConfirm]=useState(false);
  const [mobileNav,setMobileNav]=useState(false);
  const reload=useCallback(async()=>{
    if(!session)return;
    setBusy(true);setError('');
    try{const result=await api(session,view,view==='users'?{page}:{});
      setPayload(result);
    }catch(e){if(e.status===403||e.status===401)setOwnerLocked(true);setError(e.message);setPayload(null);}
    finally{setBusy(false);}
  },[session,view,page]);
  useEffect(()=>{reload();},[reload]);
  useEffect(()=>{setSelected('');setRevoke(null);setSearch('');setBanner('');setMobileNav(false);},[view]);
  const title=MODULES.find(m=>m[0]===view)||MODULES[0];
  const metrics=payload?.metrics||{};
  const users=useMemo(()=>((payload?.users||[]).filter(u=>(u.email+' '+u.id).toLowerCase().includes(search.toLowerCase()))),[payload,search]);
  const grantUser=(payload?.users||[]).find(u=>u.id===selected);
  if(ownerLocked)return <OwnerGate session={session} ready onUnlock={()=>{setOwnerLocked(false);reload();}}/>;
  const nav=MODULES.map(([id,name,symbol])=><button type="button" key={id} className={'occ-nav-item'+(view===id?' active':'')} aria-current={view===id?'page':undefined} onClick={()=>{setPayload(null);setView(id);setPage(1);}}><span className="occ-nav-symbol">{symbol}</span><span>{name}</span>{view===id&&<i/>}</button>);
  return <div className="occ-layout"><aside className={'occ-sidebar'+(mobileNav?' expanded':'')}>
    <div className="occ-brand"><div className="occ-mark"><Glyph name="shield" size={22}/></div><div><strong>MOVO</strong><small>OWNER COMMAND CENTER</small></div></div>
    <p className="occ-nav-label">WORKSPACE</p><nav aria-label="Owner modules">{nav}</nav>
    <div className="occ-sidebar-foot"><span className="occ-status"><i/> Owner authenticated</span><a href="/" className="occ-side-back">Return to MOVO <Glyph name="arrow" size={15}/></a></div>
  </aside>
  <div className="occ-main">
    <header className="occ-header"><div className="occ-header-left">
      <button className="occ-mobile-toggle occ-icon-button" aria-label="Toggle owner navigation" onClick={()=>setMobileNav(x=>!x)}><Glyph name="menu"/></button>
      <span className="occ-breadcrumb">Workspace <Glyph name="chevron" size={12}/> <strong>{title[1]}</strong></span></div>
      <div className="occ-header-right"><Tag tone="occ-private">Owner only</Tag><button type="button" className="occ-icon-button" title="Refresh data" aria-label="Refresh data" disabled={busy} onClick={reload}><Glyph name="refresh"/></button><button className="occ-icon-button" title="Sign out" aria-label="Sign out" onClick={()=>supabase.auth.signOut()}><Glyph name="logout"/></button></div></header>
    <main className="occ-content"><div className="occ-page-heading"><div><span className="occ-eyebrow">MOVO / OWNER OPERATIONS</span><h1>{title[1]}</h1><p>{title[3]}</p></div><div className="occ-page-meta"><span className="occ-live-dot"/>{busy?'Refreshing…':'Restricted workspace'}</div></div>
    {banner&&<div className="occ-success" role="status">{banner}<button onClick={()=>setBanner('')} aria-label="Dismiss notification"><Glyph name="x" size={16}/></button></div>}
    {error&&<div className="occ-alert" role="alert">This module cannot be loaded: {error}. No changes were made. <button type="button" onClick={reload}>Retry</button></div>}
    {(view==='overview'||view==='analytics'||view==='billing')&&<><div className="occ-stats">
      <Stat title="Financial accounts" value={num(metrics.accounts?.value)} sub="Database records" accent/>
      <Stat title="Transactions" value={num(metrics.transactions?.value)} sub="Recorded entries"/>
      <Stat title="Store entitlement records" value={num(metrics.subscriptions?.value)} sub="Not unique subscribers"/>
      <Stat title="Complimentary grants" value={num(metrics.grants?.value)} sub="Includes expired grants"/>
    </div>{view!=='billing'&&<OwnerSignupChart series={payload?.signupSeries}/>}<div className="occ-two-col"><Bars metrics={metrics}/><Surface><div className="occ-heading"><div><h3>Business intelligence</h3><p>Connection integrity</p></div><Tag>Read only</Tag></div>
      <div className="occ-health-rows">{[['Revenue and settlements','Not connected'],['User retention cohorts','Not connected'],['Trial conversions','Not connected'],['Refunds and chargebacks','Not connected'],['Database counts',metrics.accounts?.status==='verified'?'Verified':'Unavailable']].map(([a,b])=><div className="occ-health-row" key={a}><span>{a}</span><Tag tone={b==='Verified'?'occ-good':''}>{b}</Tag></div>)}</div>
    </Surface></div>{view==='billing'&&<Surface><div className="occ-heading"><div><h3>Store verification records</h3><p>Latest 100 Apple and Google purchase verifications · not settled revenue</p></div><Tag>Read only</Tag></div><div className="occ-table-scroll"><table><thead><tr><th>Account</th><th>Platform</th><th>Tier</th><th>Status</th><th>Expires</th></tr></thead><tbody>{(payload?.storeRecords||[]).map(record=><tr key={record.id}><td><strong>{record.user_id?.slice(0,8)}…</strong></td><td>{record.platform==='apple'?'Apple':record.platform==='google'?'Google':'Unknown'}</td><td>{label(record.tier)}</td><td><Tag tone={record.status==='active'?'occ-good':''}>{record.status}</Tag></td><td>{date(record.expires_at)}</td></tr>)}{!(payload?.storeRecords||[]).length&&<tr><td colSpan={5}><Empty title="No store verification records" desc="No verified store rows are available to this account."/></td></tr>}</tbody></table></div><p className="occ-chart-note">Actual App Store and Google Play revenue must come from verified settlement feeds. No estimated earnings or invented balances are displayed.</p></Surface>}</>}
    {view==='users'&&<><Surface><div className="occ-heading"><div><h3>User directory</h3><p>Verified account identities · {payload?.total??'Unknown'} total returned by Auth provider</p></div><Tag>50 per page</Tag></div>
      <label className="occ-search"><Glyph name="search" size={17}/><input aria-label="Search users on this page" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search email or user UID"/></label>
      <div className="occ-table-scroll"><table><thead><tr><th>User</th><th>Verification</th><th>Detected access</th><th>Joined</th><th>Manage</th></tr></thead><tbody>
        {users.map(u=><tr key={u.id}><td><strong>{mask(u.email)}</strong><small title={u.id}>{u.id.slice(0,8)}…</small></td><td><Tag tone={u.verified?'occ-good':''}>{u.verified?'Verified':'Pending'}</Tag></td><td><Tag>{label(u.plan)}</Tag><small>{u.planSource}</small></td><td>{date(u.createdAt)}</td><td><button className="occ-small-button" onClick={()=>setSelected(selected===u.id?'':u.id)} disabled={!u.verified}>{selected===u.id?'Close':'Manage'}</button></td></tr>)}
        {!users.length&&<tr><td colSpan={5}><Empty title="No users on this page" desc="Try another search or page. User data is not fabricated."/></td></tr>}
      </tbody></table></div><div className="occ-pagination"><button disabled={busy||page===1} onClick={()=>setPage(n=>n-1)}>Previous</button><span>Page {page}</span><button disabled={busy||(payload?.users||[]).length<50} onClick={()=>setPage(n=>n+1)}>Next</button></div></Surface>
      {selected&&grantUser&&<Surface className="occ-edit"><div className="occ-heading"><div><h3>Grant complimentary access</h3><p>For {mask(grantUser.email)} · {grantUser.id}</p></div><button className="occ-icon-button" aria-label="Close grant form" onClick={()=>setSelected('')}><Glyph name="x"/></button></div>
        <GrantForm userId={selected} session={session} onDone={msg=>{setSelected('');setBanner(msg);reload();}}/></Surface>}</>}
    {view==='grants'&&<Surface><div className="occ-heading"><div><h3>Manual entitlement ledger</h3><p>Revocable, expiring complimentary access</p></div><Tag>Latest 100 grants</Tag></div><div className="occ-table-scroll"><table><thead><tr><th>Recipient</th><th>Plan</th><th>Expiry</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {(payload?.grants||[]).map(g=><tr key={g.id}><td><strong>{g.user_id.slice(0,8)}…</strong><small title={g.id}>Grant {g.id.slice(0,8)}…</small></td><td>{label(g.tier)}</td><td>{date(g.expires_at)}</td><td><Tag tone={!g.revoked_at&&Date.parse(g.expires_at)>Date.now()?'occ-good':''}>{g.revoked_at?'Revoked':Date.parse(g.expires_at)<=Date.now()?'Expired':'Active'}</Tag></td><td><button className="occ-small-button" disabled={!!g.revoked_at} onClick={()=>{setRevoke(g);setReason('');setRevokeConfirm(false);}}>{g.revoked_at?'Closed':'Revoke'}</button></td></tr>)}
      {!(payload?.grants||[]).length&&<tr><td colSpan={5}><Empty title="No manual grants found" desc="Grant access from Users after verifying the account."/></td></tr>}
    </tbody></table></div></Surface>}
    {view==='grants'&&revoke&&<Surface className="occ-edit"><div className="occ-heading"><div><h3>Revoke complimentary access</h3><p>{label(revoke.tier)} · {revoke.user_id}</p></div><button className="occ-icon-button" onClick={()=>setRevoke(null)} aria-label="Close revoke form"><Glyph name="x"/></button></div>
      <form className="occ-grant-form" onSubmit={async e=>{e.preventDefault();try{const result=await api(session,'grants',{}, {action:'revoke',userId:revoke.user_id,grantId:revoke.id,reason});setBanner(result.ok?'Grant revoked and audited.':'Grant already revoked.');setRevoke(null);reload();}catch(e){setError(e.message);}}}>
        <label>Reason<input value={reason} minLength={5} maxLength={300} required placeholder="Reason for revocation" onChange={e=>setReason(e.target.value)}/></label><label className="occ-check"><input type="checkbox" checked={revokeConfirm} onChange={e=>setRevokeConfirm(e.target.checked)}/> I confirm this specific grant should be revoked.</label><button className="occ-danger" disabled={!revokeConfirm||reason.trim().length<5}>Confirm revocation</button></form></Surface>}
    {view==='security'&&<Surface><div className="occ-heading"><div><h3>Owner audit trail</h3><p>Recent privileged changes from the database</p></div><Tag>Immutable entries</Tag></div><div className="occ-table-scroll"><table><thead><tr><th>Action</th><th>Actor</th><th>Recipient</th><th>Timestamp</th><th>Details</th></tr></thead><tbody>{(payload?.events||[]).map(e=><tr key={e.id}><td><Tag>{e.action}</Tag></td><td>{e.actor_user_id?.slice(0,8)}…</td><td>{e.target_user_id?.slice(0,8)}…</td><td>{date(e.created_at)}</td><td><small>{String(e.details?.reason||'—').slice(0,100)}</small></td></tr>)}{!(payload?.events||[]).length&&<tr><td colSpan={5}><Empty title="No privileged actions" desc="Grants and revocations will appear here after the audit migration is applied."/></td></tr>}</tbody></table></div></Surface>}
    {view==='health'&&<div className="occ-two-col"><Surface><h3>Backend reachability</h3><div className="occ-health-rows">{[['Admin API',payload?.server||'Unavailable'],['Supabase',payload?.database||'Unavailable'],['Schema verification','Requires verification'],['Deployment feed','Not connected']].map(([k,v])=><div key={k} className="occ-health-row"><span>{k}</span><Tag tone={v==='reachable'?'occ-good':''}>{v}</Tag></div>)}</div></Surface><Surface><h3>Operational safeguards</h3><p>Owner actions require signed-in identity, verified MFA, allowlisted UID, scoped RPC permissions, and immutable audit records.</p><Tag>Fail closed</Tag></Surface></div>}
    {['sync','support','compliance','promotions','settings'].includes(view)&&<Surface className="occ-integration-note"><div className="occ-heading"><div><h3>Integration status</h3><p>Owner workflow is available; external provider telemetry is not yet connected.</p></div><Tag>Provider pending</Tag></div><p>Track operational tasks below. These records do not automatically change MOVO subscriptions, customer records, app-store listings or production flags.</p></Surface>}
    {['sync','support','compliance','promotions','settings','health'].includes(view)&&payload?.items&&
      <OwnerWorkBoard key={view} area={view} items={payload.items} action={request=>api(session,view,{},request)}
        onChanged={notice=>{setBanner(notice);reload();}}/>}
    <footer className="occ-footer">MOVO Owner Command Center · Restricted access · No simulated metrics</footer>
    </main></div></div>;
}
export default function OwnerConsole(){
  const {session,ready}=useSession();
  const [unlocked,setUnlocked]=useState(0);
  return <div className="occ-root">{session&&ready?<OwnerContent key={session.user.id+'-'+unlocked} session={session}/>:<OwnerGate session={session} ready={ready} onUnlock={()=>setUnlocked(n=>n+1)}/>}</div>;
}
