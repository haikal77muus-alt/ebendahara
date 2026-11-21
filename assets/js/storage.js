/**
 * ============================================================
 * E-Bendahara — storage.js
 * Pengelola Database Lokal (localStorage + IndexedDB) &
 * Sinkronisasi Cloud JSON Otomatis (api.npoint.io),
 * Master Data Santri Permanen & Arsip Santri Boyong,
 * serta Fitur Ekspor / Impor Cadangan Data (Backup JSON)
 * ============================================================
 */

const STORAGE_KEY = 'ebendahara_database_v1';
window.STORAGE_KEY = STORAGE_KEY;

// Template Santri Awal: Bersih & kosong (tanpa data template / dummy santri)
const DEFAULT_SANTRI_TEMPLATE = [];

// Seed Data Awal jika database masih baru/kosong (bersih tanpa dummy santri atau transaksi)
const DEFAULT_SEED_DATA = {
    settings: {
        edit_pin: '1234',
        is_locked: false
    },
    users: [
        { id: 1, nama: 'Bendahara Asrama', username: 'admin', password: 'admin123', role: 'bendahara_utama' }
    ],
    periode: [
        { id: 1, nama_periode: 'Tahun Ajaran 2024/2025', tipe_bulan: 'juli_juni', is_active: 0, santri_list: [] },
        { id: 2, nama_periode: 'Tahun Ajaran 2025/2026', tipe_bulan: 'juli_juni', is_active: 0, santri_list: [] },
        { id: 3, nama_periode: 'Tahun Ajaran 2026/2027', tipe_bulan: 'juli_juni', is_active: 1, santri_list: [] }
    ],
    master_santri: [],
    matriks_kas_bulanan: [],
    buku_kas: [],
    pinjaman: [],
    lastSavedAt: null
};

/**
 * Helper untuk menentukan ranking urutan kelas dari SD Kelas 1 hingga SMA Kelas 12
 * SD (Kelas 1-6)      -> Rank 101 s.d. 106
 * SMP/MTs (Kelas 7-9) -> Rank 207 s.d. 209 (atau 1 SMP -> 207, 2 SMP -> 208, 3 SMP -> 209)
 * SMA/MA (Kelas 10-12)-> Rank 310 s.d. 312 (atau 1 SMA -> 310, 2 SMA -> 311, 3 SMA -> 312)
 */
function parseKelasRank(rawText) {
    if (!rawText) return 9000;
    const s = String(rawText).toLowerCase().trim();

    const isSD = /\b(sd|mi|ibtidaiyah)\b/.test(s);
    const isSMP = /\b(smp|mts|tsanawiyah)\b/.test(s);
    const isSMA = /\b(sma|ma|smk|aliyah)\b/.test(s);

    let angka = null;

    // Romawi XII, XI, X, IX, VIII, VII, VI, V, IV, III, II, I
    if (/\b(xii)\b/.test(s)) angka = 12;
    else if (/\b(xi)\b/.test(s)) angka = 11;
    else if (/\b(x)\b/.test(s)) angka = 10;
    else if (/\b(ix)\b/.test(s)) angka = 9;
    else if (/\b(viii)\b/.test(s)) angka = 8;
    else if (/\b(vii)\b/.test(s)) angka = 7;
    else if (/\b(vi)\b/.test(s)) angka = 6;
    else if (/\b(v)\b/.test(s)) angka = 5;
    else if (/\b(iv)\b/.test(s)) angka = 4;
    else if (/\b(iii)\b/.test(s)) angka = 3;
    else if (/\b(ii)\b/.test(s)) angka = 2;
    else if (/\b(i)\b/.test(s)) angka = 1;

    // Angka 1 s/d 12
    if (angka === null) {
        const m = s.match(/\b([1-9]|1[0-2])\b/);
        if (m) angka = parseInt(m[1], 10);
    }

    if (isSD) {
        const k = (angka && angka >= 1 && angka <= 6) ? angka : 1;
        return 100 + k;
    }

    if (isSMP) {
        if (angka && angka >= 7 && angka <= 9) return 200 + angka;
        if (angka && angka >= 1 && angka <= 3) return 200 + (angka + 6); // 1 SMP -> 7
        return 207;
    }

    if (isSMA) {
        if (angka && angka >= 10 && angka <= 12) {
            if (/\blulus\b/i.test(s)) return 313;
            return 300 + angka;
        }
        if (angka && angka >= 1 && angka <= 3) return 300 + (angka + 9); // 1 SMA -> 10
        if (/\blulus\b/i.test(s)) return 313;
        return 310;
    }

    // Angka eksplisit tanpa label jenjang
    if (angka !== null) {
        if (angka >= 1 && angka <= 6) return 100 + angka; // Asumsi SD 1-6
        if (angka >= 7 && angka <= 9) return 200 + angka; // Asumsi SMP 7-9
        if (angka >= 10 && angka <= 12) return 300 + angka; // Asumsi SMA 10-12
    }

    return 9000;
}
window.parseKelasRank = parseKelasRank;

/**
 * Helper untuk menaikkan kelas santri otomatis saat pergantian periode/tahun ajaran baru:
 * SD (Kelas 1-6) -> SMP (Kelas 7-9) -> SMA (Kelas 10-12) -> Lulus
 * Mempertahankan nama kamar/keterangan lain (misal: "Kamar Ali 01 / SD Kelas 1" -> "Kamar Ali 01 / SD Kelas 2")
 */
function promoteKamarKelas(rawText) {
    if (!rawText || typeof rawText !== 'string') return rawText || '';
    const text = rawText.trim();
    if (!text) return '';

    // Jika sudah bertuliskan lulus, biarkan
    if (/\blulus\b/i.test(text)) {
        return text;
    }

    const hasKelasWord = /\b(kelas|kls)\b/i.test(text);
    const hasJenjang = /\b(sd|mi|smp|mts|sma|ma|smk|aliyah|tsanawiyah|ibtidaiyah)\b/i.test(text);

    // Jika tidak ada penyebutan kelas atau jenjang sekolah, biarkan apa adanya (misal hanya nomor kamar "Kamar Ali 01")
    if (!hasKelasWord && !hasJenjang) {
        return text;
    }

    // 1. Cek Romawi (XII, XI, X, IX, VIII, VII, VI, V, IV, III, II, I)
    const romawiRegex = /\b(kelas|kls)?\s*(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/i;
    const romawiMatch = text.match(romawiRegex);
    if (romawiMatch) {
        const prefix = romawiMatch[1] || '';
        const rom = romawiMatch[2].toLowerCase();
        let nextRom = '';
        let levelUp = null;

        if (rom === 'xii') {
            return text.replace(romawiRegex, prefix ? `${prefix} XII (Lulus)` : 'XII (Lulus)');
        } else if (rom === 'xi') {
            nextRom = 'XII';
        } else if (rom === 'x') {
            nextRom = 'XI';
        } else if (rom === 'ix') {
            nextRom = 'X';
            levelUp = { from: /\b(smp|mts|tsanawiyah)\b/i, to: 'SMA' };
        } else if (rom === 'viii') {
            nextRom = 'IX';
        } else if (rom === 'vii') {
            nextRom = 'VIII';
        } else if (rom === 'vi') {
            nextRom = 'VII';
            levelUp = { from: /\b(sd|mi|ibtidaiyah)\b/i, to: 'SMP' };
        } else if (rom === 'v') {
            nextRom = 'VI';
        } else if (rom === 'iv') {
            nextRom = 'V';
        } else if (rom === 'iii') {
            nextRom = 'IV';
        } else if (rom === 'ii') {
            nextRom = 'III';
        } else if (rom === 'i') {
            nextRom = 'II';
        }

        let res = text.replace(romawiRegex, prefix ? `${prefix} ${nextRom}` : nextRom);
        if (levelUp && levelUp.from.test(res)) {
            res = res.replace(levelUp.from, levelUp.to);
        }
        return res;
    }

    // 2. Cek Angka dengan kata "Kelas" atau "Kls" (misal: "Kelas 1", "SD Kelas 6", "Kelas 7 SMP", "Kamar Ali / Kelas 1 SD")
    const kelasRegex = /\b(kelas|kls)\s*([0-9]{1,2})\b/i;
    const kelasMatch = text.match(kelasRegex);
    if (kelasMatch) {
        const prefix = kelasMatch[1];
        const num = parseInt(kelasMatch[2], 10);
        if (num >= 1 && num <= 12) {
            let res = text;
            const isSD = /\b(sd|mi|ibtidaiyah)\b/i.test(text);
            const isSMP = /\b(smp|mts|tsanawiyah)\b/i.test(text);
            const isSMA = /\b(sma|ma|smk|aliyah)\b/i.test(text);

            if (num === 12 || (isSMA && num === 3)) {
                return res.replace(kelasRegex, `${prefix} ${num} (Lulus)`);
            }

            // Kenaikan jenjang:
            // SD Kelas 6 -> SMP Kelas 7
            if (num === 6 && (isSD || (!isSMP && !isSMA))) {
                if (isSD) res = res.replace(/\b(sd|mi|ibtidaiyah)\b/i, 'SMP');
                return res.replace(kelasRegex, `${prefix} 7`);
            }
            // SMP Kelas 9 -> SMA Kelas 10
            if (num === 9) {
                if (isSMP) res = res.replace(/\b(smp|mts|tsanawiyah)\b/i, 'SMA');
                return res.replace(kelasRegex, `${prefix} 10`);
            }
            // SMP Kelas 3 (sistem 1-3 SMP) -> SMA Kelas 10
            if (num === 3 && isSMP) {
                res = res.replace(/\b(smp|mts|tsanawiyah)\b/i, 'SMA');
                return res.replace(kelasRegex, `${prefix} 10`);
            }
            // 1 SMA -> 2 SMA, 2 SMA -> 3 SMA
            if (num === 1 && isSMA) {
                return res.replace(kelasRegex, `${prefix} 2`);
            }
            if (num === 2 && isSMA) {
                return res.replace(kelasRegex, `${prefix} 3`);
            }

            const nextNum = num + 1;
            return res.replace(kelasRegex, `${prefix} ${nextNum}`);
        }
    }

    // 3. Cek Pola Jenjang + Angka (misal "SD 1", "SD 6", "SMP 7", "SMA 10", "SMA 12")
    const jenjangNumRegex = /\b(sd|mi|smp|mts|sma|ma|smk)\s*([0-9]{1,2})\b/i;
    const jenjangNumMatch = text.match(jenjangNumRegex);
    if (jenjangNumMatch) {
        const jjg = jenjangNumMatch[1];
        const num = parseInt(jenjangNumMatch[2], 10);
        const isSD = /^(sd|mi)$/i.test(jjg);
        const isSMP = /^(smp|mts)$/i.test(jjg);
        const isSMA = /^(sma|ma|smk)$/i.test(jjg);

        if (num === 12 || (isSMA && num === 3)) {
            return text.replace(jenjangNumRegex, `${jjg} ${num} (Lulus)`);
        }
        if (num === 6 && isSD) {
            return text.replace(jenjangNumRegex, 'SMP 7');
        }
        if (num === 9 && isSMP) {
            return text.replace(jenjangNumRegex, 'SMA 10');
        }
        if (num === 3 && isSMP) {
            return text.replace(jenjangNumRegex, 'SMA 10');
        }
        const nextNum = num + 1;
        return text.replace(jenjangNumRegex, `${jjg} ${nextNum}`);
    }

    // 4. Cek Pola Angka + Jenjang (misal "1 SD", "6 SD", "7 SMP", "9 SMP", "10 SMA", "12 SMA")
    const numJenjangRegex = /\b([0-9]{1,2})\s*(sd|mi|smp|mts|sma|ma|smk)\b/i;
    const numJenjangMatch = text.match(numJenjangRegex);
    if (numJenjangMatch) {
        const num = parseInt(numJenjangMatch[1], 10);
        const jjg = numJenjangMatch[2];
        const isSD = /^(sd|mi)$/i.test(jjg);
        const isSMP = /^(smp|mts)$/i.test(jjg);
        const isSMA = /^(sma|ma|smk)$/i.test(jjg);

        if (num === 12 || (isSMA && num === 3)) {
            return text.replace(numJenjangRegex, `${num} ${jjg} (Lulus)`);
        }
        if (num === 6 && isSD) {
            return text.replace(numJenjangRegex, '7 SMP');
        }
        if (num === 9 && isSMP) {
            return text.replace(numJenjangRegex, '10 SMA');
        }
        if (num === 3 && isSMP) {
            return text.replace(numJenjangRegex, '10 SMA');
        }
        const nextNum = num + 1;
        return text.replace(numJenjangRegex, `${nextNum} ${jjg}`);
    }

    return text;
}
window.promoteKamarKelas = promoteKamarKelas;

const Storage = {
    subscribers: [],

    /**
     * Daftarkan pendengar (subscriber) untuk auto re-render saat data berubah
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.push(callback);
        }
    },

    notifySubscribers(data) {
        this.subscribers.forEach(cb => {
            try { cb(data); } catch (e) { console.error('[Storage] Subscriber error:', e); }
        });
    },

    /**
     * Inisialisasi Database: Muat data dari localStorage atau pasang default seed data
     * Otomatis migrasikan santriList ke masing-masing objek periode jika belum ada.
     */
    init() {
        const raw = localStorage.getItem(STORAGE_KEY);
        let data = null;

        if (!raw) {
            data = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
            this.saveLocalOnly(data);
            // Coba pulihkan cadangan dari IndexedDB jika localStorage kosong
            if (typeof IDB !== 'undefined' && IDB.load) {
                IDB.load().then(idbData => {
                    if (idbData && Array.isArray(idbData.periode) && (
                        (idbData.buku_kas && idbData.buku_kas.length > 0) ||
                        (idbData.pinjaman && idbData.pinjaman.length > 0) ||
                        (idbData.periode && idbData.periode.some(p => p.santri_list && p.santri_list.length > 0))
                    )) {
                        console.log('[Storage] Memulihkan data dari IndexedDB...');
                        Storage.saveLocalOnly(idbData);
                        if (typeof renderCurrentTab === 'function') renderCurrentTab();
                    }
                }).catch(() => {});
            }
            return data;
        }

        try {
            data = JSON.parse(raw);
            if (!data || typeof data !== 'object') {
                console.warn('[Storage] Data rusak atau bukan objek, memasang database awal bersih');
                data = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
                this.saveLocalOnly(data);
                return data;
            }
        } catch (e) {
            console.error('[Storage] Data rusak, mengembalikan ke data awal bersih:', e);
            data = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
            this.saveLocalOnly(data);
            return data;
        }

        // Migrasi & Validasi aman (memperbaiki tanpa menghapus data pengguna yang valid)
        let needsSave = false;

        // Pastikan seluruh array utama selalu ada
        if (!Array.isArray(data.buku_kas)) { data.buku_kas = []; needsSave = true; }
        if (!Array.isArray(data.pinjaman)) { data.pinjaman = []; needsSave = true; }
        if (!Array.isArray(data.matriks_kas_bulanan)) { data.matriks_kas_bulanan = []; needsSave = true; }
        if (!Array.isArray(data.master_santri)) { data.master_santri = []; needsSave = true; }

        // PENGAMAN PIN KEAMANAN: Pastikan settings.edit_pin selalu tersedia (default '1234')
        if (!data.settings || typeof data.settings.edit_pin !== 'string' || !data.settings.edit_pin.trim()) {
            if (!data.settings) data.settings = {};
            data.settings.edit_pin = '1234';
            needsSave = true;
        }

        // PENGAMAN: Pastikan settings.is_locked tersedia (default false)
        if (data.settings && typeof data.settings.is_locked === 'undefined') {
            data.settings.is_locked = false;
            needsSave = true;
        }

        // PENGAMAN: Pastikan akun bawaan (terutama admin) selalu tersedia
        if (!Array.isArray(data.users) || data.users.length === 0) {
            console.warn('[Storage] Daftar pengguna kosong, memasang akun bawaan');
            data.users = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA.users));
            needsSave = true;
        } else {
            // Pastikan minimal akun admin bawaan selalu ada jika terhapus/hilang di localStorage lama
            const hasAdmin = data.users.some(u => (u.username || '').toLowerCase() === 'admin');
            if (!hasAdmin) {
                console.warn('[Storage] Akun admin tidak ditemukan di database lokal lama, menambahkan kembali akun admin');
                const defaultAdmin = DEFAULT_SEED_DATA.users.find(u => u.username === 'admin');
                if (defaultAdmin) {
                    data.users.unshift(JSON.parse(JSON.stringify(defaultAdmin)));
                    needsSave = true;
                }
            }
        }

        // Manajemen Periode & Santri Per-Periode (santri_list mandiri di tiap periode)
        if (!Array.isArray(data.periode) || data.periode.length === 0) {
            data.periode = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA.periode));
            needsSave = true;
        }

        // Pastikan santri_list di setiap periode bertipe Array tanpa menyisipkan template dummy
        data.periode.forEach(p => {
            if (!Array.isArray(p.santri_list)) {
                p.santri_list = [];
                needsSave = true;
            }
        });

        if (needsSave) {
            this.saveLocalOnly(data);
        }

        return data;
    },

    getData() {
        return this.init();
    },

    /**
     * Pengaman Beforeunload & Auto-Save Sync:
     * Memastikan state lokal tersimpan rapi dan langsung diflush ke Cloud seketika
     */
    autoSaveSync() {
        try {
            const db = this.getData();
            this.saveLocalOnly(db);
            if (typeof CloudSync !== 'undefined' && CloudSync.isConnected() && CloudSync.pushToCloud) {
                CloudSync.pushToCloud(db, true);
            }
        } catch (e) {
            console.warn('[Storage] autoSaveSync error:', e);
        }
    },

    /**
     * Simpan data hanya ke penyimpanan lokal tanpa memicu feedback push ke cloud
     */
    saveLocalOnly(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // Juga simpan ke IndexedDB sebagai cadangan
        if (typeof IDB !== 'undefined' && IDB.save) {
            IDB.save(data).catch(() => {});
        }
        this.notifySubscribers(data);
    },

    /**
     * Simpan data: simpan ke lokal dan otomatis sinkronkan ke Cloud JSON (npoint.io)
     */
    saveData(data) {
        // Update timestamp
        data.lastSavedAt = new Date().toISOString();
        this.saveLocalOnly(data);
        if (typeof CloudSync !== 'undefined' && CloudSync.isConnected() && CloudSync.pushToCloud) {
            CloudSync.pushToCloud(data);
        }
    },

    getNextId(collection) {
        if (!collection || collection.length === 0) return 1;
        const max = Math.max(...collection.map(item => item.id || 0));
        return max + 1;
    },

    // ========================================================
    // USERS (MANAJEMEN PENGGUNA)
    // ========================================================
    getUsers() {
        const db = this.getData();
        return db.users || [];
    },

    addUser({ nama, username, password, role }) {
        const db = this.getData();
        if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error(`Username "${username}" sudah digunakan!`);
        }
        const newUser = {
            id: this.getNextId(db.users),
            nama,
            username,
            password,
            role: role || 'sekretaris_kas'
        };
        db.users.push(newUser);
        this.saveData(db);
        return newUser;
    },

    resetUserPassword(userId, newPassword) {
        const db = this.getData();
        const user = db.users.find(u => u.id === parseInt(userId));
        if (!user) throw new Error('Pengguna tidak ditemukan!');
        user.password = newPassword;
        this.saveData(db);
        return true;
    },

    deleteUser(userId, currentUserId) {
        const db = this.getData();
        const targetId = parseInt(userId);
        if (targetId === parseInt(currentUserId)) {
            throw new Error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!');
        }
        const target = db.users.find(u => u.id === targetId);
        if (!target) throw new Error('Pengguna tidak ditemukan!');

        if (target.role === 'bendahara_utama') {
            const countAdmin = db.users.filter(u => u.role === 'bendahara_utama').length;
            if (countAdmin <= 1) {
                throw new Error('Minimal harus tersisa 1 akun dengan hak akses Bendahara Utama!');
            }
        }

        db.users = db.users.filter(u => u.id !== targetId);
        this.saveData(db);
        return target;
    },

    updateUserProfile(userId, { nama, username, passwordLama, passwordBaru }) {
        const db = this.getData();
        const targetId = parseInt(userId);
        const user = db.users.find(u => u.id === targetId);
        if (!user) throw new Error('Pengguna tidak ditemukan!');

        if (!nama || !nama.trim()) {
            throw new Error('Nama lengkap tidak boleh kosong!');
        }

        const cleanUsername = (username || '').trim().toLowerCase();
        if (!cleanUsername) {
            throw new Error('Username tidak boleh kosong!');
        }

        // Cek duplikasi username jika diubah
        if (cleanUsername !== user.username.toLowerCase()) {
            const exists = db.users.some(u => u.id !== targetId && u.username.toLowerCase() === cleanUsername);
            if (exists) {
                throw new Error(`Username "${username}" sudah digunakan oleh pengguna lain!`);
            }
        }

        // Validasi penggantian password jika diisi
        if (passwordBaru && passwordBaru.trim()) {
            if (!passwordLama) {
                throw new Error('Masukkan password lama untuk verifikasi perubahan password!');
            }
            if (user.password !== passwordLama) {
                throw new Error('Password lama yang Anda masukkan salah!');
            }
            if (passwordBaru.trim().length < 4) {
                throw new Error('Password baru minimal 4 karakter!');
            }
            user.password = passwordBaru.trim();
        }

        user.nama = nama.trim();
        user.username = cleanUsername;
        this.saveData(db);

        return {
            id: user.id,
            nama: user.nama,
            username: user.username,
            role: user.role
        };
    },

    // ========================================================
    // PERIODE (TAHUN AJARAN)
    // ========================================================
    getPeriodes() {
        const db = this.getData();
        return (db.periode || []).sort((a, b) => b.is_active - a.is_active || b.id - a.id);
    },

    getActivePeriode() {
        const list = this.getPeriodes();
        const active = list.find(p => p.is_active === 1);
        return active || list[0] || null;
    },

    setActivePeriode(id) {
        const db = this.getData();
        const targetId = parseInt(id);
        db.periode.forEach(p => {
            p.is_active = (p.id === targetId ? 1 : 0);
        });
        this.saveData(db);
        return true;
    },

    addPeriode({ nama_periode, tipe_bulan, bawa_saldo, dari_periode_id }) {
        const db = this.getData();
        const newId = this.getNextId(db.periode);
        
        // Ambil periode sumber untuk menyalin santriList
        const sourcePid = parseInt(dari_periode_id || (this.getActivePeriode() || {}).id);
        const sourcePeriode = db.periode.find(p => p.id === sourcePid) || this.getActivePeriode();
        const sourceSantri = (sourcePeriode && Array.isArray(sourcePeriode.santri_list))
            ? sourcePeriode.santri_list
            : (Array.isArray(db.master_santri) ? db.master_santri : []);

        // Salin seluruh daftar santri dari periode aktif sebelumnya ke periode baru
        // dengan kenaikan kelas otomatis khusus untuk periode baru ini (periode lama tetap utuh)
        const copiedSantriList = sourceSantri.map(s => ({
            id: s.id,
            nama_santri: s.nama_santri,
            kamar_kelas: (s.is_active === 1) ? promoteKamarKelas(s.kamar_kelas || '') : (s.kamar_kelas || ''),
            is_active: s.is_active,
            urutan: s.urutan || 1,
            tgl_boyong: s.tgl_boyong || null,
            alasan_boyong: s.alasan_boyong || null
        }));

        // Nonaktifkan yang lain
        db.periode.forEach(p => p.is_active = 0);

        const newPeriode = {
            id: newId,
            nama_periode,
            tipe_bulan: tipe_bulan || 'juli_juni',
            is_active: 1,
            santri_list: copiedSantriList
        };
        db.periode.push(newPeriode);

        // Jika opsi bawa saldo dicentang
        if (bawa_saldo && dari_periode_id) {
            const bkLama = (db.buku_kas || []).filter(b => b.periode_id === parseInt(dari_periode_id));
            const saldoAkhir = bkLama.reduce((s, r) => s + (parseFloat(r.debit) || 0) - (parseFloat(r.kredit) || 0), 0);
            
            if (saldoAkhir > 0) {
                const newBkId = this.getNextId(db.buku_kas);
                const today = new Date().toISOString().split('T')[0];
                if (!db.buku_kas) db.buku_kas = [];
                db.buku_kas.push({
                    id: newBkId,
                    periode_id: newId,
                    tanggal: today,
                    nama_barang: 'Saldo Awal',
                    keterangan: 'Saldo pindahan dari periode sebelumnya',
                    debit: saldoAkhir,
                    kredit: 0,
                    bukti: '-',
                    urutan: 1
                });
            }
        }

        this.saveData(db);
        return newPeriode;
    },

    deletePeriode(id) {
        const db = this.getData();
        const targetId = parseInt(id);

        if (db.periode.length <= 1) {
            throw new Error('Minimal harus tersisa 1 periode aktif dalam sistem!');
        }

        const target = db.periode.find(p => p.id === targetId);
        if (!target) throw new Error('Periode tidak ditemukan!');
        const wasActive = (target.is_active === 1);

        // Hapus periode dan seluruh catatan terkait (Cascade delete)
        db.periode = db.periode.filter(p => p.id !== targetId);
        db.buku_kas = (db.buku_kas || []).filter(b => b.periode_id !== targetId);
        db.pinjaman = (db.pinjaman || []).filter(p => p.periode_id !== targetId);
        db.matriks_kas_bulanan = (db.matriks_kas_bulanan || []).filter(m => m.periode_id !== targetId);

        // Jika yang dihapus aktif, aktifkan periode terakhir yang tersisa
        if (wasActive && db.periode.length > 0) {
            db.periode[0].is_active = 1;
        }

        this.saveData(db);
        return target;
    },

    // ========================================================
    // MANAJEMEN DAFTAR SANTRI PER-PERIODE
    // ========================================================
    /**
     * Dapatkan daftar santri khusus untuk periode tertentu.
     * Santri aktif diurutkan di atas, santri boyong di bawah.
     */
    getSantriByPeriode(periodeId) {
        const db = this.getData();
        const pid = parseInt(periodeId || (this.getActivePeriode() || {}).id);
        const targetPeriode = db.periode.find(p => p.id === pid) || this.getActivePeriode();
        if (!targetPeriode) return [];

        if (!Array.isArray(targetPeriode.santri_list)) {
            targetPeriode.santri_list = [];
            this.saveLocalOnly(db);
        }

        return targetPeriode.santri_list.sort((a, b) => 
            (b.is_active - a.is_active) || 
            (parseKelasRank(a.kamar_kelas) - parseKelasRank(b.kamar_kelas)) ||
            ((a.urutan || 0) - (b.urutan || 0)) || 
            (a.nama_santri || '').localeCompare(b.nama_santri || '', 'id') ||
            (a.id - b.id)
        );
    },

    getAllSantri(periodeId) {
        return this.getSantriByPeriode(periodeId);
    },

    getActiveSantri(periodeId) {
        return this.getSantriByPeriode(periodeId).filter(s => s.is_active === 1);
    },

    getBoyongSantri(periodeId) {
        return this.getSantriByPeriode(periodeId).filter(s => s.is_active === 0);
    },

    /**
     * Tambah santri baru:
     * Santri baru HANYA ditambahkan ke periode target dan periode-periode yang dibuat setelahnya (p.id >= targetId).
     * Periode masa lalu (p.id < targetId, misalnya data periode 2024/2025) tetap utuh tanpa bertambah!
     */
    addSantri({ nama_santri, kamar_kelas }, targetPeriodeId) {
        const db = this.getData();
        const activeP = this.getActivePeriode();
        const tid = parseInt(targetPeriodeId || (activeP ? activeP.id : 1));

        // Cari ID tertinggi lintas database untuk ID unik global
        let globalMaxId = 0;
        db.periode.forEach(p => {
            if (Array.isArray(p.santri_list)) {
                p.santri_list.forEach(s => { if ((s.id || 0) > globalMaxId) globalMaxId = s.id; });
            }
        });
        if (Array.isArray(db.master_santri)) {
            db.master_santri.forEach(s => { if ((s.id || 0) > globalMaxId) globalMaxId = s.id; });
        }
        const newId = globalMaxId + 1;
        let createdSantri = null;

        // Tambahkan ke periode target dan periode setelahnya (p.id >= tid)
        db.periode.forEach(p => {
            if (p.id >= tid) {
                if (!Array.isArray(p.santri_list)) p.santri_list = [];
                const maxUrutan = p.santri_list.reduce((max, s) => Math.max(max, s.urutan || 0), 0);
                const newObj = {
                    id: newId,
                    nama_santri: nama_santri.trim(),
                    kamar_kelas: (kamar_kelas || '').trim(),
                    is_active: 1,
                    urutan: maxUrutan + 1,
                    tgl_boyong: null,
                    alasan_boyong: null
                };
                p.santri_list.push(newObj);
                if (p.id === tid) createdSantri = newObj;
            }
        });

        // Simpan juga ke master_santri global untuk template masa depan
        if (!Array.isArray(db.master_santri)) db.master_santri = [];
        if (!db.master_santri.some(s => s.id === newId)) {
            db.master_santri.push({
                id: newId,
                nama_santri: nama_santri.trim(),
                kamar_kelas: (kamar_kelas || '').trim(),
                is_active: 1,
                urutan: newId,
                tgl_boyong: null
            });
        }

        this.saveData(db);
        return createdSantri || { id: newId, nama_santri, kamar_kelas };
    },

    updateSantri(id, { nama_santri, kamar_kelas }, targetPeriodeId) {
        const db = this.getData();
        const tid = parseInt(targetPeriodeId || (this.getActivePeriode() || {}).id);
        const sid = parseInt(id);
        let updated = null;

        db.periode.forEach(p => {
            if (p.id >= tid && Array.isArray(p.santri_list)) {
                const s = p.santri_list.find(x => x.id === sid);
                if (s) {
                    s.nama_santri = nama_santri.trim();
                    s.kamar_kelas = (kamar_kelas || '').trim();
                    if (p.id === tid) updated = s;
                }
            }
        });

        if (Array.isArray(db.master_santri)) {
            const ms = db.master_santri.find(x => x.id === sid);
            if (ms) {
                ms.nama_santri = nama_santri.trim();
                ms.kamar_kelas = (kamar_kelas || '').trim();
            }
        }

        this.saveData(db);
        return updated;
    },

    /**
     * Tandai santri Lulus / Boyong:
     * Dikecualikan dari total santri aktif dan tunggakan di periode aktif/berikutnya,
     * tetapi tetap tersimpan utuh di periode lampau.
     */
    boyongSantri(id, alasan = '', targetPeriodeId) {
        const db = this.getData();
        const tid = parseInt(targetPeriodeId || (this.getActivePeriode() || {}).id);
        const sid = parseInt(id);
        let target = null;

        db.periode.forEach(p => {
            if (p.id >= tid && Array.isArray(p.santri_list)) {
                const s = p.santri_list.find(x => x.id === sid);
                if (s) {
                    s.is_active = 0;
                    s.tgl_boyong = new Date().toISOString().split('T')[0];
                    s.alasan_boyong = alasan || 'Lulus / Boyong Pondok';
                    if (p.id === tid) target = s;
                }
            }
        });

        if (Array.isArray(db.master_santri)) {
            const ms = db.master_santri.find(x => x.id === sid);
            if (ms) {
                ms.is_active = 0;
                ms.tgl_boyong = new Date().toISOString().split('T')[0];
                ms.alasan_boyong = alasan || 'Lulus / Boyong Pondok';
            }
        }

        this.saveData(db);
        return target;
    },

    /**
     * Aktifkan kembali santri yang boyong (Reaktivasi)
     */
    reaktivasiSantri(id, targetPeriodeId) {
        const db = this.getData();
        const tid = parseInt(targetPeriodeId || (this.getActivePeriode() || {}).id);
        const sid = parseInt(id);
        let target = null;

        db.periode.forEach(p => {
            if (p.id >= tid && Array.isArray(p.santri_list)) {
                const s = p.santri_list.find(x => x.id === sid);
                if (s) {
                    s.is_active = 1;
                    s.tgl_boyong = null;
                    s.alasan_boyong = null;
                    if (p.id === tid) target = s;
                }
            }
        });

        if (Array.isArray(db.master_santri)) {
            const ms = db.master_santri.find(x => x.id === sid);
            if (ms) {
                ms.is_active = 1;
                ms.tgl_boyong = null;
                ms.alasan_boyong = null;
            }
        }

        this.saveData(db);
        return target;
    },

    toggleSantriStatus(id, isActive, targetPeriodeId) {
        if (isActive) {
            return this.reaktivasiSantri(id, targetPeriodeId);
        } else {
            return this.boyongSantri(id, '', targetPeriodeId);
        }
    },

    deleteSantri(id, targetPeriodeId) {
        const db = this.getData();
        const tid = parseInt(targetPeriodeId || (this.getActivePeriode() || {}).id);
        const sid = parseInt(id);

        db.periode.forEach(p => {
            if (p.id >= tid && Array.isArray(p.santri_list)) {
                p.santri_list = p.santri_list.filter(s => s.id !== sid);
            }
        });

        if (Array.isArray(db.master_santri)) {
            db.master_santri = db.master_santri.filter(s => s.id !== sid);
        }

        db.matriks_kas_bulanan = (db.matriks_kas_bulanan || []).filter(m => !(m.santri_id === sid && m.periode_id >= tid));
        this.saveData(db);
        return true;
    },

    // ========================================================
    // MATRIKS KAS BULANAN
    // ========================================================
    getMatriksByPeriode(periodeId) {
        const db = this.getData();
        const pid = parseInt(periodeId || (this.getActivePeriode() || {}).id);
        const periode = db.periode.find(p => p.id === pid) || { tipe_bulan: 'juli_juni' };

        // Ambil daftar santri khusus periode ini (santriList mandiri)
        const santriList = this.getSantriByPeriode(pid);
        const records = (db.matriks_kas_bulanan || []).filter(m => m.periode_id === pid);

        // Format data: daftar santri dengan map status bulan { 1: '...', ..., 12: '...' }
        const result = santriList.map(s => {
            const statusMap = {};
            for (let b = 1; b <= 12; b++) {
                statusMap[b] = 'kosong';
            }
            records.filter(r => r.santri_id === s.id).forEach(r => {
                statusMap[r.bulan] = r.status;
            });
            return {
                id: s.id,
                nama_santri: s.nama_santri,
                kamar_kelas: s.kamar_kelas,
                is_active: s.is_active,
                tgl_boyong: s.tgl_boyong,
                alasan_boyong: s.alasan_boyong,
                status: statusMap
            };
        });

        return {
            tipe_bulan: periode.tipe_bulan,
            data: result
        };
    },

    updateMatriksStatus(periodeId, santriId, bulan, status) {
        const db = this.getData();
        const pid = parseInt(periodeId);
        const sid = parseInt(santriId);
        const b = parseInt(bulan);

        if (!db.matriks_kas_bulanan) db.matriks_kas_bulanan = [];

        let record = db.matriks_kas_bulanan.find(m => m.periode_id === pid && m.santri_id === sid && m.bulan === b);
        if (record) {
            record.status = status;
        } else {
            const newId = this.getNextId(db.matriks_kas_bulanan);
            db.matriks_kas_bulanan.push({
                id: newId,
                periode_id: pid,
                santri_id: sid,
                bulan: b,
                status: status
            });
        }
        this.saveData(db);
        return true;
    },

    // ========================================================
    // BUKU KAS UMUM
    // ========================================================
    getBukuKas(periodeId) {
        const db = this.getData();
        const pid = parseInt(periodeId);
        const list = (db.buku_kas || []).filter(b => b.periode_id === pid);
        list.sort((a, b) => (a.urutan || 0) - (b.urutan || 0) || a.id - b.id);

        let totalDebit = 0;
        let totalKredit = 0;
        list.forEach(item => {
            totalDebit += (parseFloat(item.debit) || 0);
            totalKredit += (parseFloat(item.kredit) || 0);
        });

        return {
            data: list,
            total_debit: totalDebit,
            total_kredit: totalKredit,
            saldo: totalDebit - totalKredit
        };
    },

    addBukuKas({ periode_id, tanggal, nama_barang, keterangan, debit, kredit, bukti }) {
        const db = this.getData();
        const pid = parseInt(periode_id);
        const list = (db.buku_kas || []).filter(b => b.periode_id === pid);
        const nextUrutan = list.reduce((m, item) => Math.max(m, item.urutan || 0), 0) + 1;

        const newId = this.getNextId(db.buku_kas);
        const newRecord = {
            id: newId,
            periode_id: pid,
            tanggal: tanggal || null,
            nama_barang: nama_barang || '',
            keterangan: keterangan || '',
            debit: parseFloat(debit) || 0,
            kredit: parseFloat(kredit) || 0,
            bukti: bukti || '-',
            urutan: nextUrutan
        };
        db.buku_kas.push(newRecord);
        this.saveData(db);
        return newRecord;
    },

    updateBukuKas({ id, tanggal, nama_barang, keterangan, debit, kredit, bukti }) {
        const db = this.getData();
        const item = db.buku_kas.find(b => b.id === parseInt(id));
        if (!item) throw new Error('Data buku kas tidak ditemukan!');
        item.tanggal = tanggal || null;
        item.nama_barang = nama_barang || '';
        item.keterangan = keterangan || '';
        item.debit = parseFloat(debit) || 0;
        item.kredit = parseFloat(kredit) || 0;
        item.bukti = bukti || '-';
        this.saveData(db);
        return item;
    },

    deleteBukuKas(id) {
        const db = this.getData();
        const targetId = parseInt(id);
        const item = db.buku_kas.find(b => b.id === targetId);
        if (!item) throw new Error('Data buku kas tidak ditemukan!');
        db.buku_kas = db.buku_kas.filter(b => b.id !== targetId);
        this.saveData(db);
        return item;
    },

    // ========================================================
    // PINJAMAN / KASBON
    // ========================================================
    getPinjaman(periodeId) {
        const db = this.getData();
        const pid = parseInt(periodeId);
        const list = (db.pinjaman || []).filter(p => p.periode_id === pid);
        list.sort((a, b) => a.id - b.id);

        let totalBelumKembali = 0;
        list.forEach(p => {
            const sisa = (parseFloat(p.total_ambil) || 0) - (parseFloat(p.total_kembali) || 0);
            if (sisa > 0) totalBelumKembali += sisa;
        });

        return {
            data: list,
            total_belum_kembali: totalBelumKembali
        };
    },

    addPinjaman({ periode_id, tanggal, nama_peminjam, keperluan, total_ambil, tanda_bukti }) {
        const db = this.getData();
        const pid = parseInt(periode_id);
        const newId = this.getNextId(db.pinjaman);
        const tgl = tanggal || new Date().toISOString().split('T')[0];
        const nominal = parseFloat(total_ambil) || 0;

        const newRecord = {
            id: newId,
            periode_id: pid,
            tanggal: tgl,
            nama_peminjam: nama_peminjam || '',
            keperluan: keperluan || '',
            total_ambil: nominal,
            total_kembali: 0,
            tgl_kembali: null,
            tanda_bukti: tanda_bukti || '-'
        };
        db.pinjaman.push(newRecord);

        // Otomatis masukkan kas keluar (kredit) ke Buku Kas agar tidak perlu input 2 kali
        if (nominal > 0) {
            if (!Array.isArray(db.buku_kas)) db.buku_kas = [];
            const listBK = db.buku_kas.filter(b => b.periode_id === pid);
            const nextUrutan = listBK.reduce((m, item) => Math.max(m, item.urutan || 0), 0) + 1;
            const newBkId = this.getNextId(db.buku_kas);
            db.buku_kas.push({
                id: newBkId,
                periode_id: pid,
                tanggal: tgl,
                nama_barang: `Pinjaman: ${nama_peminjam || 'Santri/Pengurus'}`,
                keterangan: keperluan ? keperluan : 'Pinjaman / Kasbon',
                debit: 0,
                kredit: nominal,
                bukti: tanda_bukti || '-',
                urutan: nextUrutan,
                ref_pinjaman_id: newId,
                ref_tipe: 'pinjam'
            });
        }

        this.saveData(db);
        return newRecord;
    },

    cicilPinjaman(id, jumlahBayar, tglKembali) {
        const db = this.getData();
        const targetId = parseInt(id);
        const item = db.pinjaman.find(p => p.id === targetId);
        if (!item) throw new Error('Pinjaman tidak ditemukan!');

        const bayar = parseFloat(jumlahBayar) || 0;
        item.total_kembali = (parseFloat(item.total_kembali) || 0) + bayar;
        if (item.total_kembali > item.total_ambil) item.total_kembali = item.total_ambil;

        const tgl = tglKembali || new Date().toISOString().split('T')[0];
        item.tgl_kembali = tgl;
        const isLunas = item.total_kembali >= item.total_ambil;

        // Otomatis masukkan kas masuk (debit) ke Buku Kas saat pengembalian / cicil pinjaman
        if (bayar > 0) {
            if (!Array.isArray(db.buku_kas)) db.buku_kas = [];
            const pid = parseInt(item.periode_id);
            const listBK = db.buku_kas.filter(b => b.periode_id === pid);
            const nextUrutan = listBK.reduce((m, b) => Math.max(m, b.urutan || 0), 0) + 1;
            const newBkId = this.getNextId(db.buku_kas);
            db.buku_kas.push({
                id: newBkId,
                periode_id: pid,
                tanggal: tgl,
                nama_barang: `Pengembalian Pinjaman: ${item.nama_peminjam || 'Santri/Pengurus'}`,
                keterangan: isLunas ? 'Pelunasan pinjaman' : 'Cicilan pengembalian pinjaman',
                debit: bayar,
                kredit: 0,
                bukti: item.tanda_bukti || '-',
                urutan: nextUrutan,
                ref_pinjaman_id: targetId,
                ref_tipe: 'kembali'
            });
        }

        this.saveData(db);
        return { item, lunas: isLunas };
    },

    deletePinjaman(id) {
        const db = this.getData();
        const targetId = parseInt(id);
        const item = db.pinjaman.find(p => p.id === targetId);
        if (!item) throw new Error('Pinjaman tidak ditemukan!');
        db.pinjaman = db.pinjaman.filter(p => p.id !== targetId);
        // Hapus juga transaksi buku kas otomatis yang terhubung dengan pinjaman ini
        if (Array.isArray(db.buku_kas)) {
            db.buku_kas = db.buku_kas.filter(b => b.ref_pinjaman_id !== targetId);
        }
        this.saveData(db);
        return item;
    },

    // ========================================================
    // PENGATURAN KEAMANAN (PIN MODE EDIT)
    // ========================================================
    getEditPin() {
        const db = this.getData();
        return (db.settings && db.settings.edit_pin) ? db.settings.edit_pin : '1234';
    },

    setEditPin(newPin) {
        const db = this.getData();
        if (!db.settings) db.settings = {};
        db.settings.edit_pin = (newPin || '').trim() || '1234';
        this.saveData(db);
        return db.settings.edit_pin;
    },

    /**
     * Status Kunci Tampilan (isLocked) — disinkronkan ke Cloud JSON
     * agar saat dikunci di 1 perangkat, semua perangkat lain ikut terkunci
     */
    getLockState() {
        const db = this.getData();
        return !!(db.settings && db.settings.is_locked);
    },

    setLockState(locked) {
        const db = this.getData();
        if (!db.settings) db.settings = {};
        db.settings.is_locked = !!locked;
        this.saveData(db);
        return db.settings.is_locked;
    },

    isLocked() {
        return this.getLockState();
    },

    setLocked(locked) {
        return this.setLockState(locked);
    },

    // ========================================================
    // BACKUP & RESTORE JSON
    // ========================================================
    exportBackupJSON() {
        const data = this.getData();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const today = new Date().toISOString().split('T')[0];
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-ebendahara-${today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importBackupJSON(jsonStr) {
        try {
            const parsed = JSON.parse(jsonStr);
            // Validasi skema dasar
            if (!parsed.periode || !parsed.buku_kas || !parsed.pinjaman) {
                throw new Error('Format file backup tidak valid atau tidak lengkap!');
            }
            if (!parsed.settings) parsed.settings = { edit_pin: '1234' };
            this.saveData(parsed);
            return true;
        } catch (e) {
            throw new Error('Gagal memproses file backup: ' + e.message);
        }
    },

    resetToDefault() {
        this.saveData(JSON.parse(JSON.stringify(DEFAULT_SEED_DATA)));
        return DEFAULT_SEED_DATA;
    }
};

// Pastikan storage diinisialisasi saat skrip dimuat
Storage.init();

// Alias StorageManager untuk interoperabilitas & akses state yang tersinkron ke cloud
window.StorageManager = Storage;
try {
    Object.defineProperty(Storage, 'state', {
        get() { return this.getData(); },
        set(val) { this.saveData(val); },
        configurable: true
    });
} catch (e) {
    Storage.state = Storage.getData();
}
