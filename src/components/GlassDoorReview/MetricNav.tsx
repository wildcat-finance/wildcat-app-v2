"use client"

// Temporary: the metric review page (product#917). Remove with the page.
// The metric list in the app's left sidebar: every metric id with its name on
// hover. Selecting one opens it on the page, expanding its group if needed.

import { memo, RefObject, useEffect, useState } from "react"

import { Tooltip } from "@mui/material"

import { GROUPS, Group, metricsIn } from "./metrics"
import { isDefault, Toggles } from "./options"
import s from "./review.module.css"

/** The element with this id once it is in the document. */
export const useSlot = (id: string) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const find = () => {
      const element = document.getElementById(id)
      if (element) setSlot(element)
      return Boolean(element)
    }
    if (find()) return undefined
    const observer = new MutationObserver(() => {
      if (find()) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [id])
  return slot
}

/**
 * The metric at the top of the page, just below the sticky toolbar.
 * `layout` changes whenever metrics are added or removed (a group collapses).
 */
export const useActiveMetric = (
  page: RefObject<HTMLElement>,
  toolbar: RefObject<HTMLElement>,
  layout: unknown,
) => {
  const [active, setActive] = useState<string>()
  useEffect(() => {
    const scroller = page.current
    if (!scroller) return undefined
    let frame = 0
    const measure = () => {
      frame = 0
      const box = scroller.getBoundingClientRect()
      const line =
        Math.max(
          toolbar.current?.getBoundingClientRect().bottom ?? 0,
          box.top,
        ) + 24
      const current = Array.from(
        scroller.querySelectorAll<HTMLElement>("article[id^='metric-']"),
      ).find((article) => {
        const rect = article.getBoundingClientRect()
        return rect.bottom > line && rect.top < box.bottom
      })
      setActive(current?.id.replace(/^metric-/, ""))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    scroller.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [page, toolbar, layout])
  return active
}

export const MetricNav = memo(
  ({
    toggles,
    active,
    collapsed,
    onGo,
    onGoGroup,
  }: {
    toggles: Toggles
    /** The metric at the top of the page. */
    active?: string
    /** Collapsed sections of the page. */
    collapsed: readonly string[]
    onGo: (id: string) => void
    onGoGroup: (key: Group) => void
  }) => {
    // Keep the current metric in sight in a long sidebar.
    useEffect(() => {
      if (!active) return
      document
        .querySelector(`[data-nav-metric="${active}"]`)
        ?.scrollIntoView?.({ block: "nearest" })
    }, [active])
    return (
      <nav className={s.nav} aria-label="Metrics">
        <h2 className={s.navTitle}>Metrics</h2>
        {GROUPS.map((group) => {
          const metrics = metricsIn(group.key)
          return (
            <div key={group.key} className={s.navGroup}>
              <a
                className={s.navGroupLink}
                href={`#group-${group.key}`}
                onClick={(event) => {
                  event.preventDefault()
                  onGoGroup(group.key)
                }}
              >
                <span>{group.title}</span>
                <span className={s.navCount}>
                  {collapsed.includes(group.key)
                    ? `${metrics.length} · hidden`
                    : metrics.length}
                </span>
              </a>
              <ul className={s.navList}>
                {metrics.map((metric) => (
                  <li key={metric.id}>
                    <Tooltip
                      title={metric.name}
                      placement="right"
                      enterDelay={150}
                      disableInteractive
                    >
                      <a
                        href={`#metric-${metric.id}`}
                        data-nav-metric={metric.id}
                        className={
                          isDefault(toggles, metric.id)
                            ? s.navId
                            : `${s.navId} ${s.navChanged}`
                        }
                        aria-label={`${metric.name} (${metric.id})`}
                        aria-current={
                          active === metric.id ? "location" : undefined
                        }
                        onClick={(event) => {
                          event.preventDefault()
                          onGo(metric.id)
                        }}
                      >
                        {metric.id}
                      </a>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        <p className={s.navNote}>
          Dashed: display changed from the design default.
        </p>
      </nav>
    )
  },
)
MetricNav.displayName = "MetricNav"
