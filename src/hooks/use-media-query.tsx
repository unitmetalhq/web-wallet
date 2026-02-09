import { useSyncExternalStore } from "react"

export function useMediaQuery(query: string) {
  const subscribe = (callback: () => void) => {
    const mql = matchMedia(query)
    mql.addEventListener("change", callback)
    return () => mql.removeEventListener("change", callback)
  }

  const getSnapshot = () => matchMedia(query).matches

  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}