"use client"

import { useEffect, useState } from "react"

import { Box, Button, Typography } from "@mui/material"

import AuthWrapper from "@/components/AuthWrapper"
import { Markdown } from "@/components/Markdown"
import { MarkdownEditor } from "@/components/MarkdownEditor"
import { useMarketSummary } from "@/hooks/useMarketSummary"
import { COLORS } from "@/theme/colors"

import { useUpdateMarketSummary } from "../../hooks/useUpdateMarketSummary"

const InnerMarketSummaryEditor = ({
  marketAddress,
  handleClose,
  marketSummary,
}: {
  marketAddress: string
  marketSummary: string
  handleClose: () => void
}) => {
  const [markdown, setMarkdown] = useState(marketSummary || "")
  const { mutate: updateMarketSummary, isPending } =
    useUpdateMarketSummary(marketAddress)

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
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </Box>
    </Box>
  )
}

export const BorrowerMarketSummary = ({
  marketAddress,
  isBorrower,
}: {
  marketAddress: string
  isBorrower: boolean
}) => {
  const [open, setOpen] = useState(false)
  const { data: marketSummary, isLoading } = useMarketSummary(marketAddress)

  if (isLoading) {
    return (
      <Typography variant="text2" color={COLORS.santasGrey}>
        Loading market summary...
      </Typography>
    )
  }

  if (
    !isBorrower &&
    (!marketSummary?.description || marketSummary?.description === "")
  ) {
    return (
      <Typography variant="text2" color={COLORS.santasGrey}>
        No market summary found.
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
          <Typography variant="title3">Market Summary</Typography>

          <AuthWrapper buttonText="Log in to change the summary">
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={() => setOpen(true)}
            >
              {marketSummary ? "Edit" : "Add"}
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
