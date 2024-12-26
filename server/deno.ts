import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

class User {
  userId: string;
  clientId: string | null;

  constructor(userId?: string, clientId?: string) {
    this.userId = userId || crypto.randomUUID();
    this.clientId = clientId || null;
  }

  setClientId(clientId: string) {
    this.clientId = clientId;
  }

  getUserInfo() {
    return {
      userId: this.userId,
      clientId: this.clientId,
    };
  }
}

interface PlayerState {
  userId: string;
  clientId: string | null;
  [key: string]: any;
}

class GameRoom {
  id: string;
  players: Map<string, PlayerState>;
  gameState: {
    platforms: any[];
    powerups: any[];
    checkpoint: null;
    point: null;
  };

  constructor(id: string) {
    this.id = id;
    this.players = new Map();
    this.gameState = {
      platforms: [],
      powerups: [],
      checkpoint: null,
      point: null,
    };
  }

  addPlayer(userId: string, clientId: string | null, initialState: any) {
    this.players.set(userId, {
      userId,
      clientId,
      ...initialState,
    });
  }

  removePlayer(userId: string) {
    this.players.delete(userId);
  }

  updatePlayerState(userId: string, newState: any) {
    if (this.players.has(userId)) {
      const currentPlayer = this.players.get(userId);
      this.players.set(userId, {
        ...currentPlayer!,
        ...newState,
      });
    }
  }

  getState() {
    return {
      players: Array.from(this.players.values()),
      gameState: this.gameState,
    };
  }

  arrayplayers() {
    return Array.from(this.players.values());
  }
}

class GameServer {
  private rooms: Map<string, GameRoom>;
  private users: Map<string, User>;
  private clientRooms: Map<string, string>;
  private connections: Map<string, WebSocket>;

  constructor() {
    this.rooms = new Map();
    this.users = new Map();
    this.clientRooms = new Map();
    this.connections = new Map();
    this.startServer();
  }

  private async startServer() {
    const handler = async (req: Request): Promise<Response> => {
      if (req.headers.get("upgrade") != "websocket") {
        return new Response(null, { status: 501 });
      }

      const { socket: ws, response } = Deno.upgradeWebSocket(req);
      const sessionId = crypto.randomUUID();
      const user = new User();
      
      this.users.set(sessionId, user);
      this.connections.set(sessionId, ws);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(sessionId, data);
        } catch (e) {
          console.error("Failed to parse message:", e);
        }
      };

      ws.onclose = () => {
        console.log(`Session ${sessionId} disconnected`);
        this.handleDisconnect(sessionId);
      };

      return response;
    };

    console.log("WebSocket server running on http://localhost:3000");
    await serve(handler, { port: 3000 });
  }

  private handleMessage(sessionId: string, data: any) {
    const user = this.users.get(sessionId);
    if (!user) return;

    switch (data.type) {
      case "join_room":
        this.handleJoinRoom(sessionId, data.roomId, user, data.clientId, data.initialState);
        break;
      case "player_update":
        this.handlePlayerUpdate(sessionId, data.state);
        break;
      case "getCheckpoint":
        this.handleEventgame(sessionId, data.state, data.type);
        break;
      case "getPoint":
        this.handleEventgame(sessionId, data.state, data.type);
        break;
      case "game_action":
        this.handleGameAction(sessionId, data.action);
        break;
    }
  }

  private handleJoinRoom(
    sessionId: string,
    roomId: string,
    user: User,
    clientId: string,
    initialState: any,
  ) {
    if (clientId) user.setClientId(clientId);

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new GameRoom(roomId));
    }

    const room = this.rooms.get(roomId)!;
    room.addPlayer(user.userId, user.clientId, initialState);
    this.clientRooms.set(user.userId, roomId);

    const ws = this.connections.get(sessionId);
    if (ws) {
      ws.send(JSON.stringify({
        type: "game_state",
        state: room.getState(),
        user: user.getUserInfo(),
      }));
    }

    this.broadcastToRoom(roomId, {
      type: "player_joined",
      userId: user.userId,
      state: initialState,
      clientId: user.clientId,
    });
  }

  private handlePlayerUpdate(sessionId: string, newState: any) {
    const user = this.users.get(sessionId);
    if (!user) return;

    const roomId = this.clientRooms.get(user.userId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.updatePlayerState(user.userId, newState);

    this.broadcastToRoom(roomId, {
      type: "player_update",
      userId: user.userId,
      state: newState,
      clientId: user.clientId,
    });
  }
  private handleEventgame(sessionId: string, newState: any, action: string) {
    const user = this.users.get(sessionId);
    if (!user) return;
    const roomId = this.clientRooms.get(user.userId);
    if (!roomId) return;
    this.broadcastToRoom(roomId, {
      type: action,
      userId: user.userId,
      state: newState,
      clientId: user.clientId,
    });
  }
  private handleGameAction(sessionId: string, action: any) {
    const user = this.users.get(sessionId);
    if (!user) return;

    const roomId = this.clientRooms.get(user.userId);
    if (!roomId) return;

    this.broadcastToRoom(roomId, {
      type: "game_action",
      userId: user.userId,
      action: action,
      clientId: user.clientId,
    });
  }

  private handleDisconnect(sessionId: string) {
    const user = this.users.get(sessionId);
    if (!user) return;

    const roomId = this.clientRooms.get(user.userId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(user.userId);
    }

    this.clientRooms.delete(user.userId);
    this.users.delete(sessionId);
    this.connections.delete(sessionId);

    this.broadcastToRoom(roomId, {
      type: "player_left",
      userId: user.userId,
      clientId: user.clientId,
    });
  }

  private broadcastToRoom(roomId: string, message: any, excludeSessions: string[] = []) {
    for (const [sessionId, ws] of this.connections.entries()) {
      const user = this.users.get(sessionId);
      if (
        user &&
        this.clientRooms.get(user.userId) === roomId &&
        !excludeSessions.includes(sessionId)
      ) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}

// Start the server
new GameServer();