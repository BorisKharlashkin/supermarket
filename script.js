(() => {
  const basket = document.getElementById("basket");
  const gridEl = basket.querySelector(".grid");
  const placedLayer = document.getElementById("placed");
  const inventory = document.querySelectorAll(".inventory .piece");

  const clearBtn = document.getElementById("clear-basket");
  const winBanner   = document.getElementById('win-banner');
  const winRestart  = document.getElementById('win-restart');
  const winClose    = document.getElementById('win-close');

function showWinBanner(){
  if (!winBanner) return;
  winBanner.classList.add('show');
  winBanner.setAttribute('aria-hidden', 'false');
}

function hideWinBanner(){
  if (!winBanner) return;
  winBanner.classList.remove('show');
  winBanner.setAttribute('aria-hidden', 'true');
}

function updateClearButton(){
  if (!clearBtn) return;
  clearBtn.disabled = state.pieces.length === 0;
}
if (winClose)   winClose.addEventListener('click', hideWinBanner);
if (winRestart) winRestart.addEventListener('click', () => { clearBasket(); hideWinBanner(); });
if (winBanner)  winBanner.addEventListener('click', (e) => {
  if (e.target === winBanner) hideWinBanner(); // клик по подложке закрывает
});
function clearBasket(){
  
  for (const p of state.pieces) {
    p.el.remove();
  }
  state.pieces.length = 0;

  
  document.querySelectorAll(".inventory .piece.used")
    .forEach(btn => markInventoryUsed(btn, false));

  updateClearButton();
  hideWinBanner();
}


  
  const COLS = parseInt(basket.dataset.cols || 10, 10);
  const ROWS = parseInt(basket.dataset.rows || 8, 10);

  
  basket.style.setProperty("--cols", COLS);
  basket.style.setProperty("--rows", ROWS);

  
  const state = {
    cell: 48,        
    gridRect: null,  
    basketRect: null,
    dragging: null,  
    pieces: []       
  };

  

  function syncOverlay() {
    
    state.gridRect = gridEl.getBoundingClientRect();
    state.basketRect = basket.getBoundingClientRect();
    placedLayer.style.position = "absolute";
    placedLayer.style.left = (state.gridRect.left - state.basketRect.left) + "px";
    placedLayer.style.top  = (state.gridRect.top  - state.basketRect.top)  + "px";
    placedLayer.style.width  = state.gridRect.width + "px";
    placedLayer.style.height = state.gridRect.height + "px";
    state.cell = state.gridRect.width / COLS;
    
    for (const p of state.pieces) {
      placeEl(p.el, p.x, p.y, p.w, p.h);
    }
  }
if (clearBtn) {
  clearBtn.addEventListener("click", clearBasket);
  updateClearButton(); 
}
  function getWHfromCSSVar(el) {
    const cs = getComputedStyle(el);
    const w = parseInt(cs.getPropertyValue("--w") || "1", 10);
    const h = parseInt(cs.getPropertyValue("--h") || "1", 10);
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function rectsOverlap(a, b) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }

  function occupies(el) {
    
    return state.pieces.find(p => p.el === el) || null;
  }

  function placeEl(el, gx, gy, w, h) {
    
    el.style.position = "absolute";
    el.style.left  = (gx * state.cell) + "px";
    el.style.top   = (gy * state.cell) + "px";
    el.style.width  = (w * state.cell) + "px";
    el.style.height = (h * state.cell) + "px";
    el.dataset.gx = gx; el.dataset.gy = gy;
    el.dataset.w = w; el.dataset.h = h;
  }

  function validPlacement(gx, gy, w, h, exceptEl = null) {
    
    if (gx < 0 || gy < 0 || gx + w > COLS || gy + h > ROWS) return false;
    
    const candidate = { x: gx, y: gy, w, h };
    for (const p of state.pieces) {
      if (p.el === exceptEl) continue;
      if (rectsOverlap(candidate, p)) return false;
    }
    return true;
  }

  function markInventoryUsed(invBtn, used) {
    if (!invBtn) return;
    invBtn.toggleAttribute("disabled", !!used);
    invBtn.classList.toggle("used", !!used);
    invBtn.setAttribute("aria-pressed", used ? "true" : "false");
  }

  function allPlaced() {
    
    return Array.from(inventory).every(btn => btn.classList.contains("used"));
  }

  

  function startDragFromInventory(invBtn, pointerEvent) {
    const { w, h } = getWHfromCSSVar(invBtn);

    
    const piece = invBtn.cloneNode(true);
    piece.classList.add("dragging");
    piece.removeAttribute("id");
    piece.style.pointerEvents = "auto";
    placedLayer.appendChild(piece);

    
    state.dragging = {
      el: piece,
      src: invBtn,
      from: "inventory",
      w, h,
      gx: 0, gy: 0,
      
      offsetX: (w * state.cell) / 2,
      offsetY: (h * state.cell) / 2,
      
      lastValid: null
    };
    piece.classList.remove("invalid");
    piece.classList.add("ghost");

    moveDrag(pointerEvent);
  }

  function startDragFromPlaced(placedEl, pointerEvent) {
    
    const found = occupies(placedEl);
    if (!found) return;
    
    const original = { ...found };
    state.pieces = state.pieces.filter(p => p.el !== placedEl);

    placedEl.classList.add("dragging");

    state.dragging = {
      el: placedEl,
      src: null,
      from: "placed",
      w: original.w, h: original.h,
      gx: original.x, gy: original.y,
      offsetX: (original.w * state.cell) / 2,
      offsetY: (original.h * state.cell) / 2,
      original,
      lastValid: { gx: original.x, gy: original.y, w: original.w, h: original.h }
    };

    moveDrag(pointerEvent);
  }

  function rotateCurrent() {
    const d = state.dragging;
    if (!d) return;
    
    const newW = d.h, newH = d.w;
    d.w = newW; d.h = newH;
    
    d.el.style.width  = (d.w * state.cell) + "px";
    d.el.style.height = (d.h * state.cell) + "px";
    
    moveDrag(lastPointerEvent || { pageX: state.gridRect.left + d.gx * state.cell, pageY: state.gridRect.top + d.gy * state.cell });
  }

  let lastPointerEvent = null;

  function moveDrag(e) {
  if (!state.dragging) return;
  lastPointerEvent = e;
  const d = state.dragging;

  
  const px = (e.clientX ?? e.pageX) - state.gridRect.left;
  const py = (e.clientY ?? e.pageY) - state.gridRect.top;

  
  let gx = Math.round((px - d.offsetX) / state.cell);
  let gy = Math.round((py - d.offsetY) / state.cell);

  
  gx = clamp(gx, 0, COLS - d.w);
  gy = clamp(gy, 0, ROWS - d.h);

  
  const pxLeft = gx * state.cell;
  const pxTop  = gy * state.cell;
  d.el.style.left = pxLeft + "px";
  d.el.style.top  = pxTop + "px";
  d.gx = gx; d.gy = gy;

  
  const ok = validPlacement(gx, gy, d.w, d.h, d.from === "placed" ? d.el : null);
  d.el.classList.toggle("invalid", !ok);
  d.el.classList.toggle("valid", ok);
  if (ok) d.lastValid = { gx, gy, w: d.w, h: d.h };
}

  function endDrag(e) {
    if (!state.dragging) return;
    const d = state.dragging;
    const wasFromInventory = d.from === "inventory";
    const ok = !!d.lastValid;

    d.el.classList.remove("ghost", "dragging");

    if (!ok) {
      
      if (wasFromInventory) {
        d.el.remove();
      } else {
        
        placeEl(d.el, d.original.x, d.original.y, d.original.w, d.original.h);
        state.pieces.push({ el: d.el, x: d.original.x, y: d.original.y, w: d.original.w, h: d.original.h });
      }
      state.dragging = null;
      return;
    }

    
    const { gx, gy, w, h } = d.lastValid;
    placeEl(d.el, gx, gy, w, h);
    d.el.classList.remove("invalid");
    d.el.classList.add("locked");

    
    const rec = { el: d.el, x: gx, y: gy, w, h };
    state.pieces.push(rec);
    updateClearButton();

    
    if (wasFromInventory) {
      markInventoryUsed(d.src, true);
    }
    if (allPlaced()) {
  setTimeout(showWinBanner, 60);
}

    


    state.dragging = null;
  }

  

  
  function withPassiveFalse(fn) { return { passive: false, capture: false }; }

  
  inventory.forEach(btn => {
    btn.addEventListener("pointerdown", (e) => {
      if (btn.classList.contains("used")) return;
      e.preventDefault();
      startDragFromInventory(btn, e);
    }, withPassiveFalse());
  });

  
  placedLayer.addEventListener("pointerdown", (e) => {
    const target = e.target.closest(".piece");
    if (!target) return;
    e.preventDefault();
    startDragFromPlaced(target, e);
  }, withPassiveFalse());

  
  window.addEventListener("pointermove", (e) => {
    if (!state.dragging) return;
    e.preventDefault();
    moveDrag(e);
  }, withPassiveFalse());

  window.addEventListener("pointerup", (e) => {
    if (!state.dragging) return;
    e.preventDefault();
    endDrag(e);
  }, withPassiveFalse());

  
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r") {
      if (state.dragging) {
        e.preventDefault();
        rotateCurrent();
      }
    }
  });

  placedLayer.addEventListener("dblclick", (e) => {
    if (!state.dragging) return; 
    e.preventDefault();
    rotateCurrent();
  });

  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" && state.dragging && state.dragging.from === "placed") {
      e.preventDefault();
      const d = state.dragging;
      d.el.remove();
      state.dragging = null;
      
      const name = (d.el.dataset && d.el.dataset.name) || d.el.getAttribute("data-name");
      const btn = Array.from(inventory).find(b => b.dataset.name === name && b.classList.contains("used"));
      if (btn) markInventoryUsed(btn, false);
    }
  });

  
  window.addEventListener("resize", () => {
    syncOverlay();
  });

  
  syncOverlay();

  
  placedLayer.style.pointerEvents = "auto";

  
  window._tetris = {
    state,
    clear() {
      for (const p of state.pieces) p.el.remove();
      state.pieces.length = 0;
      inventory.forEach(b => markInventoryUsed(b, false));
    }
  };
})();
