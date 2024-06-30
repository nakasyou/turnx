import { Hono } from '@hono/hono'
import { transform } from './transformer/mod.ts'
import { TIKAX_PARAM_START } from './utils/cache.ts'

const app = new Hono()

app.get(
  '/',
  (c) =>
    c.html(
      `<input type="url" onchange="location.href = '/' + encodeURIComponent(event.target.value)" />`,
    ),
)
app.all('/:url{.*}', async (c) => {
  const url = c.req.param('url')

  if (!url) {
    return c.json({ error: 'url is required' }, 400)
  }

  let targetURL: URL
  try {
    targetURL = new URL(url)
  } catch {
    console.error('Invalid URL:', url)
    return c.json({ error: ['invalid url', url] })
  }

  if (targetURL.protocol !== 'http:' && targetURL.protocol !== 'https:' && targetURL.protocol !== 'data:') {
    return c.json({ error: ['invalid protocol', targetURL.protocol] })
  }

  for (const [k, v] of Object.entries(c.req.query())) {
    if (k.startsWith(TIKAX_PARAM_START)) {
      continue
    }
    targetURL.searchParams.append(k, v)
  }
  const req = new Request(targetURL, {
    headers: c.req.header(),
    method: c.req.method,
    body: c.req.raw.body,
    redirect: 'manual',
  })
  const res = await fetch(req)

  const transformed = await transform(res, {
    searchParams: new URLSearchParams(c.req.query()),
    targetURL: targetURL,
  })

  return transformed
})

Deno.serve(app.fetch)
