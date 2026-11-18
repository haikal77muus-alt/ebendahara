/**
 * ============================================================
 * E-Bendahara — auth.js
 * Manajemen Keamanan: Mode Edit / Kunci Tampilan Ber-PIN
 * (Default PIN: 1234, dapat diubah pengurus)
 * Memastikan data kas aman dari klik/sentuhan tidak sengaja di HP/Laptop
 * ============================================================
 */

const EDIT_MODE_KEY = 'ebendahara_edit_mode_active';

const Auth = {
    /**
     * Memeriksa apakah saat ini sedang dalam Mode Edit
     * Default adalah TRUE (Mode Edit aktif langsung agar pengurus bisa langsung menambah/mengedit data kas)
     * Hanya bernilai false jika pengurus secara sengaja mengunci tampilan (Mode Pantau)
     */
    isEditMode() {
        try {
            // Prioritas: baca dari Storage (tersinkron ke Firebase Cloud)
            if (typeof Storage !== 'undefined' && Storage.getLockState) {
                return !Storage.getLockState();
            }
            // Fallback: localStorage lama
            const val = localStorage.getItem(EDIT_MODE_KEY);
            return val !== 'false';
        } catch (e) {
            return true;
        }
    },

    /**
     * Menyetel status Mode Edit (true = terbuka, false = terkunci/mode pantau)
     */
    setEditMode(enabled) {
        try {
            // Simpan ke Storage → otomatis sync ke Firebase Cloud (semua device ikut)
            if (typeof Storage !== 'undefined' && Storage.setLockState) {
                Storage.setLockState(!enabled);
            }
            localStorage.setItem(EDIT_MODE_KEY, enabled ? 'true' : 'false');
        } catch (e) {
            console.warn('[Auth] Gagal menyimpan status sesi:', e);
        }
        this.applyUIPermissions();
    },

    /**
     * Membuka kunci Mode Edit dengan verifikasi PIN
     */
    unlock(pin) {
        const cleanPin = (pin || '').trim();
        const storedPin = Storage.getEditPin();

        if (cleanPin === storedPin || cleanPin === '1234') {
            this.setEditMode(true);
            return true;
        }
        throw new Error('PIN salah! Silakan coba lagi (PIN bawaan: 1234).');
    },

    /**
     * Mengunci kembali ke Mode Pantau (Read-Only)
     */
    lock() {
        this.setEditMode(false);
    },

    /**
     * Mengubah PIN keamanan
     */
    changePin(oldPin, newPin, konfirmPin) {
        const storedPin = String(Storage.getEditPin() || '1234').trim();
        const cleanOld = String(oldPin || '').trim();
        const cleanNew = String(newPin || '').trim();
        const cleanKonfirm = String(konfirmPin || '').trim();

        if (cleanOld !== storedPin && cleanOld !== '1234') {
            throw new Error('PIN lama yang Anda masukkan salah! (PIN bawaan: 1234)');
        }
        if (!cleanNew || cleanNew.length < 4) {
            throw new Error('PIN baru minimal 4 angka/karakter!');
        }
        if (cleanNew !== cleanKonfirm) {
            throw new Error('Konfirmasi PIN baru tidak cocok!');
        }

        Storage.setEditPin(cleanNew);
        return true;
    },

    /**
     * Helper hak akses read-only (true jika dalam mode pantau)
     */
    isReadOnly() {
        return !this.isEditMode();
    },

    /**
     * Helper hak akses penuh bendahara utama (true jika dalam mode edit)
     */
    isBendaharaUtama() {
        return this.isEditMode();
    },

    /**
     * Informasi user aktif (tanpa proses login terpisah)
     */
    getCurrentUser() {
        const editMode = this.isEditMode();
        return {
            id: 1,
            nama: 'Bendahara Asrama',
            username: 'bendahara',
            role: editMode ? 'bendahara_utama' : 'pembina'
        };
    },

    /**
     * Pengecekan autentikasi halaman (selalu lolos tanpa login)
     */
    checkAuth() {
        return this.getCurrentUser();
    },

    /**
     * Terapkan pembatasan tampilan UI berdasarkan status Mode Edit
     */
    applyUIPermissions() {
        const editMode = this.isEditMode();

        // 1. Update tombol status Mode Edit di header
        const btnToggle = document.getElementById('btn-toggle-edit-mode');
        const badgeIcon = document.getElementById('edit-mode-icon');
        const badgeText = document.getElementById('edit-mode-text');
        const btnChangePin = document.getElementById('btn-change-pin');

        if (btnToggle && badgeIcon && badgeText) {
            if (editMode) {
                btnToggle.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1.5 transition shadow-sm cursor-pointer';
                badgeIcon.setAttribute('data-lucide', 'lock-open');
                badgeText.textContent = 'Mode Edit (Terbuka)';
                btnToggle.title = 'Mode Edit Aktif. Klik untuk Mengunci Tampilan (Mode Pantau)';
                if (btnChangePin) btnChangePin.style.display = 'inline-flex';
            } else {
                btnToggle.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 flex items-center gap-1.5 transition shadow-sm cursor-pointer';
                badgeIcon.setAttribute('data-lucide', 'lock');
                badgeText.textContent = 'Mode Pantau (Terkunci)';
                btnToggle.title = 'Kunci Tampilan Aktif. Klik untuk Membuka Mode Edit dengan PIN (Bawaan: 1234)';
                if (btnChangePin) btnChangePin.style.display = 'none';
            }
        }

        const displayStyle = editMode ? '' : 'none';

        // 2. Tombol Hapus Periode & Tambah Periode
        const btnHapusPeriode = document.getElementById('btn-hapus-periode');
        if (btnHapusPeriode) btnHapusPeriode.style.display = displayStyle;

        const btnTambahPeriode = document.getElementById('btn-tambah-periode');
        if (btnTambahPeriode) btnTambahPeriode.style.display = displayStyle;

        // 3. Form Input Cepat Santri di Tab Matriks
        const addSantriBox = document.getElementById('box-tambah-santri');
        if (addSantriBox) addSantriBox.style.display = displayStyle;

        // 4. Form Input Transaksi Buku Kas
        const addBkBox = document.getElementById('box-tambah-bukukas');
        if (addBkBox) addBkBox.style.display = displayStyle;

        // 5. Form Input Pinjaman
        const addPjBox = document.getElementById('box-tambah-pinjaman');
        if (addPjBox) addPjBox.style.display = displayStyle;

        // 6. Header Kolom Aksi di Tabel-tabel
        document.querySelectorAll('.col-aksi').forEach(el => {
            el.style.display = displayStyle;
        });

        if (window.lucide && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
        }
    }
};

// ============================================================
// MODAL & HANDLER MODE EDIT / KUNCI TAMPILAN BER-PIN
// ============================================================

/**
 * Toggle tombol gembok di header
 */
function toggleEditModeSecurity() {
    if (Auth.isEditMode()) {
        Auth.lock();
        if (typeof showToast === 'function') {
            showToast('Kunci Tampilan aktif. Data kas aman dari sentuhan tidak sengaja.', 'info');
        }
        refreshViewAfterSecurityToggle();
    } else {
        openModalUnlockPIN();
    }
}

function openModalUnlockPIN() {
    const input = document.getElementById('unlock-pin-input');
    if (input) input.value = '';
    if (typeof openModal === 'function') {
        openModal('modal-unlock-pin');
    }
    setTimeout(() => {
        if (input) input.focus();
    }, 150);
}

function closeModalUnlockPIN() {
    if (typeof closeModal === 'function') {
        closeModal('modal-unlock-pin');
    }
}

function submitUnlockPIN(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('unlock-pin-input');
    const pin = input ? input.value : '';

    try {
        Auth.unlock(pin);
        closeModalUnlockPIN();
        if (typeof showToast === 'function') {
            showToast('Mode Edit aktif! Anda sekarang dapat menambah & mengedit data kas.', 'success');
        }
        refreshViewAfterSecurityToggle();
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast(err.message, 'error');
        }
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function submitQuickUnlockPIN() {
    Auth.setEditMode(true);
    closeModalUnlockPIN();
    if (typeof showToast === 'function') {
        showToast('Mode Edit aktif! Anda sekarang dapat menambah & mengedit data kas.', 'success');
    }
    refreshViewAfterSecurityToggle();
}

function openModalUbahPIN() {
    if (!Auth.isEditMode()) {
        if (typeof showToast === 'function') {
            showToast('Buka Mode Edit terlebih dahulu untuk mengubah PIN!', 'warning');
        }
        openModalUnlockPIN();
        return;
    }
    const pLama = document.getElementById('up-pin-lama');
    const pBaru = document.getElementById('up-pin-baru');
    const pKonfirm = document.getElementById('up-pin-konfirm');
    const toggleCb = document.getElementById('toggle-show-pin');
    if (toggleCb) toggleCb.checked = false;
    [pLama, pBaru, pKonfirm].forEach(input => {
        if (input) {
            input.value = '';
            input.type = 'password';
        }
    });
    if (typeof openModal === 'function') {
        openModal('modal-ubah-pin');
    }
    setTimeout(() => {
        if (pLama) pLama.focus();
    }, 150);
}

function closeModalUbahPIN() {
    if (typeof closeModal === 'function') {
        closeModal('modal-ubah-pin');
    }
}

function submitUbahPIN(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pLama = document.getElementById('up-pin-lama') ? document.getElementById('up-pin-lama').value : '';
    const pBaru = document.getElementById('up-pin-baru') ? document.getElementById('up-pin-baru').value : '';
    const pKonfirm = document.getElementById('up-pin-konfirm') ? document.getElementById('up-pin-konfirm').value : '';

    try {
        Auth.changePin(pLama, pBaru, pKonfirm);
        closeModalUbahPIN();
        if (typeof showToast === 'function') {
            showToast('PIN keamanan Mode Edit berhasil diperbarui dan tersimpan!', 'success');
        }
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast(err.message, 'error');
        }
    }
}

/**
 * Render ulang tab aktif agar status klik sel dan kolom aksi langsung sinkron seketika
 */
function refreshViewAfterSecurityToggle() {
    Auth.applyUIPermissions();
    if (typeof renderCurrentTab === 'function') {
        renderCurrentTab();
    } else {
        if (typeof loadMatriks === 'function') loadMatriks();
        if (typeof loadBukuKas === 'function') loadBukuKas();
        if (typeof loadPinjaman === 'function') loadPinjaman();
    }
}
