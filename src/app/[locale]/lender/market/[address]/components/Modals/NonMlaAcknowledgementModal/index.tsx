import { useMemo } from "react"

import { Box, Button, Dialog, Typography, useTheme } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { useSignNonMlaAcknowledgement } from "@/app/[locale]/lender/hooks/useNonMlaAcknowledgement"
import { useGetBorrowerProfile } from "@/app/[locale]/lender/profile/hooks/useGetBorrowerProfile"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { TxModalFooterContainer } from "@/components/TxModalComponents/TxModalFooter/style"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { NETWORKS_BY_ID } from "@/config/network"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { buildNonMlaAcknowledgementText } from "@/utils/nonMlaAcknowledgementMessage"

export type NonMlaAcknowledgementModalProps = {
  open: boolean
  marketAddress: string
  marketName: string
  borrowerAddress: string
  chainId: number
  onClose: () => void
  onAcknowledged: () => void
}

export const NonMlaAcknowledgementModal = ({
  open,
  marketAddress,
  marketName,
  borrowerAddress,
  chainId,
  onClose,
  onAcknowledged,
}: NonMlaAcknowledgementModalProps) => {
  const theme = useTheme()
  const isMobile = useMobileResolution()
  const { address } = useAccount()
  const { mutate: signAcknowledgement, isPending } =
    useSignNonMlaAcknowledgement()
  const { data: borrowerProfile, isLoading: isBorrowerProfileLoading } =
    useGetBorrowerProfile(
      chainId as SupportedChainId,
      borrowerAddress.toLowerCase() as `0x${string}`,
    )

  const borrowerLegalName = borrowerProfile?.name
  const borrowerAlias = borrowerProfile?.alias || "N/A"
  const networkName = NETWORKS_BY_ID[chainId as SupportedChainId]?.name
  const canSign =
    !!address && !!borrowerLegalName && !!networkName && !isPending

  const acknowledgementText = useMemo(() => {
    if (!borrowerLegalName || !networkName) return ""
    return buildNonMlaAcknowledgementText({
      marketAddress,
      marketName,
      borrowerLegalName,
      borrowerAlias,
      networkName,
      chainId,
    })
  }, [
    borrowerAlias,
    borrowerLegalName,
    chainId,
    marketAddress,
    marketName,
    networkName,
  ])

  const handleSign = () => {
    if (!address || !borrowerLegalName || !networkName || isPending) return
    signAcknowledgement(
      {
        lenderAddress: address,
        marketAddress,
        marketName,
        borrowerLegalName,
        borrowerAlias,
        networkName,
        chainId,
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
        ...(isMobile
          ? {
              flex: 1,
              minHeight: 0,
            }
          : {
              maxHeight: "360px",
            }),
        overflowY: "auto",
        overscrollBehavior: "contain",
      }}
    >
      <Typography variant={isMobile ? "mobText2" : "text2"}>
        <Box
          component="span"
          sx={{
            whiteSpace: "pre-line",
            overflowWrap: "anywhere",
          }}
        >
          {acknowledgementText ||
            (isBorrowerProfileLoading
              ? "Loading acknowledgement..."
              : "Borrower profile is unavailable.")}
        </Box>
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
          minHeight: 0,
          marginTop: "4px",
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
            padding: "0 20px 12px",
            width: "100%",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflow: "hidden",
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
            flexShrink: 0,
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
            disabled={!canSign}
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
          disabled={!canSign}
          fullWidth
        >
          {isPending ? "Signing..." : "Acknowledge"}
        </Button>
      </Box>
    </Dialog>
  )
}
