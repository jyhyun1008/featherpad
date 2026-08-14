import { exec } from 'node:child_process'
import { platform } from 'node:os'

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

    default:
      throw new Error(`알 수 없는 액션: ${action}`)
  }
}
