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

});