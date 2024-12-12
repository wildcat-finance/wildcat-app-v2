import { Box, SvgIcon, Typography } from "@mui/material"

import Info from "@/assets/icons/info_icon.svg"
import { COLORS } from "@/theme/colors"

import { GlossarySidebarProps } from "./interface"
import { GlossaryContainer, GlossaryItem } from "./style"

export const GlossarySidebar = ({
  stepNumber,
  hideGlossary,
}: GlossarySidebarProps) => {
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
      glossaryArray = [
        {
          title: "Restrict Deposits",
          description: "Limits who can deposit into the market.",
        },
        {
          title: "Disable Transfers",
          description: "Prevents transferring tokens to others.",
        },
        {
          title: "Restrict Withdrawals",
          description:
            "Limits withdrawals to users meeting market access criteria.",
        },
        {
          title: "Restrict Transfers",
          description:
            "Limits transfers to participants who meet policy-defined access requirements.",
        },
      ]
      break
    }
    case 6: {
      glossaryArray = []
      break
    }
    case 7: {
      glossaryArray = [
        {
          title: "Grace period",
          description:
            "Time allowed for a delinquent market to recover before penalties apply.",
        },
        {
          title: "Withdrawal cycle length",
          description: "Time window until withdrawals are processed.",
        },
      ]
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
  if (hideGlossary)
    return (
      <Box
        sx={{
          width: "267px",
          minWidth: "267px",
          height: "100%",
        }}
      />
    )

  return (
    <Box sx={GlossaryContainer}>
      <SvgIcon sx={{ "& path": { fill: COLORS.greySuit } }}>
        <Info />
      </SvgIcon>

      <Typography variant="text1" sx={{ margin: "12px 0 32px" }}>
        Glossary
      </Typography>

      {glossaryArray.map((block) => (
        <Box sx={GlossaryItem}>
          <Typography variant="text3">{`‣ ${block.title}`}</Typography>

          <Typography variant="text3" color={COLORS.santasGrey}>
            {block.description}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
