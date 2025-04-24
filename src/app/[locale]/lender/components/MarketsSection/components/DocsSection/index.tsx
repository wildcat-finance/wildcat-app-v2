import React from "react"
import { Box, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { COLORS } from "@/theme/colors"

type DocsSectionProps = {
  isMobile: boolean
}

export const DocsSection = ({ isMobile }: DocsSectionProps) => {
  const { t } = useTranslation()

  const mobileStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      marginBottom: "24px",
      width: '95%',
      mx: 'auto'
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: '8px',
      fontSize: '14px'
    },
    link: {
      color: COLORS.santasGrey,
      textAlign: 'center' as const,
      display: 'block',
      fontSize: '14px'
    }
  }

  const desktopStyles = {
    container: {
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      marginBottom: "24px",
      gap: '4px'
    },
    subtitle: {
      marginBottom: '0'
    },
    link: {
      color: COLORS.santasGrey
    }
  }

  const styles = isMobile ? mobileStyles : desktopStyles

  if (isMobile) {
    return (
      <Box sx={styles.container}>
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          sx={styles.subtitle}
        >
          {t("dashboard.markets.lenderSubtitle")}
        </Typography>

        <Link
          href="https://docs.wildcat.finance/using-wildcat/day-to-day-usage/lenders"
          style={styles.link}
          target="_blank"
        >
          {t("dashboard.markets.docsLink")}
        </Link>
      </Box>
    )
  }

  return (
    <Box sx={styles.container}>
      <Typography
        variant="text3"
        color={COLORS.santasGrey}
      >
        {t("dashboard.markets.lenderSubtitle")}{" "}
        <Link
          href="https://docs.wildcat.finance/using-wildcat/day-to-day-usage/lenders"
          style={styles.link}
          target="_blank"
        >
          {t("dashboard.markets.docsLink")}
        </Link>
      </Typography>
    </Box>
  )
} 