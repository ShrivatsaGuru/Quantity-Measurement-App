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

        typeCards.forEach(card => {
            card.addEventListener("click", () => {
                state.type = card.innerText.trim();
            });
        });

        actionButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                state.action = btn.innerText.trim();
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
        const res = await fetch("http://localhost:3000/units");
        const units = await res.json();

        const filtered = units.filter(u => 
            u.type.toLowerCase() === type.toLowerCase()
        );

        const selects = document.querySelectorAll("select");

        selects.forEach(select => {
            select.innerHTML = "";

            filtered.forEach(unit => {
                const option = document.createElement("option");
                option.value = unit.symbol;
                option.textContent = unit.label;
                select.appendChild(option);
            });
        });
    }

    async function loadHistory() {
        try {
            const res = await fetch("http://localhost:3000/history");
            await res.json();
        } catch (error) {
            console.log("History not loaded.");
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


});