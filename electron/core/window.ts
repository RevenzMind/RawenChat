import { app, BrowserWindow } from "electron";
import * as path from "path";
import log from "electron-log";
import { autoUpdater } from "electron-updater";
import { WINDOW_CONFIG, DEV_URL } from "../config";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let isCreatingWindow = false;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export async function createWindow(): Promise<void> {
  if (mainWindow || isCreatingWindow) return;
  isCreatingWindow = true;

  const win = new BrowserWindow({
    width: WINDOW_CONFIG.WIDTH,
    height: WINDOW_CONFIG.HEIGHT,
    minWidth: WINDOW_CONFIG.MIN_WIDTH,
    minHeight: WINDOW_CONFIG.MIN_HEIGHT,
    title: WINDOW_CONFIG.TITLE,
    frame: false,
    icon: "logo.png",
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  mainWindow = win;
  isCreatingWindow = false;

  win.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools();
  } else {
    win.loadURL("http://localhost:3000");
  }

  win.webContents.on("did-finish-load", async () => {
    if (!isDev) {
      log.info("Checking for updates on app start...");
      try {
        await autoUpdater.checkForUpdates();
      } catch (error) {
        log.error("Error checking for updates on start:", error);
      }
    }
  });
}
