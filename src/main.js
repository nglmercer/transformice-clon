  import './style.css';

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
    super(x, y, width, height, 'pink', true, "/src/assets/blocks/Trampoline.png");
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
    super(x, y, 40, 40, 'gray', false, "/src/assets/mice/mice1.png");
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
  }
  setTemporaryEffects(slowFactor, reductgravity) {
    if (!this.isInSlowMotion) {
      // Almacenar los valores originales
      this.originalSpeed = this.speed;
      this.originalJumpForce = this.jumpForce;
      
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
      } else if (direction === 'right') {
        this.velocityX = this.speed;
        this.isMovingRight = true;
        this.isMovingLeft = false;
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
    
}
class Checkpoint extends GameObject {
  constructor(x, y) {
    super(x, y, 30, 30, 'purple', false, "/src/assets/decors/Hole.png");
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
  constructor(x, y, width = 40, height = 40) {
    super(x, y, width, height, '#9C27B0', true, "/src/assets/blocks/Chocolat.png");
    this.isColliding = false;
    this.hasRecharged = false;
    this.slowFactor = 0.2;
    this.jumpReductionFactor = 0.2;
    this.lastx = x;
    this.lasty = y;
  }

  checkMouseCollision(mouse) {
    const isCurrentlyColliding = mouse.isColliding(this);
    
    if (isCurrentlyColliding) {
      console.log('Mouse position:',isCurrentlyColliding, mouse.x, mouse.y,this.x, this.y);
      this.lastx = this.x;
      this.lasty = this.y;
      mouse.setTemporaryEffects(
        this.slowFactor,
        this.jumpReductionFactor
      );
      
      if (!this.hasRecharged && mouse.canCollide()) {
        mouse.rechargeJump();
        this.hasRecharged = true;
      }
      
      this.isColliding = true;
    } else {
      if (this.isColliding) {
        mouse.resetTemporaryEffects();
        this.isColliding = false;
        this.hasRecharged = false;
      }
    }
  }

  draw(ctx) {
    super.draw(ctx);
    if (this.isColliding) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }
}
class Point extends GameObject {
  constructor(x, y) {
    super(x, y, 25, 25, 'yellow', false, "/src/assets/decors/Cheese.png");
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
  new Platform (0, 580, 800, 20, 'blue', true, "/src/assets/blocks/Grass.png"),
  new RepellingSurface (440, 490, 800, 20, 'blue'),                                      
  new SlowMotionBlock(200, 300, 100, 80, 'brown'), 
  new SlowMotionBlock(400, 400, 100, 100, 'green'),   
  new SlowMotionBlock(400, 560, 100, 20, 'green'),   
  new SlowMotionBlock(600, 290, 200, 40, 'cyan'),             
];

let isMovingLeft = false;
let isMovingRight = false;

// ... (resto del código anterior se mantiene igual hasta la definición de variables globales)

const mouse = new Mouse(50, 550);
const mouse2 = new Mouse(100, 550); // Segundo jugador

// Variables de control para ambos jugadores
let player1 = {
  isMovingLeft: false,
  isMovingRight: false
};

let player2 = {
  isMovingLeft: false,
  isMovingRight: false
};

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar elementos estáticos
  checkpoint.draw(ctx);
  point.draw(ctx);
  
  // Verificar colisiones para ambos jugadores
  point.checkMouseCollision(mouse);
  point.checkMouseCollision(mouse2);
  checkpoint.checkMouseCollision(mouse, point, canvas);
  checkpoint.checkMouseCollision(mouse2, point, canvas);

  // Dibujar y procesar plataformas para ambos jugadores
  for (const platform of platforms) {
    platform.draw(ctx);
    if (platform instanceof SlowMotionBlock) {
      platform.checkMouseCollision(mouse);
      platform.checkMouseCollision(mouse2);
    }
  }

  // Procesar powerups para ambos jugadores
  for (const powerup of powerups) {
    powerup.draw(ctx);
    if (powerup.active) {
      if (powerup instanceof PowerupJump) {
        if (mouse.intersects(powerup)) powerup.apply(mouse);
        if (mouse2.intersects(powerup)) powerup.apply(mouse2);
      }
      if (powerup instanceof RechargeJump) {
        if (mouse.intersects(powerup)) powerup.apply(mouse);
        if (mouse2.intersects(powerup)) powerup.apply(mouse2);
      }
    }
  }

  // Procesar superficies repelentes para ambos jugadores
  for (const platform of platforms) {
    platform.draw(ctx);
    if (platform instanceof RepellingSurface) {
      if (mouse.intersects(platform)) platform.applyEffect(mouse);
      if (mouse2.intersects(platform)) platform.applyEffect(mouse2);
    }
  }

  // Actualizar movimiento del jugador 1
  if (player1.isMovingLeft) mouse.move('left');
  if (player1.isMovingRight) mouse.move('right');

  // Actualizar movimiento del jugador 2
  if (player2.isMovingLeft) mouse2.move('left');
  if (player2.isMovingRight) mouse2.move('right');

  // Actualizar física para ambos jugadores
  mouse.setPhysics(platforms);
  mouse2.setPhysics(platforms);

  // Dibujar ambos jugadores
  mouse.draw(ctx);
  mouse2.draw(ctx);

  requestAnimationFrame(gameLoop);
}

// Event listeners para controles de ambos jugadores
document.addEventListener('keydown', (event) => {
  switch (event.key) {
    // Controles jugador 1 (flechas)
    case 'ArrowLeft':
      player1.isMovingLeft = true;
      mouse.updateDirection('left');
      break;
    case 'ArrowRight':
      player1.isMovingRight = true;
      mouse.updateDirection('right');
      break;
    case 'ArrowUp':
      if (mouse.isClimbing) {
        mouse.climb('up');
      } else {
        mouse.jump();
      }
      mouse.updateDirection('up');
      break;
    case 'ArrowDown':
      mouse.accelerateFall();
      mouse.updateDirection('down');
      break;

    // Controles jugador 2 (WASD)
    case 'a':
    case 'A':
      player2.isMovingLeft = true;
      mouse2.updateDirection('left');
      break;
    case 'd':
    case 'D':
      player2.isMovingRight = true;
      mouse2.updateDirection('right');
      break;
    case 'w':
    case 'W':
      if (mouse2.isClimbing) {
        mouse2.climb('up');
      } else {
        mouse2.jump();
      }
      mouse2.updateDirection('up');
      break;
    case 's':
    case 'S':
      mouse2.accelerateFall();
      mouse2.updateDirection('down');
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.key) {
    // Controles jugador 1
    case 'ArrowLeft':
      player1.isMovingLeft = false;
      if (!player1.isMovingRight) mouse.stopMove();
      break;
    case 'ArrowRight':
      player1.isMovingRight = false;
      if (!player1.isMovingLeft) mouse.stopMove();
      break;

    // Controles jugador 2
    case 'a':
    case 'A':
      player2.isMovingLeft = false;
      if (!player2.isMovingRight) mouse2.stopMove();
      break;
    case 'd':
    case 'D':
      player2.isMovingRight = false;
      if (!player2.isMovingLeft) mouse2.stopMove();
      break;
  }
});

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