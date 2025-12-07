// -----------------------------------------------------
// LOAD & RENDER CREW
// -----------------------------------------------------

function loadCrew() {
  Papa.parse('crew.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      renderCrew(results.data);
    }
  });
}

function renderCrew(crew) {
  const container = document.getElementById('crewContainer');
  container.innerHTML = '';

  // Group by department
  const departments = {};
  crew.forEach(p => {
    const dept = p.department || 'Unknown';
    if (!departments[dept]) departments[dept] = [];
    departments[dept].push(p);
  });

  Object.keys(departments).sort().forEach(dept => {
    const deptEl = document.createElement('h2');
    deptEl.textContent = dept.toUpperCase();
    deptEl.className = 'department-title';
    container.appendChild(deptEl);

    // People
    departments[dept].forEach(p => {
      const card = document.createElement('div');
      card.className = 'person-card';

      const img = document.createElement('img');
      img.src = p.picture || '';
      img.alt = p.name || '';
      img.loading = 'lazy';
      card.appendChild(img);

      const info = document.createElement('div');
      info.className = 'person-info';
      info.innerHTML = `
        <h3>${p.name || ''}</h3>
        <div class="fn">${p.function || p.fn || ''}</div>
        <div class="bio">${p.bio || ''}</div>
      `;
      card.appendChild(info);

      container.appendChild(card);
    });
  });

  // Scroll to specific person
  const params = new URLSearchParams(window.location.search);
  const targetName = params.get('person');
  if (targetName) {
    const cards = [...document.querySelectorAll('.person-card')];
    const targetCard = cards.find(c => c.querySelector('h3').textContent === targetName);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

document.addEventListener('DOMContentLoaded', loadCrew);



// -----------------------------------------------------
// SPIRAL BACKGROUND (p5.js)
// -----------------------------------------------------

let angle = 0;
let wigglePhase = 0;

function drawBackgroundSpiral() {
  background("#9bb745");
  angle -= 0.01;
  wigglePhase += 0.05;

  const wiggleScale = 1 + sin(wigglePhase) * 0.05;
  drawSpiral(width / 2, height / 2, angle, wiggleScale);
}

function drawSpiral(cx, cy, rotation, scaleVal) {
  push();
  translate(cx, cy);
  rotate(rotation);
  scale(scaleVal);

  fill("rgba(155,183,69,0.2)");
  blendMode(MULTIPLY);
  beginShape();
  noStroke();

  const maxRadius = min(width, height * 2);
  const turns = 5;
  const points = 200;

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const a = t * turns * TWO_PI;
    const r = t * maxRadius;
    vertex(cos(a) * r, sin(a) * r);
  }

  for (let i = points; i >= 0; i--) {
    const t = i / points;
    const a = t * turns * TWO_PI;
    const r = t * maxRadius * 0.85;
    vertex(cos(a) * r, sin(a) * r);
  }

  endShape(CLOSE);
  blendMode(BLEND);
  pop();
}



// -----------------------------------------------------
// p5.js SKETCH (required to run the spiral)
// -----------------------------------------------------

function setup() {
  const canvas = createCanvas(window.innerWidth, window.innerHeight);
  canvas.position(0, 0);
  canvas.style('z-index', '-1');   // keep the spiral behind everything
  canvas.style('position', 'fixed');
}

function draw() {
  drawBackgroundSpiral();
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
}
