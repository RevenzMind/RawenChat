import { ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { getMainWindow } from "./window";

export function setupAutoUpdater(isDevFlag: boolean): void {
  log.transports.file.level = "info";
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (status: string, data?: unknown) => {
    const win = getMainWindow();
    win?.webContents.send("update-status", status, data);
  };

  autoUpdater.on("checking-for-update", () => { log.info("Checking for updates..."); send("checking"); });
  autoUpdater.on("update-available", (info) => { log.info("Update available:", info.version); send("available", info); });
  autoUpdater.on("update-not-available", (info) => { log.info("Update not available:", info.version); send("not-available"); });
  autoUpdater.on("error", (err) => { log.error("Error in auto-updater:", err); send("error", err.message); });
  autoUpdater.on("download-progress", (p) => { log.info(`Download progress: ${p.percent}%`); send("downloading", p); });
  autoUpdater.on("update-downloaded", (info) => { log.info("Update downloaded:", info.version); send("downloaded", info); });

  ipcMain.handle("check-for-updates", async () => {
    if (isDevFlag) return { success: false, message: "Update check disabled in dev mode" };
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      log.error("Error checking for updates:", error);
      return { success: false, message: (error as Error).message };
    }
  });

  ipcMain.handle("download-update", async () => {
    if (isDevFlag) return { success: false, message: "Download disabled in dev mode" };
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      log.error("Error downloading update:", error);
      return { success: false, message: (error as Error).message };
    }
  });

  ipcMain.handle("install-update", async () => {
    if (isDevFlag) return { success: false, message: "Install disabled in dev mode" };
    try {
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error) {
      log.error("Error installing update:", error);
      return { success: false, message: (error as Error).message };
    }
  });
}
