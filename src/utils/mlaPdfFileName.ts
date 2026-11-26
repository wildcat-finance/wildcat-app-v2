/// A PDF file name from an MLA's name and version, without the characters
/// file systems refuse.
export const toMlaPdfFileName = (...parts: (string | undefined)[]) => {
  const name = parts
    .filter((part) => part?.trim())
    .join(" ")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim()
  return `${name || "MLA"}.pdf`
}
