import { useMemo } from "react"

import { Box, Button, Dialog, Typography, useTheme } from "@mui/material"
import { useAccount } from "wagmi"

import { useSignNonMlaAcknowledgement } from "@/app/[locale]/lender/hooks/useNonMlaAcknowledgement"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { TxModalFooterContainer } from "@/components/TxModalComponents/TxModalFooter/style"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { buildNonMlaAcknowledgementText } from "@/utils/nonMlaAcknowledgementMessage"

export type NonMlaAcknowledgementModalProps = {
  open: boolean
  marketAddress: string
  chainId: number
  onClose: () => void
  onAcknowledged: () => void
}

export const NonMlaAcknowledgementModal = ({
  open,
  marketAddress,
  chainId,
  onClose,
  onAcknowledged,
}: NonMlaAcknowledgementModalProps) => {
  const theme = useTheme()
  const isMobile = useMobileResolution()
  const { address } = useAccount()
  const { mutate: signAcknowledgement, isPending } =
    useSignNonMlaAcknowledgement()

  // The signed message is always the canonical single-line string rebuilt
  // inside useSignNonMlaAcknowledgement. Here we only split it for display so
  // the long market address can sit on its own line and wrap.
  const normalizedMarket = marketAddress.toLowerCase()
  const [textBeforeMarket, textAfterMarket] = useMemo(() => {
    const fullText = buildNonMlaAcknowledgementText({
      market: marketAddress,
      chainId,
    })
    const parts = fullText.split(normalizedMarket)
    return parts.length === 2
      ? [parts[0].trimEnd(), parts[1].trimStart()]
      : [fullText, ""]
  }, [chainId, marketAddress, normalizedMarket])

  const handleSign = () => {
    if (!address) return
    signAcknowledgement(
      {
        lenderAddress: address,
        marketAddress,
        chainId,
        timeSigned: Date.now(),
      },
      {
        onSuccess: onAcknowledged,
      },
    )
  }

  const acknowledgementBox = (
    <Box
      sx={{
        border: `1px solid ${COLORS.whiteLilac}`,
        borderRadius: "12px",
        padding: "16px",
        backgroundColor: COLORS.alabaster,
      }}
    >
      <Typography variant={isMobile ? "mobText2" : "text2"}>
        {textBeforeMarket}
        <Box
          component="span"
          sx={{
            display: "block",
            margin: "8px 0",
            fontFamily: "monospace",
            wordBreak: "break-all",
            color: COLORS.blackRock,
          }}
        >
          {normalizedMarket}
        </Box>
        {textAfterMarket}
      </Typography>
    </Box>
  )

  // On mobile this renders as a full-height page-level card (matching the
  // deposit modal's mobile view) rather than a dialog, so it sits below the
  // app header with the same rounding, header and bottom-pinned footer.
  if (isMobile) {
    if (!open) return null

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          width: "100%",
          height: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "14px",
          paddingBottom: "12px",
        }}
      >
        <TransactionHeader
          label="No Master Loan Agreement"
          arrowOnClick={null}
          crossOnClick={isPending ? null : onClose}
        />

        <Box
          sx={{
            padding: "32px 20px 0",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <Typography variant="mobText3" color={COLORS.santasGrey}>
            Sign this acknowledgement before opening the deposit window.
          </Typography>

          {acknowledgementBox}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "0 20px",
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={onClose}
            disabled={isPending}
            fullWidth
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            size="large"
            onClick={handleSign}
            disabled={!address || isPending}
            fullWidth
          >
            {isPending ? "Signing..." : "Acknowledge"}
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={isPending ? undefined : onClose}
      sx={{
        "& .MuiDialog-paper": {
          width: "440px",
          maxWidth: "440px",
          minWidth: 0,
          border: "none",
          borderRadius: "20px",
          margin: 0,
          padding: "24px 0",
        },
      }}
    >
      <TxModalHeader
        title="No Master Loan Agreement"
        arrowOnClick={null}
        crossOnClick={isPending ? null : onClose}
      />

      <Box
        sx={{
          width: "440px",
          maxWidth: "100%",
          boxSizing: "border-box",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <Typography variant="text3" color={COLORS.santasGrey}>
          Sign this acknowledgement before opening the deposit window.
        </Typography>

        {acknowledgementBox}
      </Box>

      <Box
        sx={{
          ...TxModalFooterContainer(theme),
          marginTop: "24px",
        }}
      >
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={onClose}
          disabled={isPending}
          fullWidth
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          size="large"
          onClick={handleSign}
          disabled={!address || isPending}
          fullWidth
        >
          {isPending ? "Signing..." : "Acknowledge"}
        </Button>
      </Box>
    </Dialog>
  )
}
