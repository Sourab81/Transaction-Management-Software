export const formatCustomerBalance = (balance: unknown) => {
  if (typeof balance === 'number' && Number.isFinite(balance)) {
    return String(balance);
  }

  if (typeof balance === 'string' && balance.trim()) {
    const numericBalance = Number(balance.trim());
    return Number.isFinite(numericBalance) ? String(numericBalance) : balance.trim();
  }

  return '0';
};

export const getCustomerBalanceClassName = (balance: unknown) => {
  const numericBalance = Number(formatCustomerBalance(balance));

  if (numericBalance < 0) return 'text-danger fw-semibold';
  if (numericBalance > 0) return 'text-success fw-semibold';
  return '';
};
