/*
 * Allowed transactions.source values (database check constraint, migration 20261102010000).
 * Automation channels keep their own name so every record shows where it came from.
 */
export const AUTOMATION_SOURCES = ['applepay', 'googlepay', 'bank', 'notification', 'siri_shortcut', 'android_assistant'];
export const TRANSACTION_SOURCES = ['manual', 'csv_import', 'bank_sync', 'apple_pay_export', 'other', ...AUTOMATION_SOURCES];
