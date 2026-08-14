// 정적 배포된 프론트(예: Vercel)와 이 로컬 서버(Tailscale HTTPS)는
// origin이 다르므로, API 요청이 CORS에 막히지 않도록 허용 헤더를 붙여준다.
export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')
  if (origin) {
    setResponseHeader(event, 'Access-Control-Allow-Origin', origin)
    setResponseHeader(event, 'Vary', 'Origin')
  }
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

  if (event.method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
  }
})
