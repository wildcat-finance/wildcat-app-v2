import { Dispatch, SetStateAction } from "react"

export type MarketsFilterSelectItem = { id: string; name: string }

export type MarketsFilterSelectProps = {
  placeholder: string
  options: MarketsFilterSelectItem[]
  selected: MarketsFilterSelectItem[]
  setSelected: Dispatch<SetStateAction<MarketsFilterSelectItem[]>>
}
