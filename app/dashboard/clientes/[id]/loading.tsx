export default function Loading() {
  return (
    <div className="p-6">
      <div className="h-6 w-64 rounded bg-slate-100" />
      <div className="mt-2 h-4 w-96 rounded bg-slate-100" />
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-slate-100" />
        <div className="h-72 rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}