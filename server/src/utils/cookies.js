export function parseCookies(cookieHeader) {
  const cookies = {}
  if (!cookieHeader) {
    return cookies
  }

  for (const pair of cookieHeader.split(';')) {
    const separatorIndex = pair.indexOf('=')
    if (separatorIndex === -1) continue

    const key = pair.slice(0, separatorIndex).trim()
    const value = pair.slice(separatorIndex + 1).trim()
    if (key) {
      cookies[key] = decodeURIComponent(value)
    }
  }

  return cookies
}
