import { Box, Link as MuiLink, Typography } from "@mui/material"
import { Trans } from "react-i18next"

import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { COLORS } from "@/theme/colors"

import { TermsLabelSx } from "../style"

const TermsLink = (
  <MuiLink
    href={EXTERNAL_LINKS.LENDER_KYC_TERMS}
    target="_blank"
    rel="noopener noreferrer"
    underline="always"
    color={COLORS.blueRibbon}
  />
)

type KycTermsCheckboxProps = {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export const KycTermsCheckbox = ({
  checked,
  disabled,
  onChange,
}: KycTermsCheckboxProps) => (
  <Box
    component="label"
    sx={{
      ...TermsLabelSx,
      cursor: disabled ? "default" : "pointer",
    }}
  >
    <ExtendedCheckbox
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      sx={{
        padding: 0,
        marginTop: "2px",
        "& ::before": { transform: "translate(-3px, -3px) scale(0.75)" },
      }}
    />
    <Typography variant="text3" color={COLORS.blackRock}>
      <Trans
        i18nKey="lenderKyc.modal.terms"
        components={{ termsLink: TermsLink }}
      />
    </Typography>
  </Box>
)

export const KycTermsStatement = () => (
  <Typography variant="text3" color={COLORS.blackRock}>
    <Trans
      i18nKey="lenderKyc.modal.termsByReturning"
      components={{ termsLink: TermsLink }}
    />
  </Typography>
)

export const KycPrivacyNotice = () => (
  <Typography variant="text4" component="p" color={COLORS.santasGrey}>
    <Trans
      i18nKey="lenderKyc.modal.privacyNotice"
      components={{
        privacyLink: (
          <MuiLink
            href={EXTERNAL_LINKS.PRIVACY_POLICY}
            target="_blank"
            rel="noopener noreferrer"
            underline="always"
            color={COLORS.blueRibbon}
          />
        ),
      }}
    />
  </Typography>
)
