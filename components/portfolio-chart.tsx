export function PortfolioChart({ invested, current }: { invested: number; current: number }) {
  const positive = current >= invested;
  const endY = positive ? 36 : 84;
  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 720 210" preserveAspectRatio="none" role="img" aria-label="Portfolio performance line">
        <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6fb5c" stopOpacity=".26"/><stop offset="1" stopColor="#d6fb5c" stopOpacity="0"/></linearGradient></defs>
        <line x1="0" x2="720" y1="164" y2="164" className="gridline"/><line x1="0" x2="720" y1="104" y2="104" className="gridline"/><line x1="0" x2="720" y1="44" y2="44" className="gridline"/>
        <path d={`M0 150 C65 148 80 132 132 138 S225 118 280 126 S360 92 418 102 S505 76 552 82 S646 58 720 ${endY} L720 205 L0 205 Z`} fill="url(#chartFill)" />
        <path d={`M0 150 C65 148 80 132 132 138 S225 118 280 126 S360 92 418 102 S505 76 552 82 S646 58 720 ${endY}`} fill="none" stroke="#cdec50" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        <circle cx="720" cy={endY} r="5" fill="#11150d" stroke="#d6fb5c" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-labels"><span>4 Aug</span><span>Latest NAV</span></div>
    </div>
  );
}
