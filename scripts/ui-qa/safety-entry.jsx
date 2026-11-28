// Render the real reporting and moderator components, not a reimplementation.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AIReportControl} from '../../src/components/NasrinAIChat';
import NasrinAIMessage from '../../src/components/NasrinAIMessage';
import {AIModerationQueue} from '../../src/owner/OwnerConsole';
import {setLanguage,loadLanguage} from '../../src/lib/i18n';
import '../../src/App.css';
const params=new URLSearchParams(location.search);
const owner='11111111-1111-4111-8111-111111111111';
const messageId='22222222-2222-4222-8222-222222222222';
const reportId='33333333-3333-4333-8333-333333333333';
const session={user:{id:owner},access_token:'synthetic:'+owner};
const mode=params.get('mode')==='dark'?'dark':'light';
const locale=params.get('locale')||'en';
document.documentElement.dataset.theme=mode;
document.documentElement.classList.toggle('dark',mode==='dark');
if(params.has('large'))document.documentElement.style.fontSize='200%';
function ModeratorFixture(){
  const [reports,setReports]=useState([{id:reportId,reason:'privacy',status:'pending',created_at:'2026-11-28T00:00:00Z'}]);
  const refresh=()=>setReports([]);
  return <div className="occ-root"><main className="occ-content"><AIModerationQueue session={session} reports={reports} refresh={refresh}/></main></div>;
}
async function render(){
  setLanguage(locale);
  await loadLanguage(locale);
  createRoot(document.getElementById('root')).render(params.get('view')==='owner'?<ModeratorFixture/>:
    <div className={'movo-app theme-'+mode+' accent-green'} style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',padding:16,boxSizing:'border-box'}}>
      <main style={{maxWidth:640,margin:'0 auto',minWidth:0}}>
        <article className="movo-ai-message assistant">
          <span className="movo-ai-message-label">NasrinAI</span>
          <NasrinAIMessage content="Fictional budgeting example: check your records before making a decision."/>
          <AIReportControl session={session} messageId={messageId}/>
        </article>
      </main>
    </div>);
}
render().catch(error=>{document.body.textContent='Fixture failed';throw error;});
