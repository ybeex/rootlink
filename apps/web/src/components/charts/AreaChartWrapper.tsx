// All recharts imports are inside this file — the dynamic() boundary in
// lib/dynamic.ts wraps this entire module, so recharts is never included
// in the initial bundle regardless of which page imports DynRechartsArea.

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

export interface AreaChartData {
  [key: string]: string | number;
}

interface AreaChartWrapperProps {
  data:       AreaChartData[];
  xKey:       string;
  areaKey:    string;
  height?:    number;
  color?:     string;
  gradientId?: string;
  tooltipLabel?: string;
  tooltipUnit?: string;
  xFormatter?: (v: string | number) => string;
  yFormatter?: (v: number) => string;
}

function CustomTooltip({ active, payload, label, unit }: {
  active?: boolean; payload?: { value: number }[]; label?: string; unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        background:  'var(--bg-surface)',
        border:      '1px solid var(--border-default)',
        boxShadow:   'var(--shadow-md)',
        fontFamily:  'var(--font-body)',
      }}
    >
      <p className="text-2xs mb-0.5" style={{ color: 'var(--text-faint)' }}>{label}</p>
      <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {payload[0]?.value}{unit ?? ''}
      </p>
    </div>
  );
}

export default function AreaChartWrapper({
  data, xKey, areaKey,
  height = 160,
  color = 'var(--accent-canopy)',
  gradientId = 'area-grad',
  tooltipUnit,
  xFormatter,
  yFormatter,
}: AreaChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <CartesianGrid
          stroke="var(--border-subtle)"
          strokeDasharray="3 3"
          vertical={false}
        />

        <XAxis
          dataKey={xKey}
          tick={{
            fontSize: 10,
            fill: 'var(--text-faint)',
            fontFamily: 'var(--font-mono)',
          }}
          tickLine={false}
          axisLine={false}
          tickFormatter={xFormatter}
        />

        <YAxis
          tick={{
            fontSize: 10,
            fill: 'var(--text-faint)',
            fontFamily: 'var(--font-mono)',
          }}
          tickLine={false}
          axisLine={false}
          tickFormatter={yFormatter}
        />

        <Tooltip
          content={<CustomTooltip unit={tooltipUnit} />}
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
        />

        <Area
          type="monotone"
          dataKey={areaKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{
            r: 4,
            fill: 'var(--accent-ember)',
            strokeWidth: 0,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
