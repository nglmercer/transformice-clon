  // server.js
  const WebSocket = require('ws');
  const { v4: uuidv4 } = require('uuid');
  const port = 3000;
  class User {
    constructor(userId, clientId) {
      this.userId = userId || uuidv4(); // Generado por el servidor si no existe
      this.clientId = clientId || null; // Proporcionado por el cliente
    }
  
    setClientId(clientId) {
      this.clientId = clientId;
    }
  
    getUserInfo() {
      return {
        userId: this.userId,
        clientId: this.clientId
      };
    }
  }
  
  class GameRoom {
    constructor(id) {
      this.id = id;
      this.players = new Map(); // Map<userId, {userId, clientId, position, state}>
      this.gameState = {
        platforms: [],
        powerups: [],
        checkpoint: null,
        point: null
      };
    }
  
    addPlayer(userId, clientId, initialState) {
      this.players.set(userId, {
        userId,
        clientId,
        ...initialState
      });
    }
  
    removePlayer(userId) {
      this.players.delete(userId);
    }
  
    updatePlayerState(userId, newState) {
      if (this.players.has(userId)) {
        const currentPlayer = this.players.get(userId);
        this.players.set(userId, {
          ...currentPlayer,
          ...newState
        });
      }
    }
  
    getState() {
      return {
        players: Array.from(this.players.values()), // Convert Map to array of player objects
        gameState: this.gameState
      };
    }
    arrayplayers(){
      let players = Array.from(this.players.values());
      return players;
    }
  }

  class GameServer {
    constructor() {
      this.rooms = new Map(); // Map<roomId, GameRoom>
      this.users = new Map(); // Map<sessionId, User>
      this.clientRooms = new Map(); // Map<clientId, roomId>
      this.server = new WebSocket.Server({ port });
      this.setupServer();
    }
  
    setupServer() {
      this.server.on('connection', (ws) => {
        const sessionId = uuidv4(); // Identificador único para la sesión
        const user = new User(); // Crear un nuevo usuario
        this.users.set(sessionId, user);
  
        ws.sessionId = sessionId;
  
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            this.handleMessage(ws, data);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        });
  
        ws.on('close', () => {
          console.log(`Session ${sessionId} disconnected`);
          this.handleDisconnect(sessionId);
        });
      });
  
      console.log(`WebSocket server running on port ${port}`);
    }
  
    handleMessage(ws, data) {
      const user = this.users.get(ws.sessionId);
  
      switch (data.type) {
        case 'join_room':
          this.handleJoinRoom(ws, data.roomId, user, data.clientId, data.initialState);
          break;
        case 'player_update':
          this.handlePlayerUpdate(ws.sessionId, data.state);
          break;
        case 'game_action':
          this.handleGameAction(ws.sessionId, data.action);
          break;
      }
    }
  
    handleJoinRoom(ws, roomId, user, clientId, initialState) {
      if (clientId) user.setClientId(clientId); // Asociar clientId al usuario
  
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new GameRoom(roomId));
      }
  
      const room = this.rooms.get(roomId);
      room.addPlayer(user.userId,user.clientId, initialState);
      this.clientRooms.set(user.userId, roomId);
  
      // Enviar el estado inicial al cliente que se une
      ws.send(JSON.stringify({
        type: 'game_state',
        state: room.getState(),
        user: user.getUserInfo() // Confirmar los identificadores al cliente
      }));
  
      // Notificar a los demás jugadores en la sala
      this.broadcastToRoom(roomId, {
        type: 'player_joined',
        userId: user.userId,
        state: initialState,
        clientId: user.clientId
      });
    }
  
    handlePlayerUpdate(sessionId, newState) {
      const user = this.users.get(sessionId);
      const roomId = this.clientRooms.get(user.userId);
      if (!roomId) return;
  
      const room = this.rooms.get(roomId);
      room.updatePlayerState(user.userId, newState);
  
      // Notificar a los demás jugadores
      this.broadcastToRoom(roomId, {
        type: 'player_update',
        userId: user.userId,
        state: newState,
        clientId: user.clientId
      });
    }
  
    handleGameAction(sessionId, action) {
      const user = this.users.get(sessionId);
      const roomId = this.clientRooms.get(user.userId);
      if (!roomId) return;
  
      // Broadcast game action to all players in the room
      this.broadcastToRoom(roomId, {
        type: 'game_action',
        userId: user.userId,
        action: action,
        clientId: user.clientId
      });
    }
  
    handleDisconnect(sessionId) {
      const user = this.users.get(sessionId);
      if (!user) return;
  
      const roomId = this.clientRooms.get(user.userId);
      if (!roomId) return;
  
      const room = this.rooms.get(roomId);
      room.removePlayer(user.userId);
  
      this.clientRooms.delete(user.userId);
      this.users.delete(sessionId);
  
      // Notificar a los demás jugadores
      this.broadcastToRoom(roomId, {
        type: 'player_left',
        userId: user.userId,
        clientId: user.clientId
      });
    }
  
    broadcastToRoom(roomId, message, excludeSessions = []) {
      this.server.clients.forEach(client => {
        const sessionId = client.sessionId;
        if (
          client.readyState === WebSocket.OPEN &&
          this.clientRooms.get(this.users.get(sessionId)?.userId) === roomId &&
          !excludeSessions.includes(sessionId)
        ) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }
  

  // Start the server
  new GameServer();