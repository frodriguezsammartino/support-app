export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
