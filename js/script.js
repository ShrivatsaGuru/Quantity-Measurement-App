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
  const typeCards = document.querySelectorAll(".type-card");
  const actionButtons = document.querySelectorAll(".action-btn");

  attachEventListeners();

  if (typeCards.length > 0) {
    typeCards[0].classList.add("active");
  }

  if (actionButtons.length > 0) {
    actionButtons[0].classList.add("active");
  }

  await loadUnits(state.type);
  toggleOperators(false);
  loadHistory();

});