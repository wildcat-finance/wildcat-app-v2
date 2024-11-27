import { Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"

import BackArrow from "@/assets/icons/backArrow_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export type BackButtonProps = {
  title: string
  link?: string
}

export const BackButton = ({
  title,
  link = ROUTES.borrower.root,
}: BackButtonProps) => (
  <Link href={link} passHref>
    <Button
      fullWidth
      variant="text"
      size="medium"
      sx={{
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
      }}
    >
      <SvgIcon
        fontSize="small"
        sx={{
          marginRight: "4px",
          "& path": {
            fill: `${COLORS.santasGrey}`,
            transition: "fill 0.2s",
          },
        }}
      >
        <BackArrow />
      </SvgIcon>
      {title}
    </Button>
  </Link>
)
