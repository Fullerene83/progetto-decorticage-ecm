
// editor_interactive.js - stabile: offset costante, tag visivi non deformati

let shapeObject = {
  code: '', description: '', diameter: '', mandrel: 0,
  startAngle: 0, slots: [], labels: []
};

const origGenerateJSON = window.generateJSON;
window.generateJSON = function () {
  origGenerateJSON();
  shapeObject.slots = JSON.parse(document.getElementById('jsonPreview').textContent);
  shapeObject.startAngle = parseFloat(document.getElementById('startAngle').value) || 0;
  shapeObject.diameter = document.getElementById('diameter').value;
  shapeObject.mandrel = parseFloat(document.getElementById('mandrel').value) || 0;
  shapeObject.code = document.getElementById('shapeCode').value.trim();
  shapeObject.description = document.getElementById('shapeLabel').value.trim();
  const expected = shapeObject.slots.reduce((sum, s) => sum + (s.type==='arc'?2:1), 0);
  if (shapeObject.labels.length !== expected || shapeObject.labels.length === 0) initDefaultLabels();
  renderLabelInputs();
};

function initDefaultLabels() {
  shapeObject.labels = [];
  let lengthCounter = 0, angleCounter = 0;
  const greek = ['α','β','γ','δ','ε','ζ','η','θ'];
  let x = canvas.width / 2;
  let y = canvas.height / 2;
  let ang = shapeObject.startAngle * Math.PI / 180;

  shapeObject.slots.forEach(s => {
    if (s.type === 'length') {
      lengthCounter++;
      const dx = s.value * Math.cos(ang);
      const dy = s.value * Math.sin(ang);
      const midX = x + dx / 2;
      const midY = y + dy / 2;
      const norm = Math.hypot(dx, dy);
      const ux = -dy / norm;
      const uy = dx / norm;
      shapeObject.labels.push({ x: midX, y: midY, ux, uy, text: String.fromCharCode(64 + lengthCounter), type: 'length' });
      x += dx;
      y += dy;
    } else if (s.type === 'angle') {
      angleCounter++;
      shapeObject.labels.push({ x: x, y: y, ux: 0.7, uy: 0.7, text: greek[angleCounter - 1], type: 'angle' });
      ang += s.value * Math.PI / 180;
    }
  });
}

function renderLabelInputs() {
  const wrapper = document.getElementById('canvasWrapper');
  if (!wrapper) return;
  wrapper.querySelectorAll('.label-input').forEach(el => el.remove());

  shapeObject.labels.forEach((lbl, idx) => {
    const input = document.createElement('input');
    input.className = 'label-input';
    input.type = 'text';
    input.value = lbl.text;
    input.readOnly = true;
    input.style.position = 'absolute';
    input.style.fontSize = '12px';
    input.style.fontStyle = lbl.type === 'length' ? 'italic' : 'normal';
    const color = lbl.type === 'length' ? 'black' : 'red';
    input.style.color = color;
    input.style.borderColor = color;
    input.style.padding = '0px';
    input.style.margin = '0px';
    input.style.height = 'auto';
    input.style.minWidth = '2ch';
    wrapper.appendChild(input);
  });

  updateLabelInputPositions();
}

function updateLabelInputPositions() {
  const offsetPx = 12;
  const inputs = document.querySelectorAll('.label-input');
  inputs.forEach((input, i) => {
    const lbl = shapeObject.labels[i];
    const baseX = lbl.x * zoom + panOffset.x;
    const baseY = lbl.y * zoom + panOffset.y;
    const px = baseX + (lbl.ux || 0) * offsetPx;
    const py = baseY + (lbl.uy || 0) * offsetPx;
    input.style.left = px + 'px';
    input.style.top = py + 'px';
  });
}
window.updateLabelInputPositions = updateLabelInputPositions;

const origDraw = window.drawPreview;
window.drawPreview = function (slots, startAngle) {
  origDraw(slots, startAngle);
  renderLabelInputs();
};

window.addEventListener('DOMContentLoaded', () => {
  generateJSON();
});
