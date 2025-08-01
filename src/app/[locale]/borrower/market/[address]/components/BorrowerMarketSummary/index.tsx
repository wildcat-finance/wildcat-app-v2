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
    <Box width="100%" padding="24px">
      <AuthWrapper>
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
      </AuthWrapper>
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
      <Typography variant="text3" color={COLORS.santasGrey}>
        Loading market summary...
      </Typography>
    )
  }

  if (!isBorrower && !marketSummary) {
    return null
  }

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="title2">Market Summary</Typography>
        {isBorrower && (
          <Button
            variant="outlined"
            color="secondary"
            size="medium"
            onClick={() => setOpen(true)}
          >
            {marketSummary ? "Edit Market Summary" : "Add Market Summary"}
          </Button>
        )}
      </Box>
      {open ? (
        <InnerMarketSummaryEditor
          marketAddress={marketAddress}
          handleClose={() => setOpen(false)}
          marketSummary={marketSummary?.description || ""}
        />
      ) : (
        <Markdown markdown={marketSummary?.description || ""} />
      )}
    </>
  )
}
