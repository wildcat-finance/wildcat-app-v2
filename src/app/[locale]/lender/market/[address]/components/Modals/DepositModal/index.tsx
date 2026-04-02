import React, { ChangeEvent, useEffect, useMemo, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  SvgIcon,
  Tooltip,
  Typography,
} from "@mui/material"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { DepositStatus, Signer, HooksKind } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { useApprove } from "@/app/[locale]/borrower/market/[address]/hooks/useGetApproval"
import Alert from "@/assets/icons/circledAlert_icon.svg"
import Clock from "@/assets/icons/clock_icon.svg"
import { DepositAlert } from "@/components/DepositAlert"
import { LinkGroup } from "@/components/LinkComponent"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { formatDate } from "@/lib/mla"
import { COLORS } from "@/theme/colors"
import { isUSDTLikeToken } from "@/utils/constants"
import { SDK_ERRORS_MAPPING } from "@/utils/errors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { DepositModalProps } from "./interface"
import { useDeposit } from "../../../hooks/useDeposit"

export const DepositModal = ({
  marketAccount,
  isMobileOpen,
  setIsMobileOpen,
}: DepositModalProps) => {
  const isMobile = useMobileResolution()

  const { t } = useTranslation()
  const { getTxUrl } = useBlockExplorer()

  const { market } = marketAccount

  const [amount, setAmount] = useState("")

  const [depositError, setDepositError] = useState<string | undefined>()

  const { connected: isConnectedToSafe } = useSafeAppsSDK()

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)

  const [txHash, setTxHash] = useState<string | undefined>("")

  const {
    mutate: deposit,
    isPending: isDepositing,
    isSuccess: isDeposed,
    isError: isDepositError,
    reset: resetDeposit,
  } = useDeposit(marketAccount, setTxHash)

  const { mutateAsync: approve, isPending: isApproving } = useApprove(
    market.underlyingToken,
    market,
    setTxHash,
  )

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  // user inputted amount
  const depositTokenAmount = useMemo(
    () => marketAccount.market.underlyingToken.parseAmount(amount || "0"),
    [amount],
  )
  const minimumDeposit = market.hooksConfig?.minimumDeposit

  // TODO: remove after fixing previewDeposit in wildcat.ts
  const getDepositStatus = () => {
    const status = marketAccount.depositAvailability
    if (status !== DepositStatus.Ready) return { status }
    if (depositTokenAmount.gt(market.maximumDeposit)) {
      return { status: DepositStatus.ExceedsMaximumDeposit }
    }
    if (depositTokenAmount.gt(marketAccount.underlyingBalance)) {
      return { status: DepositStatus.InsufficientBalance }
    }
    if (minimumDeposit && depositTokenAmount.lt(minimumDeposit)) {
      return { status: DepositStatus.BelowMinimumDeposit }
    }
    if (!marketAccount.isApprovedFor(depositTokenAmount)) {
      return { status: DepositStatus.InsufficientAllowance }
    }
    return { status: DepositStatus.Ready }
  }

  const depositStep = getDepositStatus().status

  const isAllowanceSufficient = marketAccount.isApprovedFor(depositTokenAmount)

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const handleDeposit = () => {
    setTxHash("")
    deposit(depositTokenAmount)
  }

  const handleTryAgain = () => {
    setTxHash("")
    handleDeposit()
  }

  const handleApprove = () => {
    setTxHash("")

    if (!isAllowanceSufficient) {
      if (
        marketAccount.underlyingApproval.gt(0) &&
        isUSDTLikeToken(market.underlyingToken.address)
      ) {
        approve(depositTokenAmount.token.getAmount(0)).then(() => {
          approve(depositTokenAmount).then(() => {
            if (depositTokenAmount.gt(marketAccount.underlyingBalance)) {
              setAmount("")
            }
          })
        })
      } else {
        approve(depositTokenAmount).then(() => {
          if (depositTokenAmount.gt(marketAccount.underlyingBalance)) {
            setAmount("")
          }
        })
      }
    }
  }

  const mustResetAllowance =
    !isAllowanceSufficient &&
    marketAccount.underlyingApproval.gt(0) &&
    isUSDTLikeToken(market.underlyingToken.address)

  const disableApprove =
    market.isClosed ||
    depositTokenAmount.raw.isZero() ||
    depositTokenAmount.raw.gt(market.maximumDeposit.raw) ||
    isAllowanceSufficient ||
    isApproving ||
    !Signer.isSigner(market.provider)

  const disableDeposit =
    !!depositError ||
    market.isClosed ||
    depositTokenAmount.raw.isZero() ||
    depositTokenAmount.raw.gt(market.maximumDeposit.raw) ||
    (depositStep === "InsufficientAllowance" && !isConnectedToSafe) ||
    depositStep === "InsufficientBalance" ||
    isApproving

  const isApprovedButton =
    isAllowanceSufficient && !depositTokenAmount.raw.isZero() && !isApproving

  const isFixedTerm = market.isInFixedTerm
  const fixedTermMaturity =
    market.hooksConfig?.kind === HooksKind.FixedTerm
      ? market.hooksConfig.fixedTermEndTime
      : undefined
  const earlyTermination =
    market.hooksConfig?.kind === HooksKind.FixedTerm
      ? market.hooksConfig.allowClosureBeforeTerm
      : false
  const earlyMaturity =
    market.hooksConfig?.kind === HooksKind.FixedTerm
      ? market.hooksConfig.allowTermReduction
      : false

  const showForm = !(isDepositing || showSuccessPopup || showErrorPopup)

  const underlyingBalanceIsZero = marketAccount.underlyingBalance.raw.isZero()

  const tooltip = underlyingBalanceIsZero
    ? t("marketDetailsLender.deposit.zeroBalance")
    : t("marketDetailsLender.deposit.fullCapacity")

  useEffect(() => {
    if (amount === "" || amount === "0" || depositStep === "Ready") {
      setDepositError(undefined)
      return
    }

    if (depositStep === "InsufficientBalance") {
      if (isAllowanceSufficient) {
        // approval is sufficient but balance too low to deposit this amount
        setDepositError(SDK_ERRORS_MAPPING.deposit[depositStep])
      } else {
        // warn that this is above balance but you can approve if you want to
        setDepositError(t("marketDetailsLender.deposit.exceedsBalance"))
      }
      return
    }

    setDepositError(SDK_ERRORS_MAPPING.deposit[depositStep])
  }, [
    depositStep,
    amount,
    isAllowanceSufficient,
    marketAccount.underlyingBalance,
    market.underlyingToken.symbol,
  ])

  useEffect(() => {
    if (isMobileOpen) {
      modal.handleOpenModal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileOpen])

  useEffect(() => {
    if (isDepositError) {
      setShowErrorPopup(true)
    }
    if (isDeposed) {
      setShowSuccessPopup(true)
    }
  }, [isDepositError, isDeposed])

  const handleModalArrowClick = () => {
    if (modal.gettingValueStep && !!setIsMobileOpen) {
      setIsMobileOpen(false)
    }
    modal.handleClickBack()
  }

  const handleCloseMobileModal = () => {
    setShowSuccessPopup(false)
    setShowErrorPopup(false)
    resetDeposit()
    modal.handleCloseModal()
    if (setIsMobileOpen) {
      setIsMobileOpen(false)
    }
  }

  const progressAmount = () => {
    if (modal.gettingValueStep) return 33
    if (isDepositing) return 66
    if (showSuccessPopup) return 100

    return 0
  }

  if (isMobile && isMobileOpen)
    return (
      <>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: COLORS.white,
            borderRadius: "14px",
            paddingBottom: "12px",
          }}
        >
          <TransactionHeader
            label={t("marketDetailsLender.transactions.deposit.modalTitle")}
            arrowOnClick={
              modal.hideArrowButton || !showForm ? null : handleModalArrowClick
            }
            crossOnClick={handleCloseMobileModal}
            progress={progressAmount()}
          />

          <Box
            sx={{
              padding: "32px 20px 0",
              width: "100%",
              height: "100%",
              backgroundColor: COLORS.white,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {modal.gettingValueStep && (
              <>
                <Typography variant="text2" lineHeight="24px">
                  {t("marketDetailsLender.deposit.chooseAmount")}
                </Typography>

                {minimumDeposit && (
                  <Typography
                    color={COLORS.santasGrey}
                    variant="text3"
                    lineHeight="24px"
                  >
                    {t("marketDetailsLender.deposit.minimumDeposit")}{" "}
                    <Typography
                      variant="text3"
                      lineHeight="24px"
                      color={COLORS.ultramarineBlue}
                    >
                      {formatTokenWithCommas(minimumDeposit, {
                        withSymbol: true,
                      })}
                    </Typography>
                  </Typography>
                )}

                <Typography
                  color={COLORS.santasGrey}
                  variant="text3"
                  lineHeight="24px"
                >
                  {t("marketDetailsLender.deposit.availableToDeposit")}{" "}
                  <Typography
                    variant="text3"
                    lineHeight="24px"
                    color={COLORS.ultramarineBlue}
                  >
                    {formatTokenWithCommas(marketAccount.maximumDeposit, {
                      withSymbol: true,
                    })}
                  </Typography>
                </Typography>

                <NumberTextField
                  label={formatTokenWithCommas(marketAccount.maximumDeposit)}
                  size="medium"
                  style={{
                    width: "100%",
                    marginTop: "12px",
                    marginBottom: "24px",
                  }}
                  value={amount}
                  onChange={handleAmountChange}
                  endAdornment={
                    <TextfieldChip
                      text={market.underlyingToken.symbol}
                      size="small"
                    />
                  }
                  disabled={isApproving}
                  error={
                    !!depositError &&
                    (depositStep !== "InsufficientBalance" ||
                      isAllowanceSufficient)
                  }
                  helperText={depositError}
                />
              </>
            )}

            <Box
              sx={{
                marginTop: "0px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {isFixedTerm && (
                <DepositAlert
                  text={
                    <Typography variant="mobText3">
                      {t("marketDetailsLender.deposit.fixedTermLocked", {
                        date: formatDate(fixedTermMaturity || 0),
                      })}
                    </Typography>
                  }
                  icon={
                    <SvgIcon
                      sx={{
                        fontSize: "16px",
                        "& path": { fill: COLORS.greySuit },
                        mt: "1px",
                      }}
                    >
                      <Clock />
                    </SvgIcon>
                  }
                />
              )}

              {isFixedTerm && earlyTermination && (
                <DepositAlert
                  text={
                    <Typography variant="mobText3">
                      {t("marketDetailsLender.deposit.earlyClose")}
                    </Typography>
                  }
                  icon={
                    <SvgIcon
                      sx={{
                        fontSize: "16px",
                        "& path": { fill: COLORS.white },
                        mt: "1px",
                      }}
                    >
                      <Alert />
                    </SvgIcon>
                  }
                />
              )}

              {isFixedTerm && earlyMaturity && (
                <DepositAlert
                  text={
                    <Typography variant="mobText3">
                      {t("marketDetailsLender.deposit.durationShorten")}
                    </Typography>
                  }
                  icon={
                    <SvgIcon
                      sx={{
                        fontSize: "16px",
                        "& path": { fill: COLORS.white },
                        mt: "1px",
                      }}
                    >
                      <Alert />
                    </SvgIcon>
                  }
                />
              )}

              {mustResetAllowance && (
                <DepositAlert
                  text={
                    <Typography variant="mobText3">
                      {t("marketDetailsLender.deposit.existingAllowance", {
                        amount: market.underlyingToken
                          .getAmount(marketAccount.underlyingApproval)
                          .format(market.underlyingToken.decimals, true),
                        tokenName: market.underlyingToken.symbol,
                      })}
                    </Typography>
                  }
                  icon={
                    <SvgIcon
                      sx={{
                        fontSize: "16px",
                        "& path": { fill: COLORS.white },
                        mt: "1px",
                      }}
                    >
                      <Alert />
                    </SvgIcon>
                  }
                />
              )}
            </Box>
          </Box>

          {txHash !== "" && showForm && (
            <LinkGroup
              type="etherscan"
              linkValue={getTxUrl(txHash as string)}
              groupSX={{ padding: "8px", marginBottom: "8px" }}
            />
          )}

          <TxModalFooter
            mainBtnText={t("marketDetailsLender.transactions.deposit.button")}
            secondBtnText={
              // eslint-disable-next-line no-nested-ternary
              isConnectedToSafe
                ? undefined
                : isApprovedButton
                  ? t("common.toast.approved")
                  : t("common.toast.approve")
            }
            secondBtnIcon={isApprovedButton && !isConnectedToSafe}
            mainBtnOnClick={handleDeposit}
            secondBtnOnClick={handleApprove}
            disableMainBtn={disableDeposit}
            disableSecondBtn={disableApprove}
            secondBtnLoading={isApproving}
            hideButtons={!showForm}
          />
        </Box>

        <Dialog
          open={isDepositing || showErrorPopup || showSuccessPopup}
          sx={{
            backdropFilter: "blur(10px)",

            "& .MuiDialog-paper": {
              height: "353px",
              width: "100%",
              border: "none",
              borderRadius: "20px",
              padding: "24px 0",
              margin: "auto 0 4px",
            },
          }}
        >
          {isDepositing && <LoadingModal txHash={txHash} />}
          {showErrorPopup && (
            <ErrorModal
              onTryAgain={handleTryAgain}
              onClose={() => {
                setShowErrorPopup(false)
                resetDeposit()
                modal.handleCloseModal()
                if (setIsMobileOpen) setIsMobileOpen(false)
              }}
              txHash={txHash}
            />
          )}
          {showSuccessPopup && (
            <SuccessModal
              onClose={() => {
                setShowSuccessPopup(false)
                resetDeposit()
                modal.handleCloseModal()
                if (setIsMobileOpen) setIsMobileOpen(false)
              }}
              txHash={txHash}
            />
          )}
        </Dialog>
      </>
    )

  if (!isMobile)
    return (
      <>
        {marketAccount.maximumDeposit.raw.isZero() ||
        underlyingBalanceIsZero ? (
          <Tooltip title={tooltip} placement="right">
            <Box sx={{ display: "flex" }}>
              <Button
                onClick={modal.handleOpenModal}
                variant="contained"
                size="large"
                sx={{ width: "152px" }}
                disabled={
                  marketAccount.maximumDeposit.raw.isZero() ||
                  underlyingBalanceIsZero
                }
              >
                {t("marketDetailsLender.transactions.deposit.button")}
              </Button>
            </Box>
          </Tooltip>
        ) : (
          <Button
            onClick={modal.handleOpenModal}
            variant="contained"
            size="large"
            sx={{ width: "152px" }}
            disabled={
              marketAccount.maximumDeposit.raw.isZero() ||
              underlyingBalanceIsZero
            }
          >
            {t("marketDetailsLender.transactions.deposit.button")}
          </Button>
        )}

        <Dialog
          open={modal.isModalOpen}
          onClose={isDepositing ? undefined : modal.handleCloseModal}
          sx={{
            "& .MuiDialog-paper": {
              height: "404px",
              width: "440px",
              border: "none",
              borderRadius: "20px",
              margin: 0,
              padding: "24px 0",
            },
          }}
        >
          {showForm && (
            <>
              <TxModalHeader
                title={t("marketDetailsLender.transactions.deposit.modalTitle")}
                arrowOnClick={
                  modal.hideArrowButton || !showForm
                    ? null
                    : modal.handleClickBack
                }
                crossOnClick={
                  modal.hideCrossButton ? null : modal.handleCloseModal
                }
              />

              {modal.gettingValueStep && (
                <Box width="100%" height="100%" padding="0 24px">
                  <ModalDataItem
                    title={t(
                      "marketDetailsLender.transactions.deposit.modalAvailable",
                    )}
                    value={formatTokenWithCommas(marketAccount.maximumDeposit, {
                      withSymbol: true,
                    })}
                    containerSx={{
                      padding: "0 12px",
                      marginTop: "16px",
                      marginBottom: minimumDeposit ? "8px" : "20px",
                    }}
                  />

                  {minimumDeposit && (
                    <ModalDataItem
                      title={t("marketDetailsLender.deposit.minimumDeposit")}
                      value={formatTokenWithCommas(minimumDeposit, {
                        withSymbol: true,
                      })}
                      containerSx={{
                        padding: "0 12px",
                        marginBottom: "20px",
                      }}
                    />
                  )}

                  <NumberTextField
                    label={formatTokenWithCommas(marketAccount.maximumDeposit)}
                    size="medium"
                    style={{ width: "100%" }}
                    value={amount}
                    onChange={handleAmountChange}
                    endAdornment={
                      <TextfieldChip
                        text={market.underlyingToken.symbol}
                        size="small"
                      />
                    }
                    disabled={isApproving}
                    error={
                      !!depositError &&
                      (depositStep !== "InsufficientBalance" ||
                        isAllowanceSufficient)
                    }
                    helperText={depositError}
                  />
                </Box>
              )}

              <Box
                sx={{
                  marginTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {isFixedTerm && (
                  <DepositAlert
                    text={
                      <Typography variant="mobText3">
                        {t("marketDetailsLender.deposit.fixedTermLocked", {
                          date: formatDate(fixedTermMaturity || 0),
                        })}
                      </Typography>
                    }
                    icon={
                      <SvgIcon
                        sx={{
                          fontSize: "16px",
                          "& path": { fill: COLORS.greySuit },
                          mt: "1px",
                        }}
                      >
                        <Clock />
                      </SvgIcon>
                    }
                  />
                )}

                {isFixedTerm && earlyTermination && (
                  <DepositAlert
                    text={
                      <Typography variant="mobText3">
                        {t("marketDetailsLender.deposit.earlyClose")}
                      </Typography>
                    }
                    icon={
                      <SvgIcon
                        sx={{
                          fontSize: "16px",
                          "& path": { fill: COLORS.white },
                          mt: "1px",
                        }}
                      >
                        <Alert />
                      </SvgIcon>
                    }
                  />
                )}

                {isFixedTerm && earlyMaturity && (
                  <DepositAlert
                    text={
                      <Typography variant="mobText3">
                        {t("marketDetailsLender.deposit.durationShorten")}
                      </Typography>
                    }
                    icon={
                      <SvgIcon
                        sx={{
                          fontSize: "16px",
                          "& path": { fill: COLORS.white },
                          mt: "1px",
                        }}
                      >
                        <Alert />
                      </SvgIcon>
                    }
                  />
                )}

                {mustResetAllowance && (
                  <DepositAlert
                    text={
                      <Typography variant="mobText3">
                        {t("marketDetailsLender.deposit.existingAllowance", {
                          amount: market.underlyingToken
                            .getAmount(marketAccount.underlyingApproval)
                            .format(market.underlyingToken.decimals, true),
                          tokenName: market.underlyingToken.symbol,
                        })}
                      </Typography>
                    }
                    icon={
                      <SvgIcon
                        sx={{
                          fontSize: "16px",
                          "& path": { fill: COLORS.white },
                          mt: "1px",
                        }}
                      >
                        <Alert />
                      </SvgIcon>
                    }
                  />
                )}
              </Box>
            </>
          )}

          {isDepositing && <LoadingModal txHash={txHash} />}
          {showErrorPopup && (
            <ErrorModal
              onTryAgain={handleTryAgain}
              onClose={() => {
                setShowErrorPopup(false)
                resetDeposit()
                modal.handleCloseModal()
              }}
              txHash={txHash}
            />
          )}
          {showSuccessPopup && (
            <SuccessModal onClose={modal.handleCloseModal} txHash={txHash} />
          )}

          {txHash !== "" && showForm && (
            <LinkGroup
              type="etherscan"
              linkValue={getTxUrl(txHash as string)}
              groupSX={{ padding: "8px", marginBottom: "8px" }}
            />
          )}

          <TxModalFooter
            mainBtnText={t("marketDetailsLender.transactions.deposit.button")}
            secondBtnText={
              // eslint-disable-next-line no-nested-ternary
              isConnectedToSafe
                ? undefined
                : isApprovedButton
                  ? t("common.toast.approved")
                  : t("common.toast.approve")
            }
            secondBtnIcon={isApprovedButton && !isConnectedToSafe}
            mainBtnOnClick={handleDeposit}
            secondBtnOnClick={handleApprove}
            disableMainBtn={disableDeposit}
            disableSecondBtn={disableApprove}
            secondBtnLoading={isApproving}
            hideButtons={!showForm}
          />
        </Dialog>
      </>
    )

  return null
}
