'use client';

import * as React from 'react';
import { curveMonotoneX } from '@visx/curve';

import { AreaChart, Area } from './bklit/area-chart';
import { Grid } from './bklit/grid';
import { XAxis } from './bklit/x-axis';
import { ChartTooltip } from './bklit/tooltip';
import type { ChartPhase } from './bklit/chart-phase';

export type ReachMetric = 'reach' | 'watchTime' | 'engagement';

export type JarvisChartPoint = {
  date: Date;
  reach: number;
  watchTime: number;
  engagement: number;
};

export const metricVisuals: Record<
  ReachMetric,
  { label: string; color: string; glow: string }
> = {
  reach: { label: 'Reach', color: '#D7FF4F', glow: 'rgba(215, 255, 79, 0.4)' },
  watchTime: {
    label: 'Watch time',
    color: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.4)',
  },
  engagement: {
    label: 'Engagement',
    color: '#C4B5FD',
    glow: 'rgba(196, 181, 253, 0.4)',
  },
};

export function formatMetricValue(metric: ReachMetric, value: number): string {
  if (metric === 'watchTime') {
    if (value < 3600) return `${Math.round(value / 60)}m`;
    const hours = Math.floor(value / 3600);
    const minutes = Math.round((value % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  if (metric === 'engagement') return `${value.toFixed(1)}%`;
  return new Intl.NumberFormat('en', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

type JarvisReachChartProps = {
  data: JarvisChartPoint[];
  metric: ReachMetric;
  /** Inclusive index where the dashed "in progress" tail begins. */
  dashFromIndex?: number;
  /** Chart lifecycle phase callback — the agent chains cursor motion off this. */
  onPhaseChange?: (phase: ChartPhase) => void;
  /** Signature that replays the reveal (e.g. metric or range change). */
  revealSignature?: string;
};

const JarvisReachChart = React.memo(function JarvisReachChart({
  data,
  metric,
  dashFromIndex,
  onPhaseChange,
  revealSignature,
}: JarvisReachChartProps) {
  const visual = metricVisuals[metric];

  const themeVars = React.useMemo(
    () =>
      ({
        '--chart-background': '#000000',
        '--chart-foreground': '#F1F0EA',
        '--chart-foreground-muted': '#8D8E85',
        '--chart-label': '#8D8E85',
        '--chart-line-primary': visual.color,
        '--chart-line-secondary': 'rgba(255,255,255,0.35)',
        '--chart-crosshair': 'rgba(255,255,255,0.3)',
        '--chart-grid': 'rgba(255,255,255,0.075)',
        '--chart-indicator-color': visual.color,
        '--chart-indicator-secondary-color': 'rgba(255,255,255,0.5)',
        '--chart-marker-background': 'rgba(255,255,255,0.06)',
        '--chart-marker-border': 'rgba(255,255,255,0.18)',
        '--chart-marker-foreground': '#F1F0EA',
        '--chart-marker-badge-background': '#F1F0EA',
        '--chart-marker-badge-foreground': '#000000',
        '--chart-segment-background': 'rgba(255,255,255,0.06)',
        '--chart-segment-line': 'rgba(255,255,255,0.25)',
        '--chart-brush-border': 'rgba(255,255,255,0.18)',
        '--chart-tooltip-background': 'rgba(8,8,10,0.68)',
      }) as React.CSSProperties,
    [visual.color],
  );

  const rows = React.useCallback(
    (point: Record<string, unknown>) => {
      const order: ReachMetric[] = ['reach', 'watchTime', 'engagement'];
      return order
        .filter((key) => typeof point[key] === 'number')
        .map((key) => ({
          color: metricVisuals[key].color,
          label: metricVisuals[key].label,
          value: formatMetricValue(key, point[key] as number),
        }));
    },
    [],
  );

  return (
    <div className="jarvis-chart-surface relative" style={themeVars}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 -top-24 h-56 rounded-full blur-[110px] transition-[background] duration-700"
        style={{ background: `radial-gradient(50% 50% at 50% 50%, ${visual.glow}, transparent 70%)`, opacity: 0.28 }}
      />
      <AreaChart
        data={data as unknown as Record<string, unknown>[]}
        status="ready"
        yDomainTween
        yDomainTweenDuration={640}
        animationDuration={1400}
        revealSignature={revealSignature}
        margin={{ top: 36, right: 28, bottom: 40, left: 44 }}
        aspectRatio="auto"
        style={{ height: 'clamp(300px, 42vh, 440px)' }}
        onPhaseChange={onPhaseChange}
      >
        <Grid
          horizontal
          numTicksRows={4}
          stroke="var(--chart-grid)"
        />
        <Area
          dataKey={metric}
          curve={curveMonotoneX}
          fill={visual.color}
          fillOpacity={0.3}
          gradientToOpacity={0.02}
          stroke={visual.color}
          strokeWidth={1.75}
          fadeEdges
          dashFromIndex={dashFromIndex}
          dashArray="5,5"
        />
        <XAxis numTicks={5} />
        <ChartTooltip
          rows={rows}
          dotVariant="ring"
          dotSize={6}
          dotStrokeWidth={1.75}
          indicatorDasharray="4,4"
          matchCrosshair={false}
          damping={26}
          panelStyle={{
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '14px',
            boxShadow: `0 18px 60px rgba(0,0,0,0.55), 0 0 34px ${visual.glow}`,
            WebkitBackdropFilter: 'blur(18px)',
            backdropFilter: 'blur(18px)',
          }}
        />
      </AreaChart>
    </div>
  );
});

export { JarvisReachChart };
