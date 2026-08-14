<script setup lang="ts">
// Tabler 아이콘 이름을 직접 칠 수도, "찾아보기"로 Iconify 검색 API에서 골라도 됨.
const modelValue = defineModel<string>({ required: true })

const open = ref(false)
const query = ref('')
const results = ref<string[]>([])
const searching = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function runSearch() {
  const q = query.value.trim()
  if (!q) {
    results.value = []
    return
  }
  searching.value = true
  try {
    const res = await $fetch<{ icons?: string[] }>('https://api.iconify.design/search', {
      query: { query: q, prefix: 'tabler', limit: 60 },
    })
    results.value = res.icons ?? []
  } catch {
    results.value = []
  } finally {
    searching.value = false
  }
}

watch(query, () => {
  clearTimeout(timer)
  timer = setTimeout(runSearch, 300)
})

function choose(icon: string) {
  modelValue.value = icon
  open.value = false
  query.value = ''
  results.value = []
}
</script>

<template>
  <div class="icon-picker">
    <div class="field-row">
      <input v-model="modelValue" type="text" placeholder="tabler:star">
      <button type="button" class="btn glass-btn" @click="open = !open">
        {{ open ? '닫기' : '찾아보기' }}
      </button>
    </div>

    <div v-if="open" class="icon-picker-panel">
      <input v-model="query" type="text" placeholder="검색 (예: home, music, folder)" autofocus>
      <p v-if="searching" class="hint" style="margin: 8px 0 0;">검색 중…</p>
      <p v-else-if="query && results.length === 0" class="hint" style="margin: 8px 0 0;">결과 없음</p>
      <div v-else class="icon-picker-grid">
        <button
          v-for="icon in results"
          :key="icon"
          type="button"
          class="icon-picker-item"
          :class="{ selected: icon === modelValue }"
          :title="icon"
          @click="choose(icon)"
        >
          <iconify-icon :icon="icon" />
        </button>
      </div>
    </div>
  </div>
</template>
