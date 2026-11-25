import { useCallback, useEffect, useState } from "react"
import { RefreshCw, Sparkles } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

declare const __APP_VERSION__: string

const VERSION_CHECK_INTERVAL_MS = 60_000

type VersionResponse = {
  version?: string
}

export default function AppUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const checkForUpdate = useCallback(async () => {
    if (import.meta.env.DEV || updateAvailable) return

    try {
      const versionUrl = new URL(
        `${import.meta.env.BASE_URL}version.json`,
        window.location.origin,
      )
      versionUrl.searchParams.set("check", Date.now().toString())

      const response = await fetch(versionUrl, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) return

      const deployed = await response.json() as VersionResponse
      if (deployed.version && deployed.version !== __APP_VERSION__) {
        setUpdateAvailable(true)
      }
    } catch {
      // A temporary network failure should not interrupt the current session.
      // The next interval or window-focus event will retry automatically.
    }
  }, [updateAvailable])

  useEffect(() => {
    if (import.meta.env.DEV) return undefined

    const intervalId = window.setInterval(
      checkForUpdate,
      VERSION_CHECK_INTERVAL_MS,
    )

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") void checkForUpdate()
    }

    window.addEventListener("focus", checkForUpdate)
    document.addEventListener("visibilitychange", checkWhenVisible)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", checkForUpdate)
      document.removeEventListener("visibilitychange", checkWhenVisible)
    }
  }, [checkForUpdate])

  return (
    <AlertDialog open={updateAvailable}>
      <AlertDialogContent className="border-0 p-5 shadow-2xl ring-1 ring-[#0D1F3C]/10 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-[#E0F7F5] text-[#078F83]">
            <Sparkles aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#0D1F3C]">
            New version available
          </AlertDialogTitle>
          <AlertDialogDescription className="font-['Plus_Jakarta_Sans'] leading-6 text-[#4A6380]">
            A newer version of CultureXE is ready. Refresh now to load the latest changes.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-1 border-[#D9E3EC] bg-[#F5F8FB]">
          <AlertDialogAction
            className="h-10 w-full bg-[#1BBFB0] px-5 font-['Plus_Jakarta_Sans'] font-bold text-white hover:bg-[#159F93] sm:w-auto"
            onClick={() => window.location.reload()}
          >
            <RefreshCw aria-hidden="true" />
            Refresh app
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
