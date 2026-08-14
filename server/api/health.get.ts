// 설정 화면에서 "이 주소가 진짜 FeatherDeck 로컬 서버인지" 확인할 때 씀.
export default defineEventHandler(() => ({
  status: 'ok',
  name: 'FeatherDeck',
  platform: process.platform,
  time: Date.now(),
}))
