import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

export interface PieSlice {
  name:  string;
  value: number;
  color: string;
}

interface PieChartWrapperProps {
  data:        PieSlice[];
  height?:     number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  tooltipSuffix?: string;
}

function CustomTooltip({ active, payload, suffix }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: PieSlice }[];
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: slice } = payload[0];
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        background: 'var(--bg-surface)',
        border:     '1px solid var(--border-default)',
        boxShadow:  'var(--shadow-md)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <div className="h-2 w-2 rounded-full shrink-0"
          style={{ background: slice.color }} />
        <p className="text-2xs" style={{ color: 'var(--text-muted)' }}>{name}</p>
      </div>
      <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}{suffix ?? ''}
      </p>
    </div>
  );
}

export default function PieChartWrapper({
  data,
  height       = 160,
  innerRadius  = 38,
  outerRadius  = 58,
  showLegend   = true,
  tooltipSuffix,
}: PieChartWrapperProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {data.map((slice, i) => (
              <Cell key={i} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            content={<CustomTooltip suffix={tooltipSuffix} />}
            cursor={false}
          />
        </PieChart>
      </ResponsiveContainer>

      {showLegend && (
        <div className="space-y-2 mt-2">
          {data.map(({ name, value, color }) => (
            <div key={name} className="flex items-center gap-2 text-2xs">
              <div className="h-2 w-2 rounded-full shrink-0"
                style={{ background: color }} />
              <span className="flex-1 truncate"
                style={{ color: 'var(--text-muted)' }}>{name}</span>
              <span className="tabular-nums font-mono font-medium"
                style={{ color: 'var(--text-secondary)' }}>
                {value}{tooltipSuffix ?? ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
