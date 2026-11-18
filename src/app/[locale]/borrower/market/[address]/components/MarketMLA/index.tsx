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

import { CustomMlaLoginHint } from "@/app/[locale]/borrower/components/CustomMlaLoginHint"
import { MlaModal } from "@/app/[locale]/borrower/components/MlaModal"
import { useGetMlaTemplates } from "@/app/[locale]/borrower/hooks/mla/useGetMlaTemplates"
import { usePreviewMla } from "@/app/[locale]/borrower/hooks/mla/usePreviewMla"
import {
  useBorrowerProfileTmp,
  useSetMarketMLA,
} from "@/app/[locale]/borrower/hooks/mla/useSignBorrowerMla"
import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import { useMarketMla } from "@/hooks/useMarketMla"
import { BasicBorrowerInfo } from "@/lib/mla"
import { getMlaTemplateLabel } from "@/utils/mlaTemplateLabel"

const SetMarketMLAForm = ({
  borrowerProfile,
  marketAccount,
}: {
  borrowerProfile: BasicBorrowerInfo
  marketAccount: MarketAccount
}) => {
  const { t } = useTranslation()
  const { data: templates, isLoggedIn } = useGetMlaTemplates()
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
      label: "Don’t Use",
      value: "noMLA",
    },
    ...(templates?.map((template) => ({
      id: template.id,
      label: getMlaTemplateLabel(t, {
        ...template,
        isCustom: !!template.borrowerId,
      }),
      value: template.id,
    })) ?? []),
  ]

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6">
        {t("borrowerMarketDetails.mla.template.label")}
      </Typography>
      {!isLoggedIn && <CustomMlaLoginHint />}
      <Box
        sx={{ display: "flex", flexDirection: "row", gap: 2, width: "100%" }}
      >
        <FormControl sx={{ mb: 2, width: "200px" }}>
          <InputLabel>Select MLA Template</InputLabel>
          <Select
            value={selectedTemplateId || ""}
            onChange={(e) =>
              setSelectedTemplateId(
                e.target.value === "noMLA" ? "noMLA" : Number(e.target.value),
              )
            }
            label={t("createNewMarket.mla.mla.label")}
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
            {t("borrowerMarketDetails.mla.buttons.refuse")}
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
                ? t("borrowerMarketDetails.mla.buttons.loading")
                : t("borrowerMarketDetails.mla.buttons.set")
            }
          />
        )}
      </Box>
    </Box>
  )
}

const NoExistingMla = ({ marketAccount }: { marketAccount: MarketAccount }) => {
  const { data: borrowerProfile } = useBorrowerProfileTmp(
    marketAccount.market.borrower,
  )
  if (!borrowerProfile) return <Box>No Borrower Profile</Box>
  if (!marketAccount.isBorrower) return <Box>No Market MLA</Box>
  return (
    <SetMarketMLAForm
      borrowerProfile={borrowerProfile as unknown as BasicBorrowerInfo}
      marketAccount={marketAccount}
    />
  )
}

const ShowExistingMla = ({
  mla,
  marketAccount,
}: {
  mla: MasterLoanAgreementResponse
  marketAccount: MarketAccount
}) => {
  const { t } = useTranslation()
  const label = getMlaTemplateLabel(t, {
    name: mla.templateName,
    version: mla.templateVersion,
    isCustom: mla.isCustomTemplate,
  })
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <Typography variant="text3">
        {t("mla.governing", {
          name: label,
          interpolation: { escapeValue: false },
        })}
      </Typography>
      <MlaModal
        mla={mla}
        isLoading={false}
        showSignButton={false}
        buttonText={t("mla.viewNamed", {
          name: label,
          interpolation: { escapeValue: false },
        })}
        downloadPdfUrl={`/api/mla/${marketAccount.market.address}/pdf?chainId=${marketAccount.market.chainId}`}
        downloadSignedUrl={`/api/mla/${marketAccount.market.address}/signed?chainId=${marketAccount.market.chainId}`}
      />
    </Box>
  )
}

export const MarketMLA = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const { data: borrowerProfile, isLoading: isLoadingBorrowerProfile } =
    useBorrowerProfileTmp(marketAccount.market.borrower)
  const { data: marketMla, isLoading: isLoadingMarketMla } = useMarketMla(
    marketAccount.market.address,
    marketAccount.market.chainId,
  )
  const { t } = useTranslation()
  if (isLoadingMarketMla || isLoadingBorrowerProfile)
    return <div>Loading...</div>

  if (!borrowerProfile) return <Box>No Borrower Profile</Box>
  if (!marketAccount.isBorrower) return <Box>Wrong Borrower Address</Box>
  if (marketMla && "noMLA" in marketMla)
    return <Box>{t("mla.governing", { name: t("mla.noMla") })}</Box>
  if (marketMla)
    return <ShowExistingMla mla={marketMla} marketAccount={marketAccount} />
  return <NoExistingMla marketAccount={marketAccount} />
}
