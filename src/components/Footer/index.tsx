"use client"

import { Box, Button, Divider, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useLenderKycWalletStatus } from "@/app/[locale]/lender/hooks/useLenderKyc"
import { StatusDot } from "@/components/StatusDot"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useAppDispatch } from "@/store/hooks"
import { setIsVisible } from "@/store/slices/cookieBannerSlice/cookieBannerSlice"
import { setLenderKycDialogOpen } from "@/store/slices/lenderKycDialogSlice/lenderKycDialogSlice"
import { setTouModalOpen } from "@/store/slices/touModalSlice/touModalSlice"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import { isServiceAgreementPath } from "@/utils/serviceAgreementParty"

import { ContentContainer, DeployInfoSx } from "./style"

const DEPLOY_DATE_FORMAT = "DD.MM.YYYY HH:mm"

const getCommitInfo = (isMobile: boolean) => {
  if (
    process.env.NODE_ENV !== "production" ||
    !process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  )
    return null

  return (
    <Box sx={DeployInfoSx}>
      <Link
        href={`${process.env.NEXT_PUBLIC_GIT_WILDCAT_URL}/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
        target="_blank"
        style={{
          display: "flex",
          justifyContent: "center",
          color: isMobile ? COLORS.white06 : COLORS.santasGrey,
        }}
      >
        <Typography
          variant="text4"
          color={isMobile ? COLORS.white06 : COLORS.santasGrey}
        >
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
        </Typography>
      </Link>

      <Box
        sx={{
          width: "2px",
          height: "2px",
          borderRadius: "50%",
          bgcolor: { xs: COLORS.white06, md: COLORS.santasGrey },
        }}
      />

      <Typography
        variant="text4"
        sx={{
          textAlign: { xs: "center", md: "left" },
          color: { xs: COLORS.white06, md: COLORS.santasGrey },
        }}
      >
        {dayjs(process.env.BUILD_TIME).utc().format(DEPLOY_DATE_FORMAT)}
      </Typography>
    </Box>
  )
}

type FooterProps = { showFooter?: boolean; showDivider?: boolean }

export const Footer = ({
  showFooter = true,
  showDivider = true,
}: FooterProps) => {
  const dispatch = useAppDispatch()
  const isMobile = useMobileResolution()

  const { t } = useTranslation()
  const pathname = usePathname()
  const showFooterOnPage = !isServiceAgreementPath(pathname)

  const handleOpenCookiesModal = () => dispatch(setIsVisible(true))

  // "Terms of Use status" opens the ToU status/re-acceptance modal on
  // demand (bypasses the session dismissal). Hidden without a wallet.
  const { address } = useAccount()
  const { touState } = useNetworkGate()
  const handleOpenTouModal = () => dispatch(setTouModalOpen(true))
  const touAttentionColor =
    touState === "staleWithinGrace"
      ? COLORS.galliano
      : (touState === "staleExpired" || touState === "declined") &&
        COLORS.dullRed
  const touDot = touAttentionColor && <StatusDot color={touAttentionColor} />

  // "Get verified" opens the verification dialog. Amber once the wallet has
  // signed: verification is then in progress at SOMA.finance.
  const { chainId } = useSelectedNetwork()
  const { data: kycStatus } = useLenderKycWalletStatus(address, chainId)
  const handleOpenKycDialog = () => dispatch(setLenderKycDialogOpen(true))
  const kycDot = kycStatus?.hasSigned && <StatusDot color={COLORS.galliano} />

  const COMMIT_INFO = getCommitInfo(isMobile)

  if (isMobile) {
    return (
      <Box marginTop="4px">
        {showDivider && <Divider sx={{ borderColor: COLORS.white06 }} />}

        <Box
          sx={{
            padding: "24px 20px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Button
            size="small"
            variant="contained"
            color="secondary"
            sx={{
              borderRadius: "8px",
              color: COLORS.white,
              bgcolor: COLORS.white03,
              "&:hover": { color: COLORS.white, bgcolor: COLORS.white03 },
            }}
            onClick={handleOpenCookiesModal}
          >
            Cookies Settings
          </Button>

          {/* Agreement pages have the ToU actions themselves and suppress the
              modal - match the desktop footer and hide the button there. */}
          {address && showFooterOnPage && (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              sx={{
                borderRadius: "8px",
                color: COLORS.white,
                bgcolor: COLORS.white03,
                "&:hover": { color: COLORS.white, bgcolor: COLORS.white03 },
              }}
              onClick={handleOpenTouModal}
            >
              Terms of Use status
              {touDot}
            </Button>
          )}

          {address && showFooterOnPage && (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              sx={{
                borderRadius: "8px",
                color: COLORS.white,
                bgcolor: COLORS.white03,
                "&:hover": { color: COLORS.white, bgcolor: COLORS.white03 },
              }}
              onClick={handleOpenKycDialog}
            >
              {t("lenderKyc.sidebar.button")}
              {kycDot}
            </Button>
          )}

          <Link
            href="https://docs.wildcat.finance/legal/protocol-ui-privacy-policy"
            target="_blank"
            style={{
              display: "flex",
              textDecoration: "none",
            }}
          >
            <Typography
              variant="text4"
              color={COLORS.white06}
              sx={{ textDecoration: "underline" }}
            >
              Privacy Policy
            </Typography>
          </Link>

          <Typography variant="text4" textAlign="center" color={COLORS.white06}>
            {t("footer.rights")}
          </Typography>

          {COMMIT_INFO}
        </Box>
      </Box>
    )
  }

  if (showFooter) {
    return (
      <Box sx={ContentContainer}>
        {showFooterOnPage && (
          <>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              sx={{
                borderRadius: "8px",
                marginBottom: "8px",
              }}
              onClick={handleOpenCookiesModal}
            >
              Cookies Settings
            </Button>

            {address && (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                sx={{
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}
                onClick={handleOpenTouModal}
              >
                Terms of Use status
                {touDot}
              </Button>
            )}

            {address && (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                sx={{
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}
                onClick={handleOpenKycDialog}
              >
                {t("lenderKyc.sidebar.button")}
                {kycDot}
              </Button>
            )}

            <Link
              href="/api/service-agreement/current/download"
              target="_blank"
              style={{
                display: "flex",
                textDecoration: "none",
                marginBottom: "4px",
              }}
            >
              <Typography variant="text4" sx={{ display: "flex", gap: "2px" }}>
                {t("footer.agreement")} <Box sx={{ rotate: "270deg" }}>⇤</Box>
              </Typography>
            </Link>

            <Link
              href="https://docs.wildcat.finance/legal/protocol-ui-privacy-policy"
              target="_blank"
              style={{
                display: "flex",
                textDecoration: "none",
                marginBottom: "8px",
              }}
            >
              <Typography variant="text4">Privacy Policy</Typography>
            </Link>
          </>
        )}

        <Typography
          variant="text4"
          color={COLORS.santasGrey}
          sx={{ marginBottom: COMMIT_INFO ? "2px" : 0 }}
        >
          {t("footer.rights")}
        </Typography>

        {COMMIT_INFO}
      </Box>
    )
  }

  return null
}
