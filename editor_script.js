// --- editor_script.js ---

// Inizializza canvas e contesto
const canvas = document.getElementById("previewCanvas");
const ctx    = canvas.getContext("2d");

// Zoom, Pan e Lock globali
window.zoom = 1;
window.panOffset = { x: 0, y: 0 };
window.origin = { x: canvas.width / 2, y: canvas.height / 2 };
window.lineWidth = 2;
let isPanning = false;
let startPan = { x: 0, y: 0 };
let isLocked = false;
let isDraggingMeasurement = false;

// Aggiorna display zoom
function updateZoomDisplay() {
  const disp = document.getElementById("zoomDisplay");
  if (disp) {
    const pct = Math.round(window.zoom * 100);
    disp.textContent = pct + "%";
    const zin = document.getElementById("zoomInput");
    if (zin) zin.value = pct;
  }
}

// Reset zoom e pan
function resetZoom() {
  window.zoom = 1;
  window.panOffset = { x: 0, y: 0 };
window.lineWidth = 2;
  updateZoomDisplay();
  generateJSON();
  if (window.updateLabelInputPositions) window.updateLabelInputPositions();
      if (window.updateMeasurementPositions) window.updateMeasurementPositions();
  if (window.updateMeasurementPositions) window.updateMeasurementPositions();
}

// Zoom in (+2%)
function zoomIn() {
  window.zoom *= 1.02;
  updateZoomDisplay();
  refreshPreview();
  buildSnapPoints(shapeObject.slots, shapeObject.startAngle);
  if (window.updateLabelInputPositions) window.updateLabelInputPositions();
  if (window.updateMeasurementPositions) window.updateMeasurementPositions();
}

// Zoom out (-2%)
function zoomOut() {
  window.zoom /= 1.02;
  updateZoomDisplay();
  refreshPreview();
  buildSnapPoints(shapeObject.slots, shapeObject.startAngle);
  if (window.updateLabelInputPositions) window.updateLabelInputPositions();
  if (window.updateMeasurementPositions) window.updateMeasurementPositions();
}

// Toggle lock (blocca/sblocca interazioni)
function toggleLock() {
  isLocked = !isLocked;
  const btn = document.getElementById("lockButton");
  if (btn) btn.textContent = isLocked ? "🔒" : "🔓";
}

canvas.addEventListener("mousemove", e => {
  if (isLocked || isDraggingMeasurement) return;
  if (e.target !== canvas) return;
  if (isPanning) {
    window.panOffset.x = e.clientX - startPan.x;
    window.panOffset.y = e.clientY - startPan.y;
    refreshPreview();
  buildSnapPoints(shapeObject.slots, shapeObject.startAngle);
    if (window.updateLabelInputPositions) window.updateLabelInputPositions();
      if (window.updateMeasurementPositions) window.updateMeasurementPositions();
  if (window.updateMeasurementPositions) window.updateMeasurementPositions();
  }
});
["mouseup","mouseleave"].forEach(evt =>
  canvas.addEventListener(evt, () => {
    isPanning = false;
    canvas.style.cursor = "crosshair";
  })
);

// Inizializza tabella e dati
let maxRows = 12;
const segmentRows = document.getElementById("segmentRows");
const summaryDiv   = document.getElementById("summary");
const jsonPreview  = document.getElementById("jsonPreview");

window.addEventListener("DOMContentLoaded", () => {
  for (let i = 0; i < maxRows; i++) addSegmentRow();
  generateJSON();
  updateZoomDisplay();
    // Dynamic line width control
    const lwInput = document.getElementById('lineWidthInput');
    if (lwInput) {
      lwInput.addEventListener('input', e => {
        window.lineWidth = parseFloat(e.target.value) || window.lineWidth;
        generateJSON();
      });
    }
});

// Aggiunge riga di segmenti
function addSegmentRow() {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="checkbox" class="p-check" checked></td>
    <td><input type="checkbox" class="c-check"></td>
    <td><input type="number" class="radius" style="display:none" /></td>
    <td><input type="number" class="length" /></td>
    <td><input type="number" class="angle" /></td>
    <td><button class="remove-btn">-</button></td>
  `;
  segmentRows.appendChild(tr);

  const pCheck = tr.querySelector(".p-check");
  const cCheck = tr.querySelector(".c-check");
  const rIn    = tr.querySelector(".radius");
  rIn.addEventListener('input', generateJSON);

  pCheck.addEventListener("change", () => {
    if (pCheck.checked) cCheck.checked = false;
    rIn.style.display = "none";
    generateJSON();
  });
  cCheck.addEventListener("change", () => {
    if (cCheck.checked) pCheck.checked = false;
    rIn.style.display = cCheck.checked ? "inline-block" : "none";
    generateJSON();
  });

  const lenIn = tr.querySelector(".length");
  const angIn = tr.querySelector(".angle");
  [lenIn, angIn].forEach(inp => {
    inp.addEventListener("input", () => { window.generateJSON(); buildSnapPoints(shapeObject.slots, shapeObject.startAngle); const previousMeasures = [...measurementState.measurements];
  measurementState.measurements = previousMeasures; if (typeof refreshPreview === "function") refreshPreview(); if (typeof renderMeasurementInputs === "function") renderMeasurementInputs(); if (window.updateMeasurementPositions) window.updateMeasurementPositions(); });
  // 🔒 Filtro misure malformate
  measurementState.measurements = measurementState.measurements.filter(m => {
    const valid = m && m.type && m.p1 && m.p2;
    if (!valid) console.warn('❌ Misura malformata ignorata:', m);
    return valid;
  });
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (inp === lenIn) angIn.focus();
        else {
          const nr = tr.nextElementSibling;
          if (nr) nr.querySelector(".length").focus();
          else {
            addSegmentRow();
            segmentRows.lastElementChild.querySelector(".length").focus();
          }
        }
      }
    });
  });

  tr.querySelector(".remove-btn").addEventListener("click", () => { tr.remove(); generateJSON(); });
}

// Genera JSON, summary e disegna
function generateJSON() {
  const startAng = parseFloat(document.getElementById("startAngle").value) || 0;
  const slots = [];
  let totalCm = 0;

  segmentRows.querySelectorAll("tr").forEach(row => {
    const p = row.querySelector(".p-check").checked;
    const c = row.querySelector(".c-check").checked;
    const l = parseFloat(row.querySelector(".length").value) || 0;
    const r = parseFloat(row.querySelector(".radius").value) || 0;
    const aRaw = row.querySelector(".angle").value;
    const a = aRaw.trim() === '' ? 0 : parseFloat(aRaw);
    if (p && l>0) { slots.push({type:"length", value:l}); totalCm += l; }
    if (c && l>0 && r>0) { slots.push({type:"arc", value:l, radius:r}); totalCm += l; }
    if (a !== 0) slots.push({type:"angle", value:a});
  });

  updateSummary(totalCm);
  buildSnapPoints(slots, startAng);
  drawPreview(slots, startAng);
  if (jsonPreview) jsonPreview.textContent = JSON.stringify(slots,null,2);
}

// Calcola Totale e Peso
function updateSummary(totalCm) {
  const d = document.getElementById("diameter").value || "10HA";
  const mm = parseInt((d.match(/\d+/)||[10])[0],10);
  const kgm = mm*mm*0.006165;
  const m = totalCm/100;
  summaryDiv.textContent = `Totale L = ${m.toFixed(2)} m | Peso = ${(m*kgm).toFixed(3)} kg`;
}

// Disegna sul canvas
function drawPreview(slots, startAng) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();

  // --- Griglia millimetrica ---
  const gridStep = 10;
  const viewWidth = canvas.width / zoom;
  const viewHeight = canvas.height / zoom;
  const startX = -panOffset.x / zoom;
  const startY = -panOffset.y / zoom;
  const endX = startX + viewWidth;
  const endY = startY + viewHeight;
  ctx.beginPath();
  for (let x = Math.floor(startX / gridStep) * gridStep; x < endX; x += gridStep) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = Math.floor(startY / gridStep) * gridStep; y < endY; y += gridStep) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 0.5 / zoom;
  ctx.stroke();

  /* pan disabled */
  ctx.setTransform(window.zoom, 0, 0, window.zoom, window.panOffset.x, window.panOffset.y);

  let x = canvas.width/(2*window.zoom);
  let y = canvas.height/(2*window.zoom);
  let ang = startAng*Math.PI/180;
  slots.forEach(s=>{
    if (s.type==="length") {
      const dx=s.value*Math.cos(ang), dy=s.value*Math.sin(ang);
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+dx,y+dy);
      ctx.strokeStyle="black"; ctx.lineWidth = window.lineWidth/window.zoom; ctx.stroke();
      x+=dx; y+=dy;
    } else if (s.type==="arc") {
      const th=s.value/s.radius;
      const cx=x+s.radius*Math.cos(ang+Math.PI/2);
      const cy=y+s.radius*Math.sin(ang+Math.PI/2);
      ctx.beginPath();
      ctx.arc(cx,cy,s.radius,ang-Math.PI/2,ang-Math.PI/2+th);
      ctx.strokeStyle="black"; ctx.lineWidth = window.lineWidth/window.zoom;
      ctx.stroke();
      x = cx + s.radius*Math.cos(ang-Math.PI/2+th);
      y = cy + s.radius*Math.sin(ang-Math.PI/2+th);
      ang+=th;
    } else if (s.type==="angle") {
      ang+=s.value*Math.PI/180;
    }
  });
  
  if (typeof measurementState !== 'undefined' && measurementState.snapEnabled && Array.isArray(snapPoints)) {
    snapPoints.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, window.snapRadius / window.zoom, 0, 2 * Math.PI);
      ctx.fillStyle = (measurementState.hoveredSnap === i) ? 'red' : 'rgba(0,0,255,0.5)';
      ctx.fill();
    });
  }

  
}

// Esporta/importa shape JSON
window.saveShapeJSON = async function() {
  try {
    // Use File System Access API if available
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        types: [{
          description: 'JSON Files',
          accept: {'application/json': ['.json']}
        }],
        suggestedName: 'shape.json'
      });
      const writable = await handle.createWritable();
      await writable.write(jsonPreview.textContent);
      await writable.close();
    } else {
      // Fallback: download via blob
      const filename = prompt('Inserisci nome file per salvare', 'shape.json');
      if (!filename) return;
      const blob = new Blob([jsonPreview.textContent], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }
  } catch (err) {
    console.error(err);
    alert('Errore nel salvataggio del file.');
  }
};
window.loadShapeJSON = function() {
  const fileInput = document.getElementById('fileInput');
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const arr = JSON.parse(e.target.result);
        loadIntoTable(arr);
        generateJSON();
      } catch (err) {
        alert('Errore nel parsing del file JSON');
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
};
window.resetTable = function() {
  segmentRows.innerHTML = '';
  for (let i = 0; i < maxRows; i++) addSegmentRow();
  generateJSON();
};
window.zoomToFit = function() {
  if (isLocked || isDraggingMeasurement) return;
  if (e.target !== canvas) return;
  resetZoom();
};


// Imposta lo zoom da percentuale input
function setZoom(val) {
  const p = parseFloat(val);
  if (isNaN(p)) return;
  window.zoom = p / 100;
  updateZoomDisplay();
  buildSnapPoints();
  refreshPreview();
  buildSnapPoints(shapeObject.slots, shapeObject.startAngle);
  if (window.updateLabelInputPositions) window.updateLabelInputPositions();
  if (window.updateMeasurementPositions) window.updateMeasurementPositions();
}


// Abilita/disabilita controlli in base a isLocked
function updateLockState() {
  // Tabella
  document.querySelectorAll('#segmentRows input, #segmentRows .remove-btn').forEach(el => el.disabled = isLocked);
  const addRowBtn_el = document.getElementById('addRowBtn');
  if (addRowBtn_el) addRowBtn_el.disabled = isLocked;
  // Zoom
  const zoomInBtn_el = document.getElementById('zoomInBtn');
  if (zoomInBtn_el) zoomInBtn_el.disabled = isLocked;
  const zoomOutBtn_el = document.getElementById('zoomOutBtn');
  if (zoomOutBtn_el) zoomOutBtn_el.disabled = isLocked;
  const zin = document.getElementById('zoomInput');
  if (zin) zin.disabled = isLocked;
  const resetZoomBtn_el = document.getElementById('resetZoomBtn');
  if (resetZoomBtn_el) resetZoomBtn_el.disabled = isLocked;
  // Misurazioni
  const measureLinearBtn_el = document.getElementById('measureLinearBtn');
  if (measureLinearBtn_el) measureLinearBtn_el.disabled = isLocked;
  const measureAlignedBtn_el = document.getElementById('measureAlignedBtn');
  if (measureAlignedBtn_el) measureAlignedBtn_el.disabled = isLocked;
  const measureAngularBtn_el = document.getElementById('measureAngularBtn');
  if (measureAngularBtn_el) measureAngularBtn_el.disabled = isLocked;
  const clr = document.getElementById('clearMeasureBtn');
  if (clr) clr.disabled = isLocked;
  // Zoom to Fit e reset table
  const zoomToFitBtn_el = document.getElementById('zoomToFitBtn');
  if (zoomToFitBtn_el) zoomToFitBtn_el.disabled = isLocked;
  const resetTableBtn_el = document.getElementById('resetTableBtn');
  if (resetTableBtn_el) resetTableBtn_el.disabled = isLocked;
  // save/load remain enabled
}

// Aggiorna lock state al cliccare
const origToggleLock = toggleLock;
toggleLock = function() {
  origToggleLock();
  updateLockState();
};

// Aggiorna controlli all'avvio
window.addEventListener('DOMContentLoaded', updateLockState);

// Funzione per ridisegnare la preview esistente senza rigenerare JSON
window.refreshPreview = function() {
  if (typeof drawPreview === 'function') {
    buildSnapPoints(shapeObject.slots, shapeObject.startAngle);
    drawPreview(shapeObject.slots, shapeObject.startAngle);
    if (window.updateMeasurementPositions) window.updateMeasurementPositions();
  }
};