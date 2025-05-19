
let gameOver = false;
let iteration = 0;
let tanks = [];
let arena = {};
let winCounts = [0, 0];
let scores = [0, 0];
let scoreData = {};
let winsData = {};
let scorePercentage = {};
let scorePercentageDif = {};
let winPercentage = {};
let gameCount = 0;
let winBalance = {};
let missilesFired = [0, 0];
let missilesHit = [0, 0];
let tankCollisions = [0, 0];
let missileCollisions = [0, 0];
let wallCollisions = [0, 0];
let accuracy = {};
let accuracyPercentageDif = {};
let energy = [0, 0];
let avgEnergy = {};
let avgEnergyDif = {};
let totalGameDuration = 0;
let gameTimeInSeconds = 0;
let lastTime = 0;

const background = document.getElementById("bgImage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = ARENA_WIDTH;
canvas.height = ARENA_HEIGHT;
canvas.focus();

gameLoop();

function newGame() {
    iteration = 0;
    tanks = [];
    arena = {};
    gameOver = false;
    gameCount++;

    const distance = (Math.min(canvas.width, canvas.height) / 2) * 0.7;
    let angle = Math.random() * 360;
    
    // Define tanks
    let x = distance * Math.cos(angle * Math.PI / 180);
    let y = distance * Math.sin(angle * Math.PI / 180);
    tanks[0] = new Tank(tankAMain, 0, x, y, getRandomColorHex());
    x = distance * Math.cos(180 + angle * Math.PI / 180);
    y = distance * Math.sin(180 + angle * Math.PI / 180);
    tanks[1] = new Tank(tankBMain, 1, x, y, getRandomColorHex());

    // Include a manually controlled tank if the manual URL param is set
    if (includeManualTank) {
        tanks[1] = new Tank(manualTank, 1, tanks[1].x, tanks[1].y, getRandomColorHex());
    }

    // Include an invincible manually controlled tank if the debug URL param is set
    if (includeDebugTank) {
        tanks[2] = new Tank(debugTank, 2, canvas.width / 2 - tanks[0].size * 2, canvas.height / 2 - tanks[0].size * 2, getRandomColorHex());
    }

    // Randomize tank order to eliminate positional advantages
    tanks = tanks.sort(() => Math.random() - 0.5);

    // Define the arena
    arena = {
        time: 0,
        width: canvas.width,
        height: canvas.height,
        tanks: tanks,
        missiles: [],
    }
}


document.addEventListener("DOMContentLoaded", () => {
    gamepad.initialize();
});

function gameLoop() {
    lastTime = 0;
    newGame(); // Initialize the first game
    animate(0); // Start the animation loop
}

function animate(currentTime) {
    setTimeout(() => {
        // I would prefer to use requestAnimationFrame, but for some reason it was causing issues
        animate(Date.now());
    }, 1000 / fps);
    
    
    let gameSpeed;
    const speedValue = document.getElementById("selSpeed").value;
    if (speedValue < 0) {
        fps = 60 / (1 + Math.abs(speedValue));
        gameSpeed = 1;
    }
    else {
        fps = 60;
        gameSpeed = speedValue;
    }

    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    const frameDuration = 1 / fps;

    if (deltaTime < frameDuration) {
        return;
    }

    if (paused) {
        ctx.fillStyle = "#000000";
        ctx.strokeStyle = "#ffffff";
        ctx.fillRect(0, 0, arena.width, arena.height);
        ctx.strokeRect(0, 0, arena.width, arena.height);
        ctx.save();
        ctx.translate(0, 0);
        ctx.font = "32px 'Press Start 2P'";
        ctx.fillStyle = `#ffffff`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Paused", arena.width / 2, arena.height / 2 - 16);
        ctx.font = "14px 'Press Start 2P'";
        ctx.fillText(`Press "0" to resume`, arena.width / 2, arena.height / 2 + 5);
        ctx.restore();
        return;
    }

    if ((stepMode && !stepNextFrame)) return;
    stepNextFrame = !stepMode;
    
    if (!showAnimation.checked && !paused) gameSpeed = MAX_ITERATIONS;

    for (let i = 0; i < gameSpeed; i++) {
        // Update gamepad states
        gamepad.update();


        // Clear the canvas
        if (showAnimation.checked) ctx.drawImage(background, 0, 0, arena.width, arena.height);

        // Show stats
        if (showAnimation.checked) {
            const players = tanks.sort((a, b) => { return a.index - b.index });
            const p1 = players[0];
            const p2 = players[1];
            const energyBarWidth = 163;
            try {

                // Show timer
                ctx.save();
                ctx.translate(0, 0);
                ctx.font = "12px 'Press Start 2P'";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1;
                ctx.fillStyle = `#ffffff`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.strokeText(iteration, arena.width / 2, 10);
                ctx.fillText(iteration, arena.width / 2, 10);
                ctx.restore();
                
                // Show tank A energy
                let energyWidth = Math.min(1000, p1.energy) / MAX_TANK_ENERGY;
                ctx.fillStyle = p1.color;
                ctx.fillRect(6, 3, energyBarWidth * energyWidth, 10);
                ctx.strokeStyle = "#ffffff";
                ctx.strokeRect(6, 3, energyBarWidth, 10);

                // Show tank A name
                ctx.font = "8px 'Press Start 2P'";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 0.7;
                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.strokeText(p1.name, 8, 8);
                ctx.fillText(p1.name, 8, 8);

                // Show tank A score
                ctx.font = "7px 'Press Start 2P'";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1;
                ctx.fillStyle = "#ffffff";
                ctx.strokeText(`${~~scores[p1.index] + ~~p1.matchScore}`, 6, 19);
                ctx.fillText(`${~~scores[p1.index] + ~~p1.matchScore}`, 6, 19);

                // Show tank A wins
                ctx.textAlign = "right";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1;
                ctx.strokeText(`${winCounts[p1.index]}`, energyBarWidth + 6, 19);
                ctx.fillText(`${winCounts[p1.index]}`, energyBarWidth + 6, 19);
                ctx.restore();
        

                // Show tank B energy
                energyWidth = Math.min(1000, p2.energy) / MAX_TANK_ENERGY;
                ctx.strokeStyle = "#ffffff";
                ctx.strokeRect(arena.width - 6 - energyBarWidth, 3, energyBarWidth, 10);
                ctx.fillStyle = p2.color;
                ctx.fillRect(arena.width - 6 - energyBarWidth * energyWidth, 3, energyBarWidth * energyWidth, 10);
                

                // Show tank B name
                ctx.save();
                ctx.font = "8px 'Press Start 2P'";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 0.7;
                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "right";
                ctx.textBaseline = "middle";
                ctx.strokeText(p2.name, arena.width - 8, 8);
                ctx.fillText(p2.name, arena.width - 8, 8);

                // Show tank B score
                ctx.font = "7px 'Press Start 2P'";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1;
                ctx.fillStyle = "#ffffff";
                ctx.strokeText(`${~~scores[p2.index] + ~~p2.matchScore}`, arena.width - 6, 19);
                ctx.fillText(`${~~scores[p2.index] + ~~p2.matchScore}`, arena.width - 6, 19);

                // Show tank B wins
                ctx.textAlign = "left";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1;
                ctx.strokeText(`${winCounts[p2.index]}`, arena.width - energyBarWidth - 6, 19);
                ctx.fillText(`${winCounts[p2.index]}`, arena.width - energyBarWidth - 6, 19);
                ctx.restore();

            } catch (e) {console.error(e)}
        }

        arena.gameCount = gameCount;
        arena.tanksRemaining = arena.tanks.length;
        arena.missileInterception = allowBlocking.checked;

        arena.missiles = arena.missiles.filter((missile) => {
            missile.update(ctx, arena);
            if (showAnimation.checked) missile.draw(ctx, arena);
            return missile.state !== "dead";
        });

        arena.tanks = arena.tanks.filter((tank) => {
            tank.update(ctx, arena);
            if (showAnimation.checked) tank.draw(ctx);
            return tank.state !== "dead";
        });

        // Game over
        if (iteration === MAX_ITERATIONS) {
            let winner = { name: "Draw" };
            if (tanks[0].energy > tanks[1].energy) {
                winner = tanks[0];
            }
            else if (tanks[1].energy > tanks[0].energy) {
                winner = tanks[1];
            }
            if (winner.index || winner.index === 0) {
                winCounts[winner.index]++;
                const energyBonus = ~~Math.max(0, winner.energy * SURVIVAL_BONUS_POINTS);
                const accuracyBonus = ~~Math.max(0, winner.accuracy * ACCURACY_BONUS_POINTS);
                scores[winner.index] += energyBonus + accuracyBonus;
            }
            logGameData(winner);
            tanks[0].state = "dead";
            tanks[1].state = "dead";
        }
        if (arena.tanks.length === 0 && !gameOver) {
            let winner = { name: "Draw" };
            logGameData(winner);
            newGame();
        }
        if (arena.tanks.length < 2 && !gameOver) {
            gameOver = true;
            const winner = arena.tanks[0];
            if (!winCounts[winner.index]) {
                winCounts[winner.index] = 0;
            }
            winner.message = winner.victoryMessage;
            winner.showMessage = 50;
            winCounts[winner.index]++;
            const energyBonus = ~~Math.max(0, winner.energy * SURVIVAL_BONUS_POINTS);
            const accuracyBonus = ~~Math.max(0, winner.accuracy * ACCURACY_BONUS_POINTS);
            scores[winner.index] += energyBonus + accuracyBonus;
            logGameData(winner);
            if (gameSpeed < 100) {
                setTimeout(newGame, 1000 / gameSpeed);
            }
            else {
                newGame();
            }
        }

        // Increment iteration
        if (!gameOver) {
            iteration++;
        }
        else {
            break;
        }
    }
}


function logGameData(winner) {
    tanks = tanks.sort((a, b) => a.index - b.index);
    energy[0] += tanks[0].energy;
    energy[1] += tanks[1].energy;
    tankCollisions[0] += tanks[0].tankCollisions;
    tankCollisions[1] += tanks[1].tankCollisions;
    wallCollisions[0] += tanks[0].wallCollisions;
    wallCollisions[1] += tanks[1].wallCollisions;
    missileCollisions[0] += tanks[0].missileCollisions;
    missileCollisions[1] += tanks[1].missileCollisions;
    avgEnergy[tanks[0].name] = ~~(energy[0] / gameCount);
    avgEnergy[tanks[1].name] = ~~(energy[1] / gameCount);
    avgEnergyDif[tanks[0].name] = avgEnergy[tanks[0].name] - avgEnergy[tanks[1].name];
    avgEnergyDif[tanks[1].name] = avgEnergy[tanks[1].name] - avgEnergy[tanks[0].name];
    scores[0] += tanks[0].matchScore;
    scores[1] += tanks[1].matchScore;
    scoreData[tanks[0].name] = scores[0];
    scoreData[tanks[1].name] = scores[1];
    scorePercentage[tanks[0].name] = ~~(scores[0] / (scores[0] + scores[1]) * 10000) / 100;
    scorePercentage[tanks[1].name] = ~~(scores[1] / (scores[0] + scores[1]) * 10000) / 100;
    scorePercentageDif[tanks[0].name] = ~~((scorePercentage[tanks[0].name] - scorePercentage[tanks[1].name]) * 100) / 100;
    scorePercentageDif[tanks[1].name] = ~~((scorePercentage[tanks[1].name] - scorePercentage[tanks[0].name]) * 100) / 100;
    winsData[tanks[0].name] = winCounts[0];
    winsData[tanks[1].name] = winCounts[1];
    winPercentage[tanks[0].name] = ~~((winCounts[0] / gameCount) * 10000) / 100;
    winPercentage[tanks[1].name] = ~~((winCounts[1] / gameCount) * 10000) / 100;
    winBalance[tanks[0].name] = ~~((winPercentage[tanks[0].name] - winPercentage[tanks[1].name]) * 100) / 100;
    winBalance[tanks[1].name] = ~~((winPercentage[tanks[1].name] - winPercentage[tanks[0].name]) * 100) / 100;
    missilesHit[0] += tanks[0].missilesHit;
    missilesHit[1] += tanks[1].missilesHit;
    missilesFired[0] += tanks[0].missilesFired;
    missilesFired[1] += tanks[1].missilesFired;
    accuracy[tanks[0].name] = ~~((missilesHit[0] / missilesFired[0]) * 10000) / 100;
    accuracy[tanks[1].name] = ~~((missilesHit[1] / missilesFired[1]) * 10000) / 100;
    accuracyPercentageDif[tanks[0].name] = ~~((accuracy[tanks[0].name] - accuracy[tanks[1].name]) * 100) / 100;
    accuracyPercentageDif[tanks[1].name] = ~~((accuracy[tanks[1].name] - accuracy[tanks[0].name]) * 100) / 100;
    totalGameDuration += iteration;

    const shouldUpdate = gameCount % 100 === 0;
    if (!showAnimation.checked && !shouldUpdate) return;

    const matchStats = [
        {
            "Statistic": "Wins",
            ...{ [tanks[0].name]: winsData[tanks[0].name] },
            ...{ [tanks[1].name]: winsData[tanks[1].name] },
            "Difference": Math.abs(winsData[tanks[0].name] - winsData[tanks[1].name]),
        },
        {
            "Statistic": "Win %",
            ...{ [tanks[0].name]: winPercentage[tanks[0].name] },
            ...{ [tanks[1].name]: winPercentage[tanks[1].name] },
            "Difference": ~~(Math.abs(winPercentage[tanks[0].name] - winPercentage[tanks[1].name]) * 100) / 100,
        },
        {
            "Statistic": "Score",
            ...{ [tanks[0].name]: ~~scoreData[tanks[0].name] },
            ...{ [tanks[1].name]: ~~scoreData[tanks[1].name] },
            "Difference": ~~Math.abs(scoreData[tanks[0].name] - scoreData[tanks[1].name]),
        },
        {
            "Statistic": "Score %",
            ...{ [tanks[0].name]: scorePercentage[tanks[0].name] },
            ...{ [tanks[1].name]: scorePercentage[tanks[1].name] },
            "Difference": Math.abs(scorePercentageDif[tanks[0].name]),
        },
        {
            "Statistic": "Avg Energy",
            ...{ [tanks[0].name]: avgEnergy[tanks[0].name] },
            ...{ [tanks[1].name]: avgEnergy[tanks[1].name] },
            "Difference": Math.abs(avgEnergyDif[tanks[0].name]),
        },
        {
            "Statistic": "Accuracy %",
            ...{ [tanks[0].name]: accuracy[tanks[0].name] },
            ...{ [tanks[1].name]: accuracy[tanks[1].name] },
            "Difference": Math.abs(accuracyPercentageDif[tanks[0].name]),
        },
        {
            "Statistic": "Tank Collisions",
            ...{ [tanks[0].name]: tankCollisions[0] },
            ...{ [tanks[1].name]: tankCollisions[1] },
            "Difference": Math.abs(tankCollisions[0] - tankCollisions[1]),
        },
        {
            "Statistic": "Missile Collisions",
            ...{ [tanks[0].name]: missileCollisions[0] },
            ...{ [tanks[1].name]: missileCollisions[1] },
            "Difference": Math.abs(missileCollisions[0] - missileCollisions[1]),
        },
        {
            "Statistic": "Wall Collisions",
            ...{ [tanks[0].name]: wallCollisions[0] },
            ...{ [tanks[1].name]: wallCollisions[1] },
            "Difference": Math.abs(wallCollisions[0] - wallCollisions[1]),
        },
    ];
    
    const gameWinner = (winCounts[0] > winCounts[1]) ? ((winCounts[0] === winCounts[1]) ? "Draw" : tanks[0].name) : tanks[1].name;
    const draws = Math.abs(gameCount - winCounts[0] - winCounts[1]);
    const gameStats = {
        "Total Matches": gameCount,
        "Total Game Time": formatTime(gameTimeInSeconds),
        "Average FPS": ~~(totalGameDuration / gameTimeInSeconds),
        "Total Game Iterations": totalGameDuration,
        "Last Match Iterations": iteration,
        "Average Match Iterations": Math.round(totalGameDuration / gameCount),
        "Number of Draws": draws + ` (${Math.round(draws / gameCount * 10000) / 100}%)`,
        "Victory Message": (winner.victoryMessage || "Draw."),
        "Match Winner": winner.name,
        "Game Winner": `${gameWinner} (${winPercentage[gameWinner]}%)`,
    }
    const stats = {
        "matches": gameCount,
        "game_stats": gameStats,
        "match_stats": matchStats
    }
    localStorage.setItem(`JSTanks`, JSON.stringify(stats));
    console.log(`%c Matches ${gameCount}`, "font-size: 32px;");
    console.table(gameStats);
    console.table(matchStats);
    console.log();

}

setInterval(() => {
    if (!paused && document.getElementById("selSpeed").value !== 0)
    {
        gameTimeInSeconds++;
    }
}, 1000);

window.addEventListener("error", (e) => {
    selGameSpeed.value = 0;
    console.error(e);
});


function showError(error) {
    error = JSON.stringify(error, null, 2);
    const overlay = document.getElementById("overlay");
    overlay.style.zIndex = "9999";
    overlay.innerHTML = `<pre>${error}</pre>`;
    overlay.style.display = "block";
}

function formatTime(seconds) {
    const s = seconds % 60;
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / (60 * 60));
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
