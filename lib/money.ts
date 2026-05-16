export function formatMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export function parsePence(input: string): number {
  return Math.round(parseFloat(input.replace(/[^0-9.]/g, "")) * 100) || 0;
}
