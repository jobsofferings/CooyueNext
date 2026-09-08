const pendingScripts = new Map<string, Promise<void>>()

export function loadScript(source: string): Promise<void> {
  const pending = pendingScripts.get(source)
  if (pending) return pending
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = source
    script.async = true
    const timer = window.setTimeout(() => fail(), 15000)
    const fail = () => {
      window.clearTimeout(timer)
      script.remove()
      pendingScripts.delete(source)
      reject(new Error(`Could not load ${source}`))
    }
    script.onload = () => { window.clearTimeout(timer); resolve() }
    script.onerror = fail
    document.body.appendChild(script)
  })
  pendingScripts.set(source, promise)
  return promise
}
