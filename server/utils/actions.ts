import { exec, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { platform, tmpdir } from 'node:os'
import { join } from 'node:path'

// modifier / 특수키 매핑 (legacy/server.js 그대로 이식)
const MOD_MAP: Record<string, string> = {
  cmd: 'command', command: 'command',
  ctrl: 'control', control: 'control',
  shift: 'shift',
  opt: 'option', option: 'option', alt: 'option',
}

const KEY_CODES: Record<string, number> = {
  space: 49, return: 36, enter: 36, escape: 53, esc: 53,
  tab: 48, delete: 51, backspace: 51,
  up: 126, down: 125, left: 123, right: 124,
  f1: 122, f2: 120, f3: 99, f4: 118, f5: 96, f6: 97,
  f7: 98, f8: 100, f9: 101, f10: 109, f11: 103, f12: 111,
  '0': 29, '1': 18, '2': 19, '3': 20, '4': 21,
  '5': 23, '6': 22, '7': 26, '8': 28, '9': 25,
}

function run(cmd: string) {
  return new Promise<void>((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve()))
  })
}

export async function runAction(action: string, value: string) {
  if (platform() !== 'darwin') {
    throw new Error('이 서버는 macOS에서 실행해야 액션을 수행할 수 있습니다.')
  }

  switch (action) {
    case 'app':
      return run(`open -a "${value}"`)

    case 'volume':
      if (value === 'up') return run(`osascript -e 'set volume output volume (output volume of (get volume settings) + 10)'`)
      if (value === 'down') return run(`osascript -e 'set volume output volume (output volume of (get volume settings) - 10)'`)
      if (value === 'mute') return run(`osascript -e 'set volume output muted (not (output muted of (get volume settings)))'`)
      throw new Error(`알 수 없는 볼륨 값: ${value}`)

    case 'shortcut': {
      const parts = value.toLowerCase().split('+')
      const mods = parts.filter(p => MOD_MAP[p]).map(p => `${MOD_MAP[p]} down`)
      const key = parts.find(p => !MOD_MAP[p]) ?? ''
      const modStr = mods.length ? ` using {${mods.join(', ')}}` : ''
      const script = KEY_CODES[key]
        ? `key code ${KEY_CODES[key]}${modStr}`
        : `keystroke "${key}"${modStr}`
      return run(`osascript -e 'tell application "System Events" to ${script}'`)
    }

    case 'url':
      return run(`open "${value}"`)

    case 'file':
      return run(`open "${value}"`)

    case 'clipboard': {
      // pbcopy는 launchd(gui/<uid>) 에이전트에서 실행하면 pasteboard 서버에 붙지 못해
      // 조용히 성공만 하고 실제로는 복사가 안 되는 걸 실측으로 확인함 — 대신 System Events
      // 경로(osascript)를 쓰면 launchd에서도 잘 됨(volume/shortcut 액션이 이미 그 경로로 동작 중).
      //
      // value는 AppleScript 소스에 직접 끼워넣지 않고(따옴표/injection 걱정 없게) 임시 파일에
      // UTF-8로 써두고 그 경로만 읽게 함 — env var(system attribute)로 넘겼더니 한글/이모지가
      // 깨져서(AppleScript가 env var를 UTF-8로 안 읽음) 이 방식으로 바꿈. 파일 읽을 때
      // «class utf8»로 인코딩을 명시해야 깨지지 않음. 경로는 서버가 만든 랜덤 이름이라
      // 이 부분만은 문자열로 끼워넣어도 안전함(사용자 입력이 아님).
      const tmpPath = join(tmpdir(), `featherdeck-clip-${randomUUID()}.txt`)
      await writeFile(tmpPath, value, 'utf-8')
      try {
        await new Promise<void>((resolve, reject) => {
          const proc = spawn('osascript', ['-e', `set the clipboard to (read (POSIX file "${tmpPath}") as «class utf8»)`])
          proc.on('error', reject)
          proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`osascript exited with code ${code}`))))
        })
      } finally {
        await rm(tmpPath, { force: true }).catch(() => {})
      }
      return
    }

    default:
      throw new Error(`알 수 없는 액션: ${action}`)
  }
}
