/**
 * Phase 8F.1 — bank export abstraction.
 *
 * A payment run never talks to a bank directly. It hands a payload to an
 * adapter, which renders a file (or describes an API submission). Adding a new
 * channel means registering another adapter here — no lifecycle code changes.
 *
 * Adapters are pure: same payload in, same bytes out, so an export can be
 * hashed, stored and re-verified. They read amounts that were given to them;
 * they never derive or invent a value.
 */

import type { ExportFormat } from "./schemas";

export type PaymentExportInstruction = {
  instructionId: string;
  documentNumber: string | null;
  counterpartyName: string | null;
  iban: string | null;
  currency: string;
  amount: number;
  dueDate: string | null;
  reference: string | null;
  method: string;
};

export type PaymentExportPayload = {
  runReference: string;
  runTitle: string;
  companyName: string;
  executionDate: string;
  instructions: PaymentExportInstruction[];
};

export type PaymentExportResult = {
  format: ExportFormat;
  fileName: string;
  mimeType: string;
  content: string;
  contentHash: string;
  instructionCount: number;
  total: number;
};

export type PaymentExportAdapter = {
  format: ExportFormat;
  label: string;
  /** Renders the payload. Returns the file body and a stable content hash. */
  generateExport: (payload: PaymentExportPayload) => PaymentExportResult;
};

/* ------------------------------------------------------------------ utils */

/** FNV-1a — deterministic, dependency-free, enough to detect a changed file. */
export function contentHash(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const total = (rows: PaymentExportInstruction[]) =>
  Math.round(rows.reduce((sum, r) => sum + Number(r.amount || 0), 0) * 100) / 100;

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "payment-run";

const xmlEscape = (value: string | null) =>
  (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const csvCell = (value: string | number | null) => {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/* --------------------------------------------------------------- adapters */

const sepaAdapter: PaymentExportAdapter = {
  format: "sepa_xml",
  label: "SEPA credit transfer (XML)",
  generateExport: (payload) => {
    const rows = payload.instructions;
    const sum = total(rows);
    const currency = rows[0]?.currency ?? "EUR";
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">',
      "  <CstmrCdtTrfInitn>",
      "    <GrpHdr>",
      `      <MsgId>${xmlEscape(payload.runReference)}</MsgId>`,
      `      <CreDtTm>${payload.executionDate}T00:00:00</CreDtTm>`,
      `      <NbOfTxs>${rows.length}</NbOfTxs>`,
      `      <CtrlSum>${money(sum)}</CtrlSum>`,
      `      <InitgPty><Nm>${xmlEscape(payload.companyName)}</Nm></InitgPty>`,
      "    </GrpHdr>",
      "    <PmtInf>",
      `      <PmtInfId>${xmlEscape(payload.runReference)}</PmtInfId>`,
      "      <PmtMtd>TRF</PmtMtd>",
      `      <ReqdExctnDt>${payload.executionDate}</ReqdExctnDt>`,
      ...rows.flatMap((r) => [
        "      <CdtTrfTxInf>",
        `        <PmtId><EndToEndId>${xmlEscape(r.reference ?? r.documentNumber ?? r.instructionId)}</EndToEndId></PmtId>`,
        `        <Amt><InstdAmt Ccy="${xmlEscape(r.currency || currency)}">${money(r.amount)}</InstdAmt></Amt>`,
        `        <Cdtr><Nm>${xmlEscape(r.counterpartyName ?? "Unnamed supplier")}</Nm></Cdtr>`,
        `        <CdtrAcct><Id><IBAN>${xmlEscape(r.iban ?? "")}</IBAN></Id></CdtrAcct>`,
        `        <RmtInf><Ustrd>${xmlEscape(r.documentNumber ?? "")}</Ustrd></RmtInf>`,
        "      </CdtTrfTxInf>",
      ]),
      "    </PmtInf>",
      "  </CstmrCdtTrfInitn>",
      "</Document>",
    ].join("\n");

    return {
      format: "sepa_xml",
      fileName: `${slug(payload.runReference)}.xml`,
      mimeType: "application/xml",
      content: body,
      contentHash: contentHash(body),
      instructionCount: rows.length,
      total: sum,
    };
  },
};

const csvAdapter: PaymentExportAdapter = {
  format: "csv",
  label: "Bank CSV",
  generateExport: (payload) => {
    const rows = payload.instructions;
    const header = [
      "execution_date",
      "beneficiary",
      "iban",
      "currency",
      "amount",
      "reference",
      "document",
      "method",
    ];
    const body = [
      header.join(","),
      ...rows.map((r) =>
        [
          payload.executionDate,
          r.counterpartyName ?? "",
          r.iban ?? "",
          r.currency,
          money(r.amount),
          r.reference ?? r.documentNumber ?? "",
          r.documentNumber ?? "",
          r.method,
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\n");

    return {
      format: "csv",
      fileName: `${slug(payload.runReference)}.csv`,
      mimeType: "text/csv",
      content: body,
      contentHash: contentHash(body),
      instructionCount: rows.length,
      total: total(rows),
    };
  },
};

/**
 * Provider API channel. The run still produces a deterministic envelope so the
 * submission can be recorded and replayed; sending it is the provider
 * integration's job, not the payment run's.
 */
const apiAdapter: PaymentExportAdapter = {
  format: "api",
  label: "Banking provider API",
  generateExport: (payload) => {
    const rows = payload.instructions;
    const envelope = {
      reference: payload.runReference,
      title: payload.runTitle,
      execution_date: payload.executionDate,
      instructions: rows.map((r) => ({
        instruction_id: r.instructionId,
        beneficiary: r.counterpartyName,
        iban: r.iban,
        currency: r.currency,
        amount: money(r.amount),
        reference: r.reference ?? r.documentNumber,
        method: r.method,
      })),
    };
    const body = JSON.stringify(envelope, null, 2);
    return {
      format: "api",
      fileName: `${slug(payload.runReference)}.json`,
      mimeType: "application/json",
      content: body,
      contentHash: contentHash(body),
      instructionCount: rows.length,
      total: total(rows),
    };
  },
};

export const EXPORT_ADAPTERS: Record<ExportFormat, PaymentExportAdapter> = {
  sepa_xml: sepaAdapter,
  csv: csvAdapter,
  api: apiAdapter,
};

export function generateExport(
  format: ExportFormat,
  payload: PaymentExportPayload,
): PaymentExportResult {
  const adapter = EXPORT_ADAPTERS[format];
  if (!adapter) throw new Error(`No export adapter for ${format}`);
  if (payload.instructions.length === 0) {
    throw new Error("There is nothing to export in this payment run");
  }
  return adapter.generateExport(payload);
}
