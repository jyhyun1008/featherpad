// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // 데이터는 전부 런타임에 로컬 서버(API)에서 가져오므로, 빌드 시점엔
  // 서버가 존재한다고 가정할 수 없다 → 완전 클라이언트 렌더(SPA)로 생성한다.
  ssr: false,

  css: ['~/assets/css/main.css'],

  vue: {
    compilerOptions: {
      // iconify-icon 웹 컴포넌트를 Vue 컴포넌트로 오인해 경고하지 않도록
      isCustomElement: tag => tag === 'iconify-icon',
    },
  },

  app: {
    head: {
      title: 'FeatherDeck',
      htmlAttrs: { lang: 'ko' },
      meta: [
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
        { name: 'apple-mobile-web-app-title', content: 'FeatherDeck' },
        { name: 'theme-color', content: '#0d0d0d' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
      ],
      link: [
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;500;700&display=swap' },
      ],
      script: [
        { src: 'https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js', defer: true },
      ],
    },
  },

  modules: ['@vite-pwa/nuxt'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'FeatherDeck',
      short_name: 'FeatherDeck',
      description: '브라우저 기반 스트림덱 — 정적 앱 + 로컬 서버',
      display: 'standalone',
      orientation: 'any',
      start_url: '/',
      background_color: '#0d0d0d',
      theme_color: '#0d0d0d',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      // API 요청(로컬 서버)은 항상 네트워크로 — 캐싱하면 오래된 버튼 설정이 보일 수 있음
      navigateFallbackDenylist: [/^\/api\//],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },
})
