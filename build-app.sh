#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# node 경로 탐색
NODE_PATH=$(which node 2>/dev/null)
if [ -z "$NODE_PATH" ]; then
  for p in /usr/local/bin/node /opt/homebrew/bin/node; do
    [ -f "$p" ] && NODE_PATH="$p" && break
  done
fi
if [ -z "$NODE_PATH" ]; then
  echo "❌ node를 찾을 수 없습니다"
  exit 1
fi
echo "node: $NODE_PATH"

# 의존성 확인
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "📦 의존성 설치 중..."
  cd "$SCRIPT_DIR" && npm install
fi

# ── 앱 번들 구조 생성 ────────────────────────────────────────────
APP="$SCRIPT_DIR/FeatherPad.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"

# Info.plist
cat > "$APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>FeatherPad</string>
    <key>CFBundleIdentifier</key>
    <string>com.featherpad.app</string>
    <key>CFBundleName</key>
    <string>FeatherPad</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.utilities</string>
</dict>
</plist>
PLIST

printf 'APPL????' > "$APP/Contents/PkgInfo"

# ── 메인 실행 파일 (shell script → exec osascript) ──────────────
# exec으로 osascript가 메인 프로세스가 되면 자체 run loop을 가져
# "응용 프로그램이 응답하지 않습니다" 문제가 해결됨
cat > "$APP/Contents/MacOS/FeatherPad" << MAINSCRIPT
#!/bin/bash
APP_DIR="\$(cd "\$(dirname "\$0")/.." && pwd)"
RESOURCES="\$APP_DIR/Resources"
cd "\$RESOURCES"
"${NODE_PATH}" server.js > /tmp/featherpad-server.log 2>&1 &
exec /usr/bin/osascript "\$RESOURCES/launcher.scpt" "${NODE_PATH}" "\$RESOURCES"
MAINSCRIPT
chmod +x "$APP/Contents/MacOS/FeatherPad"

# ── 런처 AppleScript ─────────────────────────────────────────────
cat > /tmp/fp_launcher.applescript << 'APPLESCRIPT'
on run argv
    set nodeBin to item 1 of argv
    set resourceDir to (item 2 of argv) & "/"
    set configDir to (POSIX path of (path to application support folder from user domain)) & "FeatherPad/"
    set configFile to configDir & "buttons.js"

    -- 첫 실행: config 생성
    do shell script "mkdir -p " & quoted form of configDir
    try
        do shell script "test -f " & quoted form of configFile
    on error
        do shell script "cp " & quoted form of (resourceDir & "buttons.js.example") & " " & quoted form of configFile
        do shell script "open -t " & quoted form of configFile
        activate
        display dialog "처음 실행이에요! 버튼 설정 파일을 열었습니다.

편집 후 앱을 다시 실행하면 적용됩니다." buttons {"확인"} default button "확인" with title "FeatherPad 설정"
        do shell script "pkill -f 'node server.js' 2>/dev/null; true"
        return
    end try

    delay 1

    -- 메인 루프 — 서버 종료 전까지 다이얼로그 유지
    repeat
        set theIP to do shell script "ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo localhost"

        activate
        set theBtn to button returned of (display dialog "FeatherPad 실행 중

📱  모바일     http://" & theIP & ":3000
💻  이 컴퓨터  http://localhost:3000

같은 와이파이에서 위 주소로 접속하세요." buttons {"설정 편집", "설정 불러오기", "서버 종료"} default button "서버 종료" with title "FeatherPad" with icon note)

        if theBtn is "서버 종료" then exit repeat

        if theBtn is "설정 편집" then
            do shell script "open -t " & quoted form of configFile
        end if

        if theBtn is "설정 불러오기" then
            try
                set chosenFolder to choose folder with prompt "buttons.js가 있는 폴더를 선택하세요"
                set newConfigPath to POSIX path of chosenFolder & "buttons.js"
                do shell script "test -f " & quoted form of newConfigPath
                do shell script "cp " & quoted form of newConfigPath & " " & quoted form of configFile
                do shell script "pkill -f 'node server.js' 2>/dev/null; true"
                do shell script "cd " & quoted form of resourceDir & " && " & quoted form of nodeBin & " server.js > /tmp/featherpad-server.log 2>&1 &"
                delay 1
            on error errMsg
                if errMsg does not contain "User canceled" then
                    activate
                    display dialog "해당 폴더에 buttons.js가 없습니다." buttons {"확인"} default button "확인" with title "FeatherPad" with icon caution
                end if
            end try
        end if
    end repeat

    do shell script "pkill -f 'node server.js' 2>/dev/null; true"
end run
APPLESCRIPT

osacompile -o "$APP/Contents/Resources/launcher.scpt" /tmp/fp_launcher.applescript \
  || { echo "❌ AppleScript 컴파일 실패"; exit 1; }

# ── 서버 파일 번들링 ─────────────────────────────────────────────
echo "📁 서버 파일 번들링 중..."
RESOURCES="$APP/Contents/Resources"
for f in server.js index.html manifest.json click.mp3 icon.png package.json buttons.js.example; do
  [ -f "$SCRIPT_DIR/$f" ] && cp "$SCRIPT_DIR/$f" "$RESOURCES/"
done
cp -r "$SCRIPT_DIR/node_modules" "$RESOURCES/"

# ── 기존 buttons.js 마이그레이션 ────────────────────────────────
USER_CONFIG="$HOME/Library/Application Support/FeatherPad/buttons.js"
if [ -f "$SCRIPT_DIR/buttons.js" ] && [ ! -f "$USER_CONFIG" ]; then
  mkdir -p "$(dirname "$USER_CONFIG")"
  cp "$SCRIPT_DIR/buttons.js" "$USER_CONFIG"
  echo "🔧 buttons.js → 사용자 설정 폴더로 이전됨"
fi

# ── 아이콘 적용 ──────────────────────────────────────────────────
if [ -f "$SCRIPT_DIR/icon.png" ]; then
  echo "🎨 아이콘 설정 중..."
  ICONSET="$SCRIPT_DIR/_FeatherPad.iconset"
  ICNS="$APP/Contents/Resources/AppIcon.icns"
  mkdir -p "$ICONSET"
  sips -z 16   16   "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_16x16.png"      > /dev/null
  sips -z 32   32   "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_16x16@2x.png"   > /dev/null
  sips -z 32   32   "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_32x32.png"      > /dev/null
  sips -z 64   64   "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_32x32@2x.png"   > /dev/null
  sips -z 128  128  "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_128x128.png"    > /dev/null
  sips -z 256  256  "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_128x128@2x.png" > /dev/null
  sips -z 256  256  "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_256x256.png"    > /dev/null
  sips -z 512  512  "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_256x256@2x.png" > /dev/null
  sips -z 512  512  "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_512x512.png"    > /dev/null
  sips -z 1024 1024 "$SCRIPT_DIR/icon.png" --out "$ICONSET/icon_512x512@2x.png" > /dev/null
  iconutil -c icns "$ICONSET" -o "$ICNS"
  rm -rf "$ICONSET"
  touch "$APP"
  killall Dock 2>/dev/null || true
fi

echo ""
echo "✅ 완료! Applications 폴더로 복사하세요:"
echo "   cp -r \"$SCRIPT_DIR/FeatherPad.app\" /Applications/"
