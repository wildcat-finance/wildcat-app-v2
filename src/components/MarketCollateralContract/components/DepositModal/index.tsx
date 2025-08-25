import * as React from "react"
import { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Link as MuiLink,
  SvgIcon,
  Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import {
  MarketAccount,
  MarketCollateralV1,
  Token,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { Trans, useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import {
  ModalSteps,
  useApprovalModal,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import Alert from "@/assets/icons/circledAlert_icon.svg"
import { DepositAlert } from "@/components/DepositAlert"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { COLORS } from "@/theme/colors"
import { isUSDTLikeToken } from "@/utils/constants"
import { formatTokenAmount, formatTokenWithCommas } from "@/utils/formatters"

import { useApprove } from "../../../../app/[locale]/borrower/market/[address]/hooks/useGetApproval"
import { useDepositCollateral } from "../../hooks/useDepositCollateral"

export type DepositModalProps = {
  marketAccount: MarketAccount
  collateralContract: MarketCollateralV1
}

const TOKEN_BALANCE_AND_ALLOWANCE_QUERY_KEY = "token-balance-and-allowance"

const useTokenBalanceAndAllowance = (token: Token, spender: string) => {
  const { address: owner } = useAccount()
  return useQuery({
    queryKey: [
      TOKEN_BALANCE_AND_ALLOWANCE_QUERY_KEY,
      token.address,
      owner,
      spender,
    ],
    enabled: !!owner && !!spender,
    queryFn: async () => {
      const tokenBalance = await token.contract.balanceOf(
        owner as `0x${string}`,
      )
      const allowance = await token.contract.allowance(
        owner as `0x${string}`,
        spender,
      )
      return { tokenBalance, allowance }
    },
  })
}

export const DepositModalContract = ({
  marketAccount,
  collateralContract,
}: DepositModalProps) => {
  const signer = useEthersSigner()
  const { t } = useTranslation()
  const [txHash, setTxHash] = useState<string | undefined>("")
  const [amount, setAmount] = useState("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const { collateralAsset } = collateralContract
  const {
    mutate: depositCollateral,
    isPending,
    isError,
    isSuccess,
  } = useDepositCollateral(collateralContract, setTxHash)

  useEffect(() => {
    if (signer && collateralContract.provider !== signer) {
      collateralContract.provider = signer
    }
    if (signer && collateralAsset.provider !== signer) {
      collateralAsset.provider = signer
    }
  }, [signer, collateralContract, collateralAsset])

  const modal = useApprovalModal(
    setShowSuccessPopup,
    setShowErrorPopup,
    setAmount,
    setTxHash,
  )

  const { data } = useTokenBalanceAndAllowance(
    collateralAsset,
    collateralContract.address,
  )
  const { tokenBalance, allowance } = data ?? {}

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setAmount(value)
  }

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  const depositStatus = React.useMemo(() => {
    if (allowance && tokenBalance && amount) {
      const amountToDeposit = collateralAsset.parseAmount(amount).raw.toBigInt()
      if (tokenBalance.lt(amountToDeposit)) {
        return "InsufficientBalance"
      }
      if (allowance.lt(amountToDeposit)) {
        if (isUSDTLikeToken(collateralAsset.address) && allowance.gt(0)) {
          return "RequiresResetAllowance"
        }
        return "InsufficientAllowance"
      }
      return "Approved"
    }
    return "Loading"
  }, [allowance, amount, tokenBalance, collateralAsset])

  const { mutateAsync: approve, isPending: isApproving } = useApprove(
    collateralAsset,
    collateralContract.address,
    setTxHash,
    [[TOKEN_BALANCE_AND_ALLOWANCE_QUERY_KEY]],
  )

  const amountToDeposit = amount
    ? collateralAsset.parseAmount(amount)
    : collateralAsset.parseAmount(0)

  const disableApprove =
    marketAccount.market.isClosed ||
    amountToDeposit.raw.isZero() ||
    depositStatus === "Approved" ||
    depositStatus === "InsufficientBalance" ||
    isApproving

  const disableDeposit =
    marketAccount.market.isClosed ||
    amountToDeposit.raw.isZero() ||
    depositStatus === "InsufficientBalance" ||
    depositStatus === "InsufficientAllowance" ||
    depositStatus === "RequiresResetAllowance" ||
    isApproving

  const handleApprove = () => {
    setTxHash("")
    if (depositStatus === "RequiresResetAllowance") {
      approve(collateralAsset.parseAmount(0)).then(() => {
        approve(amountToDeposit).then(() => {
          modal.setFlowStep(ModalSteps.approved)
        })
      })
      return
    }
    if (depositStatus === "InsufficientAllowance")
      approve(amountToDeposit).then(() => {
        modal.setFlowStep(ModalSteps.approved)
      })
  }

  const handleDeposit = () => {
    setTxHash("")
    depositCollateral(amountToDeposit)
  }

  const approveButtonText = React.useMemo(() => {
    if (isApproving || isPending) {
      return t("collateral.deposit.approving")
    }

    if (depositStatus === "RequiresResetAllowance") {
      return t("collateral.deposit.resetAllowance")
    }

    if (depositStatus === "Approved") {
      return "Approved"
    }

    return t("collateral.deposit.approve")
  }, [isPending, isApproving, depositStatus, t])

  const handleTryAgain = () => {
    handleDeposit()
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
  }

  return (
    <>
      <Button
        variant="contained"
        size="small"
        onClick={modal.handleOpenModal}
        sx={{ height: "fit-content", width: "90px" }}
      >
        {t("collateral.deposit.deposit")}
      </Button>

      <Dialog
        open={modal.isModalOpen}
        onClose={isPending ? undefined : modal.handleCloseModal}
        sx={{
          "& .MuiDialog-paper": {
            height: "560px",
            width: "500px",
            border: "none",
            borderRadius: "20px",
            margin: 0,
            padding: "24px 0",
          },
        }}
      >
        {showForm && (
          <TxModalHeader
            title={`Deposit for ${marketAccount.market.name}`}
            arrowOnClick={modal.handleCloseModal}
            crossOnClick={null}
          >
            <Typography variant="text3" color={COLORS.santasGrey}>
              It’s been already update lately.{" "}
              <MuiLink
                component={Link}
                href="https://docs.wildcat.finance"
                variant="inherit"
                underline="none"
                color={COLORS.ultramarineBlue}
                target="_blank"
              >
                {t("collateral.actions.learnMore")}
              </MuiLink>
            </Typography>
          </TxModalHeader>
        )}

        {showForm && (
          <Box width="100%" height="100%" padding="12px 24px">
            <Box padding="0 8px 0 12px">
              <ModalDataItem
                title={t("collateral.deposit.balance")}
                value={`${formatTokenAmount(
                  tokenBalance?.toBigInt() ?? BigInt(0),
                  collateralAsset.decimals,
                )} ${collateralAsset.symbol}`}
                containerSx={{
                  marginBottom: modal.approvedStep ? "20px" : "14px",
                }}
              />

              {modal.approvedStep && (
                <ModalDataItem
                  title="Amount to Deposit"
                  value={`${formatTokenWithCommas(amountToDeposit, {
                    fractionDigits: collateralAsset.decimals,
                  })} ${collateralAsset.symbol}`}
                  containerSx={{
                    marginBottom: "18px",
                  }}
                />
              )}
            </Box>

            {modal.gettingValueStep && (
              <NumberTextField
                label={`${formatTokenAmount(
                  tokenBalance?.toBigInt() ?? BigInt(0),
                  collateralAsset.decimals,
                )}`}
                size="medium"
                sx={{
                  width: "100%",
                }}
                value={amount}
                onChange={handleAmountChange}
                endAdornment={
                  <TextfieldChip text={collateralAsset.symbol} size="small" />
                }
              />
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                mt: "20px",
              }}
            >
              <DepositAlert
                text={
                  <Typography variant="text3" maxWidth="375px">
                    Collateral cannot be reclaimed until the underlying market
                    is terminated.
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

              <DepositAlert
                text={
                  <Typography variant="text3" maxWidth="375px">
                    At present, there is no reward for providing collateral.
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

              <DepositAlert
                text={
                  <Typography variant="text3" maxWidth="375px">
                    Depositors receive shares representing ownership of the
                    collateral assets.
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

              <DepositAlert
                text={
                  <Typography variant="text3" maxWidth="375px">
                    Shares lose value as collateral is liquidated, and future
                    deposits do not increase the value of existing shares.
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
            </Box>
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
          mainBtnText={t("collateral.deposit.deposit")}
          mainBtnOnClick={handleDeposit}
          disableMainBtn={disableDeposit}
          secondBtnText={approveButtonText}
          secondBtnOnClick={handleApprove}
          disableSecondBtn={disableApprove}
          secondBtnIcon={depositStatus === "Approved"}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
