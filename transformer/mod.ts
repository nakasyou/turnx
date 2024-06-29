import { transformHTML } from './html.ts'
import { IS_ESM_QUERY, transformJS } from './javascript/mod.ts'

export interface TransformData {
  searchParams: URLSearchParams
  targetURL: URL
}

export const transform = async (
  input: Response,
  data: TransformData,
): Promise<Response> => {
  const mimeType = input.headers.get('content-type')

  let res: Response

  if (input.headers.has('Location')) {
    // Redirect
    const location = input.headers.get('Location') ?? ''

    const target = new URL(location, input.url)
    res = new Response(null, {
      status: input.status,
      headers: {
        Location: `/?url=${target}`,
      },
    })
  } else if (mimeType?.startsWith('text/html')) {
    res = await transformHTML(input, data)
  } else if (
    mimeType?.includes('javascript') || data.searchParams.has(IS_ESM_QUERY)
  ) {
    res = await transformJS(input, data)
  } else {
    res = input
  }
  return res
}
