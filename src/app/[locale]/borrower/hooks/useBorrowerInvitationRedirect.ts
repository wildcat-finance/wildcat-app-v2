import { useAccount } from "wagmi"

import { useGetBasicBorrowerData } from "@/hooks/useGetBasicBorrowerData"
import { ROUTES } from "@/routes"

import {
  BorrowerInvitationStatus,
  useBorrowerInvitationExists,
} from "./useBorrowerInvitation"

const GOOGLE_FORM_LINK = "https://forms.gle/irca7KeC7ASmkRh16"

export type BannerConfigType = {
  title?: string
  message?: string
  button?: string
  link?: {
    url: string
    isExternal: boolean
  }
  hideCreateMarket?: boolean
  hideBanner?: boolean
}

export const useBorrowerInvitationRedirect = (): BannerConfigType => {
  const { address, isConnected } = useAccount()

  const {
    data: borrowerData,
    isLoading: isLoadingBorrowerData,
    isSuccess,
  } = useGetBasicBorrowerData(address as string)

  const { isLoading: isLoadingInvitation, data: invitationStatus } =
    useBorrowerInvitationExists(address)

  const isRegisteredBorrower = borrowerData?.isRegisteredBorrower

  const isLoading = isLoadingBorrowerData || isLoadingInvitation

  if (!isConnected) {
    return {
      title: "Become A Borrower",
      message: "Corporate entity interested in establishing a credit line?",
      button: "Get In Touch",
      link: {
        isExternal: true,
        url: GOOGLE_FORM_LINK,
      },
      hideCreateMarket: true,
      hideBanner: false,
    }
  }

  if (isLoading || !isSuccess) {
    return {
      hideCreateMarket: true,
      hideBanner: true,
    }
  }

  if (isRegisteredBorrower) {
    if (!borrowerData.hasMarkets) {
      return {
        title: "No Active Markets",
        message: "Get started with Wildcat by creating an active market!",
        button: "Create New Market",
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

  if (invitationStatus !== undefined) {
    if (invitationStatus === BorrowerInvitationStatus.PendingRegistration) {
      return {
        hideBanner: false,
        title: "Pending On-chain Registration",
        message:
          "You will be able to create your first market once the Wildcat team finalizes your borrower registration on-chain.",
        hideCreateMarket: true,
      }
    }
    return {
      title: "Pending Borrower Invitation",
      message: "You've been invited to register as a Wildcat borrower.",
      button: "Accept",
      hideBanner: false,
      link: {
        isExternal: false,
        url: ROUTES.borrower.invitation,
      },
      hideCreateMarket: true,
    }
  }

  return {
    title: "Become A Borrower",
    message: "Corporate entity interested in establishing a credit line?",
    button: "Get In Touch",
    link: {
      isExternal: true,
      url: GOOGLE_FORM_LINK,
    },
    hideCreateMarket: true,
  }
}
