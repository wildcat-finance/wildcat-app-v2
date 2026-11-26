import { useEffect, useMemo, useState } from "react"

import { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { fillLenderPlaceholders } from "@/lib/mlaTemplateText"
import { getMlaTemplateLabel } from "@/utils/mlaTemplateLabel"

import { useSignLenderMLA } from "./useSignLenderMla"
import { useGetSignedMla } from "./useSignMla"

/// The market's MLA as the lender pages receive it: the agreement, the
/// borrower's refusal, or null when the borrower has not chosen yet.
export type LenderMlaInput =
  | MasterLoanAgreementResponse
  | undefined
  | null
  | { noMLA: boolean }

export type MlaDownload = { label: string; url: string }

/// The name lenders see for the market's MLA: the template's name, and a
/// custom MLA's version.
export const getLenderMlaLabel = (
  t: TFunction,
  mla: MasterLoanAgreementResponse,
) =>
  getMlaTemplateLabel(t, {
    name: mla.templateName,
    version: mla.templateVersion,
    isCustom: mla.isCustomTemplate,
  })

export const getLenderMlaButtonText = (
  t: TFunction,
  mlaInput: LenderMlaInput,
) => {
  if (mlaInput === null) return t("lenderMarketDetails.buttons.mlaNotSet")
  if (mlaInput && "noMLA" in mlaInput) {
    return t("lenderMarketDetails.buttons.mlaRefused")
  }
  if (!mlaInput) return t("lenderMarketDetails.buttons.viewMla")
  return t("mla.viewNamed", {
    name: getLenderMlaLabel(t, mlaInput),
    interpolation: { escapeValue: false },
  })
}

/// What a lender can download. Before signing: the agreement as the borrower
/// signed it, as a PDF with the lender's details as placeholders and as the
/// signed text. After signing: the lender's own PDF and signed copy.
export const getLenderMlaDownloads = (
  t: TFunction,
  mla: MasterLoanAgreementResponse,
  lender: string | undefined,
  hasSigned: boolean,
): MlaDownload[] => {
  const market = mla.market.toLowerCase()
  const query = `?chainId=${mla.chainId}`
  if (hasSigned && lender) {
    const base = `/api/mla/${market}/${lender.toLowerCase()}`
    return [
      { label: t("mla.downloadPdf"), url: `${base}/pdf${query}` },
      { label: t("mla.downloadSigned"), url: `${base}/signed${query}` },
    ]
  }
  return [
    { label: t("mla.downloadPdf"), url: `/api/mla/${market}/pdf${query}` },
    {
      label: t("mla.downloadBorrowerSigned"),
      url: `/api/mla/${market}/signed${query}`,
    },
  ]
}

/// Everything the desktop and mobile lender MLA views show and do, so the two
/// cannot drift apart.
export const useLenderMla = (mlaInput: LenderMlaInput) => {
  const { t } = useTranslation()
  const mla = mlaInput && !("noMLA" in mlaInput) ? mlaInput : undefined
  const { address } = useAccount()
  const { data: signedMla, isLoading: signedMlaLoading } = useGetSignedMla(mla)
  const [timeSigned, setTimeSigned] = useState(0)
  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])
  const { mutate: signMla, isPending: isSigning } = useSignLenderMLA()

  // The lender's signed copy once there is one; before that, the agreement
  // as the borrower signed it, with the lender's details as placeholders.
  const html = useMemo(() => {
    if (signedMla) return signedMla.html
    return mla ? fillLenderPlaceholders(mla.html, mla.lenderFields) : ""
  }, [signedMla, mla])

  return {
    mla,
    label: mla ? getLenderMlaLabel(t, mla) : undefined,
    buttonText: getLenderMlaButtonText(t, mlaInput),
    html,
    downloads: mla
      ? getLenderMlaDownloads(t, mla, address, !!signedMla)
      : ([] as MlaDownload[]),
    signedMla,
    signedMlaLoading,
    isSigning,
    canSign: !!mla && !!address && signedMla === null,
    sign: () => {
      if (mla && !signedMla && address) {
        signMla({ lenderAddress: address, mla, timeSigned })
      }
    },
  }
}
