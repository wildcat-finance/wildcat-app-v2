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
    shown,
    active,
    collapsed,
    onToggleShown,
    onShowGroup,
    onGoGroup,
  }: {
    toggles: Toggles
    /** The metrics shown on the page. */
    shown: readonly string[]
    /** The metric at the top of the page. */
    active?: string
    /** Collapsed sections of the page. */
    collapsed: readonly string[]
    /** Shows a hidden metric (and scrolls to it) or hides a shown one. */
    onToggleShown: (id: string) => void
    onShowGroup: (key: Group, show: boolean) => void
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
          const shownHere = metrics.filter((metric) =>
            shown.includes(metric.id),
          ).length
          return (
            <div key={group.key} className={s.navGroup}>
              <div className={s.navGroupHead}>
                <a
                  className={s.navGroupLink}
                  href={`#group-${group.key}`}
                  onClick={(event) => {
                    event.preventDefault()
                    onGoGroup(group.key)
                  }}
                >
                  {group.title}
                </a>
                <span className={s.navCount}>
                  {`${shownHere}/${metrics.length}${
                    collapsed.includes(group.key) ? " · collapsed" : ""
                  }`}
                </span>
                <span className={s.navActions}>
                  <button
                    type="button"
                    className={s.navAction}
                    aria-label={`Show all ${group.title.toLowerCase()}`}
                    disabled={shownHere === metrics.length}
                    onClick={() => onShowGroup(group.key, true)}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={s.navAction}
                    aria-label={`Hide all ${group.title.toLowerCase()}`}
                    disabled={shownHere === 0}
                    onClick={() => onShowGroup(group.key, false)}
                  >
                    None
                  </button>
                </span>
              </div>
              <ul className={s.navList}>
                {metrics.map((metric) => (
                  <li key={metric.id}>
                    <Tooltip
                      title={metric.name}
                      placement="right"
                      enterDelay={150}
                      disableInteractive
                    >
                      <button
                        type="button"
                        data-nav-metric={metric.id}
                        className={
                          isDefault(toggles, metric.id)
                            ? s.navId
                            : `${s.navId} ${s.navChanged}`
                        }
                        aria-label={`${metric.name} (${metric.id})`}
                        aria-pressed={shown.includes(metric.id)}
                        aria-current={
                          active === metric.id ? "location" : undefined
                        }
                        onClick={() => onToggleShown(metric.id)}
                      >
                        {metric.id}
                      </button>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        <p className={s.navNote}>
          Select an ID to show or hide its metric. Underlined: at the top of the
          page. Dashed: display changed from the design default.
        </p>
      </nav>
    )
  },
)
MetricNav.displayName = "MetricNav"
