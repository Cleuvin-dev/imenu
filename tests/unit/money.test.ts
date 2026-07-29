import { describe, expect, it } from "vitest";
import { formatMoney, multiplyCents, sumCents } from "@/lib/money";

describe("formatMoney", () => {
  it("formata centavos como moeda brasileira", () => {
    expect(formatMoney(4890)).toBe("R$ 48,90");
    expect(formatMoney(0)).toBe("R$ 0,00");
    expect(formatMoney(100)).toBe("R$ 1,00");
  });

  it("rejeita valores não inteiros", () => {
    expect(() => formatMoney(48.9)).toThrow();
  });
});

describe("sumCents", () => {
  it("soma valores em centavos", () => {
    expect(sumCents([100, 250, 40])).toBe(390);
  });

  it("rejeita valores negativos", () => {
    expect(() => sumCents([100, -1])).toThrow();
  });
});

describe("multiplyCents", () => {
  it("multiplica preço unitário pela quantidade", () => {
    expect(multiplyCents(2490, 2)).toBe(4980);
  });

  it("rejeita quantidade fracionária", () => {
    expect(() => multiplyCents(2490, 1.5)).toThrow();
  });
});
