# JS Tanks - Coding Challenge (README)

## Creating a Tank

- Edit the `tankA.js` and/or `tankB.js` files located in the `/tanks` directory to implement your tank's logic within the `tankAMain` or `tankBMain` functions.
- The `tankAMain` and `tankBMain` functions accept `tank` and `arena` objects as arguments and must return the modified `tank` object.
- Avoid writing code outside of these functions to prevent global scope issues. Use `tank.retained` for persistent data.


## Energy Usage

- Colliding with a wall results in energy loss determined by your `actualSpeed` and the angle of impact.
- Colliding with another tank results in energy loss determined by the combined `actualSpeed` of both tanks and the angle of impact.
- Moving consumes energy at a rate of `Math.abs(tank.speed) / 10` units per iteration.
- Calling `tank.fire(energy)` will deduct the specified energy from your tank. The missile fired will start with an energy level that is four times the deducted amount.
- If your tank is struck by a missile, the amount of energy you lose is equivalent to the energy the missile had left at the moment of impact.


## Game Interaction and Fair Play

Your tank's code in tankA.js or tankB.js must only interact with the game via the `tank` and `arena` objects passed as arguments
to your main function (`tankAMain` or `tankBMain`). These objects are your sole interfaces for sensing the game and controlling your
tank. Directly accessing or modifying any other game elements, variables, or functions outside of these `tank` and `arena` objects
is considered cheating. It violates the intended game mechanics, creates an unfair advantage, and undermines the integrity of
the challenge. For fair play, limit your code's interaction exclusively to the properties of the input tank and arena objects.


## Game Constants

| Constant Name                    | Data Type    | Description
| -------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------
| `ARENA_HEIGHT`                   | Number       | The height of the arena (same as `arena.height`).
| `ARENA_WIDTH`                    | Number       | The width of the arena (same as `arena.width`).
| `MIN_X`                          | Number       | The minimum possible x-coordinate (equal to `-ARENA_WIDTH / 2`).
| `MAX_X`                          | Number       | The maximum possible x-coordinate (equal to `ARENA_WIDTH / 2`).
| `MIN_Y`                          | Number       | The minimum possible y-coordinate (equal to `-ARENA_HEIGHT / 2`).
| `MAX_Y`                          | Number       | The maximum possible y-coordinate (equal to `ARENA_HEIGHT / 2`).
| `MAX_DISTANCE`                   | Number       | The maximum possible distance in the arena (corner to corner).
| `MISSILE_SPEED`                  | Number       | The speed at which missiles travel.
| `TANK_SIZE`                      | Number       | The size of your tank (radius).
| `MAX_ACTUAL_SPEED`               | Number       | The maximum possible speed for tanks (calculated as tank.speed multiplied by MAX_ACTUAL_SPEED).
| `MAX_BODY_TURN_DEGREES`          | Number       | The maximum amount of body turning rotation per iteration (degrees).
| `MAX_GUN_TURN_DEGREES`           | Number       | The maximum amount of gun turning rotation per iteration (degrees).
| `MAX_RADAR_TURN_DEGREES`         | Number       | The maximum amount of radar turning rotation per iteration (degrees).
| `MAX_RADAR_ARC_DEGREES`          | Number       | The width of the radars arc (degrees).
| `PI`                             | Number       | Equal to `Math.PI` (3.141592653589793)
| `DEGREES`                        | Number       | The conversion factor for converting radians to degrees (equal to `180 / Math.PI`).
| `RADIANS`                        | Number       | The conversion factor for converting degrees to radians (equal to `Math.PI / 180`).
| `DAMAGE_DEALT_POINTS`            | Number       | The amount of points awarded for for damage your tank deals to other tanks (this amount is multiplied by the damage dealt).
| `SURVIVAL_BONUS_POINTS`          | Number       | The amount of bonus points awarded to the winner of the match for survival (this amount is multiplied by the winner's remaining energy.
| `ACCURACY_BONUS_POINTS`          | Number       | The amount of bonus points awarded to the winner of the match for accuracy (this amount is multiplied by the winner's accuracy percentage).


## Read-Only Properties

| Property Name                    | Data Type    | Description
| -------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------
| `arena.height`                   | Number       | The height of the arena. (same as `ARENA_HEIGHT`)
| `arena.width`                    | Number       | The width of the arena. (same as `ARENA.WIDTH`)
| `arena.tanksRemaining`           | Number       | The number of tanks still active in the match.
| `arena.gameCount`                | Number       | The current match number.
| `arena.gameSpeed`                | Number       | The currently selected game speed specified in game settings
| `arena.animate`                  | Number       | `true` if animations are enabled in game settings, false otherwise.
| `arena.sound`                    | Number       | `true` if sound is enabled in game settings, false otherwise.
| `arena.missileInterception`      | Boolean      | `true` if game settings allow intercepting missiles, `false` otherwise.
| `tank.index`                     | Number       | Your tank's unique identifier in the current match.
| `tank.state`                     | String       | The current status of your tank.
| `tank.size`                      | Number       | The physical size (radius) of your tank.
| `tank.iteration`                 | Number       | The current game tick or iteration number of the match.
| `tank.energy`                    | Number       | The amount of energy your tank has remaining.
| `tank.x`                         | Number       | Your tank's current x-coordinate in the arena.
| `tank.y`                         | Number       | Your tank's current y-coordinate in the arena.
| `tank.aimAccuracy`               | Number       | Your tank's calculated accuracy (hits / shots).
| `tank.actualSpeed`               | Number       | The current actual speed of your tank (calculated as tank.speed multiplied by MAX_ACTUAL_SPEED).
| `tank.bodyAim`                   | Number       | The current angle of your tank's body. (degrees, absolute)
| `tank.gunAim`                    | Number       | The current angle of your turret relative to your tank's body (degrees, relative).
| `tank.gunHeat`                   | Number       | The current heat level of your gun (cannot fire if `tank.gunHeat > 0`).
| `tank.radarAim`                  | Number       | The current angle of your radar relative to your tank's body and gun (degrees, relative).
| `tank.tankCollision`             | Object/False | Data about a collision with another tank, or `false` if no collision.
|    - `id`                        | Number       | The `id` of the tank you collided with.
|    - `angle`                     | Number       | The angle to the collision.
|    - `damage`                    | Number       | The amount of damage sustained in the collision.
| `tank.missileCollision`          | Object/False | Data about a collision with a missile, or `false` if no collision.
|    - `ownerId`                   | Number       | The `id` of the tank that fired the missile you collided with.
|    - `angle`                     | Number       | The angle to the collision.
|    - `damage`                    | Number       | The amount of damage sustained in the collision.
| `tank.wallCollision`             | Object/False | Data about a collision with a wall, or `false` if no collision.
|    - `angle`                     | Number       | The angle to the collision.
|    - `damage`                    | Number       | The amount of damage sustained in the collision.
| `tank.missiles[id]`              | Object       | Data about the missile you fired with the given `id`.
|    - `iterationFired`            | Number       | The `tank.iteration` when the missile was fired.
|    - `x`                         | Number       | The current x-coordinate of the specified missile in the arena.
|    - `y`                         | Number       | The current y-coordinate of the specified missile in the arena.
|    - `aim`                       | Number       | The angle the specified missile is heading (in degrees, absolute).
|    - `energy`                    | Number       | The amount of energy the specified missile has remaining.
|    - `size`                      | Number       | The physical size (radius) of the specified missile.
|    - `miss`                      | Boolean      | `true` if the specified missile has hit a wall or ran out of energy, `false` otherwise.
|    - `hit`                       | Boolean      | `true` if the specified missile has hit a tank, `false` otherwise.
| `tank.detectedTanks[index]`      | Array        | Data about a mtank detected by your radar at the given `index` (sorted by distance).
|    - `index`                     | Number       | The index of the detected tank.
|    - `name`                      | String       | The name of the detected tank.
|    - `energy`                    | Number       | The amount of energy the detected tank has remaining.
|    - `gunHeat`                   | Number       | The current heat level of the detected tank's gun.
|    - `size`                      | Number       | The physical size (radius) of the detected tank.
|    - `color`                     | String       | The outline color of the detected tank's body (hexadecimal).
|    - `fillColor`                 | String       | The fill color of the detected tank's body (hexadecimal).
|    - `gunColor`                  | String       | The color of the detected tank's gun (hexadecimal).
|    - `radarColor`                | String       | The color of the detected tank's radar (hexadecimal).
|    - `treadColor`                | String       | The color of the detected tank's treads (hexadecimal).
|    - `angleTo`                   | Number       | The angle (in degrees) from your tank to the detected tank.
|    - `distance`                  | Number       | The distance between your tank and the detected tank.
|    - `x`                         | Number       | The current x-coordinate of the detected tank in the arena.
|    - `y`                         | Number       | The current y-coordinate of the detected tank in the arena.
|    - `bodyAim`                   | Number       | The current angle of the detected tank's body (in degrees, absolute).
|    - `speed`                     | Number       | The speed controller for the detected tank (-1 to 1).
|    - `actualSpeed`               | Number       | The actual speed of the detected tank (`speed * MAX_ACTUAL_SPEED`).
| `tank.detectedMissiles[index]`   | Array        | Data about a missile detected by your radar at the given `index` (sorted by distance).
|    - `energy`                    | Number       | The remaining energy of the detected missile.
|    - `size`                      | Number       | The physical size (radius) of the detected missile.
|    - `angleTo`                   | Number       | The angle (in degrees) from your tank to the detected missile.
|    - `distance`                  | Number       | The distance between your tank and the detected missile.
|    - `x`                         | Number       | The current x-coordinate of the detected missile in the arena.
|    - `y`                         | Number       | The current y-coordinate of the detected missile in the arena.
|    - `aim`                       | Number       | The current aim angle of the detected missile (in degrees, absolute).
|    - `speed`                     | Number       | The speed controller for the detected missile (normalized, will always be `1`).
|    - `actualSpeed`               | Number       | The actual speed of the detected missile (will always be `MISSILE_SPEED`).
|    - `ownersIndex`               | Number       | The index of the tank that fired the detected missile.


## Controllable Properties

| Property Name                    | Data Type   | Acceptable Value       | Default Value | Description
| -------------------------------- | ----------- | ---------------------- | ------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------
| `tank.name`                      | String      | Max Length: 20         | "Unnamed"     | The name of your tank.
| `tank.victoryMessage`            | String      | Max Length: 256        | "Winner"      | A message displayed above your tank when it wins.
| `tank.color`                     | String      | Hexadecimal Code       | "#000000"     | The outline color of your tank's body.
| `tank.fillColor`                 | String      | Hexadecimal Code       | "#FFFFFF"     | The fill color of your tank's body.
| `tank.treadColor`                | String      | Hexadecimal Code       | "#808080"     | The color of your tank's treads.
| `tank.gunColor`                  | String      | Hexadecimal Code       | "#404040"     | The color of your tank's gun.
| `tank.radarColor`                | String      | Hexadecimal Code       | "#00FFFF"     | The color of your tank's radar.
| `tank.speed`                     | Number      | -1 to 1                | 0             | The desired speed of your tank, where `-1` is full reverse, `0` is stop, and `1` is full forward. The actual speed is determined by `tank.speed * MAX_ACTUAL_SPEED`.
| `tank.bodyTurn`                  | Number      | -1 to 1                | 0             | How much to turn the tank's body per iteration (`-1` = `MAX_BODY_TURN_DEGREES` left, `0` no turn, `1` = `MAX_BODY_TURN_DEGREES` right).
| `tank.gunTurn`                   | Number      | -1 to 1                | 0             | How much to turn the tank's turret relative to the body per iteration (`-1` = `MAX_GUN_TURN_DEGREES` left, `0` no turn, `1` = `MAX_GUN_TURN_DEGREES` right)..
| `tank.radarTurn`                 | Number      | -1 to 1                | 0             | How much to turn the radar relative to the body and gun per iteration (`-1` = `MAX_RADAR_TURN_DEGREES` left, `0` no turn, `1` = `MAX_RADAR_TURN_DEGREES` right).
| `tank.radarArc`                  | Number      | 0 to 1                 | 1             | The width of your radar's scanning arc (`0` = 0 degrees, `1` = `MAX_RADAR_ARC_DEGREES` degrees).
| `tank.handicap`                  | Number      | 0 to 1                 | 0             | An optional handicap (`0` full damage, `1` no damage). Higher values reduce damage dealt to targets.
| `tank.retained`                  | JSON Object | Any Valid JSON         | {}            | An empty JSON object for storing persistent data across iterations.


## Tank Methods

| Method Name                      | Returns   | Description
| -------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
| `tank.angleTo(x, y)`             | Number    | Returns the angle from your tank to the specified `x` and `y` coordinates.
| `tank.angleFrom(x, y)`           | Number    | Returns the angle the specified `x` and `y` coordinates to your tank.
| `tank.distanceTo(x, y)`          | Number    | Returns the distance your tank to the specified `x` and `y` coordinates.
| `tank.fire(energy)`              | Number    | Fires a missile with the specified `energy`. The missile energy is limited `MAX_MISSILE_ENERGY`. Can not fire if `tank.gunHeat > 0` Returns `id` of fired missile (used as a key for `tank.missiles`).


## Built-in Functions

| Function Name                    | Returns   | Description
| -------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
| `clamp(value, min, max)`         | Number    | Returns value constrained to the range between min and max (inclusive). If value is less than `min`, it returns `min`. If value is greater than `max`, it returns `max`. Otherwise, it returns `value`.
| `lerp(a, b, mix = 0.5)`          | Number    | Returns the linear interpolation between values `a` and `b`. The mix parameter determines the weighting, where `0` returns `a`, `1` returns `b`, and `0.5` (the default) returns the midpoint.
| `getAngle(x1, y1, x2, y2)`       | Number    | Returns the angle in degrees from the point (`x1`, `y1`) to the point (`x2`, `y2`).
| `getNormalizeAngle(angle)`       | Number    | Returns the given angle normalized to the range of `-180` to `180` degrees.
| `getAngleDifference(a1, a2)`     | Number    | Returns the shortest angular difference in degrees between two angles `a1` and `a2`. The result will be in the range of `-180` to `180` degrees.
| `getDistance(x1, y1, x2, y2)`    | Number    | Returns the Euclidean distance between the points (`x1`, `y1`) and (`x2`, `y2`).
| `getVectorComponents(direction)` | Number    | Returns an object containing the x and y components of a vector with the given direction (in degrees) and a magnitude of `1`. The object will have the format `{ x: number, y: number }`.
