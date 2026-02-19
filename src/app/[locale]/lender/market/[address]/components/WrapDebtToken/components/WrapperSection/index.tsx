import React, { ChangeEvent } from "react"

import {
  Box,
  Button,
  SvgIcon,
  Tabs,
  Tab,
  Typography,
  Switch,
  useTheme,
} from "@mui/material"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Market,
  Signer,
  TokenAmount,
  TokenWrapper,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"

import { useAddToken } from "@/app/[locale]/lender/market/[address]/hooks/useAddToken"
import Check from "@/assets/icons/check_icon.svg"
import Question from "@/assets/icons/circledQuestion_icon.svg"
import { MiniLoader } from "@/components/Loader"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldButton } from "@/components/TextfieldAdornments/TextfieldButton"
import { toastRequest } from "@/components/Toasts"
import { TooltipButton } from "@/components/TooltipButton"
import { WrapperSuccessBanner } from "@/components/WrapDebtToken/mobile/WrapperSuccessBanner"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useWrapperAllowance } from "@/hooks/wrapper/useWrapperAllowance"
import { useWrapperBalances } from "@/hooks/wrapper/useWrapperBalances"
import { useWrapperLimits } from "@/hooks/wrapper/useWrapperLimits"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setIsMobileOpenedState } from "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import { isUSDTLikeToken } from "@/utils/constants"
import { formatTokenWithCommas } from "@/utils/formatters"

import { ErrorWrapperAlert } from "../../../../../../../../../components/WrapDebtToken/ErrorWrapperAlert"
import { SuccessWrapperModal } from "../../../../../../../../../components/WrapDebtToken/SuccessWrapperModal"
import { WrapperExchangeBanner } from "../../../../../../../../../components/WrapDebtToken/WrapperExchangeBanner"
import { WrapperHeader } from "../../../../../../../../../components/WrapDebtToken/WrapperHeader"

const TabStyle = {
  fontSize: pxToRem(14),
  lineHeight: lh(20, 14),
  fontWeight: 500,
  height: "28px",
  minHeight: "28px",
  maxWidth: "100%",
  width: "50%",
  borderColor: COLORS.athensGrey,
}

const UnitTabStyle = {
  ...TabStyle,
  width: "auto",
  minWidth: "100px",
}

enum TokenWrapperFormTabs {
  WRAP = "wrap",
  UNWRAP = "unwrap",
}

enum AmountUnit {
  ASSETS = "assets",
  SHARES = "shares",
}

type SuccessSnapshot = {
  initialAmount: string
  initialAsset: string
  finalAmount: string
  finalAsset: string
}

export type WrapperSectionProps = {
  market: Market | undefined
  wrapper: TokenWrapper
  isDifferentChain: boolean
  isAuthorizedLender: boolean
}

const parseAmountSafe = (token: TokenWrapper["marketToken"], value: string) => {
  if (!value) return token.getAmount(0)
  try {
    return token.parseAmount(value)
  } catch {
    return undefined
  }
}

const minTokenAmount = (first?: TokenAmount, second?: TokenAmount) => {
  if (!first) return second
  if (!second) return first
  return first.lt(second) ? first : second
}

export const WrapperSection = ({
  market,
  wrapper,
  isDifferentChain,
  isAuthorizedLender,
}: WrapperSectionProps) => {
  const theme = useTheme()
  const client = useQueryClient()
  const { targetChainId } = useCurrentNetwork()
  const { signer, address } = useEthersProvider({
    chainId: market?.chainId,
  })
  const { connected: safeConnected, sdk } = useSafeAppsSDK()

  const [tab, setTab] = React.useState<TokenWrapperFormTabs>(
    TokenWrapperFormTabs.WRAP,
  )
  const [unit, setUnit] = React.useState<AmountUnit>(AmountUnit.ASSETS)
  const [amount, setAmount] = React.useState<string>("")

  const [showSuccess, setShowSuccess] = React.useState(false)
  const [showError, setShowError] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>()
  const [txHash, setTxHash] = React.useState<string | undefined>()
  const [isSubmitTransitioning, setIsSubmitTransitioning] =
    React.useState(false)
  const [successSnapshot, setSuccessSnapshot] =
    React.useState<SuccessSnapshot | null>(null)

  const { data: balances } = useWrapperBalances(
    market?.chainId,
    wrapper,
    address,
  )
  const { data: allowance } = useWrapperAllowance(
    market?.chainId,
    wrapper,
    address,
  )
  const { data: limits } = useWrapperLimits(market?.chainId, wrapper, address)

  const {
    canAddToken: canAddMarketToken,
    handleAddToken: addMarketToken,
    isAddingToken: isAddingMarketToken,
  } = useAddToken(wrapper.marketToken)
  const {
    canAddToken: canAddWrappedToken,
    handleAddToken: addWrappedToken,
    isAddingToken: isAddingWrappedToken,
  } = useAddToken(wrapper.shareToken)

  const isWrapTab = tab === TokenWrapperFormTabs.WRAP
  const isAssetsInput = unit === AmountUnit.ASSETS

  const inputToken = isAssetsInput ? wrapper.marketToken : wrapper.shareToken
  const outputToken = isAssetsInput ? wrapper.shareToken : wrapper.marketToken

  const inputAmount = React.useMemo(
    () => parseAmountSafe(inputToken, amount),
    [inputToken, amount],
  )

  const isInputZero = !inputAmount || (inputAmount && inputAmount.raw.isZero())

  const previewQuery = useQuery({
    queryKey: QueryKeys.Wrapper.PREVIEW(
      wrapper.address,
      tab,
      unit,
      inputAmount?.raw.toString(),
    ),
    enabled: !!wrapper && !!inputAmount && !inputAmount.raw.isZero(),
    queryFn: async () => {
      if (!inputAmount) throw new Error("No input amount")

      if (isWrapTab && isAssetsInput) {
        return wrapper.previewDeposit(inputAmount)
      }
      if (isWrapTab && !isAssetsInput) {
        return wrapper.previewMint(inputAmount)
      }
      if (!isWrapTab && isAssetsInput) {
        return wrapper.previewWithdraw(inputAmount)
      }
      return wrapper.previewRedeem(inputAmount)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const outputAmount = previewQuery.data

  const { data: maxSharesFromBalance } = useQuery({
    queryKey: QueryKeys.Wrapper.MAX_SHARES_FROM_BALANCE(
      wrapper.address,
      balances?.marketBalance?.raw.toString(),
    ),
    enabled: !!balances?.marketBalance && isWrapTab && !isAssetsInput,
    queryFn: async () => {
      if (!balances?.marketBalance) throw new Error("Missing market balance")
      return wrapper.previewDeposit(
        balances.marketBalance.mulDiv(9999, 10000), // Use 99.999% of balance
      )
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const { data: maxAssetsFromShares } = useQuery({
    queryKey: QueryKeys.Wrapper.MAX_ASSETS_FROM_SHARES(
      wrapper.address,
      balances?.shareBalance?.raw.toString(),
    ),
    enabled: !!balances?.shareBalance,
    queryFn: async () => {
      if (!balances?.shareBalance) throw new Error("Missing share balance")
      return wrapper.previewRedeem(balances.shareBalance)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const approvalAmount = React.useMemo(() => {
    if (!isWrapTab) return undefined
    if (!inputAmount) return undefined
    return isAssetsInput ? inputAmount : outputAmount
  }, [isWrapTab, inputAmount, isAssetsInput, outputAmount])

  const maxLimit = React.useMemo(() => {
    if (!limits) return undefined
    if (isWrapTab) {
      return isAssetsInput ? limits.maxDeposit : limits.maxMint
    }
    return isAssetsInput ? limits.maxWithdraw : limits.maxRedeem
  }, [limits, isWrapTab, isAssetsInput])

  const maxInputAmount = React.useMemo(() => {
    if (isWrapTab) {
      if (isAssetsInput) {
        if (!balances?.marketBalance) return undefined
        return minTokenAmount(balances.marketBalance, maxLimit)
      }
      if (!maxSharesFromBalance) return undefined
      const maxShares = minTokenAmount(maxSharesFromBalance, maxLimit)
      return maxShares ?? undefined
    }
    if (isAssetsInput) {
      if (!maxAssetsFromShares) return undefined
      return minTokenAmount(maxAssetsFromShares, maxLimit)
    }
    if (!balances?.shareBalance) return undefined
    return minTokenAmount(balances.shareBalance, maxLimit)
  }, [
    balances,
    isAssetsInput,
    isWrapTab,
    maxAssetsFromShares,
    maxLimit,
    maxSharesFromBalance,
  ])

  const maxActionLabel = React.useMemo(() => {
    if (isWrapTab) return isAssetsInput ? "deposit" : "mint"
    return isAssetsInput ? "withdraw" : "redeem"
  }, [isWrapTab, isAssetsInput])

  const exceedsMax = !!inputAmount && !!maxLimit && inputAmount.gt(maxLimit)

  const balanceError = React.useMemo(() => {
    if (!inputAmount || isInputZero) return undefined
    if (!balances) return undefined

    if (isWrapTab) {
      if (isAssetsInput && balances.marketBalance.lt(inputAmount)) {
        return `Insufficient ${wrapper.marketToken.symbol} balance`
      }
      if (
        !isAssetsInput &&
        approvalAmount &&
        balances.marketBalance.lt(approvalAmount)
      ) {
        return `Insufficient ${wrapper.marketToken.symbol} balance`
      }
    } else {
      if (
        isAssetsInput &&
        outputAmount &&
        balances.shareBalance.lt(outputAmount)
      )
        return `Insufficient ${wrapper.shareToken.symbol} balance`
      if (!isAssetsInput && balances.shareBalance.lt(inputAmount)) {
        return `Insufficient ${wrapper.shareToken.symbol} balance`
      }
    }

    return undefined
  }, [
    approvalAmount,
    balances,
    inputAmount,
    isAssetsInput,
    isInputZero,
    isWrapTab,
    outputAmount,
    wrapper.marketToken.symbol,
    wrapper.shareToken.symbol,
  ])

  const maxError =
    exceedsMax && maxLimit
      ? `Exceeds max ${maxActionLabel} of ${formatTokenWithCommas(maxLimit, {
          withSymbol: true,
        })}`
      : undefined

  const baseHelperText = maxError || balanceError
  const helperText = isSubmitTransitioning ? undefined : baseHelperText

  const hasPreviewRequired =
    (isWrapTab && !isAssetsInput) || (!isWrapTab && isAssetsInput)
  const missingPreview = hasPreviewRequired && !outputAmount

  const approvalRequired = !!approvalAmount && !approvalAmount.raw.isZero()

  const isApproved =
    !approvalRequired || (allowance ? allowance.gte(approvalAmount.raw) : false)

  const needsApproval = approvalRequired && !isApproved

  const isApproveButtonDisabled =
    !approvalRequired ||
    isApproved ||
    isDifferentChain ||
    !signer ||
    !Signer.isSigner(signer) ||
    isInputZero

  const shouldDisableSubmit =
    !isAuthorizedLender ||
    isSubmitTransitioning ||
    isDifferentChain ||
    !signer ||
    !Signer.isSigner(signer) ||
    isInputZero ||
    !!helperText ||
    missingPreview ||
    (needsApproval && !safeConnected)

  const inputLabel = React.useMemo(() => {
    if (isWrapTab) {
      return isAssetsInput ? "Amount to wrap" : "Wrapped tokens to mint"
    }
    return isAssetsInput ? "Market tokens to receive" : "Amount to unwrap"
  }, [isWrapTab, isAssetsInput])

  const outputLabel = React.useMemo(() => {
    if (isWrapTab) {
      return isAssetsInput
        ? "You'll receive wrapped tokens"
        : "Estimated market tokens required"
    }
    return isAssetsInput
      ? "Estimated wrapped tokens required"
      : "You'll receive market tokens"
  }, [isWrapTab, isAssetsInput])

  const maxTooltip =
    maxInputAmount &&
    `Max ${maxActionLabel}: ${formatTokenWithCommas(maxInputAmount, {
      withSymbol: true,
    })}`

  const setMaxAmount = () => {
    if (!maxInputAmount) return
    setAmount(maxInputAmount.format(5))
  }

  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: TokenWrapperFormTabs,
  ) => {
    setTab(newTab)
    setAmount("")
    setIsSubmitTransitioning(false)
    setSuccessSnapshot(null)
    setShowError(false)
    setShowSuccess(false)
    setErrorMessage(undefined)
  }

  const handleUnitChange = (
    event: ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    setUnit(checked ? AmountUnit.SHARES : AmountUnit.ASSETS)
    setAmount("")
    setIsSubmitTransitioning(false)
    setSuccessSnapshot(null)
    setShowError(false)
    setShowSuccess(false)
    setErrorMessage(undefined)
  }

  const handleClose = () => {
    setShowSuccess(false)
    setAmount("")
    setIsSubmitTransitioning(false)
    setSuccessSnapshot(null)
  }

  const waitForSafeTransaction = async (safeTxHash: string) => {
    if (!sdk) throw new Error("No Safe SDK")
    const resolvedTxHash = await new Promise<string>((resolve) => {
      const check = async () => {
        const transactionBySafeHash = await sdk.txs.getBySafeTxHash(safeTxHash)
        if (transactionBySafeHash?.txHash) {
          resolve(transactionBySafeHash.txHash)
        } else {
          setTimeout(check, 1000)
        }
      }
      check()
    })
    await sdk.eth.getTransactionReceipt([resolvedTxHash])
    return resolvedTxHash
  }

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!approvalAmount || !address || !signer) {
        throw new Error("Missing approval params")
      }
      if (Signer.isSigner(signer)) {
        wrapper.provider = signer
      }
      if (market?.chainId !== targetChainId) {
        throw new Error(
          `Market chainId does not match target chainId:` +
            ` Market ${market?.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      if (safeConnected) {
        if (!sdk) throw new Error("No Safe SDK")
        const txs: BaseTransaction[] = []
        if (
          allowance &&
          allowance.gt(0) &&
          isUSDTLikeToken(wrapper.marketToken.address)
        ) {
          txs.push({
            to: wrapper.marketToken.address,
            data: wrapper.marketToken.contract.interface.encodeFunctionData(
              "approve",
              [wrapper.address, BigNumber.from(0)],
            ),
            value: "0",
          })
        }
        txs.push({
          to: wrapper.marketToken.address,
          data: wrapper.marketToken.contract.interface.encodeFunctionData(
            "approve",
            [wrapper.address, approvalAmount.raw],
          ),
          value: "0",
        })
        const { safeTxHash } = await sdk.txs.send({ txs })
        const hash = await waitForSafeTransaction(safeTxHash)
        setTxHash(hash)
        return hash
      }

      if (
        allowance &&
        allowance.gt(0) &&
        isUSDTLikeToken(wrapper.marketToken.address)
      ) {
        const resetTx = await wrapper.marketToken.contract.approve(
          wrapper.address,
          0,
        )
        await resetTx.wait()
      }
      const tx = await wrapper.marketToken.contract.approve(
        wrapper.address,
        approvalAmount.raw,
      )
      setTxHash(tx.hash)
      await tx.wait()
      return tx.hash
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_ALLOWANCE(
          market?.chainId ?? 0,
          wrapper.address,
          address,
        ),
      })
    },
  })

  const submitMutation = useMutation({
    onMutate: () => {
      setIsSubmitTransitioning(true)
      setSuccessSnapshot({
        initialAmount: inputAmount ? formatTokenWithCommas(inputAmount) : "0",
        initialAsset: inputToken.symbol,
        finalAmount: outputAmount ? formatTokenWithCommas(outputAmount) : "0",
        finalAsset: outputToken.symbol,
      })
      setShowError(false)
      setErrorMessage(undefined)
      setTxHash(undefined)
    },
    mutationFn: async () => {
      if (!address || !signer || !market) {
        throw new Error("Missing account or signer")
      }
      if (Signer.isSigner(signer)) {
        wrapper.provider = signer
      }
      if (market.chainId !== targetChainId) {
        throw new Error(
          `Market chainId does not match target chainId:` +
            ` Market ${market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }
      if (!inputAmount) throw new Error("No input amount")

      if (safeConnected) {
        if (!sdk) throw new Error("No Safe SDK")
        const txs: BaseTransaction[] = []

        if (needsApproval && approvalAmount) {
          if (
            allowance &&
            allowance.gt(0) &&
            isUSDTLikeToken(wrapper.marketToken.address)
          ) {
            txs.push({
              to: wrapper.marketToken.address,
              data: wrapper.marketToken.contract.interface.encodeFunctionData(
                "approve",
                [wrapper.address, BigNumber.from(0)],
              ),
              value: "0",
            })
          }
          txs.push({
            to: wrapper.marketToken.address,
            data: wrapper.marketToken.contract.interface.encodeFunctionData(
              "approve",
              [wrapper.address, approvalAmount.raw],
            ),
            value: "0",
          })
        }

        if (isWrapTab && isAssetsInput) {
          txs.push(wrapper.populateDeposit(inputAmount, address))
        } else if (isWrapTab && !isAssetsInput) {
          txs.push(wrapper.populateMint(inputAmount, address))
        } else if (!isWrapTab && isAssetsInput) {
          txs.push(wrapper.populateWithdraw(inputAmount, address, address))
        } else {
          txs.push(wrapper.populateRedeem(inputAmount, address, address))
        }

        const { safeTxHash } = await sdk.txs.send({ txs })
        const hash = await waitForSafeTransaction(safeTxHash)
        setTxHash(hash)
        return hash
      }

      if (isWrapTab && isAssetsInput) {
        const tx = await wrapper.deposit(inputAmount, address)
        setTxHash(tx.hash)
        await tx.wait()
        return tx.hash
      }
      if (isWrapTab && !isAssetsInput) {
        const tx = await wrapper.mint(inputAmount, address)
        setTxHash(tx.hash)
        await tx.wait()
        return tx.hash
      }
      if (!isWrapTab && isAssetsInput) {
        const tx = await wrapper.withdraw(inputAmount, address, address)
        setTxHash(tx.hash)
        await tx.wait()
        return tx.hash
      }

      const tx = await wrapper.redeem(inputAmount, address, address)
      setTxHash(tx.hash)
      await tx.wait()
      return tx.hash
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_BALANCES(
          market?.chainId ?? 0,
          wrapper.address,
          address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_ALLOWANCE(
          market?.chainId ?? 0,
          wrapper.address,
          address,
        ),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_LIMITS(
          market?.chainId ?? 0,
          wrapper.address,
          address,
        ),
      })
      setAmount("")
      setShowSuccess(true)
    },
    onError: (error: Error) => {
      setIsSubmitTransitioning(false)
      setSuccessSnapshot(null)
      setErrorMessage(error.message)
      setShowError(true)
    },
  })

  const submitButtonText = submitMutation.isPending
    ? `${isWrapTab ? "Wrapping" : "Unwrapping"}`
    : `${isWrapTab ? "Wrap" : "Unwrap"} Tokens`

  const formattedOutput = outputAmount
    ? formatTokenWithCommas(outputAmount)
    : "0"
  const convertedShareValue = maxAssetsFromShares
    ? formatTokenWithCommas(maxAssetsFromShares)
    : undefined
  const successInitialAmount = successSnapshot?.initialAmount
  const successInitialAsset = successSnapshot?.initialAsset
  const successFinalAmount = successSnapshot?.finalAmount
  const successFinalAsset = successSnapshot?.finalAsset

  // Mobile
  const isMobile = useMobileResolution()
  const isMobileOpenState = useAppSelector(
    (state) => state.wrapDebtTokenFlow.isMobileOpenedState,
  )

  const dispatch = useAppDispatch()

  const handleOpenSection = (nextTab: TokenWrapperFormTabs) => {
    setTab(nextTab)
    setIsSubmitTransitioning(false)
    setSuccessSnapshot(null)
    setShowError(false)
    setShowSuccess(false)
    setErrorMessage(undefined)
    dispatch(setIsMobileOpenedState(true))
  }

  return (
    <Box
      marginTop="4px"
      sx={{
        backgroundColor: COLORS.white,
        borderRadius: isMobile ? "14px" : "10px",
        padding: isMobile && !isMobileOpenState ? "16px" : 0,
        marginTop: { xs: "0px", md: "4px" },
        paddingBottom: isMobile ? "16px" : 0,
      }}
    >
      {isMobile && isMobileOpenState && (
        <TransactionHeader
          label="Wrapper contract"
          arrowOnClick={() => dispatch(setIsMobileOpenedState(false))}
          crossOnClick={null}
        />
      )}

      <WrapperHeader
        contractAddress={wrapper.address}
        wrapperName={wrapper.name}
        wrapperSymbol={wrapper.symbol}
        onAddMarketToken={addMarketToken}
        onAddWrappedToken={addWrappedToken}
        disableAddMarketToken={!canAddMarketToken || isAddingMarketToken}
        disableAddWrappedToken={!canAddWrappedToken || isAddingWrappedToken}
      />

      <WrapperExchangeBanner
        marketBalance={balances?.marketBalance}
        shareBalance={balances?.shareBalance}
        marketSymbol={wrapper.marketToken.symbol}
        shareSymbol={wrapper.shareToken.symbol}
        convertedShareValue={convertedShareValue}
        convertedShareSymbol={wrapper.marketToken.symbol}
      />

      {isMobileOpenState && (
        <>
          <Tabs
            value={tab}
            onChange={handleTabsChange}
            sx={{
              width: "100%",
              height: "28px",
              minHeight: "28px",
              marginBottom: isMobile ? "20px" : "24px",
              paddingX: isMobile ? "16px" : 0,
            }}
          >
            <Tab value={TokenWrapperFormTabs.WRAP} label="Wrap" sx={TabStyle} />
            <Tab
              value={TokenWrapperFormTabs.UNWRAP}
              label="Unwrap"
              sx={TabStyle}
            />
          </Tabs>

          {!showSuccess && (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                paddingX: isMobile ? "16px" : 0,
                gap: isMobile ? "24px" : "8px",
                alignItems: "flex-start",
              }}
            >
              <Box
                sx={{
                  width: isMobile ? "100%" : "50%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Typography variant={isMobile ? "mobText3" : "text3"}>
                    {inputLabel}
                  </Typography>
                  {maxTooltip && (
                    <TooltipButton value={maxTooltip} color={COLORS.manate} />
                  )}
                </Box>

                <NumberTextField
                  value={amount}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setAmount(event.target.value)
                  }
                  size="medium"
                  label="Amount"
                  error={!!helperText}
                  helperText={helperText}
                  FormHelperTextProps={{
                    sx: {
                      minHeight: "16px",
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    },
                  }}
                  endAdornment={
                    <TextfieldButton buttonText="Max" onClick={setMaxAmount} />
                  }
                />

                <Box
                  sx={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    marginTop: helperText ? "4px" : "0",
                  }}
                >
                  <Typography
                    variant={isMobile ? "mobText4" : "text4"}
                    color={
                      unit === AmountUnit.SHARES
                        ? COLORS.blackRock
                        : COLORS.manate
                    }
                  >
                    Show in Shares
                  </Typography>

                  <Switch
                    sx={{
                      width: "28.8px",
                      height: "16px",

                      "&:active": {
                        "& .MuiSwitch-thumb": {
                          width: 12.8,
                        },
                      },

                      "& .MuiSwitch-switchBase": {
                        padding: "1.5px",

                        "&.Mui-checked": {
                          transform: "translateX(12.8px)",
                          color: COLORS.white,

                          "& + .MuiSwitch-track": {
                            opacity: 1,
                            backgroundColor: COLORS.blueRibbon,
                          },
                        },
                      },

                      "& .MuiSwitch-thumb": {
                        width: "12.8px",
                        height: "12.8px",
                        borderRadius: 8,
                        transition: theme.transitions.create(["width"], {
                          duration: 200,
                        }),
                      },
                    }}
                    checked={unit === AmountUnit.SHARES}
                    onChange={(e, checked) => handleUnitChange(e, checked)}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  width: isMobile ? "100%" : "50%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <Typography variant={isMobile ? "mobText3" : "text3"}>
                  {outputLabel}
                </Typography>

                <Box
                  sx={{
                    height: "44px",
                    width: "100%",
                    padding: "10px 16px",
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    borderRadius: "12px",
                    border: `1px solid ${COLORS.whiteLilac}`,
                  }}
                >
                  <Typography variant={isMobile ? "mobText3" : "text3"}>
                    ~ {formattedOutput} {outputToken.symbol}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <SvgIcon
                    sx={{ fontSize: "12px", "& path": { fill: COLORS.manate } }}
                  >
                    <Question />
                  </SvgIcon>

                  <Typography
                    variant={isMobile ? "mobText4" : "text4"}
                    color={COLORS.manate}
                  >
                    Estimates may change with the current conversion rate.
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {!showSuccess && (
            <Box
              sx={{
                display: "flex",
                gap: isMobile ? "6px" : "8px",
                justifyContent: isMobile ? "space-between" : "flex-end",
                marginTop: isMobile ? "32px" : "24px",
                paddingX: isMobile ? "16px" : 0,
              }}
            >
              {isWrapTab && (
                <Button
                  fullWidth={isMobile}
                  variant="contained"
                  size="large"
                  onClick={() =>
                    toastRequest(approveMutation.mutateAsync(), {
                      pending: "Approving...",
                      success: "Approved",
                      error: "Approval failed",
                    })
                  }
                  disabled={isApproveButtonDisabled}
                  sx={{ display: "flex", alignItems: "center", gap: "3px" }}
                >
                  {isApproved && !isInputZero && (
                    <SvgIcon
                      fontSize="medium"
                      sx={{
                        marginRight: "3px",
                        "& path": {
                          fill: `${COLORS.santasGrey}`,
                        },
                      }}
                    >
                      <Check />
                    </SvgIcon>
                  )}

                  {approveMutation.isPending && <MiniLoader />}

                  {/* eslint-disable-next-line no-nested-ternary */}
                  {approveMutation.isPending
                    ? "Approving"
                    : isApproved && !isInputZero
                      ? "Approved"
                      : "Approve"}
                </Button>
              )}

              <Button
                fullWidth={isMobile}
                variant="contained"
                size="large"
                onClick={() =>
                  toastRequest(submitMutation.mutateAsync(), {
                    pending: isWrapTab ? "Wrapping..." : "Unwrapping...",
                    success: isWrapTab ? "Wrapped" : "Unwrapped",
                    error: "Transaction failed",
                  })
                }
                disabled={shouldDisableSubmit}
                sx={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {submitMutation.isPending && <MiniLoader />}
                {submitButtonText}
              </Button>
            </Box>
          )}

          {showError && (
            <ErrorWrapperAlert
              isWrapping={isWrapTab}
              message={errorMessage}
              txHash={txHash}
            />
          )}

          {showSuccess && isMobile && (
            <WrapperSuccessBanner
              isWrapping={isWrapTab}
              open={showSuccess && !isMobile}
              onClose={handleClose}
              initialAmount={successInitialAmount}
              initialAsset={successInitialAsset ?? inputToken.symbol}
              finalAmount={successFinalAmount}
              finalAsset={successFinalAsset ?? outputToken.symbol}
              txHash={txHash}
            />
          )}

          <SuccessWrapperModal
            isWrapping={isWrapTab}
            open={showSuccess && !isMobile}
            onClose={handleClose}
            initialAmount={successInitialAmount}
            initialAsset={successInitialAsset ?? inputToken.symbol}
            finalAmount={successFinalAmount}
            finalAsset={successFinalAsset ?? outputToken.symbol}
            txHash={txHash}
          />
        </>
      )}

      {!isMobileOpenState && isMobile && (
        <Box sx={{ display: "flex", gap: "8px" }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => handleOpenSection(TokenWrapperFormTabs.WRAP)}
          >
            Wrap
          </Button>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => handleOpenSection(TokenWrapperFormTabs.UNWRAP)}
          >
            Unwrap
          </Button>
        </Box>
      )}
    </Box>
  )
}
