#!/bin/bash
# 로컬 서버(.output/server/index.mjs)를 로그인 시 자동 실행 + 죽으면 자동 재시작되게 등록.
# 먼저 `npm run build`로 .output/을 만들어둔 상태여야 함.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node || true)"
LABEL="com.featherdeck.server"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/FeatherDeck"

if [ -z "$NODE_BIN" ]; then
  echo "❌ node를 찾을 수 없습니다. PATH에 node가 있는 셸에서 실행하세요."
  exit 1
fi

if [ ! -f "$DIR/.output/server/index.mjs" ]; then
  echo "❌ $DIR/.output/server/index.mjs 가 없습니다. 먼저 다음을 실행하세요:"
  echo "   cd $DIR && npm run build"
  exit 1
fi

mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$PLIST")"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$DIR/.output/server/index.mjs</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/server.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/server.err.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"

echo "✅ 등록 완료: $LABEL"
echo "   로그인할 때마다 자동 실행되고, 죽으면 자동으로 재시작됩니다."
echo "   상태 확인:  launchctl list | grep $LABEL"
echo "   로그 확인:  tail -f $LOG_DIR/server.log"
echo "   끄고 싶으면: launchctl unload $PLIST"
