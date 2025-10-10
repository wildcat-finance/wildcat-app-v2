import { useQuery } from "@tanstack/react-query"
import {
  DepositAccess,
  getHooksFactoryContract,
  HooksKind,
  Market,
  SignerOrProvider,
  Token,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"

import { lastSlaUpdateTime, MlaTemplate } from "@/app/api/mla/interface"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import { NetworkInfo } from "@/config/network"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  BasicBorrowerInfo,
  fillInMlaForLender,
  fillInMlaTemplate,
  getFieldValuesForBorrower,
} from "@/lib/mla"

import { useCalculateMarketAddress } from "./useCalculateMarketAddress"
import { MarketValidationSchemaType } from "../../create-market/validation/validationSchema"

export function getFieldValuesForBorrowerFromForm(
  marketParams: MarketValidationSchemaType,
  borrowerInfo: BasicBorrowerInfo,
  borrowerTimeSigned: number,
  marketAddress: string,
  asset: Token,
  networkData: NetworkInfo,
) {
  // eslint-disable-next-line no-nested-ternary
  const transferAccess = marketParams.disableTransfers
    ? TransferAccess.Disabled
    : marketParams.transferRequiresAccess
      ? TransferAccess.RequiresCredential
      : TransferAccess.Open
  const withdrawalAccess = marketParams.withdrawalRequiresAccess
    ? WithdrawalAccess.RequiresCredential
    : WithdrawalAccess.Open
  const marketName = `${marketParams.namePrefix}${asset?.name}`
  const marketSymbol = `${marketParams.symbolPrefix}${asset?.symbol}`
  // Deposits are only open if `depositRequiresAccess` is defined and false
  const depositAccess =
    marketParams.depositRequiresAccess === false
      ? DepositAccess.Open
      : DepositAccess.RequiresCredential
  const annualInterestBips = Number(marketParams.annualInterestBips) * 100
  const delinquencyFeeBips = Number(marketParams.delinquencyFeeBips) * 100
  const reserveRatioBips = Number(marketParams.reserveRatioBips) * 100
  const delinquencyGracePeriod =
    Number(marketParams.delinquencyGracePeriod) * 60 * 60
  const withdrawalBatchDuration =
    Number(marketParams.withdrawalBatchDuration) * 60 * 60

  const params = {
    market: {
      name: marketName,
      symbol: marketSymbol,
      marketType:
        marketParams.marketType === "standard"
          ? HooksKind.OpenTerm
          : HooksKind.FixedTerm,
      address: marketAddress,
      depositAccess,
      transferAccess,
      withdrawalAccess,
      capacity: asset.parseAmount(marketParams.maxTotalSupply),
      minimumDeposit: asset.parseAmount(marketParams.minimumDeposit ?? 0),
      delinquencyGracePeriod,
      withdrawalBatchDuration,
      fixedTermEndTime: marketParams.fixedTermEndTime,
      allowClosureBeforeTerm: !!marketParams.allowClosureBeforeTerm,
      allowTermReduction: !!marketParams.allowTermReduction,
      allowForceBuyBack: !!marketParams.allowForceBuyBack,
      apr: annualInterestBips,
      delinquencyFee: delinquencyFeeBips,
      reserveRatio: reserveRatioBips,
    },
    borrowerInfo,
    asset,
    timeSigned: borrowerTimeSigned,
    lastSlaUpdateTime: +lastSlaUpdateTime,
    networkData,
  }
  return getFieldValuesForBorrower(params)
}

export async function getMlaFromForm(
  provider: SignerOrProvider,
  form: UseFormReturn<MarketValidationSchemaType>,
  mlaTemplateId: number,
  timeSigned: number,
  borrowerProfile: BorrowerProfile,
  asset: Token,
  salt: string,
  networkData: NetworkInfo,
) {
  const hooksFactoryContract = getHooksFactoryContract(
    networkData.chainId,
    provider,
  )
  const marketAddress = await hooksFactoryContract.computeMarketAddress(salt)

  const mlaTemplate = await fetch(`/api/mla/templates/${mlaTemplateId}`).then(
    (res) => res.json() as Promise<MlaTemplate>,
  )
  const values = form.getValues()
  const borrowerValues = getFieldValuesForBorrowerFromForm(
    values,
    borrowerProfile as BasicBorrowerInfo,
    timeSigned,
    marketAddress,
    asset,
    networkData,
  )

  const { html, plaintext, message } = fillInMlaTemplate(
    mlaTemplate,
    borrowerValues,
  )
  const { html: htmlWithPlaceholders } = fillInMlaForLender(
    {
      html,
      plaintext,
      lenderFields: mlaTemplate.lenderFields,
    },
    new Map(
      mlaTemplate.lenderFields.map((field) => [
        field.source,
        `[${field.placeholder}]`,
      ]),
    ),
    marketAddress,
  )
  return {
    html,
    plaintext,
    message,
    htmlWithPlaceholders,
    mlaTemplate,
  }
}

export const usePreviewMlaFromForm = (
  form: UseFormReturn<MarketValidationSchemaType>,
  mlaTemplateId: number | undefined,
  timeSigned: number,
  borrowerProfile: BorrowerProfile | undefined,
  asset: Token | undefined,
  salt: string,
) => {
  const { provider } = useEthersProvider()
  const { data: marketAddress } = useCalculateMarketAddress(salt)
  const selectedNetwork = useSelectedNetwork()
  return useQuery({
    refetchOnMount: true,
    queryKey: QueryKeys.Borrower.PREVIEW_MLA.FROM_FORM(
      selectedNetwork.chainId,
      marketAddress,
      borrowerProfile,
      asset,
    ),
    enabled: !!provider && !!borrowerProfile && !!asset && !!marketAddress,
    queryFn: async () => {
      if (!provider) throw new Error("Provider is required")
      if (!borrowerProfile) throw new Error("Borrower profile is required")
      if (!asset) throw new Error("Asset is required")
      if (!marketAddress) throw new Error("Market address is required")
      if (!mlaTemplateId) throw new Error("MLA template ID is required")
      return getMlaFromForm(
        provider,
        form,
        mlaTemplateId,
        timeSigned,
        borrowerProfile,
        asset,
        salt,
        selectedNetwork,
      )
    },
  })
}
export const usePreviewMla = (
  market: Market,
  mlaTemplateId: number | undefined,
  timeSigned: number,
  borrowerProfile: BorrowerProfile | undefined,
) => {
  const selectedNetwork = useSelectedNetwork()
  return useQuery({
    enabled:
      !!mlaTemplateId &&
      !!borrowerProfile &&
      !!timeSigned &&
      market.chainId === selectedNetwork.chainId &&
      borrowerProfile.chainId === selectedNetwork.chainId,
    queryKey: QueryKeys.Borrower.PREVIEW_MLA.FROM_MARKET(
      selectedNetwork.chainId,
      market.address,
      !!borrowerProfile,
      mlaTemplateId,
      timeSigned,
    ),
    queryFn: async () => {
      if (!mlaTemplateId) throw new Error("MLA template ID is required")
      if (!borrowerProfile) throw new Error("Borrower profile is required")
      const mlaTemplate = await fetch(
        `/api/mla/templates/${mlaTemplateId}`,
      ).then((res) => res.json() as Promise<MlaTemplate>)
      const borrowerValues = getFieldValuesForBorrower({
        market,
        borrowerInfo: borrowerProfile as BasicBorrowerInfo,
        networkData: selectedNetwork,
        timeSigned,
        lastSlaUpdateTime: +lastSlaUpdateTime,
        asset: market.underlyingToken,
      })
      const { html, plaintext } = fillInMlaTemplate(mlaTemplate, borrowerValues)
      const { html: htmlWithPlaceholders } = fillInMlaForLender(
        {
          html,
          plaintext,
          lenderFields: mlaTemplate.lenderFields,
        },
        new Map(
          mlaTemplate.lenderFields.map((field) => [
            field.source,
            `[${field.placeholder}]`,
          ]),
        ),
        market.address,
      )
      return {
        html,
        plaintext,
        htmlWithPlaceholders,
        mlaTemplate,
      }
    },
  })
}
