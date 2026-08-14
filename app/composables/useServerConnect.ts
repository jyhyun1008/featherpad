/**
 * "서버 주소 입력 → /api/health 확인 → 통과하면 저장" 흐름을 컨트롤러 화면(모바일)과
 * 설정 화면(데스크탑) 양쪽에서 재사용하기 위한 composable.
 */
export function useServerConnect() {
  const { setServerUrl } = useServerUrl()

  async function connect(rawUrl: string) {
    const trimmed = rawUrl.trim().replace(/\/+$/, '')
    if (!trimmed) throw new Error('주소를 입력하세요.')

    const res = await $fetch<{ status: string, platform: string }>(`${trimmed}/api/health`)
    if (res.status !== 'ok') throw new Error('예상치 못한 응답입니다.')

    setServerUrl(trimmed)
    return res
  }

  return { connect }
}
