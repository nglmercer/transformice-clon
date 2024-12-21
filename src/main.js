  import './style.css';

  class GameObject {
    constructor(x, y, width, height, color, hasBottomCollision = true) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.color = color;
      this.active = true;
      this.hasBottomCollision = hasBottomCollision;
      this.velocityX = 0;
      this.velocityY = 0;
      this.gravity = 0.3;
    }
  
    draw(ctx) {
      if (this.active) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }
  
    setPhysics(platforms) {
      this.velocityY += this.gravity;
      // Limitar la velocidad terminal
      const terminalVelocity = 6; // Ajusta según lo necesario
      this.velocityY = Math.min(this.velocityY, terminalVelocity);
      this.x += this.velocityX;
      this.y += this.velocityY;
  
      // Colisiones
      for (const platform of platforms) {
          if (
              this.x < platform.x + platform.width &&
              this.x + this.width > platform.x &&
              this.y < platform.y + platform.height &&
              this.y + this.height > platform.y
          ) {
              const collisionDirection = this.detectCollisionDirection(platform);
              if (collisionDirection) {
                  if (collisionDirection === 'top' && this.velocityY > 0) {
                      this.y = platform.y - this.height;
                      this.velocityY = 0;
                      mouse.rechargeJump();
                  } else if (collisionDirection === 'bottom' && platform.hasBottomCollision) {
                      this.y = platform.y + platform.height;
                      this.velocityY = Math.max(this.velocityY, 0);
                  } else if (collisionDirection === 'left' || collisionDirection === 'right') {
                      this.x =
                          collisionDirection === 'left' ? platform.x - this.width : platform.x + platform.width;
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
    
  }
  class StickySurface extends GameObject {
    constructor(x, y, width, height, color, friction = 3) {
      super(x, y, width, height, color);
      this.friction = friction; // Coeficiente de fricción
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
      this.speed = 2;
      this.jumpForce = 8;
      this.jumpMultiplier = 1;
      this.isJumping = false;
      this.isTouchingWall = false;
      this.maxJumps = 1;
      this.jumpCount = this.maxJumps;
      this.defaultSpeed = this.speed; // Para restaurar la velocidad base
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
      } else if (direction === 'right') {
        this.velocityX = this.speed;
      }
    }
    stopMove() {
      this.velocityX = 0;
    }
    accelerateFall() {
      this.velocityY += 1;
    }
    setPhysics(platforms) {
      // Sobrescribir físicas
      super.setPhysics(platforms);
    
      let onStickySurface = false;
    
      for (const platform of platforms) {
        if (
          this.x < platform.x + platform.width &&
          this.x + this.width > platform.x &&
          this.y < platform.y + platform.height &&
          this.y + this.height > platform.y
        ) {
          if (platform instanceof StickySurface) {
            onStickySurface = true;
            // Reducir velocidades en función de la fricción (dividir en lugar de multiplicar)
            this.velocityX /= platform.friction;
            this.velocityY /= platform.friction;
          }
        }
      }

      // Si no está en una superficie pegajosa, restaura la velocidad
      if (!onStickySurface) {
        this.speed = this.defaultSpeed;
      }
    
      // Salto personalizado
      if (this.jumpCount > 0 && this.isJumping) {
        this.velocityY -= this.jumpForce * this.jumpMultiplier;
        this.isJumping = false;
        this.jumpCount--;
      }
    
      if (this.isTouchingWall) {
        this.maxJumps = 0;
      }
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
    new PowerupJump(300, 240),
    new PowerupJump(300, 520),
    new PowerupJump(300, 400),
    new RechargeJump(400, 120),
    new RechargeJump(520, 190),
  ];
  class Platform extends GameObject {
    constructor(x, y, width, height, color,hasBottomCollision = true) {
      super(x, y, width, height, color, hasBottomCollision);
    }
  }
  
  const platforms = [
    new StickySurface(0, 10, 20, 700, 'blue',10),   
    new StickySurface(0, 580, 800, 20, 'blue',10),                   
    new Platform(200, 300, 100, 80, 'brown'), 
    new Platform(400, 400, 100, 100, 'green'),   
    new Platform(400, 560, 100, 20, 'green'),   
    new Platform(600, 290, 200, 40, 'cyan'),             
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
    for (const powerup of powerups) {
      if (powerup.active && powerup instanceof PowerupJump && mouse.intersects(powerup)) {
        powerup.apply(mouse);
      }
      if (powerup.active && powerup instanceof RechargeJump && mouse.intersects(powerup)) {
        powerup.apply(mouse);
      }
    }
    
    if (isMovingLeft) mouse.move('left');
    if (isMovingRight) mouse.move('right');
  
    mouse.setPhysics(platforms);
    mouse.draw(ctx);
  
    requestAnimationFrame(gameLoop);
  }
  
  gameLoop();
  
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
          console.log("jump")
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
