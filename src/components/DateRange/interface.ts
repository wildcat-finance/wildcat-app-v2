import { Dispatch, SetStateAction } from "react"

export type DateRangeDates = {
  starting: string | null
  ending: string | null
}

export type DateRangeProps = {
  dates: DateRangeDates
  setDates: Dispatch<SetStateAction<DateRangeDates>>
  disabled?: boolean
  calendar?: "inline" | "popover"
}
