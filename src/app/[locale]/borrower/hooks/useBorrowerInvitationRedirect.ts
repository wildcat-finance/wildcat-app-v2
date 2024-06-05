import { useAccount } from "wagmi"

import { useGetController } from "@/hooks/useGetController"
import { ROUTES } from "@/routes"

import { useBorrowerInvitation } from "./useBorrowerInvitation"

const GOOGLE_FORM_LINK = "https://forms.gle/irca7KeC7ASmkRh16"

export const useBorrowerInvitationRedirect = () => {
  const { address } = useAccount()
  const {
    data: controller,
    isLoading: isControllerLoading,
    isSuccess,
  } = useGetController()
  const { isLoading: isLoadingInvitation } = useBorrowerInvitation(address)
  const isRegisteredBorrower = controller?.isRegisteredBorrower
  const markets = controller?.markets || []

  // - If user is not logged in, hide banner
  if (!address) {
    return {
      hideNewMarketButton: true,
      hideBanner: true,
      message: "Want to borrow on Wildcat?",
      buttonText: "Apply here",
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
          url: ROUTES.borrower.newMarket,
        },
      }
    }

    return {
      hideBanner: true,
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
