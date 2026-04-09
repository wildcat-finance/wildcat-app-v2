import * as React from "react"
import { ChangeEvent, useEffect, useState } from "react"

import { Box, Button, Dialog, SvgIcon } from "@mui/material"
import { DesktopDatePicker } from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import {
  HooksKind,
  MarketAccount,
  SetFixedTermEndTimePreview,
  SetFixedTermEndTimeStatus,
} from "@wildcatfi/wildcat-sdk"
import dayjs, { Dayjs } from "dayjs"
import { useTranslation } from "react-i18next"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import ArrowLeftIcon from "@/assets/icons/sharpArrow_icon.svg"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import {
  formatTokenWithCommas,
  remainingMillisecondsToDate,
} from "@/utils/formatters"

import { useSetFixedTermEndTime } from "../../../hooks/useSetFixedTermEndTime"

const DateCalendarArrowLeft = () => (
  <SvgIcon
    sx={{
      "& path": { fill: `${COLORS.greySuit}` },
    }}
  >
    <ArrowLeftIcon />
  </SvgIcon>
)

const DateCalendarArrowRight = () => (
  <SvgIcon
    sx={{
      "& path": { fill: `${COLORS.greySuit}` },
    }}
    style={{ rotate: "180deg" }}
  >
    <ArrowLeftIcon />
  </SvgIcon>
)

export const MaturityModal = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const [txHash, setTxHash] = useState<string | undefined>("")
  const [newMaturity, setNewMaturity] = useState("")
  const [maturity, setMaturity] = useState<Dayjs | null | undefined>(undefined)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [maturityError, setMaturityError] = useState<string | undefined>(
    undefined,
  )
  const [preview, setPreview] = useState<
    SetFixedTermEndTimePreview | undefined
  >()
  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setNewMaturity,
    setTxHash,
  )

  const { mutate, isPending, isError, isSuccess } = useSetFixedTermEndTime(
    marketAccount,
    setTxHash,
  )

  const { t } = useTranslation()

  const { market } = marketAccount

  // todo: write hook for mutation

  const handleMaturityChange = (value: Dayjs | null) => {
    setMaturity(value)

    const newPreview = value
      ? marketAccount.previewSetFixedTermEndTime(value.unix())
      : undefined
    setPreview(newPreview)
    if (newPreview && newPreview.status !== SetFixedTermEndTimeStatus.Ready) {
      const errorMessages: {
        [key in Exclude<
          SetFixedTermEndTimeStatus,
          SetFixedTermEndTimeStatus.Ready
        >]: string
      } = {
        [SetFixedTermEndTimeStatus.FixedTermEndTimeIncrease]: t(
          "marketDetailsBorrower.modals.maturity.cannotIncrease",
        ),
        [SetFixedTermEndTimeStatus.FixedTermEndTimeNotChangeable]: t(
          "marketDetailsBorrower.modals.maturity.notAllowed",
        ),
        [SetFixedTermEndTimeStatus.NotFixedTermMarket]: t(
          "marketDetailsBorrower.modals.maturity.notFixedTerm",
        ),
        [SetFixedTermEndTimeStatus.NotBorrower]: t(
          "marketDetailsBorrower.modals.maturity.notBorrower",
        ),
        [SetFixedTermEndTimeStatus.NotV2Market]: t(
          "marketDetailsBorrower.modals.maturity.notV2",
        ),
      }
      const errorMessage = errorMessages[newPreview.status]
      setMaturityError(errorMessage)
    } else {
      setMaturityError(undefined)
    }
  }

  const handleOpen = () => {
    modal.handleOpenModal()
    setMaturity(undefined)
  }

  const handleConfirm = () => {
    if (!maturity) throw Error("Maturity is required")
    mutate(maturity.unix())
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
  }

  const disableAdjustMaturity = market.isClosed

  const disableConfirm =
    !maturity || preview?.status !== SetFixedTermEndTimeStatus.Ready

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const hooksConfig =
    market.hooksConfig?.kind === HooksKind.FixedTerm
      ? market.hooksConfig
      : undefined

  const fixedTerm =
    hooksConfig && hooksConfig.fixedTermEndTime * 1000 - Date.now()

  const today = dayjs.unix(Date.now() / 1_000).startOf("day")

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        onClick={handleOpen}
        disabled={disableAdjustMaturity}
      >
        {t("marketDetailsBorrower.modals.maturity.title")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={t("marketDetailsBorrower.modals.maturity.title")}
            arrowOnClick={modal.handleCloseModal}
            crossOnClick={null}
          />
        )}

        {showForm && (
          <Box sx={{ width: "100%", height: "100%", padding: "12px 24px" }}>
            <ModalDataItem
              title={t("marketDetailsBorrower.modals.maturity.currentMaturity")}
              value={remainingMillisecondsToDate(fixedTerm || 0)}
              containerSx={{
                marginBottom: "14px",
              }}
            />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DesktopDatePicker
                label={t(
                  "marketDetailsBorrower.modals.maturity.datePlaceholder",
                )}
                format="DD/MM/YYYY"
                value={maturity}
                onChange={(v) => {
                  handleMaturityChange(v)
                }}
                minDate={today}
                maxDate={dayjs.unix(hooksConfig!.fixedTermEndTime)}
                slots={{
                  leftArrowIcon: DateCalendarArrowLeft,
                  rightArrowIcon: DateCalendarArrowRight,
                }}
                slotProps={{
                  layout: {
                    sx: {
                      "& .MuiYearCalendar-root": {
                        padding: "12px",
                      },
                    },
                  },
                  popper: {
                    sx: {
                      "& .MuiYearCalendar-root": {
                        padding: "12px",
                      },
                      "& .MuiPaper-root": {
                        padding: "10px",
                      },
                    },
                  },
                  textField: {
                    sx: {
                      minWidth: "100%",
                      "&.MuiFormControl-root.MuiTextField-root": {
                        border: `1px solid ${COLORS.whiteLilac}`,
                        borderRadius: "12px",
                      },

                      "& .MuiInputBase-root.MuiFilledInput-root": {
                        fontFamily: "inherit",
                        fontSize: pxToRem(14),
                        lineHeight: lh(20, 14),
                        fontWeight: 500,
                        backgroundColor: "transparent",

                        "&:before, &:after": {
                          display: "none",
                        },
                      },

                      "& .MuiInputBase-input.MuiFilledInput-input": {
                        height: "20px",
                        padding: "16px",
                      },
                    },
                    helperText: maturityError,
                    error: Boolean(maturityError),
                    FormHelperTextProps: {
                      sx: {
                        color: "wildWatermelon",
                        fontSize: pxToRem(11),
                        lineHeight: lh(16, 11),
                        letterSpacing: "normal",
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
        )}

        {isPending && <LoadingModal txHash={txHash} />}
        {showErrorPopup && (
          <ErrorModal
            onTryAgain={handleTryAgain}
            onClose={modal.handleCloseModal}
            txHash={txHash}
          />
        )}
        {showSuccessPopup && (
          <SuccessModal onClose={modal.handleCloseModal} txHash={txHash} />
        )}

        <TxModalFooter
          mainBtnText={t("common.actions.confirm")}
          mainBtnOnClick={handleConfirm}
          disableMainBtn={disableConfirm}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
