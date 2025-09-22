interface TransactionLike {
  debit?: number | null;
  credit?: number | null;
}

const debitNormal = new Set(['asset', 'expense']);

export function calculateAccountBalance(
  accountType: string | null | undefined,
  transactions: TransactionLike[] = []
): number {
  const totals = transactions.reduce(
    (acc, tx) => {
      acc.debit += Number(tx.debit ?? 0);
      acc.credit += Number(tx.credit ?? 0);
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  if (accountType && debitNormal.has(accountType.toLowerCase())) {
    return totals.debit - totals.credit;
  }

  return totals.credit - totals.debit;
}
