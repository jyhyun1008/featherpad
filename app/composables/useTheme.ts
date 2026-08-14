const STORAGE_KEY = 'FeatherDeck:theme'
type Theme = 'light' | 'dark' | ''

let systemListenerRegistered = false

/** 라이트/다크 토글. 값이 ''(미지정)이면 시스템(prefers-color-scheme)을 따라감. */
export function useTheme() {
  const theme = useState<Theme>('FeatherDeck-theme', () => {
    if (import.meta.client) return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? ''
    return ''
  })

  const systemPrefersLight = useState('FeatherDeck-system-light', () => false)

  if (import.meta.client && !systemListenerRegistered) {
    systemListenerRegistered = true
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    systemPrefersLight.value = mql.matches
    mql.addEventListener('change', e => (systemPrefersLight.value = e.matches))
  }

  // 명시적으로 고른 값이 있으면 그걸, 없으면 시스템 설정을 따름 — 토글 아이콘/메타 태그 표시용
  const effective = computed<'light' | 'dark'>(() => theme.value || (systemPrefersLight.value ? 'light' : 'dark'))

  if (import.meta.client) {
    watch(theme, (t) => {
      if (t) {
        document.documentElement.setAttribute('data-theme', t)
        localStorage.setItem(STORAGE_KEY, t)
      } else {
        document.documentElement.removeAttribute('data-theme')
        localStorage.removeItem(STORAGE_KEY)
      }
    }, { immediate: true })

    // 브라우저/PWA 상단바 색도 같이 맞춰줌
    watch(effective, (t) => {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f4f5f7' : '#0d0d0d')
    }, { immediate: true })
  }

  function toggle() {
    theme.value = effective.value === 'light' ? 'dark' : 'light'
  }

  return { theme, effective, toggle }
}
