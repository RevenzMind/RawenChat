import { app, BrowserWindow, ipcMain, shell } from "electron";
import { isValidKey, simulateKey } from "../services/key-simulator";
import { getVoicesByLanguage, speakMessage } from "../services/tts";
import {
  saveAvatarImage,
  saveOverlayAsset,
  saveAvatarSettings,
  getAvatarSettings,
  saveObsComponent,
  getObsComponent,
  AvatarSettings,
} from "../services/bridge-server";

export function registerIpcHandlers(): void {
  ipcMain.handle("press-key", async (_event, key: string) => {
    if (!isValidKey(key)) { console.warn("press-key: rejected invalid key:", key); return; }
    simulateKey(key.trim().toLowerCase());
  });

  ipcMain.handle("window-minimize", () => BrowserWindow.getFocusedWindow()?.minimize());
  ipcMain.handle("window-maximize", () => {
    const win = BrowserWindow.getFocusedWindow();
    win?.[win.isMaximized() ? "unmaximize" : "maximize"]();
  });
  ipcMain.handle("window-close", () => BrowserWindow.getFocusedWindow()?.close());

  ipcMain.handle("get-voices", (_event, language: string) => getVoicesByLanguage(language));
  ipcMain.handle("speak-message",
    async (_event, { text, language = "es-ES", voice = "" }: { text: string; language: string; voice: string }) =>
      speakMessage(text, language, voice)
  );

  ipcMain.handle("save-avatar-image",
    (_event, { fileName, dataUrl }: { fileName: string; dataUrl: string }) =>
      saveAvatarImage(fileName, dataUrl)
  );
  ipcMain.handle("save-overlay-asset",
    (_event, { fileName, dataUrl }: { fileName: string; dataUrl: string }) =>
      saveOverlayAsset(fileName, dataUrl)
  );
  ipcMain.handle("save-avatar-settings", (_event, settings: AvatarSettings) =>
    saveAvatarSettings(settings)
  );
  ipcMain.handle("get-avatar-settings", () => getAvatarSettings());
  ipcMain.handle("save-obs-component", (_event, componentCode: string) => saveObsComponent(componentCode));
  ipcMain.handle("get-obs-component", () => getObsComponent());

  ipcMain.handle("open-external", (_event, url: string) => {
    if (typeof url === "string" && url.startsWith("https://")) {
      void shell.openExternal(url);
    }
  });

  ipcMain.handle("get-diagnostics", () => ({
    isElectron: true,
    version: app.getVersion(),
  }));
}
