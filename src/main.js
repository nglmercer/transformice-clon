import './style.css';

class GameObject {
  constructor(x, y, width, height, color, friction = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.friction = friction;
    this.active = true;
  }

  draw(ctx) {
    if (this.active) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}
class PowerupJump extends GameObject {
  constructor(x, y) {
    super(x, y, 20, 20, 'red');
    this.boostForce = 15; // Fuerza del impulso
  }

  apply(mouse) {
    if (this.active) {
      mouse.velocityY = -this.boostForce;
      this.active = false;
      // Reactivar después de 5 segundos
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
    if (this.active) {
      mouse.isJumping = false;
      this.active = false;
      // Reactivar después de 5 segundos
      setTimeout(() => {
        this.active = true;
      }, 5000);
    }
  }
}
class NormalPlatform extends GameObject {
  constructor(x, y, width, height) {
    super(x, y, width, height, 'blue', 1);
  }
}

class StickyPlatform extends GameObject {
  constructor(x, y, width, height) {
    super(x, y, width, height, 'green', 0.2);
  }
}

class SlipperyPlatform extends GameObject {
  constructor(x, y, width, height) {
    super(x, y, width, height, 'lightblue', 2);
  }
}

class Mouse extends GameObject {
  constructor(x, y) {
    super(x, y, 20, 20, 'gray');
    this.speed = 5;
    this.jumpForce = 10;
    this.gravity = 0.4;
    this.velocityY = 0;
    this.velocityX = 0;
    this.isJumping = false;
    this.isClimbing = false;
    this.isTouchingWall = false;
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

  jump() {
    if (!this.isJumping || this.isTouchingWall) {
      this.velocityY = -this.jumpForce;
      this.isJumping = true;
      this.isTouchingWall = false;
    }
  }
  climb(direction) {
    if (this.isClimbing) {
      // Calcular velocidad de escalada según la fricción
      let climbSpeed;
      if (this.friction > 0) {
        climbSpeed = this.jumpForce / this.friction; // Escalar según la fricción positiva
      } else if (this.friction < 0) {
        climbSpeed = Math.max(this.jumpForce + this.friction, 0); // Reducir movilidad en fricción negativa
      } else {
        this.velocityY = 0; // Fricción cero: detener movimiento
        return;
      }
  
      if (direction === 'up') {
        this.velocityY = -climbSpeed; // Subir
      } else if (direction === 'down') {
        this.velocityY = climbSpeed; // Bajar
      } else {
        this.velocityY = 0; // Detener movimiento si no hay dirección
      }
    }
  }
  
  
  update(platforms, powerups) {
    this.velocityY += this.gravity;
    this.y += this.velocityY;
    this.x += this.velocityX;
  
    this.isClimbing = false;
    let wasTouchingWall = this.isTouchingWall;
    this.isTouchingWall = false;

  
    for (const platform of platforms) {
      if (this.x < platform.x + platform.width &&
          this.x + this.width > platform.x &&
          this.y < platform.y + platform.height &&
          this.y + this.height > platform.y) {
        
        if (this.velocityY > 0 && this.y + this.height - this.velocityY <= platform.y) {
          // Landing on top of a platform
          this.y = platform.y - this.height;
          this.velocityY = 0;
          this.isJumping = false;
  
          // Handle friction
          if (platform.friction === 0) {
            this.velocityX = 0; // Stop horizontal movement if friction is zero
          } else {
            this.velocityX /= platform.friction;
          }
        } else if (platform.color === 'brown') {
          // Handle wall collisions
          this.isClimbing = true;
          this.isTouchingWall = true;
          if (!wasTouchingWall) {
            this.isJumping = false; // Allow jump again upon touching the wall
          }
  
          // Stop vertical movement if friction is zero
          if (platform.friction <= 0) {
            this.velocityY = platform.friction;
          }
  
          // Adjust position based on wall collision
          if (this.x + this.width > platform.x && this.x < platform.x) {
            this.x = platform.x - this.width;
          } else if (this.x < platform.x + platform.width && this.x + this.width > platform.x + platform.width) {
            this.x = platform.x + platform.width;
          }
        }
      }
    }
    // Colisión con powerups
    for (const powerup of powerups) {
      if (powerup.active &&
          this.x < powerup.x + powerup.width &&
          this.x + this.width > powerup.x &&
          this.y < powerup.y + powerup.height &&
          this.y + this.height > powerup.y) {
        powerup.apply(this);
      }
    }
    
    // Prevent mouse from going off-screen
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
  new PowerupJump(300, 250),  // Impulso inmediato
  new RechargeJump(500, 20),  // Recarga del salto
  new RechargeJump(520,90)
];
const platforms = [
  new NormalPlatform(0, 580, 800, 20),
  new GameObject(200, 300, 100, 80, 'brown'),
  new GameObject(400, 400, 100, 100, 'brown', 0),
  new GameObject(700, 400, 100, 100, 'brown'),
  new StickyPlatform(600, 350, 200, 20),
  new StickyPlatform(600, 270, 200, 20),
  new StickyPlatform(600, 200, 200, 20),
  new SlipperyPlatform(100, 400, 200, 20),
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

  // Dibujar powerups
  for (const powerup of powerups) {
    powerup.draw(ctx);
  }

  if (isMovingLeft) mouse.move('left');
  if (isMovingRight) mouse.move('right');

  mouse.update(platforms, powerups);
  mouse.draw(ctx);

  if (mouse.x < point.x + point.width &&
      mouse.x + mouse.width > point.x &&
      mouse.y < point.y + point.height &&
      mouse.y + mouse.height > point.y) {
    point.x = Math.random() * (canvas.width - point.width);
    point.y = Math.random() * (canvas.height - point.height);
  }

  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      isMovingLeft = true;
      break;
    case 'ArrowRight':
      isMovingRight = true;
      break;
    case 'ArrowUp':
      if (mouse.isClimbing) {
        mouse.climb("up");
      } else {
        mouse.jump();
      }
      break;
    case 'ArrowDown':
      mouse.accelerateFall();
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

