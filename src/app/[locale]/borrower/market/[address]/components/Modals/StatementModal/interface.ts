import { Dispatch, SetStateAction } from "react"

export type StatementModalProps = {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}
