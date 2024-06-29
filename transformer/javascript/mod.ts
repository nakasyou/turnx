import { build } from 'esbuild'
import { REPLACES } from './replaces.ts'
import { generateRandomString } from './utils.ts'
import { TransformData } from '../mod.ts'

export const IS_ESM_QUERY = 'turnx-esm'

export interface InjectContext {
  url: string
}

export interface JSInit {
  esm: boolean
  url: string
}
export const transformJSInternal = async (code: string, opts: JSInit): Promise<string> => {
  const ctx: InjectContext = {
    url: opts.url
  }

  const globalSymbol = generateRandomString(8)
  const built = await build({
    stdin: {
      contents: code,
      loader: 'js'
    },
    format: opts.esm ? 'esm' : 'iife',
    write: false,
    platform: 'browser',
    define: Object.fromEntries(REPLACES.map(replace => [replace, `${globalSymbol}.${replace}`])),
  })

  if (!built.outputFiles) {
    throw new Error('No output files')
  }
  
  const outputCode = `
    var ${globalSymbol} = ${await Deno.readTextFile('./transformer/javascript/inject.js')}(${JSON.stringify(ctx)});

    ${code ?? built.outputFiles[0].text}
  `

  return outputCode
}

export const transformJS = async (input: Response, data: TransformData): Promise<Response> => {  
  const init: JSInit = {
    esm: data.searchParams.get(IS_ESM_QUERY) === 'true',
    url: data.searchParams.get('js-from') ?? data.targetURL.href
  }
  const code = await input.text()

  const result = await transformJSInternal(code, init)

  return new Response(result, {
    headers: input.headers,
    status: input.status ?? 200,
    statusText: input.statusText
  })
}
