export const MainContainer = {
  width: "69.88%",
  margin: "0 auto 0 0",
  padding: "52px 20px 24px 44px",
}

export const getMainContainerStyle = (isMarketPage?: boolean) => {
  if (isMarketPage)
    return {
      width: "100%",
      margin: "0",
      paddingTop: "32px",
    }
  return {
    width: "69.88%",
    margin: "0 auto 0 0",
    padding: "52px 20px 24px 44px",
  }
}
