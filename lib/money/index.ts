/**
 * Dinheiro sempre em centavos inteiros (integer). Nunca usar float/double
 * para cálculo monetário. Ver docs/06_ARQUITETURA_TECNICA.md.
 */

export function isValidCents(value: number): value is number {
  return Number.isInteger(value) && value >= 0;
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => {
    if (!isValidCents(value)) {
      throw new Error(`Valor monetário inválido: ${value}`);
    }
    return total + value;
  }, 0);
}

export function multiplyCents(unitCents: number, quantity: number): number {
  if (!isValidCents(unitCents)) {
    throw new Error(`Valor monetário inválido: ${unitCents}`);
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`Quantidade inválida: ${quantity}`);
  }
  return unitCents * quantity;
}

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata centavos inteiros como moeda brasileira, ex.: 4890 -> "R$ 48,90". */
export function formatMoney(cents: number, currency: string = "BRL"): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`Valor monetário inválido: ${cents}`);
  }
  if (currency !== "BRL") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
  }
  return BRL_FORMATTER.format(cents / 100);
}
