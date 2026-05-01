export const getPaginationRange = (
  page: number,
  totalPages: number,
): (number | "...")[] => {
  const range: (number | "...")[] = []

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }

  range.push(0)

  if (page > 2) {
    range.push("...")
  }

  for (
    let i = Math.max(1, page - 1);
    i <= Math.min(totalPages - 2, page + 1);
    // eslint-disable-next-line no-plusplus
    i++
  ) {
    range.push(i)
  }

  if (page < totalPages - 3) {
    range.push("...")
  }

  range.push(totalPages - 1)

  return range
}
