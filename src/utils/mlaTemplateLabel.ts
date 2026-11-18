import { TFunction } from "i18next"

/// How an MLA template is named to borrowers and lenders: every market MLA is
/// "Market MLA"; a custom MLA by its name and version.
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
    : t("mla.marketMla")
