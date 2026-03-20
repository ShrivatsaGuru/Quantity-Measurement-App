document.addEventListener("DOMContentLoaded", async () => {

    const state = {
        type: "Length",
        action: "Conversion",
        fromVal: null,
        fromUnit: "",
        toVal: null,
        toUnit: "",
        operator: "+"
    };

    attachEventListeners();

    setDefaultActive();

    toggleOperators(false);

    try {
        await loadUnits("Length");
    } catch (error) {
        showError("Server unavailable. Unable to load units.");
    }

    loadHistory();

    function attachEventListeners() {
        const typeCards = document.querySelectorAll("#types .card");
        const actionButtons = document.querySelectorAll(".action-btn");

        const typeContainer = document.querySelector("#types");

typeCards.forEach(card => {
    card.addEventListener("click", () => {
        state.type = card.innerText.trim();

        setActive(typeContainer, card, ".card");

        loadUnits(state.type);
    });
});

        const actionContainer = document.querySelector("#actions");

actionButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        state.action = btn.innerText.trim();

        setActive(actionContainer, btn, ".action-btn");

        // Show operators only for Arithmetic
        toggleOperators(state.action === "Arithmetic");
    });
});
    }

    function setDefaultActive() {
        const firstCard = document.querySelector("#types .card");
        const firstAction = document.querySelector(".action-btn");

        if (firstCard) firstCard.classList.add("active");
        if (firstAction) firstAction.classList.add("active");
    }

    function toggleOperators(show) {
        const operatorRow = document.querySelector("#operators");

        if (!operatorRow) return;

        operatorRow.style.display = show ? "flex" : "none";
    }

    async function loadUnits(type) {
    try {
        const res = await fetch(
            `http://localhost:3000/units?type=${type}`
        );

        if (!res.ok) {
            throw new Error("Failed to fetch units");
        }

        const units = await res.json();

        const fromSelect = document.querySelector("#from-unit");
        const toSelect = document.querySelector("#to-unit");

        populateDropdown(fromSelect, units);
        populateDropdown(toSelect, units);

    } catch (error) {
        console.error(error);
        showError("Unable to load units");
    }
}

    // UC6: Load history records (newest first)
async function loadHistory() {
    const historyList = document.querySelector("#history-list");

    if (!historyList) return;

    try {
        const res = await fetch(
            "http://localhost:3000/history?_sort=timestamp&_order=desc"
        );

        if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status}`);
        }

        const records = await res.json();

        // Clear old history
        historyList.innerHTML = "";

        // Empty state
        if (!records.length) {
            const li = document.createElement("li");
            li.textContent = "No history yet.";
            historyList.appendChild(li);
            return;
        }

        // Render history items
        records.forEach(record => {
            const li = document.createElement("li");
            li.textContent = `${record.expression} = ${record.result}`;
            historyList.appendChild(li);
        });

    } catch (error) {
        console.error("Failed to load history:", error);
        historyList.innerHTML = "<li>No history yet.</li>";
    }
}

    function showError(message) {
        alert(message);
    }
    // UC4: Fetch conversion record for a unit pair
async function getConversion(from, to) {
    try {
        // Same unit: no conversion needed
        if (from === to) {
            return {
                from,
                to,
                factor: 1,
                formula: null
            };
        }

        const res = await fetch(
            `http://localhost:3000/conversions?from=${from}&to=${to}`
        );

        if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status}`);
        }

        const data = await res.json();

        // json-server returns an array
        if (!data.length) {
            throw new Error("Conversion not available for this unit pair");
        }

        return data[0];
    } catch (error) {
        console.error("Conversion fetch failed:", error);
        throw error; // let caller handle UI message
    }
}
// UC5: Save calculation record to history
async function saveHistory(record) {
    try {
        const res = await fetch("http://localhost:3000/history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(record)
        });

        if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status}`);
        }

        return await res.json(); // json-server returns saved object with id
    } catch (error) {
        console.error("Failed to save history:", error);
        // UC5 rule: do NOT block the user
        return null;
    }
}
// UC7: Apply conversion using factor or formula
function applyConversion(value, conversion) {

    // Validate number
    if (isNaN(value)) {
        throw new Error("Invalid number");
    }

    // Same unit case (safety check)
    if (!conversion || (conversion.factor === 1 && conversion.formula === null)) {
        return parseFloat(value.toFixed(6));
    }

    // Factor-based conversion
    if (conversion.factor !== null) {
        const result = value * conversion.factor;
        return parseFloat(result.toFixed(6));
    }

    // Formula-based conversion (Temperature)
    if (conversion.formula !== null) {
        // Replace x with actual value
        const expression = conversion.formula.replace("x", value);

        try {
            const result = eval(expression);
            return parseFloat(result.toFixed(6));
        } catch (err) {
            throw new Error("Invalid conversion formula");
        }
    }

    throw new Error("Unsupported conversion type");
}
// UC8: Compare two measurement values
function compareValues(v1, u1, v2, u2, base1, base2) {

    // Validate inputs
    if (isNaN(base1) || isNaN(base2)) {
        return "Invalid values — cannot compare";
    }

    if (base1 > base2) {
        return `${v1} ${u1} is GREATER than ${v2} ${u2}`;
    }

    if (base1 < base2) {
        return `${v1} ${u1} is LESS than ${v2} ${u2}`;
    }

    return `${v1} ${u1} is EQUAL to ${v2} ${u2}`;
}
// UC9: Perform arithmetic operation between two values
function performArithmetic(v1, v2Normalized, operator) {

    // Validate numbers
    if (isNaN(v1) || isNaN(v2Normalized)) {
        throw new Error("Invalid values for arithmetic");
    }

    let result;

    switch (operator) {
        case "+":
            result = v1 + v2Normalized;
            break;

        case "-":
            result = v1 - v2Normalized;
            break;

        case "*":
            result = v1 * v2Normalized;
            break;

        case "/":
            if (v2Normalized === 0) {
                throw new Error("Cannot divide by zero");
            }
            result = v1 / v2Normalized;
            break;

        default:
            throw new Error("Unknown operator");
    }

    // Round to 6 decimal places
    return parseFloat(result.toFixed(6));
}
// UC10: Populate unit dropdown
function populateDropdown(selectEl, units) {

    // Safety check
    if (!selectEl) {
        console.warn("Dropdown element not found");
        return;
    }

    // Clear existing options
    selectEl.innerHTML = "";

    // Default disabled option
    const defaultOption = document.createElement("option");
    defaultOption.textContent = "-- Select Unit --";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectEl.appendChild(defaultOption);

    // Add unit options
    units.forEach(unit => {
        const option = document.createElement("option");
        option.value = unit.symbol;
        option.textContent = `${unit.label} (${unit.symbol})`;
        selectEl.appendChild(option);
    });
}
// UC11: Set active button (type card / action button / operator)
function setActive(parentEl, clickedEl, childSelector) {

    // Safety check
    if (!parentEl || !clickedEl) {
        return;
    }

    // Remove active class from all siblings
    const buttons = parentEl.querySelectorAll(childSelector);
    buttons.forEach(btn => btn.classList.remove("active"));

    // Add active class to clicked button
    clickedEl.classList.add("active");
}
});