(/** @param {import('./mod.ts').InjectContext} ctx*/(ctx) => {
  /**
   * @type {{
   *   [K: import('./replaces.ts')[number]]: (typeof globalThis)[K]
   * }}
   */
  const globalReplaces =  {
    XMLHttpRequest: class extends XMLHttpRequest {
      open (method, url, async, user, password) {
        const afterURL = new URL(url, ctx.url)
        super.open(method, afterURL, async, user, password)
      }
    }
  }

  const result = new Proxy(globalReplaces, {
    get (target, prop) {
      if (prop in target) {
        return globalReplaces[prop]
      }
      return globalThis[prop]
    },
    set (target, prop, newValue) {
      target[prop] = newValue
    }
  })

  globalReplaces.globalThis = globalReplaces
  globalReplaces.window = result
  globalReplaces.self = globalReplaces

  return result
})
