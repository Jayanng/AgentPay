export function toCentsStr(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function normalizePriceString(price: any): string {
  const priceVal = price;
  const priceStr =
    typeof priceVal === "number"
      ? priceVal.toFixed(2)
      : typeof priceVal === "string"
      ? priceVal
      : "0.00";
  return priceStr;
}
