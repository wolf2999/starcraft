/** Mac 本地反向代理（快速 Tunnel 单地址承载 HTTP+WS）：/api/* → 8100，WebSocket upgrade → 8101 */
import http from "node:http";

const API_PORT = 8100;
const WS_PORT = 8101;
const LISTEN_PORT = 8180;

http
  .createServer((req, res) => {
    if (!req.url || !req.url.startsWith("/api/")) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    const up = http.request(
      { host: "127.0.0.1", port: API_PORT, path: req.url, method: req.method, headers: req.headers },
      (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers);
        r.pipe(res);
      }
    );
    up.on("error", () => {
      res.writeHead(502);
      res.end("api upstream error");
    });
    req.pipe(up);
  })
  .on("upgrade", (cReq, cSock, head) => {
    const up = http.request({ host: "127.0.0.1", port: WS_PORT, path: cReq.url, headers: cReq.headers });
    up.end();
    up.on("upgrade", (uRes, uSock, uHead) => {
      let resp = `HTTP/${cReq.httpVersion} ${uRes.statusCode} ${uRes.statusMessage ?? ""}\r\n`;
      for (let i = 0; i < uRes.rawHeaders.length; i += 2) resp += `${uRes.rawHeaders[i]}: ${uRes.rawHeaders[i + 1]}\r\n`;
      resp += "\r\n";
      cSock.write(resp);
      if (uHead?.length) cSock.write(uHead);
      if (head?.length) uSock.write(head);
      uSock.pipe(cSock);
      cSock.pipe(uSock);
      uSock.on("error", () => cSock.destroy());
      cSock.on("error", () => uSock.destroy());
    });
    up.on("error", () => cSock.destroy());
  })
  .listen(LISTEN_PORT, "127.0.0.1", () => console.log(`proxy :${LISTEN_PORT} -> api:${API_PORT} ws:${WS_PORT}`));
