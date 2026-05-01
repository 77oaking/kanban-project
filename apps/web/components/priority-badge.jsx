// Pulled out of the action-items page so the kanban board doesn't have to
// import from a Next.js page module.
export function PriorityBadge({ p }) {
  const map = {
    LOW: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    MEDIUM: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
    HIGH: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    URGENT: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  };
  return <span className={`badge ${map[p]}`}>{p}</span>;
}
