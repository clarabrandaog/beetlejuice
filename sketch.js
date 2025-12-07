// ----------------------------------------------------------
// Load crew.csv and render crew list
// ----------------------------------------------------------
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
    // Department title
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

  // Scroll to target person if present
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

// Run on page load
document.addEventListener('DOMContentLoaded', loadCrew);
