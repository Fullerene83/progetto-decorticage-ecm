window.snapRadius = 5;

let selectedMeasurementIndex = null;
const unitFactor = 1;

let snapPoints = [];
let segmentGeoms = [];
let segmentSlotIdx = [];

const measurementState = {
  snapEnabled: false,
  snapClicks: [],
  hoveredSnap: null,
  mode: null,
  measurements: [],
  showTag: {
    linear: false,
    arcLength: false,
    angular: false
  },
};

window.buildSnapPoints = function(slots, startAngle) {
  snapPoints = [];
  segmentGeoms = [];
  segmentSlotIdx = [];

  if (!Array.isArray(slots)) return;

  let x = canvas.width / (2 * zoom);
  let y = canvas.height / (2 * zoom);
  let ang = startAngle * Math.PI / 180;

  slots.forEach((slot, i) => {
    if (slot.type === 'length') {
      const x1 = x;
      const y1 = y;
      x += slot.value * Math.cos(ang);
      y += slot.value * Math.sin(ang);
      const x2 = x;
      const y2 = y;
      snapPoints.push({ id: `S_${i}_0`, x: x1, y: y1 });
      snapPoints.push({ id: `S_${i}_1`, x: (x1 + x2) / 2, y: (y1 + y2) / 2 });
      snapPoints.push({ id: `S_${i}_2`, x: x2, y: y2 });
      segmentGeoms.push({ type: 'line', start: { x: x1, y: y1 }, end: { x: x2, y: y2 } });
      segmentSlotIdx.push(i);
    
    } else if (slot.type === 'arc') {
      const theta = slot.value / slot.radius;
      const cx = x + slot.radius * Math.cos(ang + Math.PI / 2);
      const cy = y + slot.radius * Math.sin(ang + Math.PI / 2);
      const startAngle = ang - Math.PI / 2;
      const endAngle = startAngle + theta;

      const arcStart = { x: x, y: y };
      const arcMid = {
        x: cx + slot.radius * Math.cos((startAngle + endAngle) / 2),
        y: cy + slot.radius * Math.sin((startAngle + endAngle) / 2)
      };
      const arcEnd = {
        x: cx + slot.radius * Math.cos(endAngle),
        y: cy + slot.radius * Math.sin(endAngle)
      };

      snapPoints.push({ id: `S_${i}_0`, x: arcStart.x, y: arcStart.y });
      snapPoints.push({ id: `S_${i}_1`, x: arcMid.x, y: arcMid.y });
      snapPoints.push({ id: `S_${i}_2`, x: arcEnd.x, y: arcEnd.y });

      segmentGeoms.push({
        type: 'arc',
        center: { x: cx, y: cy },
        radius: slot.radius,
        startAngle,
        endAngle
      });
      segmentSlotIdx.push(i);

      x = arcEnd.x;
      y = arcEnd.y;
      ang += theta;

    } else if (slot.type === 'angle') {
      ang += slot.value * Math.PI / 180;
    }
  });

  console.log('✅ SnapPoints built:', snapPoints.map(p => p.id));
};

function drawSnapLinear(m) {
    measurementState.measurements
      .filter(m => m.type === 'arcLength')
      .forEach(drawSnapArc);
    measurementState.measurements
      .filter(m => m.type === 'arcLength')
      .forEach(drawSnapArc);
  if (!m || !m.offset) return;

  let p1 = null, p2 = null;
  let seg = null;

  if (typeof m.slotIndex === 'number') {
    const idx = segmentSlotIdx.indexOf(m.slotIndex);
    if (idx >= 0) seg = segmentGeoms[idx];
  }

  if (seg?.type === 'line') {
    p1 = { x: seg.start.x, y: seg.start.y };
    p2 = { x: seg.end.x, y: seg.end.y };
  } else if (m.snapId1 && m.snapId2) {
    const sp1 = snapPoints.find(s => s.id === m.snapId1);
    const sp2 = snapPoints.find(s => s.id === m.snapId2);
    if (sp1 && sp2) {
      p1 = sp1;
      p2 = sp2;
    }
  } else if (m.p1 && m.p2) {
    p1 = m.p1;
    p2 = m.p2;
  }

  if (!p1 || !p2) {
    console.warn('🛑 Misura ignorata: dati incompleti.', m);
    return;
  }

  m.p1 = p1;
  m.p2 = p2;

  const offset = m.offset;
  const p1o = { x: p1.x + offset.dx, y: p1.y + offset.dy };
  const p2o = { x: p2.x + offset.dx, y: p2.y + offset.dy };
  const mid = { x: (p1o.x + p2o.x) / 2, y: (p1o.y + p2o.y) / 2 };
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);

  ctx.beginPath();
  ctx.moveTo(p1o.x, p1o.y);
  ctx.lineTo(p2o.x, p2o.y);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = window.lineWidth / zoom;
  ctx.stroke();

  for (const pt of [p1o, p2o]) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, window.snapRadius / zoom, 0, 2 * Math.PI);
    ctx.fillStyle = 'blue';
    ctx.fill();
  }

  const id = 'snap-measure-' + measurementState.measurements.indexOf(m);
  let inp = document.getElementById(id);
  if (!inp) {
    inp = document.createElement('input');
    inp.id = id;
    inp.className = 'measure-input';
    inp.readOnly = true;
    inp.title = 'Drag per spostare; tasto destro per eliminare';
    inp.style.position = 'absolute';
    inp.style.minWidth = '2ch';
    document.getElementById('canvasWrapper').appendChild(inp);
  }

  inp.value = (measurementState.showTag.linear ? (m.tag || "A") : len.toFixed(1) + ' cm');
  inp.readOnly = !measurementState.showTag.linear;
  inp.onchange = () => { m.tag = inp.value; };
  
  // Offset perpendicolare di 10px
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenVec = Math.sqrt(dx * dx + dy * dy) || 1;
  const offX = -dy / lenVec;
  const offY = dx / lenVec;
  const offsetPx = 10 / zoom;
  const tagX = mid.x + offX * offsetPx;
  const tagY = mid.y + offY * offsetPx;

  inp.style.left = (tagX * zoom + panOffset.x) + 'px';
  inp.style.top  = (tagY * zoom + panOffset.y) + 'px';

  inp.style.width = (inp.value.length + 2) + 'ch';

  inp.oncontextmenu = e => {
    e.preventDefault();
    inp.remove();
    measurementState.measurements = measurementState.measurements.filter(x => x !== m);
    if (typeof refreshPreview === 'function') refreshPreview();
  };

  inp.onpointerdown = e => {
    isDraggingMeasurement = true;
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left - panOffset.x) / zoom;
    const sy = (e.clientY - rect.top - panOffset.y) / zoom;
    const orig = { dx: offset.dx, dy: offset.dy };

    function mv(ev) {
      const cx = (ev.clientX - rect.left - panOffset.x) / zoom;
      const cy = (ev.clientY - rect.top - panOffset.y) / zoom;
      offset.dx = orig.dx + (cx - sx);
      offset.dy = orig.dy + (cy - sy);
      if (typeof refreshPreview === 'function') refreshPreview();
    }

    function up() {
      isDraggingMeasurement = false;
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    }

    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
}

function updateActive() {
  const map = {
    linear: 'measureLinearBtn',
    angular: 'measureAngularBtn',
    arcLength: 'measureArcBtn'
  };
  Object.entries(map).forEach(([key, id]) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', measurementState.mode === key);
  });
}

function addMeasurementUI() {
  const snapBtn = document.getElementById('toggleSnapBtn');
  if (snapBtn) {
    snapBtn.onclick = () => {
      measurementState.snapEnabled = !measurementState.snapEnabled;
      const enabled = measurementState.snapEnabled;
      snapBtn.classList.toggle('active', enabled);
      snapBtn.textContent = `Snap Points: ${enabled ? 'ON' : 'OFF'}`;
      if (typeof refreshPreview === 'function') refreshPreview();
    };
    snapBtn.textContent = `Snap Points: ${measurementState.snapEnabled ? 'ON' : 'OFF'}`;
  }

  const map = {
    linear: 'measureLinearBtn',
    angular: 'measureAngularBtn',
    arcLength: 'measureArcBtn'
  };
  Object.entries(map).forEach(([t, id]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.onclick = () => {
        measurementState.mode = (measurementState.mode === t) ? null : t;
        updateActive();
  const cbLinear = document.getElementById('showTagLinear');
  const cbArc = document.getElementById('showTagArc');
  const cbAng = document.getElementById('showTagAngular');
  if (cbLinear) cbLinear.onchange = () => { measurementState.showTag.linear = cbLinear.checked; refreshPreview(); };
  if (cbArc) cbArc.onchange = () => { measurementState.showTag.arcLength = cbArc.checked; refreshPreview(); };
  if (cbAng) cbAng.onchange = () => { measurementState.showTag.angular = cbAng.checked; refreshPreview(); };


  const controls = document.getElementById('measureControls');
  const clearBtn = document.createElement('button');
  clearBtn.id = 'clearMeasureBtn';
  clearBtn.className = 'measure-btn';
  clearBtn.textContent = 'Reset Measures';
  clearBtn.onclick = () => {
    document.querySelectorAll('.measure-input').forEach(el => el.remove());
    measurementState.measurements = [];
    measurementState.snapClicks = [];
    if (typeof refreshPreview === 'function') refreshPreview();
  };
  if (!document.getElementById('clearMeasureBtn')) {
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clearMeasureBtn';
    clearBtn.className = 'measure-btn';
    clearBtn.textContent = 'Reset Measures';
    clearBtn.onclick = () => {
      document.querySelectorAll('.measure-input').forEach(el => el.remove());
      measurementState.measurements = [];
      measurementState.snapClicks = [];
      if (typeof refreshPreview === 'function') refreshPreview();
    };
    controls.appendChild(clearBtn);
  }
      };
    }
  });

  const controls = document.getElementById('measureControls');
  const clearBtn = document.createElement('button');
  clearBtn.id = 'clearMeasureBtn';
  clearBtn.className = 'measure-btn';
  clearBtn.textContent = 'Reset Measures';
  clearBtn.onclick = () => {
    document.querySelectorAll('.measure-input').forEach(el => el.remove());
    measurementState.measurements = [];
    measurementState.snapClicks = [];
    if (typeof refreshPreview === 'function') refreshPreview();
  };
  controls.appendChild(clearBtn);

  updateActive();
  const cbLinear = document.getElementById('showTagLinear');
  const cbArc = document.getElementById('showTagArc');
  const cbAng = document.getElementById('showTagAngular');
  if (cbLinear) cbLinear.onchange = () => { measurementState.showTag.linear = cbLinear.checked; refreshPreview(); };
  if (cbArc) cbArc.onchange = () => { measurementState.showTag.arcLength = cbArc.checked; refreshPreview(); };
  if (cbAng) cbAng.onchange = () => { measurementState.showTag.angular = cbAng.checked; refreshPreview(); };

}


function onCanvasClick(e) {
  if (!measurementState.snapEnabled || !['linear', 'arcLength'].includes(measurementState.mode)) return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - panOffset.x) / zoom;
  const y = (e.clientY - rect.top - panOffset.y) / zoom;

  const nearest = snapPoints.reduce((closest, pt) => {
    const d = Math.hypot(pt.x - x, pt.y - y);
    return (!closest || d < closest.d) ? { pt, d } : closest;
  }, null);

  if (!nearest || nearest.d > 15 / zoom) return;

  measurementState.snapClicks.push(nearest.pt);
  if (measurementState.snapClicks.length === 2) {
    const [p1, p2] = measurementState.snapClicks;

    const type = measurementState.mode === 'arcLength' ? 'arcLength' : 'snapLinear';
    const newMeasure = {
      type,
      p1,
      p2,
      snapId1: p1.id,
      snapId2: p2.id,
      offset: { dx: 0, dy: 0 },
      reversed: false
    };

    if (type === 'arcLength') {
      // Trova segmento arco che contiene entrambi gli snapId
      for (let i = 0; i < segmentSlotIdx.length; i++) {
        const seg = segmentGeoms[i];
        if (seg.type === 'arc') {
          const sid = segmentSlotIdx[i];
          const id0 = `S_${sid}_0`, id1 = `S_${sid}_1`, id2 = `S_${sid}_2`;
          const match = [id0, id1, id2];
          if (match.includes(p1.id) && match.includes(p2.id)) {
            newMeasure.slotIndex = sid;
            break;
          }
        }
      }
    }

    measurementState.measurements.push(newMeasure);
    console.log('🧩 Nuova misura:', newMeasure);
    measurementState.snapClicks = [];
    refreshPreview();
  }
}


function initMeasurement() {

  const canvas = document.getElementById("previewCanvas");
  canvas.addEventListener("mousemove", e => {
    if (!measurementState.snapEnabled || !snapPoints) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;

    let found = null;
    snapPoints.forEach((p, i) => {
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < 12 / zoom) found = i;
    });
    measurementState.hoveredSnap = found;
    if (typeof refreshPreview === 'function') refreshPreview();
  });

  addMeasurementUI();
  canvas.addEventListener('click', onCanvasClick);
  window.updateMeasurementPositions = () => {};
  const originalDraw = window.drawPreview;
  window.drawPreview = (slots, startAng) => {
    originalDraw(slots, startAng);
    if (measurementState.snapEnabled) {
      snapPoints.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, window.snapRadius / zoom, 0, 2 * Math.PI);
      if (measurementState.snapClicks.includes(p)) {
        ctx.fillStyle = 'rgba(0,255,255,0.8)'; // selezionato
      } else if (measurementState.hoveredSnap === i) {
        ctx.fillStyle = 'rgba(0,200,255,0.6)'; // hover
      } else {
        ctx.fillStyle = 'rgba(0,0,255,0.5)';
      }
      ctx.fill();
      });
    }
    measurementState.measurements
      .filter(m => m.type === 'snapLinear')
      .forEach(drawSnapLinear);
    measurementState.measurements
      .filter(m => m.type === 'arcLength')
      .forEach(drawSnapArc);
  };
}

window.addEventListener('DOMContentLoaded', initMeasurement);




function drawSnapArc(m) {
  const seg = segmentGeoms[segmentSlotIdx.indexOf(m.slotIndex)];
  if (!seg || seg.type !== 'arc') return;

  const { center, radius } = seg;
  const sp1 = snapPoints.find(s => s.id === m.snapId1);
  const sp2 = snapPoints.find(s => s.id === m.snapId2);
  if (!sp1 || !sp2) return;

  let angle1 = Math.atan2(sp1.y - center.y, sp1.x - center.x);
  let angle2 = Math.atan2(sp2.y - center.y, sp2.x - center.x);

  if (m.reversed === true) {
    [angle1, angle2] = [angle2, angle1];
  }

  // Assicura sempre che angle2 > angle1 nel senso positivo
  while (angle2 < angle1) angle2 += 2 * Math.PI;

  const arcLen = radius * Math.abs(angle2 - angle1);
  const midAngle = (angle1 + angle2) / 2;

  const p1o = { x: sp1.x + m.offset.dx, y: sp1.y + m.offset.dy };
  const p2o = { x: sp2.x + m.offset.dx, y: sp2.y + m.offset.dy };
  const tagPos = {
    x: center.x + radius * Math.cos(midAngle) + m.offset.dx,
    y: center.y + radius * Math.sin(midAngle) + m.offset.dy
  };

  ctx.beginPath();
  ctx.arc(center.x + m.offset.dx, center.y + m.offset.dy, radius, angle1, angle2);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = window.lineWidth / zoom;
  ctx.stroke();

  for (const pt of [p1o, p2o]) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, window.snapRadius / zoom, 0, 2 * Math.PI);
    ctx.fillStyle = 'blue';
    ctx.fill();
  }

  const id = 'arc-measure-' + measurementState.measurements.indexOf(m);
  let inp = document.getElementById(id);
  if (!inp) {
    inp = document.createElement('input');
    inp.id = id;
    inp.className = 'measure-input';
    inp.readOnly = true;
    inp.title = 'Drag per spostare; Tab per invertire; tasto destro per eliminare';
    inp.style.position = 'absolute';
    inp.style.minWidth = '2ch';
    document.getElementById('canvasWrapper').appendChild(inp);
  }

  inp.value = (measurementState.showTag.arcLength ? (m.tag || "A") : arcLen.toFixed(1) + ' cm');
  inp.readOnly = !measurementState.showTag.arcLength;
  inp.onchange = () => { m.tag = inp.value; };
  inp.style.left = (tagPos.x * zoom + panOffset.x) + 'px';
  inp.style.top = (tagPos.y * zoom + panOffset.y - 20) + 'px';
  inp.style.width = (inp.value.length + 2) + 'ch';

  inp.tabIndex = 0;
  inp.onkeydown = e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      m.reversed = !m.reversed;
      if (typeof refreshPreview === 'function') refreshPreview();
    }
  };

  inp.oncontextmenu = e => {
    e.preventDefault();
    inp.remove();
    measurementState.measurements = measurementState.measurements.filter(x => x !== m);
    if (typeof refreshPreview === 'function') refreshPreview();
  };

  inp.onpointerdown = e => {
    isDraggingMeasurement = true;
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left - panOffset.x) / zoom;
    const sy = (e.clientY - rect.top - panOffset.y) / zoom;
    const orig = { dx: m.offset.dx, dy: m.offset.dy };

    function mv(ev) {
      const cx = (ev.clientX - rect.left - panOffset.x) / zoom;
      const cy = (ev.clientY - rect.top - panOffset.y) / zoom;
      m.offset.dx = orig.dx + (cx - sx);
      m.offset.dy = orig.dy + (cy - sy);
      if (typeof refreshPreview === 'function') refreshPreview();
    }

    function up() {
      isDraggingMeasurement = false;
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    }

    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
}







window.addEventListener("DOMContentLoaded", () => {
  const radiusInput = document.getElementById("snapRadiusInput");
  if (radiusInput) {
    radiusInput.addEventListener("input", e => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        window.snapRadius = val;
        if (typeof refreshPreview === "function") refreshPreview();
      }
    });
  }
});
