import { Button } from "@/components/ui/button";
import * as React from "react";

type Props = {
  open: boolean;
  onGoBack: () => void;
  onContinue: () => void;
  onSaveNow: () => void | Promise<void>;
};

export function UnsavedChangesDialog({
  open,
  onGoBack,
  onContinue,
  onSaveNow,
}: Props) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="fixed left-1/2 top-1/2 z-50 max-h-[min(90dvh,32rem)] w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-0 text-[var(--color-ink)] shadow-lg open:flex open:flex-col [&::backdrop]:bg-stone-900/50"
      onClose={onGoBack}
    >
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold">Unsaved changes</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Your recipe has been edited. Loading another recipe or starting new
          will replace the editor contents.
        </p>
      </div>
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onGoBack}>
          Go back
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onSaveNow}>
          Save now
        </Button>
        <Button type="button" size="sm" variant="default" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </dialog>
  );
}
