document.addEventListener("DOMContentLoaded", async () => {

  const BASE = "http://localhost:3000";

  const state = {
    type: "Length",
    action: "Conversion",
    operator: "+"
  };

  const qs = s => document.querySelector(s);

  attachEvents();
  toggleOperators(false);
  await loadUnits("Length");
  loadHistory();

  /* ===============================
     EVENT BINDINGS
  ================================ */

  function attachEvents() {

    document.querySelectorAll("#types .card").forEach(card => {
      card.onclick = async () => {
        state.type = card.innerText;
        setActive("#types .card", card);
        qs("#from-value").value = "";
        qs("#to-value").value = "";
        showResult("—", "");
        await loadUnits(state.type);
      };
    });

    document.querySelectorAll(".action-btn").forEach(btn => {
      btn.onclick = () => {
        state.action = btn.innerText;
        setActive(".action-btn", btn);
        toggleOperators(state.action === "Arithmetic");
        showResult("—", "");
      };
    });

    document.querySelectorAll(".operator-btn").forEach(btn => {
      btn.onclick = () => {
        state.operator = btn.innerText;
        setActive(".operator-btn", btn);
        calculate();
      };
    });

    ["#from-value","#to-value","#from-unit","#to-unit"].forEach(id => {
      qs(id).addEventListener("change", calculate);
    });
  }

  /* ===============================
     CORE CALCULATION (UC17)
  ================================ */

  async function calculate() {

    const fv = Number(qs("#from-value").value);
    const tv = Number(qs("#to-value").value);
    const fu = qs("#from-unit").value;
    const tu = qs("#to-unit").value;

    if (!fu || !tu || isNaN(fv)) return;

    let result = null;
    let expression = "";

    try {

      // ✅ CONVERSION
      if (state.action === "Conversion") {
        const conv = await getConversion(fu, tu);
        result = applyConversion(fv, conv);
        expression = `${fv} ${fu} → ${tu}`;
        showResult(result, tu);
      }

      // ✅ COMPARISON
      else if (state.action === "Comparison" && !isNaN(tv)) {
        const conv = await getConversion(tu, fu);
        const base2 = applyConversion(tv, conv);
        result = compare(fv, fu, tv, tu, fv, base2);
        expression = `${fv} ${fu} ? ${tv} ${tu}`;
        showResult(result, "");
      }

      // ✅ ARITHMETIC
      else if (state.action === "Arithmetic" && !isNaN(tv)) {
        const conv = await getConversion(tu, fu);
        const norm = applyConversion(tv, conv);
        result = arithmetic(fv, norm, state.operator);
        expression = `${fv} ${fu} ${state.operator} ${tv} ${tu}`;
        showResult(result, fu);
      }

      // ✅ SAVE HISTORY ONLY IF VALID
      // ✅ Save history ONLY if calculation is valid
if (expression && result !== null && result !== undefined) {
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
      showResult("Error", "");
      console.error(e.message);
    }
  }

  /* ===============================
     API LAYER
  ================================ */

async function getConversion(from, to) {

  // Same unit → no conversion needed
  if (from === to) {
    return { factor: 1, formula: null };
  }

  // Try direct conversion
  const res = await fetch(
    `http://localhost:3000/conversions?from=${from}&to=${to}`
  );
  const data = await res.json();

  if (data.length) {
    return data[0]; // ✅ direct conversion found
  }

  // 🔁 Try reverse conversion (factor-based only)
  const reverseRes = await fetch(
    `http://localhost:3000/conversions?from=${to}&to=${from}`
  );
  const reverseData = await reverseRes.json();

  if (reverseData.length && reverseData[0].factor !== null) {
    return {
      from,
      to,
      factor: 1 / reverseData[0].factor,
      formula: null
    };
  }

  // ❌ No conversion possible
  throw new Error(`Conversion not available for ${from} → ${to}`);
}

  async function saveHistory(record) {
  try {
    await fetch("http://localhost:3000/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(record)
    });
  } catch (err) {
    console.error("History save failed", err);
  }
}

 async function loadHistory() {
  try {
    const res = await fetch(
      "http://localhost:3000/history?_sort=timestamp&_order=desc"
    );
    const records = await res.json();
    renderHistory(records);
  } catch (err) {
    console.error("History load failed", err);
    renderHistory([]);
  }
}


  /* ===============================
     PURE LOGIC (UC7–UC9)
  ================================ */

  function applyConversion(v, c) {
    if (!c) throw new Error("Invalid conversion");
    if (c.factor !== null) return +(v * c.factor).toFixed(6);
    return +eval(c.formula.replace("x", v)).toFixed(6);
  }

  function compare(v1,u1,v2,u2,b1,b2) {
    if (b1 > b2) return `${v1} ${u1} is GREATER than ${v2} ${u2}`;
    if (b1 < b2) return `${v1} ${u1} is LESS than ${v2} ${u2}`;
    return `${v1} ${u1} is EQUAL to ${v2} ${u2}`;
  }

  function arithmetic(a,b,o) {
    if (o === "/" && b === 0) throw new Error("Divide by zero");
    return +eval(`${a}${o}${b}`).toFixed(6);
  }

  /* ===============================
     UI HELPERS
  ================================ */

  async function loadUnits(type) {
    const res = await fetch(`${BASE}/units?type=${type}`);
    const units = await res.json();
    populate("#from-unit", units);
    populate("#to-unit", units);
  }

  function populate(sel, units) {
    qs(sel).innerHTML =
      `<option disabled selected>-- Select Unit --</option>` +
      units.map(u => `<option value="${u.symbol}">${u.label}</option>`).join("");
  }

  function setActive(selector, el) {
    document.querySelectorAll(selector).forEach(x => x.classList.remove("active"));
    el.classList.add("active");
  }

  function toggleOperators(show) {
    qs("#operators").style.display = show ? "flex" : "none";
  }

  function showResult(v,u) {
    qs("#result-value").innerText = v;
    qs("#result-unit").innerText = u;
  }

  function renderHistory(records) {
  const list = document.querySelector("#history-list");
  if (!list) return;

  list.innerHTML = "";

  if (!records || records.length === 0) {
    list.innerHTML = "<li>No history yet.</li>";
    return;
  }

  records.forEach(r => {
    const li = document.createElement("li");
    li.textContent = `${r.expression} = ${r.result}`;
    list.appendChild(li);
  });
}

});