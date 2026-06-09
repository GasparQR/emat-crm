export const APP_VERSION_CHANNEL = 'emat-app-version'

export const CLIENT_BUILD_ID = import.meta.env.VITE_BUILD_ID ?? 'dev'

export function hardRefreshApp() {
  const target = `${window.location.pathname}${window.location.search}${window.location.hash}`
  window.location.replace(target)
}

export function isChunkLoadError(message) {
  if (!message) return false
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError')
  )
}

export async function fetchServerBuildId() {
  const response = await fetch('/version.json', { cache: 'no-store' })
  if (!response.ok) return null
  const data = await response.json()
  return data?.buildId ?? null
}

export function createVersionChannel() {
  if (typeof BroadcastChannel === 'undefined') return null
  return new BroadcastChannel(APP_VERSION_CHANNEL)
}

export function registerChunkLoadHandlers() {
  if (import.meta.env.DEV) return

  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event.message)) {
      hardRefreshApp()
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message ?? String(event.reason ?? '')
    if (isChunkLoadError(msg)) {
      event.preventDefault()
      hardRefreshApp()
    }
  })
}
