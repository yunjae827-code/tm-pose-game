/**
 * gameEngine.js
 * Fruit Catcher Game Logic
 */

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.isGameActive = false;
    this.gameTimer = null;

    // Callbacks
    this.onScoreChange = null;
    this.onGameEnd = null;

    // Game Objects (400x400 canvas)
    this.canvasWidth = 400;
    this.canvasHeight = 400;
    this.basket = { x: 160, y: 360, width: 80, height: 25, color: '#3498db' };
    this.fallingObjects = [];
    this.lastSpawnTime = 0;
    this.spawnInterval = 1000; // ms

    // 3개 구역 정의 (LEFT, CENTER, RIGHT)
    this.laneWidth = this.canvasWidth / 3;
    this.lanes = [
      this.laneWidth * 0.5 - 20,  // LEFT 중앙
      this.laneWidth * 1.5 - 20,  // CENTER 중앙
      this.laneWidth * 2.5 - 20   // RIGHT 중앙
    ];
  }

  start(config = {}) {
    this.isGameActive = true;
    this.score = 0;
    this.level = 1;
    this.timeLimit = config.timeLimit || 60;
    this.fallingObjects = [];
    this.basket.x = (this.canvasWidth - this.basket.width) / 2;

    this.startTimer();
  }

  stop() {
    this.isGameActive = false;
    this.clearTimer();
    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  startTimer() {
    this.clearTimer();
    this.gameTimer = setInterval(() => {
      this.timeLimit--;
      if (this.timeLimit <= 0) {
        this.stop();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  update() {
    if (!this.isGameActive) return;

    const now = Date.now();
    if (now - this.lastSpawnTime > this.spawnInterval) {
      this.spawnObject();
      this.lastSpawnTime = now;
    }

    const speed = 2 + (this.level * 0.5);
    for (let i = this.fallingObjects.length - 1; i >= 0; i--) {
      const obj = this.fallingObjects[i];
      obj.y += speed + (obj.type === 'orange' ? 1 : 0);

      if (this.checkCollision(this.basket, obj)) {
        this.handleCollection(obj);
        this.fallingObjects.splice(i, 1);
        continue;
      }

      if (obj.y > this.canvasHeight) {
        this.fallingObjects.splice(i, 1);
      }
    }
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  handleCollection(obj) {
    if (obj.type === 'bomb') {
      this.stop();
      alert("GAME OVER! 폭탄을 받았습니다.");
      return;
    }

    let points = 100;
    if (obj.type === 'orange') points = 200;
    if (obj.type === 'grape') points = 300;

    this.addScore(points);
  }

  addScore(points) {
    this.score += points;
    if (this.score >= this.level * 1000) {
      this.level++;
      this.spawnInterval = Math.max(300, 1000 - (this.level * 100));
    }
    if (this.onScoreChange) this.onScoreChange(this.score, this.level);
  }

  spawnObject() {
    const types = ['apple', 'apple', 'orange', 'bomb', 'grape'];
    if (this.level >= 3) types.push('bomb', 'bomb');

    const type = types[Math.floor(Math.random() * types.length)];
    const objSize = 40;

    // 3개 구역 중 랜덤 선택
    const laneIndex = Math.floor(Math.random() * 3);
    const x = this.lanes[laneIndex];

    // 아이템별 이모지 설정
    let emoji = '🍎';
    if (type === 'orange') emoji = '🍊';
    if (type === 'grape') emoji = '🍇';
    if (type === 'bomb') emoji = '💣';

    this.fallingObjects.push({
      x: x, y: -objSize, width: objSize, height: objSize, type: type, emoji: emoji, lane: laneIndex
    });
  }

  render(ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw background
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw 3 lane dividers
    ctx.strokeStyle = '#bdc3c7';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.laneWidth, 50);
    ctx.lineTo(this.laneWidth, this.canvasHeight - 50);
    ctx.moveTo(this.laneWidth * 2, 50);
    ctx.lineTo(this.laneWidth * 2, this.canvasHeight - 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw lane labels
    ctx.fillStyle = '#95a5a6';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LEFT', this.laneWidth * 0.5, this.canvasHeight - 10);
    ctx.fillText('CENTER', this.laneWidth * 1.5, this.canvasHeight - 10);
    ctx.fillText('RIGHT', this.laneWidth * 2.5, this.canvasHeight - 10);
    ctx.textAlign = 'left';

    // Draw basket (with gradient)
    const gradient = ctx.createLinearGradient(this.basket.x, this.basket.y, this.basket.x, this.basket.y + this.basket.height);
    gradient.addColorStop(0, '#3498db');
    gradient.addColorStop(1, '#2980b9');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(this.basket.x, this.basket.y, this.basket.width, this.basket.height, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🧺', this.basket.x + this.basket.width / 2, this.basket.y + 18);
    ctx.textAlign = 'left';

    // Draw falling objects (emojis)
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const obj of this.fallingObjects) {
      ctx.fillText(obj.emoji, obj.x + obj.width / 2, obj.y + obj.height / 2);
    }
    ctx.textBaseline = 'alphabetic';

    // Draw UI
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('⏱️ ' + this.timeLimit + 's', 20, 30);
    ctx.fillText('🏆 ' + this.score, 160, 30);
    ctx.fillText('⭐ Lv.' + this.level, 300, 30);
  }

  onPoseDetected(className) {
    if (!this.isGameActive) return;
    const speed = 8; // Faster for larger canvas
    if (className === 'Left') this.basket.x -= speed;
    else if (className === 'Right') this.basket.x += speed;

    if (this.basket.x < 0) this.basket.x = 0;
    if (this.basket.x > this.canvasWidth - this.basket.width) this.basket.x = this.canvasWidth - this.basket.width;
  }

  setScoreChangeCallback(callback) { this.onScoreChange = callback; }
  setGameEndCallback(callback) { this.onGameEnd = callback; }
  setCommandChangeCallback(callback) { }
}

window.GameEngine = GameEngine;
