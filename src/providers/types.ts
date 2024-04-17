import { ReactNode } from "react"
import { State } from "wagmi"

export type GenericProviderProps = {
  children?: ReactNode
  initialState?: State | undefined
}
