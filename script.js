// ISI DENGAN URL GOOGLE APPS SCRIPT DARI TAHAP 2
const API_URL = "https://script.google.com/macros/s/AKfycbxa974BGepRqFGhMuHRmr7VD-gLJSaaMAaSvLVEx1GFceEn6w9DOEewS0jui0C_Ul_E2w/exec";

// Local Data Store
let currentUser = null;
let dbUsers = [
  { username: 'admin', password: '123', nama: 'Personalia Pusat', role: 'SUPER_ADMIN', tgl_masuk: '2020-01-01', jabatan: 'Head of HRD', cabang: 'Kantor Pusat' },
  { username: 'ao_budi', password: '123', nama: 'Budi Santoso', role: 'AO', tgl_masuk: '2021-03-15', jabatan: 'Account Officer Senior', cabang: 'Cabang Cileungsi' },
  { username: 'ao_fauzi', password: '123', nama: 'Ahmad Fauzi', role: 'AO', tgl_masuk: '2022-08-10', jabatan: 'Account Officer Junior', cabang: 'Cabang Cibubur' },
  { username: 'fo_siti', password: '123', nama: 'Siti Rahma', role: 'FO', tgl_masuk: '2023-01-20', jabatan: 'Funding Officer', cabang: 'Cabang Cileungsi' }
];

let dbKPIAO = {
  'ao_budi': {
    outstanding: 3200000000,
    pencairan: 450000000,
    monthly: {
      outstanding: [2.8, 2.85, 2.9, 2.95, 3.0, 3.05, 3.1, 3.15, 3.2, 3.25, 3.3, 3.4],
      pencairan: [200, 250, 300, 280, 350, 400, 380, 420, 450, 480, 500, 520],
      npf: [4.5, 4.3, 4.2, 4.0, 4.1, 3.9, 3.8, 3.7, 3.8, 3.6, 3.5, 3.4],
      visit: [12, 14, 13, 15, 14, 16, 15, 16, 17, 16, 18, 19]
    }
  },
  'ao_fauzi': {
    outstanding: 1800000000,
    pencairan: 280000000,
    monthly: {
      outstanding: [1.2, 1.3, 1.4, 1.5, 1.55, 1.6, 1.65, 1.7, 1.8, 1.85, 1.9, 2.0],
      pencairan: [150, 180, 200, 220, 210, 250, 240, 260, 280, 290, 300, 320],
      npf: [4.8, 4.7, 4.6, 4.5, 4.4, 4.3, 4.2, 4.2, 4.2, 4.1, 4.0, 3.9],
      visit: [10, 11, 12, 13, 12, 14, 13, 14, 14, 15, 15, 16]
    }
  }
};

let chartInstance = null;

// Initialize Lucide Icons
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
});

// Login Handler
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const uInput = document.getElementById('username').value;
  const pInput = document.getElementById('password').value;

  const found = dbUsers.find(u => u.username === uInput && u.password === pInput);
  if (found) {
    currentUser = found;
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('hidden');
    
    document.getElementById('user-display-name').innerText = currentUser.nama;
    document.getElementById('user-display-role').innerText = currentUser.role;

    if (currentUser.role === 'SUPER_ADMIN') {
      document.getElementById('admin-nav').classList.remove('hidden');
      document.getElementById('ao-selector-box').classList.remove('hidden');
      renderAODashboard('ao_budi');
    } else if (currentUser.role === 'AO') {
      renderAODashboard(currentUser.username);
    } else if (currentUser.role === 'FO') {
      switchTab('fo');
    }
  } else {
    alert('Username atau Password salah!');
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  window.location.reload();
});

// Calculate Tenure
function calcTenure(startDateStr) {
  const start = new Date(startDateStr);
  const today = new Date();
  let years = today.getFullYear() - start.getFullYear();
  let months = today.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  return `${years} Thn ${months} Bln`;
}

// Format Currency
function formatIDR(val) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

// Render AO Dashboard
function renderAODashboard(username) {
  const u = dbUsers.find(user => user.username === username);
  const data = dbKPIAO[username];

  document.getElementById('ao-nama').innerText = u.nama;
  document.getElementById('ao-jabatan').innerText = u.jabatan;
  document.getElementById('ao-cabang').innerText = u.cabang;
  document.getElementById('ao-tgl').innerText = u.tgl_masuk;
  document.getElementById('ao-masa-kerja').innerText = calcTenure(u.tgl_masuk);
  document.getElementById('ao-os-text').innerText = formatIDR(data.outstanding);

  // Target Logic
  let cat = "Magang", target = 200000000;
  if (data.outstanding >= 3000000000) { cat = "Senior"; target = 500000000; }
  else if (data.outstanding >= 1500000000) { cat = "Junior"; target = 300000000; }

  document.getElementById('ao-kategori').innerText = `Kategori: ${cat}`;
  document.getElementById('ao-target-pencairan').innerText = formatIDR(target);

  updateAOChart(username);
}

// Update Chart
function updateAOChart(username = document.getElementById('select-ao').value || 'ao_budi') {
  const metric = document.getElementById('ao-metric-select').value;
  const data = dbKPIAO[username].monthly[metric];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const ctx = document.getElementById('aoChart').getContext('2d');
  
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: metric.toUpperCase(),
        data: data,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Switch Tabs
function switchTab(tab) {
  if (tab === 'ao') {
    document.getElementById('section-ao').classList.remove('hidden');
    document.getElementById('section-fo').classList.add('hidden');
  } else {
    document.getElementById('section-ao').classList.add('hidden');
    document.getElementById('section-fo').classList.remove('hidden');
  }
}
