"use client"

import React, { Dispatch, SetStateAction, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Slide,
  SvgIcon,
  Typography,
} from "@mui/material"
import { TransitionProps } from "@mui/material/transitions"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount, useDisconnect } from "wagmi"

import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import Avatar from "@/assets/icons/avatar_icon.svg"
import BackArrow from "@/assets/icons/backArrow_icon.svg"
import Menu from "@/assets/icons/burgerMenu_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import Arrow from "@/assets/icons/sharpArrow_icon.svg"
import TelegramFlyIcon from "@/assets/icons/telegramFly_icon.svg"
import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { HeaderNetworkButton } from "@/components/Header/HeaderNetworkButton"
import bannerBg from "@/assets/pictures/telegram_banner_bg.svg?url"
import {
  HelpMenuItemsList,
  TelegramHelpItem,
} from "@/components/HelpModal/HelpMenuItems"
import { LinkGroup } from "@/components/LinkComponent"
import { MobileConnectWallet } from "@/components/MobileConnectWallet"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useAppDispatch } from "@/store/hooks"
import { setIsVisible } from "@/store/slices/cookieBannerSlice/cookieBannerSlice"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

const SlideTransition = React.forwardRef(
  (
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>,
  ) => <Slide direction="left" ref={ref} {...props} />,
)

export type MobileMenuProps = {
  open: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

type Panel = "main" | "help"

export const MobileMenu = ({ open, setIsOpen }: MobileMenuProps) => {
  const { address, isConnected } = useAccount()
  const pathname = usePathname()
  const isMain = pathname.includes("lender") || pathname.includes("borrower")
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const { data: profileData } = useGetBorrowerProfile(address as `0x${string}`)

  const { disconnect } = useDisconnect()

  const [panel, setPanel] = useState<Panel>("main")
  const [openConnect, setOpenConnect] = useState(false)
  const handleToggleModal = () => {
    if (open) {
      setPanel("main")
    }
    setIsOpen(!open)
  }
  const handleToggleConnect = () => setOpenConnect(!openConnect)
  const { getAddressUrl } = useBlockExplorer()

  const handleClickDisconnect = () => {
    disconnect()
    handleToggleModal()
  }

  const handleOpenCookiesModal = () => {
    dispatch(setIsVisible(true))
    handleToggleModal()
  }

  const commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
        <HeaderNetworkButton />
        {isConnected && address && !open && (
          <Box
            onClick={handleToggleConnect}
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              minWidth: 0,
              backgroundColor: COLORS.whiteSmoke,
              borderRadius: "20px",
              padding: "2px 6px 2px 2px",
              gap: "4px",
            }}
          >
            {profileData && profileData.avatar ? (
              <Image
                src={profileData.avatar}
                alt="avatar"
                width={24}
                height={24}
                style={{ borderRadius: "50%", flexShrink: 0 }}
              />
            ) : (
              <SvgIcon sx={{ fontSize: "24px", flexShrink: 0 }}>
                <Avatar />
              </SvgIcon>
            )}
            <Typography
              variant="text3"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {trimAddress(address as string)}
            </Typography>
            <SvgIcon
              sx={{
                fontSize: "16px",
                flexShrink: 0,
                "& path": { fill: COLORS.santasGrey },
              }}
            >
              <UpArrow />
            </SvgIcon>
          </Box>
        )}

        <IconButton
          onClick={handleToggleModal}
          sx={{
            marginLeft: "4px",
            display: "flex",
            width: "40px",
            height: "40px",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SvgIcon
            sx={{
              fontSize: !open ? "40px" : "30px",
              "& path": {
                stroke: isMain && !open ? COLORS.black : COLORS.white,
              },
            }}
          >
            {!open || openConnect ? <Menu /> : <Cross />}
          </SvgIcon>
        </IconButton>
      </Box>

      {/* Blur overlay via Portal so it's outside the header stacking context */}
      {open && !openConnect && (
        <Portal>
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backdropFilter: "blur(20px)",
              zIndex: 4,
            }}
          />
        </Portal>
      )}

      <Dialog
        open={open}
        onClose={handleToggleModal}
        maxWidth={false}
        TransitionComponent={SlideTransition}
        sx={{
          height: openConnect ? "0px" : "100dvh",

          "& .MuiDialog-container": {
            justifyContent: "flex-end",
            alignItems: "stretch",
          },
          "& .MuiBackdrop-root": {
            backgroundColor: "transparent",
          },
        }}
        PaperProps={{
          sx: {
            border: "none !important",
            margin: "0 !important",
            width: "80% !important",
            minWidth: "0 !important",
            maxWidth: "80% !important",
            maxHeight: "100% !important",
            height: "100% !important",
            padding: "12px 16px !important",
            borderRadius: "20px 0 0 20px !important",
            overflowX: "hidden",
            overflowY: "auto",
          },
        }}
      >
        <Box sx={{ overflow: "hidden", height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              width: "200%",
              height: "100%",
              transform:
                panel === "help" ? "translateX(-50%)" : "translateX(0%)",
              transition: "transform 0.25s ease-in-out",
              alignItems: "stretch",
            }}
          >
            {/* ── Panel 1: Main ── */}
            <Box
              sx={{
                width: "50%",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Wallet row + close button */}
              {isConnected && address ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "6px",
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      borderRadius: "20px",
                      padding: "4px 12px 4px 4px",
                      backgroundColor: COLORS.whiteSmoke,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {profileData && profileData.avatar ? (
                      <Image
                        src={profileData.avatar}
                        style={{ borderRadius: "50%", marginRight: "7px" }}
                        alt="avatar"
                        width={24}
                        height={24}
                      />
                    ) : (
                      <SvgIcon sx={{ fontSize: "24px", marginRight: "7px" }}>
                        <Avatar />
                      </SvgIcon>
                    )}

                    <Typography
                      variant="text3"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {address as string}
                    </Typography>
                    <Box marginLeft="auto">
                      <LinkGroup
                        linkValue={getAddressUrl(address as string)}
                        copyValue={address}
                      />
                    </Box>
                  </Box>

                  <IconButton
                    onClick={handleToggleModal}
                    aria-label="Close"
                    sx={{
                      flexShrink: 0,
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: COLORS.whiteSmoke,
                    }}
                  >
                    <SvgIcon
                      sx={{
                        fontSize: "16px",
                        "& path": { fill: COLORS.manate },
                      }}
                    >
                      <Cross />
                    </SvgIcon>
                  </IconButton>
                </Box>
              ) : null}

              {/* Switch Account / Disconnect */}
              {isConnected ? (
                <Box
                  sx={{
                    display: "flex",
                    gap: "6px",
                    paddingTop: "6px",
                    marginBottom: "12px",
                  }}
                >
                  <Button
                    variant="contained"
                    color="secondary"
                    size="medium"
                    onClick={() => setOpenConnect(true)}
                    sx={{
                      padding: "12px 8px",
                      borderRadius: "10px",
                    }}
                    fullWidth
                  >
                    Switch Account
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="medium"
                    onClick={handleClickDisconnect}
                    sx={{
                      padding: "12px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    Disconnect
                  </Button>
                </Box>
              ) : (
                <Button
                  size="large"
                  fullWidth
                  onClick={handleToggleConnect}
                  sx={{
                    padding: "12px 8px",
                    borderRadius: "10px",
                    marginBottom: "12px",
                    backgroundColor: COLORS.ultramarineBlue,
                    color: COLORS.white,
                    "&:hover": {
                      backgroundColor: COLORS.blueRibbon,
                      color: COLORS.white,
                    },
                  }}
                >
                  Connect
                </Button>
              )}

              <Divider sx={{ borderColor: COLORS.whiteLilac, mb: "12px" }} />

              {/* Telegram Banner */}
              <Box
                component="aside"
                aria-label={t("telegramBanner.title")}
                sx={{
                  width: "100%",
                  borderRadius: "20px",
                  overflow: "hidden",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "12px",
                  backgroundImage: `url(${bannerBg.src})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <SvgIcon
                  aria-hidden="true"
                  sx={{
                    fontSize: "36px",
                    "& path": { fill: COLORS.white },
                  }}
                >
                  <TelegramFlyIcon />
                </SvgIcon>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Typography
                    variant="text2"
                    textAlign="center"
                    color={COLORS.white}
                  >
                    {t("telegramBanner.title")}
                  </Typography>
                  <Typography
                    variant="text4"
                    textAlign="center"
                    color={COLORS.white}
                    sx={{ opacity: 0.8 }}
                  >
                    {t("telegramBanner.subtitle")}
                  </Typography>
                </Box>
                <Button
                  component={Link}
                  href={EXTERNAL_LINKS.TELEGRAM_BOT}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  size="small"
                  sx={{
                    bgcolor: COLORS.white,
                    color: COLORS.bunker,
                    fontWeight: 600,
                    fontSize: "12px",
                    borderRadius: "20px",
                    px: "16px",
                    py: "6px",
                    "&:hover": { bgcolor: COLORS.whiteLilac },
                  }}
                >
                  {t("telegramBanner.button")}
                </Button>
              </Box>

              {/* Bottom section: Help + legal + footer pushed down */}
              <Box sx={{ marginTop: "auto" }}>
                {/* Help link */}
                <Box
                  onClick={() => setPanel("help")}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px",
                    cursor: "pointer",
                    borderRadius: "12px",
                    backgroundColor: COLORS.whiteSmoke,
                    marginBottom: "8px",
                  }}
                >
                  <Typography variant="text3" fontWeight={500}>
                    Help
                  </Typography>
                </Box>

                {/* Legal links */}
                <Box
                  onClick={handleOpenCookiesModal}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 6px",
                    cursor: "pointer",
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: COLORS.whiteSmoke },
                  }}
                >
                  <Typography variant="text3">Cookies Settings</Typography>
                  <SvgIcon
                    aria-hidden="true"
                    sx={{
                      transform: "rotate(-180deg)",
                      fontSize: "16px",
                      "& path": { fill: COLORS.santasGrey },
                    }}
                  >
                    <Arrow />
                  </SvgIcon>
                </Box>
                <Divider sx={{ borderColor: COLORS.whiteLilac }} />

                <Box
                  component={Link}
                  href="https://docs.wildcat.finance/legal/protocol-ui-privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 6px",
                    cursor: "pointer",
                    textDecoration: "none",
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: COLORS.whiteSmoke },
                  }}
                >
                  <Typography variant="text3">Privacy Policy</Typography>
                  <SvgIcon
                    aria-hidden="true"
                    sx={{
                      transform: "rotate(-180deg)",
                      fontSize: "16px",
                      "& path": { fill: COLORS.santasGrey },
                    }}
                  >
                    <Arrow />
                  </SvgIcon>
                </Box>
                <Divider sx={{ borderColor: COLORS.whiteLilac }} />

                <Box
                  component={Link}
                  href="/pdf/Wildcat_Terms_of_Use.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 6px",
                    cursor: "pointer",
                    textDecoration: "none",
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: COLORS.whiteSmoke },
                  }}
                >
                  <Typography variant="text3">Agreement</Typography>
                  <SvgIcon
                    aria-hidden="true"
                    sx={{
                      transform: "rotate(-180deg)",
                      fontSize: "16px",
                      "& path": { fill: COLORS.santasGrey },
                    }}
                  >
                    <Arrow />
                  </SvgIcon>
                </Box>
                <Divider sx={{ borderColor: COLORS.whiteLilac }} />

                {/* Footer */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    padding: "16px 0 8px",
                  }}
                >
                  <Typography
                    variant="text4"
                    color={COLORS.santasGrey}
                    textAlign="center"
                  >
                    Wildcat &copy; All Rights reserved. 2025
                  </Typography>
                  {commitSha && (
                    <Typography variant="text4" color={COLORS.santasGrey}>
                      Version {commitSha.slice(0, 4)}...{commitSha.slice(-4)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            {/* ── Panel 2: Help ── */}
            <Box
              sx={{
                width: "50%",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header with back arrow and close */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <IconButton
                  onClick={() => setPanel("main")}
                  aria-label="Back"
                  sx={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: COLORS.whiteSmoke,
                  }}
                >
                  <SvgIcon
                    sx={{
                      fontSize: "16px",
                      "& path": { fill: COLORS.manate },
                    }}
                  >
                    <BackArrow />
                  </SvgIcon>
                </IconButton>
                <IconButton
                  onClick={handleToggleModal}
                  aria-label="Close"
                  sx={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: COLORS.whiteSmoke,
                  }}
                >
                  <SvgIcon
                    sx={{
                      fontSize: "16px",
                      "& path": { fill: COLORS.manate },
                    }}
                  >
                    <Cross />
                  </SvgIcon>
                </IconButton>
              </Box>

              {/* Help header */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                  marginBottom: "18px",
                }}
              >
                <Typography variant="mobText1">
                  {t("helpModal.title")}
                </Typography>
                <Typography variant="mobText3" color={COLORS.manate}>
                  {t("helpModal.subtitle")}
                </Typography>
              </Box>

              {/* Telegram item (from HelpModal) */}
              <TelegramHelpItem />

              {/* Help menu items (from HelpModal) */}
              <HelpMenuItemsList />

              {/* Footer */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  padding: "16px 0 8px",
                  marginTop: "auto",
                }}
              >
                <Typography
                  variant="text4"
                  color={COLORS.santasGrey}
                  textAlign="center"
                >
                  Wildcat &copy; All Rights reserved. 2025
                </Typography>
                {commitSha && (
                  <Typography variant="text4" color={COLORS.santasGrey}>
                    Version {commitSha.slice(0, 4)}...{commitSha.slice(-4)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Dialog>

      <MobileConnectWallet
        open={openConnect}
        handleClose={handleToggleConnect}
      />
    </>
  )
}
