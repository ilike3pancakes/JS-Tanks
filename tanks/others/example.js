function tankBMain(tank, arena) {

    // Aesthetics
    tank.name = "Example Tank";
    tank.color = "#556b2f";
    tank.fillColor = "#3b5323";
    tank.treadColor = "#222222";
    tank.gunColor = "#8b1a1a";
    tank.radarColor = "#556b2f";
    
    // Handle targeting
    const targets = tank.detectedTanks;
    if (targets.length > 0) {
        const target = targets[0];  // pick a target
        
        // Firing logic
        let aimDifference = target.angleTo - (tank.bodyAim + tank.gunAim);  // calculate the difference in the targets position and the guns aim
        aimDifference = (aimDifference + 36000) % 360;  // normalize the aim difference between 0 and 360
        if (aimDifference > 180) aimDifference -= 360;  // normalize the aim difference between -180 and 180
        const aimError = Math.abs(aimDifference); // calculate the aim error
        tank.gunTurn = aimDifference / 10 - tank.bodyTurn; // turn the gun to the desired position (accounting for the body turning)
        if (aimError < 5) {
            tank.fire = 5; // if shot is good enough fire at the target
            // Driving logic (chase target)
            const turnDifference = target.angleTo - tank.bodyAim; // calculate the body turn required to drive toward target
            tank.bodyTurn = turnDifference / 10; // turn the tank toward the target
            tank.speed = 1; // drive toward the target
        }
    }
    
    // Scanning logic
    else {
        if (!tank.speed) tank.speed = 1; // if the tank isnt moving then start driving
        tank.bodyTurn = 0;  // drive in a straight line
        tank.gunTurn = 1;   // turn the turret to scan for targets
    }

    // Avoid walls
    const nextX = tank.x + tank.speed * Math.cos(tank.bodyAim * Math.PI / 180); // calculate the tanks next x position
    const nextY = tank.y + tank.speed * Math.sin(tank.bodyAim * Math.PI / 180); // calculate the tanks next y position
    const proximityThreshold = tank.size * 5; // pick a maximum safe distance from walls
    const hitsHorizontalWall = Math.abs(nextX) > arena.width - proximityThreshold; // will the tank hit a horizontal wall?
    const hitsVerticalWall = Math.abs(nextY) > arena.height - proximityThreshold; // will the tank hit a vertical wall?
    if (hitsHorizontalWall || hitsVerticalWall) tank.speed -= 1; // reverse to avoid wall

    return tank; // this function MUST return the modified `tank` object

}