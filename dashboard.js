// ====== CONFIG ======
const API_BASE = 'https://cook-api-duur.onrender.com';
// Dev local : const API_BASE = 'http://localhost:8000/api';

// ====== CLÉ ADMIN ======
// La valeur saisie dans le champ mot de passe EST la clé ADMIN_API_KEY Laravel.
// Elle est envoyée dans chaque requête admin via le header X-Admin-Key.
// Aucun mot de passe séparé à maintenir : une seule clé partagée.
let ADMIN_KEY = '';

// Headers envoyés sur tous les appels admin
function adminHeaders() {
  return {
    'Accept':        'application/json',
    'Content-Type':  'application/json',
    'X-Admin-Key':   ADMIN_KEY,
  };
}

// ====== AUTHENTIFICATION ======
// On valide la clé en appelant /api/stats : si 401 → mauvaise clé
function checkPassword() {
  const val = document.getElementById('pwdInput').value.trim();
  if (!val) return;

  const btn = document.querySelector('#authScreen button');
  btn.disabled = true;
  btn.textContent = '⏳ Vérification...';

  ADMIN_KEY = val;

  fetch(`${API_BASE}/stats`, { headers: adminHeaders() })
    .then(res => {
      if (res.ok) {
        document.getElementById('authScreen').style.display = 'none';
        loadData();
      } else {
        showAuthError(res.status === 401
          ? 'Clé incorrecte. Réessayez.'
          : `Erreur serveur (${res.status}).`
        );
        ADMIN_KEY = '';
      }
    })
    .catch(() => {
      showAuthError('Impossible de joindre l\'API. Vérifiez la connexion.');
      ADMIN_KEY = '';
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = 'Accéder →';
    });
}

function showAuthError(msg) {
  const el = document.getElementById('pwdError');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('pwdInput').value = '';
  document.getElementById('pwdInput').focus();
}

// Valider avec Entrée
document.getElementById('pwdInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkPassword();
});
document.getElementById('pwdInput').focus();

// ====== ÉTAT ======
let allResponses     = [];
let filteredResponses = [];
let currentPage      = 1;
const PER_PAGE       = 20;
let sortField        = 'created_at';
let sortDir          = 'desc';

// ====== CHARGEMENT DES DONNÉES ======
async function loadData() {
  showState('loading');
  try {
    const res = await fetch(`${API_BASE}/responses?per_page=1000`, {
      headers: adminHeaders(),
    });

    if (res.status === 401) throw new Error('Session expirée. Rechargez la page.');
    if (!res.ok) throw new Error(`HTTP ${res.status} — Vérifiez la configuration de l'API`);

    const json = await res.json();
    allResponses      = json.data || json;
    filteredResponses = [...allResponses];

    renderAll();
    showState('content');
  } catch (err) {
    document.getElementById('errorDetail').textContent = err.message;
    showState('error');
  }
}

function showState(state) {
  document.getElementById('loadingState').classList.toggle('hidden', state !== 'loading');
  document.getElementById('errorState').classList.toggle('hidden', state !== 'error');
  document.getElementById('content').classList.toggle('hidden', state !== 'content');
}

// ====== RENDU GLOBAL ======
function renderAll() {
  renderStats();
  renderCharts();
  renderTable();
}

// ====== STATS KPI ======
function renderStats() {
  const total    = allResponses.length;
  const intDej   = allResponses.filter(r => r.petit_dej_interet?.includes('Oui')).length;
  const intLunch = allResponses.filter(r => r.dejeuner_interet?.includes('Oui')).length;
  const contacts = allResponses.filter(r => r.contact_ok?.includes('Oui')).length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${total}</div>
      <div class="stat-label">Réponses totales</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${intDej}</div>
      <div class="stat-label">Intéressés petit-déj</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${intLunch}</div>
      <div class="stat-label">Intéressés déjeuner</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${contacts}</div>
      <div class="stat-label">Veulent être contactés</div>
    </div>
  `;
}

// ====== CHARTS ======
function renderCharts() {
  renderBarChart('chartPetitDej',       countField(allResponses, 'petit_dej_interet'));
  renderBarChart('chartDejeuner',       countField(allResponses, 'dejeuner_interet'));
  renderBarChart('chartBudgetPetitDej', countField(allResponses, 'petit_dej_budget'));
  renderBarChart('chartBudgetDejeuner', countField(allResponses, 'dejeuner_budget'));
  renderBarChart('chartSituations',     countField(allResponses, 'situation'));
  renderBarChart('chartModeService',    countMultiField(allResponses, 'mode_service'));
}

function countField(data, field) {
  const counts = {};
  data.forEach(r => {
    const val = r[field] || 'Non renseigné';
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function countMultiField(data, field) {
  const counts = {};
  data.forEach(r => {
    const vals = Array.isArray(r[field])
      ? r[field]
      : (r[field] || '').split(', ').filter(Boolean);
    vals.forEach(v => { if (v) counts[v] = (counts[v] || 0) + 1; });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function renderBarChart(containerId, entries) {
  const container = document.getElementById(containerId);
  if (!entries.length) {
    container.innerHTML = '<p class="text-white/30 text-sm text-center py-4">Aucune donnée</p>';
    return;
  }
  const max = Math.max(...entries.map(e => e[1]));
  container.innerHTML = entries.map(([label, count]) => `
    <div class="mb-3">
      <div class="flex justify-between text-xs mb-1">
        <span class="text-white/80 truncate max-w-[200px]" title="${label}">${label}</span>
        <span class="text-white/40 ml-2 flex-shrink-0">${count}</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width:${Math.round((count / max) * 100)}%"></div>
      </div>
    </div>
  `).join('');
}

// ====== TABLE ======
function renderTable() {
  const start     = (currentPage - 1) * PER_PAGE;
  const paginated = filteredResponses.slice(start, start + PER_PAGE);

  document.getElementById('tableCount').textContent = filteredResponses.length;
  document.getElementById('responsesBody').innerHTML = paginated.length === 0
    ? `<tr><td colspan="10" class="text-center text-white/30 py-12">📭 Aucune réponse trouvée</td></tr>`
    : paginated.map(r => `
      <tr class="cursor-pointer transition-colors hover:bg-white/[0.03]" onclick="showDetail(${r.id})">
        <td class="text-xs text-white/40 whitespace-nowrap">${formatDate(r.created_at)}</td>
        <td class="font-medium text-secondary whitespace-nowrap">${r.nom || '<span class="text-white/30 font-normal">Anonyme</span>'}</td>
        <td class="text-sm">${r.quartier || '-'}</td>
        <td><span class="tag">${r.situation || '-'}</span></td>
        <td>${interetBadge(r.petit_dej_interet)}</td>
        <td>${interetBadge(r.dejeuner_interet)}</td>
        <td class="text-xs text-white/60">${r.dejeuner_budget || '-'}</td>
        <td class="text-xs text-white/60 max-w-[140px] truncate">${formatArray(r.mode_service)}</td>
        <td class="text-xs text-white/60">${r.whatsapp || '-'}</td>
        <td>${r.contact_ok?.includes('Oui')
          ? '<span class="text-success text-xs font-medium">✅ Oui</span>'
          : '<span class="text-white/30 text-xs">Non</span>'}</td>
      </tr>
    `).join('');

  renderPagination();
}

function interetBadge(val) {
  if (!val) return '<span class="text-white/30 text-xs">-</span>';
  if (val.includes('absolument') || val.includes('certainement'))
    return `<span class="text-xs text-success font-medium">🔥 ${val}</span>`;
  if (val.includes('peut-être'))
    return `<span class="text-xs text-secondary">🤔 ${val}</span>`;
  return `<span class="text-xs text-white/30">❌ ${val}</span>`;
}

function formatArray(val) {
  if (!val) return '-';
  return Array.isArray(val) ? val.join(', ') || '-' : val || '-';
}

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ====== PAGINATION ======
function renderPagination() {
  const total      = filteredResponses.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  const start      = (currentPage - 1) * PER_PAGE + 1;
  const end        = Math.min(currentPage * PER_PAGE, total);

  document.getElementById('paginationInfo').textContent =
    total > 0 ? `Affichage ${start}–${end} sur ${total} réponse${total > 1 ? 's' : ''}` : '';

  const btns = document.getElementById('paginationBtns');
  if (totalPages <= 1) { btns.innerHTML = ''; return; }

  const pages = [];
  for (let p = 1; p <= Math.min(totalPages, 7); p++) {
    pages.push(
      `<button onclick="goPage(${p})"
        class="px-3 py-1.5 rounded-lg text-sm transition-all
          ${p === currentPage
            ? 'bg-primary text-white'
            : 'border border-white/10 text-white/60 hover:border-primary/40 hover:text-white'}"
      >${p}</button>`
    );
  }

  btns.innerHTML = `
    <button onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}
      class="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/60
             disabled:opacity-30 hover:border-primary/40 transition-all">←</button>
    ${pages.join('')}
    <button onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}
      class="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/60
             disabled:opacity-30 hover:border-primary/40 transition-all">→</button>
  `;
}

function goPage(p) {
  const totalPages = Math.ceil(filteredResponses.length / PER_PAGE);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderTable();
  window.scrollTo({ top: 300, behavior: 'smooth' });
}

// ====== RECHERCHE & FILTRES ======
function filterTable() {
  const query   = document.getElementById('searchInput').value.toLowerCase().trim();
  const interet = document.getElementById('filterInteret').value;
  const contact = document.getElementById('filterContact').value;

  filteredResponses = allResponses.filter(r => {
    const matchSearch  = !query
      || (r.nom || '').toLowerCase().includes(query)
      || (r.quartier || '').toLowerCase().includes(query)
      || (r.whatsapp || '').toLowerCase().includes(query)
      || (r.situation || '').toLowerCase().includes(query);
    const matchInteret = !interet || r.dejeuner_interet === interet;
    const matchContact = !contact || (contact === 'Oui' && r.contact_ok?.includes('Oui'));
    return matchSearch && matchInteret && matchContact;
  });

  currentPage = 1;
  renderTable();
}

// ====== TRI ======
function sortTable(field) {
  if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortField = field; sortDir = 'desc'; }

  filteredResponses.sort((a, b) => {
    const va = (a[field] || '').toString();
    const vb = (b[field] || '').toString();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  renderTable();
}

// ====== DÉTAIL D'UNE RÉPONSE ======
function showDetail(id) {
  const r = allResponses.find(r => r.id === id);
  if (!r) return;

  const field = (label, val) => {
    const display = Array.isArray(val) ? val.join(', ') : val;
    if (!display) return '';
    return `
      <div class="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
        <div class="text-xs text-white/40 mb-1">${label}</div>
        <div class="text-sm text-text-main leading-relaxed">${display}</div>
      </div>
    `;
  };

  document.getElementById('detailContent').innerHTML = `
    <div class="col-span-full flex items-center gap-4 mb-2 pb-5 border-b border-white/10">
      <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl flex-shrink-0">👤</div>
      <div>
        <div class="font-semibold text-secondary text-lg">${r.nom || 'Anonyme'}</div>
        <div class="text-xs text-white/40">${r.whatsapp || 'Pas de WhatsApp'} &nbsp;•&nbsp; ${formatDate(r.created_at)}</div>
      </div>
    </div>
    ${field('Situation professionnelle', r.situation)}
    ${field('Quartier de travail', r.quartier)}
    ${field('Habitude petit déj', r.petit_dej_habitude)}
    ${field('Intérêt petit déj', r.petit_dej_interet)}
    ${field('Menu petit déj souhaité', r.petit_dej_menu)}
    ${field('Heure petit déj', r.petit_dej_heure)}
    ${field('Budget petit déj', r.petit_dej_budget)}
    ${field('Lieu déjeuner habituel', r.dejeuner_lieu)}
    ${field('Intérêt déjeuner', r.dejeuner_interet)}
    ${field('Menu déjeuner souhaité', r.dejeuner_menu)}
    ${field('Contraintes alimentaires', r.contraintes)}
    ${field('Heure déjeuner', r.dejeuner_heure)}
    ${field('Budget déjeuner', r.dejeuner_budget)}
    ${field('Mode de service', r.mode_service)}
    ${field('Abonnement', r.abonnement)}
    ${field('Contact souhaité', r.contact_ok)}
  `;

  const panel = document.getElementById('detailPanel');
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeDetail() {
  document.getElementById('detailPanel').classList.add('hidden');
}

// ====== EXPORT CSV ======
function exportCSV() {
  const data = filteredResponses.length > 0 ? filteredResponses : allResponses;
  if (!data.length) { alert('Aucune réponse à exporter.'); return; }

  const headers = [
    'id', 'created_at',
    'nom', 'whatsapp', 'contact_ok',
    'situation', 'quartier',
    'petit_dej_habitude', 'petit_dej_interet', 'petit_dej_menu',
    'petit_dej_heure', 'petit_dej_budget',
    'dejeuner_lieu', 'dejeuner_interet', 'dejeuner_menu',
    'contraintes', 'dejeuner_heure', 'dejeuner_budget',
    'mode_service', 'abonnement',
  ];

  const escape = v => {
    if (Array.isArray(v)) v = v.join(' | ');
    return `"${String(v ?? '').replace(/"/g, '""')}"`;
  };

  const rows = data.map(r => headers.map(h => escape(r[h])).join(';'));
  const csv  = [headers.join(';'), ...rows].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `cocooking_reponses_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}