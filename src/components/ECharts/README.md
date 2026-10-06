# Wildcat ECharts Primitives

This folder contains the shared ECharts layer for Wildcat UI charts. The
profile analytics charts use these primitives so time-series behavior, tooltips,
legend styling, and the bottom `dataZoom` selector stay consistent.

## Components

- `EChart`: low-level renderer. It owns chart init, resize, option updates, and
  disposal. It can also expose shared CSV/PNG export actions when a wrapper opts
  into them. Export actions default to the app download glyph, but callers can
  request text-only buttons with `exportButtonVariant="text"`.
- `TimeSeriesChart`: line, area, and bar time-series charts. It keeps the full
  dataset mounted and uses ECharts `dataZoom` for range selection. It supports
  custom tooltips and event `markPoint`s.
- `CategoryBarChart`: vertical or horizontal categorical bars, including stacked
  bars, optional categorical `dataZoom`, custom tooltips, `visualMap` severity
  coloring, target/average `markLine`s, and CSV/PNG export actions.
- `DonutChart`: pie/donut charts with Wildcat tooltip styling, scroll legends,
  and optional center labels.

## Usage

Prefer the typed primitives over constructing raw ECharts options in product
components. If a new chart needs behavior that the primitives do not expose,
extend the option builder in `options.ts` so future charts get the same UX.

```tsx
<TimeSeriesChart
  data={points}
  series={[
    {
      key: "total",
      name: "Total",
      color: COLORS.ultramarineBlue,
      kind: "area",
    },
  ]}
  formatValue={(value) => formatUsd(value, { compact: true })}
/>
```

Time-series data should use second-based Unix timestamps under `timestamp`
unless `timestampKey` is explicitly provided.
