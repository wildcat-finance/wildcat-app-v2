import React, { ChangeEvent, useEffect, useMemo, useState } from "react"

import { Box, Button, Dialog, Tooltip, Typography } from "@mui/material"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { DepositStatus, Signer, HooksKind } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import {
  ModalSteps,
  useApprovalModal,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { useApprove } from "@/app/[locale]/borrower/market/[address]/hooks/useGetApproval"
import { LinkGroup } from "@/components/LinkComponent"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { EtherscanBaseUrl, TargetChainId } from "@/config/network"
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

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const handleDeposit = () => {
    setTxHash("")
    deposit(depositTokenAmount)
  }

  const handleApprove = () => {
    setTxHash("")

    if (depositStep === "InsufficientAllowance") {
      if (
        marketAccount.underlyingApproval.gt(0) &&
        isUSDTLikeToken(market.underlyingToken.address)
      ) {
        approve(depositTokenAmount.token.getAmount(0)).then(() => {
          approve(depositTokenAmount).then(() => {
            modal.setFlowStep(ModalSteps.approved)
          })
        })
      } else {
        approve(depositTokenAmount).then(() => {
          modal.setFlowStep(ModalSteps.approved)
        })
      }
    }
  }

  const handleTryAgain = () => {
    setTxHash("")
    handleDeposit()
    setShowErrorPopup(false)
  }

  const mustResetAllowance =
    depositStep === "InsufficientAllowance" &&
    marketAccount.underlyingApproval.gt(0) &&
    isUSDTLikeToken(market.underlyingToken.address)

  const disableApprove =
    !!depositError ||
    market.isClosed ||
    depositTokenAmount.raw.isZero() ||
    depositTokenAmount.raw.gt(market.maximumDeposit.raw) ||
    depositStep === "Ready" ||
    depositStep === "InsufficientBalance" ||
    modal.approvedStep ||
    isApproving ||
    !(market.provider instanceof Signer)

  const disableDeposit =
    !!depositError ||
    market.isClosed ||
    depositTokenAmount.raw.isZero() ||
    depositTokenAmount.raw.gt(market.maximumDeposit.raw) ||
    (depositStep === "InsufficientAllowance" && !isConnectedToSafe) ||
    depositStep === "InsufficientBalance" ||
    isApproving

  const isApprovedButton =
    depositStep === "Ready" && !depositTokenAmount.raw.isZero() && !isApproving

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
    ? "Underlying token balance is zero"
    : "Market is at full capacity"

  useEffect(() => {
    if (isDepositError) {
      setShowErrorPopup(true)
    }
    if (isDeposed) {
      setShowSuccessPopup(true)
      setShowErrorPopup(false)
    }
  }, [isDepositError, isDeposed])

  useEffect(() => {
    if (amount === "" || amount === "0" || depositStep === "Ready") {
      setDepositError(undefined)
      return
    }

    setDepositError(SDK_ERRORS_MAPPING.deposit[depositStep])
  }, [depositStep, amount])

  useEffect(() => {
    if (isMobileOpen) {
      modal.setFlowStep(ModalSteps.gettingValues)
    }
  }, [isMobileOpen])

  const handleModalArrowClick = () => {
    if (modal.gettingValueStep && !!setIsMobileOpen) {
      setIsMobileOpen(false)
    }
    modal.handleClickBack()
  }

  const handleCloseMobileModal = () => {
    if (setIsMobileOpen) {
      modal.handleCloseModal()
      setIsMobileOpen(false)
    }
  }

  const progressAmount = () => {
    if (modal.gettingValueStep) return 33
    if (modal.approvedStep) return 66
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
            label={t("lenderMarketDetails.transactions.deposit.modal.title")}
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
                  Choose amount of tokens
                </Typography>

                {minimumDeposit && (
                  <Typography
                    color={COLORS.santasGrey}
                    variant="text3"
                    lineHeight="24px"
                  >
                    Minimum deposit{" "}
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
                  Available to deposit{" "}
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
                  error={!!depositError}
                  helperText={depositError}
                />
              </>
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {isFixedTerm && (
                <Typography
                  variant="text3"
                  lineHeight="24px"
                  color={COLORS.dullRed}
                >
                  {`‣ This is currently a fixed-term market: deposited funds will be unavailable to withdraw until ${formatDate(
                    fixedTermMaturity,
                  )}.`}
                </Typography>
              )}

              {isFixedTerm && earlyTermination && (
                <Typography
                  variant="text3"
                  lineHeight="24px"
                  color={COLORS.dullRed}
                >
                  ‣ This market also has a flag set that allows the borrower to
                  terminate it before maturity by repaying all debt.
                </Typography>
              )}

              {isFixedTerm && earlyMaturity && (
                <Typography
                  variant="text3"
                  lineHeight="24px"
                  color={COLORS.dullRed}
                >
                  ‣ This market also has a flag set that allows the borrower to
                  bring the maturity closer to the present day.
                </Typography>
              )}

              {mustResetAllowance && (
                <Typography
                  variant="text3"
                  lineHeight="24px"
                  color={COLORS.dullRed}
                >
                  ‣ You have an existing allowance of{" "}
                  {market.underlyingToken
                    .getAmount(marketAccount.underlyingApproval)
                    .format(market.underlyingToken.decimals, true)}{" "}
                  for this market.
                  <br />
                  {market.underlyingToken.symbol} requires that allowances be
                  reset to zero prior to being increased.
                  <br />
                  You will be prompted to execute two approval transactions to
                  first reset and then increase the allowance for this market.
                </Typography>
              )}
            </Box>

            {modal.approvedStep && (
              <ModalDataItem
                title={t(
                  "lenderMarketDetails.transactions.deposit.modal.confirm",
                )}
                value={formatTokenWithCommas(depositTokenAmount, {
                  withSymbol: true,
                })}
                containerSx={{
                  padding: "0 12px",
                  margin: "0",
                }}
              />
            )}
          </Box>

          {txHash !== "" && showForm && (
            <LinkGroup
              type="etherscan"
              linkValue={`${EtherscanBaseUrl}/tx/${txHash}`}
              groupSX={{ padding: "8px", marginBottom: "8px" }}
            />
          )}

          <TxModalFooter
            mainBtnText={t("lenderMarketDetails.transactions.deposit.button")}
            secondBtnText={
              // eslint-disable-next-line no-nested-ternary
              isConnectedToSafe
                ? undefined
                : isApprovedButton
                  ? "Approved"
                  : "Approve"
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
              onClose={handleCloseMobileModal}
              txHash={txHash}
            />
          )}
          {showSuccessPopup && (
            <SuccessModal onClose={handleCloseMobileModal} txHash={txHash} />
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
                {t("lenderMarketDetails.transactions.deposit.button")}
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
            {t("lenderMarketDetails.transactions.deposit.button")}
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
                title={t(
                  "lenderMarketDetails.transactions.deposit.modal.title",
                )}
                arrowOnClick={
                  modal.hideArrowButton || !showForm
                    ? null
                    : modal.handleClickBack
                }
                crossOnClick={
                  modal.hideCrossButton ? null : modal.handleCloseModal
                }
              />

              <Box width="100%" height="100%" padding="0 24px">
                {modal.gettingValueStep && (
                  <>
                    <ModalDataItem
                      title={t(
                        "lenderMarketDetails.transactions.deposit.modal.available",
                      )}
                      value={formatTokenWithCommas(
                        marketAccount.maximumDeposit,
                        {
                          withSymbol: true,
                        },
                      )}
                      containerSx={{
                        padding: "0 12px",
                        marginTop: "16px",
                        marginBottom: minimumDeposit ? "8px" : "20px",
                      }}
                    />

                    {minimumDeposit && (
                      <ModalDataItem
                        title="Minimum Deposit"
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
                      label={formatTokenWithCommas(
                        marketAccount.maximumDeposit,
                      )}
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
                      error={!!depositError}
                      helperText={depositError}
                    />
                  </>
                )}
              </Box>

              <Box width="100%" height="100%" padding="24px">
                {isFixedTerm && (
                  <Typography variant="text3" color={COLORS.dullRed}>
                    {`This is currently a fixed-term market: deposited funds will be unavailable to withdraw until ${formatDate(
                      fixedTermMaturity,
                    )}.`}
                  </Typography>
                )}
              </Box>

              <Box width="100%" height="100%" padding="0 24px">
                {isFixedTerm && earlyTermination && (
                  <Typography variant="text3" color={COLORS.dullRed}>
                    This market also has a flag set that allows the borrower to
                    terminate it before maturity by repaying all debt.
                  </Typography>
                )}
              </Box>

              <Box width="100%" height="100%" padding="0 24px">
                {isFixedTerm && earlyMaturity && (
                  <Typography variant="text3" color={COLORS.dullRed}>
                    This market also has a flag set that allows the borrower to
                    bring the maturity closer to the present day.
                  </Typography>
                )}
              </Box>

              {mustResetAllowance && (
                <Box width="100%" height="100%" padding="0 24px">
                  <Typography variant="text3" color={COLORS.dullRed}>
                    You have an existing allowance of{" "}
                    {market.underlyingToken
                      .getAmount(marketAccount.underlyingApproval)
                      .format(market.underlyingToken.decimals, true)}{" "}
                    for this market.
                    <br />
                    {market.underlyingToken.symbol} requires that allowances be
                    reset to zero prior to being increased.
                    <br />
                    You will be prompted to execute two approval transactions to
                    first reset and then increase the allowance for this market.
                  </Typography>
                </Box>
              )}

              <Box width="100%" height="100%" padding="0 24px">
                {modal.approvedStep && (
                  <ModalDataItem
                    title={t(
                      "lenderMarketDetails.transactions.deposit.modal.confirm",
                    )}
                    value={formatTokenWithCommas(depositTokenAmount, {
                      withSymbol: true,
                    })}
                    containerSx={{
                      padding: "0 12px",
                      margin: "16px 0 20px",
                    }}
                  />
                )}
              </Box>
            </>
          )}

          {isDepositing && <LoadingModal txHash={txHash} />}
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

          {txHash !== "" && showForm && (
            <LinkGroup
              type="etherscan"
              linkValue={`${EtherscanBaseUrl}/tx/${txHash}`}
              groupSX={{ padding: "8px", marginBottom: "8px" }}
            />
          )}

          <TxModalFooter
            mainBtnText={t("lenderMarketDetails.transactions.deposit.button")}
            secondBtnText={
              // eslint-disable-next-line no-nested-ternary
              isConnectedToSafe
                ? undefined
                : isApprovedButton
                  ? "Approved"
                  : "Approve"
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
