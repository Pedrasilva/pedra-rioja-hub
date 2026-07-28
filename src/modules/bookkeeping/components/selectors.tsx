import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const NONE = "__none__";

/** Extractable core — generic option select used by every bookkeeping form. */
export function OptionSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowNone = true,
  noneLabel = "None",
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Select
      value={value ?? (allowNone ? NONE : undefined)}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone ? <SelectItem value={NONE}>{noneLabel}</SelectItem> : null}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function classificationLabel(c: {
  code: string;
  name_en: string;
  company_id: string | null;
}) {
  return `${c.code} · ${c.name_en}${c.company_id ? "" : " (shared)"}`;
}
