import { Box, SvgIcon, Typography } from "@mui/material"

import Info from "@/assets/icons/search_icon.svg"
import { COLORS } from "@/theme/colors"

export type GlossarySidebarProps = {
  stepNumber: number
}

export const GlossarySidebar = ({ stepNumber }: GlossarySidebarProps) => {
  let glossaryArray: {
    title: string
    description: string
  }[]

  switch (stepNumber) {
    case 1: {
      glossaryArray = [
        {
          title: "Market Policy",
          description:
            "Rules defining loan type (open or fixed) and access requirements.",
        },
        {
          title: "Policy Name",
          description: "The name of the market’s rule set.",
        },
      ]
      break
    }
    case 2: {
      glossaryArray = [
        {
          title: "Underlying Asset",
          description:
            "The ERC-20 token used for all transactions in the market, such as Wrapped Ether (wETH) or USDC.",
        },
        {
          title: "Market Token Name",
          description:
            "A descriptive name for the tokens lenders receive, representing their share in the market.",
        },
        {
          title: "Market Token Symbol",
          description:
            'A short identifier, like "whcWETH," for the tokens lenders receive in the market.',
        },
      ]
      break
    }
    case 3: {
      glossaryArray = [
        {
          title: "Master Loan Agreement",
          description:
            "A legally binding document that defines the terms, obligations, and penalties for borrowers and lenders in the market.",
        },
      ]
      break
    }
    case 4: {
      glossaryArray = [
        {
          title: "Max Borrowing Capacity",
          description:
            "The total amount borrowers can withdraw from the market.",
        },
        {
          title: "Base APR",
          description: "The standard interest rate for borrowing.",
        },
        {
          title: "Penalty APR",
          description:
            "Additional interest applied when the market is delinquent and beyond the grace period.",
        },
        {
          title: "Reserve Ratio",
          description:
            "The percentage of market funds kept unborrowed and locked as reserve.",
        },
        {
          title: "Minimum Deposit",
          description: "The smallest deposit allowed in the market.",
        },
      ]
      break
    }
    case 5: {
      glossaryArray = []
      break
    }
    case 6: {
      glossaryArray = []
      break
    }
    case 7: {
      glossaryArray = []
      break
    }
    case 8: {
      glossaryArray = []
      break
    }
    default: {
      glossaryArray = [
        {
          title: "Market Policy",
          description:
            "Rules defining loan type (open or fixed) and access requirements.",
        },
        {
          title: "Policy Name",
          description: "The name of the market’s rule set.",
        },
      ]
      break
    }
  }

  return (
    <Box
      sx={{
        width: "267px",
        minWidth: "267px",
        height: "100%",
        padding: "44px 44px 0 24px",
        display: "flex",
        flexDirection: "column",
        borderLeft: `1px solid ${COLORS.blackRock006}`,
      }}
    >
      <SvgIcon sx={{ "& path": { fill: COLORS.greySuit } }}>
        <Info />
      </SvgIcon>

      <Typography variant="text1" sx={{ margin: "12px 0 32px" }}>
        Glossary
      </Typography>

      {glossaryArray.map((block) => (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            marginBottom: "16px",
          }}
        >
          <Typography variant="text3">{`‣ ${block.title}`}</Typography>

          <Typography variant="text3" color={COLORS.santasGrey}>
            {block.description}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
