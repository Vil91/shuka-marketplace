import { Check, XCircle } from 'lucide-react';

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrderProgressBar({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
        This order part was cancelled and item stock was returned.
      </div>
    );
  }

  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => s.key === status)
  );

  return (
    <div className="py-1">
      <div className="grid grid-cols-4 gap-2 relative">
        {STEPS.map((step, idx) => {
          const done = idx <= activeIdx;
          const current = idx === activeIdx;
          return (
            <div key={step.key} className="flex flex-col items-center text-center relative">
              {idx > 0 && (
                <div
                  className={`hidden sm:block absolute top-3.5 -left-1/2 w-full h-0.5 ${
                    idx <= activeIdx ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border-2 transition ${
                  done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                } ${current ? 'ring-4 ring-emerald-100' : ''}`}
              >
                {done ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-[11px] font-bold ${
                  done ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
