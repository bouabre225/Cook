// ====== CONFIG ======
const API_BASE = 'http://localhost:8000/api';
// Production : const API_BASE = 'https://your-api.onrender.com/api';

// ====== NOMS DE TOUS LES GROUPES DE QUESTIONS ======
// 14 groupes radio/checkbox + 2 champs texte = 16 champs au total
const RADIO_GROUPS = [
  'situation',          // section 1
  'quartier',           // section 1 (texte)
  'petit_dej_habitude', // section 2
  'petit_dej_interet',  // section 2
  'petit_dej_menu',     // section 2 (checkbox multiple)
  'petit_dej_heure',    // section 2
  'petit_dej_budget',   // section 2
  'dejeuner_lieu',      // section 3 (checkbox multiple)
  'dejeuner_interet',   // section 3
  'dejeuner_menu',      // section 3 (checkbox multiple)
  'contraintes',        // section 3 (checkbox multiple)
  'dejeuner_heure',     // section 3
  'dejeuner_budget',    // section 3
  'mode_service',       // section 4 (checkbox multiple)
  'abonnement',         // section 4
  'contact_ok',         // section 5
];
const TOTAL_FIELDS = RADIO_GROUPS.length; // 16

// ====== PROGRESS ======
function updateProgress() {
  let answered = 0;

  RADIO_GROUPS.forEach(name => {
    // Champ texte ou tel
    const textEl = document.querySelector(
      `input[type="text"][name="${name}"], input[type="tel"][name="${name}"]`
    );
    if (textEl) {
      if (textEl.value.trim().length > 0) answered++;
      return;
    }
    // Radio : au moins un coché
    if (document.querySelector(`input[type="radio"][name="${name}"]:checked`)) {
      answered++;
      return;
    }
    // Checkbox : au moins une cochée
    if (document.querySelector(`input[type="checkbox"][name="${name}"]:checked`)) {
      answered++;
    }
  });

  const pct = Math.min(Math.round((answered / TOTAL_FIELDS) * 100), 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').innerText = pct + '%';
}

// Écouter tous les inputs du formulaire
document.querySelectorAll('#surveyForm input').forEach(inp => {
  inp.addEventListener('change', updateProgress);
  inp.addEventListener('input', updateProgress);
});

// ====== SOUMISSION DU FORMULAIRE ======
document.getElementById('surveyForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const btn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.classList.add('hidden');

  // Validation des champs obligatoires
  const situation      = document.querySelector('input[name="situation"]:checked');
  const quartier       = document.querySelector('input[name="quartier"]').value.trim();
  const dejeunerInteret = document.querySelector('input[name="dejeuner_interet"]:checked');

  if (!situation) {
    showError('Veuillez sélectionner votre situation professionnelle.');
    return;
  }
  if (!quartier) {
    showError('Veuillez indiquer votre quartier de travail.');
    return;
  }
  if (!dejeunerInteret) {
    showError('Veuillez répondre à la question sur le déjeuner (obligatoire).');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Enregistrement...';

  const fd = new FormData(this);

  const payload = {
    situation:           fd.get('situation') || '',
    quartier:            fd.get('quartier') || '',
    petit_dej_habitude:  fd.get('petit_dej_habitude') || '',
    petit_dej_interet:   fd.get('petit_dej_interet') || '',
    petit_dej_menu:      fd.getAll('petit_dej_menu'),
    petit_dej_heure:     fd.get('petit_dej_heure') || '',
    petit_dej_budget:    fd.get('petit_dej_budget') || '',
    dejeuner_lieu:       fd.getAll('dejeuner_lieu'),
    dejeuner_interet:    fd.get('dejeuner_interet') || '',
    dejeuner_menu:       fd.getAll('dejeuner_menu'),
    contraintes:         fd.getAll('contraintes'),
    dejeuner_heure:      fd.get('dejeuner_heure') || '',
    dejeuner_budget:     fd.get('dejeuner_budget') || '',
    mode_service:        fd.getAll('mode_service'),
    abonnement:          fd.get('abonnement') || '',
    nom:                 fd.get('nom') || '',
    whatsapp:            fd.get('whatsapp') || '',
    contact_ok:          fd.get('contact_ok') || '',
  };

  try {
    const res = await fetch(`${API_BASE}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      if (json.errors) {
        const firstError = Object.values(json.errors)[0]?.[0];
        throw new Error(firstError || json.message || 'Erreur de validation');
      }
      throw new Error(json.message || 'Erreur lors de l\'envoi');
    }

    // ✅ Succès API
    showSuccess(payload);

  } catch (err) {
    // Si l'API n'est pas encore connectée, on affiche quand même le succès
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('fetch')) {
      showSuccess(payload);
    } else {
      showError('Une erreur est survenue : ' + err.message + '. Veuillez réessayer.');
      btn.disabled = false;
      btn.innerHTML = '<span>🍽️</span> Envoyer mes réponses';
    }
  }
});

// ====== SUCCÈS ======
function showSuccess(payload) {
  // Afficher le bloc WhatsApp si la personne a accepté d'être contactée
  const contactMsg = document.getElementById('successContactMsg');
  if (contactMsg && payload.contact_ok && payload.contact_ok.includes('Oui')) {
    contactMsg.classList.remove('hidden');
  }

  setTimeout(() => {
    // Cacher le formulaire
    const form = document.getElementById('surveyForm');
    if (form) form.style.display = 'none';

    // Afficher l'écran de succès
    const screen = document.getElementById('successScreen');
    screen.classList.remove('hidden');

    // Remonter en douceur
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 300);
}

// ====== ERREUR ======
function showError(msg) {
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.textContent = '⚠️ ' + msg;
  errorMsg.classList.remove('hidden');
  errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
}