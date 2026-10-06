const CLIENT_KEY = "wildcat-export-client"

// Keep the subscriber capability in this tab. Headers also work when the app
// is embedded in Safe and the browser blocks third-party cookies.
export function exportClientHeaders() {
  let clientId = window.sessionStorage.getItem(CLIENT_KEY)
  if (!clientId) {
    clientId = window.crypto.randomUUID()
    window.sessionStorage.setItem(CLIENT_KEY, clientId)
  }
  return { "X-Export-Client": clientId }
}
