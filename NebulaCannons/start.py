#!/usr/bin/env python3
"""
Nebula Cannons — LAN launcher.

Starts the game server, prints the local-network address so other devices
can connect, and shows a firewall tip for Windows users.

  python3 start.py            # default port 8765
  python3 start.py --port 9000
"""

import argparse
import os
import platform
import socket
import subprocess
import sys
import webbrowser


def get_lan_ips():
    """Return a list of IPv4 addresses for this machine's LAN interfaces."""
    ips = []
    try:
        # Connect to an external address to discover the default route.
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        primary = s.getsockname()[0]
        s.close()
        ips.append(primary)
    except OSError:
        pass

    # Also grab every other non-loopback address via getaddrinfo.
    seen = set(ips)
    for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
        addr = info[4][0]
        if addr not in seen and not addr.startswith("127."):
            ips.append(addr)
            seen.add(addr)

    return ips or ["localhost"]


def print_header(port, ips):
    url = f"http://{ips[0]}:{port}"
    line = "=" * 60
    print(f"""
{line}
  Nebula Cannons — LAN Server
{line}

  Server running at:

    {url}

  To play on another device (phone, tablet, another PC):

    1. Make sure both devices are on the SAME Wi-Fi network.
    2. Open the address above in the other device's browser.
    3. Both players:  Play -> Online.
    4. One player:    Create room   (you get a 5-letter code).
    5. Other player:  Enter code -> Join.
    6. Host picks map + loadout -> Start Battle.

  Additional addresses (if primary doesn't reach):
""")
    for ip in ips[1:]:
        print(f"    http://{ip}:{port}")
    if len(ips) <= 1:
        print("    (none found)")
    print()

    # Platform-specific firewall tip
    if platform.system() == "Windows":
        print("""  ** Windows Firewall tip **
  Python may have been blocked from accepting network connections.
  If the other device cannot load the page, run this once in an
  Admin terminal (right-click -> Run as administrator):

    netsh advfirewall firewall add rule name="Nebula Cannons" dir=in action=allow protocol=TCP localport=""" + str(port) + """

  Or allow Python through Windows Defender Firewall when prompted.
""")
    elif platform.system() == "Linux":
        print(f"""  ** Linux firewall tip **
  If the other device cannot connect, check your firewall:

    sudo ufw allow {port}/tcp

  Or:  sudo iptables -A INPUT -p tcp --dport {port} -j ACCEPT
""")
    elif platform.system() == "Darwin":
        print(f"""  ** macOS note **
  macOS generally allows incoming connections, but if the other
  device can't connect check  System Settings -> Network -> Firewall.
""")
    print(f"{line}\n  Ctrl+C to stop the server.\n{line}\n")


def main():
    parser = argparse.ArgumentParser(description="Start Nebula Cannons LAN server")
    parser.add_argument("--port", type=int, default=8765, help="Port (default 8765)")
    parser.add_argument("--no-browser", action="store_true", help="Don't open the browser")
    args = parser.parse_args()

    port = args.port
    ips = get_lan_ips()
    print_header(port, ips)

    # Optionally open the local browser.
    if not args.no_browser:
        try:
            webbrowser.open(f"http://localhost:{port}")
        except Exception:
            pass

    # Launch the server.
    server_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server")
    server_py = os.path.join(server_dir, "server.py")
    try:
        subprocess.run(
            [sys.executable, server_py, "--port", str(port)],
            cwd=server_dir,
        )
    except KeyboardInterrupt:
        print("\nShutting down.")


if __name__ == "__main__":
    main()
