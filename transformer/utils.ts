export const toProxyURL = (url: URL | string) =>
  `/${encodeURIComponent(url.toString())}`
