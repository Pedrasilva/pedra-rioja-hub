/**
 * Phase 8F.3 — open a due-diligence case against an opportunity.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDiligenceTemplates } from "@/modules/diligence/queries";
import type { DiligenceActions } from "@/modules/diligence/server";

export function DiligenceCaseDialog({
  companyId,
  opportunityId,
  actions,
  disabled,
  onCreated,
}: {
  companyId: string | undefined;
  opportunityId: string;
  actions: DiligenceActions;
  disabled?: boolean;
  onCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("none");
  const [targetDate, setTargetDate] = useState("");
  const { data: templates = [] } = useDiligenceTemplates(companyId);

  async function submit() {
    const outcome = await actions.run("createCase", {
      opportunityId,
      title: title.trim() || null,
      templateId: templateId === "none" ? null : templateId,
      targetDate: targetDate || null,
    });
    if (!outcome) return;
    setOpen(false);
    setTitle("");
    setTargetDate("");
    const id = (outcome.result as { id?: string } | null)?.id;
    if (id) onCreated?.(id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Open due diligence</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a due-diligence case</DialogTitle>
          <DialogDescription>
            A checklist, not a decision. The case records findings; the recommendation at the end is
            what a closing may later rely on.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dd-title">Title</Label>
            <Input
              id="dd-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to the opportunity title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dd-template">Checklist template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="dd-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Start empty</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dd-target">Target completion date</Label>
            <Input
              id="dd-target"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={actions.isPending}>
            Open case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
