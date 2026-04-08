import { Button } from "@/components/ui/button";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical } from "lucide-react";

import { StepEditor } from "./StepEditor";
import type { StepRow } from "./step-row";

const springDrag = {
  type: "spring" as const,
  stiffness: 480,
  damping: 38,
  mass: 0.78,
};

type Props = {
  row: StepRow;
  index: number;
  onStepChange: (id: string, next: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  collapseAllSignal?: number;
  expandAllSignal?: number;
};

/**
 * Sortable row with a drag handle (Motion Reorder + spring drag feedback).
 * Styling is tuned for a calm, editorial feel similar to Chamaac-style motion.
 */
export function DraggableStepRow({
  row,
  index,
  onStepChange,
  onRemove,
  collapseAllSignal = 0,
  expandAllSignal = 0,
}: Props) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={row}
      as="div"
      dragListener={false}
      dragControls={dragControls}
      className="relative mb-3"
      transition={springDrag}
      whileDrag={{
        scale: 1.02,
        zIndex: 50,
        boxShadow:
          "0 28px 56px -16px rgba(28, 25, 23, 0.22), 0 0 0 1px rgba(180, 83, 9, 0.12)",
        cursor: "grabbing",
      }}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="mt-1 h-10 w-10 shrink-0 cursor-grab touch-none active:cursor-grabbing"
          aria-label="Drag to reorder step"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical className="size-4 text-[var(--color-muted)]" />
        </Button>
        <div className="min-w-0 flex-1">
          <StepEditor
            index={index}
            value={row.data}
            onChange={(next) => onStepChange(row.id, next)}
            onRemove={() => onRemove(row.id)}
            collapseAllSignal={collapseAllSignal}
            expandAllSignal={expandAllSignal}
          />
        </div>
      </div>
    </Reorder.Item>
  );
}
