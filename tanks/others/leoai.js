function tankBMain(tank, arena) {
    const missileSpeed = 15; // Increased missile speed for more rapid fire effect
    const maxDistance = Math.sqrt(arena.width ** 2 + arena.height ** 2);

    tank.angleTo = (x, y) => Math.atan2(y - tank.y, x - tank.x) * 180 / Math.PI;
    tank.distanceTo = (x, y) => Math.sqrt((y - tank.y) ** 2 + (x - tank.x) ** 2);
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
        return Math.cos(angleDifference * Math.PI / 180);
    };
    tank.getTargetPriority = (target) => {
        const accuracyFactor = (1 - Math.abs(tank.angleDifference(tank.bodyAim + tank.gunAim, target.angleTo)) / (tank.radarArc * 90)) ** 2;
        const trajectoryFactor = (1 - Math.abs(tank.perpendicularSpeedComponent(target)));
        const distanceFactor = (1 - target.distance / maxDistance) ** 2;
        const energyFactor = (1 - target.energy / maxTargetEnergy);
        const speedFactor = 1 - Math.abs(target.speed);
        const gunHeatFactor = (1 - Math.min(1, 1 / Math.max(1, target.gunHeat))) ** (1 / 2);
        const hitProbability = accuracyFactor * 0.4 + trajectoryFactor * 0.3 + distanceFactor * 0.2 + speedFactor * 0.1;
        const vulnerabilityFactor = energyFactor * 0.6 + speedFactor * 0.25 + gunHeatFactor * 0.15;
        const aggressionBalance = (tank.retained.selfConfidence) ? Math.min(1, Math.max(0, 1 - tank.retained.selfConfidence)) : 0.5;
        const shotIsGood = hitProbability * (1 - aggressionBalance);
        const targetIsVulnerable = vulnerabilityFactor * aggressionBalance;
        return (shotIsGood * 4 + targetIsVulnerable) / 5;
    }
    
    tank.commitMemory = (key, value) => { localStorage.setItem(`tank_${encodeURIComponent(tank.name)}_${encodeURIComponent(key)}`, JSON.stringify(value)) };
    tank.forgetMemory = (key) => { localStorage.removeItem(`tank_${encodeURIComponent(tank.name)}_${encodeURIComponent(key)}`) };
    tank.getMemory = (key) => {
        const value = localStorage.getItem(`tank_${encodeURIComponent(tank.name)}_${encodeURIComponent(key)}`);
        return (value) ? JSON.parse(value) : undefined;
    };
    
    if (tank.iteration === 0) {
        tank.name = "LeoAI";
        tank.color = "#556b2f";
        tank.fillColor = "#3b5323";
        tank.treadColor = "#222222";
        tank.gunColor = "#8b1a1a"
        tank.radarArc = 1;
        tank.speed = 1;
        tank.gunTurn = tank.calculateGunTurn(0, 0);
        tank.retained.wanderPattern = 0;
        tank.retained.previousTargetData = [];
        tank.retained.missileEvasionReverse = 0;
        tank.retained.target = null;
        tank.retained.threat = false;
        tank.retained.scanDirection = 0;
        tank.retained.targets = {};
        tank.retained.matchOver = false;
        tank.retained.wins = tank.getMemory("winCount") || 0;
        tank.retained.gameCount = tank.getMemory("gameCount") || 0;
        tank.retained.flankDirection = Math.random() > 0.5 ? 1 : -1;
        tank.retained.flankStateTime = 0;
        tank.retained.flankState = "approach";
        tank.retained.emergencyEvade = 0;
        tank.retained.evading = 0;
        tank.retained.lastDodgeDirection = null;
        tank.retained.avoidingWall = false;
        tank.retained.activeMissile = null;
        tank.retained.searchPattern = 0;
        tank.commitMemory("gameCount", tank.retained.gameCount + 1);
        tank.retained.closestEnemyDistance = Infinity;
        tank.retained.lastWallAvoidanceAngle = 0;
        tank.retained.lastOpponentMoveDirection = "right"; // Initialize a default direction
    }
    

    if (tank.detectedTanks.length > 0) {
        tank.detectedTanks.forEach((detected) => {
            tank.retained.targets[detected.index] = detected;
            tank.retained.targets[detected.index].iteration = tank.iteration;
        });
    }
    
    let scanning = true;
    const targetArray = [];
    const deadTargetsExist = () => Object.keys(tank.retained.targets).length > arena.tanksRemaining - 1;
    let longestAbsence;
    while (deadTargetsExist() || scanning) {
        let removalIndex = longestAbsence = -1;
        for (const targetIndex of Object.keys(tank.retained.targets)) {
            const target = tank.retained.targets[targetIndex];
            const absenceTime = tank.iteration - target.iteration;
            if (absenceTime > longestAbsence) {
                removalIndex = targetIndex;
                longestAbsence = absenceTime;
            }
            targetArray.push(target);
        }
        delete tank.retained.targets[removalIndex];
        scanning = false;
    }

    const maxTargetEnergy = targetArray.reduce((max, current) => { return Math.max(max, current.energy) }, 0);
    const ttlTargetEnergy = targetArray.reduce((sum, current) => { return sum + current.energy }, 0);
    tank.retained.selfConfidence = (tank.detectedTanks.length === 0) ? 1 / (arena.tanksRemaining - 1) : tank.energy / (tank.energy + ttlTargetEnergy);
    tank.retained.canBeAggressive = tank.retained.target && arena.tanksRemaining === 2 && tank.energy > tank.retained.target.energy * 2;

    const minSpeed = tank.energy < 200 ? 0.3 : (tank.energy < 500 ? 0.6 : 0.8);
    if (Math.abs(tank.speed) < minSpeed) {
        tank.speed = minSpeed * (tank.speed >= 0 ? 1 : -1);
    }
    
    const wanderSeed = 0.4 + Math.random() * 0.4;
    tank.retained.wanderPatterns = [
        Math.cos(tank.iteration / 7) * wanderSeed + Math.sin(tank.iteration / 25) * (1 - wanderSeed),
        Math.sin(tank.iteration / 8) * wanderSeed + Math.cos(tank.iteration / 24) * (1 - wanderSeed),
        Math.cos(tank.iteration / 9) * wanderSeed + Math.sin(tank.iteration / 23) * (1 - wanderSeed),
        Math.sin(tank.iteration / 10) * wanderSeed + Math.cos(tank.iteration / 22) * (1 - wanderSeed),
    ];
    
    const patternChanger = (10 + tank.index) + ~~(Math.random() * 10 + (1 - tank.index));
    if ((tank.iteration + tank.index) % patternChanger === 0) {
        tank.retained.wanderPattern = ~~(Math.random() * tank.retained.wanderPatterns.length);
        if (Math.random() > 0.8) {
            tank.retained.wanderPattern = 0;
        }
    }
    tank.bodyTurn = tank.retained.wanderPatterns[tank.retained.wanderPattern];


    if (tank.detectedTanks.length > 0) {
        tank.detectedTanks = tank.detectedTanks.sort((a, b) => {
           return tank.getTargetPriority(a) - tank.getTargetPriority(b);
        });
        let target = tank.detectedTanks[0];
        tank.retained.scanDirection = 0;
        tank.retained.threat = { ...target };
        tank.retained.target = { ...target };
        tank.retained.closestEnemyDistance = target.distance;

        const taunts = [
            "Flanking strategy wins!",
            `${tank.name} outmaneuvered ${target.name}`,
            `Can't hit what you can't catch, ${target.name}!`,
            `Mobility > Firepower, ${target.name}`,
            `Outmaneuvered and outgunned, ${target.name}.`,
        ];
        tank.victoryMessage = taunts[~~(Math.random() * taunts.length)];

        tank.retained.flankStateTime++;
        
        const optimalDistance = arena.width / 4;
        const flankAngleOffset = 70;
        
        if (tank.retained.flankStateTime > 40) {
            if (Math.random() > 0.7) {
                tank.retained.flankDirection *= -1;
            }
            
            if (tank.retained.flankState === "approach") {
                tank.retained.flankState = "circle";
            } else if (tank.retained.flankState === "circle") {
                if (Math.random() > 0.7) {
                    tank.retained.flankState = "reverse";
                }
            } else {
                tank.retained.flankState = "approach";
            }
            
            tank.retained.flankStateTime = 0;
        }
        
        let desiredBodyAngle;
        switch (tank.retained.flankState) {
            case "approach":
                desiredBodyAngle = tank.angleTo(target.x, target.y) +
                                  (flankAngleOffset * 0.5 * tank.retained.flankDirection);
                tank.speed = 1;
                break;
                
            case "circle":
                const distanceDiff = target.distance - optimalDistance;
                let circleAngle = tank.angleTo(target.x, target.y) +
                                 (flankAngleOffset * tank.retained.flankDirection);
                
                if (Math.abs(distanceDiff) > 50) {
                    circleAngle = tank.angleTo(target.x, target.y) +
                                 (flankAngleOffset * 0.5 * tank.retained.flankDirection);
                    if (distanceDiff < 0) {
                        circleAngle = tank.angleTo(target.x, target.y) + 180 +
                                    (flankAngleOffset * 0.3 * tank.retained.flankDirection);
                    }
                }
                
                desiredBodyAngle = circleAngle;
                tank.speed = 1;
                break;
                
            case "reverse":
                desiredBodyAngle = tank.angleTo(target.x, target.y) +
                                  (flankAngleOffset * 1.2 * tank.retained.flankDirection);
                tank.speed = -0.8;
                break;
        }
        
        let bodyAngleDifference = tank.angleDifference(tank.bodyAim, desiredBodyAngle);
        tank.bodyTurn = bodyAngleDifference / 180;
        
        if (!tank.retained.previousTargetData) {
            tank.retained.previousTargetData = [];
        }
        if (tank.speed) {
            tank.retained.previousTargetData.push({ x: target.x, y: target.y, angle: target.bodyAim, time: tank.iteration });
        }
        if (tank.retained.previousTargetData.length > 5) {
            tank.retained.previousTargetData.shift();
        }

        let avgVelocityX = 0;
        let avgVelocityY = 0;
        let avgTurn = 0;
        if (tank.retained.previousTargetData.length >= 2) {
            let totalDeltaTime = 0;
            for (let i = 1; i < tank.retained.previousTargetData.length; i++) {
                const last = tank.retained.previousTargetData[i];
                const prev = tank.retained.previousTargetData[i - 1];
                const deltaTime = last.time - prev.time;
                avgVelocityX += (last.x - prev.x);
                avgVelocityY += (last.y - prev.y);
                avgTurn += (last.bodyAim - prev.bodyAim);
                totalDeltaTime += deltaTime;
            }
            avgVelocityX /= Math.max(1, totalDeltaTime);
            avgVelocityY /= Math.max(1, totalDeltaTime);
        }
        else {
            avgVelocityX = target.actualSpeed * Math.cos(target.bodyAim * Math.PI / 180);
            avgVelocityY = target.actualSpeed * Math.sin(target.bodyAim * Math.PI / 180);
        }

        let timeToIntercept = target.distance / missileSpeed;
        const baseIterations = 5;
        const velocityFactor = Math.abs(target.speed);
        const distanceFactor = target.distance / arena.width;
        const additionalIterations = (velocityFactor + distanceFactor) * baseIterations;
        const interceptCalculationIterations = baseIterations + additionalIterations;
        for (let i = 0; i < interceptCalculationIterations; i++) {
            const predictedTargetX = target.x + avgVelocityX * timeToIntercept;
            const predictedTargetY = target.y + avgVelocityY * timeToIntercept;
            timeToIntercept = tank.distanceTo(predictedTargetX, predictedTargetY) / missileSpeed;
        }

        let predictedTargetX = target.x + avgVelocityX * timeToIntercept;
        let predictedTargetY = target.y + avgVelocityY * timeToIntercept;
        if (Math.abs(target.speed) < 0.1) {  // Enhanced stationary prediction
            predictedTargetX = target.x;
            predictedTargetY = target.y;
        }

        //Post fire movement prediction
        if (target.justFired) {
          let angleDiff = tank.angleDifference(target.bodyAim, tank.retained.lastOpponentMoveDirection);
          if (angleDiff > 0) {
            tank.retained.lastOpponentMoveDirection = "right";
          } else {
            tank.retained.lastOpponentMoveDirection = "left";
          }
          target.justFired = false;
        }

        if (tank.retained.lastOpponentMoveDirection === "right") {
          predictedTargetX += 5;
        } else if (tank.retained.lastOpponentMoveDirection === "left") {
          predictedTargetX -= 5;
        }

        tank.gunTurn = tank.calculateGunTurn(predictedTargetX, predictedTargetY);
        
        const predictedTargetAngle = tank.angleTo(predictedTargetX, predictedTargetY);
        const gunAngleDifference = tank.angleDifference(tank.bodyAim + tank.gunAim, predictedTargetAngle);
        const aimError = Math.abs(gunAngleDifference);
        const aimErrorThreshold = 5 * (1 - target.distance / arena.width);
        const targetIsInRange = target.distance < arena.width / 2;
        const firingCondition1 = targetIsInRange && aimError < aimErrorThreshold;
        const firingCondition2 = target.gunHeat > 0 && aimError < aimErrorThreshold;
        const firingCondition3 = Math.abs(target.speed) <= 0.1 && aimError < aimErrorThreshold / 100;
        const firingCondition4 = aimError < aimErrorThreshold / 100;

        let fireProbability = 0.9; // Increased to 0.9 for more constant firing
        if (firingCondition1) {
            fireProbability = 0.95;
        }
        else if (firingCondition2) {
            fireProbability = 0.5;
        }
        else if (firingCondition3) {
            fireProbability = 0.1;
        }
        else if (firingCondition4) {
             fireProbability = 0.99;
        }

        if (fireProbability > Math.random()) {
            // Reduced firepower, but increased firing rate (in the loop)
            const firePower = 5; //  energy per shot.  Adjust as needed.

            if (tank.energy >= firePower) { // Check if we have enough energy to fire.
                tank.firePower = firePower; // Fire a small amount of energy
            }
        }
    }
    
    else {
        tank.retained.threat = false;
        
        if (!tank.retained.scanDirection) {
            let aimAtX = 0;
            let aimAtY = 0;
            
            if (tank.retained.target) {
                const targetAge = tank.iteration - tank.retained.target.iteration;
                if (targetAge < 30) {
                    const moveScale = Math.min(2, targetAge / 10);
                    aimAtX = tank.retained.target.x + (tank.retained.target.speed * Math.cos(tank.retained.target.bodyAim * Math.PI/180) * moveScale);
                    aimAtY = tank.retained.target.y + (tank.retained.target.speed * Math.sin(tank.retained.target.bodyAim * Math.PI/180) * moveScale);
                } else {
                    aimAtX = tank.retained.target.x * 0.3;
                    aimAtY = tank.retained.target.y * 0.3;
                }
            }
            
            const desiredGunTurn = tank.calculateGunTurn(aimAtX, aimAtY);
            tank.retained.scanDirection = Math.sign(desiredGunTurn) || 1;
            
            if (Math.random() > 0.98) {
                tank.retained.scanDirection *= -1;
            }
        }
        
        tank.gunTurn = tank.retained.scanDirection * (1 + Math.sin(tank.iteration / 20) * 0.3);
        
        const searchPatterns = [
            Math.sin(tank.iteration / 15) * 0.8,
            Math.cos(tank.iteration / 25) * 0.7,
            Math.sin(tank.iteration / 20) * Math.cos(tank.iteration / 40) * 0.9
        ];
        
        if (tank.iteration % 50 === 0) {
            tank.retained.searchPattern = Math.floor(Math.random() * searchPatterns.length);
        }
        
        tank.bodyTurn = searchPatterns[tank.retained.searchPattern || 0];
        
        const minSearchSpeed = 0.7;
        tank.speed = Math.max(minSearchSpeed, Math.abs(tank.speed));
        
        if (tank.iteration % 40 === 0 && Math.random() > 0.7) {
            tank.speed *= -1;
        }
    }


    if (tank.detectedMissiles.length > 0) {
        let totalThreatLevel = 0;
        
        tank.detectedMissiles.sort((a, b) => {
            let aEnergyThreat = Math.min(1, (a.energy * 4) / tank.energy);
            let bEnergyThreat = Math.min(1, (b.energy * 4) / tank.energy);
            
            const aTrajectory = (Math.atan2(tank.y - a.y, tank.x - a.x) * 180 / Math.PI + 36000) % 360;
            const bTrajectory = (Math.atan2(tank.y - b.y, tank.x - b.x) * 180 / Math.PI + 36000) % 360;
            
            const aTrajectoryDiff = Math.abs(tank.angleDifference(aTrajectory, a.aim));
            const bTrajectoryDiff = Math.abs(tank.angleDifference(bTrajectory, b.aim));
            
            const aTimeToImpact = a.distance / a.actualSpeed;
            const bTimeToImpact = b.distance / b.actualSpeed;
            
            const aThreatLevel = (aEnergyThreat * 0.4) +
                               (aTrajectoryDiff * 0.4) +  // Corrected variable name
                               (1 / Math.max(0.1, aTimeToImpact) * 0.2);
            
            const bThreatLevel = (bEnergyThreat * 0.4) +
                               (bTrajectoryDiff * 0.4) +  // Corrected variable name
                               (1 / Math.max(0.1, bTimeToImpact) * 0.2);
            
            totalThreatLevel += aThreatLevel + bThreatLevel;
            
            return bThreatLevel - bThreatLevel;
        });
        
        const missile = tank.detectedMissiles[0];
        const perfectTrajectory = (Math.atan2(tank.y - missile.y, tank.x - missile.x) * 180 / Math.PI + 36000) % 360;
        const trajectoryDifference = tank.angleDifference(perfectTrajectory, missile.aim);
        const timeToImpactEstimate = missile.distance / missile.actualSpeed;
        
        const missileThreatLevel = Math.abs(trajectoryDifference) < 30 ?
                                 (1 - (Math.abs(trajectoryDifference) / 30)) * (1 - (timeToImpactEstimate / 60)) :
                                 0;
        
        tank.retained.activeMissile = {
            x: missile.x,
            y: missile.y,
            aim: missile.aim,
            distance: missile.distance,
            energy: missile.energy,
            threatLevel: missileThreatLevel
        };
        
        const missileAngle = missile.aim;
        const evasionAngleRight = (missileAngle + 90) % 360;
        const evasionAngleLeft = (missileAngle - 90 + 360) % 360;
        
        let bestEvasionAngle;
        
        const rightEvadeX = tank.x + Math.cos(evasionAngleRight * Math.PI / 180) * 50;
        const rightEvadeY = tank.y + Math.sin(evasionAngleRight * Math.PI / 180) * 50;
        const leftEvadeX = tank.x + Math.cos(evasionAngleLeft * Math.PI / 180) * 50;
        const leftEvadeY = tank.y + Math.sin(evasionAngleLeft * Math.PI /180) * 50;
        
        const rightWallProximity = Math.min(
            arena.width/2 - Math.abs(rightEvadeX),
            arena.height/2 - Math.abs(rightEvadeY)
        );
        
        const leftWallProximity = Math.min(
            arena.width/2 - Math.abs(leftEvadeX),
            arena.height/2 - Math.abs(leftEvadeY)
        );
        
        const currentAngleDifferenceRight = Math.abs(tank.angleDifference(tank.bodyAim, evasionAngleRight));
        const currentAngleDifferenceLeft = Math.abs(tank.angleDifference(tank.bodyAim, evasionAngleLeft));
        
        const rightScore = rightWallProximity - (currentAngleDifferenceRight / 180) * 30;
        const leftScore = leftWallProximity - (currentAngleDifferenceLeft / 180) * 30;
        
        bestEvasionAngle = (rightScore > leftScore) ? evasionAngleRight : evasionAngleLeft;
        
        if (missileThreatLevel > 0.2) {
            if (timeToImpactEstimate < 15 && Math.abs(trajectoryDifference) < 20) {
                tank.retained.emergencyEvade = 10;
                
                let bodyAngleDifference = tank.angleDifference(tank.bodyAim, bestEvasionAngle);
                tank.bodyTurn = Math.max(-1, Math.min(1, bodyAngleDifference / 3));
                tank.speed = 1;
                
                if (Math.abs(bodyAngleDifference) > 120) {
                    tank.speed = -1;
                }
                
                tank.retained.lastDodgeDirection = bestEvasionAngle;
            }
            else {
                const urgency = Math.min(1, missileThreatLevel * 2);
                
                let bodyAngleDifference = tank.angleDifference(tank.bodyAim, bestEvasionAngle);
                
                tank.bodyTurn = (tank.bodyTurn * (1 - urgency)) +
                               (Math.max(-1, Math.min(1, bodyAngleDifference / 5)) * urgency);
                
                tank.speed = Math.min(1, Math.abs(tank.speed) + 0.3 * urgency) * (tank.speed >= 0 ? 1 : -1);
                
                tank.retained.evading = 3;
            }
        }
        
        const interceptionAimThreshold = 7 + 3 * missile.distance / maxDistance;
        if (Math.abs(trajectoryDifference) > 30 &&
            timeToImpactEstimate > 15 &&
            tank.energy > missile.energy * 2 &&
            !tank.retained.emergencyEvade) {
            
            const interceptTime = timeToImpactEstimate / 2;
            const predictedX = missile.x + missile.actualSpeed * interceptTime * Math.cos(missile.aim * Math.PI / 180);
            const predictedY = missile.y + missile.actualSpeed * interceptTime * Math.sin(missile.aim * Math.PI / 180);
            const desiredGunAim = tank.angleTo(predictedX, predictedY);
            const aimDifference = tank.angleDifference(tank.bodyAim + tank.gunAim, desiredGunAim);
            
            if (Math.abs(aimDifference) < interceptionAimThreshold) {
                if (missile.energy > 50) {
                    tank.firePower = Math.min(missile.energy + 50, tank.energy * 0.3);
                }
            }
        }
        
        tank.retained.missileThreat = tank.detectedMissiles.reduce((sum, missile) => sum + missile.energy * (1 - Math.min(1, missile.distance / arena.width)), 0);
    }
    
    else {
        tank.retained.missileEvasionReverse = 0;
        tank.retained.missileThreat = 0;
    }


    const collision = tank.tankCollision || tank.missileCollision;
    if (collision) {
        tank.retained.collisionAngle = collision.angle;
        tank.retained.collisionDamage = collision.damage;
        tank.retained.collisionCoolDown = 36;
    }
    const collisionIsBiggestThreat = tank.retained.collisionDamage > tank.retained.missileThreat;
    if (tank.retained.collisionCoolDown && collisionIsBiggestThreat && arena.tanksRemaining > 2) {
        const desiredGunTurn = tank.angleDifference(tank.bodyAim + tank.gunAim, tank.retained.collisionAngle);
        tank.gunTurn = desiredGunTurn / 10;
    }
    if (tank.retained.collisionCoolDown) {
        const directionDifference = tank.angleDifference(tank.bodyAim, tank.retained.collisionAngle + 90);
        tank.bodyTurn = directionDifference / 10;
        tank.speed = tank.retained.collisionCoolDown / 36;
        if (Math.abs(tank.retained.collisionAngle) > 90) {
            tank.bodyTurn *= -tank.bodyTurn;
            tank.speed *= -1;
        }
    }

    const proximityThreshold = (tank.size + Math.abs(tank.speed) * 3) * 3;
    
    const distanceToRightWall = arena.width/2 - tank.x;
    const distanceToLeftWall = arena.width/2 + tank.x;
    const distanceToTopWall = arena.height/2 - tank.y;
    const distanceToBottomWall = arena.height/2 + tank.y;
    
    const closestWallDistance = Math.min(
        distanceToRightWall,
        distanceToLeftWall,
        distanceToTopWall,
        distanceToBottomWall
    );
    
    const isNearWall = closestWallDistance < proximityThreshold;
    
    if (isNearWall) {
        let targetX = tank.x;
        let targetY = tank.y;
        
        if (closestWallDistance === distanceToRightWall) {
            targetX = tank.x - proximityThreshold;
        } else if (closestWallDistance === distanceToLeftWall) {
            targetX = tank.x + proximityThreshold;
        } else if (closestWallDistance === distanceToTopWall) {
            targetY = tank.y - proximityThreshold;
        } else if (closestWallDistance === distanceToBottomWall) {
            targetY = tank.y + proximityThreshold;
        }
        
        if (closestWallDistance < tank.size * 1.5) {
            targetX = 0;
            targetY = 0;
        }
        
        const escapeAngle = tank.angleTo(targetX, targetY);
        let bodyAngleDifference = tank.angleDifference(tank.bodyAim, escapeAngle);
        
        const wallDangerFactor = 1 - (closestWallDistance / proximityThreshold);
        tank.bodyTurn = Math.max(-1, Math.min(1, bodyAngleDifference / (3 * (1 - wallDangerFactor))));
        
        tank.speed = 0.7 + (wallDangerFactor * 0.3);
        
        if (Math.abs(bodyAngleDifference) > 120) {
            tank.speed *= -1;
        }
        
        tank.retained.avoidingWall = true;
        tank.retained.lastWallAvoidanceAngle = escapeAngle;
    } else {
        tank.retained.avoidingWall = false;
    }

    if (arena.tanksRemaining === 1 && !tank.retained.matchOver && tank.energy > 0) {
        tank.retained.matchOver = true;
        tank.retained.wins++;
        tank.commitMemory("winCount", tank.retained.wins);
        tank.gunTurn = 1;
        tank.bodyTurn = -0.5;
        tank.speed = 0.5;
    }

    if (tank.retained.missileEvasionReverse > 0) {
        tank.retained.missileEvasionReverse--;
    }
    else if (tank.retained.missileEvasionReverse < 0) {
        tank.retained.missileEvasionReverse = 0;
    }
    if (tank.retained.collisionCoolDown > 0) {
        tank.retained.collisionCoolDown--;
    }
    else if (tank.retained.collisionCoolDown < 0) {
        tank.retained.collisionCoolDown = 0;
        tank.retained.collisionAngle = tank.retained.target?.angleTo || tank.angleTo(0, 0);
    }
    
    if (tank.retained.emergencyEvade) {
        tank.retained.emergencyEvade--;
        if (tank.retained.emergencyEvade > 0) {
            if (tank.retained.lastDodgeDirection) {
                const bodyAngleDifference = tank.angleDifference(tank.bodyAim, tank.retained.lastDodgeDirection);
                tank.bodyTurn = Math.max(-1, Math.min(1, bodyAngleDifference / 3));
                tank.speed = 1;
            }
        }
    }
    
    if (tank.retained.evading) {
        tank.retained.evading--;
    }
    
    tank.gunTurn -= tank.bodyTurn;
    
    // Prioritize wall avoidance over proximity to other tanks.
    if (tank.retained.avoidingWall) {
        return tank;
    }

    // Tank Proximity Check and Avoidance
    if (tank.detectedTanks.length > 0) {
        let closestTankDistance = Infinity;
        let closestTank = null;

        for (const otherTank of tank.detectedTanks) {
            const distance = tank.distanceTo(otherTank.x, otherTank.y);
            if (distance < closestTankDistance) {
                closestTankDistance = distance;
                closestTank = otherTank;
            }
        }

        tank.retained.closestEnemyDistance = closestTankDistance;
        const tooCloseThreshold = tank.size * 4;
        if (closestTankDistance < tooCloseThreshold) {
             const awayAngle = tank.angleTo(closestTank.x, closestTank.y) + 180;
             let bodyAngleDifference = tank.angleDifference(tank.bodyAim, awayAngle);
             tank.bodyTurn = Math.max(-1, Math.min(1, bodyAngleDifference / 5));
             tank.speed = -0.8;
        }
    }

    if (tank.firePower) {
        tank.fire(1)
    }

    return tank;
}
