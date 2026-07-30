import { describe, expect, it } from "vitest";
import { computeOrderPayloadHash } from "@/modules/ordering/domain/payload-hash";
import { ORDER_TRANSITIONS, allowedTransitionsFor } from "@/modules/ordering/domain/transitions";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/modules/ordering/domain/order-status-labels";
import { checkRateLimitInMemory } from "@/lib/rate-limit/memory";

describe("computeOrderPayloadHash", () => {
  const baseInput = {
    tableToken: "token-1",
    items: [
      { productId: "11111111-1111-1111-1111-111111111111", quantity: 2, selectedOptionIds: ["a", "b"], notes: "" },
    ],
  };

  it("é determinístico para o mesmo pedido lógico", () => {
    const first = computeOrderPayloadHash(baseInput);
    const second = computeOrderPayloadHash(baseInput);
    expect(first).toBe(second);
  });

  it("ignora a ordem em que as opções foram selecionadas", () => {
    const reordered = {
      ...baseInput,
      items: [{ ...baseInput.items[0], selectedOptionIds: ["b", "a"] }],
    };
    expect(computeOrderPayloadHash(baseInput)).toBe(computeOrderPayloadHash(reordered));
  });

  it("ignora a ordem em que os itens foram montados no carrinho", () => {
    const secondItem = {
      productId: "22222222-2222-2222-2222-222222222222",
      quantity: 1,
      selectedOptionIds: [] as string[],
      notes: "",
    };
    const inputA = { tableToken: "token-1", items: [baseInput.items[0], secondItem] };
    const inputB = { tableToken: "token-1", items: [secondItem, baseInput.items[0]] };
    expect(computeOrderPayloadHash(inputA)).toBe(computeOrderPayloadHash(inputB));
  });

  it("gera hashes diferentes quando o conteúdo do pedido muda (AC-ORD-006)", () => {
    const differentQuantity = { ...baseInput, items: [{ ...baseInput.items[0], quantity: 3 }] };
    const differentOptions = { ...baseInput, items: [{ ...baseInput.items[0], selectedOptionIds: ["a"] }] };
    const differentTable = { ...baseInput, tableToken: "token-2" };

    const original = computeOrderPayloadHash(baseInput);
    expect(computeOrderPayloadHash(differentQuantity)).not.toBe(original);
    expect(computeOrderPayloadHash(differentOptions)).not.toBe(original);
    expect(computeOrderPayloadHash(differentTable)).not.toBe(original);
  });
});

describe("ORDER_TRANSITIONS", () => {
  const ALL_STATUSES: OrderStatus[] = [
    "pending",
    "accepted",
    "preparing",
    "ready",
    "delivered",
    "rejected",
    "canceled",
  ];

  it("cobre todos os status do enum", () => {
    for (const status of ALL_STATUSES) {
      expect(ORDER_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("estados terminais não têm transição de saída", () => {
    expect(ORDER_TRANSITIONS.delivered).toHaveLength(0);
    expect(ORDER_TRANSITIONS.rejected).toHaveLength(0);
    expect(ORDER_TRANSITIONS.canceled).toHaveLength(0);
  });

  it("nunca permite pular direto de pending para ready (AC-ORD-007)", () => {
    const directJump = ORDER_TRANSITIONS.pending.find((rule) => rule.to === "ready");
    expect(directJump).toBeUndefined();
  });

  it("exige motivo só nas transições de rejeição/cancelamento", () => {
    for (const rules of Object.values(ORDER_TRANSITIONS)) {
      for (const rule of rules) {
        const shouldRequireReason = rule.to === "rejected" || rule.to === "canceled";
        expect(rule.requiresReason).toBe(shouldRequireReason);
      }
    }
  });

  it("kitchen pode aceitar mas não pode cancelar (docs/05 §3)", () => {
    expect(allowedTransitionsFor("pending", "kitchen").some((rule) => rule.to === "accepted")).toBe(true);
    expect(allowedTransitionsFor("pending", "kitchen").some((rule) => rule.to === "canceled")).toBe(false);
  });

  it("menu_editor não tem nenhuma transição permitida", () => {
    for (const status of ALL_STATUSES) {
      expect(allowedTransitionsFor(status, "menu_editor")).toHaveLength(0);
    }
  });

  it("só cashier/manager/owner entregam o pedido", () => {
    const rule = ORDER_TRANSITIONS.ready.find((r) => r.to === "delivered");
    expect(rule?.allowedRoles).toEqual(["cashier", "manager", "owner"]);
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("tem rótulo em português para todos os status", () => {
    const statuses: OrderStatus[] = [
      "pending",
      "accepted",
      "preparing",
      "ready",
      "delivered",
      "rejected",
      "canceled",
    ];
    for (const status of statuses) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

describe("checkRateLimitInMemory", () => {
  it("permite requisições dentro do limite e bloqueia acima dele", () => {
    const key = `test:${crypto.randomUUID()}`;
    const now = Date.now();

    for (let i = 0; i < 10; i += 1) {
      expect(checkRateLimitInMemory(key, 10, 300, now).allowed).toBe(true);
    }

    const blocked = checkRateLimitInMemory(key, 10, 300, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("libera novamente após a janela expirar", () => {
    const key = `test:${crypto.randomUUID()}`;
    const now = Date.now();

    checkRateLimitInMemory(key, 1, 60, now);
    expect(checkRateLimitInMemory(key, 1, 60, now).allowed).toBe(false);
    expect(checkRateLimitInMemory(key, 1, 60, now + 61_000).allowed).toBe(true);
  });
});
