import { Dispatch, SetStateAction } from "react"

import { Dayjs } from "dayjs"

export type DateRangeProps = {
  dates: { starting: Dayjs | null; ending: Dayjs | null }
  setDates: Dispatch<
    SetStateAction<{
      starting: Dayjs | null
      ending: Dayjs | null
    }>
  >
}
