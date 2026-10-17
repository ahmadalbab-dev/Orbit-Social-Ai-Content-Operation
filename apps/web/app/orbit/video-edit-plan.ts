export interface VideoEditPlan {
  title: string;
  captions: { text: string; start: number; end: number }[];
  scenes: { text: string; start: number; end: number }[];
}
export function validVideoPlan(plan: VideoEditPlan, duration: number) {
  return (
    typeof plan?.title === "string" &&
    plan.title.trim().length > 0 &&
    plan.title.length <= 100 &&
    [plan.captions, plan.scenes].every(
      (rows, index) =>
        Array.isArray(rows) &&
        rows.length <= 20 &&
        rows.every(
          (row) =>
            !!row &&
            typeof row === "object" &&
            typeof row.text === "string" &&
            !!row.text.trim() &&
            row.text.length <= (index === 0 ? 120 : 400) &&
            Number.isFinite(row.start) &&
            Number.isFinite(row.end) &&
            row.start >= 0 &&
            row.end > row.start &&
            row.end <= duration,
        ),
    )
  );
}
