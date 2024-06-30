import { DOMParser } from '@b-fuze/deno-dom'
import { IS_ESM_QUERY, JSInit, transformJSInternal } from './javascript/mod.ts'
import { TransformData } from './mod.ts'
import { cacheFetch, toTikaxParam } from '../utils/cache.ts'
import { toProxyURL } from './utils.ts'

const erudaCode = `
${await cacheFetch('https://cdn.jsdelivr.net/npm/eruda').then((res) =>
  res.text()
)};
eruda.init();
`
export const transformHTML = async (
  input: Response,
  data: TransformData,
): Promise<Response> => {
  const parsed = new DOMParser().parseFromString(
    await input.text(),
    'text/html',
  )

  for (const form of parsed.getElementsByTagName('form')) {
    const action = form.getAttribute('action')
    if (action) {
      const url = new URL(action, input.url).href
      form.setAttribute('action', `/${encodeURIComponent(url)}`)
    }
  }

  for (const script of parsed.getElementsByTagName('script')) {
    const type = script.getAttribute('type')
    if (type !== 'module' && !type?.includes('javascript') && type) {
      // Not JavaScript (such as application/json)
      continue
    }
    const src = script.getAttribute('src')
    const isESM = type === 'module'

    if (src) {
      // Has src
      const scriptURL = new URL(src, input.url).href
      const afterURL = `/${
        encodeURIComponent(scriptURL)
      }?${IS_ESM_QUERY}=${isESM}&${toTikaxParam('js-from')}=${encodeURIComponent(data.targetURL.href)}`
      script.setAttribute('src', afterURL)
    } else {
      // Inline (Just compile)
      const init: JSInit = {
        esm: isESM,
        url: data.targetURL.href,
      }
      const code = script.innerHTML
      const result = await transformJSInternal(code, init)

      script.innerHTML = result
    }
  }

  // Image
  for (const img of parsed.getElementsByTagName('img')) {
    const src = img.getAttribute('src')
    if (src) {
      const srcUrl = new URL(src, data.targetURL)
      if (srcUrl.protocol !== 'https:' && srcUrl.protocol !== 'http:') {
        continue
      }
      img.setAttribute('src', toProxyURL(srcUrl))
      img.removeAttribute('srcset')
    }
  }

  // Anchor
  for (const a of parsed.getElementsByTagName('a')) {
    const href = a.getAttribute('href')
    if (href) {
      const url = new URL(href, data.targetURL)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        continue
      }
      a.setAttribute('href', toProxyURL(url))
    }
  }

  // link
  for (const link of parsed.getElementsByTagName('link')) {
    const href = link.getAttribute('href')
    if (href) {
      const url = new URL(href, data.targetURL)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        continue
      }
      link.setAttribute('href', toProxyURL(url))
    }
  }

  // Meta redirect

  // Insert Eruda
  const erudaScript = parsed.createElement('script')
  erudaScript.innerHTML = erudaCode
  parsed.head.append(erudaScript)

  return new Response(parsed.documentElement?.outerHTML ?? '', {
    status: input.status,
    headers: input.headers,
    statusText: input.statusText,
  })
}
