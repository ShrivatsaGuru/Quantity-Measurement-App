const BASE = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {

  const state = {
    type: "Length",
    action: "Conversion",
    operator: "+"
  };

  // Initial load
  loadUnits("Length");
  loadHistory();

  /* =========================
     TYPE SELECTION
  ========================= */
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", async () => {
      document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");

      state.type = card.dataset.type;

      document.getElementById("from-value").value = "";
      document.getElementById("to-value").value = "";

      showResult("—", "");

      await loadUnits(state.type);
    });
  });

  /* =========================
     ACTION SELECTION
  ========================= */
  document.querySelectorAll(".action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".action-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      state.action = btn.innerText;

      document.getElementById("operators").style.display =
        state.action === "Arithmetic" ? "flex" : "none";

      showResult("—", "");
    });
  });

  /* =========================
     OPERATOR SELECTION
  ========================= */
  document.querySelectorAll(".operator-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".operator-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      state.operator = btn.innerText;
      calculate();
    });
  });

  /* =========================
     INPUT EVENTS
  ========================= */
  ["from-value", "to-value", "from-unit", "to-unit"].forEach(id => {
    document.getElementById(id).addEventListener("input", calculate);
  });

  /* =========================
     LOAD UNITS
  ========================= */
  async function loadUnits(type) {
    const res = await fetch(`${BASE}/units?type=${type}`);
    const units = await res.json();

    populateSelect("from-unit", units);
    populateSelect("to-unit", units);
  }

  function populateSelect(id, units) {
    const select = document.getElementById(id);
    select.innerHTML = `<option disabled selected>Select unit</option>`;

    units.forEach(u => {
      const option = document.createElement("option");
      option.value = u.symbol;
      option.textContent = u.label;
      select.appendChild(option);
    });
  }

  /* =========================
     CALCULATION (UC17)
  ========================= */
  async function calculate() {
    const fromValue = Number(document.getElementById("from-value").value);
    const toValue = Number(document.getElementById("to-value").value);
    const fromUnit = document.getElementById("from-unit").value;
    const toUnit = document.getElementById("to-unit").value;

    if (!fromUnit || !toUnit || isNaN(fromValue)) return;

    let result = null;
    let expression = "";

    try {
      if (state.action === "Conversion") {
        const conv = await getConversion(fromUnit, toUnit);
        result = applyConversion(fromValue, conv);
        expression = `${fromValue} ${fromUnit} → ${toUnit}`;
        showResult(result, toUnit);
      }

      if (expression) {
        await saveHistory(expression, result);
        loadHistory();
      }
    } catch (err) {
      showResult("Error", "");
      console.error(err.message);
    }
  }

  /* =========================
     CONVERSION LOGIC
  ========================= */
  async function getConversion(from, to) {
    if (from === to) {
      return { factor: 1, formula: null };
    }

    // Direct conversion
    let res = await fetch(`${BASE}/conversions?from=${from}&to=${to}`);
    let data = await res.json();
    if (data.length) return data[0];

    // Reverse conversion
    res = await fetch(`${BASE}/conversions?from=${to}&to=${from}`);
    data = await res.json();
    if (data.length && data[0].factor !== null) {
      return { factor: 1 / data[0].factor, formula: null };
    }

    throw new Error("Conversion not available");
  }

  function applyConversion(value, conv) {
    if (conv.factor !== null) {
      return +(value * conv.factor).toFixed(6);
    }
    return +eval(conv.formula.replace("x", value)).toFixed(6);
  }

  /* =========================
     HISTORY
  ========================= */
  async function saveHistory(expression, result) {
    await fetch(`${BASE}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expression,
        result,
        timestamp: new Date().toISOString()
      })
    });
  }

  async function loadHistory() {
    const res = await fetch(`${BASE}/history?_sort=timestamp&_order=desc`);
    const history = await res.json();

    const list = document.getElementById("history-list");
    list.innerHTML = "";

    if (!history.length) {
      list.innerHTML = "<li>No history yet.</li>";
      return;
    }

    history.forEach(h => {
      const li = document.createElement("li");
      li.textContent = `${h.expression} = ${h.result}`;
      list.appendChild(li);
    });
  }

  /* =========================
     RESULT UI
  ========================= */
  function showResult(value, unit) {
    document.getElementById("result-value").innerText = value;
    document.getElementById("result-unit").innerText = unit;
  }

});