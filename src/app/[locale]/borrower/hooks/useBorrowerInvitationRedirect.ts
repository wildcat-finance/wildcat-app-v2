import { useAccount } from "wagmi"

import { useGetController } from "@/hooks/useGetController"
import { ROUTES } from "@/routes"

import {
  useBorrowerInvitationExists,
} from "./useBorrowerInvitation"

const GOOGLE_FORM_LINK = "https://forms.gle/irca7KeC7ASmkRh16"

export const useBorrowerInvitationRedirect = () => {
  const { address } = useAccount()
  const {
    data: controller,
    isLoading: isControllerLoading,
    isSuccess,
  } = useGetController()
  const { isLoading: isLoadingInvitation, data: invitation } = useBorrowerInvitationExists(address)
  const isRegisteredBorrower = controller?.isRegisteredBorrower
  const markets = controller?.markets || []

  // - If user is not logged in, hide banner
  if (!address) {
    return {
      hideNewMarketButton: true,
      hideBanner: false,
      title: "Apply to become a borrower",
      message:
        "Interested in borrowing through Wildcat? Click in the link below to apply!",
      buttonText: "Leave a Request",
      url: `https://forms.gle/irca7KeC7ASmkRh16`,
    }
  }

  const isLoading = isControllerLoading || isLoadingInvitation

  if (isRegisteredBorrower) {
    if (!markets.length) {
      return {
        title: "Start creating your Markets here",
        text: "No market currently active, let’s create a new one.",
        buttonText: "Create a Market",
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

  if (isLoading || !isSuccess) {
    return {
      hideNewMarketButton: true,
      hideBanner: true,
    }
  }

  return {
    hideNewMarketButton: true,
    title: "Apply to become a borrower",
    text: "We see you aren't whitelisted as a borrower. Please complete this Typeform and we'll reach out for next steps.",
    buttonText: "Leave a Request",
    link: {
      isExternal: true,
      url: GOOGLE_FORM_LINK,
    },
  }
}
