import * as React from "react"
import { ChangeEvent, useEffect, useState } from "react"

import { Box, Button, Dialog, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import {
  MarketAccount,
  MarketCollateralV1,
  Token,
} from "@wildcatfi/wildcat-sdk"
import { Trans, useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useApprovalModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/hooks/useApprovalModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { isUSDTLikeToken } from "@/utils/constants"
import { formatTokenAmount } from "@/utils/formatters"

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

  const disableCollateralDeposit =
    marketAccount.market.isClosed ||
    isApproving ||
    isPending ||
    amount === "" ||
    amount === "0"

  const handleConfirm = () => {
    setTxHash("")
    const amountToDeposit = collateralAsset.parseAmount(amount)
    if (depositStatus === "RequiresResetAllowance") {
      approve(collateralAsset.parseAmount(0)).then(() => {
        approve(amountToDeposit)
      })
      return
    }
    if (depositStatus === "InsufficientAllowance") approve(amountToDeposit)
    if (depositStatus === "Approved") {
      depositCollateral(amountToDeposit)
    }
  }

  const buttonText = React.useMemo(() => {
    if (depositStatus === "InsufficientAllowance") {
      if (isApproving) return t("collateral.deposit.approving")
      return t("collateral.deposit.approve")
    }
    if (depositStatus === "InsufficientBalance") {
      return t("collateral.deposit.insufficientBalance")
    }
    if (depositStatus === "Approved") {
      if (isPending) return t("collateral.deposit.depositing")
      return t("collateral.deposit.deposit")
    }
    if (depositStatus === "RequiresResetAllowance") {
      if (isPending) return t("collateral.deposit.approving")
      return t("collateral.deposit.resetAllowance")
    }
    return t("collateral.deposit.deposit")
  }, [isPending, isApproving, depositStatus, t])

  const handleTryAgain = () => {
    handleConfirm()
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
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={`Deposit for ${marketAccount.market.name}`}
            arrowOnClick={modal.handleCloseModal}
            crossOnClick={null}
          />
        )}

        {showForm && (
          <Box sx={{ width: "100%", height: "100%", padding: "12px 24px" }}>
            <ModalDataItem
              title={t("collateral.deposit.balance")}
              value={`${formatTokenAmount(
                tokenBalance?.toBigInt() ?? BigInt(0),
                collateralAsset.decimals,
              )} ${collateralAsset.symbol}`}
              containerSx={{
                marginBottom: "14px",
              }}
            />

            <NumberTextField
              label="0.0"
              size="medium"
              style={{ width: "100%" }}
              value={amount}
              onChange={handleAmountChange}
              endAdornment={
                <TextfieldChip text={collateralAsset.symbol} size="small" />
              }
            />

            <Box
              sx={{
                width: "100%",
                maxWidth: "100%",
                marginTop: "12px",
                marginBottom: "4px",
              }}
            >
              <Typography variant="text1">
                <Trans i18nKey="collateral.deposit.disclaimer" />
              </Typography>
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
          mainBtnText={buttonText}
          mainBtnOnClick={handleConfirm}
          disableMainBtn={disableCollateralDeposit}
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
