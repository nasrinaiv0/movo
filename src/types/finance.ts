/** Shared domain types for MOVO. Keep these independent of UI components. */
export type CurrencyCode = "PHP" | "USD" | "EUR" | "GBP" | "JPY" | (string & {});
export type TransactionType = "income" | "expense" | "transfer";
export type AccountType = "bank" | "card" | "e_wallet" | "cash" | "investment" | "other";

export interface FinanceAccount {
  id: string;
  user_id?: string;
  name: string;
  account_type: AccountType;
  institution_name: string | null;
  opening_balance: number;
  currency: CurrencyCode;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FinanceTransaction {
  id: string;
  user_id?: string;
  account_id: string;
  merchant: string;
  category: string;
  amount: number;
  currency?: CurrencyCode;
  transaction_type: TransactionType;
  occurred_at: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  /** Presentation-only fields; these are not necessarily database columns. */
  type?: TransactionType;
  date?: string;
  account?: string;
  source?: "Sample" | "Manual" | "Imported";
}

export interface CreateAccountInput {
  name: string;
  account_type: AccountType;
  institution_name?: string | null;
  opening_balance?: number;
  currency?: CurrencyCode;
}

export interface CreateTransactionInput {
  account_id: string;
  merchant: string;
  amount: number;
  transaction_type: TransactionType;
  category: string;
  occurred_at: string;
  note?: string | null;
  currency?: CurrencyCode;
}

export interface FinanceSummary {
  income: number;
  expenses: number;
  savings: number;
  balance: number;
  count: number;
}
