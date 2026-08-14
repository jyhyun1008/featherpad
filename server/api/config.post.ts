import type { PadConfig } from '../utils/store'

export default defineEventHandler(async (event) => {
  const body = await readBody<PadConfig>(event)

  if (!body || !Array.isArray(body.pages) || body.pages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '설정 형식이 올바르지 않습니다.' })
  }

  // writeConfig 내부에서 페이지당 12칸으로 정규화하므로 여기선 대략적인 형태만 확인
  return await writeConfig(body)
})
