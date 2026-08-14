<script setup lang="ts">
import type { ButtonDef, PadConfig, PadPage } from '../../server/utils/store'

const ACTIONS: ButtonDef['action'][] = ['app', 'shortcut', 'url', 'file', 'volume', 'page']
const PRE_ACTIONS: ButtonDef['preAction'][] = ['', 'app', 'shortcut', 'url', 'file', 'volume']

const { url } = useServerUrl()
const { apiFetch } = useApi()
const { connect: connectToServer } = useServerConnect()
const { effective, toggle } = useTheme()

const serverUrlDraft = ref('')
const connection = ref<'idle' | 'checking' | 'ok' | 'error'>('idle')
const connectionMessage = ref('')

const pages = ref<PadPage[]>([])
const pinnedKeys = ref<(ButtonDef | null)[]>(Array.from({ length: PINNED_KEY_COUNT }, () => null))
const { currentIndex, currentPage, goToIndex } = usePageNav(pages)
const renamingIndex = ref<number | null>(null)

const displaySlots = computed(() => buildDisplaySlots(currentPage.value, pinnedKeys.value))

const selectedIndex = ref<number | null>(null)
const current = computed<ButtonDef | null>(() => {
  if (selectedIndex.value === null) return null
  if (selectedIndex.value < PAGE_KEY_COUNT) return currentPage.value?.buttons[selectedIndex.value] ?? null
  return pinnedKeys.value[selectedIndex.value - PAGE_KEY_COUNT] ?? null
})

const save = ref<'idle' | 'saving' | 'ok' | 'error'>('idle')
const saveMessage = ref('')

function blankButton(i: number): ButtonDef {
  return { id: `key-${i}`, label: '', icon: '', image: '', action: 'app', value: '', preAction: '', preValue: '' }
}

function selectKey(i: number) {
  selectedIndex.value = i
  if (i < PAGE_KEY_COUNT) {
    const page = currentPage.value
    if (page && !page.buttons[i]) page.buttons[i] = blankButton(i)
  } else {
    const pi = i - PAGE_KEY_COUNT
    if (!pinnedKeys.value[pi]) pinnedKeys.value[pi] = blankButton(i)
  }
}

function clearSlot() {
  if (selectedIndex.value === null) return
  if (selectedIndex.value < PAGE_KEY_COUNT) {
    if (currentPage.value) currentPage.value.buttons[selectedIndex.value] = null
  } else {
    pinnedKeys.value[selectedIndex.value - PAGE_KEY_COUNT] = null
  }
  selectedIndex.value = null
}

function addPage() {
  const n = pages.value.length + 1
  pages.value.push({
    id: `page-${Date.now()}`,
    name: `Page ${n}`,
    buttons: Array.from({ length: PAGE_KEY_COUNT }, () => null),
  })
  goToIndex(pages.value.length - 1)
  nextTick(() => (renamingIndex.value = currentIndex.value))
}

function deleteCurrentPage() {
  if (pages.value.length <= 1) return
  pages.value.splice(currentIndex.value, 1)
}

watch(currentIndex, () => {
  selectedIndex.value = null
  renamingIndex.value = null
})

async function loadConfig() {
  try {
    const cfg = await apiFetch<PadConfig>('/api/config')
    pages.value = cfg.pages.map(p => ({ ...p, buttons: p.buttons.map(b => (b ? { ...b } : null)) }))
    pinnedKeys.value = cfg.pinnedKeys.map(b => (b ? { ...b } : null))
    goToIndex(0)
    selectedIndex.value = null
  } catch (e) {
    connection.value = 'error'
    connectionMessage.value = e instanceof Error ? e.message : '설정을 불러오지 못했습니다.'
  }
}

async function connect() {
  if (!serverUrlDraft.value.trim()) return
  connection.value = 'checking'
  connectionMessage.value = ''
  try {
    const res = await connectToServer(serverUrlDraft.value)
    connection.value = 'ok'
    connectionMessage.value = `연결됨 (${res.platform})`
    await loadConfig()
  } catch {
    connection.value = 'error'
    connectionMessage.value = '연결 실패 — 주소, HTTPS, Tailscale 상태를 확인하세요.'
  }
}

async function saveConfig() {
  save.value = 'saving'
  saveMessage.value = ''
  try {
    await apiFetch('/api/config', {
      method: 'POST',
      body: { pages: pages.value, pinnedKeys: pinnedKeys.value } satisfies PadConfig,
    })
    save.value = 'ok'
    saveMessage.value = '저장했습니다.'
  } catch (e) {
    save.value = 'error'
    saveMessage.value = e instanceof Error ? e.message : '저장에 실패했습니다.'
  }
}

onMounted(() => {
  serverUrlDraft.value = url.value
  if (url.value) {
    connection.value = 'ok'
    loadConfig()
  }
})
</script>

<template>
  <div class="page">
    <header class="topbar">
      <span class="title">FeatherDeck 설정</span>
      <nav>
        <button type="button" class="theme-toggle glass-btn" :aria-label="effective === 'light' ? '다크 모드로' : '라이트 모드로'" @click="toggle">
          <iconify-icon :icon="effective === 'light' ? 'tabler:moon' : 'tabler:sun'" />
        </button>
        <NuxtLink to="/">컨트롤러</NuxtLink>
      </nav>
    </header>

    <div class="settings">
      <section class="card settings-top">
        <h2>로컬 서버</h2>
        <p class="hint">
          Mac에서 실행 중인 FeatherDeck 서버 주소입니다. 이 기기(브라우저)에만 저장되며(localStorage),
          다른 기기와 공유되지 않습니다. Tailscale을 쓴다면
          <code>https://맥이름.tailXXXX.ts.net</code> 형식의 HTTPS 주소를 권장합니다.
        </p>
        <div class="field-row">
          <input
            v-model="serverUrlDraft"
            type="url"
            placeholder="https://your-mac.tailxxxx.ts.net"
            @keyup.enter="connect"
          >
          <button class="btn glass-btn primary" :disabled="connection === 'checking'" @click="connect">
            {{ connection === 'checking' ? '확인 중…' : '연결' }}
          </button>
        </div>
        <p v-if="connectionMessage" style="margin-top: 8px; font-size: 12.5px;" :style="{ color: connection === 'ok' ? 'var(--success-text)' : 'var(--danger-text)' }">
          {{ connectionMessage }}
        </p>
      </section>

      <template v-if="connection === 'ok'">
        <div class="page-tabs-row settings-top">
          <div class="page-tabs">
            <button
              v-for="(p, i) in pages"
              :key="p.id"
              type="button"
              class="page-tab"
              :class="{ active: i === currentIndex }"
              @click="goToIndex(i)"
              @dblclick="renamingIndex = i"
            >
              <input
                v-if="renamingIndex === i"
                v-model="p.name"
                type="text"
                class="page-tab-rename"
                autofocus
                @blur="renamingIndex = null"
                @keyup.enter="renamingIndex = null"
                @click.stop
              >
              <span v-else>{{ p.name }}</span>
            </button>
            <button type="button" class="page-tab add" @click="addPage">+ 페이지</button>
          </div>
          <button type="button" class="btn glass-btn danger" :disabled="pages.length <= 1" @click="deleteCurrentPage">
            이 페이지 삭제
          </button>
        </div>

        <div class="settings-layout">
          <div class="pad">
            <PadGrid :slots="displaySlots" :active-index="selectedIndex" :pinned-from="12" editable @activate="selectKey" />
          </div>

          <section class="card inspector">
            <template v-if="current && selectedIndex !== null">
              <h2>
                {{ selectedIndex < 12 ? `키 #${selectedIndex + 1}` : '고정 키' }}
                <span v-if="selectedIndex >= 12" style="font-size: 11.5px; color: var(--text-dim); font-weight: 400;">
                  — 모든 페이지에 동일하게 표시됨
                </span>
              </h2>

              <div class="field">
                <label>라벨</label>
                <input v-model="current.label" type="text" placeholder="표시할 이름">
              </div>

              <div class="field">
                <label>이미지 URL <span style="opacity: .6;">(있으면 아이콘 대신 이 이미지로 키를 채움)</span></label>
                <input v-model="current.image" type="url" placeholder="https://…">
              </div>

              <div class="field">
                <label>아이콘 <span style="opacity: .6;">(이미지가 없을 때 표시)</span></label>
                <IconPicker v-model="current.icon" />
              </div>

              <div class="field">
                <label>액션 <span style="opacity: .6;">('page'는 다른 페이지로 이동하는 폴더 버튼)</span></label>
                <select v-model="current.action">
                  <option v-for="a in ACTIONS" :key="a" :value="a">{{ a }}</option>
                </select>
              </div>

              <div class="field">
                <label>값</label>
                <select v-if="current.action === 'page'" v-model="current.value">
                  <option value="" disabled>이동할 페이지 선택</option>
                  <option v-for="p in pages" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <input v-else v-model="current.value" type="text" placeholder="예: Safari · cmd+shift+5 · https://…">
              </div>

              <template v-if="current.action === 'page'">
                <div class="field">
                  <label>이동 전에 먼저 실행 <span style="opacity: .6;">(선택 — 예: 로직 폴더로 가기 전에 Logic Pro를 앞으로 전환)</span></label>
                  <div class="field-row">
                    <select v-model="current.preAction">
                      <option v-for="a in PRE_ACTIONS" :key="a" :value="a">{{ a || '(없음)' }}</option>
                    </select>
                    <input
                      v-if="current.preAction"
                      v-model="current.preValue"
                      type="text"
                      placeholder="예: Logic Pro · cmd+tab"
                    >
                  </div>
                </div>
              </template>

              <div class="row-actions">
                <button class="btn glass-btn danger" @click="clearSlot">슬롯 비우기</button>
              </div>
            </template>
            <p v-else class="inspector-empty">
              왼쪽에서 키를 선택하세요.<br>
              <span style="opacity: .6; font-size: 12px;">📌 표시된 우하단 3키는 모든 페이지에 공통으로 뜨는 고정 키예요 — 뭘 넣을지는 자유입니다.</span>
            </p>
          </section>
        </div>

        <div class="row-actions" style="max-width: 980px; margin: 20px auto 0;">
          <span v-if="saveMessage" style="align-self: center; font-size: 12.5px;" :style="{ color: save === 'ok' ? 'var(--success-text)' : 'var(--danger-text)' }">
            {{ saveMessage }}
          </span>
          <button class="btn glass-btn primary" :disabled="save === 'saving'" @click="saveConfig">
            {{ save === 'saving' ? '저장 중…' : '저장' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
