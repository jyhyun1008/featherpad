const STORAGE_KEY = 'FeatherDeck:serverUrl'

/**
 * 이 기기가 말 걸어야 할 로컬 서버 주소(Tailscale HTTPS 등).
 * 기기(브라우저)마다 다를 수 있으므로 localStorage에만 저장한다 — 서버로 동기화하지 않음.
 */
export function useServerUrl() {
  const url = useState<string>('FeatherDeck-server-url', () => {
    if (import.meta.client) {
      return localStorage.getItem(STORAGE_KEY) ?? ''
    }
    return ''
  })

  function setServerUrl(next: string) {
    const trimmed = next.trim().replace(/\/+$/, '')
    url.value = trimmed
    if (import.meta.client) {
      if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed)
      else localStorage.removeItem(STORAGE_KEY)
    }
  }

  return { url, setServerUrl }
}
