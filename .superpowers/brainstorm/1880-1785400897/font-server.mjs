import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const fonts = new Map([
  ["/Elegist.otf", { path: fileURLToPath(new URL("../../../elegist/Elegist.otf", import.meta.url)), type: "font/otf" }],
  ["/Vogue.ttf", { path: fileURLToPath(new URL("../../../Vogue.ttf", import.meta.url)), type: "font/ttf" }],
]);

createServer((request, response) => {
  const font = fonts.get(request.url ?? "");
  if (!font) {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": font.type,
  });
  createReadStream(font.path).pipe(response);
}).listen(51420, "127.0.0.1");
