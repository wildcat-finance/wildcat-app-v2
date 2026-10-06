import { Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"
import { useRouter } from "next/navigation"

import BackArrow from "@/assets/icons/backArrow_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export type BackButtonProps = {
  title: string
  link?: string
  back?: boolean
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

export const BackButton = ({
  title,
  link = ROUTES.borrower.root,
  back,
  onClick,
}: BackButtonProps) => {
  const router = useRouter()

  if (back) {
    const handleBack = () => {
      if (window.history.length > 1) {
        router.back()
      } else {
        router.push(link)
      }
    }

    return (
      <Button
        fullWidth
        variant="text"
        size="medium"
        onClick={handleBack}
        sx={buttonSx}
      >
        <SvgIcon fontSize="small" sx={iconSx}>
          <BackArrow />
        </SvgIcon>
        {title}
      </Button>
    )
  }

  return (
    <Link href={link} passHref>
      <Button
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
    </Link>
  )
}
