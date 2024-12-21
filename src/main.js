  import './style.css';

  class GameObject {
    constructor(x, y, width, height, color, friction = 0, hasBottomCollision = true, bounce = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.color = color;
      this.friction = friction;
      this.bounce = bounce;
      this.active = true;
      this.hasBottomCollision = hasBottomCollision;
    }
  
    draw(ctx) {
      if (this.active) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }
  
    applyPhysics(mouse, collisionDirection) {
      console.log(collisionDirection)
      if (collisionDirection === 'top' && this.bounce) {
        mouse.velocityY = -this.bounce;  // Rebote hacia arriba
        mouse.rechargeJump();            // Permitir saltar después del rebote
      }
    
      if (collisionDirection === 'left' && this.bounce) {
        mouse.velocityX = this.bounce;   // Rebote hacia la derecha
        mouse.rechargeJump();
      }
    
      if (collisionDirection === 'right' && this.bounce) {
        mouse.velocityX = -this.bounce;  // Rebote hacia la izquierda
        mouse.rechargeJump();
      }
    
      if (collisionDirection === 'bottom' && this.hasBottomCollision) {
        mouse.velocityY = Math.max(mouse.velocityY, 0); // Detener caída
      }
    
      if (collisionDirection === 'left' || collisionDirection === 'right') {
        mouse.velocityX *= this.friction;
      }
    }
    
  
    // Nuevo método para cambiar las propiedades de física dinámicamente
    setPhysics({ friction = this.friction, bounce = this.bounce, hasBottomCollision = this.hasBottomCollision }) {
      console.log( this.bounce)
      this.friction = friction;
      this.bounce = bounce;
      this.hasBottomCollision = hasBottomCollision;
    }
  }
  
  class PowerupJump extends GameObject {
    constructor(x, y) {
      super(x, y, 20, 20, 'red');
      this.boostForce = 1.5;
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

  class Mouse extends GameObject {
    constructor(x, y) {
      super(x, y, 20, 20, 'gray');
      this.speed = 5;
      this.jumpForce = 10;
      this.jumpMultiplier = 1; // Multiplicador de salto, por defecto es 1
      this.gravity = 0.6;
      this.velocityY = 0;
      this.velocityX = 0;
      this.isJumping = false;
      this.isClimbing = false;
      this.isTouchingWall = false;
      this.maxJumps = 1;  // Número máximo de saltos permitidos
      this.jumpCount = this.maxJumps; // Contador de saltos disponibles
      this.lastDirecton = null
    }
  
    accelerateFall() {
      this.velocityY += 1;
    }
  
    move(direction) {
      if (direction === 'left') {
        this.velocityX = -this.speed;
      } else if (direction === 'right') {
        this.velocityX = this.speed;
      }
    }
  
    stopMove() {
      this.velocityX = 0;
    }
  
    jump(jumpforce=1) {
      if (this.jumpCount > 0) {
        this.velocityY = -this.jumpForce * this.jumpMultiplier * jumpforce; // Aplicar el multiplicador de salto
        this.isJumping = true;
        this.jumpCount--; // Reducir el contador de saltos disponibles
        this.isTouchingWall = false;
      }
    }
  
    rechargeJump() {
      this.jumpCount = 1; // Recargar el número de saltos permitidos
      this.isJumping = false;
      this.isClimbing = false;
      this.isTouchingWall = false;
    }
  
    increaseJumpForce(amount) {
      this.jumpForce += amount; // Aumentar la fuerza del salto (altura)
    }
  
    setJumpForce(force) {
      this.jumpForce = force; // Establecer una fuerza de salto específica
    }
  
    setJumpMultiplier(multiplier) {
      this.jumpMultiplier = multiplier; // Establecer el multiplicador de salto
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
    update(platforms) {
      this.velocityY += this.gravity;
      this.y += this.velocityY;
      this.x += this.velocityX;
  
      for (const platform of platforms) {
        if (
          this.x < platform.x + platform.width &&
          this.x + this.width > platform.x &&
          this.y < platform.y + platform.height &&
          this.y + this.height > platform.y
        ) {
          const collisionDirection = this.detectCollisionDirection(platform);
          console.log("collisionDirection",collisionDirection)
          if (collisionDirection) {
            platform.applyPhysics(this, collisionDirection);
  
            if (collisionDirection === 'top' && this.velocityY > 0) {
              this.y = platform.y - this.height;
              this.velocityY = 0;
              this.isJumping = false;
              this.rechargeJump(); // Recargar saltos al aterrizar en una plataforma
            } else if (collisionDirection === 'bottom' && platform.hasBottomCollision) {
              this.y = platform.y + platform.height;
              this.velocityY = Math.max(this.velocityY, 0);
            } else if (collisionDirection === 'left' || collisionDirection === 'right') {
              this.x = collisionDirection === 'left' ? platform.x - this.width : platform.x + platform.width;
              if (this.velocityX !== 0 && this.velocityY !== 0) this.rechargeJump(); // Recargar saltos al chocar lateralmente
            }
          }
        }
      }
  
      this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));
    }
  }

  class Checkpoint extends GameObject {
    constructor(x, y) {
      super(x, y, 30, 30, 'purple');
    }
  }

  class Point extends GameObject {
    constructor(x, y) {
      super(x, y, 25, 25, 'yellow');
    }
  }

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = 800;
  canvas.height = 600;

  const mouse = new Mouse(50, 550);
  const checkpoint = new Checkpoint(50, 550);
  const point = new Point(700, 100);
  const powerups = [
    new PowerupJump(300, 220),
    new RechargeJump(400, 120),
    new RechargeJump(520, 190),
  ];
  class Platform extends GameObject {
    constructor(x, y, width, height, color, { friction = 1, bounce = 0, hasBottomCollision = true } = {}) {
      super(x, y, width, height, color, friction, hasBottomCollision, bounce);
    }
  }
  
  const platforms = [
    new Platform(0, 580, 800, 20, 'blue', { friction: 1 }),                   
    new Platform(200, 300, 100, 80, 'brown', {  bounce: 5 }), 
    new Platform(400, 400, 100, 100, 'green', {  bounce: 10,  }),   
    new Platform(400, 560, 100, 20, 'green', { bounce: 22 }),   
    new Platform(600, 290, 200, 40, 'cyan', { friction: -0.5 }),             
  ];
  
  let isMovingLeft = false;
  let isMovingRight = false;

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    checkpoint.draw(ctx);
    point.draw(ctx);
  
    for (const platform of platforms) {
      platform.draw(ctx);
    }
  
    for (const powerup of powerups) {
      powerup.draw(ctx);
    }
  
    if (isMovingLeft) mouse.move('left');
    if (isMovingRight) mouse.move('right');
  
    mouse.update(platforms, powerups);
    mouse.draw(ctx);
  
    for (const powerup of powerups) {
      if (
        mouse.x < powerup.x + powerup.width &&
        mouse.x + mouse.width > powerup.x &&
        mouse.y < powerup.y + powerup.height &&
        mouse.y + mouse.height > powerup.y
      ) {
        // Ejecutar el powerup dependiendo del tipo
        if (powerup instanceof PowerupJump) {
          powerup.apply(mouse); // Aumentar la fuerza de salto en 5
        }
        if (powerup instanceof RechargeJump) powerup.apply(mouse);
      }
    }
    
  
    requestAnimationFrame(gameLoop);
  }
  
  document.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowLeft':
        isMovingLeft = true;
        mouse.updateDirection('left');  // Establecer la última dirección
        break;
      case 'ArrowRight':
        isMovingRight = true;
        mouse.updateDirection('right'); // Establecer la última dirección
        break;
      case 'ArrowUp':
        if (mouse.isClimbing) {
          mouse.climb('up');
        } else {
          mouse.jump();
        }
        mouse.updateDirection('up'); // Establecer la última dirección
        break;
      case 'ArrowDown':
        mouse.accelerateFall();
        mouse.updateDirection('down'); // Establecer la última dirección
        break;
    }
  });
  
  document.addEventListener('keyup', (event) => {
    switch (event.key) {
      case 'ArrowLeft':
        isMovingLeft = false;
        if (!isMovingRight) mouse.stopMove();
        break;
      case 'ArrowRight':
        isMovingRight = false;
        if (!isMovingLeft) mouse.stopMove();
        break;
    }
  });
  

  gameLoop();
