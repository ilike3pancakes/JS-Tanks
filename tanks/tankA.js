function tankAMain(tank, arena) {
    const LEARNING_ENABLED = false;
    const COLLISION_COOLDOWN_TIME = 36;
    const LOW_ENERGY_THRESHOLD = 100;
    const saved = tank.retained;

    tank.angleDifference = (a1, a2) => {
        a1 = (a1 + 360000) % 360;
        a2 = (a2 + 360000) % 360;
        if (a1 > 180) a1 -= 360;
        if (a2 > 180) a2 -= 360;
        return (a2 - a1 + 180) % 360 - 180;
    };
    tank.calculateGunTurn = (x, y) => {
        const targetAngle = tank.angleTo(x, y);
        let gunAngleDifference = tank.angleDifference(tank.bodyAim + tank.gunAim, targetAngle);
        return Math.max(-1, Math.min(1, gunAngleDifference / 10));
    }
    tank.perpendicularSpeedComponent = (target) => {
        let angleDifference = (target.angleTo - target.bodyAim + 360000) % 360;
        if (Math.abs(angleDifference) > 90) {
            angleDifference += (angleDifference > 0) ? -180 : 180;
        }
        return Math.cos(angleDifference * DEGREES);
    };
    tank.getTargetPriority = (target) => {
        const accuracyFactor = (1 - Math.abs(tank.angleDifference(tank.bodyAim + tank.gunAim, target.angleTo)) / (tank.radarArc * MAX_RADAR_ARC_DEGREES)) ** 2;
        const trajectoryFactor = (1 - Math.abs(tank.perpendicularSpeedComponent(target)));
        const distanceFactor = (1 - target.distance / MAX_DISTANCE) ** 2;
        const energyFactor = (1 - target.energy / (saved.maxTargetEnergy || 1000));
        const speedFactor = 1 - Math.abs(target.speed);
        const gunHeatFactor = (1 - Math.min(1, 1 / Math.max(1, target.gunHeat))) ** (1 / 2);
        const hitProbability = accuracyFactor * 0.4 + trajectoryFactor * 0.3 + distanceFactor * 0.2 + speedFactor * 0.1;
        const vulnerabilityFactor = energyFactor * 0.6 + speedFactor * 0.25 + gunHeatFactor * 0.15;
        return (hitProbability * 4 + vulnerabilityFactor) / 5;
    };
    tank.getMissilePriority = (missile) => {
        const perfectTrajectory = (Math.atan2(tank.y - missile.y, tank.x - missile.x) * DEGREES + 36000) % 360;
        const trajectoryDifference = tank.angleDifference(perfectTrajectory, missile.aim);
        const trajectoryFactor = (1 - Math.abs(trajectoryDifference) / 180);
        const distanceFactor = 1 - (missile.distance / MAX_DISTANCE);
        const energyFactor = 1 - (missile.energy - MAX_MISSILE_ENERGY);
        return trajectoryFactor * 0.4 + distanceFactor * 0.4 + energyFactor * 0.2;
    };
    tank.commitMemory = (key, value) => { localStorage.setItem(`tank_${encodeURIComponent(tank.name)}_${encodeURIComponent(key)}`, JSON.stringify(value)) };
    tank.forgetMemory = (key) => { localStorage.removeItem(`tank_${encodeURIComponent(tank.name)}_${encodeURIComponent(key)}`) };
    tank.getMemory = (key) => {
        const value = localStorage.getItem(`tank_${encodeURIComponent(tank.name)}_${encodeURIComponent(key)}`);
        return (value) ? JSON.parse(value) : undefined;
    };
    
    // Set initial values
    if (tank.iteration === 0) {
        tank.name = "Rampage";
        tank.color = "#c80000";
        tank.fillColor = "#000000";
        tank.treadColor = "#df0000";
        tank.gunColor = "#c80000"
        tank.radarArc = 1;
        tank.speed = 1;
        tank.gunTurn = tank.calculateGunTurn(0, 0);
        saved.wanderPattern = 0;
        saved.previousTargetData = [];
        saved.missileEvasionReverse = 0;
        saved.target = null;
        saved.scanDirection = 0;
        saved.targets = {};
        saved.wallCollisions = 0;
        saved.wallAvoidance = tank.getMemory("wallAvoidance") || {
            adjustmentAmount: 0,
            adjustmentCount: 0,
            adjustmentMatchCurrent: 0,
            adjustmentMatchTarget: 1000,
            learningRate: 0.01,
            learningDecay: 0.001,
            matchesSinceCollisionBest: 0,
            matchesSinceCollisionCurrent: 0,
            rewardsPositive: 0,
            rewardsNegative: 0,
            slowDown: 0.58,
            threshold: 7.8,
            trainingIteration: 0,
            largestUnsafe: {
                slowDown: 0,
                threshold: 0,
            }
        }
        saved.lastMissileId = false;
        saved.firedMissiles = [];
    }
    
    // Determine if tank is near wall
    const wallProximityThreshold = saved.wallAvoidance.threshold * tank.size;
    const nextX = tank.x + tank.actualSpeed * Math.cos(tank.bodyAim * DEGREES);
    const nextY = tank.y + tank.actualSpeed * Math.sin(tank.bodyAim * DEGREES);
    tank.isNearWall = (
        Math.abs(nextX) > arena.width / 2 - wallProximityThreshold ||
        Math.abs(nextY) > arena.height / 2 - wallProximityThreshold
    );
    
    // Calculate number of frames until wall collision
    let predictedAim = tank.bodyAim + tank.bodyTurn * MAX_BODY_TURN_DEGREES;
    let predictedX = tank.x + tank.actualSpeed * Math.cos(predictedAim * DEGREES);
    let predictedY = tank.y + tank.actualSpeed * Math.sin(predictedAim * DEGREES);
    let collision = Math.abs(predictedX) > arena.width / 2 - tank.size || Math.abs(predictedY) > arena.height / 2 - tank.size;
    let framesUntilWallCollision = 0;
    while (framesUntilWallCollision < 100 && !collision) {
        predictedAim += tank.bodyTurn * MAX_BODY_TURN_DEGREES;
        predictedX += tank.actualSpeed * Math.cos(predictedAim * DEGREES);
        predictedY += tank.actualSpeed * Math.sin(predictedAim * DEGREES);
        collision = Math.abs(predictedX) > arena.width / 2 - tank.size || Math.abs(predictedY) > arena.height / 2 - tank.size;
        framesUntilWallCollision++;
    }


    // Calculate distances to each wall
    let wallDistance = Infinity;
    let wallAngle = 0;
    const leftWallDistance = Math.abs(-arena.width / 2 - tank.x);
    const rightWallDistance = Math.abs(arena.width / 2 - tank.x);
    const topWallDistance = Math.abs(-arena.height / 2 - tank.y);
    const bottomWallDistance = Math.abs(arena.height / 2 - tank.y);

    // Determine the nearest wall and the angle to it
    if (leftWallDistance < wallDistance) {
        wallDistance = leftWallDistance;
        wallAngle = 180;
    }
    if (rightWallDistance < wallDistance) {
        wallDistance = rightWallDistance;
        wallAngle = 0
    }
    if (topWallDistance < wallDistance) {
        wallDistance = topWallDistance;
        wallAngle = -90;
    }
    if (bottomWallDistance < wallDistance) {
        wallDistance = bottomWallDistance;
        wallAngle = 90;
    }


    // Update fired missile information
    if (saved.lastMissileId) {
        const missile = tank.missiles[saved.lastMissileId];
        saved.firedMissiles.push(missile);
        saved.lastMissileId = false;
    }


    // Update targets information
    saved.maxTargetEnergy = 0;
    if (tank.detectedTanks.length > 0) {
        tank.detectedTanks.forEach((detected) => {
            saved.targets[detected.index] = detected;
            saved.targets[detected.index].iteration = tank.iteration;
            if (detected.energy > saved.maxTargetEnergy) {
                saved.maxTargetEnergy = detected.energy;
            }
        });
    }
    
    
    // Remove dead targets
    const deadTargetsExist = () => Object.keys(saved.targets).length > arena.tanksRemaining - 1;
    let longestAbsence;
    while (deadTargetsExist()) {
        let removalIndex = longestAbsence = -1;
        for (const targetIndex of Object.keys(saved.targets)) {
            const target = saved.targets[targetIndex];
            const absenceTime = tank.iteration - target.iteration;
            if (absenceTime > longestAbsence) {
                removalIndex = targetIndex;
                longestAbsence = absenceTime;
            }
        }
        delete saved.targets[removalIndex];
    }

    // Low energy mode
    if (tank.energy < LOW_ENERGY_THRESHOLD) {
        tank.energyLow = true;
        let energyFactor =  tank.energy / LOW_ENERGY_THRESHOLD;
        let direction =  Math.sign(tank.speed)
        let desiredSpeed = 0.5 + 0.5 * energyFactor * direction;
        if (Math.abs(tank.speed) > Math.abs(desiredSpeed)) {
            tank.speed = desiredSpeed;
        }
    }
    else {
        tank.energyLow = false;
    }
    
    // Wander around the arena (default action)
    const wanderSeed = 0.3 + Math.random() * 0.4;
    saved.wanderPatterns = [
        Math.cos(tank.iteration / 10) * wanderSeed + Math.sin(tank.iteration / 33) * (1 - wanderSeed),
        Math.sin(tank.iteration / 11) * wanderSeed + Math.cos(tank.iteration / 32) * (1 - wanderSeed),
        Math.cos(tank.iteration / 12) * wanderSeed + Math.sin(tank.iteration / 31) * (1 - wanderSeed),
        Math.sin(tank.iteration / 13) * wanderSeed + Math.cos(tank.iteration / 30) * (1 - wanderSeed),
    ];
    const patternChanger = (15 + tank.index) + ~~(Math.random() * 15 + (1 - tank.index));
    if ((tank.iteration + tank.index) % patternChanger === 0) {
        saved.wanderPattern = ~~(Math.random() * saved.wanderPatterns.length);
        // Go straight half of the time
        if (Math.random() > 0.5) {
            saved.wanderPattern = 0;
        }
    }
    tank.bodyTurn = saved.wanderPatterns[saved.wanderPattern];


    // Handle detected tanks
    if (tank.detectedTanks.length > 0) {

        // Reset radar scan
        saved.scanSpeed = 1;
        saved.scanDirection = 0;
        saved.scanRotation = 0;

        // Save primary target
        tank.detectedTanks = tank.detectedTanks.sort((a, b) => { return tank.getTargetPriority(a) - tank.getTargetPriority(b) });
        let target = tank.detectedTanks[0];
        saved.target = { ...target };

        // Set a victory message (in case target is destroyed)
        const taunts = [
            "🖕",
            "I win!",
            "Ur dead.",
            "Get rekt.",
            `Fuck u, ${target.name}!`,
        ];
        tank.victoryMessage = taunts[~~(Math.random() * taunts.length)];

        // Conserve energy
        const targetsFarEnough = target.distance > arena.width / 4;
        const targetsGunIsCoolEnough = target.gunHeat < 10;
        const shouldConserveEnergy = target.energy * 3 > tank.energy;
        if (shouldConserveEnergy && targetsFarEnough && targetsGunIsCoolEnough) {
            tank.conserveEnergy = true;
        }

        // Store and average previous target data for velocity
        saved.previousTargetData.push({ x: target.x, y: target.y, angle: target.bodyAim, time: tank.iteration });
        if (saved.previousTargetData.length > 5) {
            saved.previousTargetData.shift();
        }

        // Calculate average velocity over the stored history
        let avgVelocityX = avgVelocityY = 0;
        if (saved.previousTargetData.length >= 2) {
            let totalDeltaTime = 0;
            for (let i = 1; i < saved.previousTargetData.length; i++) {
                const last = saved.previousTargetData[i];
                const prev = saved.previousTargetData[i - 1];
                const deltaTime = last.time - prev.time;
                avgVelocityX += (last.x - prev.x);
                avgVelocityY += (last.y - prev.y);
                totalDeltaTime += deltaTime;
            }
            avgVelocityX /= Math.max(1, totalDeltaTime); // Avoid division by zero
            avgVelocityY /= Math.max(1, totalDeltaTime);
        }
        else {
            avgVelocityX = target.actualSpeed * Math.cos(target.bodyAim * DEGREES);
            avgVelocityY = target.actualSpeed * Math.sin(target.bodyAim * DEGREES);
        }

        // Calculate missile intercept time
        let timeToIntercept = target.distance / MISSILE_SPEED;
        const baseIterations = 5;
        const velocityFactor = Math.abs(target.speed);
        const distanceFactor = target.distance / arena.width;
        const additionalIterations = (velocityFactor + distanceFactor) * baseIterations;
        const interceptCalculationIterations = baseIterations + additionalIterations;
        for (let i = 0; i < interceptCalculationIterations; i++) {
            const predictedTargetX = target.x + avgVelocityX * timeToIntercept;
            const predictedTargetY = target.y + avgVelocityY * timeToIntercept;
            timeToIntercept = tank.distanceTo(predictedTargetX, predictedTargetY) / MISSILE_SPEED;
        }

        // Calculate final predicted target position
        let predictedTargetX = target.x + avgVelocityX * timeToIntercept;
        let predictedTargetY = target.y + avgVelocityY * timeToIntercept;

        // Turn gun to the desired angle
        tank.gunTurn = tank.calculateGunTurn(predictedTargetX, predictedTargetY);

        // Calculate firing conditions
        const aimAccuracyThreshold = 5;
        const predictedTargetAngle = tank.angleTo(predictedTargetX, predictedTargetY);
        const gunAngleDifference = tank.angleDifference(tank.bodyAim + tank.gunAim, predictedTargetAngle);
        const aimError = Math.abs(gunAngleDifference);
        const aimErrorThreshold = aimAccuracyThreshold * (1 - target.distance / arena.width);
        const perpendicularSpeedComponent = Math.abs(tank.perpendicularSpeedComponent(target));
        const historicAccuracy = tank.aimAccuracy || 0.5;
        const probabilityOfHit = (
            (1 - aimError / aimErrorThreshold) *
            (1 - target.distance / MAX_DISTANCE) *
            (1 - perpendicularSpeedComponent)
        );
        if (aimError < aimErrorThreshold) {
            const minFirePower = 5;
            const accuracyBonus = MAX_MISSILE_ENERGY * historicAccuracy * probabilityOfHit ** 2;
            let firePower = (tank.energyLow) ? minFirePower : Math.min(50, minFirePower + accuracyBonus);
            firePower *= (1 + target.distance / MAX_DISTANCE) / 2;
            if (Math.random() > 0.9) {
                firePower = Math.max(firePower, MAX_MISSILE_ENERGY * probabilityOfHit);
            }
            const missileEnergy = firePower * MISSILE_ENERGY_MULTIPLIER;
            const missileEnergyAtImpact = missileEnergy - (target.distance / MISSILE_SPEED);
            if (firePower > minFirePower && missileEnergyAtImpact > firePower) {
                saved.lastMissileId = tank.fire(firePower);
            }
        }
    }

    // If no tank is detected
    else {

        // Calculate scan direction
        if (!saved.scanDirection) {
            let aimAtX = saved?.target?.x || 0;
            let aimAtY = saved?.target?.y || 0;
            const desiredGunTurn = tank.calculateGunTurn(aimAtX, aimAtY);
            const randomDirection = 1 - Math.round(Math.random() * 2);
            saved.scanDirection = Math.sign(desiredGunTurn) || randomDirection;
        }

        // Calculate scan speed and turn gun (radar will follow gun)
        const rotationAmount = saved.scanDirection * saved.scanSpeed;
        tank.gunTurn = saved.scanDirection * saved.scanSpeed;
        saved.scanRotation += Math.abs(rotationAmount * MAX_GUN_TURN_DEGREES);
        const fullRotations = ~~(saved.scanRotation / 360);
        const slowDownRate = Math.min(4, fullRotations) / 4;
        saved.scanSpeed = 1 - 0.5 * slowDownRate;
        if (fullRotations === 5) {
            saved.scanRotation = 0;
            saved.scanDirection *= -1;
        }
    }


    // Wall avoidance logic
    if (tank.isNearWall) {
        
        // Learn from wall collisions
        if (LEARNING_ENABLED && tank.wallCollision) {
            if (saved.wallAvoidance.slowDown > saved.wallAvoidance.largestUnsafe.slowDown) {
                saved.wallAvoidance.largestUnsafe.slowDown = saved.wallAvoidance.slowDown;
            }
            if (saved.wallAvoidance.threshold > saved.wallAvoidance.largestUnsafe.threshold) {
                saved.wallAvoidance.largestUnsafe.threshold = saved.wallAvoidance.threshold;
            }
            saved.wallCollisions++;
            saved.wallAvoidance.collisions++;
            saved.wallAvoidance.adjustmentCount++;
            saved.wallAvoidance.rewardsNegative++;
            saved.wallAvoidance.adjustmentAmount += saved.wallAvoidance.learningRate;
            saved.wallAvoidance.slowDown *= (1 + saved.wallAvoidance.learningRate);
            saved.wallAvoidance.threshold *= (1 + saved.wallAvoidance.learningRate);
            saved.wallAvoidance.matchesSinceCollisionBest = saved.wallAvoidance.matchesSinceCollisionCurrent;
            saved.wallAvoidance.matchesSinceCollisionCurrent = 0;
            tank.commitMemory("wallAvoidance", saved.wallAvoidance);
        }

        // Slow down for better handling
        const wallOffset = Math.abs(tank.angleDifference(tank.bodyAim, wallAngle));
        const directionFactor =  1 - (wallOffset / 90);
        const distanceFactor = wallDistance / wallProximityThreshold;
        const slowDownFactor = saved.wallAvoidance.slowDown * directionFactor;
        tank.speed =  (1 - slowDownFactor) + (slowDownFactor * distanceFactor);

        // If collision is likely slow down even more
        if (framesUntilWallCollision < 15) {
            tank.speed /= 16 - framesUntilWallCollision;
        }
        
        // If collision is imminent then stop
        if (framesUntilWallCollision === 1) {
            tank.speed = 0;
        }

        // Turn away fom the wall
        const angleToCenter = tank.angleTo(0, 0);
        let bodyAngleDifference = tank.angleDifference(tank.bodyAim, angleToCenter);
        tank.bodyTurn = bodyAngleDifference / 180;

        // Always take the shortest turn path
        if (Math.abs(bodyAngleDifference) > 180) {
            tank.speed *= -1;
            tank.bodyTurn *= -1;
        }

    }


    // Distance from wall is safe
    else {

        // Handle detected missiles
        if (tank.detectedMissiles.length > 0) {
            saved.underRapidFire = Math.max(0, tank.detectedMissiles.length - 1) * COLLISION_COOLDOWN_TIME;
            tank.detectedMissiles = tank.detectedMissiles.sort((a, b) => { return tank.getMissilePriority(b) - tank.getMissilePriority(a) });
            const missile = tank.detectedMissiles[0];
            const perfectTrajectory = tank.angleFrom(missile.x, missile.y);
            const trajectoryDifference = tank.angleDifference(perfectTrajectory, missile.aim);
            const aimError = Math.abs(trajectoryDifference);
            const interceptionAimThreshold = 3 + 3 * missile.distance / MAX_DISTANCE;
            const threatAngle = (saved.target?.angleTo) || missile.angleTo;
            // Move out of missiles path
            const evasionExceptions = saved.missileEvasionReverse || tank.isNearWall;
            if (aimError < interceptionAimThreshold && !evasionExceptions) {
                saved.missileEvasion = COLLISION_COOLDOWN_TIME;
                tank.bodyTurn = tank.angleDifference(tank.bodyAim, threatAngle + 90) / 10;
                tank.speed = 1;
                if (trajectoryDifference < 0) {
                    tank.speed *= -1;
                    saved.missileEvasionReverse = ~~(missile.distance / missile.speed);
                }
            }
            // Conserve energy if safe
            else if (arena.tanksRemaining === 2 && saved.target?.gunHeat > 10) {
                if (saved.collisionCoolDown || saved.underRapidFire) {
                    tank.speed = Math.sign(tank.speed) || 1;
                }
                else {
                    if (!saved.missileEvasion) {
                        tank.conserveEnergy = true;
                    }
                }
            }
            
            // Calculate the threat level of all detected missiles
            saved.missileThreat = tank.detectedMissiles.reduce((sum, _missile) => { return sum + missile.energy });
            if (saved.missileThreat > tank.energy) {
                tank.bodyColor = "#ff0000";
            }
        }
        
        // If no missiles are detected
        else {
            saved.missileEvasion = 0;
            if (saved.underRapidFire > 0) {
                saved.underRapidFire--;
            }
            saved.missileEvasionReverse = 0;
            if (!saved.isUnderRapidFire && saved.target?.gunHeat > 1) {
                tank.speed = 0;
            }
            else {
                tank.speed = 1;
            }
            saved.missileThreat = 0;
        }


        // Handle missile and tank collisions
        const collision = tank.tankCollision || tank.missileCollision;
        if (collision) {
            saved.collisionAngle = collision.angle;
            saved.collisionDamage = collision.damage;
            saved.collisionCoolDown = COLLISION_COOLDOWN_TIME;
        }
        const collisionIsBiggestThreat = saved.collisionDamage > saved.missileThreat;
        if (saved.collisionCoolDown && collisionIsBiggestThreat && arena.tanksRemaining > 2) {
            const desiredGunTurn = tank.angleDifference(tank.bodyAim + tank.gunAim, saved.collisionAngle);
            tank.gunTurn = desiredGunTurn / 10;
        }
        if (tank.isNearWall && saved.collisionCoolDown && !saved.underRapidFire) {
            const directionDifference = tank.angleDifference(tank.bodyAim, saved.collisionAngle + 90);
            tank.bodyTurn = directionDifference / 10;
            tank.speed = saved.collisionCoolDown / COLLISION_COOLDOWN_TIME;
            if (Math.abs(saved.collisionAngle) > 90) {
                tank.bodyTurn *= -tank.bodyTurn;
                tank.speed *= -1;
            }
        }
    
    
        // Orient tanks body perpendicular to target for missile evasion
        if (saved.target && !tank.isNearWall) {
            const angleDifference = tank.angleDifference(tank.bodyAim, saved.target.angleTo + 90);
            tank.bodyTurn = angleDifference / 180;
        }
        
    }

    // Handle cool downs
    if (saved.missileEvasion) {
        saved.missileEvasion = Math.max(0, saved.missileEvasion - 1);
    }
    if (saved.missileEvasionReverse > 0) {
        saved.missileEvasionReverse = Math.max(0, saved.missileEvasionReverse - 1);
    }
    if (saved.collisionCoolDown) {
        saved.collisionCoolDown = Math.max(0, saved.collisionCoolDown - 1);
    }


    // Correct gun turn for steering changes
    tank.gunTurn -= tank.bodyTurn;
    
    // Learn from successful wall avoidance
    if (LEARNING_ENABLED && arena.tanksRemaining === 1 && !saved.wallCollisions && !saved.learningSaved) {
        saved.learningSaved = true;
        if (saved.wallAvoidance.matchesSinceCollisionCurrent > saved.wallAvoidance.matchesSinceCollisionBest) {
            saved.wallAvoidance.matchesSinceCollisionBest = saved.wallAvoidance.matchesSinceCollisionCurrent;
        }
        saved.wallAvoidance.trainingIteration++;
        saved.wallAvoidance.adjustmentMatchCurrent++;
        saved.wallAvoidance.matchesSinceCollisionCurrent++;
        tank.commitMemory("wallAvoidance", saved.wallAvoidance);
        let current = saved.wallAvoidance.adjustmentMatchCurrent;
        let best = saved.wallAvoidance.adjustmentMatchTarget;
        if (current >= best * 1.05) {
            const nextSlowDown = saved.wallAvoidance.slowDown * (1 - saved.wallAvoidance.learningDecay);
            const nextThreshold = saved.wallAvoidance.Threshold * (1 - saved.wallAvoidance.learningDecay);
            if (nextSlowDown > saved.wallAvoidance.largestUnsafe.slowDown && nextThreshold > saved.wallAvoidance.largestUnsafe.threshold) {
                saved.wallAvoidance.rewardsPositive++;
                saved.wallAvoidance.adjustmentCount++;
                saved.wallAvoidance.adjustmentMatchCurrent = 0;
                saved.wallAvoidance.adjustmentMatchTarget = current;
                saved.wallAvoidance.adjustmentAmount -= saved.wallAvoidance.learningDecay;
                saved.wallAvoidance.slowDown = nextSlowDown;
                saved.wallAvoidance.threshold = nextThreshold;
                tank.commitMemory("wallAvoidance", saved.wallAvoidance);
            }
        }
    }

    // Handle energy regeneration
    if (tank.conserveEnergy) {
        tank.speed = 0;
    }

    // Color tank
    const colorTankPart = (amount) => {
        const r = Math.round((1 - amount) * 255);
        return r.toString(16).padStart(2, "0");
    }

    // Fill color
    const energyGrade = Math.min(1, tank.energy / 1000);
    const colorShade = energyGrade ** (1 / 4);
    const rHex = colorTankPart(colorShade);
    tank.fillColor = `#${rHex}0000`;

    // Tread color
    tank.treadColor = (tank.speed === 0) ? "#c80000" : "#ff0000";

    // Gun color
    tank.gunColor = (tank.gunHeat === 0) ? "#c80000" : "#ff0000";

    // radar color
    tank.radarColor = (tank.detectedTanks > 9 || tank.detectedMissiles.length > 0) ? "#ff0000" : "#c80000";

    // This function must return the tank object
    return tank;

    
}
