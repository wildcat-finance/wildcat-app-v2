import { useEffect, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useRouter } from "next/navigation"

import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import CircledCrossRed from "@/assets/icons/circledCrossRed_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { Loader } from "@/components/Loader"
import { mockedMarketTypesOptions } from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { STEPS_NAME } from "@/store/slices/routingSlice/flowsSteps"
import { setPreviousStep } from "@/store/slices/routingSlice/routingSlice"

import { ConfirmationFormItem } from "./ConfirmationFormItem"
import {
  DeployButtonContainer,
  DeployCloseButtonIcon,
  DeployContentContainer,
  DeployMainContainer,
  DeployHeaderContainer,
  DeploySubtitle,
  DeployTypoBox,
} from "./deploy-style"
import {
  ButtonContainer,
  ButtonStyle,
  CrossButton,
  DialogContainer,
  DividerStyle,
  FooterModalContainer,
  FormModalContainer,
  FormModalGroupContainer,
  Gradient,
  HeaderModalContainer,
  MLAButton,
  MLATitle,
  Note,
} from "./review-style"
import { ConfirmationModalProps } from "./type"

export const ConfirmationModal = ({
  open,
  tokenAsset,
  getMarketValues,
  getInfoValues,
  handleDeployMarket,
  isLoading,
  isError,
  isSuccess,
}: ConfirmationModalProps) => {
  const router = useRouter()
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
  }, [isError])

  const handleResetModal = () => {
    setShowErrorPopup(false)
  }

  const dispatch = useAppDispatch()

  const hideLegalInfoStep = useAppSelector(
    (state) => state.routing.hideInfoStep,
  )

  const handleClickClose = () => {
    dispatch(
      setPreviousStep(
        hideLegalInfoStep
          ? STEPS_NAME.marketDescription
          : STEPS_NAME.legalInformation,
      ),
    )
  }

  const handleGoToMarkets = () => {
    router.push(`${ROUTES.borrower.root}`)
  }

  const marketTypeValue = mockedMarketTypesOptions.find(
    (el) => el.value === getMarketValues("marketType"),
  )?.label

  if (showErrorPopup) {
    return (
      <Dialog open={open} onClose={handleClickClose} sx={DialogContainer}>
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
                Oops! Something goes wrong
              </Typography>
              <Typography variant="text3" sx={DeploySubtitle}>
                Explanatory message about the problem.
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
              Back to review step
            </Button>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => {
                handleResetModal()
                handleDeployMarket()
              }}
            >
              Try Again
            </Button>
          </Box>
        </Box>
      </Dialog>
    )
  }

  if (isSuccess) {
    return (
      <Dialog open={open} sx={DialogContainer}>
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
              <Typography variant="title3">Market was created</Typography>
              <Typography variant="text3" sx={DeploySubtitle}>
                Market successfully created. You can onboard Lenders and borrow
                money now.
              </Typography>
            </Box>
          </Box>

          <Box sx={DeployButtonContainer}>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
            >
              View and download MLA
            </Button>
            <Button
              onClick={handleGoToMarkets}
              variant="contained"
              size="large"
              fullWidth
            >
              Go to the Markets
            </Button>
          </Box>
        </Box>
      </Dialog>
    )
  }

  if (isLoading) {
    return (
      <Dialog open={open} sx={DialogContainer}>
        <Box sx={DeployContentContainer} rowGap="24px">
          <Loader />

          <Box sx={DeployTypoBox}>
            <Typography variant="text1">Just wait a bit...</Typography>
            <Typography variant="text3" sx={DeploySubtitle}>
              Transaction in process.
            </Typography>
          </Box>
        </Box>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={handleClickClose} sx={DialogContainer}>
      <Box sx={HeaderModalContainer}>
        <Box width="20px" height="20px" />

        <Typography variant="title3">
          Review your new market’s details
        </Typography>

        <IconButton onClick={handleClickClose}>
          <SvgIcon fontSize="big" sx={CrossButton}>
            <Cross />
          </SvgIcon>
        </IconButton>
      </Box>

      <Box sx={FormModalContainer}>
        <Typography variant="text3">DEFINITION</Typography>

        <Box sx={FormModalGroupContainer}>
          <ConfirmationFormItem
            label="Market Name"
            value={getMarketValues("marketName")}
          />
          <ConfirmationFormItem
            label="Market Type"
            value={marketTypeValue || ""}
          />
          <ConfirmationFormItem
            label="Underlying asset"
            value={tokenAsset?.name || ""}
          />
          <ConfirmationFormItem
            label="Market token name"
            value={getMarketValues("namePrefix")}
          />
          <ConfirmationFormItem
            label="Market token symbol"
            value={`${getMarketValues("symbolPrefix")}${tokenAsset?.symbol}`}
          />
          {getMarketValues("mla") === "wildcatMLA" && (
            <Box display="flex" flexDirection="column" rowGap="6px">
              <Typography variant="text3" sx={MLATitle}>
                Market Master Loan Agreement
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                sx={MLAButton}
              >
                View MLA
              </Button>
            </Box>
          )}
        </Box>

        <Divider sx={DividerStyle} />

        <Typography variant="text3">AMOUNT AND DUTIES</Typography>

        <Box sx={FormModalGroupContainer}>
          <ConfirmationFormItem
            label="Max. Borrowing Capacity"
            value={`${getMarketValues("maxTotalSupply")} ${tokenAsset?.symbol}`}
          />
          <ConfirmationFormItem
            label="Base APR"
            value={`${getMarketValues("annualInterestBips")}%`}
          />
          <ConfirmationFormItem
            label="Penalty APR"
            value={`${getMarketValues("delinquencyFeeBips")}%`}
          />
          <ConfirmationFormItem
            label="Reserve Ratio"
            value={`${getMarketValues("reserveRatioBips")}%`}
          />
          <ConfirmationFormItem
            label="Minimum Deposit"
            value={`${getMarketValues("minimumDeposit")} ${tokenAsset?.symbol}`}
          />
        </Box>

        <Divider sx={DividerStyle} />

        <Typography variant="text3">GRACE AND WITHDRAWALS</Typography>

        <Box
          sx={FormModalGroupContainer}
          marginBottom={hideLegalInfoStep ? "40px" : ""}
        >
          <ConfirmationFormItem
            label="Grace period"
            value={`${getMarketValues("delinquencyGracePeriod")} hours`}
          />
          <ConfirmationFormItem
            label="Withdrawal cycle length"
            value={`${getMarketValues("withdrawalBatchDuration")} hours`}
          />
        </Box>

        {!hideLegalInfoStep && getInfoValues && (
          <>
            <Divider sx={DividerStyle} />

            <Typography variant="text3">BORROWER INFO</Typography>

            <Box sx={FormModalGroupContainer} marginBottom="40px">
              <ConfirmationFormItem
                label="Legal Name and Jurisdiction"
                value={`${getInfoValues("legalName")} / ${getInfoValues(
                  "jurisdiction",
                )}`}
              />
              <ConfirmationFormItem
                label="Address"
                value={getInfoValues("address")}
              />
              <ConfirmationFormItem
                label="Email"
                value={getInfoValues("email")}
              />
            </Box>
          </>
        )}
      </Box>

      <Box sx={Gradient} />

      <Box sx={FooterModalContainer}>
        <Box sx={ButtonContainer}>
          {!hideLegalInfoStep && (
            <Button size="large" variant="contained" sx={ButtonStyle}>
              Sign MLA
            </Button>
          )}
          <Button
            size="large"
            variant="contained"
            sx={ButtonStyle}
            onClick={handleDeployMarket}
          >
            Deploy Market
          </Button>
        </Box>
        <Typography variant="text3" sx={Note}>
          Note that once your market is created, the only adjustable parameters
          will be base APR and maximum capacity.
        </Typography>
      </Box>
    </Dialog>
  )
}
