import { initNavbar } from './components/navbar.js';

const STORAGE_KEY = 'spmbBaktiPersadaPendaftar';
const BATAS_FILE = 10 * 1024 * 1024;

const jurusan = [
    { kode: 'RPL', nama: 'Rekayasa Perangkat Lunak' },
    { kode: 'TPTL', nama: 'Teknik Pembangkit Tenaga Listrik' },
    { kode: 'MPLB', nama: 'Manajemen Perkantoran dan Layanan Bisnis' },
    { kode: 'AKL', nama: 'Akuntansi dan Keuangan Lembaga' },
    { kode: 'PH', nama: 'Perhotelan' },
    { kode: 'TSM', nama: 'Teknik Sepeda Motor' },
    { kode: 'TKRO', nama: 'Teknik Kendaraan Ringan Otomotif' },
    { kode: 'TR', nama: 'Tata Rias' }
];

let petaDomisili = null;
let penandaDomisili = null;

function getElement(id) { return document.getElementById(id); }
function getValue(id) { return getElement(id)?.value.trim() || ''; }

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, karakter => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[karakter]);
}

function getPendaftar() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}

function savePendaftar(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function buatNomorPendaftaran() {
    const data = getPendaftar();
    let nomor;
    do {
        const angka = Math.floor(100000 + Math.random() * 900000);
        nomor = `BP-2027-${angka}`;
    } while (data.some(item => item.nomor === nomor));
    return nomor;
}

function formatTanggal(tanggal) {
    return new Date(tanggal).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
}

function renderJurusan() {
    const container = getElement('jurusanContainer');
    if (!container) return;
    container.innerHTML = jurusan.map(item => `
        <article class="info-card">
            <h3>${escapeHTML(item.kode)}</h3>
            <p>${escapeHTML(item.nama)}</p>
        </article>
    `).join('');
}

function populatePilihanJurusan() {
    ['jurusanUtama', 'jurusanAlternatif', 'jurusanPeringkat'].forEach(id => {
        const select = getElement(id);
        if (!select) return;
        const pilihanAwal = select.options[0]?.outerHTML || '';
        select.innerHTML = pilihanAwal + jurusan.map(item => `
            <option value="${escapeHTML(item.kode)}">${escapeHTML(item.kode)} - ${escapeHTML(item.nama)}</option>
        `).join('');
    });
}

function initStepRegistration() {
    const lanjut = getElement('continueRegistration');
    const kembali = getElement('backRegistration');
    const identitas = getElement('stepIdentity');
    const detail = getElement('stepDetails');

    lanjut?.addEventListener('click', () => {
        const nama = getElement('nama');
        const nisn = getElement('nisn');

        if (!nama.value.trim()) {
            alert('Nama lengkap harus diisi.');
            nama.focus();
            return;
        }
        if (!/^\d{10}$/.test(nisn.value.trim())) {
            alert('NISN harus terdiri dari 10 angka.');
            nisn.focus();
            return;
        }
        if (getPendaftar().some(item => item.nisn === nisn.value.trim())) {
            alert('NISN ini sudah pernah digunakan untuk mendaftar.');
            nisn.focus();
            return;
        }

        identitas.hidden = true;
        detail.hidden = false;
        getElement('nik')?.focus();
    });

    kembali?.addEventListener('click', () => {
        detail.hidden = true;
        identitas.hidden = false;
        getElement('nama')?.focus();
    });
}

function buatInputFile(id, label, accept, keterangan) {
    return `
        <label for="${id}">${label}</label>
        <input type="file" id="${id}" accept="${accept}" required>
        <small style="color: #64748b; font-size: 11px; display: block; margin-top: 4px;">${keterangan}</small>
    `;
}

function initPetaDomisili() {
    const wadah = getElement('petaDomisili');
    if (!wadah || !window.L) return;

    if (petaDomisili) {
        setTimeout(() => petaDomisili.invalidateSize(), 300);
        return;
    }

    petaDomisili = L.map(wadah).setView([-7.8, 113.2], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(petaDomisili);

    petaDomisili.on('click', event => {
        pasangMarker(event.latlng.lat, event.latlng.lng);
    });

    setTimeout(() => petaDomisili.invalidateSize(), 300);
}

function pasangMarker(lat, lng) {
    if (!petaDomisili) return;
    if (penandaDomisili) petaDomisili.removeLayer(penandaDomisili);

    penandaDomisili = L.marker([lat, lng]).addTo(petaDomisili);
    penandaDomisili.bindPopup('Lokasi tempat tinggal dipilih.').openPopup();

    getElement('latitudeDomisili').value = lat;
    getElement('longitudeDomisili').value = lng;
    getElement('statusLokasi').textContent = 'Lokasi berhasil dipilih.';
}

async function cariAlamatDiMaps() {
    const alamat = getValue('alamatDomisili');
    if (!alamat) {
        alert('Masukkan alamat domisili terlebih dahulu.');
        return;
    }
    const status = getElement('statusLokasi');
    status.textContent = 'Sedang mencari lokasi...';

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(alamat)}`);
        const hasil = await response.json();
        if (!hasil.length) {
            status.textContent = 'Lokasi tidak ditemukan. Pilih titik pada peta.';
            return;
        }
        const lat = Number(hasil[0].lat);
        const lng = Number(hasil[0].lon);
        petaDomisili.setView([lat, lng], 16);
        pasangMarker(lat, lng);
    } catch {
        status.textContent = 'Pencarian gagal. Silakan pilih titik pada peta.';
    }
}

function tampilkanPersyaratanJalur(jalur) {
    const container = getElement('persyaratanJalur');
    if (!container) return;

    if (petaDomisili) {
        petaDomisili.remove();
        petaDomisili = null;
        penandaDomisili = null;
    }

    container.innerHTML = '';

    if (jalur === 'Domisili') {
        container.innerHTML = `
            <h3>Data Domisili</h3>
            <label for="alamatDomisili">Alamat domisili</label>
            <textarea id="alamatDomisili" rows="3" placeholder="Masukkan alamat tempat tinggal" required></textarea>
            <button type="button" id="cariLokasiDomisili" class="button-secondary" style="margin-bottom: 10px;">Cari Lokasi</button>
            <p id="statusLokasi" style="font-size: 12px; color: #59627a;">Klik peta untuk memilih lokasi.</p>
            <div id="petaDomisili" style="height:300px;width:100%;margin:15px 0;border-radius:10px;"></div>
            <input type="hidden" id="latitudeDomisili">
            <input type="hidden" id="longitudeDomisili">
        `;
        getElement('cariLokasiDomisili').addEventListener('click', cariAlamatDiMaps);
        setTimeout(initPetaDomisili, 200);
    } else if (jalur === 'Afirmasi') {
        container.innerHTML = `<h3>Dokumen Afirmasi</h3>${buatInputFile('buktiAfirmasi', 'Upload bukti afirmasi', '.pdf,.jpg,.jpeg,.png', 'Format PDF/JPG/PNG, maksimal 10 MB.')}`;
    } else if (jalur === 'Prestasi') {
        container.innerHTML = `
            <h3>Data Prestasi</h3>
            <label for="jenisPrestasi">Jenis prestasi</label>
            <select id="jenisPrestasi" required>
                <option value="">-- Pilih jenis prestasi --</option>
                <option value="Akademik">Akademik</option>
                <option value="Nonakademik">Nonakademik</option>
            </select>
            <label for="namaPrestasi">Nama prestasi</label>
            <input id="namaPrestasi" type="text" placeholder="Masukkan nama prestasi" required>
            ${buatInputFile('sertifikatPrestasi', 'Upload sertifikat', '.pdf,.jpg,.jpeg,.png', 'Format PDF/JPG/PNG, maksimal 10 MB.')}
        `;
    } else if (jalur === 'Mutasi') {
        container.innerHTML = `<h3>Dokumen Mutasi</h3>${buatInputFile('suratMutasi', 'Upload surat keterangan mutasi', '.pdf,.jpg,.jpeg,.png', 'Format PDF/JPG/PNG, maksimal 10 MB.')}`;
    } else if (jalur === 'Nilai') {
        container.innerHTML = `<h3>Dokumen Nilai Rapor</h3>${buatInputFile('rapor', 'Upload rapor semester 1–5', '.pdf', 'Format PDF, maksimal 10 MB.')}`;
    }
}

function initJalurPendaftaran() {
    getElement('jalurPilihan')?.addEventListener('change', event => {
        tampilkanPersyaratanJalur(event.target.value);
    });
}

function validasiFilePersyaratan(jalur) {
    const daftarID = { Afirmasi: ['buktiAfirmasi'], Prestasi: ['sertifikatPrestasi'], Mutasi: ['suratMutasi'], Nilai: ['rapor'] };
    const idFile = daftarID[jalur] || [];

    for (const id of idFile) {
        const input = getElement(id);
        const file = input?.files?.[0];
        if (!file) {
            alert('Dokumen persyaratan wajib diunggah.');
            input?.focus();
            return false;
        }
        if (file.size > BATAS_FILE) {
            alert('Ukuran file maksimal 10 MB.');
            return false;
        }
    }
    return true;
}

function ambilDataPersyaratan(jalur) {
    const data = {};
    const daftarID = { Afirmasi: ['buktiAfirmasi'], Prestasi: ['sertifikatPrestasi'], Mutasi: ['suratMutasi'], Nilai: ['rapor'] };
    (daftarID[jalur] || []).forEach(id => {
        const file = getElement(id)?.files?.[0];
        data[id] = file ? file.name : '';
    });
    if (jalur === 'Prestasi') {
        data.jenisPrestasi = getValue('jenisPrestasi');
        data.namaPrestasi = getValue('namaPrestasi');
    }
    if (jalur === 'Domisili') {
        data.alamatDomisili = getValue('alamatDomisili');
        data.latitude = getValue('latitudeDomisili');
        data.longitude = getValue('longitudeDomisili');
    }
    return data;
}

function isiBukti(container, data) {
    const persyaratan = Object.entries(data.persyaratan || {})
        .filter(([key]) => !['latitude', 'longitude'].includes(key))
        .map(([key, value]) => `<tr><th>${escapeHTML(key)}</th><td>${escapeHTML(value)}</td></tr>`).join('');

    container.innerHTML = `
        <div class="receipt-content">
            <h2>SMK NEGERI 1 BAKTI PERSADA</h2>
            <h3>BUKTI PENDAFTARAN SPMB 2027/2028</h3>
            <hr>
            <h3>Nomor Pendaftaran</h3>
            <h2>${escapeHTML(data.nomor)}</h2>
            <table>
                <tr><th>Nama lengkap</th><td>${escapeHTML(data.nama)}</td></tr>
                <tr><th>NISN</th><td>${escapeHTML(data.nisn)}</td></tr>
                <tr><th>NIK</th><td>${escapeHTML(data.nik)}</td></tr>
                <tr><th>Tempat lahir</th><td>${escapeHTML(data.tempatLahir)}</td></tr>
                <tr><th>Tanggal lahir</th><td>${escapeHTML(data.tanggalLahir)}</td></tr>
                <tr><th>Jenis kelamin</th><td>${escapeHTML(data.jenisKelamin)}</td></tr>
                <tr><th>Agama</th><td>${escapeHTML(data.agama)}</td></tr>
                <tr><th>Alamat</th><td>${escapeHTML(data.alamat)}</td></tr>
                <tr><th>Nomor HP</th><td>${escapeHTML(data.telepon)}</td></tr>
                <tr><th>Email</th><td>${escapeHTML(data.email || '-')}</td></tr>
                <tr><th>Sekolah asal</th><td>${escapeHTML(data.asalSekolah)}</td></tr>
                <tr><th>Tahun lulus</th><td>${escapeHTML(data.tahunLulus)}</td></tr>
                <tr><th>Jalur</th><td>${escapeHTML(data.jalur)}</td></tr>
                <tr><th>Jurusan utama</th><td>${escapeHTML(data.jurusanUtama)}</td></tr>
                <tr><th>Jurusan alternatif</th><td>${escapeHTML(data.jurusanAlternatif)}</td></tr>
                <tr><th>Tanggal daftar</th><td>${escapeHTML(formatTanggal(data.tanggalDaftar))}</td></tr>
            </table>
            <h3>Dokumen Persyaratan</h3>
            <table>${persyaratan || '<tr><td>Tidak ada dokumen tambahan.</td></tr>'}</table>
            <button type="button" id="cetakBukti" class="button-primary no-print" style="margin-top:20px;">Cetak Bukti Pendaftaran</button>
        </div>
    `;
    container.hidden = false;
    getElement('cetakBukti')?.addEventListener('click', () => window.print());
}

function initRegistrationForm() {
    const form = getElement('registrationForm');
    if (!form) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const jalur = getValue('jalurPilihan');
        if (!jalur) {
            alert('Pilih jalur pendaftaran terlebih dahulu.');
            return;
        }
        if (!validasiFilePersyaratan(jalur)) return;

        if (jalur === 'Domisili' && (!getValue('latitudeDomisili') || !getValue('longitudeDomisili'))) {
            alert('Pilih lokasi domisili pada peta terlebih dahulu.');
            return;
        }

        if (getValue('jurusanUtama') === getValue('jurusanAlternatif')) {
            alert('Jurusan utama dan alternatif tidak boleh sama.');
            return;
        }

        const pendaftar = getPendaftar();
        const nisn = getValue('nisn');
        if (pendaftar.some(item => item.nisn === nisn)) {
            alert('NISN sudah terdaftar.');
            return;
        }

        const data = {
            nomor: buatNomorPendaftaran(),
            nama: getValue('nama'),
            nisn,
            nik: getValue('nik'),
            tempatLahir: getValue('tempatLahir'),
            tanggalLahir: getValue('tanggalLahir'),
            jenisKelamin: getValue('jenisKelamin'),
            agama: getValue('agama'),
            alamat: getValue('alamat'),
            telepon: getValue('telepon'),
            email: getValue('email'),
            asalSekolah: getValue('asalSekolah'),
            tahunLulus: getValue('tahunLulus'),
            jalur,
            persyaratan: ambilDataPersyaratan(jalur),
            jurusanUtama: getValue('jurusanUtama'),
            jurusanAlternatif: getValue('jurusanAlternatif'),
            nilaiGabungan: null,
            tanggalDaftar: new Date().toISOString()
        };

        if (!confirm('Apakah semua data sudah benar dan kamu yakin ingin mengirim pendaftaran?')) return;

        pendaftar.push(data);
        savePendaftar(pendaftar);

        const hasil = getElement('hasilPendaftaran');
        isiBukti(hasil, data);
        window.bukaHalamanSPMB?.('hasil-pendaftaran');

        form.reset();
        getElement('stepDetails').hidden = true;
        getElement('stepIdentity').hidden = false;
        getElement('persyaratanJalur').innerHTML = '';
        if (petaDomisili) {
            petaDomisili.remove();
            petaDomisili = null;
            penandaDomisili = null;
        }
    });
}

function initStatusForm() {
    const form = getElement('statusForm');
    if (!form) return;
    form.addEventListener('submit', event => {
        event.preventDefault();
        const nomor = getValue('nomorPendaftaran');
        const hasil = getElement('hasilStatus');
        const data = getPendaftar().find(item => item.nomor.toLowerCase() === nomor.toLowerCase());

        if (!data) {
            hasil.hidden = false;
            hasil.innerHTML = '<p>Nomor pendaftaran tidak ditemukan.</p>';
            return;
        }
        isiBukti(hasil, data);
    });
}

function initPeringkat() {
    const form = getElement('peringkatForm');
    const selectJurusan = getElement('jurusanPeringkat');
    const hasil = getElement('hasilPeringkat');
    const tabel = getElement('tabelPeringkat');

    if (!form || !selectJurusan || !hasil || !tabel) return;
    let pendaftarAktif = [];

    form.addEventListener('submit', event => {
        event.preventDefault();
        const nisn = getValue('nisnPeringkat');
        pendaftarAktif = getPendaftar().filter(item => item.nisn === nisn);

        if (!pendaftarAktif.length) {
            alert('Data pendaftaran dengan NISN tersebut tidak ditemukan.');
            hasil.hidden = true;
            return;
        }
        selectJurusan.value = pendaftarAktif[0].jurusanUtama;
        hasil.hidden = false;
        tampilkanTabelPeringkat();
    });

    selectJurusan.addEventListener('change', tampilkanTabelPeringkat);

    function tampilkanTabelPeringkat() {
        const kode = selectJurusan.value;
        if (!kode) {
            tabel.innerHTML = '';
            return;
        }
        const peserta = getPendaftar()
            .filter(item => item.jurusanUtama === kode || item.jurusanAlternatif === kode)
            .filter(item => Number.isFinite(Number(item.nilaiGabungan)))
            .sort((a, b) => Number(b.nilaiGabungan) - Number(a.nilaiGabungan));

        if (!peserta.length) {
            tabel.innerHTML = '<p>Data nilai belum tersedia atau peringkat belum dihitung.</p>';
            return;
        }

        tabel.innerHTML = `
            <table>
                <thead><tr><th>Peringkat</th><th>Nama</th><th>Nilai</th></tr></thead>
                <tbody>
                    ${peserta.map((item, index) => `
                        <tr><td>${index + 1}</td><td>${escapeHTML(item.nama)}</td><td>${Number(item.nilaiGabungan).toFixed(2)}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

function initApp() {
    initNavbar();
    renderJurusan();
    populatePilihanJurusan();
    initStepRegistration();
    initJalurPendaftaran();
    initRegistrationForm();
    initStatusForm();
    initPeringkat();

    const tahun = getElement('tahunFooter');
    if (tahun) tahun.textContent = '2027';

    window.addEventListener('spmb:halaman-dibuka', () => {
        if (getElement('persyaratanJalur')?.querySelector('#petaDomisili')) {
            setTimeout(() => petaDomisili?.invalidateSize(), 300);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}