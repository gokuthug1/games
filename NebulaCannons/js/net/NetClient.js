/**
 * NetClient — optional online play over the local Python server.
 * The game is fully playable without it; this module only activates when the
 * user picks "Online" mode and a server is reachable.
 *
 * Protocol (JSON over WebSocket, relayed by server.py):
 *   client->server {type:'create'} | {type:'join', room}
 *   server->client {type:'room', room, role:'host'|'guest'} | {type:'error', text}
 *   host->server    {type:'start', payload}      (relayed to guest)
 *   host->server    {type:'turn', playerIndex}   (relayed to guest)
 *   any->server     {type:'cmd', cmd}            (relayed to the other player)
 *   server->client  {type:'opponent-left'}
 *
 * Both clients simulate the same seeded match; the opponent's tank state and
 * shot parameters are the only things relayed.
 */

export class NetClient {
  constructor(game) {
    this.game = game;
    this.ws = null;
    this.room = null;
    this.role = null;
    this.connected = false;
    this.myPlayerIndex = 0;
    this._onOpponentLeft = null;
  }

  get isOnline() {
    return this.connected;
  }

  /** Open the websocket. */
  connect(url) {
    return new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        reject(err);
        return;
      }
      this.ws = ws;
      this._onOpponentLeft = () => this.game.onOnlineOpponentLeft();
      ws.onopen = () => {
        this.connected = true;
        resolve();
      };
      ws.onerror = () => {
        this.connected = false;
        reject(new Error('WebSocket connection failed'));
      };
      ws.onclose = () => {
        const wasConnected = this.connected;
        this.connected = false;
        if (wasConnected && this._onOpponentLeft) this._onOpponentLeft();
      };
      ws.onmessage = (e) => this._onMessage(e);
    });
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  createRoom() {
    this.send({ type: 'create' });
  }

  joinRoom(code) {
    this.send({ type: 'join', room: String(code).toUpperCase() });
  }

  startMatch(payload) {
    this.send({ type: 'start', payload });
  }

  broadcastTurn(playerIndex) {
    this.send({ type: 'turn', playerIndex });
  }

  sendCmd(cmd) {
    this.send({ type: 'cmd', cmd });
  }

  _onMessage(e) {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    const game = this.game;
    switch (msg.type) {
      case 'room':
        this.room = msg.room;
        this.role = msg.role;
        this.myPlayerIndex = msg.role === 'host' ? 0 : 1;
        game.onOnlineRoom(msg);
        break;
      case 'error':
        game.onOnlineError(msg.text);
        break;
      case 'start':
        game.onOnlineStart(msg.payload);
        break;
      case 'turn':
        game.onOnlineTurn(msg.playerIndex);
        break;
      case 'cmd':
        game.onOnlineCmd(msg.cmd);
        break;
      case 'opponent-left':
        game.onOnlineOpponentLeft();
        break;
      default:
        break;
    }
  }

  disconnect() {
    this._onOpponentLeft = null;
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this.connected = false;
    this.room = null;
    this.role = null;
  }
}
