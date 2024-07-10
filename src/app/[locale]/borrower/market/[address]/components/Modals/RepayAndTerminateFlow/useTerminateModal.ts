import { Dispatch, SetStateAction, useState } from "react"

export enum TerminateModalSteps {
  closedModal = 0,
  gettingValues = 1,
  approved = 2,
  repayLoading = 3,
  repayed = 4,
  terminateLoading = 5,
  final = 6,
}

export const useTerminateModal = (
  setShowSuccessPopup: Dispatch<SetStateAction<boolean>>,
  setShowErrorPopup: Dispatch<SetStateAction<boolean>>,
) => {
  const [isOpen, setIsOpen] = useState(false)
  const [flowStep, setFlowStep] = useState<TerminateModalSteps>(
    TerminateModalSteps.closedModal,
  )

  const closedModalStep = flowStep === TerminateModalSteps.closedModal
  const gettingValueStep = flowStep === TerminateModalSteps.gettingValues
  const approvedStep = flowStep === TerminateModalSteps.approved
  const repayLoadingStep = flowStep === TerminateModalSteps.repayLoading
  const repayedStep = flowStep === TerminateModalSteps.repayed
  const terminateLoadingStep = flowStep === TerminateModalSteps.terminateLoading
  const finalStep = flowStep === TerminateModalSteps.final

  const isModalOpen = isOpen && !closedModalStep

  const hideArrowButton =
    repayLoadingStep || repayedStep || terminateLoadingStep || finalStep
  const hideCrossButton =
    repayLoadingStep || terminateLoadingStep || gettingValueStep || approvedStep

  const handleOpenModal = () => {
    setShowSuccessPopup(false)
    setShowErrorPopup(false)
    setFlowStep(TerminateModalSteps.gettingValues)
    setIsOpen(true)
  }

  const handleCloseModal = () => {
    setIsOpen(false)
  }

  const handleClickBack = () => {
    setFlowStep(flowStep - 1)
  }

  return {
    isModalOpen,
    closedModalStep,
    gettingValueStep,
    approvedStep,
    repayLoadingStep,
    repayedStep,
    terminateLoadingStep,
    finalStep,
    hideArrowButton,
    hideCrossButton,
    handleOpenModal,
    handleCloseModal,
    handleClickBack,
    flowStep,
    setFlowStep,
    isOpen,
    setIsOpen,
  }
}
