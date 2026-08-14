<script setup lang="ts">
import type { ButtonDef, PadConfig } from '../../server/utils/store'

definePageMeta({ middleware: 'desktop-redirect' })

const { url } = useServerUrl()
const { apiFetch } = useApi()
const { connect } = useServerConnect()
const { effective, toggle } = useTheme()

const padConfig = ref<PadConfig | null>(null)
const pages = computed(() => padConfig.value?.pages ?? [])
const { currentPage, goToPageId } = usePageNav(pages)

const displaySlots = computed(() => buildDisplaySlots(currentPage.value, padConfig.value?.pinnedKeys ?? []))

const loading = ref(false)
const error = ref('')
const pressedIndex = ref<number | null>(null)

// 이 기기에 서버가 아직 등록 안 됐을 때 쓰는 최소 연결 폼 (설정 화면 전체를 안 거쳐도 됨)
const connectDraft = ref('')
const connecting = ref(false)
const connectError = ref('')

let clickSound: HTMLAudioElement | null = null

async function doConnect() {
  connecting.value = true
  connectError.value = ''
  try {
    await connect(connectDraft.value)
  } catch (e) {
    connectError.value = e instanceof Error ? e.message : '연결 실패'
  } finally {
    connecting.value = false
  }
}

async function loadConfig() {
  if (!url.value) return
  loading.value = true
  error.value = ''
  try {
    padConfig.value = await apiFetch<PadConfig>('/api/config')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '서버에 연결하지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function runAction(action: ButtonDef['action'] | ButtonDef['preAction'], value: string) {
  if (!action || !value) return
  await apiFetch('/api/action', { method: 'POST', body: { action, value } })
}

async function activate(index: number) {
  const btn = displaySlots.value[index]
  if (!btn) return

  pressedIndex.value = index
  clickSound?.play?.().catch(() => {})
  navigator.vibrate?.(10) // Android 계열에서만 동작 — iOS Safari는 Vibration API 자체를 미지원

  try {
    if (btn.action === 'page') {
      // 폴더 버튼 — 필요하면 전환 전에 실제 액션(예: 앱 앞으로 전환)부터 실행하고 페이지 이동
      if (btn.preAction) await runAction(btn.preAction, btn.preValue)
      goToPageId(btn.value)
    } else {
      await runAction(btn.action, btn.value)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '액션 실행에 실패했습니다.'
  } finally {
    setTimeout(() => (pressedIndex.value = null), 150)
  }
}

onMounted(() => {
  clickSound = new Audio('/click.mp3')
  loadConfig()
})

watch(url, () => loadConfig())
</script>

<template>
  <div class="page page-controller">
    <header class="topbar">
      <span class="title">FeatherDeck</span>
      <nav>
        <button type="button" class="theme-toggle glass-btn" :aria-label="effective === 'light' ? '다크 모드로' : '라이트 모드로'" @click="toggle">
          <iconify-icon :icon="effective === 'light' ? 'tabler:moon' : 'tabler:sun'" />
        </button>
        <NuxtLink to="/settings">설정</NuxtLink>
      </nav>
    </header>

    <div v-if="!url" class="notice">
      <p>아직 로컬 서버가 연결되지 않았어요.<br>Mac의 서버 주소를 입력하세요.</p>
      <div class="field-row" style="margin-top: 14px;">
        <input
          v-model="connectDraft"
          type="url"
          placeholder="https://내맥.tailXXXX.ts.net"
          @keyup.enter="doConnect"
        >
        <button class="btn glass-btn primary" :disabled="connecting" @click="doConnect">
          {{ connecting ? '확인 중…' : '연결' }}
        </button>
      </div>
      <p v-if="connectError" style="margin-top: 8px; font-size: 12.5px; color: var(--danger-text);">{{ connectError }}</p>
    </div>

    <template v-else>
      <div v-if="error" class="banner">{{ error }}</div>

      <div v-if="loading && !padConfig" class="notice">불러오는 중…</div>

      <div v-else-if="currentPage" class="pad">
        <PadGrid :slots="displaySlots" :pressed-index="pressedIndex" @activate="activate" />
      </div>
    </template>
  </div>
</template>
