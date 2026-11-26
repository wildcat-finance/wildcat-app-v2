"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material"
import type { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useGetMlaTemplates } from "@/app/[locale]/borrower/hooks/mla/useGetMlaTemplates"
import { usePreviewMla } from "@/app/[locale]/borrower/hooks/mla/usePreviewMla"
import {
  useBorrowerProfileTmp,
  useSetMarketMLA,
} from "@/app/[locale]/borrower/hooks/mla/useSignBorrowerMla"
import type { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import { MlaDocument } from "@/components/MlaDocument"
import { useMarketMla } from "@/hooks/useMarketMla"
import type { BasicBorrowerInfo } from "@/lib/mla"
import { fillLenderPlaceholders } from "@/lib/mlaTemplateText"
import { COLORS } from "@/theme/colors"
import {
  getMlaTemplateLabel,
  getMlaTemplateOptions,
} from "@/utils/mlaTemplateLabel"

const SetMarketMLAForm = ({
  borrowerProfile,
  marketAccount,
}: {
  borrowerProfile: BasicBorrowerInfo
  marketAccount: MarketAccount
}) => {
  const { t } = useTranslation()
  const { data: templates } = useGetMlaTemplates()
  const [timeSigned, setTimeSigned] = useState(0)
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    number | "noMLA" | undefined
  >(undefined)
  const { mutate: signMla, isPending: isSigning } = useSetMarketMLA()

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
    ...getMlaTemplateOptions(t, templates).map(({ id, label }) => ({
      id,
      label,
      value: id,
    })),
  ]

  const isTemplateSelected = typeof selectedTemplateId === "number"

  return (
    <Box
      sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Typography variant="h6">
        {t("borrowerMarketDetails.mla.template.label")}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          width: "100%",
        }}
      >
        <FormControl sx={{ width: "420px", maxWidth: "100%" }}>
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
        {selectedTemplateId === "noMLA" && (
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            disabled={isSigning}
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
        )}
        {isTemplateSelected && (
          <Button
            variant="contained"
            size="small"
            disabled={!previewMla || isLoadingPreviewMla || isSigning}
            onClick={() =>
              previewMla &&
              signMla({
                template: previewMla.mlaTemplate,
                timeSigned,
                market: marketAccount.market,
                profile: borrowerProfile,
              })
            }
          >
            {(isSigning && t("mla.signing")) ||
              (isLoadingPreviewMla &&
                t("borrowerMarketDetails.mla.buttons.loading")) ||
              t("mla.signAndSet")}
          </Button>
        )}
      </Box>
      {isTemplateSelected && previewMla && (
        <>
          <Typography variant="text3" color={COLORS.santasGrey}>
            {t("mla.previewCaption")}
          </Typography>
          <MlaDocument
            html={previewMla.htmlWithPlaceholders}
            title={t("mla.previewTitle")}
          />
        </>
      )}
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
  // The agreement as the borrower signed it, with each lender's details
  // shown as placeholders, as the market's MLA download shows it.
  const html = useMemo(
    () => fillLenderPlaceholders(mla.html, mla.lenderFields),
    [mla],
  )
  const { address, chainId } = marketAccount.market
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">
        {t("mla.governing", {
          name: label,
          interpolation: { escapeValue: false },
        })}
      </Typography>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={() =>
            window.open(`/api/mla/${address}/pdf?chainId=${chainId}`, "_blank")
          }
        >
          {t("mla.downloadPdf")}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={() =>
            window.open(
              `/api/mla/${address}/signed?chainId=${chainId}`,
              "_blank",
            )
          }
        >
          {t("mla.downloadSigned")}
        </Button>
      </Box>
      <MlaDocument html={html} title={label} />
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
