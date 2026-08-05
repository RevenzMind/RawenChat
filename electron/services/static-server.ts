import * as path from "path";
import * as http from "http";
import * as fs from "fs";
import { getContentType } from "../utils";

export function startStaticServer(port: number = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const outDir = path.join(__dirname, "../../out");

    const server = http.createServer((req, res) => {
      const url = req.url || "/";
      let urlWithoutQuery = url.split("?")[0];

      if (urlWithoutQuery.length > 1 && urlWithoutQuery.endsWith("/")) {
        urlWithoutQuery = urlWithoutQuery.slice(0, -1);
      }

      let filePath = path.join(outDir, urlWithoutQuery === "/" ? "index.html" : urlWithoutQuery);

      const isFile = (p: string): boolean => {
        try {
          return fs.statSync(p).isFile();
        } catch {
          return false;
        }
      };

      if (!isFile(filePath)) {
        const htmlPath = filePath + ".html";
        if (isFile(htmlPath)) {
          filePath = htmlPath;
        } else {
          const indexPath = path.join(filePath, "index.html");
          filePath = isFile(indexPath) ? indexPath : path.join(outDir, "index.html");
        }
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        res.writeHead(200, { "Content-Type": getContentType(filePath) });
        res.end(data);
      });
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
}
