export default function ShukaLogo({ size = 'md', showTagline = true }) {
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-10 h-10';
  const wordSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-[22px]';

  return (
    <div className="inline-flex items-center gap-2.5 select-none group">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSize} shrink-0 drop-shadow-sm group-hover:scale-105 transition-transform duration-200`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="shukaMarkGrad" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="55%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#shukaMarkGrad)" />
        {/* Market bag handle / Armenian arch */}
        <path
          d="M22 23V19C22 13.477 26.477 9 32 9C37.523 9 42 13.477 42 19V23"
          stroke="#0F172A"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        {/* Sculpted shopping bag body */}
        <path
          d="M15 24.5C15 22.567 16.567 21 18.5 21H45.5C47.433 21 49 22.567 49 24.5L46.4 48.2C46.05 51.35 43.39 53.75 40.22 53.75H23.78C20.61 53.75 17.95 51.35 17.6 48.2L15 24.5Z"
          fill="#0F172A"
        />
        {/* Golden marketplace smile & forward arrow */}
        <path
          d="M23.5 35C26.5 40 31.8 41.8 39 38.4"
          stroke="#FFFFFF"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <path
          d="M35.5 35.2L40.6 37.7L38.3 42.5"
          stroke="#FBBF24"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="29" r="2.8" fill="#FBBF24" />
      </svg>

      <div className="leading-none flex flex-col">
        <div className={`font-display font-extrabold tracking-tight text-white flex items-baseline ${wordSize}`}>
          <span>shuka</span>
          <span className="text-amber-400 font-black">.am</span>
        </div>
        {showTagline && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg viewBox="0 0 64 8" className="w-12 h-2 overflow-visible" aria-hidden="true">
              <path
                d="M2 2.5C18 7.5 42 7.5 58 2"
                stroke="#F59E0B"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M54 0.8L59.5 1.8L56.5 6.2"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
              market
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
