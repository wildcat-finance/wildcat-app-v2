import { useQuery } from "@tanstack/react-query"
import {
  DepositAccess,
  getDeploymentAddress,
  getHooksFactoryContract,
  Market,
  SignerOrProvider,
  Token,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"

import { lastSlaUpdateTime, MlaTemplate } from "@/app/api/mla/interface"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import { TargetChainId, TargetNetwork } from "@/config/network"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import {
  BasicBorrowerInfo,
  DepositAccessString,
  fillInMlaForLender,
  fillInMlaTemplate,
  formatDuration,
  formatDate,
  formatAddress,
  getFieldValuesForBorrower,
  MlaFieldValueKey,
  TransferAccessString,
  WithdrawalAccessString,
  formatBips,
  formatBool,
} from "@/lib/mla"

import {
  CALCULATE_MARKET_ADDRESS_KEY,
  useCalculateMarketAddress,
} from "./useCalculateMarketAddress"
import { MarketValidationSchemaType } from "../../create-market/validation/validationSchema"

export const PREVIEW_MLA_KEY = "PREVIEW_MLA"

export function getFieldValuesForBorrowerFromForm(
  marketParams: MarketValidationSchemaType,
  borrowerInfo: BasicBorrowerInfo,
  borrowerTimeSigned: number,
  marketAddress: string,
  asset: Token,
) {
  const networkData = TargetNetwork
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

  const allData: Map<MlaFieldValueKey, string | undefined> = new Map([
    // number
    ["network.chainId", networkData.chainId?.toString()],
    // string
    ["network.name", networkData.name],
    ["asset.name", asset?.name],
    ["asset.symbol", asset?.symbol],
    [
      "market.marketType",
      marketParams.marketType === "standard" ? "Open Term" : "Fixed Term",
    ],
    ["market.name", marketName],
    ["market.symbol", marketSymbol],
    ["borrower.name", borrowerInfo.name],
    ["borrower.jurisdiction", borrowerInfo.jurisdiction],
    ["borrower.physicalAddress", borrowerInfo.physicalAddress],
    // address (format as checksum address)
    ["market.depositAccess", DepositAccessString[depositAccess]],
    ["market.transferAccess", TransferAccessString[transferAccess]],
    ["market.withdrawalAccess", WithdrawalAccessString[withdrawalAccess]],
    [
      "asset.address",
      TargetChainId === 1 ? formatAddress(asset?.address) : asset?.name,
    ],
    ["market.address", formatAddress(marketAddress)],
    ["borrower.address", formatAddress(borrowerInfo.address)],
    // ["lender.address", formatAddress(marketParams.lenderAddress)],
    [
      /* @todo should be Chainalysis */
      "chainalysisOracle.address",
      formatAddress(getDeploymentAddress(TargetChainId, "MockChainalysis")),
    ],
    [
      "hooksFactory.address",
      formatAddress(getDeploymentAddress(TargetChainId, "HooksFactory")),
    ],
    // token amount
    [
      "market.capacity",
      asset?.parseAmount(marketParams.maxTotalSupply)?.format(undefined, true),
    ],
    [
      "market.minimumDeposit",
      marketParams.minimumDeposit
        ? asset
            ?.parseAmount(marketParams.minimumDeposit)
            ?.format(undefined, true)
        : "N/A",
    ],
    // duration
    [
      "market.delinquencyGracePeriod",
      formatDuration(delinquencyGracePeriod) ?? "N/A",
    ],
    [
      "market.withdrawalBatchDuration",
      formatDuration(withdrawalBatchDuration) ?? "N/A",
    ],
    // date
    [
      "market.fixedTermEndTime",
      marketParams.marketType !== "standard"
        ? formatDate(marketParams.fixedTermEndTime)
        : "N/A",
    ],
    ["borrower.timeSigned", formatDate(borrowerTimeSigned)],
    // ["lender.timeSigned", formatDate(Date.now())],
    ["sla.timeUpdated", formatDate(+lastSlaUpdateTime)],
    // bips (format as %)
    ["market.apr", formatBips(annualInterestBips)],
    ["market.delinquencyFee", formatBips(delinquencyFeeBips)],
    ["market.reserveRatio", formatBips(reserveRatioBips)],
    // boolean (format as Yes, No, N/A)
    [
      "market.allowClosureBeforeTerm",
      marketParams.marketType !== "standard"
        ? formatBool(marketParams.allowClosureBeforeTerm)
        : "N/A",
    ],
    [
      "market.allowTermReduction",
      marketParams.marketType !== "standard"
        ? formatBool(marketParams.allowTermReduction)
        : "N/A",
    ],
    [
      "market.allowForceBuyBack",
      formatBool(marketParams.allowForceBuyBack) ?? "N/A",
    ],
  ])
  return allData
}

export async function getMlaFromForm(
  provider: SignerOrProvider,
  form: UseFormReturn<MarketValidationSchemaType>,
  mlaTemplateId: number,
  timeSigned: number,
  borrowerProfile: BorrowerProfile,
  asset: Token,
  salt: string,
) {
  const hooksFactoryContract = getHooksFactoryContract(TargetChainId, provider)
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
  )

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
  )
  return {
    html,
    plaintext,
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
  return useQuery({
    refetchOnMount: true,
    queryKey: [PREVIEW_MLA_KEY, marketAddress, borrowerProfile, asset],
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
      )
    },
  })
}
export const usePreviewMla = (
  market: Market,
  mlaTemplateId: number | undefined,
  timeSigned: number,
  borrowerProfile: BorrowerProfile | undefined,
) =>
  useQuery({
    enabled: !!mlaTemplateId && !!borrowerProfile && !!timeSigned,
    queryKey: [
      PREVIEW_MLA_KEY,
      market.borrower,
      !!borrowerProfile,
      mlaTemplateId,
      timeSigned,
    ],
    queryFn: async () => {
      if (!mlaTemplateId) throw new Error("MLA template ID is required")
      if (!borrowerProfile) throw new Error("Borrower profile is required")
      const mlaTemplate = await fetch(
        `/api/mla/templates/${mlaTemplateId}`,
      ).then((res) => res.json() as Promise<MlaTemplate>)
      console.log(`borrowerProfile`)
      console.log(borrowerProfile)
      const borrowerValues = getFieldValuesForBorrower(
        market,
        borrowerProfile as BasicBorrowerInfo,
        TargetNetwork,
        timeSigned,
        +lastSlaUpdateTime,
      )
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
      )
      return {
        html,
        plaintext,
        htmlWithPlaceholders,
        mlaTemplate,
      }
    },
  })
