// 컨트롤러 화면(/)에 데스크탑 브라우저로 "새로" 들어온 경우 설정 화면으로 보낸다.
// - from.name이 있으면 앱 내부에서 이동해온 것(예: 설정→컨트롤러 링크 클릭)이므로 건너뜀.
// - 포인터가 정밀(마우스/트랙패드)하고 화면이 넓을 때만 "데스크탑"으로 판단 —
//   같은 조건이어도 태블릿(터치)은 그대로 컨트롤러를 보여준다.
export default defineNuxtRouteMiddleware((_to, from) => {
  if (!import.meta.client) return
  if (from.name) return

  const isDesktop = window.matchMedia('(pointer: fine) and (min-width: 900px)').matches
  if (isDesktop) return navigateTo('/settings')
})
