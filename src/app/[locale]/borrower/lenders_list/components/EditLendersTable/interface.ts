import type { Dispatch, SetStateAction } from "react"

export type EditLendersTableProps = {
  rows: {
    id: string
    isAuth: boolean
    address: string
    name: { name: string; address: string }
    markets: { marketName: string; address: string }[]
    status: string
  }[]
  setRows: Dispatch<
    SetStateAction<
      {
        id: string
        isAuth: boolean
        address: string
        name: { name: string; address: string }
        markets: { marketName: string; address: string }[]
        status: string
      }[]
    >
  >
  setLendersName: Dispatch<SetStateAction<{ [key: string]: string }>>
}
