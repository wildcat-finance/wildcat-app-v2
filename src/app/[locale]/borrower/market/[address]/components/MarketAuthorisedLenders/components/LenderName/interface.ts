import { Dispatch, SetStateAction } from "react"

export type LenderNameProps = {
  lenderName?: string
  address: string
  setLendersName: Dispatch<SetStateAction<{ [key: string]: string }>>
}
