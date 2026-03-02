"use client"

/* eslint-disable react/no-array-index-key, jsx-a11y/control-has-associated-label */

import { useState, useEffect, useCallback } from "react"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts"

import { CollapsibleSection } from "./CollapsibleSection"
import { ChartCard } from "../../components/ChartCard"
import { ChartTooltip } from "../../components/ChartTooltip"
import { T, fmtUSD, fmtK, axisStyle, gridStyle } from "../../constants"
import { useSubgraphQuery } from "../../hooks/useSubgraphQuery"
import { ETHERSCAN } from "../constants"
import { fetchBatchDetail } from "../hooks/queries"

const STATUS_COLORS: Record<string, string> = {
  paid: T.accentGreen,
  "paid-late": T.accentAmber,
  unpaid: T.accentRed,
  pending: T.textDim,
}

const thStyle: React.CSSProperties = {
  fontFamily: T.fontBody,
  fontSize: "10px",
  color: T.textDim,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "6px 8px",
  textAlign: "left",
  borderBottom: `1px solid ${T.border}`,
}

const tdStyle: React.CSSProperties = {
  fontFamily: T.fontMono,
  fontSize: "11px",
  color: T.text,
  padding: "5px 8px",
  borderBottom: `1px solid ${T.borderSubtle}`,
}

function TxLink({ tx, txFull }: { tx: string; txFull: string }) {
  return (
    <a
      href={`${ETHERSCAN}/tx/${txFull}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: T.accent, textDecoration: "none" }}
    >
      {tx}
    </a>
  )
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          ...tdStyle,
          color: T.textDim,
          textAlign: "center",
          fontFamily: T.fontBody,
          padding: "16px 8px",
        }}
      >
        No {label} recorded
      </td>
    </tr>
  )
}

function fmtToken(v: number, sym: string): string {
  return `${fmtK(v)} ${sym}`
}

export function BatchDetailDrawer({
  batchId,
  batchLabel,
  dec,
  symbol,
  isStablecoin,
  onClose,
}: {
  batchId: string
  batchLabel: string
  dec: number
  symbol: string
  isStablecoin: boolean
  onClose: () => void
}) {
  const fmt = (v: number) => (isStablecoin ? fmtUSD(v) : fmtToken(v, symbol))
  const [visible, setVisible] = useState(false)
  const { data, loading } = useSubgraphQuery(
    () => fetchBatchDetail(batchId, dec),
    "BatchDetail",
    [batchId, dec],
  )

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
  }, [])

  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = orig
    }
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleClose])

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: 680,
          maxWidth: "100vw",
          height: "100vh",
          background: T.bg,
          borderLeft: `1px solid ${T.border}`,
          overflowY: "auto",
          padding: "24px",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-out",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "18px",
                fontWeight: 700,
                color: T.text,
              }}
            >
              Batch {batchLabel}
            </span>
            {data && (
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "10px",
                  fontWeight: 600,
                  color: STATUS_COLORS[data.status],
                  background: `${STATUS_COLORS[data.status]}18`,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                }}
              >
                {data.status}
              </span>
            )}
          </div>
          <span
            onClick={handleClose}
            style={{
              fontFamily: T.fontMono,
              fontSize: "18px",
              color: T.textDim,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            &times;
          </span>
        </div>

        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "40px 0",
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 20,
                  background: T.bgSkeleton,
                  borderRadius: T.radiusSm,
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Summary Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: "12px",
              }}
            >
              {[
                { l: "Total Requested", v: fmt(data.totalRequested) },
                { l: "Total Paid", v: fmt(data.totalPaid) },
                { l: "Lenders", v: `${data.lenderCount}` },
                {
                  l: "Interest Earned",
                  v: fmt(data.interestEarned),
                },
                { l: "Created", v: data.createdDate },
                { l: "Expiry", v: data.expiryDate },
                { l: "Payments", v: `${data.paymentsCount}` },
                { l: "Claimed", v: `${data.executionsCount}` },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    background: T.bgCard,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radiusSm,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.fontBody,
                      fontSize: "10px",
                      color: T.textDim,
                      marginBottom: "4px",
                    }}
                  >
                    {s.l}
                  </div>
                  <div
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: "14px",
                      fontWeight: 600,
                      color: T.text,
                    }}
                  >
                    {s.v}
                  </div>
                </div>
              ))}
            </div>

            {/* Fill Progression Chart */}
            {data.fillProgression.length > 1 && (
              <ChartCard
                title="Fill Progression"
                description="Stepped cumulative requested vs paid amounts over time"
                height={220}
              >
                <ResponsiveContainer>
                  <AreaChart
                    data={data.fillProgression}
                    margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
                  >
                    <defs>
                      <linearGradient
                        id="gradRequested"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={T.accent}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={T.accent}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                      <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={T.accentGreen}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={T.accentGreen}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridStyle} />
                    <XAxis
                      dataKey="date"
                      tick={axisStyle}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={axisStyle}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={fmtK}
                      width={48}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine
                      x={data.expiryDate}
                      stroke={T.accentAmber}
                      strokeDasharray="4 4"
                      label={{
                        value: "Expiry",
                        fill: T.accentAmber,
                        fontSize: 10,
                        fontFamily: T.fontMono,
                        position: "insideTopRight",
                      }}
                    />
                    <Area
                      type="stepAfter"
                      dataKey="totalRequested"
                      name="Total Requested"
                      stroke={T.accent}
                      fill="url(#gradRequested)"
                      strokeWidth={1.5}
                    />
                    <Area
                      type="stepAfter"
                      dataKey="totalPaid"
                      name="Total Paid"
                      stroke={T.accentGreen}
                      fill="url(#gradPaid)"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Lender Breakdown */}
            <CollapsibleSection
              title="Lender Breakdown"
              count={data.lenders.length}
              defaultOpen
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    whiteSpace: "nowrap",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Address</th>
                      <th style={thStyle}>Requested</th>
                      <th style={thStyle}>Withdrawn</th>
                      <th style={thStyle}>Complete?</th>
                      <th style={thStyle}>#Requests</th>
                      <th style={thStyle}>#Executions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lenders.length === 0 ? (
                      <EmptyRow colSpan={6} label="lenders" />
                    ) : (
                      data.lenders.map((l, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{l.address}</td>
                          <td style={tdStyle}>{fmt(l.requested)}</td>
                          <td style={tdStyle}>{fmt(l.withdrawn)}</td>
                          <td
                            style={{
                              ...tdStyle,
                              color: l.complete ? T.accentGreen : T.accentAmber,
                            }}
                          >
                            {l.complete ? "Yes" : "No"}
                          </td>
                          <td style={tdStyle}>{l.requests}</td>
                          <td style={tdStyle}>{l.executions}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* Request Timeline */}
            <CollapsibleSection
              title="Request Timeline"
              count={data.requests.length}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    whiteSpace: "nowrap",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Lender</th>
                      <th style={thStyle}>Amount</th>
                      <th style={thStyle}>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requests.length === 0 ? (
                      <EmptyRow colSpan={4} label="requests" />
                    ) : (
                      data.requests.map((r, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{r.date}</td>
                          <td style={tdStyle}>{r.lender}</td>
                          <td style={tdStyle}>{fmt(r.amount)}</td>
                          <td style={tdStyle}>
                            <TxLink tx={r.tx} txFull={r.txFull} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* Payment History */}
            <CollapsibleSection
              title="Payment History"
              count={data.payments.length}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    whiteSpace: "nowrap",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Amount Paid</th>
                      <th style={thStyle}>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.length === 0 ? (
                      <EmptyRow colSpan={3} label="payments" />
                    ) : (
                      data.payments.map((p, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{p.date}</td>
                          <td style={tdStyle}>{fmt(p.amountPaid)}</td>
                          <td style={tdStyle}>
                            <TxLink tx={p.tx} txFull={p.txFull} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* Execution Log */}
            <CollapsibleSection
              title="Execution Log"
              count={data.executionLog.length}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    whiteSpace: "nowrap",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Lender</th>
                      <th style={thStyle}>Amount</th>
                      <th style={thStyle}>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.executionLog.length === 0 ? (
                      <EmptyRow colSpan={4} label="executions" />
                    ) : (
                      data.executionLog.map((e, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{e.date}</td>
                          <td style={tdStyle}>{e.lender}</td>
                          <td style={tdStyle}>{fmt(e.amount)}</td>
                          <td style={tdStyle}>
                            <TxLink tx={e.tx} txFull={e.txFull} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* Interest Accrual */}
            <CollapsibleSection
              title="Interest Accrual"
              count={data.interestAccruals.length}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    whiteSpace: "nowrap",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Interest Earned</th>
                      <th style={thStyle}>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.interestAccruals.length === 0 ? (
                      <EmptyRow colSpan={3} label="interest accruals" />
                    ) : (
                      data.interestAccruals.map((r, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{r.date}</td>
                          <td style={tdStyle}>{fmt(r.interestEarned)}</td>
                          <td style={tdStyle}>
                            <TxLink tx={r.tx} txFull={r.txFull} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  )
}
