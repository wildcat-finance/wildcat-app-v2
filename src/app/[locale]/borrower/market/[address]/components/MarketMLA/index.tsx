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
      label: "Don’t Use",
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
        {t("borrowerMarketDetails.mla.template.label")}
      </Typography>
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
      downloadPdfUrl={`/api/mla/${marketAccount.market.address}/pdf`}
      downloadSignedUrl={`/api/mla/${marketAccount.market.address}/signed`}
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
  if (isLoadingMarketMla || isLoadingBorrowerProfile)
    return <div>Loading...</div>

  if (!borrowerProfile) return <Box>No Borrower Profile</Box>
  if (!marketAccount.isBorrower) return <Box>Wrong Borrower Address</Box>
  if (marketMla && "noMLA" in marketMla) return <Box>Borrower declined MLA</Box>
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
