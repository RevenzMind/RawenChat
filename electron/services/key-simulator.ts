import { execFile } from "child_process";
import { WIN_KEYS, MAC_KEYS } from "../config";

const ALLOWED_KEY_RE =
  /^(?:[a-zA-Z0-9]|F(?:1[0-2]|[1-9])|space|enter|escape|backspace|tab|up|down|left|right|shift|ctrl|alt|win)$/i;

export function isValidKey(key: unknown): key is string {
  return typeof key === "string" && ALLOWED_KEY_RE.test(key.trim());
}

export function simulateKey(key: string): void {
  const platform = process.platform;

  if (platform === "win32") {
    const winKey = WIN_KEYS[key] ?? key;
    const safe = winKey.replace(/['"\\$`]/g, "");
    execFile(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", `$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys('${safe}')`],
      (err) => { if (err) console.error("press-key win32 error:", err); }
    );
  } else if (platform === "linux") {
    execFile("xdotool", ["key", key], (err) => { if (err) console.error("press-key linux error:", err); });
  } else if (platform === "darwin") {
    const keyCode = MAC_KEYS[key as keyof typeof MAC_KEYS];
    if (keyCode !== undefined) {
      execFile("osascript", ["-e", `tell application "System Events" to key code ${keyCode}`],
        (err) => { if (err) console.error("press-key darwin error:", err); });
    } else if (/^[a-zA-Z0-9]$/.test(key)) {
      execFile("osascript", ["-e", `tell application "System Events" to keystroke "${key}"`],
        (err) => { if (err) console.error("press-key darwin error:", err); });
    }
  }
}
