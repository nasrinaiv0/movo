const BASE = 'https://api.twelvedata.com';
const QUOTES = new Set(['PHP','USD','EUR','GBP','JPY','AUD','CAD','SGD','CHF','HKD','CNY','INR','KRW','NZD','ZAR','BRL','MXN','SEK','NOK','DKK','PLN','TRY','THB','IDR','MYR']);
function json(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(payload));}
function safeSymbol(value){const s=String(value||'').trim().toUpperCase();return /^[A-Z0-9][A-Z0-9:._-]{0,24}$/.test(s)?s:null;}
function safeQuote(value){const s=String(value||'USD').trim().toUpperCase();return QUOTES.has(s)?s:null;}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function normalizeQuote(row,symbol){
 const price=num(row.close||row.price); if(price===null)return null;
 const change=num(row.percent_change); const prev=num(row.previous_close);
 return {symbol:safeSymbol(row.symbol||symbol),name:typeof row.name==='string'?row.name:'',exchange:typeof row.exchange==='string'?row.exchange:'',currency:typeof row.currency==='string'?row.currency:'',price,changePercent:change,previousClose:prev,open:num(row.open),high:num(row.high),low:num(row.low),volume:num(row.volume),timestamp:typeof row.datetime==='string'?row.datetime:null};
}
module.exports=async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'method_not_allowed'});}
 const key=process.env.TWELVE_DATA_API_KEY;
 if(!key)return json(res,503,{error:'stocks_provider_not_configured',message:'Configure the licensed Twelve Data key as the server-only TWELVE_DATA_API_KEY environment variable.'});
 const action=String(req.query&&req.query.action||'search');
 const symbol=safeSymbol(req.query&&req.query.symbol);
 const quote=safeQuote(req.query&&req.query.quote);
 if(!['search','quote','history'].includes(action))return json(res,400,{error:'invalid_action'});
 if(action==='search'){
  const query=String(req.query&&req.query.query||'').trim().slice(0,80);
  if(query.length<1)return json(res,400,{error:'invalid_search_query'});
  const url=new URL('/symbol_search',BASE);url.searchParams.set('symbol',query);url.searchParams.set('apikey',key);
  try{const upstream=await fetch(url.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});if(!upstream.ok)return json(res,502,{error:'stocks_provider_unavailable'});const data=await upstream.json();if(data.status==='error')return json(res,502,{error:'stocks_provider_error'});const results=(Array.isArray(data.data)?data.data:[]).slice(0,20).map(x=>({symbol:safeSymbol(x.symbol),name:String(x.instrument_name||''),exchange:String(x.exchange||''),mic_code:String(x.mic_code||''),country:String(x.country||''),currency:String(x.currency||''),type:String(x.instrument_type||'Stock')})).filter(x=>x.symbol&&x.name);res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');return json(res,200,{results,provider:'Twelve Data',fetchedAt:new Date().toISOString()});}catch{return json(res,502,{error:'stocks_provider_unavailable'});}
 }
 if(!symbol)return json(res,400,{error:'invalid_symbol'});
 if(action==='quote'&&!quote)return json(res,400,{error:'invalid_quote_currency'});
 const url=new URL(action==='quote'?'/quote':'/time_series',BASE);url.searchParams.set('symbol',symbol);url.searchParams.set('apikey',key);
 if(action==='quote')url.searchParams.set('interval','1min');
 else{const outputsize=Math.max(2,Math.min(500,Number(req.query&&req.query.outputsize)||90));url.searchParams.set('interval','1day');url.searchParams.set('outputsize',String(outputsize));}
 try{
  const upstream=await fetch(url.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(!upstream.ok)return json(res,502,{error:'stocks_provider_unavailable'});
  const data=await upstream.json();if(data.status==='error'||data.code)return json(res,502,{error:data.code===429?'stocks_provider_rate_limited':'stocks_provider_error',message:String(data.message||'Market data provider error').slice(0,180)});
  res.setHeader('Cache-Control',action==='quote'?'public, s-maxage=60, stale-while-revalidate=120':'public, s-maxage=900, stale-while-revalidate=1800');
  if(action==='quote'){const result=normalizeQuote(data,symbol);if(!result)return json(res,502,{error:'invalid_provider_response'});return json(res,200,{quote:result,provider:'Twelve Data',fetchedAt:new Date().toISOString(),delayed:true});}
  const values=Array.isArray(data.values)?data.values:[];const points=values.map(x=>({date:x.datetime,price:num(x.close),volume:num(x.volume)})).filter(x=>typeof x.date==='string'&&x.price!==null).reverse();return json(res,200,{symbol,points,provider:'Twelve Data',fetchedAt:new Date().toISOString(),delayed:true});
 }catch{return json(res,502,{error:'stocks_provider_unavailable'});}
};
module.exports.safeSymbol=safeSymbol;module.exports.safeQuote=safeQuote;module.exports.normalizeQuote=normalizeQuote;
