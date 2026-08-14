import type { ButtonDef, PadPage } from '../../server/utils/store'

export const PAGE_KEY_COUNT = 12
export const PINNED_KEY_COUNT = 3

/** 지금 페이지의 12칸 + 모든 페이지 공통인 pinnedKeys 3칸을 합쳐 15키 그리드로 만듦. */
export function buildDisplaySlots(page: PadPage | null, pinnedKeys: (ButtonDef | null)[]): (ButtonDef | null)[] {
  const configured = Array.from({ length: PAGE_KEY_COUNT }, (_, i) => page?.buttons[i] ?? null)
  return [...configured, ...pinnedKeys]
}
