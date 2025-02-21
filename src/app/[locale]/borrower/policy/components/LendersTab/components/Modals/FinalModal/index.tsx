import { useEffect, useState } from "react"
import * as React from "react"

import { Box, Button, Dialog, IconButton, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import {
  DeployButtonContainer,
  DeployCloseButtonIcon,
  DeployContentContainer,
  DeployHeaderContainer,
  DeployMainContainer,
  DeploySubtitle,
  DeployTypoBox,
} from "@/app/[locale]/borrower/create-market/deploy-style"
import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import CircledCrossRed from "@/assets/icons/circledCrossRed_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { Loader } from "@/components/Loader"

export type FinalModalProps = {
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  handleTryAgain: () => void
}

export const FinalModal = ({
  isLoading,
  isSuccess,
  isError,
  handleTryAgain,
}: FinalModalProps) => {
  const [open, setIsOpen] = useState<boolean>(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const handleResetModal = () => {
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
  }

  const handleClickClose = () => {
    setIsOpen(false)
    handleResetModal()
  }

  useEffect(() => {
    if (isLoading) {
      setIsOpen(true)
    }
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
  }, [isLoading])

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : handleClickClose}
      sx={{
        "& .MuiDialog-paper": {
          height: "404px",
          width: "440px",
          border: "none",
          borderRadius: "20px",
          margin: 0,
          padding: 0,
        },
      }}
    >
      {showErrorPopup && (
        <>
          <Box sx={DeployHeaderContainer}>
            <Box width="20px" height="20px" />
            <IconButton disableRipple onClick={handleClickClose}>
              <SvgIcon fontSize="big" sx={DeployCloseButtonIcon}>
                <Cross />
              </SvgIcon>
            </IconButton>
          </Box>
          <Box padding="24px" sx={DeployContentContainer}>
            <Box margin="auto" sx={DeployMainContainer}>
              <SvgIcon fontSize="colossal">
                <CircledCrossRed />
              </SvgIcon>

              <Box sx={DeployTypoBox}>
                <Typography variant="title3">
                  Oops! Something went wrong!
                </Typography>
                <Typography variant="text3" sx={DeploySubtitle}>
                  Can you reach out to us and tell us how you got here?
                </Typography>
              </Box>
            </Box>

            <Box sx={DeployButtonContainer}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                onClick={handleResetModal}
              >
                Back
              </Button>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => {
                  handleResetModal()
                  handleTryAgain()
                }}
              >
                Try Again
              </Button>
            </Box>
          </Box>
        </>
      )}

      {showSuccessPopup && (
        <Box padding="24px" sx={DeployContentContainer}>
          <Box
            margin="auto"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              rowGap: "24px",
            }}
          >
            <SvgIcon fontSize="colossal">
              <CircledCheckBlue />
            </SvgIcon>

            <Box sx={DeployTypoBox}>
              <Typography variant="title3">Lenders were edited!</Typography>
              <Typography variant="text3" sx={DeploySubtitle}>
                Lenders were successfully edited: the rest is up to you!
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {isLoading && (
        <Box sx={DeployContentContainer} rowGap="24px">
          <Loader />

          <Box sx={DeployTypoBox}>
            <Typography variant="text1">Wait a second...</Typography>
            <Typography variant="text3" sx={DeploySubtitle}>
              Transaction in process.
            </Typography>
          </Box>
        </Box>
      )}
    </Dialog>
  )
}
