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
    const typeContainer = document.querySelector("#types");

    const actionButtons = document.querySelectorAll(".action-btn");
    const actionContainer = document.querySelector("#actions");

    const fromInput = document.querySelector("#from-value");
    const toInput = document.querySelector("#to-value");

    // -----------------------------
    // UC15: Handle Type Card Click
    // -----------------------------
    typeCards.forEach(card => {
        card.addEventListener("click", async () => {

            // 1. Update state
            state.type = card.innerText.trim();

            // 2. Set active card (UC11)
            setActive(typeContainer, card, ".card");

            // 3. Clear input values
            if (fromInput) fromInput.value = "";
            if (toInput) toInput.value = "";

            // 4. Clear result panel (UC12)
            showResult(null, "");

            // 5. Reload units for selected type (UC3 + UC10)
            try {
                await loadUnits(state.type);
            } catch (error) {
                showError("Unable to load units for selected type");
            }

            // 6. Reset unit selections in state
            state.fromUnit = "";
            state.toUnit = "";
        });
    });

    // -----------------------------
    // Existing Action Button Logic (UC16 later)
    // -----------------------------
    

actionButtons.forEach(btn => {
    btn.addEventListener("click", () => {

        // 1. Update state
        state.action = btn.innerText.trim();

        // 2. Set active action tab (UC11)
        setActive(actionContainer, btn, ".action-btn");

        // 3. Toggle operator row (UC13)
        toggleOperators(state.action === "Arithmetic");

        // 4. Clear result panel (UC12)
        showResult(null, "");
    });
});


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

// UC6: Load history records
async function loadHistory() {
    try {
        const res = await fetch(
            "http://localhost:3000/history?_sort=timestamp&_order=desc"
        );

        if (!res.ok) {
            throw new Error("Failed to load history");
        }

        const records = await res.json();

        // UC14 handles UI rendering
        renderHistory(records);

    } catch (error) {
        console.error("History load failed:", error);
        renderHistory([]); // show empty state safely
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
// UC12: Show result in the result panel
function showResult(value, unitSymbol) {
    const valueEl = document.querySelector("#result-value");
    const unitEl = document.querySelector("#result-unit");

    if (!valueEl || !unitEl) {
        console.warn("Result elements not found");
        return;
    }

    // Handle null / empty result
    if (value === null || value === undefined) {
        valueEl.textContent = "—";
        unitEl.textContent = "";
        return;
    }

    // Show value and unit
    valueEl.textContent = value;
    unitEl.textContent = unitSymbol || "";

    // Highlight animation
    valueEl.classList.add("highlight");
    unitEl.classList.add("highlight");

    setTimeout(() => {
        valueEl.classList.remove("highlight");
        unitEl.classList.remove("highlight");
    }, 1500);
}
// UC13: Show or hide operator row
function toggleOperators(show) {
    const operatorRow = document.querySelector("#operators");

    if (!operatorRow) {
        console.warn("Operator row not found");
        return;
    }

    operatorRow.style.display = show ? "flex" : "none";
}
// UC14: Render history list
function renderHistory(records) {
    const list = document.querySelector("#history-list");

    if (!list) {
        console.warn("History list element not found");
        return;
    }

    // Clear existing list
    list.innerHTML = "";

    // Handle empty or undefined history
    if (!records || records.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No history yet.";
        list.appendChild(li);
        return;
    }

    // Render each history record
    records.forEach(record => {
        const li = document.createElement("li");

        const time = record.timestamp
            ? new Date(record.timestamp).toLocaleString()
            : "";

        li.textContent = `${record.expression} = ${record.result} ${time && `(${time})`}`;

        list.appendChild(li);
    });
}
});