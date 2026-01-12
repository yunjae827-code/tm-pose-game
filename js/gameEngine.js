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
    this.spawnInterval = 1800; // ms

    // 피드백 메시지
    this.feedbackMessage = '';
    this.feedbackTimer = null;

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
    this.level = config.currentLevel || 1;
    this.targetScore = config.targetScore || 1000;
    this.timeLimit = config.timeLimit || 60;
    this.fallingObjects = [];
    this.basket.x = (this.canvasWidth - this.basket.width) / 2;
    this.levelCleared = false; // 레벨 클리어 플래그

    this.startTimer();
  }

  stop() {
    this.isGameActive = false;
    this.clearTimer();
    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level, this.levelCleared);
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

    const speed = 4 + (this.level * 0.5); // 기본 속도 증가
    for (let i = this.fallingObjects.length - 1; i >= 0; i--) {
      const obj = this.fallingObjects[i];
      obj.y += speed + (obj.type === 'orange' ? 1.5 : 0);

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
    let points = 0;
    let isBad = false;

    if (obj.type === 'apple') points = 100;
    else if (obj.type === 'orange') points = 200;
    else if (obj.type === 'grape') points = 300;
    else if (obj.type === 'bomb') { points = -100; isBad = true; }
    else if (obj.type === 'dynamite') { points = -300; isBad = true; }

    // 피드백 메시지 표시
    this.showFeedback(isBad ? 'Try Harder!' : 'Good!');

    this.addScore(points);
  }

  showFeedback(message) {
    this.feedbackMessage = message;
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      this.feedbackMessage = '';
    }, 800); // 0.8초 후 사라짐
  }

  addScore(points) {
    this.score += points;

    // 점수가 0 이하로 내려가면 게임 오버
    if (this.score <= 0) {
      this.score = 0;
      this.levelCleared = false;
      this.stop();
      return;
    }

    // 목표 점수 달성 시 즉시 레벨 클리어!
    if (this.score >= this.targetScore) {
      this.levelCleared = true;
      this.stop();
      return;
    }

    if (this.onScoreChange) this.onScoreChange(this.score, this.level);
  }

  spawnObject() {
    const types = ['apple', 'apple', 'orange', 'bomb', 'grape', 'dynamite'];
    if (this.level >= 3) types.push('bomb', 'dynamite');

    const type = types[Math.floor(Math.random() * types.length)];
    const objSize = 40;

    // 겹치지 않는 레인 찾기 (간격 늘림: y < 150)
    const availableLanes = [0, 1, 2].filter(laneIdx => {
      return !this.fallingObjects.some(obj => obj.lane === laneIdx && obj.y < 150);
    });

    if (availableLanes.length === 0) return;

    const laneIndex = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    const x = this.lanes[laneIndex];

    // 아이템별 이모지 설정
    let emoji = '🍎';
    if (type === 'orange') emoji = '🍊';
    if (type === 'grape') emoji = '🍇';
    if (type === 'bomb') emoji = '💣';
    if (type === 'dynamite') emoji = '🧨🧨🧨'; // 다이너마이트 뭉치

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

    // Draw basket (과일 바구니 디자인)
    const gradient = ctx.createLinearGradient(this.basket.x, this.basket.y, this.basket.x, this.basket.y + this.basket.height);
    gradient.addColorStop(0, '#d4a574');  // 밀짚 색상
    gradient.addColorStop(1, '#a0522d');  // 갈색
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(this.basket.x, this.basket.y, this.basket.width, this.basket.height, 8);
    ctx.fill();

    // 바구니 테두리
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 바구니 이모지
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🧁', this.basket.x + this.basket.width / 2, this.basket.y + 18);
    ctx.textAlign = 'left';

    // Draw falling objects (emojis)
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const obj of this.fallingObjects) {
      ctx.fillText(obj.emoji, obj.x + obj.width / 2, obj.y + obj.height / 2);
    }
    ctx.textBaseline = 'alphabetic';

    // Draw UI - 상단 UI 레이아웃 (겹치지 않게)
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('⏱️ ' + this.timeLimit + 's', 10, 25);

    ctx.textAlign = 'right';
    ctx.fillText('⭐ Lv.' + this.level, this.canvasWidth - 10, 25);

    // 현재 점수 / 목표 점수 표시 (중앙 하단)
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    const scoreColor = this.score >= this.targetScore ? '#27ae60' : '#2c3e50';
    ctx.fillStyle = scoreColor;
    ctx.fillText('🏆 ' + this.score + ' / ' + this.targetScore, this.canvasWidth / 2, this.canvasHeight - 40);

    // 피드백 메시지 표시 (화면 상단 중앙)
    if (this.feedbackMessage) {
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      if (this.feedbackMessage === 'Good!') {
        ctx.fillStyle = '#27ae60';
      } else {
        ctx.fillStyle = '#e74c3c';
      }
      ctx.fillText(this.feedbackMessage, this.canvasWidth / 2, 70);
    }
  }

  onPoseDetected(className) {
    if (!this.isGameActive) return;
    const speed = 20; // 바구니 이동 속도
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
