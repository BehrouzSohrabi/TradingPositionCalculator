document.addEventListener("DOMContentLoaded", () => {
  const typeButtons = document.querySelectorAll(".toggle-btn");
  const leverageSlider = document.getElementById("leverage-slider");
  const leverageInput = document.getElementById("leverage-input");
  const quantityInput = document.getElementById("quantity");
  const positionInput = document.getElementById("position");
  const entryInput = document.getElementById("entry");
  const exitInput = document.getElementById("exit");
  const slInput = document.getElementById("stoploss");
  const btnCalculate = document.getElementById("btn-calculate");
  const autoToggleBtn = document.getElementById("toggle-auto");
  const themeBtn = document.getElementById("button-theme");
  const sidePanelBtn = document.getElementById("button-sidepanel");
  const profitLine = document.getElementById("profit-line");
  const slLine = document.getElementById("sl-line");
  const tpDistanceEl = document.getElementById("tp-distance");
  const slDistanceEl = document.getElementById("sl-distance");

  const body = document.body;
  const STORAGE_KEY = "positionCalculatorState";
  const calculateLabel = btnCalculate.textContent;
  const initialProfitHtml = profitLine.innerHTML;
  const initialSlHtml = slLine.innerHTML;
  const initialTpDistanceHtml = tpDistanceEl?.innerHTML || "";
  const initialSlDistanceHtml = slDistanceEl?.innerHTML || "";

  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("theme");

  let currentTheme = savedTheme || (systemDark ? "dark" : "light");
  let isAuto = false;
  setTheme(currentTheme);

  const isSidePanelView =
    new URLSearchParams(window.location.search).get("view") === "sidepanel";
  if (isSidePanelView) {
    document.body.classList.add("is-sidepanel");
  }

  function syncQuantityAndPosition(direction = "fromQuantity") {
    const qtyEl = quantityInput;
    const posEl = positionInput;
    const lev = parseFloat(leverageSlider.value) || 20;

    if (lev <= 0) return;

    if (direction === "fromQuantity" || document.activeElement !== posEl) {
      const qty = parseFloat(qtyEl.value) || 0;
      const pos = qty * lev;
      if (!isNaN(pos)) {
        posEl.value = Number(pos.toFixed(2));
      }
    }

    if (direction === "fromPosition" || document.activeElement !== qtyEl) {
      const pos = parseFloat(posEl.value) || 0;
      const qty = pos / lev;
      if (!isNaN(qty)) {
        qtyEl.value = Number(qty.toFixed(2));
      }
    }
  }

  quantityInput.addEventListener("input", () => {
    syncQuantityAndPosition("fromQuantity");
    if (isAuto) calculate({ showErrors: false });
    saveState();
  });
  positionInput.addEventListener("input", () => {
    syncQuantityAndPosition("fromPosition");
    if (isAuto) calculate({ showErrors: false });
    saveState();
  });

  leverageSlider.addEventListener("input", () => {
    syncQuantityAndPosition(
      document.activeElement === positionInput ? "fromPosition" : "fromQuantity"
    );
  });

  syncQuantityAndPosition("fromQuantity");

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

  function openSidePanel() {
    if (!chrome?.sidePanel?.open || !chrome?.windows?.getCurrent) return;
    chrome.windows.getCurrent((win) => {
      if (!win?.id || chrome.runtime.lastError) return;
      chrome.sidePanel.open({ windowId: win.id });
      window.close();
    });
  }

  if (sidePanelBtn) {
    sidePanelBtn.addEventListener("click", openSidePanel);
  }

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
    if (tpDistanceEl) tpDistanceEl.innerHTML = initialTpDistanceHtml;
    if (slDistanceEl) slDistanceEl.innerHTML = initialSlDistanceHtml;
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

  function formatPct(value) {
    return (
      Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + "%"
    );
  }

  function saveState() {
    const activeType =
      document.querySelector(".toggle-btn.active")?.dataset.type || "long";
    const state = {
      type: activeType,
      auto: isAuto,
      leverage: leverageSlider.value,
      quantity: quantityInput.value,
      position: positionInput.value,
      entry: entryInput.value,
      exit: exitInput.value,
      stoploss: slInput.value,
      profitHtml: profitLine.innerHTML,
      slHtml: slLine.innerHTML,
      tpDistanceHtml: tpDistanceEl?.innerHTML,
      slDistanceHtml: slDistanceEl?.innerHTML,
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
    const hasPosition = state.position !== undefined && state.position !== "";
    const hasQuantity = state.quantity !== undefined && state.quantity !== "";
    if (state.quantity !== undefined) quantityInput.value = state.quantity;
    if (state.position !== undefined) positionInput.value = state.position;
    if (state.entry !== undefined) entryInput.value = state.entry;
    if (state.exit !== undefined) exitInput.value = state.exit;
    if (state.stoploss !== undefined) slInput.value = state.stoploss;
    if (state.profitHtml) profitLine.innerHTML = state.profitHtml;
    if (state.slHtml) slLine.innerHTML = state.slHtml;
    if (state.tpDistanceHtml && tpDistanceEl) {
      tpDistanceEl.innerHTML = state.tpDistanceHtml;
    }
    if (state.slDistanceHtml && slDistanceEl) {
      slDistanceEl.innerHTML = state.slDistanceHtml;
    }

    updateLeverageLabel();
    if (!hasPosition && hasQuantity) {
      syncQuantityAndPosition("fromQuantity");
    }
  }

  leverageSlider.addEventListener("input", () => {
    updateLeverageLabel();
    if (isAuto) calculate({ showErrors: false });
    saveState();
  });

  leverageInput.addEventListener("input", () => {
    const clamped = clampLeverage(leverageInput.value);
    if (clamped === "") {
      if (isAuto) calculate({ showErrors: false });
      saveState();
      return;
    }
    leverageSlider.value = clamped;
    leverageInput.value = clamped;
    if (isAuto) calculate({ showErrors: false });
    saveState();
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveType(btn.dataset.type);
      if (isAuto) calculate({ showErrors: false });
      saveState();
    });
  });

  [entryInput, exitInput, slInput].forEach((input) => {
    input.addEventListener("input", () => {
      if (isAuto) calculate({ showErrors: false });
      saveState();
    });
  });

  loadSavedState();

  autoToggleBtn.addEventListener("click", () => {
    setAutoMode(!isAuto);
    saveState();
    if (isAuto) calculate({ showErrors: false });
  });

  function calculate({ showErrors = true } = {}) {
    const leverage = parseFloat(leverageSlider.value) || 20;
    const margin = parseFloat(quantityInput.value);
    const entry = parseFloat(entryInput.value);
    const tp = parseFloat(exitInput.value) || 0;
    const sl = parseFloat(slInput.value) || 0;
    const type =
      document.querySelector(".toggle-btn.active")?.dataset.type || "long";

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
    if (tp > 0) {
      pnlUSD =
        type === "long"
          ? (positionUSD * (tp - entry)) / entry
          : (positionUSD * (entry - tp)) / entry;
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

    let tpDistUSD = 0;
    let tpDistPct = 0;
    let slDistUSD = 0;
    let slDistPct = 0;

    if (tp > 0) {
      tpDistUSD = type === "long" ? tp - entry : entry - tp;
      tpDistPct = (tpDistUSD / entry) * 100;
    }
    if (sl > 0) {
      slDistUSD = type === "long" ? entry - sl : sl - entry;
      slDistPct = (slDistUSD / entry) * 100;
    }

    const pnlColor = pnlUSD >= 0 ? "#0bba74" : "#ff4761";

    profitLine.innerHTML = `Profit: <span style="color:${pnlColor}; font-weight:600;">
      ${formatNumber(pnlUSD)} (${formatNumber(pnlPct)}%)
    </span>`;

    slLine.innerHTML = `SL Risk: <span style="color:#ff4761; font-weight:600;">
      ${formatNumber(slRiskUSD)} (${formatNumber(slRiskPct)}%)
    </span>`;

    if (tp > 0) {
      tpDistanceEl.innerHTML = `Distance to TP: <span style="color:${pnlColor}; font-weight:600;">
      ${formatNumber(tpDistUSD)} (+${formatPct(tpDistPct)})
    </span>`;
    } else {
      tpDistanceEl.innerHTML = `Distance to TP: `;
    }

    if (sl > 0) {
      slDistanceEl.innerHTML = `Distance to SL: <span style="color:#ff4761; font-weight:600;">
${formatNumber(slDistUSD)} (${formatPct(slDistPct)})
    </span>`;
    } else {
      slDistanceEl.innerHTML = `Distance to SL: `;
    }

    saveState();
    return true;
  }

  btnCalculate.addEventListener("click", () => {
    calculate();
  });
});
