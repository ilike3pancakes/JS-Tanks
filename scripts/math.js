function clamp(value, min, max) {
    if (value < min) value = min;
    else if (value > max) value = max;
    return value
}

function lerp(a, b, mix = 0.5) {
    return a * (1 - mix) + b * mix;
}


function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

function getAngle(x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    return getNormalizedAngle(angle);
}

function getAngleDifference(a1, a2) {
    a1 = (a1 + 360000) % 360;
    a2 = (a2 + 360000) % 360;
    if (a1 > 180) a1 -= 360;
    if (a2 > 180) a2 -= 360;
    return (a2 - a1 + 180) % 360 - 180;
}

function getNormalizedAngle(angle) {
    angle = (angle + 36000) % 360;
    if (angle > 180) angle -= 360;
    return angle;
}

function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getVectorComponents(angle) {
    return {
        x: Math.cos(toDegrees(angle)),
        y: Math.sin(toDegrees(angle))
    };
}





const SIN_TABLE_SIZE = 4096;
const SIN_LOOKUP = new Array(SIN_TABLE_SIZE);
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    const angle = (i / SIN_TABLE_SIZE) * 2 * Math.PI; // Normalize angle to 0 to 2*PI
    SIN_LOOKUP[i] = Math.sin(angle);
}
Math.sin = (angle) => {
    let normalizedAngle = angle % (2 * Math.PI);
    if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
    const index = Math.round((normalizedAngle / (2 * Math.PI)) * (SIN_TABLE_SIZE - 1));
    return SIN_LOOKUP[index];
};


const COS_TABLE_SIZE = SIN_TABLE_SIZE;
const COS_LOOKUP = new Array(COS_TABLE_SIZE);
for (let i = 0; i < COS_TABLE_SIZE; i++) {
    const angle = (i / COS_TABLE_SIZE) * 2 * Math.PI;
    COS_LOOKUP[i] = Math.cos(angle);
}
Math.cos = (angle) => {
    let normalizedAngle = angle % (2 * Math.PI);
    if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
    const index = Math.round((normalizedAngle / (2 * Math.PI)) * (COS_TABLE_SIZE - 1));
    return COS_LOOKUP[index];
};


const ATAN2_TABLE_SIZE = SIN_TABLE_SIZE;
const ATAN2_LOOKUP = new Array(ATAN2_TABLE_SIZE);
for (let i = 0; i < ATAN2_TABLE_SIZE; i++) {
    const angle = (i / ATAN2_TABLE_SIZE) * 2 * Math.PI;
    ATAN2_LOOKUP[i] = Math.cos(angle);
}
Math.ATAN2 = (angle) => {
    let normalizedAngle = angle % (2 * Math.PI);
    if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
    const index = Math.round((normalizedAngle / (2 * Math.PI)) * (ATAN2_TABLE_SIZE - 1));
    return ATAN2_LOOKUP[index];
};