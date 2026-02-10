document.addEventListener("DOMContentLoaded", () => {
  const typeButtons = document.querySelectorAll(".toggle-btn");
  const leverageSlider = document.getElementById("leverage-slider");
  const leverageInput = document.getElementById("leverage-input");
  const quantityInput = document.getElementById("quantity");
  const entryInput = document.getElementById("entry");
  const exitInput = document.getElementById("exit");
  const slInput = document.getElementById("stoploss");
  const btnCalculate = document.getElementById("btn-calculate");
  const autoToggleBtn = document.getElementById("toggle-auto");
  const themeBtn = document.getElementById("button-theme");
  const profitLine = document.getElementById("profit-line");
  const slLine = document.getElementById("sl-line");
  const body = document.body;
  const STORAGE_KEY = "positionCalculatorState";
  const calculateLabel = btnCalculate.textContent;
  const initialProfitHtml = profitLine.innerHTML;
  const initialSlHtml = slLine.innerHTML;

  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("theme");

  let currentTheme = savedTheme || (systemDark ? "dark" : "light");
  let isAuto = false;
  setTheme(currentTheme);

  function setTheme(theme) {
    body.classList.remove("dark", "light");
    body.classList.add(theme);
    themeBtn.style.backgroundImage =
      theme === "dark" ? "url(assets/light.png)" : "url(assets/dark.png)";
    localStorage.setItem("theme", theme);
    currentTheme = theme;
  }

  themeBtn.addEventListener("click", () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  });

  function clampLeverage(value) {
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num)) return "";
    return Math.min(100, Math.max(1, num));
  }

  function updateLeverageLabel() {
    leverageInput.value = leverageSlider.value;
  }

  function setActiveType(type) {
    typeButtons.forEach((b) => b.classList.remove("active"));
    const target = Array.from(typeButtons).find(
      (btn) => btn.dataset.type === type
    );
    (target || typeButtons[0]).classList.add("active");
  }

  function resetResults() {
    profitLine.innerHTML = initialProfitHtml;
    slLine.innerHTML = initialSlHtml;
  }

  function setAutoMode(enabled) {
    isAuto = enabled;
    autoToggleBtn.classList.toggle("is-on", enabled);
    autoToggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    btnCalculate.disabled = enabled;
    btnCalculate.textContent = enabled ? "Auto" : calculateLabel;
  }

  function formatNumber(value) {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function saveState() {
    const activeType =
      document.querySelector(".toggle-btn.active")?.dataset.type || "long";
    const state = {
      type: activeType,
      auto: isAuto,
      leverage: leverageSlider.value,
      quantity: quantityInput.value,
      entry: entryInput.value,
      exit: exitInput.value,
      stoploss: slInput.value,
      profitHtml: profitLine.innerHTML,
      slHtml: slLine.innerHTML,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadSavedState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setAutoMode(false);
      updateLeverageLabel();
      return;
    }
    let state;
    try {
      state = JSON.parse(raw);
    } catch {
      setAutoMode(false);
      updateLeverageLabel();
      return;
    }

    if (state.type === "long" || state.type === "short") {
      setActiveType(state.type);
    }
    setAutoMode(Boolean(state.auto));
    if (state.leverage !== undefined && state.leverage !== "") {
      leverageSlider.value = state.leverage;
      leverageInput.value = state.leverage;
    }
    if (state.quantity !== undefined) quantityInput.value = state.quantity;
    if (state.entry !== undefined) entryInput.value = state.entry;
    if (state.exit !== undefined) exitInput.value = state.exit;
    if (state.stoploss !== undefined) slInput.value = state.stoploss;
    if (state.profitHtml) profitLine.innerHTML = state.profitHtml;
    if (state.slHtml) slLine.innerHTML = state.slHtml;

    updateLeverageLabel();
  }

  leverageSlider.addEventListener("input", () => {
    updateLeverageLabel();
    if (isAuto) {
      calculate({ showErrors: false });
      return;
    }
    saveState();
  });

  leverageInput.addEventListener("input", () => {
    const clamped = clampLeverage(leverageInput.value);
    if (clamped === "") {
      if (isAuto) {
        calculate({ showErrors: false });
        return;
      }
      saveState();
      return;
    }
    leverageSlider.value = clamped;
    leverageInput.value = clamped;
    if (isAuto) {
      calculate({ showErrors: false });
      return;
    }
    saveState();
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveType(btn.dataset.type);
      if (isAuto) {
        calculate({ showErrors: false });
        return;
      }
      saveState();
    });
  });

  [quantityInput, entryInput, exitInput, slInput].forEach((input) => {
    input.addEventListener("input", () => {
      if (isAuto) {
        calculate({ showErrors: false });
        return;
      }
      saveState();
    });
  });

  loadSavedState();

  autoToggleBtn.addEventListener("click", () => {
    setAutoMode(!isAuto);
    saveState();
    if (isAuto) {
      calculate({ showErrors: false });
    }
  });

  function calculate({ showErrors = true } = {}) {
    const leverage = parseFloat(leverageSlider.value) || 20;
    const margin = parseFloat(quantityInput.value);
    const entry = parseFloat(entryInput.value);
    const exitP = parseFloat(exitInput.value) || 0;
    const sl = parseFloat(slInput.value) || 0;
    const type = document.querySelector(".toggle-btn.active").dataset.type;

    if (isNaN(margin) || margin <= 0 || isNaN(entry) || entry <= 0) {
      if (showErrors) {
        alert("Please fill Margin, Entry and Leverage correctly.");
      } else {
        resetResults();
        saveState();
      }
      return false;
    }

    const positionUSD = margin * leverage;

    let pnlUSD = 0;
    if (exitP > 0) {
      pnlUSD =
        type === "long"
          ? (positionUSD * (exitP - entry)) / entry
          : (positionUSD * (entry - exitP)) / entry;
    }

    const pnlPct = (pnlUSD / margin) * 100;

    let slRiskUSD = 0;
    if (sl > 0) {
      slRiskUSD =
        type === "long"
          ? (positionUSD * (entry - sl)) / entry
          : (positionUSD * (sl - entry)) / entry;
    }

    const slRiskPct = (slRiskUSD / margin) * 100;

    const isProfit = pnlUSD >= 0;
    const pnlColor = isProfit ? "#0bba74" : "#ff4761";

    profitLine.innerHTML = `Profit: <span style="color:${pnlColor}; font-weight:600;">
        ${formatNumber(pnlUSD)} USDT (${formatNumber(pnlPct)}%)
      </span>`;

    slLine.innerHTML = `SL Risk: <span style="color:#ff4761; font-weight:600;">
        ${formatNumber(slRiskUSD)} USDT (${formatNumber(slRiskPct)}%)
      </span>`;

    saveState();
    return true;
  }

  btnCalculate.addEventListener("click", () => {
    calculate();
  });
});
