import { build } from 'esbuild'
import { REPLACES } from './replaces.ts'
import { generateRandomString } from './utils.ts'
import { TransformData } from '../mod.ts'
import { toTikaxParam } from '../../utils/cache.ts'
import * as path from '@std/path'

export const IS_ESM_QUERY = toTikaxParam('esm')

export interface InjectContext {
  url: string
}

export interface JSInit {
  esm: boolean
  url: string
}
export const transformJSInternal = async (
  code: string,
  opts: JSInit,
): Promise<string> => {
  const ctx: InjectContext = {
    url: opts.url,
  }

  const globalSymbol = generateRandomString(8)

  const define = Object.fromEntries(REPLACES.map((replace) => [replace, `${globalSymbol}.${replace}`]))

  const built = await build({
    stdin: {
      contents: code,
      loader: 'js',
    },
   // format: opts.esm ? 'esm' : void 0,
    write: false,
    platform: 'browser',
    define
  })

  if (!built.outputFiles) {
    throw new Error('No output files')
  }

  const builtCode = built.outputFiles[0].text
  const outputCode = `
    var ${globalSymbol} = ${await Deno.readTextFile(
    './transformer/javascript/inject.js',
  )}(${JSON.stringify(ctx)});
    ${builtCode}
  `

  return outputCode
}

export const transformJS = async (
  input: Response,
  data: TransformData,
): Promise<Response> => {
  const init: JSInit = {
    esm: data.searchParams.get(IS_ESM_QUERY) === 'true',
    url: data.searchParams.get(toTikaxParam('js-from')) ?? data.targetURL.href,
  }
  const code = await input.text()

  const result = await transformJSInternal(code, init)

  /*const dist = path.join('dist', new URL(input.url).pathname.slice(0, 100))
  await Deno.mkdir(dist, { recursive: true })
  await Deno.writeTextFile(path.join(dist, 'raw.js'), code)
  await Deno.writeTextFile(path.join(dist, 'out.js'), result)*/

  return new Response(result, {
    headers: input.headers,
    status: input.status ?? 200,
    statusText: input.statusText,
  })
}
