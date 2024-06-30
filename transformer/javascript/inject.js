(/** @param {import('./mod.ts').InjectContext} ctx*/(ctx) => {
  /**
   * @type {{
   *   XMLHttpRequest: typeof XMLHttpRequest
   *   fetch: typeof fetch
   *   navigator: Navigator
   * }}
   */
  const globalReplaces = {
    XMLHttpRequest: class extends XMLHttpRequest {
      constructor () {
        super()
      }
      open(method, url, async, user, password) {
        const afterURL = new URL(url, ctx.url)
        const urlToSend = `/${encodeURIComponent(afterURL.href)}`
        super.open(method, urlToSend, async, user, password)
        console.log('opened', urlToSend)
      }
    },
    fetch: (input, init) => {
     // console.log('fetched', input, init)
      const url = `/${encodeURIComponent(new URL(input instanceof Request ? input.url : input, ctx.url).href)}`
      if (input instanceof Request) {
        input = {
          ...url,
          input
        }
      } else {
        input = url
      }
      const req = new Request(input, init)
      return fetch(req)
    },
    location: new Proxy(location, {
      get (_target, prop) {
        const now = new URL(ctx.url)
        return now[prop]
      },
      set (target, prop, value) {
        const now = new URL(ctx.url)
        now[prop] = value
        target.href = `/${encodeURIComponent(now)}`
      }
    })
    /*
    navigator: {
      ...globalThis.navigator,
      sendBeacon (url, data) {
        console.log(url, data)
        return navigator.sendBeacon(url, data)
      }
    }*/
  }

  const result = new Proxy(globalThis, {
    get(target, prop) {
      /**
       * @type {unknown}
       */
      const item = prop in globalReplaces ? globalReplaces[prop] : target[prop]

      return typeof item === 'function'
        ? item.bind(window)
        : item
    },
    set(target, prop, newValue) {
      globalReplaces[prop] = target[prop] = newValue
      return true
    },
  })
  //globalReplaces.window = result
  globalReplaces.self = result

  if (!globalThis.XMLHttpRequest.__tunx) {
    globalThis.XMLHttpRequest = globalReplaces.XMLHttpRequest
    globalThis.XMLHttpRequest.__tunx = true
  }
  if (!globalThis.fetch.__tunx) {
    globalThis.fetch = globalReplaces.fetch
    globalThis.fetch.__tunx = true
  }

  return result
})
