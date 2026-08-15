import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'
import defaultConfig from '../data/default-config.json'

// 실물 스트림덱과 동일: 5열 x 3행 = 15키.
export const PAGE_KEY_COUNT = 12 // 페이지마다 바뀌는 칸
export const PINNED_KEY_COUNT = 3 // 우하단 3칸 — 모든 페이지에서 항상 같은 버튼(뭘 넣을지는 자유)

export type RealAction = 'app' | 'volume' | 'shortcut' | 'url' | 'file' | 'clipboard'

export interface ButtonDef {
  id: string
  label: string
  icon: string // Tabler iconify 이름 — image가 없을 때 대체로 표시
  image: string // 키에 씌울 이미지 URL. 있으면 icon 대신 이걸 씀
  // 'page' — 누르면 value(페이지 id)로 이동하는 폴더/네비게이션 버튼. 나머지는 실제 macOS 액션.
  action: RealAction | 'page'
  value: string
  // action이 'page'일 때만 의미 있음: 페이지 전환 "전에" 먼저 실행할 실제 액션(선택).
  // 예: 로직 폴더로 이동하기 전에 Logic Pro를 먼저 앞으로 전환.
  preAction: RealAction | ''
  preValue: string
}

export interface PadPage {
  id: string
  name: string
  buttons: (ButtonDef | null)[] // 정확히 PAGE_KEY_COUNT칸
}

export interface PadConfig {
  pages: PadPage[] // 개수 제한 없음 — 설정 화면에서 계속 추가 가능
  pinnedKeys: (ButtonDef | null)[] // 정확히 PINNED_KEY_COUNT칸, 모든 페이지 공통
}

const CONFIG_DIR = platform() === 'darwin'
  ? join(homedir(), 'Library', 'Application Support', 'FeatherDeck')
  : join(homedir(), '.FeatherDeck')

const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

function normalizeButton(raw: any, index: number): ButtonDef {
  return {
    id: raw?.id || `key-${index}`,
    label: raw?.label ?? '',
    icon: raw?.icon ?? '',
    image: raw?.image ?? '',
    action: raw?.action ?? 'app',
    value: raw?.value ?? '',
    preAction: raw?.preAction ?? '',
    preValue: raw?.preValue ?? '',
  }
}

function normalizePage(raw: any, index: number): PadPage {
  const flat: any[] = Array.isArray(raw?.buttons) ? raw.buttons : []
  return {
    id: raw?.id || `page-${index}`,
    name: raw?.name || `Page ${index + 1}`,
    buttons: Array.from({ length: PAGE_KEY_COUNT }, (_, i) => (flat[i] ? normalizeButton(flat[i], i) : null)),
  }
}

function normalizePinned(raw: any): (ButtonDef | null)[] {
  const flat: any[] = Array.isArray(raw) ? raw : []
  return Array.from({ length: PINNED_KEY_COUNT }, (_, i) => (flat[i] ? normalizeButton(flat[i], i) : null))
}

function isCurrentFormat(data: any): boolean {
  return Array.isArray(data?.pages) && data.pages.length > 0 && Array.isArray(data?.pinnedKeys)
}

/**
 * - 이미 새 포맷(pages + pinnedKeys)이면 칸 수만 방어적으로 맞춰서 통과.
 * - 그 전 포맷(pages는 있지만 pinnedKeys가 없던 버전)이면 pinnedKeys를 빈 걸로 채움.
 * - 더 예전, 15칸 단일 그리드였던 포맷이면 앞 12칸은 page 1로, 나머지 3칸(있었다면)은 pinnedKeys로.
 */
function migrate(data: any): PadConfig {
  if (Array.isArray(data?.pages)) {
    return {
      pages: data.pages.map((p: any, i: number) => normalizePage(p, i)),
      pinnedKeys: normalizePinned(data.pinnedKeys),
    }
  }
  const flat: any[] = Array.isArray(data?.buttons) ? data.buttons : []
  return {
    pages: [normalizePage({ id: 'page-0', name: 'Page 1', buttons: flat.slice(0, PAGE_KEY_COUNT) }, 0)],
    pinnedKeys: normalizePinned(flat.slice(PAGE_KEY_COUNT, PAGE_KEY_COUNT + PINNED_KEY_COUNT)),
  }
}

export async function readConfig(): Promise<PadConfig> {
  if (existsSync(CONFIG_PATH)) {
    const raw = JSON.parse(await readFile(CONFIG_PATH, 'utf-8'))
    if (isCurrentFormat(raw)) return migrate(raw)
    return writeConfig(migrate(raw))
  }
  return writeConfig(migrate(defaultConfig))
}

export async function writeConfig(data: PadConfig): Promise<PadConfig> {
  const normalized = migrate(data)
  await mkdir(CONFIG_DIR, { recursive: true })
  await writeFile(CONFIG_PATH, JSON.stringify(normalized, null, 2), 'utf-8')
  return normalized
}
