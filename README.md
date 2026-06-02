# FeatherPad

맥에서 실행되는 브라우저 기반 스트림덱입니다. 같은 와이파이에 연결된 폰이나 태블릿에서 버튼을 눌러 맥을 제어할 수 있습니다.

> **macOS 전용입니다.(폰이나 태블릿 기종은 상관없습니다)**

## 요구사항

- macOS
- [Node.js](https://nodejs.org) 18 이상

## 설치

### 1. 저장소 클론

```bash
git clone https://github.com/jyhyun1008/featherpad.git
cd featherpad
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 앱 빌드

```bash
./build-app.sh
```

빌드가 완료되면 `FeatherPad.app`이 생성됩니다.

```bash
cp -r FeatherPad.app /Applications/
```

### 4. 실행

`FeatherPad.app`을 실행하면 처음 한 번만 버튼 설정 파일(`buttons.js`)이 자동으로 생성되고 텍스트 에디터로 열립니다. 편집 후 앱을 다시 실행하면 적용됩니다.

이후 실행부터는 아래 주소로 접속하면 됩니다.

```
📱 폰/태블릿  http://<맥의 IP>:3000
💻 이 맥에서  http://localhost:3000
```

## 버튼 설정

설정 파일 위치: `~/Library/Application Support/FeatherPad/buttons.js`

앱 실행 중 **설정 편집** 버튼을 누르면 바로 열립니다.
다른 폴더에 있는 `buttons.js`를 불러오려면 **설정 불러오기**를 사용하세요 (서버 자동 재시작).

### 지원 액션

| action | value 예시 | 설명 |
|---|---|---|
| `app` | `"Safari"` | 앱 실행 |
| `shortcut` | `"cmd+shift+5"` | 단축키 전송 |
| `volume` | `"up"` / `"down"` / `"mute"` | 볼륨 조절 |
| `url` | `"https://github.com"` | URL 열기 |
| `file` | `"/Users/me/doc.pdf"` | 파일/폴더 열기 |

단축키는 `modifier+modifier+key` 형식으로 작성합니다. (`cmd`, `ctrl`, `shift`, `opt`, `alt`)

## 원격 접속 (같은 와이파이가 아닌 경우)

외부 네트워크에서 사용하려면 [Tailscale](https://tailscale.com)을 사용하세요.

1. 맥과 폰 모두에 Tailscale 설치 후 같은 계정으로 로그인
2. Tailscale이 맥에 할당한 IP(`100.x.x.x`)로 접속

```
http://100.x.x.x:3000
```
