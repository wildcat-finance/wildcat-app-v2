import { useAccount } from "wagmi"

import { useGetBasicBorrowerData } from "@/hooks/useGetBasicBorrowerData"
import { ROUTES } from "@/routes"

import { useBorrowerInvitationExists } from "./useBorrowerInvitation"

const GOOGLE_FORM_LINK = "https://forms.gle/irca7KeC7ASmkRh16"

export const useBorrowerInvitationRedirect = () => {
  const { address } = useAccount()
  const {
    data: borrowerData,
    isLoading: isLoadingBorrowerData,
    isSuccess,
  } = useGetBasicBorrowerData(address as string)
  const { isLoading: isLoadingInvitation, data: invitation } =
    useBorrowerInvitationExists(address)
  const isRegisteredBorrower = borrowerData?.isRegisteredBorrower

  // - If user is not logged in, hide banner
  if (!address) {
    return {
      hideNewMarketButton: true,
      hideBanner: false,
      title: "Become A Borrower",
      message: "Corporate entity interested in establishing a credit line?",
      buttonText: "Get In Touch",
      url: GOOGLE_FORM_LINK,
    }
  }

  const isLoading = isLoadingBorrowerData || isLoadingInvitation

  if (isLoading || !isSuccess) {
    return {
      hideNewMarketButton: true,
      hideBanner: true,
    }
  }

  if (isRegisteredBorrower) {
    if (!borrowerData.hasMarkets) {
      return {
        title: "No Active Markets",
        text: "Get started with Wildcat by creating an active market!",
        buttonText: "Create New Market",
        link: {
          isExternal: false,
          url: ROUTES.borrower.createMarket,
        },
      }
    }

    return {
      hideBanner: true,
    }
  }

  if (invitation) {
    return {
      title: "Pending Borrower Invitation",
      text: "You've been invited to register as a Wildcat borrower.",
      buttonText: "Accept",
      hideBanner: false,
      link: {
        isExternal: false,
        url: ROUTES.borrower.invitation,
      },
    }
  }

  return {
    hideNewMarketButton: true,
    title: "Become A Borrower",
    text: "Corporate entity interested in establishing a credit line?",
    buttonText: "Get In Touch",
    link: {
      isExternal: true,
      url: GOOGLE_FORM_LINK,
    },
  }
}
