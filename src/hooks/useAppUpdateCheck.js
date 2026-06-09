import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  CLIENT_BUILD_ID,
  createVersionChannel,
  fetchServerBuildId,
  hardRefreshApp,
} from '@/lib/appVersion'

const POLL_INTERVAL_MS = 5 * 60 * 1000
const AUTO_REFRESH_MS = 10 * 60 * 1000

export default function useAppUpdateCheck() {
  const notifiedRef = useRef(false)
  const autoRefreshTimerRef = useRef(null)

  useEffect(() => {
    if (import.meta.env.DEV) return undefined

    const channel = createVersionChannel()

    const clearAutoRefreshTimer = () => {
      if (autoRefreshTimerRef.current) {
        clearTimeout(autoRefreshTimerRef.current)
        autoRefreshTimerRef.current = null
      }
    }

    const notifyNewVersion = ({ broadcast = true } = {}) => {
      if (notifiedRef.current) return
      notifiedRef.current = true

      toast('Hay una nueva versión del CRM', {
        description: 'Actualizá para usar la última versión.',
        duration: Infinity,
        action: {
          label: 'Actualizar',
          onClick: () => hardRefreshApp(),
        },
      })

      autoRefreshTimerRef.current = setTimeout(() => {
        hardRefreshApp()
      }, AUTO_REFRESH_MS)

      if (broadcast && channel) {
        channel.postMessage({ type: 'NEW_VERSION' })
      }
    }

    const checkForUpdate = async () => {
      try {
        const serverBuildId = await fetchServerBuildId()
        if (serverBuildId && serverBuildId !== CLIENT_BUILD_ID) {
          notifyNewVersion()
        }
      } catch {
        // Ignore network errors during background checks
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    }

    const handleChannelMessage = (event) => {
      if (event.data?.type === 'NEW_VERSION') {
        notifyNewVersion({ broadcast: false })
      }
    }

    checkForUpdate()
    const pollId = setInterval(checkForUpdate, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    channel?.addEventListener('message', handleChannelMessage)

    return () => {
      clearInterval(pollId)
      clearAutoRefreshTimer()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      channel?.removeEventListener('message', handleChannelMessage)
      channel?.close()
    }
  }, [])
}
