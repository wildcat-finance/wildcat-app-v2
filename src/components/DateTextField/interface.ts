import { Dayjs } from "dayjs"

export type DateTextFieldProps = {
  value: Dayjs | null
  onValueChange: (date: Dayjs | null) => void
  min?: Dayjs
  max?: Dayjs
}
