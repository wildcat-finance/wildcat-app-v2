"use client"

import { useEffect, useState } from "react"

import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Button,
} from "@mui/material"
import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useGetMlaTemplates } from "@/app/[locale]/borrower/hooks/mla/useGetMlaTemplates"
import { usePreviewMla } from "@/app/[locale]/borrower/hooks/mla/usePreviewMla"
import {
  useBorrowerProfileTmp,
  useSetMarketMLA,
} from "@/app/[locale]/borrower/hooks/mla/useSignBorrowerMla"
import { MlaModal } from "@/app/[locale]/lender/components/MlaModal"
import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import { useMarketMla } from "@/hooks/useMarketMla"
import { BasicBorrowerInfo } from "@/lib/mla"

const SetMarketMLAForm = ({
  borrowerProfile,
  marketAccount,
}: {
  borrowerProfile: BasicBorrowerInfo
  marketAccount: MarketAccount
}) => {
  const { t } = useTranslation()
  const { data: templates, isLoading: isLoadingTemplates } =
    useGetMlaTemplates()
  const [timeSigned, setTimeSigned] = useState(0)
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    number | "noMLA" | undefined
  >(undefined)
  const { mutate: signMla, isPending: isSigning } = useSetMarketMLA()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const { data: previewMla, isLoading: isLoadingPreviewMla } = usePreviewMla(
    marketAccount.market,
    selectedTemplateId === "noMLA" ? undefined : selectedTemplateId,
    timeSigned,
    borrowerProfile as unknown as BorrowerProfile,
  )

  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])

  const options = [
    {
      id: "noMLA",
      label: t("marketDetailsBorrower.mlaStates.dontUse"),
      value: "noMLA",
    },
    ...(templates?.map((template) => ({
      id: template.id,
      label: template.name,
      value: template.id,
    })) ?? []),
  ]

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6">
        {t("marketDetails.mla.template.label")}
      </Typography>
      <Box
        sx={{ display: "flex", flexDirection: "row", gap: 2, width: "100%" }}
      >
        <FormControl sx={{ mb: 2, width: "200px" }}>
          <InputLabel>
            {t("marketDetailsBorrower.mlaStates.selectTemplate")}
          </InputLabel>
          <Select
            value={selectedTemplateId || ""}
            onChange={(e) =>
              setSelectedTemplateId(
                e.target.value === "noMLA" ? "noMLA" : Number(e.target.value),
              )
            }
            label={t("createMarket.mla.mla.label")}
          >
            {options?.map((option) => (
              <MenuItem key={option.id} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedTemplateId === "noMLA" ? (
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() =>
              signMla({
                template: "noMLA",
                timeSigned,
                market: marketAccount.market,
                profile: borrowerProfile,
              })
            }
          >
            {t("marketDetails.mla.buttons.refuse")}
          </Button>
        ) : (
          <MlaModal
            mla={
              previewMla
                ? {
                    html: previewMla.htmlWithPlaceholders,
                  }
                : null
            }
            isLoading={isLoadingPreviewMla}
            onSign={() =>
              previewMla
                ? signMla({
                    template: previewMla.mlaTemplate,
                    timeSigned,
                    market: marketAccount.market,
                    profile: borrowerProfile,
                  })
                : {}
            }
            showSignButton
            disableModalButton={!selectedTemplateId || isLoadingPreviewMla}
            buttonText={
              isLoadingPreviewMla
                ? t("marketDetails.mla.buttons.loading")
                : t("marketDetails.mla.buttons.set")
            }
          />
        )}
      </Box>
    </Box>
  )
}

const NoExistingMla = ({ marketAccount }: { marketAccount: MarketAccount }) => {
  const { t } = useTranslation()
  const { data: borrowerProfile } = useBorrowerProfileTmp(
    marketAccount.market.borrower,
  )
  if (!borrowerProfile)
    return <Box>{t("marketDetailsBorrower.mlaStates.noProfile")}</Box>
  if (!marketAccount.isBorrower)
    return <Box>{t("marketDetailsBorrower.mlaStates.noMarketMla")}</Box>
  return (
    <SetMarketMLAForm
      borrowerProfile={borrowerProfile as unknown as BasicBorrowerInfo}
      marketAccount={marketAccount}
    />
  )
}

const ShowExistingMla = ({
  mla,
  borrowerProfile,
  marketAccount,
}: {
  mla: MasterLoanAgreementResponse
  borrowerProfile: BasicBorrowerInfo
  marketAccount: MarketAccount
}) => (
  <Box>
    <MlaModal
      mla={mla}
      isLoading={false}
      onSign={() => {}}
      showSignButton
      downloadPdfUrl={`/api/mla/${marketAccount.market.address}/pdf?chainId=${marketAccount.market.chainId}`}
      downloadSignedUrl={`/api/mla/${marketAccount.market.address}/signed?chainId=${marketAccount.market.chainId}`}
    />
  </Box>
)

export const MarketMLA = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const { data: borrowerProfile, isLoading: isLoadingBorrowerProfile } =
    useBorrowerProfileTmp(marketAccount.market.borrower)
  const { data: marketMla, isLoading: isLoadingMarketMla } = useMarketMla(
    marketAccount.market.address,
  )
  const { t } = useTranslation()

  if (isLoadingMarketMla || isLoadingBorrowerProfile)
    return <div>{t("common.loading")}</div>

  if (!borrowerProfile)
    return <Box>{t("marketDetailsBorrower.mlaStates.noProfile")}</Box>
  if (!marketAccount.isBorrower)
    return <Box>{t("marketDetailsBorrower.mlaStates.wrongAddress")}</Box>
  if (marketMla && "noMLA" in marketMla)
    return <Box>{t("marketDetailsBorrower.mlaStates.declined")}</Box>
  if (marketMla)
    return (
      <ShowExistingMla
        mla={marketMla}
        borrowerProfile={borrowerProfile as BasicBorrowerInfo}
        marketAccount={marketAccount}
      />
    )
  return <NoExistingMla marketAccount={marketAccount} />
}
