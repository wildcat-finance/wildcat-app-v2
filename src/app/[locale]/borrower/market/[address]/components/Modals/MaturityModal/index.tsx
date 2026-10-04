import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Button, Dialog, SvgIcon } from "@mui/material"
import { DesktopDatePicker } from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import {
  HooksKind,
  MarketAccount,
  SetFixedTermEndTimeStatus,
} from "@wildcatfi/wildcat-sdk"
import { Dayjs } from "dayjs"
import { useTranslation } from "react-i18next"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import ArrowLeftIcon from "@/assets/icons/sharpArrow_icon.svg"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import {
  formatUtcMaturity,
  pickerDateToUtcMaturity,
  utcMaturityToPickerDate,
  utcTodayAsPickerDate,
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

  const preview = maturity?.isValid()
    ? marketAccount.previewSetFixedTermEndTime(
        pickerDateToUtcMaturity(maturity),
      )
    : undefined
  const maturityError =
    preview && preview.status !== SetFixedTermEndTimeStatus.Ready
      ? SDK_ERRORS_MAPPING.setMaturity[preview.status]
      : undefined

  const handleOpen = () => {
    modal.handleOpenModal()
    setMaturity(undefined)
  }

  const handleConfirm = () => {
    if (!maturity) throw Error("Maturity is required")
    mutate(pickerDateToUtcMaturity(maturity))
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
  }

  const disableAdjustMaturity =
    market.isClosed || market.hasFrozenHookParameters

  const disableConfirm =
    disableAdjustMaturity || preview?.status !== SetFixedTermEndTimeStatus.Ready

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  const hooksConfig =
    market.hooksConfig?.kind === HooksKind.FixedTerm
      ? market.hooksConfig
      : undefined

  // Bounds on the UTC calendar, matching what `handleConfirm` writes. The old
  // `maxDate` came from a local-mode dayjs, so the current maturity could land
  // on the previous or next day and the borrower was offered a date the chain
  // rejects as an increase - or denied the one it would accept.
  const today = utcTodayAsPickerDate()

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
        {t("marketDetails.borrower.adjustMaturity")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={t("marketDetails.borrower.adjustMaturity")}
            arrowOnClick={modal.handleCloseModal}
            crossOnClick={null}
          />
        )}

        {showForm && (
          <Box sx={{ width: "100%", height: "100%", padding: "12px 24px" }}>
            <ModalDataItem
              title={t("marketDetails.borrower.currentMaturity")}
              value={
                hooksConfig
                  ? formatUtcMaturity(hooksConfig.fixedTermEndTime)
                  : "-"
              }
              containerSx={{
                marginBottom: "14px",
              }}
            />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DesktopDatePicker
                label={t("common.placeholders.dateExampleHint")}
                format="DD/MM/YYYY"
                value={maturity}
                onChange={(v) => {
                  setMaturity(v)
                }}
                minDate={today}
                maxDate={utcMaturityToPickerDate(hooksConfig!.fixedTermEndTime)}
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
          mainBtnText="Confirm"
          mainBtnOnClick={handleConfirm}
          disableMainBtn={disableConfirm}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
