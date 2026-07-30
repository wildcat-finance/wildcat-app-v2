import ELFsByCountry from "@/config/elfs-by-country.json"
import Jurisdictions from "@/config/jurisdictions.json"

export const getLegalEntityFormName = (
  jurisdiction: string | undefined,
  entityKind: string | undefined,
): string | undefined => {
  if (jurisdiction === undefined || entityKind === undefined) {
    return undefined
  }

  const jurisdictionObj =
    Jurisdictions[jurisdiction as keyof typeof Jurisdictions]
  if (!jurisdictionObj) {
    return undefined
  }

  return ELFsByCountry[
    jurisdictionObj.countryCode as keyof typeof ELFsByCountry
  ]?.find((elf) => elf.elfCode === entityKind)?.name
}
