const toneByState: Record<string, string> = {
  accepted: "badge-green",
  delivered: "badge-green",
  submitted: "badge-blue",
  reconciliation_required: "badge-red",
  validated: "badge-blue",
  draft: "badge-yellow",
  ready_for_clearance: "badge-yellow",
  offline_queued: "badge-yellow",
  rejected: "badge-red",
};

export function StatusBadge({ state }: { state: string }) {
  return <span className={`badge ${toneByState[state] ?? "badge-blue"}`}>{state.replaceAll("_", " ")}</span>;
}
