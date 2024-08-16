import type { Dispatch, SetStateAction } from "react"

export type AddLenderModalProps = {
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
