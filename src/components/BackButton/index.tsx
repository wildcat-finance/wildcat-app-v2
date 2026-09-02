import { Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"

import BackArrow from "@/assets/icons/backArrow_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export type BackButtonProps = {
  title: string
  link?: string
  onClick?: () => void
}

const buttonSx = {
  color: COLORS.santasGrey,
  fontWeight: 500,
  justifyContent: "flex-start",
  marginBottom: "14px",

  "&:hover": {
    "& .MuiSvgIcon-root": {
      "& path": {
        fill: `${COLORS.blackRock08}`,
      },
    },
  },
}

const iconSx = {
  marginRight: "4px",
  "& path": {
    fill: `${COLORS.santasGrey}`,
    transition: "fill 0.2s",
  },
}

// This always renders a link to `link`, and deliberately has no history mode.
// There used to be a `back` prop that called `router.back()` whenever
// `window.history.length > 1`. That length counts the whole tab's session
// history rather than this app's, so anyone who opened a market URL in a tab
// that already held another site was sent back to that other site instead of
// to the markets page the control names. See issue 32. If a caller needs to
// return somewhere history-dependent, give it an explicit destination rather
// than reintroducing the branch.
export const BackButton = ({
  title,
  link = ROUTES.borrower.root,
  onClick,
}: BackButtonProps) => (
  <Button
    component={Link}
    href={link}
    fullWidth
    variant="text"
    size="medium"
    onClick={onClick}
    sx={buttonSx}
  >
    <SvgIcon fontSize="small" sx={iconSx}>
      <BackArrow />
    </SvgIcon>
    {title}
  </Button>
)
