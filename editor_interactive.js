// --- editor_interactive.js ---
// Estende editor_script.js con gestione di box/tag flottanti e lock awareness

// Stato globale
let shapeObject = {
  code: '', description: '', diameter: '', mandrel: 0,
  startAngle: 0, slots: [], labels: []
};

// Override generateJSON
const origGenerateJSON = window.generateJSON;
window.generateJSON = function() {
  origGenerateJSON();
  // Aggiorna dati shapeObject
  shapeObject.slots      = JSON.parse(document.getElementById('jsonPreview').textContent);
  shapeObject.startAngle = parseFloat(document.getElementById('startAngle').value) || 0;
  shapeObject.diameter   = document.getElementById('diameter').value;
  shapeObject.mandrel    = parseFloat(document.getElementById('mandrel').value) || 0;
  shapeObject.code       = document.getElementById('shapeCode').value.trim();
  shapeObject.description= document.getElementById('shapeLabel').value.trim();
  // Rigenera labels se conta non corrisponde
  const expected = shapeObject.slots.reduce((sum, s) => sum + (s.type==='arc'?2:1), 0);
  if (shapeObject.labels.length !== expected) initDefaultLabels();
  // Aggiorna inputs
  renderLabelInputs();
};

// Calcola labels iniziali
function initDefaultLabels() {
  shapeObject.labels = [];
  // Counters for labeling
  let lengthCounter = 0;
  let angleCounter = 0;
  let radiusCounter = 0;
  const greekLetters = ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω'];
  let x = canvas.width/2, y = canvas.height/2;
  let ang = shapeObject.startAngle * Math.PI/180;
  shapeObject.slots.forEach(s => {
    if (s.type === 'length') {
      // Length label: italic letters A, B, C,...
      lengthCounter++;
      const letter = String.fromCharCode('A'.charCodeAt(0) + lengthCounter - 1);
      const dx = s.value * Math.cos(ang);
      const dy = s.value * Math.sin(ang);
      const midX = x + dx/2, midY = y + dy/2;
      shapeObject.labels.push({ x: midX, y: midY, text: letter, type: 'length' });
      x += dx; y += dy;
    } else if (s.type === 'arc') {
      // Arc length label
      lengthCounter++;
      const letter = String.fromCharCode('A'.charCodeAt(0) + lengthCounter - 1);
      const th = s.value / s.radius;
      const cx = x + s.radius * Math.cos(ang + Math.PI/2);
      const cy = y + s.radius * Math.sin(ang + Math.PI/2);
      const midAng = ang + th/2;
      const arcX = cx + s.radius * Math.cos(midAng);
      const arcY = cy + s.radius * Math.sin(midAng);
      shapeObject.labels.push({ x: arcX, y: arcY, text: letter, type: 'length' });
      // Radius label: R1, R2, ...
      radiusCounter++;
      shapeObject.labels.push({ x: cx, y: cy + 15, text: 'R' + radiusCounter, type: 'radius' });
      // update position and angle
      x = cx + s.radius * Math.cos(ang - Math.PI/2 + th);
      y = cy + s.radius * Math.sin(ang - Math.PI/2 + th);
      ang += th;
    } else if (s.type === 'angle') {
      // Angle label: Greek letters α, β, γ,...
      angleCounter++;
      const greek = greekLetters[angleCounter - 1] || greekLetters[0];
      shapeObject.labels.push({ x: x, y: y, text: greek, type: 'angle' });
      ang += s.value * Math.PI/180;
    }
  });
}

// Disegna preview e HTML inputs
const origDraw = window.drawPreview;
window.drawPreview = function(slots, startAngle) {
  origDraw(slots, startAngle);
  // Sovrapposizione HTML
  renderLabelInputs();
};

// Crea o aggiorna gli <input> per ogni label
function renderLabelInputs() {
  const wrapper = document.getElementById('canvasWrapper');
  if (!wrapper) return;
  // Pulisci
  wrapper.querySelectorAll('.label-input').forEach(el => el.remove());
  // Crea
  shapeObject.labels.forEach((lbl, idx) => {
    const inp = document.createElement('input');
    inp.className = 'label-input';
    inp.type = 'text';
    inp.value = lbl.text;
    // Style based on type
    inp.style.position = 'absolute';
    inp.style.left = (lbl.x * window.zoom + window.panOffset.x) + 'px';
    inp.style.top  = (lbl.y * window.zoom + window.panOffset.y) + 'px';
    inp.style.minWidth = '2ch'; inp.style.width = (lbl.text.length + 2) + 'ch';
    inp.style.fontSize = '12px';
    inp.style.fontStyle = lbl.type === 'length' ? 'italic' : 'normal';
    const color = lbl.type === 'length' ? 'black' : lbl.type === 'angle' ? 'red' : lbl.type === 'radius' ? 'blue' : 'black';
    inp.style.color = color;
    inp.style.borderColor = color;
    inp.style.cursor = window.isLocked ? 'default' : 'grab';
    inp.disabled = window.isLocked;
    // Cambia testo
    inp.addEventListener('change', e => {
      lbl.text = e.target.value;
      e.target.style.width = (e.target.value.length + 2) + 'ch';
      drawPreview(shapeObject.slots, shapeObject.startAngle);
    });
    // Drag
    inp.addEventListener('mousedown', e => {
      if (window.isLocked) return;
      e.stopPropagation();
      const sx = e.clientX, sy = e.clientY;
      const ox = lbl.x, oy = lbl.y;
      function onMove(ev) {
        lbl.x = ox + (ev.clientX - sx) / window.zoom;
        lbl.y = oy + (ev.clientY - sy) / window.zoom;
        invPos();
        drawPreview(shapeObject.slots, shapeObject.startAngle);
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
    wrapper.appendChild(inp);
  });
}

// Riposiziona inputs dopo pan/zoom
function invPos() {
  document.querySelectorAll('.label-input').forEach((inp, i) => {
    const lbl = shapeObject.labels[i];
    inp.style.left = (lbl.x * window.zoom + window.panOffset.x) + 'px';
    inp.style.top  = (lbl.y * window.zoom + window.panOffset.y) + 'px';
  });
}
// Rendi disponibile
window.updateLabelInputPositions = invPos;


// Rigenera labels al primo caricamento
window.addEventListener('DOMContentLoaded', () => {
  generateJSON();
});

// TODO: insert preservation logic - fallback
// trigger GitHub Pages build
