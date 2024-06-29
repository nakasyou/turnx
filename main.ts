import { Hono } from '@hono/hono'
import { transform } from './transformer/mod.ts'

const app = new Hono()

app.all('/', async (c) => {
  const url = c.req.query('url')

  if (!url) {
    return c.json({ error: 'url is required' }, 400)
  }

  const req = new Request(url, {
    headers: c.req.header(),
    method: c.req.method,
    body: c.req.raw.body,
    redirect: 'manual'
  })
  const res = await fetch(req)

  const transformed = await transform(res, {
    searchParams: new URLSearchParams(c.req.query()),
    targetURL: new URL(url)
  })

  return transformed
})

Deno.serve(app.fetch)
