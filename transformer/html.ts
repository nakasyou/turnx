import { DOMParser } from '@b-fuze/deno-dom'
import { JSInit, transformJSInternal } from './javascript/mod.ts'
import { TransformData } from './mod.ts'

export const transformHTML = async (input: Response, data: TransformData): Promise<Response> => {
  const parsed = new DOMParser().parseFromString(await input.text(), 'text/html')

  for (const form of parsed.getElementsByTagName('form')) {
    const action = form.getAttribute('action')
    if (action) {
      const url = new URL(action, input.url).href
      form.setAttribute('action', `/?url=${encodeURIComponent(url)}`)
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
      const afterURL = `/?url=${encodeURIComponent(scriptURL)}&esm=${isESM}&js-from=${encodeURIComponent(data.targetURL.href)}`
      script.setAttribute('src', afterURL)
    } else {
      // Inline (Just compile)
      const init: JSInit = {
        esm: isESM,
        url: data.targetURL.href
      }
      const code = script.innerHTML
      const result = await transformJSInternal(code, init)

      script.innerHTML = result
    }
  }

  return new Response(parsed.documentElement?.outerHTML ?? '', {
    status: input.status,
    headers: input.headers,
    statusText: input.statusText
  })
}
