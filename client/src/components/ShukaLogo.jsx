export default function ShukaLogo({ size = 'md', showTagline = true }) {
  const iconCls = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const wordCls = size === 'sm' ? 'text-lg' : 'text-xl';

  return (
    <span className="inline-flex items-center gap-2.5 group select-none">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconCls} shrink-0 drop-shadow-sm group-hover:scale-105 transition-transform duration-200`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="shukaLogoGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="55%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#shukaLogoGrad)" />
        <path
          d="M22 23V19C22 13.5 26.5 9 32 9C37.5 9 42 13.5 42 19V23"
          stroke="#0F172A"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M14 23H50L47.2 48.5C46.8 52.2 43.7 55 40 55H24C20.3 55 17.2 52.2 16.8 48.5L14 23Z"
          fill="#0F172A"
        />
        <path
          d="M21 41L27.5 32.5L32.5 38L37.5 30.5L43 41"
          stroke="#FBBF24"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M23 46.5C27.5 49.5 36.5 49.5 41 46.5"
          stroke="#FB923C"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>

      <span className="leading-none flex flex-col">
        <span className={`font-display font-extrabold ${wordCls} tracking-tight text-white flex items-baseline`}>
          shuka
          <span className="text-amber-400 font-black">.am</span>
        </span>
        {showTagline && (
          <span className="mt-0.5 flex items-center gap-1">
            <svg viewBox="0 0 68 8" className="w-14 h-2" aria-hidden="true">
              <path
                d="M2 2.5C18 7.5 46 7.5 62 2.2"
                stroke="#F59E0B"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M58 1L64 2.2L60.5 6.8"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </span>
        )}
      </span>
    </span>
  );
}
