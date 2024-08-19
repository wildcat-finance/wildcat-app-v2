import type { Dispatch, SetStateAction } from "react"

type LednerDataType = {
  id: string
  isAuth: boolean
  address: string
  name: { name: string; address: string }
  markets: {
    marketName: string
    address: string
    marketStatus: "added" | "regular" | "deleted"
  }[]
  status: string
}

export type EditLendersTableProps = {
  rows: LednerDataType[]
  setRows: Dispatch<SetStateAction<LednerDataType[]>>
  setLendersName: Dispatch<SetStateAction<{ [key: string]: string }>>
}
