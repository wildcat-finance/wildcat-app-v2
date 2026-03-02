import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// Design tokens — consistent with other dashboard pages
// ─────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0e17",
  bgCard: "#111827",
  bgCardHover: "#1a2234",
  bgSkeleton: "#1e293b",
  border: "#1e293b",
  borderSubtle: "#162031",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  accent: "#22d3ee",
  accentGreen: "#34d399",
  accentRed: "#f87171",
  accentAmber: "#fbbf24",
  accentPurple: "#a78bfa",
  fontMono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  fontBody: "'DM Sans', 'Satoshi', system-ui, sans-serif",
  radius: "10px",
  radiusSm: "6px",
};

// ─────────────────────────────────────────────────────────────
// Reusable: StatCard
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, subtitle, accent = false, warn = false, small = false }) {
  return (
    <div style={{
      background: T.bgCard,
      border: `1px solid ${warn ? T.accentAmber + "40" : T.border}`,
      borderRadius: T.radius,
      padding: small ? "14px 18px" : "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: small ? "4px" : "6px",
      minWidth: 0,
    }}>
      <span style={{
        fontFamily: T.fontBody,
        fontSize: small ? "11px" : "12px",
        fontWeight: 500,
        color: T.textDim,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: T.fontMono,
        fontSize: small ? "20px" : "26px",
        fontWeight: 600,
        color: warn ? T.accentAmber : accent ? T.accent : T.text,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
      }}>
        {value}
      </span>
      {subtitle && (
        <span style={{
          fontFamily: T.fontBody,
          fontSize: "11px",
          color: T.textMuted,
          lineHeight: 1.3,
        }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable: ChartSkeleton
// ─────────────────────────────────────────────────────────────
function ChartSkeleton({ title, description, height = 260, chartType = "line", fullWidth = false }) {
  const chartHint = {
    line: "━━━╱╲━━━╱╲╱╲━━━━╱╲━━",
    bar: "▁▃▅▇▅▃▁▃▅▇▅▃▁▃▅▇▅▃",
    area: "▁▂▃▅▆▇▆▅▃▂▁▂▃▅▆▇▆▅",
    stacked: "▁▃▅▇▅▃▁▃▅▇▅▃▁▃▅▇▅▃",
    gantt: "──█████──  ──███──  ──███████──",
    histogram: "▁▂▅▇▅▂▁",
  };

  return (
    <div style={{
      background: T.bgCard,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      height: height + 80,
      gridColumn: fullWidth ? "1 / -1" : undefined,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontFamily: T.fontBody, fontSize: "14px", fontWeight: 600, color: T.text }}>{title}</span>
          {description && (
            <span style={{ fontFamily: T.fontBody, fontSize: "11px", color: T.textDim, maxWidth: "460px" }}>{description}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
          {["7d", "30d", "90d", "1y", "All"].map((r, i) => (
            <span key={r} style={{
              fontFamily: T.fontMono, fontSize: "10px",
              color: i === 4 ? T.accent : T.textDim,
              background: i === 4 ? `${T.accent}18` : "transparent",
              padding: "3px 7px", borderRadius: "4px", cursor: "pointer",
            }}>
              {r}
            </span>
          ))}
        </div>
      </div>
      <div style={{
        flex: 1, background: T.bgSkeleton, borderRadius: T.radiusSm,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        {[0.25, 0.5, 0.75].map((pct) => (
          <div key={pct} style={{ position: "absolute", top: `${pct * 100}%`, left: 0, right: 0, height: "1px", background: T.borderSubtle, opacity: 0.5 }} />
        ))}
        <span style={{
          fontFamily: T.fontMono,
          fontSize: "18px", color: T.textDim, opacity: 0.4,
          letterSpacing: "0.1em", userSelect: "none",
        }}>
          {chartHint[chartType] || chartHint.line}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable: SectionHeader
// ─────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ padding: "8px 0 4px 0" }}>
      <h2 style={{ fontFamily: T.fontBody, fontSize: "16px", fontWeight: 600, color: T.text, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontFamily: T.fontBody, fontSize: "12px", color: T.textDim, margin: "2px 0 0 0" }}>{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable: TableSkeleton — for tabular data placeholders
// ─────────────────────────────────────────────────────────────
function TableSkeleton({ columns, rows = 8, rowClickable = false }) {
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: columns.map((c) => c.width || "1fr").join(" "),
        padding: "12px 24px",
        borderBottom: `1px solid ${T.border}`,
        background: `${T.bgSkeleton}60`,
      }}>
        {columns.map((c) => (
          <span key={c.label} style={{
            fontFamily: T.fontBody, fontSize: "11px", fontWeight: 600,
            color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {c.label}
          </span>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          display: "grid",
          gridTemplateColumns: columns.map((c) => c.width || "1fr").join(" "),
          padding: "14px 24px",
          borderBottom: i < rows - 1 ? `1px solid ${T.borderSubtle}` : "none",
          cursor: rowClickable ? "pointer" : "default",
        }}>
          {columns.map((c, j) => (
            <div key={j} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                height: "10px",
                width: c.skeletonWidth || "60%",
                background: T.bgSkeleton,
                borderRadius: "3px",
              }} />
              {rowClickable && j === 0 && (
                <span style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.accent, opacity: 0.3 }}>→</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section 1: Borrower Identity & Portfolio Summary
// ─────────────────────────────────────────────────────────────
function BorrowerHeader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Identity card + portfolio summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
        {/* Identity card */}
        <div style={{
          background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius,
          padding: "24px 28px", display: "flex", flexDirection: "column", gap: "18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Address avatar placeholder */}
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: `linear-gradient(135deg, ${T.accent}40, ${T.accentPurple}40)`,
              border: `1px solid ${T.accent}30`,
            }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: T.fontMono, fontSize: "14px", fontWeight: 600, color: T.text }}>0x1234...abcd</span>
              <span style={{ fontFamily: T.fontBody, fontSize: "11px", color: T.textDim }}>Borrower</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { l: "First Market Created", v: "—" },
              { l: "Time on Protocol", v: "—" },
              { l: "Active Markets", v: "—" },
              { l: "Closed Markets", v: "—" },
              { l: "Assets Used", v: "—" },
            ].map((r) => (
              <div key={r.l} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: T.fontBody, fontSize: "12px", color: T.textDim }}>{r.l}</span>
                <span style={{ fontFamily: T.fontMono, fontSize: "13px", color: T.text }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio metrics grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <StatCard small label="Total Debt" value="$—" accent subtitle="across all active markets" />
          <StatCard small label="Total Capacity" value="$—" subtitle="aggregate max supply" />
          <StatCard small label="Avg Utilization" value="—%" subtitle="debt-weighted across markets" />
          <StatCard small label="Avg APR" value="—%" accent subtitle="debt-weighted base APR" />
          <StatCard small label="Total Borrowed" value="$—" subtitle="all-time" />
          <StatCard small label="Total Repaid" value="$—" subtitle="all-time" />
        </div>
      </div>

      {/* Reliability score row */}
      <div style={{
        background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius,
        padding: "16px 24px", display: "flex", flexDirection: "column", gap: "10px",
      }}>
        <span style={{
          fontFamily: T.fontBody, fontSize: "11px", fontWeight: 600,
          color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          Reliability Signals
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "20px" }}>
          {[
            { label: "Delinquency Events", value: "—", sub: "total across all markets" },
            { label: "Penalty Events", value: "—", sub: "exceeded grace period" },
            { label: "Avg Cure Time", value: "—", sub: "hours to resolve" },
            { label: "Batches Paid on Time", value: "—%", sub: "at expiry" },
            { label: "Parameter Changes", value: "—", sub: "post-creation changes" },
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontFamily: T.fontMono, fontSize: "20px", fontWeight: 600, color: T.text }}>{m.value}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: "11px", fontWeight: 500, color: T.textMuted }}>{m.label}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: "10px", color: T.textDim }}>{m.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section 2: Markets Table
// ─────────────────────────────────────────────────────────────
function MarketsTable() {
  return (
    <TableSkeleton
      rowClickable
      rows={6}
      columns={[
        { label: "Market", width: "2fr", skeletonWidth: "80%" },
        { label: "Asset", width: "80px", skeletonWidth: "50%" },
        { label: "Type", width: "80px", skeletonWidth: "60%" },
        { label: "Total Debt", width: "110px", skeletonWidth: "70%" },
        { label: "Capacity", width: "110px", skeletonWidth: "70%" },
        { label: "APR", width: "80px", skeletonWidth: "50%" },
        { label: "Utilization", width: "80px", skeletonWidth: "45%" },
        { label: "Status", width: "80px", skeletonWidth: "55%" },
        { label: "Created", width: "100px", skeletonWidth: "65%" },
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Section 3: Aggregate Debt Over Time (full-width)
// ─────────────────────────────────────────────────────────────
function AggregateDebtChart() {
  return (
    <ChartSkeleton
      title="Aggregate Debt Over Time"
      description="Total debt across all borrower's markets — stacked by market to show relative growth"
      chartType="stacked"
      height={280}
      fullWidth
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Section 4: Delinquency Track Record (full-width)
// ─────────────────────────────────────────────────────────────
function DelinquencyTrackRecord() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
        <StatCard small label="Total Events" value="—" subtitle="across all markets" />
        <StatCard small label="Longest Event" value="—" subtitle="single delinquency" />
        <StatCard small label="Avg Cure Time" value="—" subtitle="hours" />
        <StatCard small label="Penalty Events" value="—" subtitle="exceeded grace period" />
        <StatCard small label="Currently Delinquent" value="—" subtitle="markets right now" />
      </div>

      {/* Timeline */}
      <div style={{
        background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius,
        padding: "20px 24px",
      }}>
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: T.fontBody, fontSize: "14px", fontWeight: 600, color: T.text }}>
            Delinquency Timeline — All Markets
          </span>
          <span style={{ fontFamily: T.fontBody, fontSize: "11px", color: T.textDim }}>
            <span style={{ color: T.accentAmber }}>orange</span> = within grace ·
            <span style={{ color: T.accentRed }}> red</span> = penalties active
          </span>
        </div>

        {/* Skeleton gantt bars grouped by market */}
        {["Market A", "Market B", "Market C"].map((market) => (
          <div key={market} style={{ marginBottom: "16px" }}>
            <span style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.textMuted, display: "block", marginBottom: "6px" }}>
              {market}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {Array.from({ length: Math.floor(Math.random() * 2) + 1 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.textDim, width: "80px", textAlign: "right" }}>—/——</span>
                  <div style={{ flex: 1, height: "18px", background: T.bgSkeleton, borderRadius: "4px", position: "relative", overflow: "hidden" }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: `${20 + Math.random() * 40}%`,
                      background: `linear-gradient(90deg, ${T.accentAmber}80 0%, ${T.accentAmber}80 60%, ${T.accentRed}80 60%)`,
                      borderRadius: "4px", opacity: 0.25,
                    }} />
                  </div>
                  <span style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.textDim, width: "40px" }}>—h</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section 5: Withdrawal Processing Record
// ─────────────────────────────────────────────────────────────
function WithdrawalRecord() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
      <ChartSkeleton
        title="Withdrawal Batch Outcomes Over Time"
        description="Green = paid at expiry · Amber = paid late · Red = still unpaid — shows whether behavior is improving"
        chartType="stacked"
        height={240}
      />
      <div style={{
        background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius,
        padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px",
      }}>
        <span style={{ fontFamily: T.fontBody, fontSize: "14px", fontWeight: 600, color: T.text }}>
          Aggregate Batch Stats
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { l: "Total batches expired", v: "—" },
            { l: "Fully paid at expiry", v: "—%" },
            { l: "Paid late", v: "—" },
            { l: "Still unpaid", v: "—" },
            { l: "Avg shortfall", v: "—%" },
          ].map((r) => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: T.fontBody, fontSize: "12px", color: T.textDim }}>{r.l}</span>
              <span style={{ fontFamily: T.fontMono, fontSize: "14px", fontWeight: 600, color: T.text }}>{r.v}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontFamily: T.fontBody, fontSize: "11px", color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Current Queue
          </span>
          {[
            { l: "Pending batches", v: "—" },
            { l: "Total queued", v: "$—" },
            { l: "Next expiry", v: "—" },
          ].map((r) => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: T.fontBody, fontSize: "12px", color: T.textDim }}>{r.l}</span>
              <span style={{ fontFamily: T.fontMono, fontSize: "13px", color: T.text }}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section 6: Interest & Cost to Borrower
// ─────────────────────────────────────────────────────────────
function InterestCost() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
      <ChartSkeleton
        title="Cumulative Borrower Cost"
        description="Base interest + penalty fees + protocol fees — total cost of capital over time"
        chartType="area"
        height={240}
      />
      <div style={{ display: "grid", gridTemplateRows: "1fr 1fr 1fr 1fr", gap: "8px" }}>
        <StatCard small label="Total Cost" value="$—" accent subtitle="all-time interest + fees" />
        <StatCard small label="Annualized Cost" value="—%" subtitle="as % of avg debt" />
        <StatCard small label="Penalty Fee Ratio" value="—%" warn subtitle="penalty fees ÷ total cost" />
        <StatCard small label="Protocol Fees Paid" value="$—" subtitle="revenue to Wildcat" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section 7: Parameter Change History
// ─────────────────────────────────────────────────────────────
function ParameterHistory() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        <StatCard small label="Total Changes" value="—" subtitle="across all markets" />
        <StatCard small label="Most Changed" value="—" subtitle="parameter type" />
        <StatCard small label="Markets Unchanged" value="—" subtitle="zero changes since creation" />
      </div>
      {/* Table */}
      <TableSkeleton
        rows={5}
        columns={[
          { label: "Date", width: "120px", skeletonWidth: "70%" },
          { label: "Market", width: "1.5fr", skeletonWidth: "75%" },
          { label: "Parameter", width: "1fr", skeletonWidth: "65%" },
          { label: "Old Value", width: "110px", skeletonWidth: "50%" },
          { label: "New Value", width: "110px", skeletonWidth: "50%" },
          { label: "Tx", width: "100px", skeletonWidth: "60%" },
        ]}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section 8: Lender Overlap
// ─────────────────────────────────────────────────────────────
function LenderOverlap() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
        <StatCard small label="Unique Lenders" value="—" subtitle="across all markets" />
        <StatCard small label="Repeat Lenders" value="—" subtitle="in 2+ markets" />
        <StatCard small label="Avg Position Size" value="$—" subtitle="per lender per market" />
        <StatCard small label="Top Lender Exposure" value="$—" subtitle="largest aggregate position" />
      </div>
      {/* Top lenders table */}
      <TableSkeleton
        rows={5}
        rowClickable
        columns={[
          { label: "Lender", width: "1.5fr", skeletonWidth: "65%" },
          { label: "Markets", width: "80px", skeletonWidth: "30%" },
          { label: "Total Deposited", width: "120px", skeletonWidth: "60%" },
          { label: "Current Balance", width: "120px", skeletonWidth: "60%" },
          { label: "Interest Earned", width: "120px", skeletonWidth: "55%" },
          { label: "% of Borrower Debt", width: "120px", skeletonWidth: "45%" },
        ]}
      />
      <span style={{ fontFamily: T.fontBody, fontSize: "11px", color: T.textDim, padding: "0 4px" }}>
        Top lenders by aggregate balance across this borrower's markets · click to view lender profile
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page: Borrower Profile
// ─────────────────────────────────────────────────────────────
export default function BorrowerProfilePage() {
  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: T.fontBody }}>
      {/* Nav */}
      <nav style={{
        borderBottom: `1px solid ${T.border}`, padding: "0 32px", height: "52px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, background: `${T.bg}ee`, backdropFilter: "blur(12px)", zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span style={{ fontFamily: T.fontMono, fontSize: "15px", fontWeight: 700, color: T.accent, letterSpacing: "-0.03em" }}>wildcat</span>
          <div style={{ display: "flex", gap: "4px" }}>
            {["Overview", "Markets", "Borrowers", "Lenders"].map((tab) => (
              <span key={tab} style={{
                fontFamily: T.fontBody, fontSize: "13px",
                fontWeight: tab === "Borrowers" ? 600 : 400,
                color: tab === "Borrowers" ? T.text : T.textDim,
                padding: "6px 14px", borderRadius: T.radiusSm,
                background: tab === "Borrowers" ? `${T.accent}12` : "transparent",
                cursor: "pointer",
              }}>
                {tab}
              </span>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.textDim, display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ cursor: "pointer" }}>borrowers</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: T.textMuted }}>0x1234...abcd</span>
        </div>
      </nav>

      {/* Content */}
      <main style={{
        maxWidth: "1280px", margin: "0 auto", padding: "24px 32px 64px",
        display: "flex", flexDirection: "column", gap: "28px",
      }}>
        {/* 1: Identity & portfolio */}
        <section>
          <SectionHeader
            title="Borrower Profile"
            subtitle="Portfolio overview and reliability signals for lender due diligence"
          />
          <div style={{ marginTop: "12px" }}><BorrowerHeader /></div>
        </section>

        {/* 2: Markets table */}
        <section>
          <SectionHeader
            title="Markets"
            subtitle="All markets deployed by this borrower — click any row to view market detail"
          />
          <div style={{ marginTop: "12px" }}><MarketsTable /></div>
        </section>

        {/* 3: Aggregate debt (full-width) */}
        <section>
          <SectionHeader
            title="Aggregate Debt"
            subtitle="Total debt trajectory across all markets — stacked to show relative weight"
          />
          <div style={{ marginTop: "12px" }}><AggregateDebtChart /></div>
        </section>

        {/* 4: Delinquency track record (full-width) */}
        <section>
          <SectionHeader
            title="Delinquency Track Record"
            subtitle="Every delinquency event across all markets — the key risk signal for lenders"
          />
          <div style={{ marginTop: "12px" }}><DelinquencyTrackRecord /></div>
        </section>

        {/* 5: Withdrawal processing */}
        <section>
          <SectionHeader
            title="Withdrawal Processing"
            subtitle="Aggregate batch payment history — do lenders get their money back on time?"
          />
          <div style={{ marginTop: "12px" }}><WithdrawalRecord /></div>
        </section>

        {/* 6: Interest & cost */}
        <section>
          <SectionHeader
            title="Interest & Borrower Cost"
            subtitle="Total cost of capital — interest, penalty fees, and protocol fees"
          />
          <div style={{ marginTop: "12px" }}><InterestCost /></div>
        </section>

        {/* 7: Parameter changes */}
        <section>
          <SectionHeader
            title="Parameter Change History"
            subtitle="All borrower-initiated changes — stability of terms is a trust signal"
          />
          <div style={{ marginTop: "12px" }}><ParameterHistory /></div>
        </section>

        {/* 8: Lender overlap */}
        <section>
          <SectionHeader
            title="Lender Relationships"
            subtitle="Lender overlap across markets — repeat lenders signal trust"
          />
          <div style={{ marginTop: "12px" }}><LenderOverlap /></div>
        </section>
      </main>
    </div>
  );
}