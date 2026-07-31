import { describe, expect, it } from "vitest";
import { boardColumnFor, ALL_BOARD_COLUMNS, DEFAULT_BOARD_COLUMNS } from "@/modules/operations/domain/board-columns";
import { minutesSince, urgencyForMinutes } from "@/modules/operations/domain/order-urgency";
import { findUnseenPendingOrderIds } from "@/modules/operations/domain/new-order-alerts";

describe("boardColumnFor", () => {
  it("agrupa pending como novo", () => {
    expect(boardColumnFor("pending")).toBe("new");
  });

  it("agrupa accepted e preparing como em preparo", () => {
    expect(boardColumnFor("accepted")).toBe("preparing");
    expect(boardColumnFor("preparing")).toBe("preparing");
  });

  it("agrupa ready como pronto", () => {
    expect(boardColumnFor("ready")).toBe("ready");
  });

  it("agrupa delivered como finalizado", () => {
    expect(boardColumnFor("delivered")).toBe("finished");
  });

  it("agrupa rejected e canceled como exceção", () => {
    expect(boardColumnFor("rejected")).toBe("exception");
    expect(boardColumnFor("canceled")).toBe("exception");
  });

  it("cobre todos os status do enum sem lançar", () => {
    const statuses = ["pending", "accepted", "preparing", "ready", "delivered", "rejected", "canceled"] as const;
    for (const status of statuses) {
      expect(ALL_BOARD_COLUMNS).toContain(boardColumnFor(status));
    }
  });

  it("o board padrão do KDS mostra só 3 colunas (docs/04 O-02)", () => {
    expect(DEFAULT_BOARD_COLUMNS).toEqual(["new", "preparing", "ready"]);
  });
});

describe("minutesSince / urgencyForMinutes", () => {
  it("calcula minutos decorridos arredondando para baixo", () => {
    const created = new Date("2026-01-01T10:00:00Z");
    const now = new Date("2026-01-01T10:07:30Z");
    expect(minutesSince(created.toISOString(), now)).toBe(7);
  });

  it("nunca retorna negativo mesmo com relógio ligeiramente adiantado", () => {
    const created = new Date("2026-01-01T10:00:05Z");
    const now = new Date("2026-01-01T10:00:00Z");
    expect(minutesSince(created.toISOString(), now)).toBe(0);
  });

  it("classifica urgência por faixa de minutos", () => {
    expect(urgencyForMinutes(0)).toBe("normal");
    expect(urgencyForMinutes(4)).toBe("normal");
    expect(urgencyForMinutes(5)).toBe("warning");
    expect(urgencyForMinutes(9)).toBe("warning");
    expect(urgencyForMinutes(10)).toBe("urgent");
    expect(urgencyForMinutes(30)).toBe("urgent");
  });
});

describe("findUnseenPendingOrderIds", () => {
  it("não alerta pedidos pending já vistos", () => {
    const orders = [{ id: "a", status: "pending" }];
    const seen = new Set(["a"]);
    expect(findUnseenPendingOrderIds(orders, seen)).toEqual([]);
  });

  it("alerta um pedido pending novo, não visto ainda", () => {
    const orders = [
      { id: "a", status: "pending" },
      { id: "b", status: "pending" },
    ];
    const seen = new Set(["a"]);
    expect(findUnseenPendingOrderIds(orders, seen)).toEqual(["b"]);
  });

  it("ignora pedidos que não estão mais pending, mesmo não vistos", () => {
    const orders = [{ id: "a", status: "accepted" }];
    const seen = new Set<string>();
    expect(findUnseenPendingOrderIds(orders, seen)).toEqual([]);
  });
});
