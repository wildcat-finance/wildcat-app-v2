import { useAccount, useDisconnect, useSwitchChain } from "wagmi"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { Box, Button, Dialog, IconButton, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { COLORS } from "@/theme/colors"
import { sepolia } from "wagmi/chains"
import { TargetNetwork } from "@/config/network"
import { useCopyToClipboard } from "react-use"

import Link from "next/link"
import Cross from "../../../assets/icons/cross_icon.svg"
import Copy from "../../../assets/icons/copy_icon.svg"
import LinkIcon from "../../../assets/icons/link_icon.svg"

export type ProfileDialogProps = {
  open: boolean
  handleClose: () => void
}

export const ProfileDialog = ({ open, handleClose }: ProfileDialogProps) => {
  const [state, copyToClipboard] = useCopyToClipboard()

  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { isWrongNetwork } = useCurrentNetwork()
  const { switchChain } = useSwitchChain()

  const handleCopyAddress = (text: string) => {
    copyToClipboard(text)
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      sx={{
        "& .MuiDialog-paper": {
          width: "320px",
          borderRadius: "12px",
          borderColor: "#0000001A",
          margin: 0,
          padding: "16px 24px",

          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <IconButton
        disableRipple
        sx={{ padding: 0, marginLeft: "auto" }}
        onClick={handleClose}
      >
        <SvgIcon
          fontSize="medium"
          sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
        >
          <Cross />
        </SvgIcon>
      </IconButton>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        {isConnected && isWrongNetwork && (
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            onClick={() => switchChain({ chainId: sepolia.id })}
          >
            <Typography variant="text2">
              Switch to {TargetNetwork.name}
            </Typography>
          </Button>
        )}

        <Box
          sx={{
            height: "180px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            rowGap: "12px",
          }}
        >
          <Box
            width="32px"
            height="32px"
            bgcolor="#F4F4F8"
            borderRadius="50%"
          />
          {address && (
            <Box
              sx={{ display: "flex", alignItems: "center", columnGap: "4px" }}
            >
              <Typography variant="text1">
                {address.slice(0, 4)}..{address.slice(-4, address.length)}
              </Typography>

              <IconButton
                disableRipple
                sx={{
                  padding: 0,
                  "& path": {
                    fill: `${COLORS.greySuit}`,
                    transition: "fill 0.2s",
                  },
                  "& :hover": { "& path": { fill: `${COLORS.santasGrey}` } },
                }}
                onClick={() => handleCopyAddress(address?.toString())}
              >
                <SvgIcon fontSize="medium">
                  <Copy />
                </SvgIcon>
              </IconButton>

              <Link
                href={`https://etherscan.io/address/${address}`}
                target="_blank"
              >
                <IconButton
                  disableRipple
                  sx={{
                    padding: 0,
                    "& path": {
                      fill: `${COLORS.greySuit}`,
                      transition: "fill 0.2s",
                    },
                    "& :hover": { "& path": { fill: `${COLORS.santasGrey}` } },
                  }}
                >
                  <SvgIcon fontSize="medium">
                    <LinkIcon />
                  </SvgIcon>
                </IconButton>
              </Link>
            </Box>
          )}
        </Box>

        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={() => disconnect()}
        >
          <Typography variant="text2">Disconnect</Typography>
        </Button>
      </Box>
    </Dialog>
  )
}
