// ====== STORAGE KEY ======
const STORAGE_KEY = 'cocooking_responses';

// ====== PROGRESS ======
function updateProgress() {
  const required = document.querySelectorAll('[required], input[name="situation"], input[name="dejeuner_interet"]');
  const total = document.querySelectorAll('.question').length;
  const answered = document.querySelectorAll('input:checked, input[type="text"][name]:not([value=""]), input[type="tel"][name]:not([value=""])').length;
  const pct = Math.min(Math.round((answered / Math.max(total, 1)) * 100), 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').innerText = pct + '%';
}
document.querySelectorAll('input').forEach(inp => inp.addEventListener('change', updateProgress));
document.querySelectorAll('.text-input').forEach(inp => inp.addEventListener('input', updateProgress));

// ====== FORM SUBMIT ======
document.getElementById('surveyForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Enregistrement...';

  // Collect data
  const fd = new FormData(this);
  const data = {
    id: Date.now(),
    date: new Date().toLocaleString('fr-FR'),
    situation: fd.get('situation') || '',
    quartier: fd.get('quartier') || '',
    petit_dej_habitude: fd.get('petit_dej_habitude') || '',
    petit_dej_interet: fd.get('petit_dej_interet') || '',
    petit_dej_menu: fd.getAll('petit_dej_menu').join(', '),
    petit_dej_heure: fd.get('petit_dej_heure') || '',
    petit_dej_budget: fd.get('petit_dej_budget') || '',
    dejeuner_lieu: fd.getAll('dejeuner_lieu').join(', '),
    dejeuner_interet: fd.get('dejeuner_interet') || '',
    dejeuner_menu: fd.getAll('dejeuner_menu').join(', '),
    contraintes: fd.getAll('contraintes').join(', '),
    dejeuner_heure: fd.get('dejeuner_heure') || '',
    dejeuner_budget: fd.get('dejeuner_budget') || '',
    mode_service: fd.getAll('mode_service').join(', '),
    abonnement: fd.get('abonnement') || '',
    nom: fd.get('nom') || '',
    whatsapp: fd.get('whatsapp') || '',
    contact_ok: fd.get('contact_ok') || '',
  };

  // Save to persistent storage
  try {
    const existing = await getResponses();
    existing.push(data);
    await window.storage.set(STORAGE_KEY, JSON.stringify(existing));
  } catch(err) {
    console.log('Storage error:', err);
  }

  // Show success
  setTimeout(() => {
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('successScreen').classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 800);
});

// ====== STORAGE HELPERS ======
async function getResponses() {
  try {
    const result = await window.storage.get(STORAGE_KEY);
    return result ? JSON.parse(result.value) : [];
  } catch {
    return [];
  }
}

// ====== ADMIN PANEL ======
function toggleAdmin() {
  const panel = document.getElementById('adminPanel');
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
  } else {
    panel.classList.add('open');
    loadAdmin();
  }
}

async function loadAdmin() {
  const responses = await getResponses();
  const statsGrid = document.getElementById('statsGrid');
  const responsesList = document.getElementById('responsesList');

  // Stats
  const interested_dej = responses.filter(r => r.petit_dej_interet && r.petit_dej_interet.includes('Oui')).length;
  const interested_lunch = responses.filter(r => r.dejeuner_interet && r.dejeuner_interet.includes('Oui')).length;
  const want_contact = responses.filter(r => r.contact_ok && r.contact_ok.includes('Oui')).length;

  statsGrid.innerHTML = `
    <div class="stat-card"><div class="stat-number">${responses.length}</div><div class="stat-label">Réponses totales</div></div>
    <div class="stat-card"><div class="stat-number">${interested_dej}</div><div class="stat-label">Intéressés petit déj</div></div>
    <div class="stat-card"><div class="stat-number">${interested_lunch}</div><div class="stat-label">Intéressés déjeuner</div></div>
    <div class="stat-card"><div class="stat-number">${want_contact}</div><div class="stat-label">Veulent être contactés</div></div>
  `;

  if (responses.length === 0) {
    responsesList.innerHTML = '<div class="no-data">📭 Aucune réponse enregistrée pour le moment.</div>';
    return;
  }

  responsesList.innerHTML = responses.slice().reverse().map((r, i) => `
    <div class="response-card">
      <h4>
        <span>${r.nom || 'Anonyme'} ${r.whatsapp ? '• ' + r.whatsapp : ''}</span>
        <span style="font-size:11px;color:var(--muted);font-weight:400">${r.date}</span>
      </h4>
      <div class="response-detail"><strong>Profil :</strong> ${r.situation} — ${r.quartier}</div>
      <div class="response-detail"><strong>Petit déj :</strong> ${r.petit_dej_habitude} | Intérêt : ${r.petit_dej_interet} | Budget : ${r.petit_dej_budget}</div>
      ${r.petit_dej_menu ? `<div class="response-detail"><strong>Menu petit déj :</strong> ${r.petit_dej_menu}</div>` : ''}
      <div class="response-detail"><strong>Déjeuner :</strong> Intérêt : ${r.dejeuner_interet} | Heure : ${r.dejeuner_heure} | Budget : ${r.dejeuner_budget}</div>
      ${r.dejeuner_menu ? `<div class="response-detail"><strong>Menu déjeuner :</strong> ${r.dejeuner_menu}</div>` : ''}
      ${r.contraintes ? `<div class="response-detail"><strong>Contraintes :</strong> ${r.contraintes}</div>` : ''}
      <div class="response-detail"><strong>Service :</strong> ${r.mode_service} | Abonnement : ${r.abonnement}</div>
    </div>
  `).join('');
}

// ====== EXPORT CSV ======
async function exportCSV() {
  const responses = await getResponses();
  if (!responses.length) { alert('Aucune réponse à exporter.'); return; }

  const headers = Object.keys(responses[0]);
  const rows = responses.map(r => headers.map(h => `"${(r[h]||'').replace(/"/g,'""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'cocooking_reponses.csv'; a.click();
  URL.revokeObjectURL(url);
}
