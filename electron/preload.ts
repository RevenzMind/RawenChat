import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  pressKey: (key: string): Promise<void> =>
    ipcRenderer.invoke("press-key", key),
  minimize: (): Promise<void> =>
    ipcRenderer.invoke("window-minimize"),
  maximize: (): Promise<void> =>
    ipcRenderer.invoke("window-maximize"),
  close: (): Promise<void> =>
    ipcRenderer.invoke("window-close"),

  getVoices: (language: string): Promise<string[]> =>
    ipcRenderer.invoke("get-voices", language),
  speakMessage: (text: string, language: string, voice: string): Promise<string> =>
    ipcRenderer.invoke("speak-message", { text, language, voice }),

  saveAvatarImage: (fileName: string, dataUrl: string): Promise<{ url: string; fileName: string }> =>
    ipcRenderer.invoke("save-avatar-image", { fileName, dataUrl }),
  saveAvatarSettings: (settings: unknown): Promise<void> =>
    ipcRenderer.invoke("save-avatar-settings", settings),
  saveOverlayAsset: (fileName: string, dataUrl: string): Promise<{ url: string; fileName: string }> =>
    ipcRenderer.invoke("save-overlay-asset", { fileName, dataUrl }),
  getAvatarSettings: (): Promise<unknown | null> =>
    ipcRenderer.invoke("get-avatar-settings"),

  saveObsComponent: (componentCode: string): Promise<void> =>
    ipcRenderer.invoke("save-obs-component", componentCode),
  getObsComponent: (): Promise<string | null> =>
    ipcRenderer.invoke("get-obs-component"),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("open-external", url),

  getDiagnostics: (): Promise<{ isElectron: true; version: string }> =>
    ipcRenderer.invoke("get-diagnostics"),

  checkForUpdates: (): Promise<{ success: boolean; message?: string }> =>
    ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: (): Promise<{ success: boolean; message?: string }> =>
    ipcRenderer.invoke("download-update"),
  installUpdate: (): Promise<{ success: boolean; message?: string }> =>
    ipcRenderer.invoke("install-update"),
  onUpdateStatus: (callback: (status: string, data?: unknown) => void) => {
    const listener = (_event: unknown, status: string, data?: unknown) => callback(status, data);
    ipcRenderer.on("update-status", listener);
    return () => ipcRenderer.off("update-status", listener);
  },

  isElectron: true,
});
