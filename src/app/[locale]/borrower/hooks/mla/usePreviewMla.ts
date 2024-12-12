import { useQuery } from "@tanstack/react-query"
import { Market } from "@wildcatfi/wildcat-sdk"

import { lastSlaUpdateTime, MlaTemplate } from "@/app/api/mla/interface"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import { TargetNetwork } from "@/config/network"
import {
  BasicBorrowerInfo,
  fillInMlaForLender,
  fillInMlaTemplate,
  getFieldValuesForBorrower,
} from "@/lib/mla"

export const PREVIEW_MLA_KEY = "PREVIEW_MLA"

export const usePreviewMla = (
  market: Market,
  mlaTemplateId: number | undefined,
  timeSigned: number,
  borrowerProfile: BorrowerProfile | undefined,
) =>
  useQuery({
    enabled: !!mlaTemplateId && !!borrowerProfile && !!timeSigned,
    queryKey: [
      PREVIEW_MLA_KEY,
      market.borrower,
      !!borrowerProfile,
      mlaTemplateId,
      timeSigned,
    ],
    queryFn: async () => {
      if (!mlaTemplateId) throw new Error("MLA template ID is required")
      if (!borrowerProfile) throw new Error("Borrower profile is required")
      const mlaTemplate = await fetch(
        `/api/mla/templates/${mlaTemplateId}`,
      ).then((res) => res.json() as Promise<MlaTemplate>)
      console.log(`borrowerProfile`)
      console.log(borrowerProfile)
      const borrowerValues = getFieldValuesForBorrower(
        market,
        borrowerProfile as BasicBorrowerInfo,
        TargetNetwork,
        timeSigned,
        +lastSlaUpdateTime,
      )
      const { html, plaintext } = fillInMlaTemplate(mlaTemplate, borrowerValues)
      const { html: htmlWithPlaceholders } = fillInMlaForLender(
        {
          html,
          plaintext,
          lenderFields: mlaTemplate.lenderFields,
        },
        new Map(
          mlaTemplate.lenderFields.map((field) => [
            field.source,
            `[${field.placeholder}]`,
          ]),
        ),
      )
      return {
        html,
        plaintext,
        htmlWithPlaceholders,
        mlaTemplate,
      }
    },
  })
