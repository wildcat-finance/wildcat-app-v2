// Temporary: the metric review page (product#917). Remove with the page.

import s from "./review.module.css"

/** Points right when its section is collapsed (see .groupToggle). */
export const Chevron = () => (
  <span className={s.chevron} aria-hidden="true">
    <svg viewBox="0 0 16 16" width="16" height="16">
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
)
