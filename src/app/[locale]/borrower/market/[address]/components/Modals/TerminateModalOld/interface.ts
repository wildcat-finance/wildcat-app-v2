import { Dispatch, SetStateAction } from "react"

export type TerminateModalProps = {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}
