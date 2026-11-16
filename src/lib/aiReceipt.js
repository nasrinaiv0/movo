import { supabase } from './supabaseClient';
import { apiUrl } from './platform';
import { readPdfText } from './ocr';

// The selected document stays in memory until submitted. Compress before
// transmission to stay inside serverless request limits; no persistent cache.
const MAX_FILE=15*1024*1024;
const MAX_DATA_URL=2200000;
const allowed=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif','']);
async function loadPhoto(file) {
  if(typeof createImageBitmap==='function'){
    try{return await createImageBitmap(file);}catch{/* iOS fallback */}
  }
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read that photo.'));};
    image.src=url;
  });
}
export async function prepareAIReceipt(file) {
  if(!file||file.size>MAX_FILE)throw new Error('Choose a receipt smaller than 15 MB.');
  if(file.type==='application/pdf'||/\.pdf$/i.test(file.name||'')){
    const text=await readPdfText(file);
    if(!text.trim())throw new Error('The PDF has no readable receipt text.');
    return {text:text.slice(0,14000)};
  }
  if(!/^image\//.test(file.type||''))throw new Error('Choose a receipt photo or PDF.');
  if(!allowed.has(file.type))throw new Error('Choose a JPEG, PNG, WebP or supported phone photo.');
  const photo=await loadPhoto(file);
  try{
    const width=photo.width||photo.naturalWidth,height=photo.height||photo.naturalHeight;
    if(!width||!height)throw new Error('Receipt image has no readable dimensions.');
    let limit=1900;
    for(let tries=0;tries<4;tries++){
      const ratio=Math.min(1,limit/Math.max(width,height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
      const context=canvas.getContext('2d',{alpha:false});
      if(!context)throw new Error('Cannot process this photo on your device.');
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(photo,0,0,canvas.width,canvas.height);
      const imageDataUrl=canvas.toDataURL('image/jpeg',0.84-tries*0.09);
      if(imageDataUrl.length<=MAX_DATA_URL)return {imageDataUrl};
      limit=Math.round(limit*0.76);
    }
    throw new Error('This receipt is too detailed to send safely. Try a closer photo.');
  }finally{photo.close?.();}
}

export async function scanReceiptWithAI(file) {
  if(!supabase)throw new Error('Sign in to use AI receipt scanning.');
  const {data,error}=await supabase.auth.getSession();
  const token=data?.session?.access_token;
  if(error||!token)throw new Error('Sign in to use AI receipt scanning.');
  const content=await prepareAIReceipt(file);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),40000);
  try{
    const response=await fetch(apiUrl('/api/receipts/scan'),{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      cache:'no-store',body:JSON.stringify({consent:true,...content}),signal:controller.signal
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok){
      const codes={
        receipt_ai_not_configured:'AI receipt scanning is not configured for this environment.',
        receipt_ai_unavailable:'AI receipt scanning is temporarily unavailable.',
        ai_timeout:'Receipt AI timed out. Try again.',
        ai_rate_limited:'Too many receipt scans. Try again later.',
        invalid_session:'Your session has expired. Sign in again.',
        pro_required:'AI receipt scanning requires active Pro access.',
      };
      throw new Error(codes[result.error]||'Could not analyze this receipt.');
    }
    if(!result?.receipt||typeof result.receipt!=='object')throw new Error('Could not read the AI receipt result.');
    return result.receipt;
  }finally{clearTimeout(timeout);}
}
