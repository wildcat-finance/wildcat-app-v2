"use client"

import { Box, Button, Divider, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useAppDispatch } from "@/store/hooks"
import { setIsVisible } from "@/store/slices/cookieBannerSlice/cookieBannerSlice"
import { TOKENS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"

import { ContentContainer, DeployInfoSx } from "./style"

const DEPLOY_DATE_FORMAT = "DD.MM.YYYY HH:mm"

const getCommitInfo = () => {
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
          color: TOKENS.textTertiary,
        }}
      >
        <Typography variant="text4" color={TOKENS.textTertiary}>
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
        </Typography>
      </Link>

      <Box
        sx={{
          width: "2px",
          height: "2px",
          borderRadius: "50%",
          bgcolor: TOKENS.textTertiary,
        }}
      />

      <Typography
        variant="text4"
        sx={{
          textAlign: { xs: "center", md: "left" },
          color: TOKENS.textTertiary,
        }}
      >
        {dayjs(process.env.BUILD_TIME).format(DEPLOY_DATE_FORMAT)}
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
  const showFooterOnPage = pathname !== "/agreement"

  const handleOpenCookiesModal = () => dispatch(setIsVisible(true))

  const COMMIT_INFO = getCommitInfo()

  if (isMobile) {
    return (
      <Box marginTop="4px">
        {showDivider && <Divider sx={{ borderColor: TOKENS.borderSubtle }} />}

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
            sx={{ borderRadius: "8px" }}
            onClick={handleOpenCookiesModal}
          >
            Cookies Settings
          </Button>

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
              color={TOKENS.textTertiary}
              sx={{ textDecoration: "underline" }}
            >
              Privacy Policy
            </Typography>
          </Link>

          <Typography
            variant="text4"
            textAlign="center"
            color={TOKENS.textTertiary}
          >
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

            <Link
              href="/pdf/Wildcat_Terms_of_Use.pdf"
              target="_blank"
              style={{
                display: "flex",
                textDecoration: "none",
                marginBottom: "4px",
              }}
            >
              <Typography
                variant="text4"
                color={TOKENS.textPrimary}
                sx={{ display: "flex", gap: "2px" }}
              >
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
              <Typography variant="text4" color={TOKENS.textPrimary}>
                Privacy Policy
              </Typography>
            </Link>
          </>
        )}

        <Typography
          variant="text4"
          color={TOKENS.textTertiary}
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
