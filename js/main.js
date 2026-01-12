/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 *
 * PoseEngine, GameEngine, Stabilizer를 조합하여 애플리케이션을 구동
 */

// 전역 변수
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let gameCtx; // 게임 캔버스 컨텍스트
let labelContainer;

/**
 * 애플리케이션 초기화
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  try {
    // 1. PoseEngine 초기화
    poseEngine = new PoseEngine("./my_model/");
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 200,
      flip: true
    });

    // 2. Stabilizer 초기화
    stabilizer = new PredictionStabilizer({
      threshold: 0.7,
      smoothingFrames: 3
    });

    // 3. GameEngine 초기화 (선택적)
    gameEngine = new GameEngine();

    // 4. 캔버스 설정
    const canvas = document.getElementById("canvas");
    canvas.width = 200;
    canvas.height = 200;
    ctx = canvas.getContext("2d");

    // 4-1. 게임 캔버스 설정
    const gameCanvas = document.getElementById("gameCanvas");
    gameCtx = gameCanvas.getContext("2d");

    // 5. Label Container 설정
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = ""; // 초기화
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // 6. PoseEngine 콜백 설정
    poseEngine.setPredictionCallback(handlePrediction);
    poseEngine.setDrawCallback(drawPose);

    // 7. PoseEngine 시작
    poseEngine.start();

    stopBtn.disabled = false;
    document.getElementById("playBtn").disabled = false; // Play Game 버튼 활성화
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화에 실패했습니다. 콘솔을 확인하세요.");
    startBtn.disabled = false;
  }
}

/**
 * 게임 시작
 */
let currentLevel = 1;
let totalScore = 0;

function playGame() {
  if (!gameEngine) {
    alert("먼저 Start 버튼을 눌러 초기화하세요.");
    return;
  }

  // 오버레이 숨기기
  document.getElementById("gameOverlay").classList.add("hidden");

  gameEngine.setGameEndCallback((finalScore, finalLevel, levelCleared) => {
    totalScore += finalScore;

    const targetScore = currentLevel * 1000;

    // 오버레이 업데이트
    const overlay = document.getElementById("gameOverlay");
    const title = document.getElementById("overlayTitle");
    const scoreText = document.getElementById("overlayScore");
    const levelText = document.getElementById("overlayLevel");
    const nextBtn = document.getElementById("nextLevelBtn");
    const retryBtn = document.getElementById("retryBtn");

    if (levelCleared) {
      title.textContent = "🎉 레벨 " + currentLevel + " 클리어!";
      nextBtn.style.display = "inline-block";
      retryBtn.style.display = "none";
    } else {
      if (finalScore === 0) {
        title.textContent = "💥 점수 부족!";
      } else {
        title.textContent = "⏰ 시간 초과!";
      }
      nextBtn.style.display = "none";
      retryBtn.style.display = "inline-block";
    }

    scoreText.textContent = "이번 점수: " + finalScore + " (목표: " + targetScore + ") / 총 점수: " + totalScore;
    levelText.textContent = "현재 레벨: " + currentLevel;

    overlay.classList.remove("hidden");
    document.getElementById("playBtn").disabled = false;
  });

  // 레벨별 시간 제한: 60초 × 레벨 (레벨1=60초, 레벨2=120초...)
  const timeLimit = currentLevel * 60;
  gameEngine.start({ timeLimit: timeLimit, currentLevel: currentLevel, targetScore: currentLevel * 1000 });
  document.getElementById("playBtn").disabled = true;
}

/**
 * 다음 레벨
 */
function nextLevel() {
  currentLevel++;
  document.getElementById("gameOverlay").classList.add("hidden");
  playGame();
}

/**
 * 현재 레벨 다시하기
 */
function retryLevel() {
  // 현재 레벨 유지, 이번 판 점수만 리셋
  document.getElementById("gameOverlay").classList.add("hidden");
  playGame();
}

/**
 * 게임 완전 종료 (레벨 및 점수 리셋)
 */
function stopGame() {
  document.getElementById("gameOverlay").classList.add("hidden");
  currentLevel = 1;
  totalScore = 0;
  document.getElementById("playBtn").disabled = false;

  // 게임 캔버스 초기화
  if (gameCtx) {
    const canvas = document.getElementById("gameCanvas");
    gameCtx.clearRect(0, 0, canvas.width, canvas.height);
    gameCtx.fillStyle = '#ecf0f1';
    gameCtx.fillRect(0, 0, canvas.width, canvas.height);

    // 초기 메시지 표시
    gameCtx.fillStyle = '#2c3e50';
    gameCtx.font = 'bold 24px Arial';
    gameCtx.textAlign = 'center';
    gameCtx.fillText('🎮 Play Game을 눌러 시작!', canvas.width / 2, canvas.height / 2 - 20);
    gameCtx.font = '18px Arial';
    gameCtx.fillText('레벨 1 | 목표: 1000점 | 시간: 60초', canvas.width / 2, canvas.height / 2 + 20);
  }
}

/**
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (poseEngine) {
    poseEngine.stop();
  }

  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.stop();
  }

  if (stabilizer) {
    stabilizer.reset();
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리 콜백
 * @param {Array} predictions - TM 모델의 예측 결과
 * @param {Object} pose - PoseNet 포즈 데이터
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilizer로 예측 안정화
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Label Container 업데이트
  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  // 3. 최고 확률 예측 표시
  const maxPredictionDiv = document.getElementById("max-prediction");
  maxPredictionDiv.innerHTML = stabilized.className || "감지 중...";

  // 4. GameEngine에 포즈 전달 (게임 모드일 경우)
  if (gameEngine && gameEngine.isGameActive && stabilized.className) {
    gameEngine.onPoseDetected(stabilized.className);
  }
}

/**
 * 포즈 그리기 콜백
 * @param {Object} pose - PoseNet 포즈 데이터
 */
function drawPose(pose) {
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0);

    // 키포인트와 스켈레톤 그리기
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }

    // 게임 엔진 루프 (업데이트 및 렌더링) - 별도 게임 캔버스에 렌더링
    if (gameEngine && gameCtx) {
      gameEngine.update();
      gameEngine.render(gameCtx);
    }
  }
}

// 게임 모드 시작 함수 (선택적 - 향후 확장용)
function startGameMode(config) {
  if (!gameEngine) {
    console.warn("GameEngine이 초기화되지 않았습니다.");
    return;
  }

  gameEngine.setCommandChangeCallback((command) => {
    console.log("새로운 명령:", command);
    // UI 업데이트 로직 추가 가능
  });

  gameEngine.setScoreChangeCallback((score, level) => {
    console.log(`점수: ${score}, 레벨: ${level}`);
    // UI 업데이트 로직 추가 가능
  });

  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    console.log(`게임 종료! 최종 점수: ${finalScore}, 최종 레벨: ${finalLevel}`);
    alert(`게임 종료!\n최종 점수: ${finalScore}\n최종 레벨: ${finalLevel}`);
  });

  gameEngine.start(config);
}
