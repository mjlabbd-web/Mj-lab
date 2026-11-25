import {useState} from 'react';
import {SalesPoint} from '../types/store';

interface SalesChartProps {
  data: SalesPoint[];
}

export function SalesChart({data}: SalesChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(data.length > 2 ? data.length - 2 : 0);

  if (data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-[#8a8a8a]">
        কোনো বিক্রয় ডেটা পাওয়া যায়নি
      </div>
    );
  }

  const width = 680;
  const height = 210;
  const padLeft = 40;
  const padRight = 18;
  const padTop = 26;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxSales = Math.max(200, ...data.map((d) => d.sales)) * 1.1;
  const points = data.map((d, idx) => {
    const x =
      data.length === 1
        ? padLeft + chartW / 2
        : padLeft + (idx / (data.length - 1)) * chartW;
    const y = padTop + chartH - (d.sales / maxSales) * chartH;
    return {x, y, ...d};
  });

  // Build smooth cubic bezier SVG path
  const linePath = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[idx - 1];
    const cx1 = prev.x + (pt.x - prev.x) * 0.45;
    const cx2 = prev.x + (pt.x - prev.x) * 0.55;
    return `${acc} C ${cx1} ${prev.y}, ${cx2} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    padTop + chartH
  } L ${points[0].x} ${padTop + chartH} Z`;

  const yTicks = [0, 50, 100, 150, 200];
  const activePoint = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="বিক্রয় পরিসংখ্যান গ্রাফ"
      >
        <defs>
          <linearGradient id="personaSalesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5500" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff5500" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid Lines */}
        {yTicks.map((tick) => {
          const y = padTop + chartH - (tick / maxSales) * chartH;
          if (y < padTop - 4) return null;
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#262626"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill="#8b8b8b"
                fontSize="11"
                className="tabular-nums"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Vertical Grid Lines */}
        {points.map((pt, idx) => {
          if (idx % 2 !== 0 && points.length > 6) return null;
          return (
            <line
              key={`v-${pt.label}`}
              x1={pt.x}
              y1={padTop}
              x2={pt.x}
              y2={padTop + chartH}
              stroke="#202020"
              strokeWidth="1"
            />
          );
        })}

        {/* Area Fill */}
        <path d={areaPath} fill="url(#personaSalesGrad)" />

        {/* Curve Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#ff5500"
          strokeWidth="2.75"
          strokeLinecap="round"
        />

        {/* Data Points */}
        {points.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={pt.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              className="cursor-pointer"
            >
              <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5 : 3.5}
                fill={isHovered ? '#ffffff' : '#ff8c42'}
                stroke="#ff5500"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* X Axis Labels */}
        {points.map((pt, idx) => {
          const showLabel =
            points.length <= 7 || idx === 0 || idx === points.length - 1 || idx % 3 === 0;
          if (!showLabel) return null;
          return (
            <text
              key={`lbl-${pt.label}`}
              x={pt.x}
              y={height - 6}
              textAnchor="middle"
              fill="#9a9a9a"
              fontSize="11"
            >
              {pt.label}
            </text>
          );
        })}

        {/* Floating Tooltip */}
        {activePoint && (
          <g
            transform={`translate(${Math.min(
              Math.max(activePoint.x - 54, padLeft),
              width - 120,
            )}, ${Math.max(activePoint.y - 40, 2)})`}
          >
            <rect
              x="0"
              y="0"
              width="112"
              height="28"
              rx="6"
              fill="#222222"
              stroke="#3a3a3a"
              strokeWidth="1"
            />
            <text
              x="56"
              y="18"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="700"
              className="tabular-nums"
            >
              {activePoint.sales} বিক্রয় · ৳{activePoint.revenue.toLocaleString()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
