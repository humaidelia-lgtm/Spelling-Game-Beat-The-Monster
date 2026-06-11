const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;
canvas.style.imageRendering = 'pixelated';

// --- LOAD ASSET (TANPA FOLDER ASSET) ---
const wizardImg = new Image(); wizardImg.src = 'wizard.png'; 
const monsterImages = {
    "A1": new Image(), "A2": new Image(), "B1": new Image(),
    "B2": new Image(), "C1": new Image(), "C2": new Image()
};
monsterImages["A1"].src = 'monster_a1.png';
monsterImages["A2"].src = 'monster_a2.png';
monsterImages["B1"].src = 'monster_b1.png';
monsterImages["B2"].src = 'monster_b2.png';
monsterImages["C1"].src = 'monster_c1.png';
monsterImages["C2"].src = 'monster_c2.png';

const bgMapImg = new Image(); bgMapImg.src = 'bg_map.png'; 
const bgDuelImg = new Image(); bgDuelImg.src = 'bg_duel.png'; 

const vocabulary = {
    "A1": ["CAT", "DOG", "BOOK", "WATER", "MILK"],
    "A2": ["FAMILY", "DOCTOR", "SCHOOL", "TRAIN", "COFFEE"],
    "B1": ["WEATHER", "JOURNEY", "BELIEVE", "LIBRARY", "COUNTRY"],
    "B2": ["LANGUAGE", "ENVIRONMENT", "BUSINESS", "EXPERIENCE", "SOCIETY"],
    "C1": ["CHALLENGE", "GOVERNMENT", "ACCOMPLISH", "PHENOMENON", "CONSEQUENCE"],
    "C2": ["IDIOSYNCRASY", "EPITOME", "CACOPHONY", "PERSPICACITY", "ANACHRONISTIC"]
};

const successQuotes = ["You call that an attack?", "Missed your chance", "Is that all?", "I'm not done yet!", "No... this can't be!"];
const failQuotes = ["Didn't see that coming?", "Is that your best?", "You are no match for me", "You fought well, but it's not enough", "Giving up already?"];
let successQuoteIndex = 0, failQuoteIndex = 0;

let currentScene = "MAP"; 
let totalScore = 0, levelScore = 0;        
let playerMaxHp = 5, playerHp = 5, monsterHp = 5; 
let activeMonster = null; 
let gameOver = false, gameWon = false, levelWon = false, isPaused = false; 

let currentWord = "", wordPools = {}, duelTimer = 0; 
const maxDuelTime = 8000; 
let lastTime = 0, fireballs = [];

let feedbackText = "", feedbackColor = "white", feedbackTimer = 0;
let bubbleText = "", bubbleColor = "black", bubbleBgColor = "white", bubbleTimer = 0;
let monsterJumpY = 0, jumpAngle = 0, isMonsterJumping = false, monsterJumpCooldown = 0;   
let nearMonster = null; 
const gameAudioPlayer = new Audio();

const btnUlangRect = { x: 60, y: 240, width: 120, height: 40 };
const btnKembaliRect = { x: 220, y: 240, width: 120, height: 40 };
const btnLanjutWonRect = { x: 60, y: 240, width: 120, height: 40 };
const btnUlangWonRect = { x: 220, y: 240, width: 120, height: 40 };

const monstersInMap = [
    { level: "A1", x: 80,  y: 100,  radius: 35, isDefeated: false, isLocked: false, starsEarned: 0, highScore: 0 },
    { level: "A2", x: 320, y: 100,  radius: 35, isDefeated: false, isLocked: true,  starsEarned: 0, highScore: 0 },
    { level: "B1", x: 130, y: 220,  radius: 35, isDefeated: false, isLocked: true,  starsEarned: 0, highScore: 0 },
    { level: "B2", x: 270, y: 310,  radius: 35, isDefeated: false, isLocked: true,  starsEarned: 0, highScore: 0 },
    { level: "C1", x: 90,  y: 310,  radius: 35, isDefeated: false, isLocked: true,  starsEarned: 0, highScore: 0 },
    { level: "C2", x: 310, y: 210,  radius: 35, isDefeated: false, isLocked: true,  starsEarned: 0, highScore: 0 }
];
const wizard = { x: 80, y: 100, radius: 25, speed: 3, dx: 0, dy: 0 };

function speakWord(level, word) {
    if (!word || isPaused) return; 
    try {
        gameAudioPlayer.pause();
        gameAudioPlayer.src = level.toLowerCase() + '_' + word.toLowerCase() + '.mp3'; 
        gameAudioPlayer.currentTime = 0; gameAudioPlayer.play().catch(() => {});
    } catch(e) { console.error(e); }
}

function updateHpBarUI() {
    if(document.getElementById('hpFillWizard')) document.getElementById('hpFillWizard').style.width = `${Math.max(0, (playerHp / playerMaxHp) * 100)}%`;
    if (activeMonster && document.getElementById('hpFillMonster')) document.getElementById('hpFillMonster').style.width = `${Math.max(0, (monsterHp / 5) * 100)}%`;
}

// =======================================================
// --- KONTROL VISUAL GERAKAN STIK ANALOG ---
// =======================================================
const analogContainer = document.getElementById('analogContainer');
const analogStick = document.getElementById('analogStick');
let isDragging = false;

function handleAnalog(clientX, clientY) {
    if (!analogContainer || gameOver || gameWon || levelWon || currentScene !== "MAP" || isPaused) return; 
    
    const rect = analogContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let vx = clientX - centerX;
    let vy = clientY - centerY;
    const distance = Math.sqrt(vx*vx + vy*vy);
    const maxRadius = 25; 

    if (distance > maxRadius) {
        vx = (vx / distance) * maxRadius;
        vy = (vy / distance) * maxRadius;
    }
    
    if (analogStick) {
        analogStick.style.left = (25 + vx) + 'px';
        analogStick.style.top = (25 + vy) + 'px';
    }
    
    wizard.dx = vx / maxRadius;
    wizard.dy = vy / maxRadius;
}

if (analogContainer) {
    analogContainer.addEventListener('touchstart', (e) => { isDragging = true; handleAnalog(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener('touchmove', (e) => { if (isDragging) handleAnalog(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener('touchend', () => { isDragging = false; if (analogStick) { analogStick.style.left = '25px'; analogStick.style.top = '25px'; } wizard.dx = 0; wizard.dy = 0; });
    
    analogContainer.addEventListener('mousedown', (e) => { isDragging = true; handleAnalog(e.clientX, e.clientY); });
    window.addEventListener('mousemove', (e) => { if (isDragging) handleAnalog(e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => { isDragging = false; if (analogStick) { analogStick.style.left = '25px'; analogStick.style.top = '25px'; } wizard.dx = 0; wizard.dy = 0; });
}

function startDuel(monster) {
    currentScene = "DUEL"; activeMonster = monster; monsterHp = 5; nearMonster = null;
    isPaused = false; gameOver = false; levelWon = false; levelScore = 0;
    successQuoteIndex = 0; failQuoteIndex = 0;

    wordPools[monster.level] = [...vocabulary[monster.level]];
    for (let i = wordPools[monster.level].length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wordPools[monster.level][i], wordPools[monster.level][j]] = [wordPools[monster.level][j], wordPools[monster.level][i]];
    }

    document.getElementById('mapControls').style.setProperty('display', 'none', 'important');
    document.getElementById('duelControls').style.setProperty('display', 'flex', 'important');
    document.getElementById('hpBarContainer').style.display = 'flex'; 
    document.getElementById('timeDisplay').style.visibility = 'visible';
    document.getElementById('btnPause').style.display = 'block';
    document.getElementById('btnPause').innerText = 'PAUSE';
    document.getElementById('btnPause').style.background = '#475569';
    document.getElementById('statusDisplay').innerText = `LEVEL: ${monster.level} | Skor: ${levelScore}`;
    
    const inputField = document.getElementById('spellInput');
    if (inputField) { inputField.style.display = 'block'; inputField.disabled = false; inputField.value = ""; }
    
    fireballs = []; feedbackText = ""; bubbleText = ""; bubbleTimer = 0; monsterJumpY = 0; isMonsterJumping = false;
    updateHpBarUI(); nextDuelWord(); 
}

function exitDuel(monsterDefeated = false) {
    currentScene = "MAP"; isPaused = false; gameOver = false; levelWon = false;
    
    document.getElementById('mapControls').style.setProperty('display', 'flex', 'important');
    document.getElementById('btnAction').style.display = 'none'; 
    document.getElementById('duelControls').style.setProperty('display', 'none', 'important');
    document.getElementById('hpBarContainer').style.display = 'none';
    document.getElementById('timeDisplay').style.visibility = 'hidden';
    document.getElementById('btnPause').style.display = 'none'; 
    document.getElementById('statusDisplay').innerText = "Map : Beat Them!";
    
    if (monsterDefeated) {
        activeMonster.isDefeated = true; 
        let stars = (levelScore === 100) ? 3 : ((levelScore >= 70) ? 2 : 1);
        activeMonster.starsEarned = Math.max(activeMonster.starsEarned, stars);
        activeMonster.highScore = Math.max(activeMonster.highScore, levelScore);
        totalScore = monstersInMap.reduce((sum, m) => sum + m.highScore, 0);

        const currentIndex = monstersInMap.findIndex(m => m.level === activeMonster.level);
        if (currentIndex !== -1 && currentIndex + 1 < monstersInMap.length) {
            monstersInMap[currentIndex + 1].isLocked = false; 
            wizard.x = monstersInMap[currentIndex + 1].x; wizard.y = monstersInMap[currentIndex + 1].y;
        }
        if (monstersInMap.every(m => m.isDefeated)) gameWon = true;
    }
    document.getElementById('scoreDisplay').innerText = `Skor Total: ${totalScore}`;
    wizard.dx = 0; wizard.dy = 0; activeMonster = null; updateHpBarUI();
}

function nextDuelWord() {
    if (gameOver || gameWon || levelWon) return;
    const level = activeMonster.level;
    if (!wordPools[level] || wordPools[level].length === 0) wordPools[level] = [...vocabulary[level]];
    currentWord = wordPools[level].pop();
    if (document.getElementById('spellInput')) document.getElementById('spellInput').value = "";
    duelTimer = maxDuelTime; document.getElementById('timeDisplay').innerText = `8s`;
    speakWord(level, currentWord); updateHpBarUI();
}

function spawnFireballAttack(reasonText, attacker = "MONSTER") {
    if (fireballs.length > 0) return; 
    if (attacker === "MONSTER") fireballs.push({ startX: 290, startY: 135, x: 290, y: 135, targetX: 105, targetY: 130, radius: 8, speed: 6, type: "MONSTER", messageAfterHit: reasonText });
    else fireballs.push({ startX: 105, startY: 130, x: 105, y: 130, targetX: 290, targetY: 135, radius: 8, speed: 6, type: "PLAYER", messageAfterHit: reasonText });
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX, clickY = (e.clientY - rect.top) * scaleY;
    if (gameOver) {
        if (clickX >= btnUlangRect.x && clickX <= btnUlangRect.x + btnUlangRect.width && clickY >= btnUlangRect.y && clickY <= btnUlangRect.y + btnUlangRect.height) { playerHp = playerMaxHp; startDuel(activeMonster); }
        if (clickX >= btnKembaliRect.x && clickX <= btnKembaliRect.x + btnKembaliRect.width && clickY >= btnKembaliRect.y && clickY <= btnKembaliRect.y + btnKembaliRect.height) { playerHp = playerMaxHp; exitDuel(false); }
        return;
    }
    if (levelWon) {
        if (clickX >= btnLanjutWonRect.x && clickX <= btnLanjutWonRect.x + btnLanjutWonRect.width && clickY >= btnLanjutWonRect.y && clickY <= btnLanjutWonRect.y + btnLanjutWonRect.height) exitDuel(true); 
        if (clickX >= btnUlangWonRect.x && clickX <= btnUlangWonRect.x + btnUlangWonRect.width && clickY >= btnUlangWonRect.y && clickY <= btnUlangWonRect.y + btnUlangWonRect.height) startDuel(activeMonster); 
        return;
    }
});

document.getElementById('btnPause').addEventListener('click', () => {
    if (currentScene !== "DUEL" || gameOver || gameWon || levelWon) return;
    isPaused = !isPaused;
    if (isPaused) { document.getElementById('btnPause').innerText = 'RESUME'; document.getElementById('btnPause').style.background = '#10b981'; document.getElementById('spellInput').disabled = true; }
    else { document.getElementById('btnPause').innerText = 'PAUSE'; document.getElementById('btnPause').style.background = '#475569'; document.getElementById('spellInput').disabled = false; document.getElementById('spellInput').focus(); }
});

document.getElementById('btnAction').addEventListener('click', () => { if (nearMonster) startDuel(nearMonster); });
document.getElementById('btnSubmit').addEventListener('click', () => { if (currentScene === "DUEL" && !isPaused && !levelWon) checkSpelling(); });
if (document.getElementById('spellInput')) document.getElementById('spellInput').addEventListener('keypress', (e) => { if (e.key === 'Enter' && currentScene === "DUEL" && !isPaused && !levelWon) checkSpelling(); });
document.getElementById('btnVoice').addEventListener('click', () => { if (currentScene === "DUEL" && !isPaused && !levelWon) speakWord(activeMonster.level, currentWord); });

function checkSpelling() {
    if (currentScene !== "DUEL" || gameOver || gameWon || levelWon || fireballs.length > 0 || isPaused) return;
    const answer = document.getElementById('spellInput').value.trim().toUpperCase();
    if (answer === currentWord) {
        levelScore += 20; monsterHp--; document.getElementById('statusDisplay').innerText = `LEVEL: ${activeMonster.level} | Skor: ${levelScore}`; updateHpBarUI(); spawnFireballAttack("Auuw!", "PLAYER"); showFeedback(`It's... ${currentWord}!`, "#10b981");
        triggerMonsterBubble(successQuotes[successQuoteIndex], "#1e293b", "#fef08a"); successQuoteIndex = (successQuoteIndex + 1) % successQuotes.length; 
        if (monsterHp <= 0) { setTimeout(() => { levelWon = true; document.getElementById('duelControls').style.setProperty('display', 'none', 'important'); document.getElementById('btnPause').style.display = 'none'; document.getElementById('hpBarContainer').style.display = 'none'; }, 3000); } 
        else { setTimeout(() => { nextDuelWord(); }, 3000); }
    } else {
        levelScore -= 10; if (levelScore < 0) levelScore = 0; document.getElementById('statusDisplay').innerText = `LEVEL: ${activeMonster.level} | Skor: ${levelScore}`; spawnFireballAttack("BOM! ⚡", "MONSTER"); showFeedback(`It's... ${currentWord}!`, "#ef4444");
        triggerMonsterBubble(failQuotes[failQuoteIndex], "#ffffff", "#ef4444"); failQuoteIndex = (failQuoteIndex + 1) % failQuotes.length; 
        if (playerHp > 1) { setTimeout(() => { nextDuelWord(); }, 3000); }
    }
}

function showFeedback(text, color) { feedbackText = text; feedbackColor = color; feedbackTimer = 3000; }
function triggerMonsterBubble(text, textColor, bgColor) { bubbleText = text; bubbleColor = textColor; bubbleBgColor = bgColor; bubbleTimer = 3000; jumpAngle = 0; isMonsterJumping = true; monsterJumpCooldown = 0; }

function drawBubble(ctx, text, x, y, textColor, bgColor) {
    ctx.font = "bold 11px sans-serif"; let textWidth = ctx.measureText(text).width;
    let boxW = textWidth + 20, boxH = 22, boxX = x - (boxW / 2), boxY = y - boxH - 12; 
    ctx.fillStyle = bgColor; ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 5); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, boxY + boxH); ctx.lineTo(x, boxY + boxH + 6); ctx.lineTo(x + 5, boxY + boxH); ctx.fillStyle = bgColor; ctx.fill(); ctx.stroke();
    ctx.fillStyle = textColor; ctx.textAlign = "center"; ctx.fillText(text, x, boxY + 15); ctx.textAlign = "start";
}

function updateAndRender(timestamp) {
    if (!lastTime) lastTime = timestamp; const dt = timestamp - lastTime; lastTime = timestamp;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameOver) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("GAME OVER", canvas.width / 2, 160);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(btnUlangRect.x, btnUlangRect.y, btnUlangRect.width, btnUlangRect.height);
        ctx.fillStyle = '#0f172a'; ctx.font = 'bold 14px sans-serif'; ctx.fillText("ULANG", btnUlangRect.x + btnUlangRect.width / 2, btnUlangRect.y + 25);
        ctx.fillStyle = '#475569'; ctx.fillRect(btnKembaliRect.x, btnKembaliRect.y, btnKembaliRect.width, btnKembaliRect.height);
        ctx.fillStyle = '#ffffff'; ctx.fillText("KEMBALI", btnKembaliRect.x + btnKembaliRect.width / 2, btnKembaliRect.y + 25);
        ctx.textAlign = 'start'; requestAnimationFrame(updateAndRender); return; 
    }

    if (levelWon) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#4ade80'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("LEVEL SELESAI!", canvas.width / 2, 110);
        ctx.fillStyle = '#ffffff'; ctx.font = '16px sans-serif'; ctx.fillText(`Skor Level: ${levelScore}`, canvas.width / 2, 150);
        let stars = (levelScore === 100) ? 3 : ((levelScore >= 70) ? 2 : 1);
        ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 22px sans-serif'; ctx.fillText("⭐".repeat(stars), canvas.width / 2, 195);
        ctx.fillStyle = '#10b981'; ctx.fillRect(btnLanjutWonRect.x, btnLanjutWonRect.y, btnLanjutWonRect.width, btnLanjutWonRect.height);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText("LANJUTKAN", btnLanjutWonRect.x + btnLanjutWonRect.width / 2, btnLanjutWonRect.y + 25);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(btnUlangWonRect.x, btnUlangWonRect.y, btnUlangWonRect.width, btnUlangWonRect.height);
        ctx.fillStyle = '#ffffff'; ctx.fillText("ULANG", btnUlangWonRect.x + btnUlangWonRect.width / 2, btnUlangWonRect.y + 25);
        ctx.textAlign = 'start'; requestAnimationFrame(updateAndRender); return;
    }

    if (gameWon) {
        ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#10b981'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("KAMU MENANG SEMUA LEVEL!", canvas.width / 2, 180);
        ctx.fillStyle = '#ffffff'; ctx.font = '16px sans-serif'; ctx.fillText(`Total Skor Akhir: ${totalScore}`, canvas.width / 2, 220);
        ctx.textAlign = 'start'; return;
    }

    if (feedbackTimer > 0 && !isPaused) feedbackTimer -= dt;
    if (bubbleTimer > 0 && !isPaused) {
        bubbleTimer -= dt;
        if (isMonsterJumping) { jumpAngle += 0.25; monsterJumpY = -Math.abs(Math.sin(jumpAngle) * 20); if (jumpAngle >= Math.PI) { isMonsterJumping = false; monsterJumpY = 0; monsterJumpCooldown = 500; } }
        else { if (monsterJumpCooldown > 0) monsterJumpCooldown -= dt; else { jumpAngle = 0; isMonsterJumping = true; } }
        if (bubbleTimer <= 0) { bubbleText = ""; monsterJumpY = 0; isMonsterJumping = false; }
    }

    if (currentScene === "MAP") {
        wizard.x += wizard.dx * wizard.speed; wizard.y += wizard.dy * wizard.speed;
        wizard.x = Math.max(wizard.radius, Math.min(canvas.width - wizard.radius, wizard.x));
        wizard.y = Math.max(wizard.radius, Math.min(canvas.height - wizard.radius, wizard.y));

        if (bgMapImg.complete && bgMapImg.naturalWidth !== 0) ctx.drawImage(bgMapImg, 0, 0, canvas.width, canvas.height);
        else { ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, canvas.width, canvas.height); }

        let isCloseToAnyMonster = false;
        monstersInMap.forEach(m => {
            ctx.globalAlpha = m.isLocked ? 0.2 : 1.0;  
            ctx.drawImage(monsterImages[m.level], m.x - m.radius, m.y - m.radius, m.radius * 2, m.radius * 2);
            ctx.fillStyle = 'white'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
            let statusLabel = m.isLocked ? "🔒" : (m.isDefeated ? "✅" : "");
            let starString = (m.isDefeated && m.starsEarned > 0) ? " " + "⭐".repeat(m.starsEarned) : "";
            ctx.fillText(`${m.level} ${statusLabel}${starString}`, m.x, m.y + m.radius + 14);
            ctx.globalAlpha = 1.0; ctx.textAlign = 'start'; 

            if (!m.isLocked) {
                const dist = Math.sqrt((wizard.x - m.x)**2 + (wizard.y - m.y)**2);
                if (dist < wizard.radius + m.radius + 15) { isCloseToAnyMonster = true; nearMonster = m; }
            }
        });

        document.getElementById('btnAction').style.display = isCloseToAnyMonster ? 'block' : 'none';
        if(!isCloseToAnyMonster) nearMonster = null;
        ctx.drawImage(wizardImg, wizard.x - wizard.radius, wizard.y - wizard.radius, wizard.radius * 2, wizard.radius * 2);

    } else if (currentScene === "DUEL") {
        if (fireballs.length === 0 && bubbleTimer <= 0 && !isPaused) {
            duelTimer -= dt; let sisaDetik = Math.ceil(Math.max(0, duelTimer / 1000));
            document.getElementById('timeDisplay').innerText = `${sisaDetik}s`;
            if (duelTimer <= 0) {
                duelTimer = maxDuelTime; levelScore -= 10; if (levelScore < 0) levelScore = 0;
                document.getElementById('statusDisplay').innerText = `LEVEL: ${activeMonster.level} | Skor: ${levelScore}`;
                spawnFireballAttack("BOM! ⚡", "MONSTER"); showFeedback(`It's... ${currentWord}!`, "#ef4444");
                triggerMonsterBubble(failQuotes[failQuoteIndex], "#ffffff", "#ef4444"); failQuoteIndex = (failQuoteIndex + 1) % failQuotes.length;
                if (playerHp > 1) { setTimeout(() => { nextDuelWord(); }, 3000); }
            }
        }

        if (bgDuelImg.complete && bgDuelImg.naturalWidth !== 0) { ctx.drawImage(bgDuelImg, 0, 0, canvas.width, 210); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 210, canvas.width, 190); }
        else { ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, 0, canvas.width, 90); ctx.fillStyle = '#4ade80'; ctx.fillRect(0, 90, canvas.width, 120); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 210, canvas.width, 190); }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; ctx.beginPath(); ctx.ellipse(105, 195, 45, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(wizardImg, 40, 65, 130, 130); 
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; ctx.beginPath(); ctx.ellipse(290, 195, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(monsterImages[activeMonster.level], 240, 95 + monsterJumpY, 100, 100); 

        if (feedbackTimer > 0) { ctx.fillStyle = feedbackColor; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(feedbackText, canvas.width / 2, 310); ctx.textAlign = 'start'; }
        if (bubbleText !== "") drawBubble(ctx, bubbleText, 290, 95 + monsterJumpY, bubbleColor, bubbleBgColor);

        for (let i = fireballs.length - 1; i >= 0; i--) {
            let f = fireballs[i];
            if (f.type === "PLAYER") { f.targetX = 290; f.targetY = 135; } else { f.targetX = 105; f.targetY = 130; }
            if (!isPaused) { f.x += (f.targetX - f.startX) * (f.speed / 100); f.y += (f.targetY - f.startY) * (f.speed / 100); }
            ctx.fillStyle = (f.type === "PLAYER") ? '#06b6d4' : '#ef4444'; ctx.beginPath(); ctx.arc(f.x, f.y, 8, 0, Math.PI * 2); ctx.fill();

            let distanceToTarget = Math.sqrt((f.x - f.targetX)**2 + (f.y - f.targetY)**2);
            if (distanceToTarget < 10 && !isPaused) {
                if (f.type === "MONSTER") { playerHp--; updateHpBarUI(); if (playerHp <= 0) { gameOver = true; document.getElementById('duelControls').style.setProperty('display', 'none', 'important'); document.getElementById('btnPause').style.display = 'none'; } }
                fireballs.splice(i, 1);
            }
        }

        if (isPaused) { ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("|| GAME PAUSED", canvas.width / 2, 100); ctx.textAlign = 'start'; }
    }
    requestAnimationFrame(updateAndRender);
