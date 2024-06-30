export const cacheFetch: typeof fetch = async (input, init) => {
  const req = new Request(input, init)
  if (globalThis.caches) {
    const cache = await caches.open('cacheFetch')
    const matched = await cache.match(req)
    if (matched) {
      return matched
    } else {
      const res = await fetch(req)
      await cache.put(req, res)
      return res
    }
  } else {
    return await fetch(req)
  }
}
export const TIKAX_PARAM_START = 'tikax--'
export const toTikaxParam = (attr: string) => `${TIKAX_PARAM_START}${attr}`
