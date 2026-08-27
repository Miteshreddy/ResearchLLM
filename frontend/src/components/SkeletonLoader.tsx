'use client';

export default function SkeletonLoader({ type = 'report' }: { type?: 'report' | 'sources' | 'rag' }) {
  if (type === 'sources') {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <div className="skeleton h-4 w-24 rounded-full" />
            <div className="skeleton mt-4 h-6 w-3/4 rounded-full" />
            <div className="skeleton mt-3 h-4 w-full rounded-full" />
            <div className="skeleton mt-2 h-4 w-5/6 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'rag') {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-6">
          <div className="skeleton h-5 w-32 rounded-full" />
          <div className="skeleton mt-5 h-10 w-full rounded-2xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
              <div className="skeleton h-4 w-16 rounded-full" />
              <div className="skeleton mt-4 h-20 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="skeleton h-4 w-28 rounded-full" />
      <div className="skeleton h-12 w-4/5 rounded-[20px]" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="skeleton h-4 w-16 rounded-full" />
            <div className="skeleton mt-3 h-7 w-14 rounded-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-[28px] border border-white/8 bg-white/[0.03] p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={`skeleton h-4 rounded-full ${index === 0 ? 'w-full' : index === 5 ? 'w-2/3' : 'w-[92%]'}`} />
        ))}
      </div>
    </div>
  );
}
