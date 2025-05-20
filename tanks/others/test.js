function tankAMain(tank, arena) {

    const saved = tank.retained;
    const RAMPS_FUNCTIONS = rampsFunctions(tank, arena, saved);
    const isWallCollision = RAMPS_FUNCTIONS.isWallCollision;
    const predictFuturePosition = RAMPS_FUNCTIONS.predictFuturePosition;

    // Initialize tank
    if (tank.iteration === 0) {
        saved.target = {};
        saved.targetHistory = [];
    }


    // Calculate number of frames until wall collision
    let collision = false;
    let framesUntilWallCollision = 0;
    while (framesUntilWallCollision < 10 && !collision) {
        const predicted = predictFuturePosition(tank, ++framesUntilWallCollision);
        collision = isWallCollision(predicted.x, predicted.y);
    }

    // Update targets information
    if (tank.detectedTanks.length > 0) {
        const target = tank.detectedTanks[0];
        saved.targetHistory.push(target);
        for (let i = saved.targetHistory.length - 1; i > 0; i--) {
            let current = saved.targetHistory[i];
            let previous = saved.targetHistory[i - 1];
            saved.targetHistory[i - 1].bodyTurn = (current.bodyAim - previous.bodyAim) / MAX_BODY_TURN_DEGREES;
            saved.targetHistory[i].bodyTurn = saved.targetHistory[i - 1].bodyTurn;
        }
    }

}


function rampsFunctions(tank, arena, saved) {
    const HALF_WIDTH = arena.width / 2;
    const HALF_HEIGHT = arena.height / 2;
    
    return {

        getTargetPriority: (target) => {
            const accuracyFactor = (1 - Math.abs(tank.angleDifference(tank.bodyAim + tank.gunAim, target.angleTo)) / (tank.radarArc * MAX_RADAR_ARC_DEGREES)) ** 2;
            const trajectoryFactor = (1 - Math.abs(tank.perpendicularSpeedComponent(target)));
            const distanceFactor = (1 - target.distance / MAX_DISTANCE) ** 2;
            const energyFactor = (1 - target.energy / (saved.maxTargetEnergy || 1000));
            const speedFactor = 1 - Math.abs(target.speed);
            const gunHeatFactor = (1 - Math.min(1, 1 / Math.max(1, target.gunHeat))) ** (1 / 2);
            const hitProbability = accuracyFactor * 0.4 + trajectoryFactor * 0.3 + distanceFactor * 0.2 + speedFactor * 0.1;
            const vulnerabilityFactor = energyFactor * 0.6 + speedFactor * 0.25 + gunHeatFactor * 0.15;
            return (hitProbability * 4 + vulnerabilityFactor) / 5;
        },

        getMissilePriority: (missile) => {
            const perfectTrajectory = (Math.atan2(tank.y - missile.y, tank.x - missile.x) * DEGREES + 36000) % 360;
            const trajectoryDifference = tank.angleDifference(perfectTrajectory, missile.aim);
            const trajectoryFactor = (1 - Math.abs(trajectoryDifference) / 180);
            const distanceFactor = 1 - (missile.distance / MAX_DISTANCE);
            const energyFactor = 1 - (missile.energy - MAX_MISSILE_ENERGY);
            return trajectoryFactor * 0.4 + distanceFactor * 0.4 + energyFactor * 0.2;
        },

        predictFuturePosition: (subject, frames = 1) => {
            if (frames === 0) {
                return { x: subject.x, y: subject.y, bodyAim: subject.bodyAim };
            }
            let predictedAim = subject.bodyAim;
            let predictedX = subject.x;
            let predictedY = subject.y;
            for (let i = 0; i < frames; i++) {
                predictedAim = predictedAim + subject.bodyTurn * MAX_BODY_TURN_DEGREES;
                predictedX = predictedX + subject.actualSpeed * this.dCos(predictedAim);
                predictedY = predictedY + subject.actualSpeed * this.dSin(predictedAim);
            }
            return { x: predictedX, y: predictedY, bodyAim: predictedAim };
        },

        dSin: (angle) => Math.sin(angle * DEGREES),

        dCos: (angle) => Math.cos(angle * DEGREES),

        isWallCollision: (x, y) => Math.abs(x) > HALF_WIDTH - tank.size || Math.abs(y) > HALF_HEIGHT - tank.size,
    }

}