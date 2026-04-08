import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import * as React from "react";

type Props = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  summary?: string;
  children: React.ReactNode;
  className?: string;
};

export function CollapsibleSection({
  id,
  title,
  icon,
  defaultOpen = false,
  summary,
  children,
  className,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);
  const panelId = `${id}-panel`;

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border)]/80 bg-stone-50/40",
        className
      )}
    >
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left outline-none ring-offset-2 ring-offset-[var(--color-canvas)] transition-colors hover:bg-stone-100/80 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200 ease-out",
            !open && "-rotate-90"
          )}
          aria-hidden
        />
        {icon ? (
          <span className="flex size-4 shrink-0 items-center justify-center text-[var(--color-muted)] [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="text-sm font-medium text-[var(--color-ink)]">
            {title}
          </span>
          {!open && summary ? (
            <span className="mt-0.5 block truncate text-xs font-normal text-[var(--color-muted)]">
              {summary}
            </span>
          ) : null}
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div id={panelId} role="region" aria-labelledby={`${id}-trigger`} className="px-3 pb-3 pt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
