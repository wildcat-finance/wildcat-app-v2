import { Dispatch, SetStateAction } from "react"

import { Dayjs } from "dayjs"

export type DateRangeProps = {
  dates: { startDate: Dayjs; endDate: Dayjs }
  setDates: Dispatch<SetStateAction<{ startDate: Dayjs; endDate: Dayjs }>>
}
