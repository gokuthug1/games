#!/usr/bin/env python3
"""
Nebula Cannons — optional local server.

Zero-dependency (stdlib only): serves the game files and relays JSON
messages between two players over a WebSocket, so two browsers on the
same network can fight each other.

  python3 server/server.py          # serves http://localhost:8765
  python3 server/server.py --port 9000

Protocol (JSON text frames):
  client->server  {"type":"create"}                 -> {"type":"room","room":CODE,"role":"host"}
  client->server  {"type":"join","room":CODE}       -> {"type":"room","room":CODE,"role":"guest"}
  host->server    {"type":"start","payload":{...}}  -> relayed to guest
  host->server    {"type":"turn","playerIndex":N}   -> relayed to guest
  either          {"type":"cmd","cmd":{...}}        -> relayed to the other player
  server->client  {"type":"opponent-left"}          on peer disconnect

The game works fully offline without this server; it is only needed for
the optional "Online" game mode.
"""

import base64
import hashlib
import json
import os
import re
import socket
import struct
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
HOST = "0.0.0.0"
PORT = 8765
MAX_ROOM_SIZE = 2

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
}


class RoomManager:
    """Tiny thread-safe room registry: code -> list of websocket sockets."""

    def __init__(self):
        self.lock = threading.Lock()
        self.rooms = {}  # code -> [sock, sock]

    def _new_code(self):
        alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
        for _ in range(64):
            code = "".join(alphabet[b % len(alphabet)] for b in os.urandom(5))
            if code not in self.rooms:
                return code
        return None

    def create(self, sock):
        with self.lock:
            code = self._new_code()
            if code is None:
                return None
            self.rooms[code] = [sock]
            return code

    def join(self, sock, code):
        code = code.upper()
        with self.lock:
            room = self.rooms.get(code)
            if not room:
                return False
            if len(room) >= MAX_ROOM_SIZE:
                return False
            room.append(sock)
            return True

    def relay(self, sender, data):
        """Send `data` (string or bytes) to every other socket in the sender's
        room, wrapped in a proper WebSocket frame."""
        payload = data if isinstance(data, bytes) else data.encode("utf-8")
        with self.lock:
            targets = []
            for room in self.rooms.values():
                if sender in room:
                    targets = [s for s in room if s is not sender]
                    break
        for s in targets:
            try:
                ws_send(s, payload)
            except OSError:
                pass

    def leave(self, sock):
        with self.lock:
            for code, room in list(self.rooms.items()):
                if sock in room:
                    room.remove(sock)
                    peer = room[0] if room else None
                    if not room:
                        del self.rooms[code]
                    return peer, code
        return None, None


ROOMS = RoomManager()


# --------------------------------------------------------------------------
# WebSocket framing (RFC 6455)
# --------------------------------------------------------------------------

def ws_accept(key):
    digest = hashlib.sha1((key + WS_GUID).encode("utf-8")).digest()
    return base64.b64encode(digest).decode("utf-8")


def ws_send(sock, payload: bytes):
    """Send a single unfragmented text/binary frame (server frames are unmasked)."""
    header = bytearray()
    opcode = 0x1  # text
    n = len(payload)
    header.append(0x80 | opcode)
    if n < 126:
        header.append(n)
    elif n < 65536:
        header.append(126)
        header += struct.pack(">H", n)
    else:
        header.append(127)
        header += struct.pack(">Q", n)
    sock.sendall(bytes(header) + payload)


def ws_send_text(sock, text):
    ws_send(sock, text.encode("utf-8"))


def ws_read_frame(sock):
    """Read one frame; returns (opcode, payload bytes) or None on close/EOF."""
    try:
        head = sock.recv(2)
    except (socket.timeout, OSError):
        return ("ping", b"")
    if len(head) < 2:
        return None
    b0, b1 = head[0], head[1]
    fin = b0 & 0x80
    opcode = b0 & 0x0F
    masked = b1 & 0x80
    n = b1 & 0x7F
    if n == 126:
        ext = _recv_exact(sock, 2)
        if ext is None:
            return None
        n = struct.unpack(">H", ext)[0]
    elif n == 127:
        ext = _recv_exact(sock, 8)
        if ext is None:
            return None
        n = struct.unpack(">Q", ext)[0]
    if n > 4 * 1024 * 1024:
        return None  # message too large
    if masked:
        key = _recv_exact(sock, 4)
        if key is None:
            return None
    else:
        key = None
    payload = _recv_exact(sock, n)
    if payload is None:
        return None
    if masked and key:
        payload = bytes(b ^ key[i % 4] for i, b in enumerate(payload))
    return (opcode, payload)


def _recv_exact(sock, n):
    data = b""
    while len(data) < n:
        try:
            chunk = sock.recv(n - len(data))
        except (socket.timeout, OSError):
            return None
        if not chunk:
            return None
        data += chunk
    return data


def handle_websocket(sock, key):
    try:
        sock.settimeout(45)
        handshake = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {ws_accept(key)}\r\n"
            "\r\n"
        )
        sock.sendall(handshake.encode("utf-8"))

        room = None
        role = None
        last_ping = 0.0
        import time

        while True:
            frame = ws_read_frame(sock)
            if frame is None:
                break
            opcode, payload = frame
            if opcode == 0x8:  # close
                ws_send(sock, bytes([0x88, 0x00]))
                break
            if opcode == 0x9:  # ping
                ws_send(sock, bytes([0x8A, 0x00]))
                continue
            if opcode == 0xA:  # pong
                continue
            if opcode != 0x1:  # only text frames are used
                continue

            try:
                msg = json.loads(payload.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                continue

            mtype = msg.get("type")
            if mtype == "create" and room is None:
                code = ROOMS.create(sock)
                if code:
                    room = code
                    role = "host"
                    ws_send_text(sock, json.dumps({"type": "room", "room": code, "role": "host"}))
                else:
                    ws_send_text(sock, json.dumps({"type": "error", "text": "Could not create a room. Try again."}))
            elif mtype == "join" and room is None:
                code = msg.get("room", "")
                if ROOMS.join(sock, code):
                    room = code
                    role = "guest"
                    ws_send_text(sock, json.dumps({"type": "room", "room": code, "role": "guest"}))
                else:
                    ws_send_text(sock, json.dumps({"type": "error", "text": "Room not found or already full."}))
            elif mtype in ("start", "turn", "cmd") and room is not None:
                ROOMS.relay(sock, json.dumps(msg))
            # Unknown messages are ignored (defense in depth).
    except OSError:
        pass
    finally:
        peer, _ = ROOMS.leave(sock)
        if peer is not None:
            try:
                ws_send_text(peer, json.dumps({"type": "opponent-left"}))
            except OSError:
                pass
        try:
            sock.close()
        except OSError:
            pass


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------

def safe_path(url_path):
    """Resolve a URL path inside ROOT, guarding against traversal."""
    if "?" in url_path:
        url_path = url_path.split("?", 1)[0]
    if url_path in ("", "/"):
        url_path = "/index.html"
    parts = [p for p in url_path.split("/") if p and p not in (".", "..")]
    path = os.path.join(ROOT, *parts)
    if not os.path.realpath(path).startswith(os.path.realpath(ROOT)):
        return None
    return path


def _target_stamp(importer_path, spec):
    """Cache-bust stamp for a relative module specifier.

    Resolves `spec` (e.g. './core/Game.js') against the importer so the
    stamp is the TARGET module's own mtime. Every importer of the same
    module then gets the same URL (one module instance in the browser),
    and editing the target still busts caches. Falls back to the importer's
    mtime when the target cannot be resolved.
    """
    base = os.path.dirname(os.path.abspath(importer_path))
    target = os.path.normpath(os.path.join(base, spec))
    try:
        if os.path.isfile(target):
            return str(int(os.path.getmtime(target) * 1000))
    except OSError:
        pass
    try:
        return str(int(os.path.getmtime(importer_path) * 1000))
    except OSError:
        return "0"


class Handler(BaseHTTPRequestHandler):
    server_version = "NebulaCannons/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("[server] %s\n" % (fmt % args))

    def do_GET(self):
        if self.path == "/ws" or self.path.startswith("/ws?"):
            self._upgrade_ws()
            return
        path = safe_path(self.path)
        if not path or not os.path.isfile(path):
            self.send_error(404, "Not found")
            return
        ext = os.path.splitext(path)[1].lower()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        # Never let browsers keep a stale copy of the game's modules; the
        # dev server changes files constantly and ES-module caches in some
        # webviews survive ordinary reloads.
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if ext == ".html":
            html = open(path, "rb").read().decode("utf-8")
            stamp = str(int(os.path.getmtime(path) * 1000))
            html = html.replace(
                '<script type="module" src="js/main.js"></script>',
                '<script type="module" src="js/main.js?v=%s"></script>' % stamp,
            )
            body = html.encode("utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.wfile.write(body)
        else:
            data = open(path, "rb").read()
            if ext == ".js":
                # Rewrite relative module specifiers with a per-request stamp
                # so every load resolves a fresh module graph. The dev server
                # changes files constantly and some webviews keep stale ES
                # modules in memory across reloads.
                #
                # IMPORTANT: the stamp is the mtime of the TARGET module, not
                # of the file being served. Stamping with the importer's mtime
                # makes every importer resolve a different URL for the same
                # module, so the browser instantiates multiple isolated copies
                # (module-level state like the SvgAssets file registry is not
                # shared between them). A stable per-target URL keeps module
                # identity intact while still busting caches when the module
                # itself changes.
                src = data.decode("utf-8")
                stamp_of = lambda spec: _target_stamp(path, spec)
                src = re.sub(
                    r"(from +')(\.\.?/)([^'\"]*?)(')",
                    lambda m: m.group(1) + m.group(2) + m.group(3) + "?v=" + stamp_of(m.group(2) + m.group(3)) + m.group(4),
                    src,
                )
                src = re.sub(
                    r"(import +['\"])(\.\.?/)([^'\"]*?)['\"]",
                    lambda m: m.group(1) + m.group(2) + m.group(3) + "?v=" + stamp_of(m.group(2) + m.group(3)) + '"',
                    src,
                )
                src = re.sub(
                    r"(import\( *['\"])(\.\.?/)([^'\"]*?)(['\"] *\))",
                    lambda m: m.group(1) + m.group(2) + m.group(3) + "?v=" + stamp_of(m.group(2) + m.group(3)) + m.group(4),
                    src,
                )
                data = src.encode("utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.wfile.write(data)

    def do_HEAD(self):
        """Headers only — mirrors do_GET without the body."""
        path = safe_path(self.path)
        if not path or not os.path.isfile(path):
            self.send_error(404, "Not found")
            return
        ext = os.path.splitext(path)[1].lower()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(os.path.getsize(path)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def _upgrade_ws(self):
        key = self.headers.get("Sec-WebSocket-Key")
        upgrade = self.headers.get("Upgrade", "").lower()
        if not key or "websocket" not in upgrade:
            self.send_error(400, "Bad websocket request")
            return
        sock = self.connection
        handle_websocket(sock, key)
        # Handler exits; the socket is already closed by handle_websocket.
        self.close_connection = True


def main():
    global PORT
    args = sys.argv[1:]
    if "--port" in args:
        try:
            PORT = int(args[args.index("--port") + 1])
        except (ValueError, IndexError):
            print("usage: python3 server/server.py [--port PORT]")
            sys.exit(1)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("=" * 56)
    print("  Nebula Cannons — local server")
    print(f"  Web:    http://localhost:{PORT}")
    print(f"  WS:     ws://localhost:{PORT}/ws")
    print("  Ctrl+C to stop")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
