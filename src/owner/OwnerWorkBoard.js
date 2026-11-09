import React, {useState} from 'react';

const STATUSES=[['pending','Pending'],['in_progress','In progress'],['blocked','Blocked'],['complete','Complete']];
const PRIORITIES=[['low','Low'],['medium','Medium'],['high','High'],['critical','Critical']];
const format=(value)=>new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
function Status({value}){return <span className={'occ-work-status '+value}>{STATUSES.find(s=>s[0]===value)?.[1]||value}</span>;}
export default function OwnerWorkBoard({area,items,action,onChanged}){
  const [filter,setFilter]=useState('all');
  const [newOpen,setNewOpen]=useState(false);
  const [title,setTitle]=useState('');
  const [notes,setNotes]=useState('');
  const [priority,setPriority]=useState('medium');
  const [editing,setEditing]=useState(null);
  const [editStatus,setEditStatus]=useState('pending');
  const [editPriority,setEditPriority]=useState('medium');
  const [editNotes,setEditNotes]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const visible=(items||[]).filter(i=>filter==='all'||i.status===filter);
  async function submitCreate(event){
    event.preventDefault();if(busy)return;
    setBusy(true);setError('');
    try{await action({action:'work_create',area,title:title.trim(),notes,priority});
      setTitle('');setNotes('');setPriority('medium');setNewOpen(false);onChanged('Work item created and audited.');
    }catch(e){setError(e.message||'Could not create work item.');}
    finally{setBusy(false);}
  }
  function edit(item){setEditing(item);setEditStatus(item.status);setEditPriority(item.priority);setEditNotes(item.notes||'');setError('');}
  async function submitEdit(event){
    event.preventDefault();if(!editing||busy)return;
    setBusy(true);setError('');
    try{await action({action:'work_update',id:editing.id,expectedUpdatedAt:editing.updated_at,
      status:editStatus,priority:editPriority,notes:editNotes});
      setEditing(null);onChanged('Work item updated and audited.');
    }catch(e){setError(e.message==='work_item_changed_reload'
      ?'This item was changed in another session. Refresh before editing again.'
      :e.message||'Could not update work item.');}
    finally{setBusy(false);}
  }
  return <section className="occ-card occ-work-board">
    <div className="occ-heading"><div><h3>{area==='promotions'?'Announcements & feature operations':'Operational work queue'}</h3>
      <p>Owner-owned tasks, evidence notes and status history. No automated customer changes.</p></div>
      <button type="button" className="occ-primary" onClick={()=>{setNewOpen(v=>!v);setError('');setEditing(null);}}>{newOpen?'Close form':'+ New item'}</button></div>
    {newOpen&&<form className="occ-work-form" onSubmit={submitCreate}>
      <label>Title<input minLength={5} maxLength={140} required value={title} onChange={e=>setTitle(e.target.value)} placeholder={area==='support'?'Follow up on reported issue':'Describe the operational task'}/></label>
      <div className="occ-grant-fields"><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}>{PRIORITIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label>Initial status<input value="Pending" disabled readOnly /></label></div>
      <label>Notes (do not paste customer finance records)<textarea maxLength={3000} value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Evidence, next steps, or a reference link"/></label>
      <button type="submit" className="occ-primary" disabled={busy||title.trim().length<5}>{busy?'Saving…':'Create item'}</button>
    </form>}
    <div className="occ-work-filters" role="group" aria-label="Filter operational items">
      {['all',...STATUSES.map(s=>s[0])].map(value=><button type="button" key={value}
        aria-pressed={filter===value} className={filter===value?'selected':''} onClick={()=>setFilter(value)}>
        {value==='all'?'All':STATUSES.find(s=>s[0]===value)?.[1]}</button>)}
    </div>
    <div className="occ-work-list">
      {visible.map(item=><article className="occ-work-item" key={item.id}>
        <div className="occ-work-item-main"><div className="occ-work-item-title"><strong>{item.title}</strong>
          <Status value={item.status}/></div><p>{item.notes||'No notes added yet.'}</p>
          <small>Updated {format(item.updated_at)} · {item.priority} priority</small></div>
        <button type="button" className="occ-small-button" onClick={()=>edit(item)}>Edit</button>
      </article>)}
      {!visible.length&&<div className="occ-empty"><strong>No items in this view</strong><p>Create a work item to track real operational findings. Nothing is auto-generated.</p></div>}
    </div>
    {editing&&<form className="occ-work-form" onSubmit={submitEdit}>
      <div className="occ-heading"><div><h3>Edit work item</h3><p>{editing.title}</p></div><button type="button" className="occ-small-button" onClick={()=>{setEditing(null);setError('');}}>Cancel</button></div>
      <div className="occ-grant-fields"><label>Status<select value={editStatus} onChange={e=>setEditStatus(e.target.value)}>{STATUSES.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
        <label>Priority<select value={editPriority} onChange={e=>setEditPriority(e.target.value)}>{PRIORITIES.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label></div>
      <label>Notes<textarea rows={3} maxLength={3000} value={editNotes} onChange={e=>setEditNotes(e.target.value)}/></label>
      <button className="occ-primary" disabled={busy}>{busy?'Saving…':'Save changes'}</button>
    </form>}
    {error&&<p className="occ-alert" role="alert">{error}</p>}
  </section>;
}
