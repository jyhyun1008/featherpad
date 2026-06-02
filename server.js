const http = require("http");
const WebSocket = require("ws");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const PORT = 3000;

// 앱 번들 실행 시 ~/Library/Application Support/FeatherPad/buttons.js 우선,
// 개발 환경에서는 ./buttons.js 사용
const USER_CONFIG  = path.join(os.homedir(), "Library", "Application Support", "FeatherPad", "buttons.js");
const LOCAL_CONFIG = path.join(__dirname, "buttons.js");

let buttonsModule;
if (fs.existsSync(USER_CONFIG)) {
  buttonsModule = require(USER_CONFIG);
} else if (fs.existsSync(LOCAL_CONFIG)) {
  buttonsModule = require(LOCAL_CONFIG);
} else {
  console.error("❌ buttons.js 설정 파일을 찾을 수 없습니다.");
  console.error("   " + USER_CONFIG);
  console.error("   위 경로에 buttons.js 를 만들거나 앱을 재실행하세요.");
  process.exit(1);
}
const { BUTTONS, GROUPS, CONFIG } = buttonsModule;

// ─────────────────────────────────────────
//  액션 실행 함수
// ─────────────────────────────────────────
function runAction(action, value) {
  switch (action) {
    case "app":
      exec(`open -a "${value}"`, (err) => {
        if (err) console.error(`앱 실행 실패: ${value}`, err.message);
        else console.log(`앱 실행: ${value}`);
      });
      break;

    case "volume":
      if (value === "up")   exec(`osascript -e 'set volume output volume (output volume of (get volume settings) + 10)'`);
      if (value === "down") exec(`osascript -e 'set volume output volume (output volume of (get volume settings) - 10)'`);
      if (value === "mute") exec(`osascript -e 'set volume output muted (not (output muted of (get volume settings)))'`);
      console.log(`볼륨: ${value}`);
      break;

    case "shortcut": {
      // value 형식: "cmd+shift+3", "ctrl+cmd+q", "cmd+space" 등
      const MOD_MAP = {
        cmd: "command", command: "command",
        ctrl: "control", control: "control",
        shift: "shift",
        opt: "option", option: "option", alt: "option",
      };
      // 스페이스 등 특수키는 key code 사용
      const KEY_CODES = {
        space: 49, return: 36, enter: 36, escape: 53, esc: 53,
        tab: 48, delete: 51, backspace: 51,
        up: 126, down: 125, left: 123, right: 124,
        f1: 122, f2: 120, f3: 99,  f4: 118, f5: 96,  f6: 97,
        f7: 98,  f8: 100, f9: 101, f10: 109, f11: 103, f12: 111,
        // 숫자 키 — shift와 함께 쓰면 keystroke로는 %,& 등으로 해석되므로 key code 필수
        '0': 29, '1': 18, '2': 19, '3': 20, '4': 21,
        '5': 23, '6': 22, '7': 26, '8': 28, '9': 25,
      };

      const parts  = value.toLowerCase().split("+");
      const mods   = parts.filter(p => MOD_MAP[p]).map(p => `${MOD_MAP[p]} down`);
      const key    = parts.find(p => !MOD_MAP[p]) ?? "";
      const modStr = mods.length ? ` using {${mods.join(", ")}}` : "";
      const script = KEY_CODES[key]
        ? `key code ${KEY_CODES[key]}${modStr}`
        : `keystroke "${key}"${modStr}`;

      exec(
        `osascript -e 'tell application "System Events" to ${script}'`,
        (err) => {
          if (err) console.error(`단축키 실패: ${value}`, err.message);
          else console.log(`단축키: ${value}`);
        }
      );
      break;
    }

    case "url":
      exec(`open "${value}"`, (err) => {
        if (err) console.error(`URL 열기 실패: ${value}`, err.message);
        else console.log(`URL 열기: ${value}`);
      });
      break;

    case "file":
      exec(`open "${value}"`, (err) => {
        if (err) console.error(`파일 열기 실패: ${value}`, err.message);
        else console.log(`파일 열기: ${value}`);
      });
      break;

    default:
      console.warn("알 수 없는 액션:", action, value);
  }
}

// ─────────────────────────────────────────
//  HTTP 서버 (UI 파일 서빙)
// ─────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  if (req.url === "/config") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(CONFIG));
    return;
  }

  if (req.url === "/buttons") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(BUTTONS));
    return;
  }

  if (req.url === "/groups") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(GROUPS));
    return;
  }

  if (req.url === "/manifest.json") {
    fs.readFile(path.join(__dirname, "manifest.json"), (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": "application/manifest+json" });
      res.end(data);
    });
    return;
  }

  if (req.url.startsWith("/click.mp3")) {
    fs.readFile(path.join(__dirname, "click.mp3"), (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" });
      res.end(data);
    });
    return;
  }

  if (req.url.startsWith("/icon.png")) {
    fs.readFile(path.join(__dirname, "icon.png"), (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
      res.end(data);
    });
    return;
  }

  const filePath = path.join(__dirname, "index.html");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("index.html 파일을 찾을 수 없습니다.");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
});

// ─────────────────────────────────────────
//  WebSocket 서버
// ─────────────────────────────────────────
const wss = new WebSocket.Server({ server: httpServer });

wss.on("connection", (ws, req) => {
  console.log(`클라이언트 연결됨: ${req.socket.remoteAddress}`);

  ws.on("message", (msg) => {
    try {
      const { action, value } = JSON.parse(msg);
      runAction(action, value);
      ws.send(JSON.stringify({ status: "ok", action, value }));
    } catch (e) {
      console.error("메시지 파싱 오류:", e);
      ws.send(JSON.stringify({ status: "error", message: e.message }));
    }
  });

  ws.on("close", () => console.log("클라이언트 연결 종료"));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  let localIP = "localhost";
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === "IPv4" && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }
  console.log(`\n✅ FeatherPad 서버 실행 중!`);
  console.log(`\n  💻 이 PC에서:  http://localhost:${PORT}`);
  console.log(`  📱 폰/태블릿:  http://${localIP}:${PORT}\n`);
  console.log(`같은 와이파이에 연결된 기기에서 위 주소로 접속하세요.\n`);
});