/**
 * Phase 8B — the five register definitions.
 *
 * Each entry describes only what makes a register different: its columns, its
 * form fields and its status vocabulary. Everything structural — filtering,
 * archiving, commitment linking, derived money columns — is shared by
 * `RegisterPanel`, so a new operational domain is a definition, not a screen.
 */

import { formatDate } from "@/lib/format";
import { Countdown, OperationalBadge } from "./operational-badge";
import type { RegisterDef, RegisterRow } from "./register-panel";
import {
  INSURANCE_STATUSES,
  OBLIGATION_PRIORITIES,
  OBLIGATION_STATUSES,
  OBLIGATION_TYPES,
  POLICY_TYPES,
  RECURRENCE_FREQUENCIES,
  SERVICE_CONTRACT_STATUSES,
  SERVICE_TYPES,
  TAX_SCHEDULE_STATUSES,
  TAX_TYPES,
  UTILITY_STATUSES,
  UTILITY_TYPES,
  operationalLabel,
} from "@/modules/operations/schemas";

const str = (row: RegisterRow, key: string) => {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
};

const text = (row: RegisterRow, key: string) => {
  const value = str(row, key);
  return value === "" ? <span className="text-muted-foreground">—</span> : value;
};

const date = (row: RegisterRow, key: string) => {
  const value = str(row, key);
  return value ? formatDate(value) : <span className="text-muted-foreground">—</span>;
};

const titleCell = (row: RegisterRow) => (
  <div>
    <p className="font-medium">{row.title}</p>
    {row.code ? <p className="text-xs text-muted-foreground">{String(row.code)}</p> : null}
  </div>
);

const statusCell = (row: RegisterRow) => <OperationalBadge status={row.status} />;

/* ------------------------------------------------------------ obligations */

export const obligationRegister: RegisterDef = {
  entityType: "operational_obligation",
  idKey: "obligation_id",
  updateIdKey: "obligationId",
  title: "Obligations",
  description:
    "Every recurring or one-off duty the portfolio must meet, with the money held on its commitment.",
  addLabel: "New obligation",
  statuses: OBLIGATION_STATUSES,
  createAction: "createObligation",
  updateAction: "updateObligation",
  defaults: {
    title: "",
    obligationType: "other",
    priority: "medium",
    reminderLeadDays: "30",
    recurrenceFrequency: "none",
    recurrenceInterval: "1",
    status: "open",
  },
  columns: [
    { header: "Obligation", cell: titleCell },
    { header: "Type", cell: (r) => operationalLabel(str(r, "obligation_type")) },
    { header: "Priority", cell: (r) => <OperationalBadge status={str(r, "priority")} /> },
    { header: "Status", cell: statusCell },
    { header: "Due", cell: (r) => date(r, "due_date") },
    {
      header: "Countdown",
      cell: (r) => <Countdown days={r.days_until_due as number | null} />,
    },
    { header: "Property", cell: (r) => text(r, "property_name") },
  ],
  fields: [
    { name: "title", label: "Title", kind: "text", span: true },
    { name: "obligationType", label: "Obligation type", kind: "select", options: OBLIGATION_TYPES },
    { name: "priority", label: "Priority", kind: "select", options: OBLIGATION_PRIORITIES },
    { name: "dueDate", label: "Due date", kind: "date" },
    {
      name: "reminderLeadDays",
      label: "Reminder lead (days)",
      kind: "number",
      help: "How far ahead the reminder appears.",
    },
    {
      name: "recurrenceFrequency",
      label: "Recurrence",
      kind: "select",
      options: RECURRENCE_FREQUENCIES,
    },
    { name: "recurrenceInterval", label: "Every", kind: "number" },
    { name: "recurrenceEndDate", label: "Recurrence ends", kind: "date" },
    { name: "responsibleName", label: "Responsible", kind: "text" },
    { name: "counterpartyId", label: "Counterparty", kind: "counterparty" },
    { name: "propertyId", label: "Property", kind: "property" },
    { name: "code", label: "Reference", kind: "text", mode: "create" },
    { name: "description", label: "Description", kind: "textarea", span: true },
    { name: "notes", label: "Notes", kind: "textarea", span: true },
  ],
  toForm: (r) => ({
    title: str(r, "title"),
    obligationType: str(r, "obligation_type"),
    priority: str(r, "priority"),
    status: str(r, "status"),
    dueDate: str(r, "due_date"),
    reminderLeadDays: str(r, "reminder_lead_days"),
    recurrenceFrequency: str(r, "recurrence_frequency"),
    recurrenceInterval: str(r, "recurrence_interval"),
    recurrenceEndDate: str(r, "recurrence_end_date"),
    responsibleName: str(r, "responsible_name"),
    counterpartyId: str(r, "counterparty_id"),
    propertyId: str(r, "property_id"),
    description: str(r, "description"),
    notes: str(r, "notes"),
  }),
};

/* ------------------------------------------------------- service contracts */

export const serviceContractRegister: RegisterDef = {
  entityType: "service_contract",
  idKey: "contract_id",
  updateIdKey: "contractId",
  title: "Service contracts",
  description:
    "Cleaning, security, gardening and management agreements, with renewal notice tracked to the day.",
  addLabel: "New contract",
  statuses: SERVICE_CONTRACT_STATUSES,
  createAction: "createServiceContract",
  updateAction: "updateServiceContract",
  defaults: {
    title: "",
    serviceType: "other",
    reminderLeadDays: "60",
    autoRenew: "false",
    status: "draft",
  },
  columns: [
    { header: "Contract", cell: titleCell },
    { header: "Service", cell: (r) => operationalLabel(str(r, "service_type")) },
    { header: "Supplier", cell: (r) => text(r, "counterparty_name") },
    { header: "Status", cell: statusCell },
    { header: "Ends", cell: (r) => date(r, "end_date") },
    {
      header: "Notice",
      cell: (r) => <Countdown days={r.days_until_expiry as number | null} />,
    },
    { header: "Auto-renew", cell: (r) => (r.auto_renew ? "Yes" : "No") },
  ],
  fields: [
    { name: "title", label: "Title", kind: "text", span: true },
    { name: "serviceType", label: "Service type", kind: "select", options: SERVICE_TYPES },
    { name: "counterpartyId", label: "Supplier", kind: "counterparty" },
    { name: "contractNumber", label: "Contract number", kind: "text" },
    { name: "startDate", label: "Start date", kind: "date" },
    { name: "endDate", label: "End date", kind: "date" },
    { name: "noticePeriodDays", label: "Notice period (days)", kind: "number" },
    { name: "autoRenew", label: "Auto-renew", kind: "checkbox" },
    { name: "reminderLeadDays", label: "Reminder lead (days)", kind: "number" },
    { name: "obligationId", label: "Parent obligation", kind: "obligation" },
    { name: "propertyId", label: "Property", kind: "property", mode: "create" },
    { name: "code", label: "Reference", kind: "text", mode: "create" },
    { name: "renewalTerms", label: "Renewal terms", kind: "textarea", span: true },
    { name: "notes", label: "Notes", kind: "textarea", span: true },
  ],
  toForm: (r) => ({
    title: str(r, "title"),
    serviceType: str(r, "service_type"),
    status: str(r, "status"),
    counterpartyId: str(r, "counterparty_id"),
    contractNumber: str(r, "contract_number"),
    startDate: str(r, "start_date"),
    endDate: str(r, "end_date"),
    noticePeriodDays: str(r, "notice_period_days"),
    autoRenew: r.auto_renew ? "true" : "false",
    reminderLeadDays: str(r, "reminder_lead_days"),
    obligationId: str(r, "obligation_id"),
    renewalTerms: str(r, "renewal_terms"),
    notes: str(r, "notes"),
  }),
};

/* ------------------------------------------------------------- insurance */

export const insuranceRegister: RegisterDef = {
  entityType: "insurance_policy",
  idKey: "policy_id",
  updateIdKey: "policyId",
  title: "Insurance policies",
  description:
    "Cover across the portfolio with renewal countdowns. Premiums are authorised as commitments, never typed here.",
  addLabel: "New policy",
  statuses: INSURANCE_STATUSES,
  createAction: "createInsurancePolicy",
  updateAction: "updateInsurancePolicy",
  defaults: { title: "", policyType: "other", reminderLeadDays: "45", status: "draft" },
  columns: [
    { header: "Policy", cell: titleCell },
    { header: "Cover", cell: (r) => operationalLabel(str(r, "policy_type")) },
    { header: "Insurer", cell: (r) => text(r, "insurer_name") },
    { header: "Status", cell: statusCell },
    { header: "Expires", cell: (r) => date(r, "expiry_date") },
    {
      header: "Renewal",
      cell: (r) => <Countdown days={r.days_until_expiry as number | null} />,
    },
    { header: "Property", cell: (r) => text(r, "property_name") },
  ],
  fields: [
    { name: "title", label: "Title", kind: "text", span: true },
    { name: "policyType", label: "Cover type", kind: "select", options: POLICY_TYPES },
    { name: "policyNumber", label: "Policy number", kind: "text" },
    { name: "insurerCounterpartyId", label: "Insurer", kind: "counterparty" },
    { name: "insurerName", label: "Insurer name", kind: "text" },
    { name: "brokerCounterpartyId", label: "Broker", kind: "counterparty" },
    { name: "brokerName", label: "Broker name", kind: "text" },
    { name: "propertyId", label: "Property", kind: "property" },
    { name: "effectiveDate", label: "Effective from", kind: "date" },
    { name: "expiryDate", label: "Expires", kind: "date" },
    {
      name: "excessAmount",
      label: "Excess",
      kind: "number",
      help: "A policy term, not an expected cost.",
    },
    { name: "reminderLeadDays", label: "Reminder lead (days)", kind: "number" },
    { name: "obligationId", label: "Parent obligation", kind: "obligation" },
    { name: "code", label: "Reference", kind: "text", mode: "create" },
    { name: "insuredAssets", label: "Insured assets", kind: "textarea", span: true },
    { name: "notes", label: "Notes", kind: "textarea", span: true },
  ],
  toForm: (r) => ({
    title: str(r, "title"),
    policyType: str(r, "policy_type"),
    status: str(r, "status"),
    policyNumber: str(r, "policy_number"),
    insurerCounterpartyId: str(r, "insurer_counterparty_id"),
    insurerName: str(r, "insurer_name"),
    brokerCounterpartyId: str(r, "broker_counterparty_id"),
    brokerName: str(r, "broker_name"),
    propertyId: str(r, "property_id"),
    effectiveDate: str(r, "effective_date"),
    expiryDate: str(r, "expiry_date"),
    excessAmount: str(r, "excess_amount"),
    reminderLeadDays: str(r, "reminder_lead_days"),
    obligationId: str(r, "obligation_id"),
    insuredAssets: str(r, "insured_assets"),
    notes: str(r, "notes"),
  }),
};

/* ------------------------------------------------------------- utilities */

export const utilityRegister: RegisterDef = {
  entityType: "utility_contract",
  idKey: "contract_id",
  updateIdKey: "contractId",
  title: "Utility contracts",
  description:
    "Supply accounts per property and unit, so a bill can always be traced back to the meter it came from.",
  addLabel: "New utility",
  statuses: UTILITY_STATUSES,
  createAction: "createUtilityContract",
  updateAction: "updateUtilityContract",
  defaults: { title: "", utilityType: "other", reminderLeadDays: "30", status: "draft" },
  columns: [
    { header: "Account", cell: titleCell },
    { header: "Utility", cell: (r) => operationalLabel(str(r, "utility_type")) },
    { header: "Supplier", cell: (r) => text(r, "counterparty_name") },
    { header: "Status", cell: statusCell },
    { header: "Account no.", cell: (r) => text(r, "account_number") },
    { header: "Meter", cell: (r) => text(r, "meter_identifier") },
    { header: "Property", cell: (r) => text(r, "property_name") },
  ],
  fields: [
    { name: "title", label: "Title", kind: "text", span: true },
    { name: "utilityType", label: "Utility type", kind: "select", options: UTILITY_TYPES },
    { name: "counterpartyId", label: "Supplier", kind: "counterparty" },
    { name: "accountNumber", label: "Account number", kind: "text" },
    { name: "meterIdentifier", label: "Meter identifier", kind: "text" },
    { name: "propertyId", label: "Property", kind: "property" },
    { name: "activationDate", label: "Activated", kind: "date" },
    { name: "terminationDate", label: "Terminated", kind: "date" },
    { name: "reminderLeadDays", label: "Reminder lead (days)", kind: "number" },
    { name: "obligationId", label: "Parent obligation", kind: "obligation" },
    { name: "code", label: "Reference", kind: "text", mode: "create" },
    { name: "serviceAddress", label: "Service address", kind: "textarea", span: true },
    { name: "notes", label: "Notes", kind: "textarea", span: true },
  ],
  toForm: (r) => ({
    title: str(r, "title"),
    utilityType: str(r, "utility_type"),
    status: str(r, "status"),
    counterpartyId: str(r, "counterparty_id"),
    accountNumber: str(r, "account_number"),
    meterIdentifier: str(r, "meter_identifier"),
    propertyId: str(r, "property_id"),
    activationDate: str(r, "activation_date"),
    terminationDate: str(r, "termination_date"),
    reminderLeadDays: str(r, "reminder_lead_days"),
    obligationId: str(r, "obligation_id"),
    serviceAddress: str(r, "service_address"),
    notes: str(r, "notes"),
  }),
};

/* ---------------------------------------------------------- tax schedules */

export const taxRegister: RegisterDef = {
  entityType: "tax_schedule",
  idKey: "schedule_id",
  updateIdKey: "scheduleId",
  title: "Tax schedules",
  description:
    "IMI, AIMI and municipal charges with their instalment dates. Amounts arrive through the commitment.",
  addLabel: "New tax schedule",
  statuses: TAX_SCHEDULE_STATUSES,
  createAction: "createTaxSchedule",
  updateAction: "updateTaxSchedule",
  defaults: { title: "", taxType: "other", reminderLeadDays: "21", status: "draft" },
  columns: [
    { header: "Schedule", cell: titleCell },
    { header: "Tax", cell: (r) => operationalLabel(str(r, "tax_type")) },
    { header: "Year", cell: (r) => text(r, "tax_year") },
    { header: "Status", cell: statusCell },
    { header: "Instalments", align: "right", cell: (r) => String(r.scheduled_dates ?? 0) },
    { header: "Next due", cell: (r) => date(r, "next_due_date") },
    { header: "Property", cell: (r) => text(r, "property_name") },
  ],
  fields: [
    { name: "title", label: "Title", kind: "text", span: true },
    { name: "taxType", label: "Tax type", kind: "select", options: TAX_TYPES },
    { name: "taxYear", label: "Tax year", kind: "number" },
    { name: "jurisdiction", label: "Jurisdiction", kind: "text" },
    { name: "reference", label: "Reference", kind: "text" },
    { name: "propertyId", label: "Property", kind: "property" },
    { name: "reminderLeadDays", label: "Reminder lead (days)", kind: "number" },
    { name: "obligationId", label: "Parent obligation", kind: "obligation" },
    { name: "code", label: "Code", kind: "text", mode: "create" },
    { name: "notes", label: "Notes", kind: "textarea", span: true },
  ],
  toForm: (r) => ({
    title: str(r, "title"),
    taxType: str(r, "tax_type"),
    status: str(r, "status"),
    taxYear: str(r, "tax_year"),
    jurisdiction: str(r, "jurisdiction"),
    reference: str(r, "reference"),
    propertyId: str(r, "property_id"),
    reminderLeadDays: str(r, "reminder_lead_days"),
    obligationId: str(r, "obligation_id"),
    notes: str(r, "notes"),
  }),
};
