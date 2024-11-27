import { Dispatch, SetStateAction, useState } from "react"

export enum ModalSteps {
  closedModal = 0,
  gettingValues = 1,
  approved = 2,
  loading = 3,
  final = 4,
}

export const useApprovalModal = (
  setShowSuccessPopup: Dispatch<SetStateAction<boolean>>,
  setShowErrorPopup: Dispatch<SetStateAction<boolean>>,
  setValue: Dispatch<SetStateAction<string>>,
  setTxHash: Dispatch<SetStateAction<string | undefined>>,
) => {
  const [open, setOpen] = useState(false)
  const [flowStep, setFlowStep] = useState<ModalSteps>(ModalSteps.closedModal)

  const closedModalStep = flowStep === ModalSteps.closedModal
  const gettingValueStep = flowStep === ModalSteps.gettingValues
  const approvedStep = flowStep === ModalSteps.approved
  const loadingStep = flowStep === ModalSteps.loading
  const finalStep = flowStep === ModalSteps.final

  const isModalOpen = open && !closedModalStep

  const hideArrowButton = loadingStep || finalStep
  const hideCrossButton = loadingStep || !finalStep

  const handleOpenModal = () => {
    setShowSuccessPopup(false)
    setShowErrorPopup(false)
    setValue("")
    setTxHash("")
    setFlowStep(ModalSteps.gettingValues)
    setOpen(true)
  }

  const handleCloseModal = () => {
    setOpen(false)
  }

  const handleClickBack = () => {
    setFlowStep(flowStep - 1)
  }

  return {
    isModalOpen,
    closedModalStep,
    gettingValueStep,
    approvedStep,
    loadingStep,
    finalStep,
    hideArrowButton,
    hideCrossButton,
    handleOpenModal,
    handleCloseModal,
    handleClickBack,
    flowStep,
    setFlowStep,
    open,
    setOpen,
  }
}
