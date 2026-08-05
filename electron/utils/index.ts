export function getContentType(filePath: string): string {
  const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".css": "text/css",
    ".js": "application/javascript",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
  };
  return map[extension] || "text/html";
}

export function sanitizeFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : ".png";
  const baseName = fileName
    .slice(0, dotIndex >= 0 ? dotIndex : undefined)
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${baseName || "avatar"}-${Date.now()}${extension}`;
}
