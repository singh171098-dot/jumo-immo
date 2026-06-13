const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

const pricePerM2Formatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

export function formatPricePerM2(value: number): string {
  return `${pricePerM2Formatter.format(Math.round(value))} €/m²`;
}
