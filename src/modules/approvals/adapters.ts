/**
 * Phase 8C — domain adapters for the generic approval engine.
 *
 * The engine knows a `target_type` string and an immutable snapshot; it never
 * knows what a commitment is. Domain meaning — the human label and the link
 * back to the owning screen — is supplied here, behind a typed adapter.
 *
 * Fail-closed: a target type with no registered adapter renders no navigation
 * and no domain affordance. The approval still works; the shortcut simply is
 * not offered.
 */

export type ApprovalDomainLink = {
  /** TanStack route path, kept as a plain string so the module stays generic. */
  to: string;
  params?: Record<string, string>;
  label: string;
};

export type ApprovalDomainAdapter = {
  targetType: string;
  label: string;
  /** Returns null when the domain cannot address this record. */
  link: (targetId: string) => ApprovalDomainLink | null;
  /** Optional read-only summary lines pulled from the immutable snapshot. */
  snapshotFields?: { key: string; label: string }[];
};

export type ApprovalDomainRegistry = Readonly<Record<string, ApprovalDomainAdapter>>;

const commitment: ApprovalDomainAdapter = {
  targetType: "commitment",
  label: "Commitment",
  link: (targetId) => ({
    to: "/commitments/$commitmentId",
    params: { commitmentId: targetId },
    label: "Open commitment",
  }),
  snapshotFields: [
    { key: "title", label: "Title" },
    { key: "code", label: "Code" },
    { key: "commitment_type", label: "Type" },
    { key: "currency", label: "Currency" },
    { key: "authorised_amount", label: "Authorised amount" },
  ],
};

const commitmentVariance: ApprovalDomainAdapter = {
  targetType: "commitment_variance",
  label: "Commitment variance",
  link: () => null,
  snapshotFields: [
    { key: "commitment_id", label: "Commitment" },
    { key: "version_no", label: "Schedule version" },
    { key: "variance_amount", label: "Variance" },
  ],
};

export const defaultApprovalDomains: ApprovalDomainRegistry = Object.freeze({
  commitment,
  commitment_variance: commitmentVariance,
});

/** Fails closed: unknown target types resolve to `null`, not to a guess. */
export function domainAdapterFor(
  registry: ApprovalDomainRegistry | undefined,
  targetType: string | null | undefined,
): ApprovalDomainAdapter | null {
  if (!registry || !targetType) return null;
  return registry[targetType] ?? null;
}

export function domainLinkFor(
  registry: ApprovalDomainRegistry | undefined,
  targetType: string | null | undefined,
  targetId: string | null | undefined,
): ApprovalDomainLink | null {
  const adapter = domainAdapterFor(registry, targetType);
  if (!adapter || !targetId) return null;
  return adapter.link(targetId);
}
