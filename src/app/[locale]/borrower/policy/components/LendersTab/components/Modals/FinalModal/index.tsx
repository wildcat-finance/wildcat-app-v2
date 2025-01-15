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
}

export const FinalModal = ({
  isLoading,
  isSuccess,
  isError,
}: FinalModalProps) => {
  const [open, setIsOpen] = useState<boolean>(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const handleClickClose = () => {
    setIsOpen(false)
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
                <Typography variant="title3">test</Typography>
                <Typography variant="text3" sx={DeploySubtitle}>
                  test
                </Typography>
              </Box>
            </Box>

            <Box sx={DeployButtonContainer}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                // onClick={() => {
                //   handleResetModal()
                //   setFinalOpen(false)
                // }}
              >
                test
              </Button>
              <Button
                variant="contained"
                size="large"
                fullWidth
                // onClick={() => {
                //   handleResetModal()
                //   handleDeployMarket()
                // }}
              >
                test
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
              <Typography variant="title3">test</Typography>
              <Typography variant="text3" sx={DeploySubtitle}>
                test
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {isLoading && (
        <Box sx={DeployContentContainer} rowGap="24px">
          <Loader />

          <Box sx={DeployTypoBox}>
            <Typography variant="text1">test</Typography>
            <Typography variant="text3" sx={DeploySubtitle}>
              test
            </Typography>
          </Box>
        </Box>
      )}
    </Dialog>
  )
}
