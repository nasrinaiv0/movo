import React, { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { RootHeader, Sheet } from '../components/ui';
import './MembershipCards.css';

const RETAILERS = ['Landers','SM Advantage','Watsons Club','Robinsons Rewards','Mercury Drug Suki','Ayala Malls','Other'];
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `member-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const readFile = (file) => new Promise((resolve,reject) => { const r=new FileReader(); r.onload=()=>resolve(String(r.result)); r.onerror=reject; r.readAsDataURL(file); });
function Field({label,children}) { return <label className="mc-field"><span>{label}</span>{children}</label>; }

export default function MembershipCards({ c }) {
  const { prefs, setPref, accountsView=[] } = c;
  const cards = Array.isArray(prefs.membershipCards) ? prefs.membershipCards : [];
  const qrUploads = prefs.accountQrCodes || {};
  const [editor,setEditor] = useState(null);
  const [tab,setTab] = useState('memberships');
  const [qrAccount,setQrAccount] = useState('');
  const [error,setError] = useState('');
  const ewallets=accountsView.filter(a=>a.account_type==='e_wallet'&&!a.is_archived);
  const banks=accountsView.filter(a=>['bank','e_wallet'].includes(a.account_type)&&!a.is_archived);
  const sorted=useMemo(()=>[...cards].sort((a,b)=>String(a.expiryDate||'9999').localeCompare(String(b.expiryDate||'9999'))),[cards]);
  const saveCard=(row)=>{setPref('membershipCards',editor?.id?cards.map(x=>x.id===editor.id?row:x):[...cards,row]);setEditor(null);setError('');};
  const removeCard=(id)=>setPref('membershipCards',cards.filter(x=>x.id!==id));
  const uploadQr=async(file)=>{if(!file)return;if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>3*1024*1024){setError('Choose a PNG, JPG or WebP image under 3 MB.');return;}try{const data=await readFile(file);setPref('accountQrCodes',{...qrUploads,[qrAccount]:data});setError('');}catch{setError('Could not read that image.');}};
  const expiryLabel=(date)=>{if(!date)return 'No expiry';const days=Math.ceil((new Date(date+'T23:59:59').getTime()-Date.now())/86400000);return days<0?'Expired':days<=30?`Expires in ${days} days`:`Expires ${date}`;};
  return <div className="membership-screen">
    <RootHeader title="Membership & QR" onBack={()=>c.go('Wallet')} />
    <div className="mc-tabs"><button className={tab==='memberships'?'active':''} onClick={()=>setTab('memberships')}>Membership cards</button><button className={tab==='qr'?'active':''} onClick={()=>setTab('qr')}>Bank & e-wallet QR</button></div>
    {tab==='memberships'&&<>
      <div className="mc-intro"><div><h2>Your loyalty cards</h2><p>Keep membership barcodes, expiry dates and optional points together.</p></div><button className="primary-button" onClick={()=>setEditor({id:'',name:'',program:'Other',memberNumber:'',barcode:'',expiryDate:'',noExpiry:true,points:'',pointsExpiry:'',linkedEwalletIds:[]})}><Icon name="plus" size={17}/> Add card</button></div>
      {!sorted.length&&<div className="card empty-card"><Icon name="ticket" size={30}/><h3>No membership cards yet</h3><p>Add Landers, SM Advantage, Watsons and other loyalty cards.</p></div>}
      <div className="mc-list">{sorted.map(card=><article className="card mc-card" key={card.id}><div className="mc-card-head"><span className="mc-mark">{card.name.slice(0,1).toUpperCase()}</span><div><strong>{card.name}</strong><small>{card.program} · {card.memberNumber||'No number added'}</small></div><button className="plain-icon" aria-label="Edit card" onClick={()=>setEditor({...card})}><Icon name="edit" size={17}/></button></div><div className="mc-meta"><span>{expiryLabel(card.noExpiry?'':card.expiryDate)}</span>{card.points!==''&&card.points!=null&&<span>{card.points} points{card.pointsExpiry?` · points expire ${card.pointsExpiry}`:''}</span>}</div>{card.barcode&&<button className="mc-barcode" onClick={()=>setEditor({...card,showBarcode:true})}><span>{card.barcode}</span><small>Show membership code</small></button>}<div className="mc-linked">{(card.linkedEwalletIds||[]).map(id=>ewallets.find(a=>a.id===id)?.name).filter(Boolean).join(' · ')||'No e-wallet linked'}</div><button className="text-button" onClick={()=>removeCard(card.id)}>Remove</button></article>)}</div>
    </>}
    {tab==='qr'&&<section className="card mc-qr-panel"><h2>Bank & e-wallet QR codes</h2><p>Upload your own payment QR image for quick access. Membership cards cannot use this upload.</p><Field label="Choose an account"><select value={qrAccount} onChange={e=>setQrAccount(e.target.value)}><option value="">Select bank or e-wallet</option>{banks.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>{qrAccount&&<><label className="mc-upload"><Icon name="image-plus" size={22}/><span>{qrUploads[qrAccount]?'Replace QR image':'Upload QR image'}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadQr(e.target.files?.[0])}/></label>{qrUploads[qrAccount]&&<div className="mc-qr-preview"><img src={qrUploads[qrAccount]} alt="Uploaded bank or e-wallet QR code"/><button className="text-button" onClick={()=>{const next={...qrUploads};delete next[qrAccount];setPref('accountQrCodes',next);}}>Remove QR</button></div>}</>}</section>}
    {error&&<p className="mc-error" role="alert">{error}</p>}
    {editor&&<Sheet title={editor.showBarcode?'Membership code':editor.id?'Edit membership card':'Add membership card'} onClose={()=>setEditor(null)}>{editor.showBarcode?<div className="mc-code-view"><div className="mc-code-bars" aria-label={editor.barcode}>{Array.from({length:42},(_,i)=><i key={i} style={{width:(i%4===0?3:1)+'px'}}/>)}</div><strong>{editor.barcode}</strong></div>:<div className="mc-form">
      <Field label="Card name"><input value={editor.name} onChange={e=>setEditor({...editor,name:e.target.value})} placeholder="e.g. SM Advantage"/></Field>
      <Field label="Program"><select value={editor.program} onChange={e=>setEditor({...editor,program:e.target.value})}>{RETAILERS.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Membership number"><input value={editor.memberNumber} onChange={e=>setEditor({...editor,memberNumber:e.target.value})}/></Field>
      <Field label="Barcode / QR value"><input value={editor.barcode} onChange={e=>setEditor({...editor,barcode:e.target.value})} placeholder="Enter code (image upload not supported here)"/></Field>
      <label className="mc-check"><input type="checkbox" checked={!!editor.noExpiry} onChange={e=>setEditor({...editor,noExpiry:e.target.checked,expiryDate:e.target.checked?'':editor.expiryDate})}/> No expiry date</label>
      {!editor.noExpiry&&<Field label="Membership expiry date"><input type="date" value={editor.expiryDate||''} onChange={e=>setEditor({...editor,expiryDate:e.target.value})}/></Field>}
      <Field label="Points balance (optional)"><input type="number" min="0" value={editor.points??''} onChange={e=>setEditor({...editor,points:e.target.value})}/></Field>
      <Field label="Points expiry (optional)"><input type="date" value={editor.pointsExpiry||''} onChange={e=>setEditor({...editor,pointsExpiry:e.target.value})}/></Field>
      <Field label="Link to e-wallets (optional)"><select multiple value={editor.linkedEwalletIds||[]} onChange={e=>setEditor({...editor,linkedEwalletIds:Array.from(e.target.selectedOptions).map(o=>o.value)})}>{ewallets.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
      <p className="mc-note">Linking is for organization and quick reference only. It does not connect to or move money through the e-wallet.</p>
      <button className="primary-button" disabled={!editor.name.trim()} onClick={()=>saveCard({...editor,id:editor.id||uid(),name:editor.name.trim(),expiryDate:editor.noExpiry?'':editor.expiryDate||'',points:editor.points===''?'':Number(editor.points),linkedEwalletIds:editor.linkedEwalletIds||[]})}>Save membership card</button>
    </div>}</Sheet>}
  </div>;
}
