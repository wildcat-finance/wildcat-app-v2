import { Dispatch, SetStateAction } from "react"

import { Dayjs } from "dayjs"

// A partly typed date is held as an invalid Dayjs, not as null, so a caller can
// tell "no date" from "unfinished date" with `isValid()`.
export type DateRangeDates = {
  starting: Dayjs | null
  ending: Dayjs | null
}

export type DateRangeProps = {
  dates: DateRangeDates
  setDates: Dispatch<SetStateAction<DateRangeDates>>
  disabled?: boolean
  calendar?: "inline" | "popover"
}
