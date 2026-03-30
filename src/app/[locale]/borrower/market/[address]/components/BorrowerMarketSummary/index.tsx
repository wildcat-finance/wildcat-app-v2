"use client"

import { useEffect, useState } from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import AuthWrapper from "@/components/AuthWrapper"
import { Markdown } from "@/components/Markdown"
import { MarkdownEditor } from "@/components/MarkdownEditor"
import { COLORS } from "@/theme/colors"

import { useUpdateMarketSummary } from "../../hooks/useUpdateMarketSummary"

const InnerMarketSummaryEditor = ({
  marketAddress,
  chainId,
  handleClose,
  marketSummary,
}: {
  marketAddress: string
  chainId: number
  marketSummary: string
  handleClose: () => void
}) => {
  const { t } = useTranslation()

  const [markdown, setMarkdown] = useState(marketSummary || "")
  const { mutate: updateMarketSummary, isPending } = useUpdateMarketSummary(
    marketAddress,
    chainId,
  )

  useEffect(() => {
    setMarkdown(marketSummary)
  }, [marketSummary])

  const handleSave = () => {
    updateMarketSummary(markdown, {
      onSuccess: () => {
        handleClose()
      },
      onError: (error) => {
        console.error(error)
      },
    })
  }

  return (
    <Box width="100%">
      <MarkdownEditor
        markdown={markdown}
        onChange={(md) => {
          setMarkdown(md)
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
        <Button variant="contained" color="primary" onClick={handleClose}>
          {t("common.actions.cancel")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending
            ? t("marketDetails.description.buttons.pending")
            : t("marketDetails.description.buttons.save")}
        </Button>
      </Box>
    </Box>
  )
}

export const BorrowerMarketSummary = ({
  marketAddress,
  chainId,
  isBorrower,
  marketSummary,
  isLoading,
}: {
  marketAddress: string
  chainId: number
  isBorrower: boolean
  marketSummary:
    | {
        marketAddress: string
        description: string
      }
    | undefined
  isLoading: boolean
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return (
      <Typography variant="text2" color={COLORS.santasGrey}>
        {t("marketDetails.description.states.loading")}
      </Typography>
    )
  }

  if (
    !isBorrower &&
    (!marketSummary?.description || marketSummary?.description === "")
  ) {
    return (
      <Typography variant="text2" color={COLORS.santasGrey}>
        {t("marketDetails.description.states.noDescription")}
      </Typography>
    )
  }

  return (
    <>
      {isBorrower && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="title3">
            {t("marketDetails.description.title")}
          </Typography>

          <AuthWrapper
            buttonText={t("marketDetails.description.buttons.login")}
          >
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={() => setOpen(true)}
            >
              {marketSummary
                ? t("marketDetails.description.buttons.edit")
                : t("marketDetails.description.buttons.add")}
            </Button>
          </AuthWrapper>
        </Box>
      )}

      <Box
        sx={{
          marginTop: isBorrower ? "16px" : "0",
          padding: "20px",
          borderRadius: "14px",
          border:
            open || (marketSummary && marketSummary.description !== "")
              ? `1px solid ${COLORS.athensGrey}`
              : "none",
        }}
      >
        {open ? (
          <InnerMarketSummaryEditor
            marketAddress={marketAddress}
            chainId={chainId}
            handleClose={() => setOpen(false)}
            marketSummary={marketSummary?.description || ""}
          />
        ) : (
          <Markdown markdown={marketSummary?.description || ""} />
        )}
      </Box>
    </>
  )
}
