export function useApi() {
  const { url } = useServerUrl()

  function apiFetch<T>(path: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    if (!url.value) {
      return Promise.reject(new Error('로컬 서버 주소가 설정되지 않았습니다. 설정에서 먼저 연결하세요.'))
    }
    return $fetch<T>(`${url.value}${path}`, opts)
  }

  return { apiFetch }
}
