'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function DashboardChart({ series, accent }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231 / 0.4)" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => d.slice(5)}
          tick={{ fontSize: 11, fill: 'rgb(113 113 122)' }}
          stroke="rgb(228 228 231)"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'rgb(113 113 122)' }}
          stroke="rgb(228 228 231)"
        />
        <Tooltip
          contentStyle={{
            background: 'rgb(255 255 255)',
            border: '1px solid rgb(228 228 231)',
            borderRadius: 6,
            fontSize: 12,
          }}
          labelFormatter={(d) => `Day ${d}`}
        />
        <Area type="monotone" dataKey="count" stroke={accent} strokeWidth={2} fill="url(#chartFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
