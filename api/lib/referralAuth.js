'use strict';
const { createClient }=require('@supabase/supabase-js');
function send(res,status,payload) {
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 return res.status(status).json(payload);
}
function gate(req,res,method) {
 if(req.method!==method){res.setHeader('Allow',method);send(res,405,{error:'method_not_allowed'});return false;}
 if(Number(req.headers['content-length']||0)>32768){send(res,413,{error:'payload_too_large'});return false;}
 if(process.env.MOVO_REFERRAL_POINTS_ENABLED!=='true'){send(res,503,{error:'referrals_not_configured'});return false;}
 return true;
}
async function clients(req) {
 const token=/^Bearer\s+(\S+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return {error:'sign_in_required',status:401};
 const url=process.env.SUPABASE_URL||process.env.REACT_APP_SUPABASE_URL;
 const anon=process.env.SUPABASE_ANON_KEY||process.env.REACT_APP_SUPABASE_ANON_KEY;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return {error:'service_unavailable',status:503};
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 const auth=createClient(url,anon,options), admin=createClient(url,service,options);
 const {data,error}=await auth.auth.getUser(token);
 if(error||!data?.user?.id)return {error:'sign_in_required',status:401};
 return {admin,userId:data.user.id};
}
module.exports={send,gate,clients};