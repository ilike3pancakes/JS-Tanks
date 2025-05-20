// Tank AI selector functionality

// Store references to the tank AI functions
const tankAIs = {
    // Main tanks
    "tankA": tankAMain,
    "tankB": tankBMain,
    "tankManual": manualTank,
    "tankDebug": debugTank,
};

// Store the currently selected tank AI functions
let selectedTankA = tankAMain;
let selectedTankB = tankBMain;

// Initialize the tank selectors
function initTankSelectors() {
    const selTankA = document.getElementById("selTankA");
    const selTankB = document.getElementById("selTankB");

    // Add options for main tanks
    addOption(selTankA, "tankA", "Tank A (Rampage)");
    addOption(selTankB, "tankB", "Tank B (AggressiveMiser)");
    addOption(selTankA, "tankManual", "Manual Control");
    addOption(selTankB, "tankManual", "Manual Control");
    addOption(selTankA, "tankDebug", "Debug Tank");
    addOption(selTankB, "tankDebug", "Debug Tank");

    // Load the "others" tank AIs
    loadOtherTanks();

    // Set default selections
    selTankA.value = "tankA";
    selTankB.value = "tankB";

    // Add event listeners
    selTankA.addEventListener("change", handleTankAChange);
    selTankB.addEventListener("change", handleTankBChange);
}

// Add an option to a select element
function addOption(selectElement, value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    selectElement.appendChild(option);
}

// Load the "others" tank AIs
function loadOtherTanks() {
    // Create script elements for each "others" tank AI
    const otherTanks = [
        "example",
        "follower",
        "Gemini",
        "leoai",
        "manual",
        "rampage v1",
        "test",
        "vilp"
    ];

    // Add options for other tanks
    const selTankA = document.getElementById("selTankA");
    const selTankB = document.getElementById("selTankB");

    otherTanks.forEach(tankName => {
        // Create a script element to load the tank AI
        const script = document.createElement("script");
        script.src = `./tanks/others/${tankName}.js`;
        script.onload = () => {
            // Get the function name from the file
            // The function is expected to be named tankBMain in each file
            // We'll store it with a unique name in our tankAIs object
            const funcName = `others_${tankName.replace(/\s+/g, '_')}`;
            tankAIs[funcName] = window.tankBMain;

            // Add options to the selectors
            const displayName = tankName.charAt(0).toUpperCase() + tankName.slice(1);
            addOption(selTankA, funcName, displayName);
            addOption(selTankB, funcName, displayName);
        };
        document.body.appendChild(script);
    });
}

// Handle tank A selection change
function handleTankAChange(event) {
    const selectedValue = event.target.value;
    selectedTankA = tankAIs[selectedValue];

    // Restart the game
    if (typeof newGame === "function") {
        newGame();
    }
}

// Handle tank B selection change
function handleTankBChange(event) {
    const selectedValue = event.target.value;
    selectedTankB = tankAIs[selectedValue];

    // Restart the game
    if (typeof newGame === "function") {
        newGame();
    }
}

// Get the selected tank A AI function
function getSelectedTankA() {
    return selectedTankA;
}

// Get the selected tank B AI function
function getSelectedTankB() {
    return selectedTankB;
}

// Initialize the selectors when the DOM is loaded
document.addEventListener("DOMContentLoaded", initTankSelectors);
