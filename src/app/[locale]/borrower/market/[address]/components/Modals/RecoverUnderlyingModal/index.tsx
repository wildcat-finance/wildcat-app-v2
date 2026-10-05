import { useState } from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { MarketAccount, RecoverUnderlyingStatus } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { formatTokenWithCommas } from "@/utils/formatters"

import {
  useRecoverUnderlying,
  useRecoverUnderlyingQuote,
} from "../../../hooks/useRecoverUnderlying"
import { ErrorModal } from "../FinalModals/ErrorModal"
import { LoadingModal } from "../FinalModals/LoadingModal"
import { SuccessModal } from "../FinalModals/SuccessModal"
import { TxModalDialog } from "../style"

const STATUS_KEYS = {
  [RecoverUnderlyingStatus.UnsupportedMarket]:
    "marketDetails.recovery.unsupported",
  [RecoverUnderlyingStatus.NotBorrower]: "marketDetails.recovery.notBorrower",
  [RecoverUnderlyingStatus.MarketOpen]: "marketDetails.recovery.marketOpen",
  [RecoverUnderlyingStatus.LiveDataRequired]:
    "marketDetails.recovery.quoteError",
  [RecoverUnderlyingStatus.NoRecoverableUnderlying]:
    "marketDetails.recovery.noSurplus",
} as const

export const RecoverUnderlyingModal = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [txHash, setTxHash] = useState<string>()
  const mutation = useRecoverUnderlying(marketAccount, setTxHash)
  const showForm =
    !mutation.isPending && !mutation.isSuccess && !mutation.isError
  const quote = useRecoverUnderlyingQuote(marketAccount, open && showForm)
  const { market } = marketAccount
  const supported = market.repaymentDate !== undefined
  const quoteReady =
    !quote.isError &&
    !quote.isFetching &&
    quote.data?.status === RecoverUnderlyingStatus.Ready
  const statusMessage = (() => {
    if (quote.isError) return t("marketDetails.recovery.quoteError")
    if (quote.isFetching) return t("marketDetails.recovery.loading")
    if (quote.data && quote.data.status !== RecoverUnderlyingStatus.Ready)
      return t(STATUS_KEYS[quote.data.status])
    return undefined
  })()
  const close = () => {
    if (mutation.isPending) return
    setOpen(false)
    mutation.reset()
    setTxHash(undefined)
  }

  if (!supported || !marketAccount.isBorrower) return null

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        disabled={!market.isClosed}
        onClick={() => setOpen(true)}
      >
        {t("marketDetails.recovery.button")}
      </Button>
      <Dialog open={open} onClose={close} sx={TxModalDialog}>
        {showForm && (
          <>
            <TxModalHeader
              title={t("marketDetails.recovery.button")}
              arrowOnClick={close}
              crossOnClick={null}
            />
            <Box sx={{ p: "12px 24px" }}>
              <Typography variant="text2" component="p">
                {t("marketDetails.recovery.description")}
              </Typography>
              <Typography variant="title3" component="p" sx={{ my: "20px" }}>
                {quote.data && !quote.isError && !quote.isFetching
                  ? formatTokenWithCommas(quote.data.amount, {
                      withSymbol: true,
                      fractionDigits: market.underlyingToken.decimals,
                    })
                  : "—"}
              </Typography>
              <Typography variant="text3" component="p">
                {t("marketDetails.recovery.executionNotice")}
              </Typography>
              {statusMessage && (
                <Typography
                  role="status"
                  variant="text3"
                  component="p"
                  sx={{ mt: "12px" }}
                >
                  {statusMessage}
                </Typography>
              )}
              {quote.isError && (
                <Button size="small" onClick={() => quote.refetch()}>
                  {t("common.buttons.tryAgain")}
                </Button>
              )}
            </Box>
          </>
        )}
        {mutation.isPending && <LoadingModal txHash={txHash} />}
        {mutation.isSuccess && (
          <SuccessModal
            onClose={close}
            txHash={txHash}
            title={t("marketDetails.recovery.success")}
          />
        )}
        {mutation.isError && (
          <ErrorModal
            onClose={close}
            txHash={txHash}
            subtitle={t("marketDetails.recovery.failed")}
            onTryAgain={() => {
              mutation.reset()
              setTxHash(undefined)
            }}
          />
        )}
        <TxModalFooter
          mainBtnText={t("marketDetails.recovery.button")}
          mainBtnOnClick={() => mutation.mutate()}
          disableMainBtn={!quoteReady}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
