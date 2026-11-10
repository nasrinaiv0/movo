import { supabase } from './supabaseClient';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;

/** Stable across response loss/restarts; a new expected revision creates a new identity. */
export async function syncRequestId(request) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure operation identity unavailable');
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(request)));
  const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  // RFC UUID variant, version 8 (application-defined SHA-256 input).
  hash[6] = (hash[6] & 15) | 128;
  hash[8] = (hash[8] & 63) | 128;
  const hex = Array.from(hash.slice(0, 16), n => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The SQL function authenticates auth.uid(), locks CAS and commits ACK + effects together. */
export async function applyHybridCloudOperation(op) {
  if (!supabase || !UUID.test(op?.ownerId || '') || !UUID.test(op?.recordId || '') ||
      !['financial_accounts', 'transactions'].includes(op.group) || !['create', 'update', 'delete'].includes(op.kind))
    throw new Error('Invalid cloud operation');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || sessionData?.session?.user?.id !== op.ownerId || !sessionData.session.access_token)
    throw new Error('Cloud sign-in changed or expired. Local records remain pending.');
  const revision = op.revision ?? 0;
  if (!Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER)
    throw new Error('Invalid operation revision');
  const request = { ownerId: op.ownerId, group: op.group, kind: op.kind, recordId: op.recordId,
    payload: op.payload ?? null, expectedUpdatedAt: op.expectedUpdatedAt ?? null, revision };
  const id = op.id || await syncRequestId(request);
  if (!UUID.test(id)) throw new Error('Invalid operation identity');
  const { data, error } = await supabase.rpc('apply_movo_sync_operation', {
    p_operation_id: id, p_group: op.group, p_kind: op.kind, p_record_id: op.recordId,
    p_payload: request.payload, p_expected_updated_at: request.expectedUpdatedAt, p_revision: revision,
  });
  if (error) throw error;
  if (data?.ownerId !== op.ownerId || data?.operationId !== id || data?.recordId !== op.recordId ||
      data?.revision !== revision + 1 ||
      (op.kind !== 'delete' && (data?.record?.id !== op.recordId || data?.record?.user_id !== op.ownerId)))
    throw new Error('Cloud returned unverified operation acknowledgement');
  return data;
}
