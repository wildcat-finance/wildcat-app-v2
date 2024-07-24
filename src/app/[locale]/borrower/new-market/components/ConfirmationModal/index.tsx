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
import { useTranslation } from "react-i18next"

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
  FinalDialogContainer,
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
  const { t } = useTranslation()
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
      <Dialog open={open} onClose={handleClickClose} sx={FinalDialogContainer}>
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
                {t("createMarket.modal.error.title")}
              </Typography>
              <Typography variant="text3" sx={DeploySubtitle}>
                {t("createMarket.modal.error.message")}
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
              {t("createMarket.modal.button.back")}
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
              {t("createMarket.modal.button.tryAgain")}
            </Button>
          </Box>
        </Box>
      </Dialog>
    )
  }

  if (isSuccess) {
    return (
      <Dialog open={open} sx={FinalDialogContainer}>
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
              <Typography variant="title3">
                {t("createMarket.modal.success.title")}
              </Typography>
              <Typography variant="text3" sx={DeploySubtitle}>
                {t("createMarket.modal.success.message")}
              </Typography>
            </Box>
          </Box>

          <Box sx={DeployButtonContainer}>
            {getMarketValues("mla") === "wildcatMLA" && (
              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
              >
                {t("createMarket.modal.button.downloadMla")}
              </Button>
            )}
            <Button
              onClick={handleGoToMarkets}
              variant="contained"
              size="large"
              fullWidth
            >
              {t("createMarket.modal.button.toMarkets")}
            </Button>
          </Box>
        </Box>
      </Dialog>
    )
  }

  if (isLoading) {
    return (
      <Dialog open={open} sx={FinalDialogContainer}>
        <Box sx={DeployContentContainer} rowGap="24px">
          <Loader />

          <Box sx={DeployTypoBox}>
            <Typography variant="text1">
              {t("createMarket.modal.loading.title")}
            </Typography>
            <Typography variant="text3" sx={DeploySubtitle}>
              {t("createMarket.modal.loading.message")}
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
          {t("createMarket.modal.confirmation.title")}
        </Typography>

        <IconButton onClick={handleClickClose}>
          <SvgIcon fontSize="big" sx={CrossButton}>
            <Cross />
          </SvgIcon>
        </IconButton>
      </Box>

      <Box sx={FormModalContainer}>
        <Typography variant="text3">
          {t(
            "createMarket.forms.marketDescription.block.title.definition",
          ).toUpperCase()}
        </Typography>

        <Box sx={FormModalGroupContainer}>
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.marketName.title",
            )}
            value={getMarketValues("marketName")}
          />
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.marketType.title",
            )}
            value={marketTypeValue || ""}
          />
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.marketAsset.title",
            )}
            value={tokenAsset?.name || ""}
          />
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.marketTokenName.title",
            )}
            value={getMarketValues("namePrefix")}
          />
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.marketTokenSymbol.title",
            )}
            value={`${getMarketValues("symbolPrefix")}${tokenAsset?.symbol}`}
          />
          {getMarketValues("mla") === "wildcatMLA" && (
            <Box display="flex" flexDirection="column" rowGap="6px">
              <Typography variant="text3" sx={MLATitle}>
                {t("createMarket.modal.confirmation.mlaTitle")}
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                sx={MLAButton}
              >
                {t("createMarket.modal.button.viewMLA")}
              </Button>
            </Box>
          )}
        </Box>

        <Divider sx={DividerStyle} />

        <Typography variant="text3">
          {t(
            "createMarket.forms.marketDescription.block.title.amountDuties",
          ).toUpperCase()}
        </Typography>

        <Box sx={FormModalGroupContainer}>
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.capacity.title",
            )}
            value={`${getMarketValues("maxTotalSupply")} ${tokenAsset?.symbol}`}
          />
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.baseAPR.title",
            )}
            value={`${getMarketValues("annualInterestBips")}%`}
          />
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.penaltyAPR.title",
            )}
            value={`${getMarketValues("delinquencyFeeBips")}%`}
          />
          <ConfirmationFormItem
            label={t("createMarket.forms.marketDescription.block.ratio.title")}
            value={`${getMarketValues("reserveRatioBips")}%`}
          />
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.deposit.title",
            )}
            value={`${getMarketValues("minimumDeposit")} ${tokenAsset?.symbol}`}
          />
        </Box>

        <Divider sx={DividerStyle} />

        <Typography variant="text3">
          {t(
            "createMarket.forms.marketDescription.block.title.graceWithdrawals",
          ).toUpperCase()}
        </Typography>

        <Box
          sx={FormModalGroupContainer}
          marginBottom={hideLegalInfoStep ? "40px" : ""}
        >
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.gracePeriod.title",
            )}
            value={`${getMarketValues("delinquencyGracePeriod")} hours`}
          />
          <ConfirmationFormItem
            label={t(
              "createMarket.forms.marketDescription.block.withdrawalCycle.title",
            )}
            value={`${getMarketValues("withdrawalBatchDuration")} hours`}
          />
        </Box>

        {!hideLegalInfoStep && getInfoValues && (
          <>
            <Divider sx={DividerStyle} />

            <Typography variant="text3">
              {t("createMarket.modal.confirmation.borrowerInfo")}
            </Typography>

            <Box sx={FormModalGroupContainer} marginBottom="40px">
              <ConfirmationFormItem
                label={t(
                  "createMarket.modal.confirmation.legalNameJurisdiction",
                )}
                value={`${getInfoValues("legalName")} / ${getInfoValues(
                  "jurisdiction",
                )}`}
              />
              <ConfirmationFormItem
                label={t("createMarket.forms.legalInfo.block.address.title")}
                value={getInfoValues("address")}
              />
              <ConfirmationFormItem
                label={t("createMarket.forms.legalInfo.block.email.title")}
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
              {t("createMarket.modal.button.signMLA")}
            </Button>
          )}
          <Button
            size="large"
            variant="contained"
            sx={ButtonStyle}
            onClick={handleDeployMarket}
          >
            {t("createMarket.modal.button.deploy")}
          </Button>
        </Box>
        <Typography variant="text3" sx={Note}>
          {t("createMarket.modal.confirmation.note")}
        </Typography>
      </Box>
    </Dialog>
  )
}
