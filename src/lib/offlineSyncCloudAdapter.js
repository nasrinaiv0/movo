import { supabase } from './supabaseClient';
import { getCurrentSession, listAccounts, listTransactions } from './financeRepository';
import { TRANSACTION_SOURCES } from './transactionSources';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNT_TYPES=new Set(['bank','card','e_wallet','cash','investment','other']);
const money=value=>{
 const raw=String(value??'').trim();
 if(!/^-?\d+(?:\.\d{1,2})?$/.test(raw))throw Error('Financial amount requires exact cents. Review the device record.');
 const amount=Number(raw);
 if(!Number.isFinite(amount)||Math.abs(amount)>=1e17)throw Error('Amount exceeds safe limits.');
 return amount;
};
function validUUID(v,label='record'){
 if(!UUID.test(String(v||'')))throw Error('A stable '+label+' UUID is required to sync.');
 return v;
}
const client=()=>{if(!supabase)throw Error('Cloud is not configured. Offline changes are preserved.');return supabase;};
export async function assertOfflineSyncOwner(ownerId){
 validUUID(ownerId,'owner');
 const session=await getCurrentSession();
 if(session?.user?.id!==ownerId || !session?.access_token)throw Error('Cloud sign-in changed or expired. Local records remain pending.');
}
export async function fetchOfflineSyncCloud(ownerId){
 await assertOfflineSyncOwner(ownerId);
 const [financial_accounts,transactions]=await Promise.all([listAccounts(),listTransactions()]);
 for(const row of [...financial_accounts,...transactions])if(row.user_id && row.user_id!==ownerId)throw Error('Cloud returned an unexpected account owner.');
 return {financial_accounts,transactions};
}
function accountPayload(row,ownerId){
 validUUID(row?.id);
 if(row.user_id && row.user_id!==ownerId)throw Error('Cross-account record rejected.');
 const name=String(row.name||'').trim();
 const accountType=String(row.account_type||'');
 if(!name||name.length>100||!ACCOUNT_TYPES.has(accountType))throw Error('Imported account has an invalid name or type.');
 if(!/^[A-Z]{3}$/.test(String(row.currency||'')))throw Error('Imported account currency is invalid.');
 return {
  id:row.id,user_id:ownerId,name,account_type:accountType,
  institution_name:row.institution_name?String(row.institution_name).slice(0,100):null,
  currency:row.currency,opening_balance:money(row.opening_balance??row.balance??0),
  is_archived:row.is_archived===true,display_order:Number.isSafeInteger(row.display_order)?row.display_order:0,
 };
}
export async function insertOfflineAccount(row,ownerId){
 const payload=accountPayload(row,ownerId);
 const {data,error}=await client().from('financial_accounts').insert(payload).select().single();
 if(error)throw error;
 return data;
}
export async function updateOfflineAccountCAS(row,expectedUpdatedAt,ownerId){
 if(!Number.isFinite(Date.parse(expectedUpdatedAt)))throw Error('Missing validated account revision; reconciliation was not applied.');
 const payload=accountPayload(row,ownerId);
 delete payload.id;delete payload.user_id;
 const {data,error}=await client().from('financial_accounts').update(payload)
  .eq('id',row.id).eq('user_id',ownerId).eq('updated_at',expectedUpdatedAt).select().maybeSingle();
 if(error)throw error;
 if(!data)throw Error('Cloud account was updated elsewhere. Retry reconciliation and review the conflict.');
 return data;
}
const permittedSource=source=>{
 const value=String(source||'').trim();
 if(value.toLowerCase()==='manual')return 'manual';
 if(['CSV Import','File Import'].includes(value))return 'csv_import';
 return TRANSACTION_SOURCES.includes(value)?value:'manual';
};
export async function insertOfflineTransaction(row,ownerId){
 validUUID(row?.id);
 validUUID(row?.account_id,'account');
 if(row.user_id && row.user_id!==ownerId)throw Error('Cross-account transaction rejected.');
 if(!['income','expense','transfer'].includes(row.transaction_type))throw Error('Invalid offline transaction type.');
 const isTransfer=row.transaction_type==='transfer';
 if(isTransfer)validUUID(row.transfer_to_account_id,'transfer destination');
 if(isTransfer && row.transfer_to_account_id===row.account_id)throw Error('Transfer accounts must differ.');
 if(!Number.isFinite(Date.parse(row.occurred_at)))throw Error('Invalid transaction date.');
 const description=String(row.merchant||'').trim();
 if(!description||description.length>160)throw Error('Invalid transaction description.');
 if(row.receipt_path?.startsWith('localreceipt:')||row.receipt_path?.startsWith('blob:'))
   throw Error('Offline receipt attachment needs secure upload before the transaction can sync.');
 if(row.schedule_id && !UUID.test(String(row.schedule_id)))
   throw Error('Unsynced schedule reference requires review before uploading.');
 const amount=money(row.amount);
 if(!(amount>0))throw Error('Transaction amount must be positive.');
 const payload={
  id:row.id,user_id:ownerId,account_id:row.account_id,
  transfer_to_account_id:isTransfer?row.transfer_to_account_id:null,
  transaction_type:row.transaction_type,amount,
  currency:/^[A-Z]{3}$/.test(row.currency)?row.currency:'PHP',
  merchant:description,category:String(row.category||'Other').slice(0,60),
  note:row.note?String(row.note).slice(0,1000):null,
  occurred_at:new Date(row.occurred_at).toISOString(),
  source:permittedSource(row.source),
  external_reference:row.external_reference?String(row.external_reference).slice(0,200):null,
  payment_reference:row.payment_reference?String(row.payment_reference).slice(0,120):null,
  receipt_note:row.receipt_note?String(row.receipt_note).slice(0,500):null,
  receipt_path:row.receipt_path||null,
  ...(row.schedule_id?{schedule_id:row.schedule_id}:{}),
 };
 const {data,error}=await client().from('transactions').insert(payload).select().single();
 if(error)throw error;
 return data;
}
