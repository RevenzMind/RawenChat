import { app, BrowserWindow } from "electron";

export function setupSingleInstanceLock(getMainWindow: () => BrowserWindow | null): boolean {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return false;
  }

  app.on("second-instance", () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  return true;
}
