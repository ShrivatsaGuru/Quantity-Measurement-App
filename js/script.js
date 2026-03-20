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
  } catch {
    showError("Server unavailable. Unable to load units.");
  }

  loadHistory();

  /* =========================
     EVENT LISTENERS
  ========================== */

  function attachEventListeners() {

    const typeCards = document.querySelectorAll("#types .card");
    const typeContainer = document.querySelector("#types");

    const actionButtons = document.querySelectorAll(".action-btn");
    const actionContainer = document.querySelector("#actions");

    const fromInput = document.querySelector("#from-value");
    const toInput = document.querySelector("#to-value");

    // UC15 – Type click
    typeCards.forEach(card => {
      card.addEventListener("click", async () => {
        state.type = card.innerText.trim();
        setActive(typeContainer, card, ".card");

        if (fromInput) fromInput.value = "";
        if (toInput) toInput.value = "";

        showResult(null, "");
        state.fromUnit = "";
        state.toUnit = "";

        await loadUnits(state.type);
      });
    });

    // UC16 – Action click
    actionButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        state.action = btn.innerText.trim();
        setActive(actionContainer, btn, ".action-btn");
        toggleOperators(state.action === "Arithmetic");
        showResult(null, "");
      });
    });

    // Recalculate on input change
    ["#from-value", "#to-value", "#from-unit", "#to-unit"].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.addEventListener("input", calculate);
        el.addEventListener("change", calculate);
      }
    });

    // Operator buttons
    document.querySelectorAll(".operator-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        state.operator = btn.innerText.trim();
        setActive(document.querySelector("#operators"), btn, ".operator-btn");
        calculate();
      });
    });
  }

  /* =========================
     CORE LOGIC
  ========================== */

  async function calculate() {
    try {
      const fromInput = document.querySelector("#from-value");
      const toInput = document.querySelector("#to-value");
      const fromSelect = document.querySelector("#from-unit");
      const toSelect = document.querySelector("#to-unit");

      state.fromVal = Number(fromInput.value);
      state.toVal = Number(toInput?.value);
      state.fromUnit = fromSelect.value;
      state.toUnit = toSelect.value;

      if (isNaN(state.fromVal) || !state.fromUnit || !state.toUnit) return;

      let result;
      let expression = "";

      // Conversion
      if (state.action === "Conversion") {
        const conv = await getConversion(state.fromUnit, state.toUnit);
        result = applyConversion(state.fromVal, conv);
        expression = `${state.fromVal} ${state.fromUnit} → ${state.toUnit}`;
        showResult(result, state.toUnit);
      }

      // Comparison
      else if (state.action === "Comparison") {
        if (isNaN(state.toVal)) return;

        const conv = await getConversion(state.toUnit, state.fromUnit);
        const base1 = state.fromVal;
        const base2 = applyConversion(state.toVal, conv);

        result = compareValues(
          state.fromVal, state.fromUnit,
          state.toVal, state.toUnit,
          base1, base2
        );

        expression = `${state.fromVal} ${state.fromUnit} ? ${state.toVal} ${state.toUnit}`;
        showResult(result, "");
      }

      // Arithmetic
      else if (state.action === "Arithmetic") {
        if (isNaN(state.toVal)) return;

        const conv = await getConversion(state.toUnit, state.fromUnit);
        const normalized = applyConversion(state.toVal, conv);

        result = performArithmetic(state.fromVal, normalized, state.operator);
        expression = `${state.fromVal} ${state.fromUnit} ${state.operator} ${state.toVal} ${state.toUnit}`;
        showResult(result, state.fromUnit);
      }

      // Save history only if valid
      if (expression && result !== undefined) {
        await saveHistory({
          type: state.type,
          action: state.action,
          expression,
          result,
          timestamp: new Date().toISOString()
        });
        loadHistory();
      }

    } catch (e) {
      showResult(`Error: ${e.message}`, "");
    }
  }

  /* =========================
     HELPERS & API
  ========================== */

  async function getConversion(from, to) {
    if (from === to) return { factor: 1, formula: null };

    const res = await fetch(`http://localhost:3000/conversions?from=${from}&to=${to}`);
    const data = await res.json();
    if (!data.length) throw new Error("Conversion not available");
    return data[0];
  }

  async function saveHistory(record) {
    try {
      await fetch("http://localhost:3000/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });
    } catch {}
  }

  async function loadHistory() {
    try {
      const res = await fetch("http://localhost:3000/history?_sort=timestamp&_order=desc");
      renderHistory(await res.json());
    } catch {
      renderHistory([]);
    }
  }

  async function loadUnits(type) {
    const res = await fetch(`http://localhost:3000/units?type=${type}`);
    const units = await res.json();
    populateDropdown(document.querySelector("#from-unit"), units);
    populateDropdown(document.querySelector("#to-unit"), units);
  }

  /* =========================
     PURE FUNCTIONS (UC7–14)
  ========================== */

  function applyConversion(v, c) {
    if (c.factor !== null) return +(v * c.factor).toFixed(6);
    return +eval(c.formula.replace("x", v)).toFixed(6);
  }

  function compareValues(v1, u1, v2, u2, b1, b2) {
    if (b1 > b2) return `${v1} ${u1} is GREATER than ${v2} ${u2}`;
    if (b1 < b2) return `${v1} ${u1} is LESS than ${v2} ${u2}`;
    return `${v1} ${u1} is EQUAL to ${v2} ${u2}`;
  }

  function performArithmetic(a, b, op) {
    if (op === "/" && b === 0) throw new Error("Cannot divide by zero");
    return +eval(`${a}${op}${b}`).toFixed(6);
  }

  function populateDropdown(sel, units) {
    sel.innerHTML = `<option disabled selected>-- Select Unit --</option>`;
    units.forEach(u => {
      sel.innerHTML += `<option value="${u.symbol}">${u.label} (${u.symbol})</option>`;
    });
  }

  function setActive(parent, el, selector) {
    parent.querySelectorAll(selector).forEach(b => b.classList.remove("active"));
    el.classList.add("active");
  }

  function toggleOperators(show) {
    document.querySelector("#operators").style.display = show ? "flex" : "none";
  }

  function showResult(v, u) {
    document.querySelector("#result-value").textContent = v ?? "—";
    document.querySelector("#result-unit").textContent = u ?? "";
  }

  function renderHistory(records) {
    const list = document.querySelector("#history-list");
    list.innerHTML = records.length
      ? records.map(r => `<li>${r.expression} = ${r.result}</li>`).join("")
      : "<li>No history yet.</li>";
  }

  function showError(msg) {
    alert(msg);
  }
});