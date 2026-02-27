import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ActivityEntry {
  value: string;
  faixa: string;
  berma: string;
}

interface ExtraActivityEntriesProps {
  activityKey: string;
  entries: ActivityEntry[];
  onAdd: (key: string) => void;
  onUpdate: (key: string, index: number, field: keyof ActivityEntry, val: string) => void;
  onRemove: (key: string, index: number) => void;
  faixaOptions: { value: string; label: string }[];
  bermaOptions: { value: string; label: string }[];
  inputType?: string;
  step?: string;
  unit?: string;
}

export function ExtraActivityEntries({
  activityKey,
  entries,
  onAdd,
  onUpdate,
  onRemove,
  faixaOptions,
  bermaOptions,
  inputType = "number",
  step = "1",
}: ExtraActivityEntriesProps) {
  return (
    <>
      {entries.map((entry, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_auto] gap-3 items-end mt-2">
          <Input
            type={inputType}
            min="0"
            step={step}
            value={entry.value}
            onChange={(e) => onUpdate(activityKey, index, "value", e.target.value)}
            placeholder="0"
          />
          <Select value={entry.faixa} onValueChange={(v) => onUpdate(activityKey, index, "faixa", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Faixa" />
            </SelectTrigger>
            <SelectContent>
              {faixaOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entry.berma} onValueChange={(v) => onUpdate(activityKey, index, "berma", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Berma" />
            </SelectTrigger>
            <SelectContent>
              {bermaOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(activityKey, index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </>
  );
}

export function AddMoreButton({ activityKey, onAdd }: { activityKey: string; onAdd: (key: string) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onAdd(activityKey)}
      className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
    >
      <Plus className="h-3 w-3" />
    </Button>
  );
}
