import { describe, expect, it } from "vitest";

import {
  bankClassificationRuleSchema,
  cancelDocumentSchema,
  classificationSchema,
  computeDocumentTotals,
  computeLine,
  counterpartySchema,
  documentLineSchema,
  financialDocumentSchema,
  isValidNif,
  periodSchema,
  PT_VAT_PRESETS,
  reversePaymentSchema,
  round2,
  settlementSchema,
  SOURCE_TYPES,
} from "@/packages/bookkeeping-core/schemas";

const COMPANY = "11111111-1111-4111-8111-111111111111";

describe("line and header calculations", () => {
  it("computes net, VAT and gross per line", () => {
    expect(computeLine({ quantity: 3, unitPrice: 100, vatRate: 23 })).toEqual({
      net: 300,
      vat: 69,
      gross: 369,
    });
  });

  it("applies the discount before VAT", () => {
    expect(computeLine({ quantity: 2, unitPrice: 250, discountPct: 10, vatRate: 6 })).toEqual({
      net: 450,
      vat: 27,
      gross: 477,
    });
  });

  it("rounds to cents at each step, never accumulating drift", () => {
    const line = computeLine({ quantity: 3, unitPrice: 33.333, vatRate: 23 });
    expect(line.net).toBe(100);
    expect(line.vat).toBe(23);
    expect(round2(0.145)).toBe(0.15);
  });

  it("sums a multi-rate document and applies withholding on the net", () => {
    const totals = computeDocumentTotals(
      [
        { quantity: 1, unitPrice: 1000, vatRate: 23 },
        { quantity: 2, unitPrice: 50, vatRate: 6 },
      ],
      25,
    );
    expect(totals).toEqual({
      net: 1100,
      vat: 236,
      gross: 1336,
      withholding: 275,
      payable: 1061,
    });
  });

  it("treats zero-rated lines as zero VAT", () => {
    const totals = computeDocumentTotals([{ quantity: 1, unitPrice: 500, vatRate: 0 }]);
    expect(totals.vat).toBe(0);
    expect(totals.gross).toBe(500);
    expect(totals.payable).toBe(500);
  });
});

describe("PT VAT presets and fiscal metadata", () => {
  it("exposes the four Portuguese mainland rates as data", () => {
    expect(PT_VAT_PRESETS.map((p) => p.code)).toEqual(["NOR", "INT", "RED", "ISE"]);
    expect(PT_VAT_PRESETS.map((p) => p.rate)).toEqual([23, 13, 6, 0]);
  });

  it("keeps ATCUD, series, number and tax period on the document contract", () => {
    const parsed = financialDocumentSchema.parse({
      companyId: COMPANY,
      direction: "inbound",
      issueDate: "2026-02-01",
      series: "A",
      documentNumber: "2026/1",
      atcud: "JFT7C4KZ-1",
      taxPeriod: "2026-Q1",
      withholdingRate: 25,
      lines: [],
    });
    expect(parsed.atcud).toBe("JFT7C4KZ-1");
    expect(parsed.taxPeriod).toBe("2026-Q1");
    expect(parsed.currency).toBe("EUR");
    expect(parsed.docType).toBe("invoice");
  });

  it("rejects malformed issue dates", () => {
    expect(
      financialDocumentSchema.safeParse({
        companyId: COMPANY,
        direction: "inbound",
        issueDate: "01/02/2026",
      }).success,
    ).toBe(false);
  });
});

describe("NIF validation", () => {
  it("accepts valid Portuguese checksums", () => {
    for (const nif of ["501442600", "501 442 600", "980405319"]) {
      expect(isValidNif(nif)).toBe(true);
    }
  });

  it("rejects wrong checksums, wrong lengths and non-numeric input", () => {
    for (const nif of ["501442601", "12345678", "1234567890", "abcdefghi", ""]) {
      expect(isValidNif(nif)).toBe(false);
    }
  });
});

describe("zod contracts", () => {
  it("requires a counterparty name and defaults role, country and currency", () => {
    expect(counterpartySchema.safeParse({ companyId: COMPANY, name: "  " }).success).toBe(false);
    const cp = counterpartySchema.parse({ companyId: COMPANY, name: "Rioja Lda" });
    expect(cp).toMatchObject({ counterpartyType: "supplier", countryCode: "PT", currency: "EUR" });
  });

  it("accepts supplier, client and both", () => {
    for (const t of ["supplier", "client", "both"] as const) {
      expect(
        counterpartySchema.parse({ companyId: COMPANY, name: "X", counterpartyType: t })
          .counterpartyType,
      ).toBe(t);
    }
    expect(
      counterpartySchema.safeParse({ companyId: COMPANY, name: "X", counterpartyType: "vendor" })
        .success,
    ).toBe(false);
  });

  it("bounds line discount and VAT rate to 0–100", () => {
    expect(documentLineSchema.safeParse({ lineNo: 1, discountPct: 120 }).success).toBe(false);
    expect(documentLineSchema.safeParse({ lineNo: 1, vatRate: 230 }).success).toBe(false);
    expect(documentLineSchema.parse({ lineNo: 1 })).toMatchObject({
      quantity: 1,
      unitPrice: 0,
      vatRecoverable: true,
    });
  });

  it("makes cancellation and reversal reasons mandatory", () => {
    const id = COMPANY;
    expect(cancelDocumentSchema.safeParse({ id, reason: "" }).success).toBe(false);
    expect(cancelDocumentSchema.safeParse({ id, reason: "no" }).success).toBe(false);
    expect(cancelDocumentSchema.safeParse({ id, reason: "duplicate entry" }).success).toBe(true);
    expect(reversePaymentSchema.safeParse({ paymentId: id, reason: "  " }).success).toBe(false);
    expect(reversePaymentSchema.safeParse({ paymentId: id, reason: "wrong bank line" }).success).toBe(
      true,
    );
  });

  it("refuses a zero settlement amount and allows negative corrections", () => {
    const base = { documentId: COMPANY, paymentDate: "2026-02-01" };
    expect(settlementSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(settlementSchema.safeParse({ ...base, amount: -50 }).success).toBe(true);
  });

  it("keeps the classification, rule and period contracts stable", () => {
    expect(
      classificationSchema.parse({ companyId: COMPANY, code: "6.2", nameEn: "Insurance" }),
    ).toMatchObject({ level: 1, nature: "expense", affectsCashFlow: true, sortOrder: 100 });
    expect(
      bankClassificationRuleSchema.parse({ companyId: COMPANY, name: "EDP", matchValue: "EDP" }),
    ).toMatchObject({ priority: 100, matchField: "description", matchType: "contains" });
    expect(
      periodSchema.parse({
        companyId: COMPANY,
        code: "2026-Q1",
        periodStart: "2026-01-01",
        periodEnd: "2026-03-31",
      }).periodType,
    ).toBe("quarter");
  });

  it("freezes the cross-module source-link vocabulary", () => {
    expect(SOURCE_TYPES).toContain("financial_document");
    expect(SOURCE_TYPES).toContain("bank_transaction");
    expect(SOURCE_TYPES).toContain("cash_flow_entry");
    expect(new Set(SOURCE_TYPES).size).toBe(SOURCE_TYPES.length);
  });
});
