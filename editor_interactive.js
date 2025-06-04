
// editor_interactive.js - versione corretta per GitHub Pages

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
      const offsetX = -dy / norm * 10;
      const offsetY = dx / norm * 10;
      shapeObject.labels.push({ x: midX, y: midY, ox: offsetX, oy: offsetY, text: String.fromCharCode(64 + lengthCounter), type: 'length' });
      x += dx;
      y += dy;
    } else if (s.type === 'angle') {
      angleCounter++;
      shapeObject.labels.push({ x: x, y: y, ox: 10, oy: 10, text: greek[angleCounter - 1], type: 'angle' });
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
    wrapper.appendChild(input);
  });

  updateLabelInputPositions();
}

function updateLabelInputPositions() {
  const inputs = document.querySelectorAll('.label-input');
  inputs.forEach((input, i) => {
    const lbl = shapeObject.labels[i];
    const px = (lbl.x + (lbl.ox || 0)) * zoom + panOffset.x;
    const py = (lbl.y + (lbl.oy || 0)) * zoom + panOffset.y;
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
