// Display formatting only. All detection, normalization and savings calculations are server-side decimal.
export const money = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
export const date = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value.length === 10 ? `${value}T12:00:00` : value),
  );
export const cadence = { monthly: 'mois', quarterly: 'trimestre', annual: 'an' };
