/**
 * ============================================================
 * E-Bendahara — auth.js
 * Logika Autentikasi Pengguna, Manajemen Sesi,
 * Kontrol Hak Akses Berbasis Peran (RBAC), & Manajemen User
 * ============================================================
 */

const AUTH_SESSION_KEY = 'ebendahara_current_session';

const Auth = {
    /**
     * Simpan sesi pengguna (dengan penanganan aman untuk Safari Private / In-App Browser)
     */
    setSession(user, remember = true) {
        const str = JSON.stringify(user);
        try {
            sessionStorage.setItem(AUTH_SESSION_KEY, str);
        } catch (e) {
            console.warn('[Auth] Gagal menyimpan ke sessionStorage:', e);
        }
        if (remember) {
            try {
                localStorage.setItem(AUTH_SESSION_KEY, str);
            } catch (e) {
                console.warn('[Auth] Gagal menyimpan ke localStorage:', e);
            }
        }
        this._inMemorySession = user;
    },

    /**
     * Ambil data pengguna yang sedang login dari session
     */
    getCurrentUser() {
        try {
            const raw = sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(AUTH_SESSION_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn('[Auth] Gagal membaca session:', e);
        }
        return this._inMemorySession || null;
    },

    /**
     * Proses Login pengguna
     */
    login(username, password) {
        const cleanUser = (username || '').trim().toLowerCase();
        let users = Storage.getUsers();

        // PENGAMAN: Jika daftar user kosong (data lama/corrupt), re-inject akun default
        if (!users || users.length === 0) {
            console.warn('[Auth] Daftar user kosong, re-seeding akun bawaan...');
            const db = Storage.getData();
            db.users = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA.users));
            Storage.saveData(db);
            users = db.users;
        }

        let found = users.find(u => 
            u.username.toLowerCase() === cleanUser && 
            u.password === password
        );

        // PEMULIHAN OTOMATIS: Jika login dengan salah satu akun bawaan (admin, bendahara, sekretaris, pembina)
        // namun tidak cocok / terhapus di database lokal lama, pulihkan seketika
        if (!found) {
            const defaultMatch = (typeof DEFAULT_SEED_DATA !== 'undefined' && DEFAULT_SEED_DATA.users)
                ? DEFAULT_SEED_DATA.users.find(u => u.username.toLowerCase() === cleanUser && u.password === password)
                : null;

            if (defaultMatch) {
                console.warn(`[Auth] Memulihkan akun bawaan "${cleanUser}"...`);
                const db = Storage.getData();
                if (!Array.isArray(db.users)) db.users = [];
                const existingIdx = db.users.findIndex(u => (u.username || '').toLowerCase() === cleanUser);
                if (existingIdx >= 0) {
                    db.users[existingIdx] = JSON.parse(JSON.stringify(defaultMatch));
                } else {
                    db.users.push(JSON.parse(JSON.stringify(defaultMatch)));
                }
                Storage.saveData(db);
                found = defaultMatch;
            }
        }

        if (!found) {
            throw new Error('Username atau password salah! Periksa kembali akun Anda.');
        }

        const sessionUser = {
            id: found.id,
            nama: found.nama,
            username: found.username,
            role: found.role
        };

        this.setSession(sessionUser, true);
        return sessionUser;
    },

    /**
     * Proses Logout
     */
    logout() {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(AUTH_SESSION_KEY);
        window.location.href = 'login.html?status=logged_out';
    },

    /**
     * Validasi status login pada halaman yang diproteksi
     */
    checkAuth(redirectOnFail = true) {
        const user = this.getCurrentUser();
        if (!user && redirectOnFail) {
            window.location.href = 'login.html';
            return null;
        }
        return user;
    },

    // ========================================================
    // ROLE-BASED ACCESS CONTROL (RBAC) HELPERS
    // ========================================================
    getRole() {
        const u = this.getCurrentUser();
        return u ? u.role : 'pembina';
    },

    isBendaharaUtama() {
        return this.getRole() === 'bendahara_utama';
    },

    isSekretaris() {
        return this.getRole() === 'sekretaris_kas';
    },

    isReadOnly() {
        const r = this.getRole();
        return r === 'pembina' || r === 'anggota_pantau';
    },

    getRoleLabel(role) {
        const labels = {
            bendahara_utama: 'Bendahara Utama',
            sekretaris_kas:  'Sekretaris Kas',
            pembina:         'Pembina (Pantau)',
            anggota_pantau:  'Anggota Pantau'
        };
        return labels[role] || role;
    },

    getRoleBadge(role) {
        const badges = {
            bendahara_utama: '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Bendahara Utama</span>',
            sekretaris_kas:  '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Sekretaris Kas</span>',
            pembina:         '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Pembina (Pantau)</span>',
            anggota_pantau:  '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">Anggota Pantau</span>'
        };
        return badges[role] || `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">${role}</span>`;
    },

    /**
     * Terapkan pembatasan tampilan UI berdasarkan role user yang aktif
     */
    applyUIPermissions() {
        const user = this.getCurrentUser();
        if (!user) return;

        // Render identitas di header
        const nameEl = document.getElementById('user-profile-name');
        const roleEl = document.getElementById('user-profile-role');
        const avatarEl = document.getElementById('user-profile-avatar');

        if (nameEl) nameEl.textContent = user.nama;
        if (roleEl) roleEl.textContent = this.getRoleLabel(user.role);
        if (avatarEl) avatarEl.textContent = user.nama.charAt(0).toUpperCase();

        if (this.isReadOnly()) {
            // 1. Sembunyikan tombol hapus periode
            const btnHapusPeriode = document.getElementById('btn-hapus-periode');
            if (btnHapusPeriode) btnHapusPeriode.style.display = 'none';

            // 2. Sembunyikan tombol + Tahun Ajaran
            const btnTambahPeriode = document.getElementById('btn-tambah-periode');
            if (btnTambahPeriode) btnTambahPeriode.style.display = 'none';

            // 3. Sembunyikan form tambah cepat santri di tab Matriks
            const addSantriBox = document.getElementById('box-tambah-santri');
            if (addSantriBox) addSantriBox.style.display = 'none';

            // 4. Sembunyikan form input transaksi Buku Kas
            const addBkBox = document.getElementById('box-tambah-bukukas');
            if (addBkBox) addBkBox.style.display = 'none';

            // 5. Sembunyikan form input Pinjaman
            const addPjBox = document.getElementById('box-tambah-pinjaman');
            if (addPjBox) addPjBox.style.display = 'none';

            // 6. Sembunyikan tombol Kelola User & Backup/Restore jika bukan bendahara utama
            const btnKelolaUsers = document.getElementById('btn-kelola-users');
            if (btnKelolaUsers) btnKelolaUsers.style.display = 'none';

            const btnBackup = document.getElementById('btn-backup-restore');
            if (btnBackup) btnBackup.style.display = 'none';

            // 7. Sembunyikan seluruh header kolom aksi
            document.querySelectorAll('.col-aksi').forEach(el => el.style.display = 'none');

        } else if (this.isSekretaris()) {
            // Sekretaris Kas tidak bisa hapus periode
            const btnHapusPeriode = document.getElementById('btn-hapus-periode');
            if (btnHapusPeriode) btnHapusPeriode.style.display = 'none';

            // Sekretaris Kas tidak bisa kelola user
            const btnKelolaUsers = document.getElementById('btn-kelola-users');
            if (btnKelolaUsers) btnKelolaUsers.style.display = 'none';

            // Sekretaris Kas tidak bisa backup/restore
            const btnBackup = document.getElementById('btn-backup-restore');
            if (btnBackup) btnBackup.style.display = 'none';
        } else {
            // Bendahara Utama: pastikan tombol admin terlihat
            const btnKelolaUsers = document.getElementById('btn-kelola-users');
            if (btnKelolaUsers) btnKelolaUsers.style.display = 'inline-flex';

            const btnBackup = document.getElementById('btn-backup-restore');
            if (btnBackup) btnBackup.style.display = 'inline-flex';
        }
    }
};

// ============================================================
// MODAL & MANAJEMEN USER (RBAC)
// ============================================================
function openModalUsers() {
    if (!Auth.isBendaharaUtama()) {
        showToast('Akses ditolak: Hanya Bendahara Utama yang berhak mengelola akun!', 'error');
        return;
    }
    openModal('modal-users');
    loadUsersList();
}

function loadUsersList() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    const users = Storage.getUsers();
    renderUsersTable(users);
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada akun pengurus tercatat</td></tr>';
        return;
    }

    const currentUser = Auth.getCurrentUser();

    tbody.innerHTML = users.map((u, idx) => {
        const isSelf = currentUser && (parseInt(currentUser.id) === parseInt(u.id));
        const badge = Auth.getRoleBadge(u.role);

        return `<tr>
            <td class="p-2.5 text-center text-slate-400 font-medium">${idx + 1}</td>
            <td class="p-2.5 font-semibold text-slate-800">
                ${escHtml(u.nama)}
                ${isSelf ? '<span class="ml-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">(Anda)</span>' : ''}
            </td>
            <td class="p-2.5 text-slate-600 font-mono text-[11px]">${escHtml(u.username)}</td>
            <td class="p-2.5 text-center">${badge}</td>
            <td class="p-2.5 text-center">
                <div class="flex items-center justify-center gap-1.5">
                    <button class="px-2 py-1 text-[11px] rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium flex items-center gap-1 transition"
                            title="Reset Password" onclick="openModalResetPassword(${u.id}, '${escHtml(u.username)}')">
                        <i data-lucide="key-round" class="w-3 h-3"></i> Reset Pwd
                    </button>
                    ${!isSelf ? `
                    <button class="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition"
                            title="Hapus Akun Pengguna" onclick="konfirmasiHapusUser(${u.id}, '${escHtml(u.nama)}')">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                    ` : '<span class="text-[10px] text-slate-400 italic px-2">Aktif</span>'}
                </div>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
}

function tambahUserBaru() {
    if (!Auth.isBendaharaUtama()) {
        showToast('Akses ditolak: Hanya Bendahara Utama yang berhak menambah pengguna!', 'error');
        return;
    }
    const namaInput = document.getElementById('nu-nama');
    const userInput = document.getElementById('nu-username');
    const pwdInput  = document.getElementById('nu-password');
    const roleInput = document.getElementById('nu-role');

    const nama     = namaInput ? namaInput.value.trim() : '';
    const username = userInput ? userInput.value.trim() : '';
    const password = pwdInput ? pwdInput.value.trim() : '';
    const role     = roleInput ? roleInput.value : 'sekretaris_kas';

    if (!nama || !username || !password) {
        showToast('Nama lengkap, username, dan password wajib diisi!', 'warning');
        return;
    }
    if (password.length < 4) {
        showToast('Password minimal 4 karakter!', 'warning');
        return;
    }

    try {
        const newUser = Storage.addUser({ nama, username, password, role });
        showToast(`Pengurus "${newUser.nama}" berhasil didaftarkan!`, 'success');
        namaInput.value = '';
        userInput.value = '';
        pwdInput.value = '';
        loadUsersList();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function openModalResetPassword(userId, username) {
    if (!Auth.isBendaharaUtama()) {
        showToast('Akses ditolak!', 'error');
        return;
    }
    document.getElementById('rp-user-id').value = userId;
    document.getElementById('rp-username').textContent = username;
    document.getElementById('rp-new-password').value = '';
    openModal('modal-reset-pwd');
}

function simpanResetPassword() {
    if (!Auth.isBendaharaUtama()) {
        showToast('Akses ditolak!', 'error');
        return;
    }
    const userId = parseInt(document.getElementById('rp-user-id').value);
    const pwdInput = document.getElementById('rp-new-password');
    const newPassword = pwdInput ? pwdInput.value.trim() : '';

    if (!newPassword || newPassword.length < 4) {
        showToast('Password baru minimal 4 karakter!', 'warning');
        return;
    }

    try {
        Storage.resetUserPassword(userId, newPassword);
        showToast('Password pengguna berhasil direset!', 'success');
        closeModal('modal-reset-pwd');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function konfirmasiHapusUser(userId, nama) {
    if (!Auth.isBendaharaUtama()) {
        showToast('Akses ditolak!', 'error');
        return;
    }
    document.getElementById('confirm-message').textContent = `Hapus akun pengurus "${nama}" dari sistem?`;
    const btn = document.getElementById('confirm-btn');
    btn.onclick = () => {
        try {
            const currentU = Auth.getCurrentUser();
            Storage.deleteUser(userId, currentU.id);
            showToast(`Akun "${nama}" berhasil dihapus`, 'success');
            closeModal('modal-confirm');
            loadUsersList();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };
    openModal('modal-confirm');
    lucide.createIcons();
}

// ============================================================
// PENGATURAN PROFIL & AKUN SAYA MANDIRI
// ============================================================
function openModalProfile() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const namaEl = document.getElementById('prof-nama');
    const userEl = document.getElementById('prof-username');
    const badgeEl = document.getElementById('prof-role-badge');
    const pwdLama = document.getElementById('prof-pwd-lama');
    const pwdBaru = document.getElementById('prof-pwd-baru');
    const pwdKonfirm = document.getElementById('prof-pwd-konfirm');

    if (namaEl) namaEl.value = user.nama || '';
    if (userEl) userEl.value = user.username || '';
    if (badgeEl) badgeEl.innerHTML = Auth.getRoleBadge(user.role);
    if (pwdLama) pwdLama.value = '';
    if (pwdBaru) pwdBaru.value = '';
    if (pwdKonfirm) pwdKonfirm.value = '';

    openModal('modal-profile');
    lucide.createIcons();
}

function simpanProfilSaya() {
    const user = Auth.getCurrentUser();
    if (!user) {
        showToast('Sesi Anda tidak valid. Silakan login kembali.', 'error');
        return;
    }

    const nama = document.getElementById('prof-nama') ? document.getElementById('prof-nama').value.trim() : '';
    const username = document.getElementById('prof-username') ? document.getElementById('prof-username').value.trim() : '';
    const pwdLama = document.getElementById('prof-pwd-lama') ? document.getElementById('prof-pwd-lama').value : '';
    const pwdBaru = document.getElementById('prof-pwd-baru') ? document.getElementById('prof-pwd-baru').value : '';
    const pwdKonfirm = document.getElementById('prof-pwd-konfirm') ? document.getElementById('prof-pwd-konfirm').value : '';

    if (!nama) {
        showToast('Nama lengkap tidak boleh kosong!', 'warning');
        return;
    }

    if (!username) {
        showToast('Username tidak boleh kosong!', 'warning');
        return;
    }

    if (pwdBaru || pwdKonfirm) {
        if (!pwdLama) {
            showToast('Masukkan password lama untuk verifikasi perubahan password!', 'warning');
            return;
        }
        if (pwdBaru !== pwdKonfirm) {
            showToast('Konfirmasi password baru tidak cocok!', 'warning');
            return;
        }
        if (pwdBaru.length < 4) {
            showToast('Password baru minimal 4 karakter!', 'warning');
            return;
        }
    }

    try {
        const updated = Storage.updateUserProfile(user.id, {
            nama,
            username,
            passwordLama: pwdLama,
            passwordBaru: pwdBaru
        });

        // Update session lokal & render ulang header
        Auth.setSession(updated, true);
        Auth.applyUIPermissions();

        showToast('Profil & akun berhasil diperbarui!', 'success');
        closeModal('modal-profile');
    } catch (e) {
        showToast(e.message, 'error');
    }
}


