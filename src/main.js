  import './style.css';
  import miceimg from './assets/mice/mice1.png';
  import checkpointimg from "./assets/decors/Hole.png";
  import trampolinetexture from "./assets/blocks/Trampoline.png";
  import chocolattexture from "./assets/blocks/Chocolat.png";
  import cheesetexture from "./assets/decors/Cheese.png";
  import grasstexture from "./assets/blocks/Grass.png";
  console.log(window.location);
  const ws = new WebSocket("wss://clean-tiger-84.deno.dev");
  const localClientId = Math.random().toString(36).substr(2, 9); // ID único para el cliente local
ws.onopen = () => {
  console.log('Connected to the signaling server');
  ws.send(JSON.stringify({ type: 'join_room', roomId: "rom1", clientId: localClientId }));
  ws.onmessage = (event) => {
    //console.log('Message received from server:', event.data);
    const data = JSON.parse(event.data);
  
    switch (data.type) {
      case 'game_state':
        // Inicializar el estado del juego completo
        console.log('Initializing game state:', data);
        initializeGameState(data);
        break;
  
      case 'player_joined':
        // Spawnear al nuevo jugador
        console.log(`Player joined: ${data.clientId}`,data);
        spawnPlayer(data.clientId, data.state);
        break;
  
      case 'player_update':
        //console.log('Player update:', data);
        // Actualizar el estado de un jugador existente
        // updatePlayerState(data.clientId, data.state);
        //console.log(`Player update: ${data.clientId}`);
        if (localClientId !== data.clientId) {
          playerManager.updatePlayerState(data.clientId, data.state);
        }
        break;
  
      case 'player_left':
        // Eliminar un jugador del cliente
        console.log(`Player left: ${data.clientId}`);
        removePlayer(data.clientId);
        break;
    }
  };


}
ws.onclose = () => {
  console.log('Disconnected from the signaling server');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
function initializeGameState(message) {
  console.log('Initializing game state:', message);
/*   Object.entries(message.state.players).forEach(([clientId, playerState]) => {
    console.log("PlayerState",playerState,clientId);
    playerManager.addPlayer(playerState.x, playerState.y, playerState.controls, clientId);
  }); */
  if (message.state.players && message.state.players.length > 0) {
    console.log("Players",message.state.players);
    message.state.players.forEach(player => {
      if (localClientId !== player.clientId) {
        playerManager.addPlayer(player.x, player.y, player.controls, player.clientId);
        
      }

      });
  }
  
}
function removePlayer(clientId) {
  console.log(`Removing player with ID: ${clientId}`);
  playerManager.removePlayer(clientId);
}
// Función para spawnear jugadores

function player_update(clientId, state) {
 console.log(`Updating player with ID: ${clientId}`, state);
}
class GameObject {
  constructor(x, y, width, height, color, hasBottomCollision = true, src = null) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.active = true;
    this.hasBottomCollision = hasBottomCollision;
    this.velocityX = 0;
    this.velocityY = 0;
    this.gravity = 0.15;
    this.terminalVelocity = 20;
    this.lastCollisionTime = 0;
    this.collisionCooldown = 50; // 50ms entre colisiones
    this.fallTime = 0; // Reiniciar el tiempo de caída si está en el suelo
        // Carga de imagen
        this.image = null;
        if (src) {
          this.loadImage(src);
        }
  }
  loadImage(src) {
    this.image = new Image();
    this.image.src = src;
    this.image.onload = () => {
      console.log(`Image loaded: ${src}`);
    };
    this.image.onerror = () => {
      console.error(`Failed to load image: ${src}`);
    };
  }
  draw(ctx) {
    if (this.active) {
      if (this.image) {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
      } else {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }
  }

  setPhysics(platforms, deltaTime = 0.1) {
    this.velocityY += this.gravity;
    this.velocityY = Math.min(this.velocityY, this.terminalVelocity);
    this.x += this.velocityX;
    this.y += this.velocityY;
    if (this.velocityY > 0) {
      this.fallTime += deltaTime;
    } else {
      this.fallTime = 0; // Reiniciar el tiempo de caída si está en el suelo
    }
    this.gravityMultiplier = Math.min(1 + this.fallTime / 1000, 5); // Máximo multiplicador de 5
    const currentGravity = this.gravity * this.gravityMultiplier;
    this.velocityY += currentGravity;
    this.velocityY = Math.min(this.velocityY, this.terminalVelocity);
  
    // Colisiones
    for (const platform of platforms) {
      if (this.intersects(platform)) {
        // Si es una superficie repelente, dejamos que ella maneje la colisión
        if (platform instanceof RepellingSurface) {
          platform.applyEffect(this);
          continue; // Saltamos el resto de la lógica de colisión para este objeto
        }

        const collisionDirection = this.detectCollisionDirection(platform);
        if (collisionDirection) {
          if (collisionDirection === 'top' && this.velocityY > 0) {
            this.y = platform.y - this.height;
            this.velocityY = 0;
            if (this instanceof Mouse) {
              this.rechargeJump();
            }
          } else if (collisionDirection === 'bottom' && platform.hasBottomCollision) {
            this.y = platform.y + platform.height;
            this.velocityY = Math.max(this.velocityY, 0);
          } else if (collisionDirection === 'left' || collisionDirection === 'right') {
            this.x = collisionDirection === 'left' ? 
              platform.x - this.width : 
              platform.x + platform.width;
          }
        }
      }
    }
  }


  detectCollisionDirection(obj) {
    const overlapX = this.x < obj.x + obj.width && this.x + this.width > obj.x;
    const overlapY = this.y < obj.y + obj.height && this.y + this.height > obj.y;

    if (overlapX && overlapY) {
      const fromTop = Math.abs(this.y + this.height - obj.y);
      const fromBottom = Math.abs(this.y - (obj.y + obj.height));
      const fromLeft = Math.abs(this.x + this.width - obj.x);
      const fromRight = Math.abs(this.x - (obj.x + obj.width));

      const minDist = Math.min(fromTop, fromBottom, fromLeft, fromRight);

      if (minDist === fromTop) return 'top';
      if (minDist === fromBottom) return 'bottom';
      if (minDist === fromLeft) return 'left';
      if (minDist === fromRight) return 'right';
    }

    return null; // No collision
  }
  intersects(obj) {
    return (
      this.x < obj.x + obj.width &&
      this.x + this.width > obj.x &&
      this.y < obj.y + obj.height &&
      this.y + this.height > obj.y
    );
  }
  canCollide() {
    const currentTime = Date.now();
    if (currentTime - this.lastCollisionTime >= this.collisionCooldown) {
      this.lastCollisionTime = currentTime;
      return true;
    }
    return false;
  }
  isColliding(obj) {
    const overlapX = this.x < obj.x + obj.width && this.x + this.width > obj.x;
    const overlapY = this.y < obj.y + obj.height && this.y + this.height > obj.y;
  
    // Si hay superposición en ambos ejes, los objetos están en contacto
    if (overlapX || overlapY) {
      const fromTop = Math.abs(this.y + this.height - obj.y);
      const fromBottom = Math.abs(this.y - (obj.y + obj.height));
      const fromLeft = Math.abs(this.x + this.width - obj.x);
      const fromRight = Math.abs(this.x - (obj.x + obj.width));
  
      // Detectar si la colisión es en una de las direcciones
      const minDist = Math.min(fromTop, fromBottom, fromLeft, fromRight);
  
      if (minDist === fromTop || minDist === fromBottom || minDist === fromLeft || minDist === fromRight) {
        return true; // Están colisionando
      }
    }
  
    return false; // No hay colisión
  }
}
class PowerupJump extends GameObject {
  constructor(x, y) {
    super(x, y, 20, 20, 'red');
    this.boostForce = 2;
  }

  apply(mouse) {
    mouse.rechargeJump()
    if (this.active) {
      mouse.jump(this.boostForce); // Restaurar el salto original después de 5 segundos
      this.active = false;
      setTimeout(() => {
        this.active = true;
      }, 5000);
    }
  }
}

class RechargeJump extends GameObject {
  constructor(x, y) {
    super(x, y, 20, 20, 'orange');
  }

  apply(mouse) {
    mouse.rechargeJump()
    if (this.active) {
      this.active = false;
      // Reactivar después de 5 segundos
      setTimeout(() => {
        this.active = true;
      }, 5000);
    }
  }
}
class Platform extends GameObject {
  constructor(x, y, width, height, color,hasBottomCollision = true, src) {
    super(x, y, width, height, color, hasBottomCollision,src);
  }
}
  
class RepellingSurface extends GameObject {
  constructor(x, y, width, height) {
    super(x, y, width, height, 'pink', true, trampolinetexture);
    this.bounceForce = 5;
    this.lastBounceTime = 0;
    this.bounceCooldown = 50;
    this.deceleration = 0.15; // Factor de desaceleración
    this.maxForce = 15; // Fuerza máxima acumulada
    this.forceMultiplier = 1.2; // Factor de acumulación de fuerza
    this.minForce = 3; // Fuerza mínima antes de detenerse
  }

  applyEffect(gameObject) {
    if (!(gameObject instanceof Mouse)) return;

    const currentTime = Date.now();
    if (currentTime - this.lastBounceTime < this.bounceCooldown) {
      return;
    }

    const collisionDirection = gameObject.detectCollisionDirection(this);
    if (!collisionDirection) return;

    this.lastBounceTime = currentTime;

    // Calcular la fuerza acumulada basada en la velocidad actual
    let accumulatedForce;
    switch (collisionDirection) {
      case 'top':
      case 'bottom':
        accumulatedForce = Math.min(
          Math.abs(gameObject.velocityY) * this.forceMultiplier,
          this.maxForce
        );
        break;
      case 'left':
      case 'right':
        accumulatedForce = Math.min(
          Math.abs(gameObject.velocityX) * this.forceMultiplier,
          this.maxForce
        );
        break;
    }
    
    // Si la fuerza es muy baja, usar la fuerza base
    accumulatedForce = Math.max(accumulatedForce || 0, this.bounceForce);

    switch (collisionDirection) {
      case 'top':
        gameObject.y = this.y - gameObject.height;
        gameObject.velocityY = -accumulatedForce;
        gameObject.rechargeJump();
        // Aplicar desaceleración gradual
        this.applyDeceleration(gameObject, 'vertical');
        break;
      case 'bottom':
        gameObject.y = this.y + this.height;
        gameObject.velocityY = accumulatedForce;
        this.applyDeceleration(gameObject, 'vertical');
        break;
      case 'left':
        gameObject.x = this.x - gameObject.width;
        gameObject.velocityX = -accumulatedForce;
        this.applyDeceleration(gameObject, 'horizontal');
        break;
      case 'right':
        gameObject.x = this.x + this.width;
        gameObject.velocityX = accumulatedForce;
        this.applyDeceleration(gameObject, 'horizontal');
        break;
    }
  }

  applyDeceleration(gameObject, direction) {
    const decelerate = () => {
      if (direction === 'horizontal') {
        if (Math.abs(gameObject.velocityX) > this.minForce) {
          gameObject.velocityX *= (1 - this.deceleration);
        } else {
          gameObject.velocityX = 0;
          clearInterval(decelerationInterval);
        }
      } else {
        if (Math.abs(gameObject.velocityY) > this.minForce) {
          gameObject.velocityY *= (1 - this.deceleration);
        } else {
          gameObject.velocityY = 0;
          clearInterval(decelerationInterval);
        }
      }
    };

    const decelerationInterval = setInterval(decelerate, 200);

    // Limpiar el intervalo después de 2 segundos para evitar que se acumulen
    setTimeout(() => {
      clearInterval(decelerationInterval);
    }, 2000);
  }
}
class Mouse extends GameObject {
  constructor(x, y) {
    super(x, y, 40, 40, 'gray', false, miceimg);
    this.speed = 2;
    this.jumpForce = 8;
    this.jumpMultiplier = 1;
    this.isJumping = false;
    this.isTouchingWall = false;
    this.maxJumps = 1;
    this.jumpCount = this.maxJumps;
    this.defaultSpeed = this.speed;
    // Agregar flags para el movimiento
    this.isMovingLeft = false;
    this.isMovingRight = false;

    // Efectos temporales
    this.originalSpeed = this.speed;
    this.originalJumpForce = this.jumpForce;
    this.isInSlowMotion = false;
    this.originalGravity = this.terminalVelocity;
    this.isGravityModified = false;
        // Propiedades de animación
        this.direction = 'right';
        this.frames = [];
        this.currentFrame = 0;
        this.frameCount = 4;  // Número total de frames para correr
        this.animationSpeed = 0.15;  // Velocidad de la animación
        this.frameTimer = 0;
        
        this.defaultWidth = 40;  // Ancho normal
        this.defaultHeight = 40; // Alto normal
        this.runningWidth = 65;  // Ancho para frames de corrida
        this.runningHeight = 50; // Alto para frames de corrida
        this.verticalOffset = 10; // Píxeles a elevar durante la animación
        // Cargar los frames
        this.loadFrames();
  }
  loadFrames() {
    const defaultimage = new Image();
    defaultimage.src = miceimg;
    this.frames.push(defaultimage);
  
    // Cargar los frames de movimiento dinámicamente
    const images = import.meta.glob('./assets/mice/micerun*.png', { eager: true });
    for (const path in images) {
      const img = new Image();
      img.src = images[path].default || images[path]; // Usar el path generado por Vite
      this.frames.push(img);
    }
  }
  
  updateAnimation(deltaTime) {
    if (Math.abs(this.velocityX) > 0) {
      // Actualizar animación solo si se está moviendo
      this.frameTimer += deltaTime;
      if (this.frameTimer >= this.animationSpeed) {
        // Usar los frames de movimiento (índices 1-4)
        this.currentFrame = ((this.currentFrame % this.frameCount) + 1);
        this.frameTimer = 0;
      }
    } else {
      // Cuando está quieto, usar el frame por defecto (índice 0)
      this.currentFrame = 0;
      this.frameTimer = 0;
    }
  }
  draw(ctx) {
    ctx.save();
    let drawWidth, drawHeight, drawX, drawY;
    // Aplicar efecto espejo según la dirección
    if (this.direction === 'left') {
      ctx.translate(this.x + this.width, this.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(this.x, this.y);
    }

    const currentSprite = this.frames[this.currentFrame];
    if (currentSprite && currentSprite.complete) {
      // Ajustar el escalado según si es un frame de corriendo o no
      if (this.currentFrame >= 1 && this.currentFrame <= 4) {
        drawWidth = this.runningWidth;
        drawHeight = this.runningHeight;
        // Para los frames de corriendo (más pequeños)
        const scaleFactor = 1.4; // Ajusta este valor según necesites
        const widthAdjustment = this.width * scaleFactor;
        const heightAdjustment = this.height * scaleFactor;
        
        // Centrar el sprite escalado
        const xOffset =  -(drawWidth - this.width) / 2;
        const yOffset = -(drawHeight - this.height) / 2 - this.verticalOffset;
        
        ctx.drawImage(
          currentSprite, 
          xOffset, 
          yOffset, 
          widthAdjustment, 
          heightAdjustment
        );
      } else {
        // Para el frame estático (tamaño normal)
        ctx.drawImage(currentSprite, 0, 0, this.width, this.height);
      }
    }

    ctx.restore();
  }

  updateDirection(direction) {
    this.direction = direction;
  }
  setTemporaryEffects(slowFactor, reductgravity) {
    if (!this.isInSlowMotion) {
      // Almacenar los valores originales
      this.originalSpeed = this.speed;
      if (this.velocityX <= 2) this.jumpForce = Math.max(4, Math.min(10, this.jumpForce * slowFactor));;
      // Modificar la velocidad de movimiento y la fuerza del salto
      this.speed *= slowFactor;
      this.isInSlowMotion = true;
      this.originalGravity = this.terminalVelocity;
      this.terminalVelocity = Math.max(0.5, Math.min(10, this.gravity * reductgravity));
    }
  }
  resetTemporaryEffects() {
    if (this.isInSlowMotion) {
      // Restaurar los valores originales
      this.speed = this.originalSpeed;
      this.jumpForce = this.originalJumpForce;
      this.isInSlowMotion = false;
      this.resetGravity();
    }
  }
  setGravityMultiplier(multiplier) {
    if (!this.isGravityModified) {
      // Almacenar la gravedad original
      this.originalGravity = this.gravity;

      // Modificar la gravedad
      this.gravity *= multiplier;
      this.isGravityModified = true;
    }
  }

  resetGravity() {
      this.terminalVelocity = this.originalGravity;
      this.isGravityModified = false;
  }
    updateDirection(direction) {
      // Actualiza la última dirección
      if (direction === 'left') {
        this.lastDirection = 'left';
      } else if (direction === 'right') {
        this.lastDirection = 'right';
      } else if (direction === 'up') {
        this.lastDirection = 'up';
      } else if (direction === 'down') {
        this.lastDirection = 'down';
      }
    }
    move(direction) {
      if (direction === 'left') {
        this.velocityX = -this.speed;
        this.isMovingLeft = true;
        this.isMovingRight = false;
        this.direction = 'left';  // Actualizar dirección para el efecto espejo
      } else if (direction === 'right') {
        this.velocityX = this.speed;
        this.isMovingRight = true;
        this.isMovingLeft = false;
        this.direction = 'right';  // Actualizar dirección para el efecto espejo
      }
    }
    stopMove() {
      this.velocityX = 0;
      this.isMovingLeft = false;
      this.isMovingRight = false;
    }
    accelerateFall() {
      this.velocityY += 1;
    }
    setPhysics(platforms) {
      // Llama a la implementación base para manejar gravedad y movimientos generales
      super.setPhysics(platforms);
    }
    
    jump(jumpForce = 1) {
      if (this.jumpCount > 0) {
        this.velocityY = -this.jumpForce * this.jumpMultiplier * jumpForce; // Aplicar fuerza de salto
        this.isJumping = true; // Marca como saltando
        this.jumpCount--; // Reduce el contador de saltos
      }
    }
  
    rechargeJump() {
      this.jumpCount = this.maxJumps;
      this.isJumping = false;
    }
    isColliding(obj) {
      // Comprobar si hay superposición en el eje X
      const overlapX = this.x + this.width > obj.x &&  this.x < obj.x + obj.width;
      // Comprobar si hay superposición en el eje Y
      const overlapY = this.y + this.height > obj.y &&  this.y < obj.y + obj.height;
    
      // Si hay superposición en ambos ejes, es posible que haya colisión
      if (overlapX || overlapY) {
        // Comprobar las distancias desde los bordes de las plataformas
        const distFromTop = Math.abs(this.y + this.height - obj.y);
        const distFromBottom = Math.abs(this.y - (obj.y + obj.height));
        const distFromLeft = Math.abs(this.x + this.width - obj.x);
        const distFromRight = Math.abs(this.x - (obj.x + obj.width));
    
        // Encontrar la distancia mínima
        const minDist = Math.min(distFromTop, distFromBottom, distFromLeft, distFromRight);
    
        // Si la distancia mínima es cero, significa que las caras se están tocando
        if (minDist === 0) {
          return true; // Colisión detectada
        }
      }
    
      // Si no hay superposición en ambos ejes, no hay colisión
      return false;
    }
    getPlayerdata() {
      return {
        x: this.x,
        y: this.y,
        velocityX: this.velocityX,
        velocityY: this.velocityY,
        isJumping: this.isJumping
      };
    }
}
class Checkpoint extends GameObject {
  constructor(x, y) {
    super(x, y, 30, 30, 'purple', false, checkpointimg);
    this.completed = false;
  }

  completeTask(target, canvas) {
    if (!this.completed && target instanceof Point && target.collected) {
      this.completed = true;
      // Emitir evento personalizado
      const event = new CustomEvent('taskCompleted', {
        detail: { message: 'Tarea completada', target: this },
      });
      canvas.dispatchEvent(event);
      console.log('Checkpoint completado por colisión');
    }
  }

  // Agregar método para verificar colisión con el ratón
  checkMouseCollision(mouse, point, canvas) {
    if (mouse.intersects(this)) {
      this.completeTask(point, canvas);
    }
  }
}
class SlowMotionBlock extends GameObject {
  constructor(x, y, width = 40, height = 40, rechargeJump = true) {
    super(x, y, width, height, '#9C27B0', true, chocolattexture);
    this.playerStates = new Map(); // Mapa para almacenar el estado de cada jugador
    this.slowFactor = 0.2;
    this.jumpReductionFactor = 0.2;
    this.lastx = x;
    this.lasty = y;
    this.rechargeJump = rechargeJump;
  }

  // Método auxiliar para obtener o crear el estado de un jugador
  getPlayerState(player) {
    const playerId = player.id || player; // Usa el ID del jugador si existe, si no usa el objeto como clave
    if (!this.playerStates.has(playerId)) {
      this.playerStates.set(playerId, {
        isColliding: false,
        hasRecharged: false
      });
    }
    return this.playerStates.get(playerId);
  }

  checkMouseCollision(mouse) {
    const playerState = this.getPlayerState(mouse);
    const isCurrentlyColliding = mouse.isColliding(this);
    
    if (isCurrentlyColliding) {
      this.lastx = this.x;
      this.lasty = this.y;
      mouse.setTemporaryEffects(
        this.slowFactor,
        this.jumpReductionFactor
      );
      if (this.rechargeJump)mouse.rechargeJump();

      if (!playerState.hasRecharged && mouse.canCollide()) {
        mouse.rechargeJump();
        playerState.hasRecharged = true;
      }
      
      playerState.isColliding = true;
    } else {
      if (playerState.isColliding) {
        mouse.resetTemporaryEffects();
        playerState.isColliding = false;
        playerState.hasRecharged = false;
      }
    }
  }

  draw(ctx) {
    super.draw(ctx);
    
    // Dibuja el borde si cualquier jugador está colisionando
    const anyPlayerColliding = Array.from(this.playerStates.values())
      .some(state => state.isColliding);
      
    if (anyPlayerColliding) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }

  // Método para limpiar el estado de un jugador cuando sea necesario
  clearPlayerState(player) {
    const playerId = player.id || player;
    this.playerStates.delete(playerId);
  }
}
class Point extends GameObject {
  constructor(x, y) {
    super(x, y, 25, 25, 'yellow', false, cheesetexture);
    this.collected = false;
  }

  collect() {
    this.collected = true;
    this.active = false;
  }

  // Agregar método para verificar colisión con el ratón
  checkMouseCollision(mouse) {
    if (!this.collected && this.active && mouse.intersects(this)) {
      this.collect();
      console.log('Point recogido por colisión');
    }
  }
}
class PlayerManager {
  constructor() {
    this.players = [];
    this.playerControls = new Map();
    this.lastTime = 0;
  }

  addPlayer(x, y, controls, clientId) {
    const player = new Mouse(x, y);
    const playerData = {
      player,
      id: `${clientId}`,
      controls,
      isMovingLeft: false,
      isMovingRight: false
    };
    this.players.push(playerData);
    this.setupPlayerControls(playerData);
    return playerData;
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
    }
  }

  setupPlayerControls(playerData) {
    const { controls } = playerData;
    if (!controls) return;
    document.addEventListener('keydown', (event) => {
      if (event.key === controls.left) {
        playerData.isMovingLeft = true;
        playerData.player.updateDirection('left');
      }
      if (event.key === controls.right) {
        playerData.isMovingRight = true;
        playerData.player.updateDirection('right');
      }
      if (event.key === controls.up) {
        if (playerData.player.isClimbing) {
          playerData.player.climb('up');
        } else {
          playerData.player.jump();
        }
        playerData.player.updateDirection('up');
      }
      if (event.key === controls.down) {
        playerData.player.accelerateFall();
        playerData.player.updateDirection('down');
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.key === controls.left) {
        playerData.isMovingLeft = false;
        if (!playerData.isMovingRight) playerData.player.stopMove();
      }
      if (event.key === controls.right) {
        playerData.isMovingRight = false;
        if (!playerData.isMovingLeft) playerData.player.stopMove();
      }
    });
  }

  update(platforms, powerups, checkpoint, point, canvas) {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convertir a segundos
    this.lastTime = currentTime;
    this.players.forEach(playerData => {
      const player = playerData.player;
      
      // Actualizar movimiento
      player.updateAnimation(deltaTime);
      if (playerData.isMovingLeft) player.move('left');
      if (playerData.isMovingRight) player.move('right');
      // Actualizar física
      player.setPhysics(platforms);

      // Verificar colisiones con puntos y checkpoint
      point.checkMouseCollision(player);
      checkpoint.checkMouseCollision(player, point, canvas);

      // Verificar colisiones con plataformas especiales
      platforms.forEach(platform => {
        if (platform instanceof SlowMotionBlock) {
          platform.checkMouseCollision(player);
        }
        if (platform instanceof RepellingSurface && player.intersects(platform)) {
          platform.applyEffect(player);
        }
      });

      // Procesar powerups
      powerups.forEach(powerup => {
        if (powerup.active && player.intersects(powerup)) {
          if (powerup instanceof PowerupJump || powerup instanceof RechargeJump) {
            powerup.apply(player);
          }
        }
      });
    });
  }

  draw(ctx) {
    this.players.forEach(playerData => {
      playerData.player.draw(ctx);
    });
  }
  updatePlayerState(clientId, state) {
    if (!state) return;
    const playerData = this.players.find(p => p.id === clientId);
    if (playerData) {
      const player = playerData.player;
      player.x = state.x;
      player.y = state.y;
      player.velocityX = state.velocityX;
      player.velocityY = state.velocityY;
      player.isJumping = state.isJumping;
    }
  }
  getPlayerdata(clientId) {
    const playerData = this.players.find(p => p.id === clientId);
    if (playerData) {
      return playerData.player.getPlayerdata();
    }
  }

}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const checkpoint = new Checkpoint(50, 550);
const point = new Point(700, 100);
const powerups = [
  new PowerupJump(300, 520),
  new PowerupJump(300, 400),
  new RechargeJump(300, 240),
  new RechargeJump(400, 120),
  new RechargeJump(520, 190),
  new RechargeJump(700, 200),
];

const platforms = [
  new RepellingSurface (0, 10, 20, 700, 'blue'),   
  new Platform (0, 580, 800, 20, 'blue', true, grasstexture),
  new RepellingSurface (440, 490, 800, 20, 'blue'),                                      
  new SlowMotionBlock(200, 300, 100, 80, 'brown'), 
  new SlowMotionBlock(400, 400, 100, 100, 'green'),   
  new SlowMotionBlock(400, 560, 100, 20, 'green'),   
  new SlowMotionBlock(600, 290, 200, 40, 'cyan'),             
];

const playerManager = new PlayerManager();

// Configurar los controles para cada jugador
const defaultcontrolls = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown'
};
function spawnPlayer(clientId, state) {
  console.log(`Spawning player with ID: ${clientId}`);
  const playerControls = (clientId === localClientId)
    ? defaultcontrolls // Solo asignar controles locales al jugador local
    : {}; // Los demás jugadores no tendrán controles locales

  playerManager.addPlayer(50,550, playerControls, clientId);
  console.log('Player spawned:', state,clientId);
}

// Añadir jugadores locamente
//playerManager.addPlayer(50, 550, defaultcontrolls);
//playerManager.addPlayer(100, 550, player2Controls);

// Modificar el gameLoop para usar PlayerManager
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar elementos estáticos
  checkpoint.draw(ctx);
  point.draw(ctx);
  
  // Dibujar plataformas
  platforms.forEach(platform => platform.draw(ctx));
  
  // Dibujar powerups
  powerups.forEach(powerup => powerup.draw(ctx));

  playerManager.update(platforms, powerups, checkpoint, point, canvas);
  playerManager.draw(ctx);
  if (ws && ws.readyState === WebSocket.OPEN) {
    const dataplayer = playerManager.getPlayerdata(localClientId);
    ws.send(JSON.stringify({ type: 'player_update', state: dataplayer }));  
  }
  requestAnimationFrame(gameLoop);
}


gameLoop();
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Redibujar el canvas si es necesario
  ctx.fillStyle = "lightblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
});

canvas.addEventListener('taskCompleted', (event) => {
  console.log(event.detail.message); // "Tarea completada"
});