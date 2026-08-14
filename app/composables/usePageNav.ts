import type { PadPage } from '../../server/utils/store'

const STORAGE_KEY = 'FeatherDeck:currentPage'

/** 컨트롤러/설정 화면이 공유하는 "지금 몇 번째 페이지 보고 있는지" 상태. */
export function usePageNav(pages: Ref<PadPage[]>) {
  const currentIndex = useState('FeatherDeck-current-page', () => {
    if (import.meta.client) {
      const saved = Number(localStorage.getItem(STORAGE_KEY))
      if (Number.isInteger(saved) && saved >= 0) return saved
    }
    return 0
  })

  watch(currentIndex, (v) => {
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, String(v))
  })

  // 페이지가 삭제되는 등으로 범위를 벗어나면 마지막 페이지로 보정
  watch(pages, () => {
    const max = Math.max(0, pages.value.length - 1)
    if (currentIndex.value > max) currentIndex.value = max
  }, { immediate: true })

  const currentPage = computed(() => pages.value[currentIndex.value] ?? null)

  function goToIndex(i: number) {
    if (i >= 0 && i < pages.value.length) currentIndex.value = i
  }

  // '폴더' 버튼(action: 'page')이 가리키는 페이지 id로 이동. 못 찾으면 조용히 무시.
  function goToPageId(id: string) {
    const i = pages.value.findIndex(p => p.id === id)
    if (i !== -1) currentIndex.value = i
  }

  return { currentIndex, currentPage, goToIndex, goToPageId }
}
