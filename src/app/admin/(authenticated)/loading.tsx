export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-7 w-40 bg-neutral-300 rounded" />
        <div className="h-4 w-64 bg-neutral-200 rounded mt-2" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-300 p-5">
            <div className="h-4 w-20 bg-neutral-200 rounded" />
            <div className="h-8 w-12 bg-neutral-300 rounded mt-2" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-neutral-300 p-6">
        <div className="h-5 w-32 bg-neutral-300 rounded mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-neutral-100 rounded mb-2" />
        ))}
      </div>
    </div>
  );
}
