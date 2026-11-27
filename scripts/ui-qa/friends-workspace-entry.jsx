// Isolated loopback fixture: actual production components, fictional identities only.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import FriendsWorkspace from '../../src/components/FriendsWorkspace';
import {useFriendsController} from '../../src/components/FriendsController';
import {useFriendInbox} from '../../src/components/FriendMessages';
import {ConfirmProvider,useConfirmController} from '../../src/components/ConfirmDialog';
import '../../src/App.css';
const owner='11111111-1111-4111-8111-111111111111';
const params=new URLSearchParams(location.search), theme=params.get('mode')==='dark'?'dark':'light';
document.documentElement.dataset.theme=theme;
document.documentElement.classList.toggle('dark',theme==='dark');
document.documentElement.dir=params.get('rtl')?'rtl':'ltr';
if(params.get('large'))document.documentElement.style.fontSize='200%';
function Fixture(){
 const [mode,setMode]=useState('chats'),[friend,setFriend]=useState(null),[trail,setTrail]=useState([]);
 const session=React.useMemo(()=>({user:{id:owner},access_token:'synthetic:'+owner}),[]);
 const drafts=React.useRef(new Map());
 const confirm=useConfirmController();
 const navigate=(next,value)=>{setTrail(t=>[...t,mode]);setMode(next);if(value)setFriend(value);};
 const c=useFriendsController({session,routeMode:mode,onNavigate:navigate,confirmAction:confirm.confirm});
 const inbox=useFriendInbox(session);
 return <ConfirmProvider value={confirm.confirm}><div className={'movo-app theme-'+theme+' accent-green'} style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',padding:16,boxSizing:'border-box'}}>
 <main style={{maxWidth:1120,margin:'0 auto'}}><FriendsWorkspace key={mode} controller={c} inbox={inbox} session={session} friend={friend}
 user={{name:'Alex Rivera',initial:'A'}} drafts={drafts.current} onNavigate={navigate}
 onBack={()=>{setMode(trail.at(-1)||'chats');setTrail(t=>t.slice(0,-1));}}
 onEditProfile={()=>navigate('profile')} onOpenSummary={()=>navigate('detail',friend)} onSignIn={()=>{}}
 onHelp={()=>navigate('settings')} onPrivacy={()=>navigate('settings')} onAccountSettings={()=>navigate('settings')}/></main>{confirm.element}</div></ConfirmProvider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
