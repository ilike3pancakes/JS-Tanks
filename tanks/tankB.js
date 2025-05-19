function tankBMain(tank, arena) {
    // Adjust base constants to match Tank A's effectiveness
    const CRITICAL_ENERGY = 150; // Lower threshold for more aggressive play
    const LOW_ENERGY = 300; // Earlier energy conservation
    const OPTIMAL_RANGE = arena.width * 0.2; // Slightly further range for better survival
    const MIN_CHARGE_ITERATIONS = 200; // Faster mode switching
    const saved = tank.retained;

    // Add memory helper functions
    if (!tank.getMemory) {
        tank.commitMemory = (key, value) => {
            localStorage.setItem(`tank_${encodeURIComponent(tank.name)}_${encodeURIComponent(key)}`, JSON.stringify(value));
        };
        
        tank.getMemory = (key) => {
            const value = localStorage.getItem(`tank_${encodeURIComponent(tank.name)}_${encodeURIComponent(key)}`);
            return value ? JSON.parse(value) : undefined;
        };
        
        tank.forgetMemory = (key) => {
            localStorage.removeItem(`tank_${encodeURIComponent(tank.name)}_${encodeURIComponent(key)}`);
        };
    }

    // Add Tank A's constants at the top
    const LEARNING_ENABLED = false;
    const COLLISION_COOLDOWN_TIME = 36;
    const DEGREES = Math.PI / 180;
    const RADIANS = 180 / Math.PI;
    const MAX_DISTANCE = Math.sqrt(arena.width ** 2 + arena.height ** 2);
    const MAX_RADAR_ARC_DEGREES = 180;
    const MAX_BODY_TURN_DEGREES = 1;
    const MAX_GUN_TURN_DEGREES = 2;
    const MISSILE_SPEED = 4;
    const MAX_MISSILE_ENERGY = 50;
    const MISSILE_ENERGY_MULTIPLIER = 4;

    // Add helper functions after memory helpers
    if (!tank.getTargetPriority) {
        tank.angleDifference = (a1, a2) => {
            a1 = (a1 + 360000) % 360;
            a2 = (a2 + 360000) % 360;
            if (a1 > 180) a1 -= 360;
            if (a2 > 180) a2 -= 360;
            return (a2 - a1 + 180) % 360 - 180;
        };

        tank.calculateGunTurn = (x, y) => {
            const targetAngle = Math.atan2(y - tank.y, x - tank.x) * 180 / Math.PI;
            let gunAngleDifference = tank.angleDifference(tank.bodyAim + tank.gunAim, targetAngle);
            return Math.max(-1, Math.min(1, gunAngleDifference / 10));
        };

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
            const perfectTrajectory = (Math.atan2(tank.y - missile.y, tank.x - missile.x) * RADIANS + 36000) % 360;
            const trajectoryDifference = tank.angleDifference(perfectTrajectory, missile.aim);
            const trajectoryFactor = (1 - Math.abs(trajectoryDifference) / 180);
            const distanceFactor = 1 - (missile.distance / MAX_DISTANCE);
            const energyFactor = 1 - (missile.energy - MAX_MISSILE_ENERGY);
            return trajectoryFactor * 0.4 + distanceFactor * 0.4 + energyFactor * 0.2;
        };
    }

    // Initialize on first run or state reset
    if (tank.iteration === 0) {
        // Load previous state if it exists
        const savedState = tank.getMemory("tankState");
        const phaseOpt = tank.getMemory("phaseOptimization");
        
        if (savedState) {
            saved.targetHistory = savedState.targetHistory || [];
            saved.successfulShots = savedState.successfulShots || 0;
            saved.totalShots = savedState.totalShots || 0;
            saved.mode = savedState.mode || 'conservation';
            saved.berserkKills = savedState.berserkKills || 0;
            saved.lastModeSwitch = 0; // Reset on new match
        }

        // Initialize or restore phase optimization
        saved.phaseOptimization = phaseOpt || {
            berserkThreshold: 450, // Lowered from 600
            conservationThreshold: 200, // Lower exit threshold
            minModeDuration: 150, // Shorter duration
            successfulBerserkPhases: 0,
            totalBerserkPhases: 0,
            averageKillsPerBerserk: 0,
            bestEnergyRatio: 0.7, // Increased ratio for more berserk time
            learningRate: 0.08, // More aggressive learning
            matchesPlayed: savedState ? (savedState.matchesPlayed || 0) + 1 : 0
        };

        // Initialize current phase stats
        saved.currentPhaseStats = {
            startEnergy: tank.energy,
            damageDealt: 0,
            damageReceived: 0,
            startTime: tank.iteration
        };

        // Rest of initialization
        tank.name = "AggressiveMiser";
        tank.color = "#800000"; // More aggressive red base color
        tank.fillColor = "#600000";
        tank.treadColor = "#400000";
        tank.gunColor = "#FF0000";
        tank.radarArc = 0.8; // Narrower arc for better tracking
        saved.targetHistory = [];
        saved.lastFireTime = 0;
        saved.evasionMode = false;
        saved.lastShotEnergy = 0;
        saved.lastShotHit = false;
        saved.successfulShots = 0;
        saved.totalShots = 0;
        saved.lastShotId = null;
        saved.mode = 'conservation'; // Start in conservation mode
        saved.berserkKills = 0;
        saved.lastModeSwitch = 0;
        
        // Load or initialize learning data
        const storedData = tank.getMemory("phaseOptimization");
        saved.phaseOptimization = storedData || {
            berserkThreshold: 300,
            conservationThreshold: 400,
            minModeDuration: 100,
            successfulBerserkPhases: 0,
            totalBerserkPhases: 0,
            averageKillsPerBerserk: 0,
            bestEnergyRatio: 0.5, // Target ratio of time spent in berserk mode
            learningRate: 0.05,
            matchesPlayed: 0
        };
        
        saved.currentPhaseStats = {
            startEnergy: tank.energy,
            damageDealt: 0,
            damageReceived: 0,
            startTime: tank.iteration
        };
        
        saved.chargeStartIteration = 0;
        saved.forceCharging = false;
        saved.positionHistory = [];
        saved.lastAreaChange = 0;
        saved.currentArea = { x: 0, y: 0 };
        
        // Add missing initializations
        saved.previousTargetData = [];
        saved.lastTarget = null;
        saved.scanDirection = 0;
    }

    // Periodic state saving (every 200 iterations)
    if (tank.iteration % 200 === 0) {
        const stateToSave = {
            targetHistory: saved.targetHistory,
            successfulShots: saved.successfulShots,
            totalShots: saved.totalShots,
            mode: saved.mode,
            berserkKills: saved.berserkKills,
            matchesPlayed: saved.phaseOptimization.matchesPlayed,
            lastSavedIteration: tank.iteration,
            phaseOptimization: saved.phaseOptimization,
            chargeStartIteration: saved.chargeStartIteration,
            forceCharging: saved.forceCharging
        };
        
        tank.commitMemory("tankState", stateToSave);
        tank.commitMemory("phaseOptimization", saved.phaseOptimization);
    }

    // Save state before match ends
    if (arena.tanksRemaining <= 2) {
        const stateToSave = {
            targetHistory: saved.targetHistory,
            successfulShots: saved.successfulShots,
            totalShots: saved.totalShots,
            mode: saved.mode,
            berserkKills: saved.berserkKills,
            matchesPlayed: saved.phaseOptimization.matchesPlayed,
            lastSavedIteration: tank.iteration
        };
        tank.commitMemory("tankState", stateToSave);
    }

    // Track missile hits with persistent state
    if (saved.lastShotId && tank.missiles[saved.lastShotId]) {
        const missile = tank.missiles[saved.lastShotId];
        if (missile.hit || missile.miss) {
            saved.lastShotHit = missile.hit;
            if (missile.hit) {
                saved.successfulShots++;
                // Save state on successful hit
                tank.commitMemory("tankState", {
                    ...tank.getMemory("tankState"),
                    successfulShots: saved.successfulShots
                });
            }
            saved.totalShots++;
            saved.lastShotId = null;
        }
    }

    // Track phase performance
    if (saved.lastShotId && tank.missiles[saved.lastShotId]) {
        const missile = tank.missiles[saved.lastShotId];
        if (missile.hit) {
            saved.currentPhaseStats.damageDealt += saved.lastShotEnergy * 4;
        }
    }

    // Track damage received
    if (tank.missileCollision) {
        saved.currentPhaseStats.damageReceived += tank.missileCollision.damage;
    }

    // Enhanced mode switching logic with learned thresholds
    const BERSERK_THRESHOLD = saved.phaseOptimization.berserkThreshold;
    const CONSERVATION_THRESHOLD = saved.phaseOptimization.conservationThreshold;
    const MIN_MODE_DURATION = saved.phaseOptimization.minModeDuration;

    // Calculate charging conditions using iterations
    const iterationsInCharging = saved.mode === 'conservation' ? 
        tank.iteration - saved.chargeStartIteration : 0;
    const hasChargedLongEnough = iterationsInCharging > MIN_CHARGE_ITERATIONS;
    const shouldEnterBerserk = tank.energy > BERSERK_THRESHOLD && 
        saved.mode === 'conservation' && 
        hasChargedLongEnough && 
        !saved.forceCharging;
    const shouldEnterConservation = (tank.energy < CONSERVATION_THRESHOLD && 
        saved.mode === 'berserk') || saved.forceCharging;
    
    if ((shouldEnterBerserk || shouldEnterConservation) && 
        (tank.iteration - saved.lastModeSwitch > MIN_MODE_DURATION)) {
        
        // Evaluate previous phase performance
        const phaseDuration = tank.iteration - saved.currentPhaseStats.startTime;
        const energyEfficiency = (tank.energy - saved.currentPhaseStats.startEnergy) / phaseDuration;
        const damageEfficiency = saved.currentPhaseStats.damageDealt / 
            (saved.currentPhaseStats.damageReceived || 1);

        if (saved.mode === 'berserk') {
            saved.phaseOptimization.totalBerserkPhases++;
            if (damageEfficiency > 1.5 && energyEfficiency > -2) {
                saved.phaseOptimization.successfulBerserkPhases++;
            }
            // Force charging mode after berserk if energy is low
            if (tank.energy < BERSERK_THRESHOLD * 0.8) {
                saved.forceCharging = true;
            }
        }

        // Switch modes and reset stats
        saved.mode = shouldEnterBerserk ? 'berserk' : 'conservation';
        if (saved.mode === 'conservation') {
            saved.chargeStartIteration = tank.iteration;
        }
        saved.lastModeSwitch = tank.iteration;
        saved.currentPhaseStats = {
            startEnergy: tank.energy,
            damageDealt: 0,
            damageReceived: 0,
            startTime: tank.iteration
        };

        // Reset force charging when energy is high enough
        if (tank.energy > BERSERK_THRESHOLD * 1.1) {
            saved.forceCharging = false;
        }
    }

    // Adjust thresholds based on performance when match ends
    if (arena.tanksRemaining === 1) {
        const opt = saved.phaseOptimization;
        opt.matchesPlayed++;
        
        if (opt.totalBerserkPhases > 0) {
            const successRate = opt.successfulBerserkPhases / opt.totalBerserkPhases;
            const currentRatio = opt.successfulBerserkPhases / (tank.iteration || 1);
            
            // Adjust thresholds based on performance
            if (currentRatio < opt.bestEnergyRatio && successRate > 0.6) {
                // Make it easier to enter berserk mode
                opt.berserkThreshold = Math.max(600, opt.berserkThreshold * (1 - opt.learningRate));
                opt.conservationThreshold = Math.max(300, opt.conservationThreshold * (1 - opt.learningRate));
            } else if (currentRatio > opt.bestEnergyRatio && successRate < 0.4) {
                // Make it harder to enter berserk mode
                opt.berserkThreshold = Math.min(950, opt.berserkThreshold * (1 + opt.learningRate));
                opt.conservationThreshold = Math.min(500, opt.conservationThreshold * (1 + opt.learningRate));
            }
            
            // Adjust phase duration based on success rate
            opt.minModeDuration = Math.max(50, Math.min(150, 
                opt.minModeDuration * (successRate > 0.5 ? 1.1 : 0.9)
            ));
        }

        // Save optimizations to localStorage
        tank.commitMemory("phaseOptimization", opt);
        
        // Reset phase counters
        opt.successfulBerserkPhases = 0;
        opt.totalBerserkPhases = 0;
    }

    // Mode switching logic
    // (Handled above with learned thresholds and MIN_MODE_DURATION)
    // No need to redeclare shouldEnterBerserk/shouldEnterConservation here.

    // Random mode switching - make it more aggressive
    if (tank.iteration % 200 === 0 && !saved.forceCharging) {
        if (Math.random() < 0.6 && tank.energy > CRITICAL_ENERGY * 2) { // 60% chance, relaxed energy requirement
            saved.mode = 'berserk';
            saved.lastModeSwitch = tank.iteration;
        }
    }

    // Keep existing energy-based mode switching as fallback
    const shouldForceBerserk = tank.energy > tank.maxEnergy * 0.95; // Increased from 0.9
    const shouldForceConservation = tank.energy < CRITICAL_ENERGY * 1.2; // Reduced from 1.5
    
    if (shouldForceBerserk && saved.mode === 'conservation') {
        saved.mode = 'berserk';
        saved.lastModeSwitch = tank.iteration;
    } else if (shouldForceConservation && saved.mode === 'berserk') {
        saved.mode = 'conservation';
        saved.lastModeSwitch = tank.iteration;
        saved.forceCharging = true;
    }

    // Original mode switching logic becomes fallback
    if (!saved.forceCharging && tank.iteration - saved.lastModeSwitch > MIN_MODE_DURATION) {
        // Evaluate previous phase performance
        const phaseDuration = tank.iteration - saved.currentPhaseStats.startTime;
        const energyEfficiency = (tank.energy - saved.currentPhaseStats.startEnergy) / phaseDuration;
        const damageEfficiency = saved.currentPhaseStats.damageDealt / 
            (saved.currentPhaseStats.damageReceived || 1);

        if (saved.mode === 'berserk') {
            saved.phaseOptimization.totalBerserkPhases++;
            if (damageEfficiency > 1.5 && energyEfficiency > -2) {
                saved.phaseOptimization.successfulBerserkPhases++;
            }
            // Force charging mode after berserk if energy is low
            if (tank.energy < BERSERK_THRESHOLD * 0.8) {
                saved.forceCharging = true;
            }
        }

        // Switch modes and reset stats
        saved.mode = shouldEnterBerserk ? 'berserk' : 'conservation';
        if (saved.mode === 'conservation') {
            saved.chargeStartIteration = tank.iteration;
        }
        saved.lastModeSwitch = tank.iteration;
        saved.currentPhaseStats = {
            startEnergy: tank.energy,
            damageDealt: 0,
            damageReceived: 0,
            startTime: tank.iteration
        };

        // Reset force charging when energy is high enough
        if (tank.energy > BERSERK_THRESHOLD * 1.1) {
            saved.forceCharging = false;
        }
    }

    // Enhanced energy state with mode consideration
    const energyState = {
        critical: tank.energy < CRITICAL_ENERGY,
        low: tank.energy < LOW_ENERGY,
        ratio: tank.energy / 1000,
        efficient: tank.energy > 900, // Higher efficiency threshold
        mode: saved.mode,
        canFire: function(cost) {
            const threshold = this.mode === 'berserk' ? 
                CRITICAL_ENERGY * 0.3 : // Even more aggressive in berserk
                CRITICAL_ENERGY * 1.5;  // More conservative in normal mode
            return tank.energy - cost > threshold;
        }
    };

    // Replace targeting and shooting block with Tank A's exact logic
    if (tank.detectedTanks.length > 0) {
        // Sort targets by priority using Tank A's method
        tank.detectedTanks = tank.detectedTanks.sort((a, b) => tank.getTargetPriority(b) - tank.getTargetPriority(a));
        const target = tank.detectedTanks[0];
        saved.target = { ...target }; // Store target info like Tank A

        // Add Tank A's energy conservation checks
        const targetsFarEnough = target.distance > arena.width / 4;
        const targetsGunIsCoolEnough = target.gunHeat > target.distance / 80;
        const targetHasEnergyAdvantage = target.energy * 3 > tank.energy;

        // Rest of targeting code
        if ((targetHasEnergyAdvantage && targetsFarEnough && targetsGunIsCoolEnough) || 
            (saved.mode === 'conservation' && target.energy > tank.energy)) {
            tank.speed = 0;
        }

        // Store target velocity data like Tank A
        saved.previousTargetData.push({ x: target.x, y: target.y, angle: target.bodyAim, time: tank.iteration });
        if (saved.previousTargetData.length > 5) saved.previousTargetData.shift();

        // Calculate velocity exactly like Tank A
        let avgVelocityX = 0, avgVelocityY = 0;
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
            avgVelocityX /= Math.max(1, totalDeltaTime);
            avgVelocityY /= Math.max(1, totalDeltaTime);
        } else {
            avgVelocityX = target.actualSpeed * Math.cos(target.bodyAim * DEGREES);
            avgVelocityY = target.actualSpeed * Math.sin(target.bodyAim * DEGREES);
        }

        // Use Tank A's exact intercept calculation
        let timeToIntercept = target.distance / MISSILE_SPEED;
        const baseIterations = 5;
        const velocityFactor = Math.abs(target.speed);
        const distanceFactor = target.distance / arena.width;
        const iterations = baseIterations + (velocityFactor + distanceFactor) * baseIterations;

        for (let i = 0; i < iterations; i++) {
            const predictedX = target.x + avgVelocityX * timeToIntercept;
            const predictedY = target.y + avgVelocityY * timeToIntercept;
            timeToIntercept = Math.sqrt(
                Math.pow(predictedX - tank.x, 2) + 
                Math.pow(predictedY - tank.y, 2)
            ) / MISSILE_SPEED;
        }

        // Calculate final position and aim
        const predictedX = target.x + avgVelocityX * timeToIntercept;
        const predictedY = target.y + avgVelocityY * timeToIntercept;
        const predictedAngle = Math.atan2(predictedY - tank.y, predictedX - tank.x) * RADIANS;
        const aimDiff = tank.angleDifference(tank.bodyAim + tank.gunAim, predictedAngle);

        tank.gunTurn = Math.max(-1, Math.min(1, aimDiff / 10));

        // Use Tank A's exact firing conditions
        if (tank.gunHeat === 0) {
            const minFirePower = 5;
            const historicAccuracy = saved.successfulShots / Math.max(1, saved.totalShots) || 0.5;
            const aimError = Math.abs(aimDiff);
            const distanceRatio = target.distance / MAX_DISTANCE;
            const hitProbability = (1 - aimError / 20) * (1 - distanceRatio) * historicAccuracy;

            if (hitProbability > 0.3) {
                let firePower = Math.min(50, minFirePower + (45 * hitProbability * historicAccuracy));
                
                // Adjust based on mode
                if (saved.mode === 'conservation') {
                    firePower *= 0.7;
                }

                if (tank.energy > firePower * 3) {
                    saved.lastShotId = tank.fire(firePower);
                    saved.lastShotEnergy = firePower;
                    saved.totalShots++;
                }
            }
        }

        // Tactical positioning with fixed variables
        const optimalRange = saved.mode === 'berserk' ? 
            arena.width * 0.15 : arena.width * 0.25;
        
        if (!targetHasEnergyAdvantage || !targetsFarEnough) {
            if (target.distance < optimalRange * 0.8) {
                tank.speed = -0.5;
            } else if (target.distance > optimalRange * 1.2) {
                tank.speed = 0.5;
            } else {
                tank.speed = 0;
            }
        }
    } else {
        // Reset target tracking when no targets detected
        saved.lastTarget = null;
        if (saved.previousTargetData && saved.previousTargetData.length > 0) {
            saved.previousTargetData = [];
        }
        
        // More efficient scanning pattern
        tank.gunTurn = energyState.critical ? 0.3 : 0.5;
        tank.speed = energyState.low ? 0 : 0.2;
    }

    // Add new missile evasion helper functions after existing helpers
    if (!tank.predictMissileCollision) {
        tank.predictMissileCollision = (missile, timeSteps = 10) => {
            const missileVx = MISSILE_SPEED * Math.cos(missile.aim * DEGREES);
            const missileVy = MISSILE_SPEED * Math.sin(missile.aim * DEGREES);
            const tankVx = tank.speed * Math.cos(tank.bodyAim * DEGREES);
            const tankVy = tank.speed * Math.sin(tank.bodyAim * DEGREES);
            
            for (let t = 1; t <= timeSteps; t++) {
                const missileX = missile.x + missileVx * t;
                const missileY = missile.y + missileVy * t;
                const tankX = tank.x + tankVx * t;
                const tankY = tank.y + tankVy * t;
                const distance = Math.sqrt((missileX - tankX)**2 + (missileY - tankY)**2);
                
                if (distance < tank.size * 2) {
                    return { willCollide: true, timeToCollision: t };
                }
            }
            return { willCollide: false, timeToCollision: Infinity };
        };

        tank.findSafeDirection = (missiles) => {
            const directions = [0, 45, 90, 135, 180, 225, 270, 315];
            let safestDirection = tank.bodyAim;
            let maxSafetyScore = -Infinity;
            
            directions.forEach(direction => {
                let safetyScore = 0;
                // Score based on missile angles and distances
                missiles.forEach(missile => {
                    const angleDiff = Math.abs(tank.angleDifference(missile.aim, direction));
                    const distanceScore = missile.distance / (tank.size * 10);
                    const angleScore = angleDiff / 180;
                    safetyScore += angleScore * distanceScore;
                });
                
                // Add wall avoidance factor
                const potentialX = tank.x + Math.cos(direction * DEGREES) * tank.size * 5;
                const potentialY = tank.y + Math.sin(direction * DEGREES) * tank.size * 5;
                const wallDistance = Math.min(
                    arena.width/2 - Math.abs(potentialX),
                    arena.height/2 - Math.abs(potentialY)
                );
                safetyScore += wallDistance / (tank.size * 10);
                
                if (safetyScore > maxSafetyScore) {
                    maxSafetyScore = safetyScore;
                    safestDirection = direction;
                }
            });
            return safestDirection;
        };
    }

    // Replace the missile evasion block with enhanced logic
    if (tank.detectedMissiles.length > 0) {
        saved.evasionMode = true;
        const dangerousMissiles = tank.detectedMissiles
            .filter(m => m.distance < arena.width * 0.3)
            .sort((a, b) => tank.getMissilePriority(b) - tank.getMissilePriority(a));

        if (dangerousMissiles.length > 0) {
            const immediateThreat = dangerousMissiles[0];
            const collision = tank.predictMissileCollision(immediateThreat);
            
            if (collision.willCollide) {
                // Emergency evasion for imminent collisions
                const safestDirection = tank.findSafeDirection(dangerousMissiles);
                const turnNeeded = tank.angleDifference(tank.bodyAim, safestDirection);
                
                tank.bodyTurn = Math.max(-1, Math.min(1, turnNeeded / 10));
                
                // Adjust speed based on missile proximity and angle
                const angleToMissile = Math.abs(tank.angleDifference(immediateThreat.aim, tank.bodyAim));
                if (angleToMissile < 30) {
                    // Missile coming from front/back - reverse direction
                    tank.speed = -Math.sign(Math.cos((immediateThreat.aim - tank.bodyAim) * DEGREES));
                } else {
                    // Missile coming from sides - maintain perpendicular movement
                    tank.speed = energyState.critical ? 0.7 : 1;
                }
                
                // Emergency boost if multiple missiles are very close
                if (dangerousMissiles.filter(m => m.distance < tank.size * 5).length > 1) {
                    tank.speed = tank.speed * 1.5;
                    tank.bodyTurn *= 1.2;
                }
            } else {
                // Proactive evasion for non-imminent threats
                const safestDirection = tank.findSafeDirection(dangerousMissiles);
                tank.bodyTurn = (safestDirection - tank.bodyAim) / 12;
                tank.speed = 0.6;
            }
            
            // Maintain radar focus on threat source if possible
            if (saved.lastTarget && !energyState.critical) {
                const targetAngle = Math.atan2(saved.lastTarget.y - tank.y, saved.lastTarget.x - tank.x) * RADIANS;
                tank.radarTurn = (targetAngle - (tank.bodyAim + tank.radarAim)) / 15;
            }
        }
    } else {
        saved.evasionMode = false;
    }

    // Improved wall avoidance with energy consideration
    const wallMargin = tank.size * (energyState.low ? 15 : 10);
    const nearWall = Math.min(
        arena.width/2 - Math.abs(tank.x),
        arena.height/2 - Math.abs(tank.y)
    ) < wallMargin;

    if (nearWall) {
        const centerAngle = Math.atan2(-tank.y, -tank.x) * 180 / Math.PI;
        tank.bodyTurn = (centerAngle - tank.bodyAim) / 10;
        tank.speed = Math.min(0.2, tank.speed);  // Even slower near walls
    }

    // Enhanced retreat mode
    if (energyState.critical && !saved.evasionMode) {
        const retreatAngle = Math.atan2(-tank.y, -tank.x) * 180 / Math.PI;
        tank.bodyTurn = (retreatAngle - tank.bodyAim) / 10;
        tank.speed = 0.2;  // Very slow retreat to maximize energy conservation
    }

    // Update color based on charging progress using iterations
    if (energyState.mode === 'berserk') {
        tank.color = "#FF0000";
        tank.fillColor = "#800000";
        tank.gunColor = "#FF4444";
    } else {
        const chargingProgress = Math.min(1, iterationsInCharging / MIN_CHARGE_ITERATIONS);
        const colorIntensity = Math.floor(102 + (chargingProgress * 50)).toString(16);
        tank.color = `#008${colorIntensity}8${colorIntensity}`;
        tank.fillColor = `#006666`;
        tank.gunColor = `#20${colorIntensity}${colorIntensity}`;
    }

    // Track position and manage area occupation
    const AREA_SIZE = arena.width * 0.2; // Size of each area
    const MAX_AREA_TIME = 400; // Maximum time to spend in one area
    const currentArea = {
        x: Math.floor(tank.x / AREA_SIZE),
        y: Math.floor(tank.y / AREA_SIZE)
    };

    // Update position history and check area time
    if (tank.iteration % 10 === 0) { // Update every 10 iterations
        saved.positionHistory.push({
            x: tank.x,
            y: tank.y,
            time: tank.iteration
        });

        // Keep only recent history
        if (saved.positionHistory.length > 30) {
            saved.positionHistory.shift();
        }

        // Check if we've changed areas
        if (currentArea.x !== saved.currentArea.x || currentArea.y !== saved.currentArea.y) {
            saved.currentArea = currentArea;
            saved.lastAreaChange = tank.iteration;
        }
    }

    // Determine if we need to move to a new area
    const timeInCurrentArea = tank.iteration - saved.lastAreaChange;
    const shouldChangeArea = timeInCurrentArea > MAX_AREA_TIME;

    // Modify movement strategy when no targets detected
    if (tank.detectedTanks.length === 0) {
        // ...existing scanning pattern code...
        if (shouldChangeArea) {
            // Pick a new area to move to
            const newArea = {
                x: tank.x + (Math.random() - 0.5) * arena.width * 0.4,
                y: tank.y + (Math.random() - 0.5) * arena.height * 0.4
            };
            
            // Ensure new area is within bounds
            newArea.x = Math.max(-arena.width/2 + wallMargin, 
                               Math.min(arena.width/2 - wallMargin, newArea.x));
            newArea.y = Math.max(-arena.height/2 + wallMargin, 
                               Math.min(arena.height/2 - wallMargin, newArea.y));

            // Calculate angle to new area
            const angleToNewArea = Math.atan2(newArea.y - tank.y, newArea.x - tank.x) * 180 / Math.PI;
            tank.bodyTurn = (angleToNewArea - tank.bodyAim) / 8;
            tank.speed = energyState.low ? 0.3 : 0.5;
        }
    }

    // Modify tactical movement strategy to consider area time
    if (tank.detectedTanks.length > 0 && shouldChangeArea) {
        // ...existing tactical movement code...
        // Add perpendicular component to movement when in area too long
        const perpendicularAngle = tank.bodyAim + (Math.random() > 0.5 ? 90 : -90);
        tank.bodyTurn += (perpendicularAngle - tank.bodyAim) / 16;
        tank.speed *= 1.2; // Slight speed boost to encourage movement
    }

    return tank;
}