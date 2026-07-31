import { describe, expect, it } from "vitest";
import { allowedBillRequestTransitionsFor } from "@/modules/service-session/domain/bill-request-transitions";
import {
  BILL_REQUEST_STATUS_LABELS,
  PUBLIC_BILL_REQUEST_STATUS_LABELS,
  BILL_REQUEST_ACTION_LABELS,
} from "@/modules/service-session/domain/bill-request-labels";

const ALL_STATUSES = ["requested", "acknowledged", "bill_delivered", "closed", "canceled"] as const;

describe("allowedBillRequestTransitionsFor", () => {
  it("cashier pode reconhecer uma solicitação recém-feita", () => {
    const rules = allowedBillRequestTransitionsFor("requested", "cashier");
    expect(rules.map((r) => r.to)).toEqual(expect.arrayContaining(["acknowledged", "canceled"]));
  });

  it("kitchen não pode agir em nenhuma transição (só leitura, docs/02 §3)", () => {
    expect(allowedBillRequestTransitionsFor("requested", "kitchen")).toEqual([]);
    expect(allowedBillRequestTransitionsFor("acknowledged", "kitchen")).toEqual([]);
  });

  it("viewer não pode agir em nenhuma transição", () => {
    expect(allowedBillRequestTransitionsFor("requested", "viewer")).toEqual([]);
  });

  it("cancelar exige motivo; reconhecer/entregar não exigem", () => {
    const fromRequested = allowedBillRequestTransitionsFor("requested", "owner");
    const acknowledge = fromRequested.find((r) => r.to === "acknowledged");
    const cancel = fromRequested.find((r) => r.to === "canceled");
    expect(acknowledge?.requiresReason).toBe(false);
    expect(cancel?.requiresReason).toBe(true);
  });

  it("bill_delivered não tem transições próprias — fechar sessão é ação separada", () => {
    expect(allowedBillRequestTransitionsFor("bill_delivered", "owner")).toEqual([]);
  });

  it("estados terminais (closed/canceled) não têm transições", () => {
    expect(allowedBillRequestTransitionsFor("closed", "owner")).toEqual([]);
    expect(allowedBillRequestTransitionsFor("canceled", "owner")).toEqual([]);
  });
});

describe("rótulos de status da solicitação de conta", () => {
  it("cobre todos os status em ambos os conjuntos de rótulo", () => {
    for (const status of ALL_STATUSES) {
      expect(BILL_REQUEST_STATUS_LABELS[status]).toBeTruthy();
      expect(PUBLIC_BILL_REQUEST_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("rótulo de ação é um verbo, diferente do nome do status (lição de D-029)", () => {
    expect(BILL_REQUEST_ACTION_LABELS.acknowledged).not.toBe(BILL_REQUEST_STATUS_LABELS.acknowledged);
    expect(BILL_REQUEST_ACTION_LABELS.bill_delivered).not.toBe(BILL_REQUEST_STATUS_LABELS.bill_delivered);
  });
});
