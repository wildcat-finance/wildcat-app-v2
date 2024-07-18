import { Dispatch, SetStateAction } from "react"

import { Dayjs } from "dayjs"

export type DateRangeProps = {
  dates: { starting: Dayjs | string | null; ending: Dayjs | string | null }
  setDates: Dispatch<
    SetStateAction<{
      starting: Dayjs | string | null
      ending: Dayjs | string | null
    }>
  >
}
