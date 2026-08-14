export default defineEventHandler(async (event) => {
  const body = await readBody<{ action?: string, value?: string }>(event)
  const { action, value } = body ?? {}

  if (!action) {
    throw createError({ statusCode: 400, statusMessage: 'action이 필요합니다.' })
  }

  try {
    await runAction(action, value ?? '')
    return { status: 'ok', action, value }
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: e instanceof Error ? e.message : '액션 실행 실패',
    })
  }
})
