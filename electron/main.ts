import { app } from "electron";
import { setupSingleInstanceLock } from "./core/single-instance";
import { startStaticServer } from "./services/static-server";
import { startBridgeSocketServer, startBridgeHttpServer } from "./services/bridge-server";
import { createWindow, getMainWindow } from "./core/window";
import { registerIpcHandlers } from "./core/ipc";
import { setupAutoUpdater } from "./core/updater";

const isDev = !app.isPackaged;

const gotTheLock = setupSingleInstanceLock(getMainWindow);

if (gotTheLock) {
  registerIpcHandlers();
  setupAutoUpdater(isDev);

  app.whenReady().then(async () => {
    if (!isDev) {
      await startStaticServer();
    }

    try {
      startBridgeSocketServer();
      startBridgeHttpServer();
    } catch (err) {
      console.error("Error al levantar los servicios locales:", err);
    }

    createWindow();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}