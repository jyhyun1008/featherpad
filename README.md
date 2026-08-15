# FeatherDeck

브라우저 기반 스트림덱. **PWA로 홈 화면에 추가**해서 쓰는 걸 전제로 합니다.

## 구조

이 프로젝트는 두 부분으로 나뉩니다.

- **정적 프론트(Nuxt, `ssr: false`)** — 컨트롤러 화면과 설정 화면. `nuxt generate`로 빌드해서
  아무 정적 호스팅(Vercel 등)에 올려두고, 어느 기기에서든 그 URL로 "홈 화면에 추가"하면 됩니다.
  버튼을 누르거나 설정을 저장하면 **로컬 서버 API**를 호출합니다.
- **로컬 서버(같은 Nuxt 코드베이스의 Nitro 서버, `server/`)** — 실제로 macOS에서 앱을 켜고,
  단축키를 보내고, 버튼 설정을 파일로 저장하는 부분입니다. 반드시 컨트롤할 Mac에서 실행해야 합니다.

두 부분은 origin이 다를 수 있어서(정적 사이트 도메인 ↔ 로컬 서버 주소) `server/middleware/cors.ts`에서
CORS를 열어뒀고, 프론트는 이 기기가 붙을 로컬 서버 주소를 **localStorage**에 기기별로 따로 저장합니다
(연결 안 됐을 때 각 화면에 뜨는 폼에서 등록, [`useServerConnect`](app/composables/useServerConnect.ts)).
즉 로컬 서버가 버튼 설정의 원본(source of truth)이고, localStorage는 "이 브라우저가 어느 서버에 붙을지"만
기억합니다.

### 화면 두 개, 역할도 둘로 나뉨

- **컨트롤러(`/`)** — 실제로 버튼을 누르는 화면. 서버 미연결 시 주소 입력창만 뜨고, 연결되면 바로 15키 그리드.
  편집 UI는 없음 — 모바일에서 쓸 걸 전제로 함.
- **설정(`/settings`)** — 왼쪽에 15키 그리드, 오른쪽에 선택한 키의 인스펙터(라벨/이미지/아이콘/액션/값)가
  뜨는 스트림덱 앱 스타일의 편집 화면. 데스크탑에서 마우스로 쓰는 걸 전제로 함.
- 데스크탑 브라우저로 `/`에 처음 들어오면(터치가 아니라 포인터가 정밀하고 화면이 900px 이상)
  자동으로 `/settings`로 보냅니다 ([`app/middleware/desktop-redirect.ts`](app/middleware/desktop-redirect.ts)).
  앱 내부에서 "컨트롤러" 링크를 눌러 온 경우엔 리다이렉트하지 않음.

## 시작하기 (컨트롤할 Mac에서, 처음 한 번만)

```bash
git clone https://github.com/jyhyun1008/featherpad.git FeatherDeck
cd FeatherDeck
npm install
npm run build              # 로컬 서버 빌드 (.output/server)
./scripts/install-launchd.sh   # 로그인 시 자동 실행 + 죽으면 자동 재시작 등록
```

`install-launchd.sh`가 `~/Library/LaunchAgents/com.featherdeck.server.plist`를 만들고
`launchctl load`까지 해줍니다. 이후로는 맥을 껐다 켜거나 로그아웃해도, 서버가 죽어도(`KeepAlive`)
알아서 다시 뜹니다 — 터미널 켜두거나 `npm run dev` 실행해둘 필요 없음.

- 상태 확인: `launchctl list | grep com.featherdeck.server`
- 로그 확인: `tail -f ~/Library/Logs/FeatherDeck/server.log`
- 끄기: `launchctl unload ~/Library/LaunchAgents/com.featherdeck.server.plist`
- **코드를 고친 뒤에는** `npm run build`로 다시 빌드하고 `launchctl kickstart -k gui/$(id -u)/com.featherdeck.server`로
  재시작해야 반영됩니다 (launchd는 그냥 `.output/server/index.mjs`를 실행만 할 뿐, 빌드는 안 해줌).

개발 중에는(코드 수정하면서 바로 확인) `npm run dev`가 더 편합니다 (프론트+API가 같이 뜨고 CORS도
걱정할 필요 없음) — 이건 launchd 서비스랑 같은 3000번 포트를 쓰니 launchd 서비스는 잠깐
`launchctl unload`로 꺼두고 쓰세요.

첫 실행 시 `~/Library/Application Support/FeatherDeck/config.json`에 기본 버튼 설정이 자동 생성됩니다.
이후 설정 화면에서 키를 편집하고 저장하면 이 파일이 갱신됩니다. (더 예전 포맷 파일이 남아있다면
다음 실행 때 자동으로 지금 포맷(페이지 배열)으로 옮겨줍니다 — `server/utils/store.ts`의 `migrate()`.)

### 폰에서 접속되게 하기 (Tailscale)

브라우저는 `https://` 페이지에서 `http://`로 나가는 요청(mixed content)을 막습니다. 예외는
`http://localhost`뿐이라, 같은 Mac에서는 그냥 되지만 **폰에서 Tailscale IP로 붙는 시나리오는 막힙니다.**
그래서 로컬 서버를 Tailscale로 자체 HTTPS 서빙해야 합니다.

```bash
# Mac과 폰 모두 Tailscale 설치 후 로그인, 그다음 Mac에서:
tailscale serve --bg 3000
```

(Tailscale 관리자 콘솔 → DNS 탭에서 **HTTPS Certificates**가 켜져 있어야 인증서가 발급됩니다.
꺼져 있으면 `tailscale serve`가 502만 뱉어요.) `tailscale serve status`로 발급된
`https://맥이름.tailXXXX.ts.net` 주소를 확인해서, 폰/맥 브라우저로 그 주소를 열고 처음 뜨는 화면에서
그대로 등록하면 됩니다. 이 설정은 tailscaled가 들고 있어서 맥을 재부팅해도 따로 안 해줘도 유지됩니다.

### 정적 프론트만 따로 배포하고 싶다면 (선택, 보통 필요 없음)

```bash
npm run generate   # .output/public 생성 — Vercel/Netlify 등 아무 정적 호스팅에 업로드
```

로컬 서버가 떠 있는 Mac 주소(`https://맥이름.tailXXXX.ts.net`)로 직접 열어도 컨트롤러/설정 화면이
그대로 나오므로, 위 launchd + Tailscale 설정만으로 충분합니다. 굳이 공개 정적 호스팅이 필요한 경우
(URL 하나로 어디서든 설치하고 싶다든지)에만 이 방법을 쓰세요.

## 버튼 구성

실물 스트림덱(오리지널)과 동일하게 **5열 × 3행 = 15키 그리드**입니다. 그중 **우하단 3키는 모든
페이지에 공통으로 뜨는 "고정 키"**(`pinnedKeys`)라 페이지를 넘겨도 그대로 남아있고, 나머지 12칸은
페이지마다 따로(`PadPage.buttons`, `PAGE_KEY_COUNT`). 둘 다 완전히 동일한 방식으로 편집합니다 —
고정 키라고 종류가 제한되는 게 아니라, "여기 넣은 건 페이지가 바뀌어도 안 바뀐다"는 뜻일 뿐입니다
([`server/utils/store.ts`](server/utils/store.ts)). 빈 키는 `null`로 저장되고 점선 테두리로 표시됩니다.

각 키는:

- `label` — 키 아래/위에 표시할 텍스트
- `image` — 있으면 이 이미지로 키 전체를 채움 (전역 배경 이미지는 없음 — 키 단위로만 이미지 지정)
- `icon` — `image`가 없을 때 대신 쓰는 [Tabler](https://icon-sets.iconify.design/tabler/) 아이콘 이름
  (설정 화면의 [`IconPicker`](app/components/IconPicker.vue)로 검색해서 고를 수 있음)
- `action` / `value` — 아래 표 참고, `page`가 폴더 역할

| action | value 예시 | 설명 |
|---|---|---|
| `app` | `"Safari"` | 앱 실행 |
| `shortcut` | `"cmd+shift+5"` | 단축키 전송 (`cmd`/`ctrl`/`shift`/`opt` 조합) |
| `volume` | `"up"` / `"down"` / `"mute"` | 볼륨 조절 |
| `url` | `"https://github.com"` | URL 열기 |
| `file` | `"/Users/me/doc.pdf"` | 파일/폴더 열기 |
| `page` | 이동할 페이지의 `id` | **폴더 버튼** — 아래 참고 |

### 페이지 = 폴더

스트림덱의 "폴더"에 대응하는 개념입니다. 설정 화면 상단 탭에서 페이지를 개수 제한 없이 추가하고
(`+ 페이지`, 추가하자마자 바로 이름 입력 상태가 됨), 탭을 더블클릭해도 이름을 바꿀 수 있습니다.
탭을 드래그해서 순서도 바꿀 수 있어요(데스크탑 마우스 전제 — 네이티브 HTML5 드래그라 터치는 안 됨).
페이지 사이를 옮겨 다니려면 아무 키(특히 고정 키 자리)에 `action: page`를 넣고 `value`로 목적지
페이지를 고르면 됩니다 — 인스펙터에서 액션을 `page`로 바꾸면 값 입력란이 페이지 선택 드롭다운으로
바뀝니다.

**"처음 페이지로 돌아가기"는 자동 기능이 아니라 직접 만드는 버튼입니다.** 우하단 고정 키(모든
페이지에 공통으로 뜸)에 `action: page`, 값을 첫 페이지로 지정해두면 그게 곧 "홈" 버튼이 돼요 — 어디
있든 항상 같은 자리에 있으니까요. 자동으로 숨겨진 뒤로가기 같은 건 없고, 이 자리에 넣은 게 곧
이 자리에서 하는 일입니다.

**폴더 버튼은 이동 전에 실제 액션을 먼저 실행**하게 할 수도 있습니다 (`preAction`/`preValue`,
인스펙터에서 액션을 `page`로 바꾸면 "이동 전에 먼저 실행" 필드가 나타남). 예를 들어 "로직" 폴더
버튼에 `preAction: app`, `preValue: "Logic Pro"`를 넣어두면, 그 폴더로 넘어가기 전에 먼저 Logic Pro를
앞으로 전환합니다 — 단축키 페이지로 넘어갔는데 정작 그 앱이 포커스돼 있지 않아 안 먹는 상황 방지용.

이런 "폴더" 버튼은 페이지 전환 자체는 `/api/action`을 타지 않고 클라이언트에서 즉시 처리하지만
(`usePageNav`의 [`goToPageId`](app/composables/usePageNav.ts)), `preAction`이 있으면 그건 일반
액션과 동일하게 로컬 서버로 실행 요청을 보냅니다. 컨트롤러 화면에서는 페이지 추가/삭제/이름변경이
안 되고 이동(폴더 버튼 누르기)만 — 편집은 항상 설정 화면에서.

액션 실행은 `osascript`/`open`을 쓰므로 로컬 서버는 **macOS에서 실행해야** 합니다 (프론트는 어디서 열어도 무방).

## 개발

```bash
npm run dev        # http://localhost:3000
npm run build       # 로컬 서버용 (node-server preset)
npm run generate    # 정적 배포용 (프리렌더, API 없음)
```

## TODO / 다음 단계

- 이미지 업로드(지금은 URL 입력만 지원 — 파일 업로드는 서버에 이미지 저장 위치가 필요해서 보류)
- 오프라인 시 마지막으로 받아온 설정을 로컬에 캐시해서 보여주기
