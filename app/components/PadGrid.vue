<script setup lang="ts">
import type { ButtonDef } from '../../server/utils/store'

const props = withDefaults(defineProps<{
  slots: (ButtonDef | null)[]
  activeIndex?: number | null
  pressedIndex?: number | null
  // 설정 화면에서만 true — 빈 키도 클릭해서 새로 채울 수 있어야 하므로.
  // 컨트롤러(기본값 false)에서는 빈 키가 완전히 눌리지 않는 "가짜 버튼"이 됨.
  editable?: boolean
  // 이 인덱스부터는 모든 페이지에 공통으로 뜨는 고정 키 — 코너에 작은 핀 표시만 붙여줌
  pinnedFrom?: number | null
}>(), {
  activeIndex: null,
  pressedIndex: null,
  editable: false,
  pinnedFrom: null,
})

const emit = defineEmits<{ activate: [index: number] }>()
</script>

<template>
  <div class="pad-grid">
    <button
      v-for="(btn, i) in slots"
      :key="i"
      type="button"
      class="pad-key"
      :class="{
        empty: !btn,
        selected: activeIndex === i,
        pressed: pressedIndex === i,
        pinned: props.pinnedFrom !== null && i >= props.pinnedFrom,
      }"
      :disabled="!btn && !props.editable"
      :style="btn?.image ? { backgroundImage: `url(${btn.image})` } : {}"
      @click="emit('activate', i)"
    >
      <iconify-icon v-if="props.pinnedFrom !== null && i >= props.pinnedFrom" icon="tabler:pin-filled" class="pin-badge" />
      <template v-if="btn">
        <iconify-icon v-if="!btn.image" :icon="btn.icon || 'tabler:square-rounded'" />
        <span v-if="btn.label" class="pad-key-label" :class="{ overlay: btn.image }">{{ btn.label }}</span>
      </template>
    </button>
  </div>
</template>
