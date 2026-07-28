import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BankFilters = {
  bankAccountId?: string | null;
  from?: string | null;
  to?: string | null;
  status?: string | null;
  propertyId?: string | null;
  category?: string | null;
  search?: string | null;
};

export type BankAccountBalance = {
  bank_account_id: string;
  company_id: string;
  name: string;
  bank_name: string | null;
  iban: string | null;
  account_identifier: string | null;
  currency: string;
  account_type: string;
  status: string;
  opening_balance: number;
  opening_balance_date: string;
  movement: number;
  system_balance: number;
  inflows: number;
  outflows: number;
  unreconciled_count: number;
  unreconciled_value: number;
  last_transaction_date: string | null;
};

const num = (v: unknown) => Number(v ?? 0);

export function useBankAccountBalances(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bank-account-balances", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_bank_account_balances")
        .select("*")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        opening_balance: num(r.opening_balance),
        movement: num(r.movement),
        system_balance: num(r.system_balance),
        inflows: num(r.inflows),
        outflows: num(r.outflows),
        unreconciled_count: num(r.unreconciled_count),
        unreconciled_value: num(r.unreconciled_value),
      })) as BankAccountBalance[];
    },
  });
}

export function useBankAccountsList(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bank-accounts-list", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBankTransactions(companyId: string | undefined, f: BankFilters) {
  return useQuery({
    queryKey: ["bank-transactions", companyId, f],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("bank_transactions")
        .select("*")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false })
        .limit(500);
      if (f.bankAccountId) q = q.eq("bank_account_id", f.bankAccountId);
      if (f.from) q = q.gte("transaction_date", f.from);
      if (f.to) q = q.lte("transaction_date", f.to);
      if (f.status) q = q.eq("reconciliation_status", f.status);
      if (f.search) q = q.or(`description.ilike.%${f.search}%,counterparty_name.ilike.%${f.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((t) => ({
        ...t,
        amount: num(t.amount),
        matched_amount: num(t.matched_amount),
        debit_amount: num(t.debit_amount),
        credit_amount: num(t.credit_amount),
      }));
    },
  });
}

export type BankTransaction = NonNullable<
  ReturnType<typeof useBankTransactions>["data"]
>[number];

export function useExpectedItems(companyId: string | undefined, f: BankFilters) {
  return useQuery({
    queryKey: ["bank-expected-items", companyId, f],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("v_bank_expected_items")
        .select("*")
        .eq("company_id", companyId!)
        .order("expected_date")
        .limit(500);
      if (f.bankAccountId) q = q.eq("bank_account_id", f.bankAccountId);
      if (f.from) q = q.gte("expected_date", f.from);
      if (f.to) q = q.lte("expected_date", f.to);
      if (f.propertyId) q = q.eq("property_id", f.propertyId);
      if (f.category) q = q.eq("category", f.category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        expected_amount: num(r.expected_amount),
        matched_amount: num(r.matched_amount),
        outstanding_amount: num(r.outstanding_amount),
      }));
    },
  });
}

export function useStatementImports(companyId: string | undefined, bankAccountId?: string | null) {
  return useQuery({
    queryKey: ["bank-statement-imports", companyId, bankAccountId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("bank_statement_imports")
        .select("*, bank_accounts(name)")
        .eq("company_id", companyId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (bankAccountId) q = q.eq("bank_account_id", bankAccountId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useImportRows(importId: string | null) {
  return useQuery({
    queryKey: ["bank-import-rows", importId],
    enabled: Boolean(importId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_statement_import_rows")
        .select("*")
        .eq("import_id", importId!)
        .order("line_no");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMatches(companyId: string | undefined, f: BankFilters) {
  return useQuery({
    queryKey: ["bank-matches", companyId, f],
    enabled: Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("bank_reconciliation_matches")
        .select(
          "*, bank_transactions(transaction_date, description, counterparty_name, amount), cash_flow_entries(description, expected_date, category, source_type)",
        )
        .eq("company_id", companyId!)
        .order("confirmed_at", { ascending: false })
        .limit(300);
      if (f.bankAccountId) q = q.eq("bank_account_id", f.bankAccountId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReconciliationExceptions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bank-exceptions", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_bank_reconciliation_exceptions")
        .select("*")
        .eq("company_id", companyId!)
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTransfers(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bank-transfers", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transfers")
        .select("*")
        .eq("company_id", companyId!)
        .order("transfer_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}
