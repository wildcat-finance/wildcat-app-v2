"use client"

import { useEffect, useState } from "react"

import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material"
import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

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
  const { data: templates, isLoading: isLoadingTemplates } =
    useGetMlaTemplates()
  const [timeSigned, setTimeSigned] = useState(0)
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    number | undefined
  >(undefined)
  const { mutate: signMla, isPending: isSigning } = useSetMarketMLA()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const { data: previewMla, isLoading: isLoadingPreviewMla } = usePreviewMla(
    marketAccount.market,
    selectedTemplateId,
    timeSigned,
    borrowerProfile as unknown as BorrowerProfile,
  )

  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])

  const options = templates?.map((template) => ({
    id: template.id,
    label: template.name,
    value: template.id,
  }))

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6">
        Select a template to set an MLA for this market.
      </Typography>
      <Box
        sx={{ display: "flex", flexDirection: "row", gap: 2, width: "100%" }}
      >
        <FormControl sx={{ mb: 2, width: "200px" }}>
          <InputLabel>Select MLA Template</InputLabel>
          <Select
            value={selectedTemplateId || ""}
            onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
            label="Select MLA Template"
          >
            {options?.map((option) => (
              <MenuItem key={option.id} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
          buttonText={isLoadingTemplates ? "Loading templates..." : "Set MLA"}
        />
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
