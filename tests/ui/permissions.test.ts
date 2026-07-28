import { describe, expect, it } from "vitest";

import {
  capabilitiesFor,
  MANAGE_ROLES,
  RECORD_ROLES,
  VIEW_ROLES,
  type BookkeepingRole,
} from "@/modules/bookkeeping/host/roles";

const ALL_ROLES: BookkeepingRole[] = [
  "owner",
  "manager",
  "bookkeeper",
  "assistant",
  "approver",
  "viewer",
];

describe("six-role capability adapter", () => {
  it("mirrors the canonical database predicates", () => {
    for (const role of ALL_ROLES) {
      const caps = capabilitiesFor([role]);
      expect(caps.canView).toBe(VIEW_ROLES.includes(role));
      expect(caps.canRecord).toBe(RECORD_ROLES.includes(role));
      expect(caps.canManage).toBe(MANAGE_ROLES.includes(role));
    }
  });

  it("gives owner and manager the full surface", () => {
    for (const role of MANAGE_ROLES) {
      const caps = capabilitiesFor([role]);
      expect(Object.values(caps).every(Boolean)).toBe(true);
    }
  });

  it("lets bookkeeper and assistant record but never post, cancel or reverse", () => {
    for (const role of ["bookkeeper", "assistant"] as const) {
      const caps = capabilitiesFor([role]);
      expect(caps.canCreateDraft).toBe(true);
      expect(caps.canEditDraft).toBe(true);
      expect(caps.canRecordPayment).toBe(true);
      expect(caps.canPost).toBe(false);
      expect(caps.canCancel).toBe(false);
      expect(caps.canReversePayment).toBe(false);
      expect(caps.canManageClassifications).toBe(false);
      expect(caps.canManageRules).toBe(false);
      expect(caps.canRecomputePeriods).toBe(false);
      expect(caps.canCreateLedgerItem).toBe(false);
    }
  });

  it("keeps approver and viewer strictly read-only", () => {
    for (const role of ["approver", "viewer"] as const) {
      const caps = capabilitiesFor([role]);
      expect(caps.canView).toBe(true);
      const { canView: _ignored, ...rest } = caps;
      expect(Object.values(rest).some(Boolean)).toBe(false);
    }
  });

  it("fails closed for no roles, unknown roles and undefined", () => {
    for (const roles of [undefined, [], ["intern"], ["ADMIN"]]) {
      const caps = capabilitiesFor(roles as never);
      expect(Object.values(caps).some(Boolean)).toBe(false);
    }
  });

  it("takes the union when a user holds several roles", () => {
    const caps = capabilitiesFor(["viewer", "bookkeeper"]);
    expect(caps.canRecord).toBe(true);
    expect(caps.canManage).toBe(false);

    const escalated = capabilitiesFor(["viewer", "manager"]);
    expect(escalated.canManage).toBe(true);
  });
});
