import { TFunction } from "i18next"

/// How an MLA template is named to borrowers and lenders: a market MLA by its
/// own name, a custom MLA by its name and version. Several market MLAs can be
/// offered on one network class, so a shared label would hide which legal
/// text is chosen.
export const getMlaTemplateLabel = (
  t: TFunction,
  template: { name: string; version?: string; isCustom: boolean },
) =>
  template.isCustom
    ? t("mla.customMla", {
        name: template.name,
        version: template.version ?? "",
        // React escapes the rendered text; i18next must not do it twice.
        interpolation: { escapeValue: false },
      })
    : template.name

/// The templates a borrower is offered for a market, as pick-list options.
/// Hidden templates stay valid for agreements already signed with them but
/// are not offered again; retired ones never reach the list.
export const getMlaTemplateOptions = (
  t: TFunction,
  templates:
    | {
        id: number
        name: string
        version?: string
        borrowerId?: string
        hide?: boolean
      }[]
    | undefined,
) =>
  (templates ?? [])
    .filter((template) => !template.hide)
    .map((template) => ({
      id: template.id,
      label: getMlaTemplateLabel(t, {
        ...template,
        isCustom: !!template.borrowerId,
      }),
    }))
