/**
 * ============================================================
 * E-Bendahara — storage.js
 * Pengelola Database Lokal (localStorage) & Sinkronisasi Cloud
 * Firebase Realtime Database Lintas Perangkat, Seeder Data Awal,
 * Master Data Santri Permanen & Arsip Santri Boyong,
 * serta Fitur Ekspor / Impor Cadangan Data (Backup JSON)
 * ============================================================
 */

const STORAGE_KEY = 'ebendahara_database_v1';
window.STORAGE_KEY = STORAGE_KEY;

// Template Santri Awal
const DEFAULT_SANTRI_TEMPLATE = [
    { id: 1,  nama_santri: 'Abdullah Faqih',  kamar_kelas: 'Kamar Ali 01',    is_active: 1, urutan: 1, tgl_boyong: null, alasan_boyong: null },
    { id: 2,  nama_santri: 'Muhammad Rizki',  kamar_kelas: 'Kamar Ali 02',    is_active: 1, urutan: 2, tgl_boyong: null, alasan_boyong: null },
    { id: 3,  nama_santri: 'Ahmad Zainuddin', kamar_kelas: 'Kamar Umar 01',   is_active: 1, urutan: 3, tgl_boyong: null, alasan_boyong: null },
    { id: 4,  nama_santri: 'Hasan Al-Bashri', kamar_kelas: 'Kamar Umar 02',   is_active: 1, urutan: 4, tgl_boyong: null, alasan_boyong: null },
    { id: 5,  nama_santri: 'Umar Faruq',      kamar_kelas: 'Kamar Utsman 01', is_active: 1, urutan: 5, tgl_boyong: null, alasan_boyong: null },
    { id: 6,  nama_santri: 'Ali Mustofa',     kamar_kelas: 'Kamar Utsman 02', is_active: 1, urutan: 6, tgl_boyong: null, alasan_boyong: null },
    { id: 7,  nama_santri: 'Bilal Ibrahim',   kamar_kelas: 'Kamar Abu Bakar', is_active: 1, urutan: 7, tgl_boyong: null, alasan_boyong: null },
    { id: 8,  nama_santri: 'Yusuf Hakim',     kamar_kelas: 'Kamar Abu Bakar', is_active: 1, urutan: 8, tgl_boyong: null, alasan_boyong: null },
    { id: 9,  nama_santri: 'Hamzah Ridwan',   kamar_kelas: 'Kamar Zubair 01', is_active: 1, urutan: 9, tgl_boyong: null, alasan_boyong: null },
    { id: 10, nama_santri: 'Khalid Walid',    kamar_kelas: 'Kamar Zubair 02', is_active: 1, urutan: 10, tgl_boyong: null, alasan_boyong: null },
    { id: 11, nama_santri: 'Zaid bin Tsabit', kamar_kelas: 'Kamar Ali 01',    is_active: 0, urutan: 11, tgl_boyong: '2026-06-25', alasan_boyong: 'Lulus Madrasah Aliyah' }
];

// Seed Data Awal jika database masih baru/kosong
const DEFAULT_SEED_DATA = {
    settings: {
        edit_pin: '1234',
        is_locked: false
    },
    users: [
        { id: 1, nama: 'Ustadzah Siti Aisyah', username: 'admin', password: 'admin123', role: 'bendahara_utama' },
        { id: 2, nama: 'Hj. Nurul Hidayah',    username: 'bendahara', password: 'bendahara123', role: 'bendahara_utama' },
        { id: 3, nama: 'Ahmad Fauzi',          username: 'sekretaris', password: 'sekretaris123', role: 'sekretaris_kas' },
        { id: 4, nama: 'K.H. Abdullah Gym',    username: 'pembina', password: 'pembina123', role: 'pembina' }
    ],
    periode: [
        { id: 1, nama_periode: 'Tahun Ajaran 2025/2026', tipe_bulan: 'juli_juni', is_active: 0, santri_list: JSON.parse(JSON.stringify(DEFAULT_SANTRI_TEMPLATE)) },
        { id: 2, nama_periode: 'Tahun Ajaran 2026/2027', tipe_bulan: 'juli_juni', is_active: 1, santri_list: JSON.parse(JSON.stringify(DEFAULT_SANTRI_TEMPLATE)) },
        { id: 3, nama_periode: 'Tahun 2025', tipe_bulan: 'januari_desember', is_active: 0, santri_list: JSON.parse(JSON.stringify(DEFAULT_SANTRI_TEMPLATE)) }
    ],
    master_santri: JSON.parse(JSON.stringify(DEFAULT_SANTRI_TEMPLATE)),
    matriks_kas_bulanan: [
        { id: 1,  periode_id: 2, santri_id: 1, bulan: 7, status: 'sudah' },
        { id: 2,  periode_id: 2, santri_id: 1, bulan: 8, status: 'sudah' },
        { id: 3,  periode_id: 2, santri_id: 1, bulan: 9, status: 'sudah' },
        { id: 4,  periode_id: 2, santri_id: 1, bulan: 10, status: 'sudah' },
        { id: 5,  periode_id: 2, santri_id: 1, bulan: 11, status: 'belum' },
        { id: 6,  periode_id: 2, santri_id: 2, bulan: 7, status: 'sudah' },
        { id: 7,  periode_id: 2, santri_id: 2, bulan: 8, status: 'sudah' },
        { id: 8,  periode_id: 2, santri_id: 2, bulan: 9, status: 'belum' },
        { id: 9,  periode_id: 2, santri_id: 2, bulan: 10, status: 'sudah' },
        { id: 10, periode_id: 2, santri_id: 3, bulan: 7, status: 'sudah' },
        { id: 11, periode_id: 2, santri_id: 3, bulan: 8, status: 'sudah' },
        { id: 12, periode_id: 2, santri_id: 3, bulan: 9, status: 'sudah' },
        { id: 13, periode_id: 2, santri_id: 3, bulan: 10, status: 'sudah' },
        { id: 14, periode_id: 2, santri_id: 3, bulan: 11, status: 'sudah' },
        { id: 15, periode_id: 2, santri_id: 4, bulan: 7, status: 'sudah' },
        { id: 16, periode_id: 2, santri_id: 4, bulan: 8, status: 'belum' },
        { id: 17, periode_id: 2, santri_id: 4, bulan: 9, status: 'sudah' },
        { id: 18, periode_id: 2, santri_id: 4, bulan: 10, status: 'belum' },
        { id: 19, periode_id: 2, santri_id: 5, bulan: 7, status: 'sudah' },
        { id: 20, periode_id: 2, santri_id: 5, bulan: 8, status: 'sudah' },
        { id: 21, periode_id: 2, santri_id: 5, bulan: 9, status: 'sudah' },
        { id: 22, periode_id: 2, santri_id: 5, bulan: 10, status: 'sudah' },
        { id: 23, periode_id: 2, santri_id: 5, bulan: 11, status: 'sudah' },
        { id: 24, periode_id: 2, santri_id: 6, bulan: 7, status: 'sudah' },
        { id: 25, periode_id: 2, santri_id: 6, bulan: 8, status: 'sudah' },
        { id: 26, periode_id: 2, santri_id: 6, bulan: 9, status: 'sudah' },
        { id: 27, periode_id: 2, santri_id: 6, bulan: 10, status: 'belum' },
        { id: 28, periode_id: 2, santri_id: 7, bulan: 7, status: 'sudah' },
        { id: 29, periode_id: 2, santri_id: 7, bulan: 8, status: 'sudah' },
        { id: 30, periode_id: 2, santri_id: 7, bulan: 9, status: 'sudah' },
        { id: 31, periode_id: 2, santri_id: 7, bulan: 10, status: 'sudah' },
        { id: 32, periode_id: 2, santri_id: 7, bulan: 11, status: 'belum' },
        { id: 33, periode_id: 2, santri_id: 8, bulan: 7, status: 'sudah' },
        { id: 34, periode_id: 2, santri_id: 8, bulan: 8, status: 'sudah' },
        { id: 35, periode_id: 2, santri_id: 8, bulan: 9, status: 'belum' },
        { id: 36, periode_id: 2, santri_id: 8, bulan: 10, status: 'sudah' },
        { id: 37, periode_id: 2, santri_id: 9, bulan: 7, status: 'sudah' },
        { id: 38, periode_id: 2, santri_id: 9, bulan: 8, status: 'sudah' },
        { id: 39, periode_id: 2, santri_id: 9, bulan: 9, status: 'sudah' },
        { id: 40, periode_id: 2, santri_id: 9, bulan: 10, status: 'sudah' },
        { id: 41, periode_id: 2, santri_id: 9, bulan: 11, status: 'sudah' },
        { id: 42, periode_id: 2, santri_id: 10, bulan: 7, status: 'sudah' },
        { id: 43, periode_id: 2, santri_id: 10, bulan: 8, status: 'belum' },
        { id: 44, periode_id: 2, santri_id: 10, bulan: 9, status: 'sudah' },
        { id: 45, periode_id: 2, santri_id: 10, bulan: 10, status: 'sudah' }
    ],
    buku_kas: [
        { id: 1,  periode_id: 2, tanggal: '2026-07-15', nama_barang: 'Saldo Awal', keterangan: 'Saldo pindahan dari periode sebelumnya', debit: 250000, kredit: 0, bukti: '-', urutan: 1 },
        { id: 2,  periode_id: 2, tanggal: '2026-07-20', nama_barang: 'Iuran Kas Juli', keterangan: 'Setoran kas bulan Juli (8 santri)', debit: 80000, kredit: 0, bukti: 'Buku Kas', urutan: 2 },
        { id: 3,  periode_id: 2, tanggal: '2026-07-25', nama_barang: 'Sapu Ijuk', keterangan: 'Pembelian 3 sapu ijuk untuk asrama', debit: 0, kredit: 45000, bukti: 'Nota', urutan: 3 },
        { id: 4,  periode_id: 2, tanggal: '2026-08-05', nama_barang: 'Iuran Kas Agustus', keterangan: 'Setoran kas bulan Agustus (8 santri)', debit: 80000, kredit: 0, bukti: 'Buku Kas', urutan: 4 },
        { id: 5,  periode_id: 2, tanggal: '2026-08-12', nama_barang: 'Ember & Gayung', keterangan: 'Pembelian perlengkapan mandi asrama', debit: 0, kredit: 35000, bukti: 'Nota', urutan: 5 },
        { id: 6,  periode_id: 2, tanggal: '2026-09-03', nama_barang: 'Iuran Kas September', keterangan: 'Setoran kas bulan September (7 santri)', debit: 70000, kredit: 0, bukti: 'Buku Kas', urutan: 6 },
        { id: 7,  periode_id: 2, tanggal: '2026-09-18', nama_barang: 'Deterjen & Pewangi', keterangan: 'Sabun cuci 5 kg + pewangi 2 liter', debit: 0, kredit: 52000, bukti: 'Nota', urutan: 7 },
        { id: 8,  periode_id: 2, tanggal: '2026-10-02', nama_barang: 'Iuran Kas Oktober', keterangan: 'Setoran kas bulan Oktober (8 santri)', debit: 80000, kredit: 0, bukti: 'Buku Kas', urutan: 8 },
        { id: 9,  periode_id: 2, tanggal: '2026-10-15', nama_barang: 'Lampu LED', keterangan: 'Penggantian lampu kamar 2 & 3', debit: 0, kredit: 30000, bukti: 'Nota', urutan: 9 },
        { id: 10, periode_id: 2, tanggal: '2026-11-01', nama_barang: 'Iuran Kas November', keterangan: 'Setoran kas bulan November (5 santri)', debit: 50000, kredit: 0, bukti: 'Buku Kas', urutan: 10 }
    ],
    pinjaman: [
        { id: 1, periode_id: 2, tanggal: '2026-08-20', nama_peminjam: 'Ustadz Mahmud', keperluan: 'Beli tinta printer untuk administrasi', total_ambil: 50000, total_kembali: 50000, tgl_kembali: '2026-09-05', tanda_bukti: 'Kwitansi' },
        { id: 2, periode_id: 2, tanggal: '2026-09-10', nama_peminjam: 'Bu Fatimah', keperluan: 'Keperluan dapur darurat', total_ambil: 75000, total_kembali: 30000, tgl_kembali: null, tanda_bukti: 'Catatan' },
        { id: 3, periode_id: 2, tanggal: '2026-10-25', nama_peminjam: 'Pak Sulaiman', keperluan: 'Perbaikan pipa air kamar mandi', total_ambil: 100000, total_kembali: 0, tgl_kembali: null, tanda_bukti: 'Nota' }
    ]
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
        if (angka && angka >= 10 && angka <= 12) return 300 + angka;
        if (angka && angka >= 1 && angka <= 3) return 300 + (angka + 9); // 1 SMA -> 10
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
            return data;
        }

        try {
            data = JSON.parse(raw);
            if (!data || !Array.isArray(data.users) || !Array.isArray(data.periode) || !Array.isArray(data.buku_kas) || !Array.isArray(data.pinjaman)) {
                console.warn('[Storage] Struktur data tidak lengkap, mereset ke data awal');
                data = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
                this.saveLocalOnly(data);
                return data;
            }
        } catch (e) {
            console.error('[Storage] Data rusak, mengembalikan ke data awal:', e);
            data = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
            this.saveLocalOnly(data);
            return data;
        }

        // Migrasi & Validasi
        let needsSave = false;

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

        // Manajemen Santri Per-Periode (santri_list tersimpan mandiri di tiap periode)
        if (!Array.isArray(data.periode) || data.periode.length === 0) {
            data.periode = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA.periode));
            needsSave = true;
        }

        const fallbackSantri = (Array.isArray(data.master_santri) && data.master_santri.length > 0)
            ? data.master_santri
            : DEFAULT_SANTRI_TEMPLATE;

        data.periode.forEach(p => {
            if (!Array.isArray(p.santri_list) || p.santri_list.length === 0) {
                p.santri_list = JSON.parse(JSON.stringify(fallbackSantri));
                needsSave = true;
            }
        });

        if (!Array.isArray(data.master_santri) || data.master_santri.length === 0) {
            data.master_santri = JSON.parse(JSON.stringify(fallbackSantri));
            needsSave = true;
        }

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
     * Memastikan state lokal tersimpan rapi dan langsung diflush ke Firebase Cloud seketika
     */
    autoSaveSync() {
        try {
            const db = this.getData();
            this.saveLocalOnly(db);
            if (typeof FirebaseSync !== 'undefined' && FirebaseSync.hasValidConfig() && FirebaseSync.pushToCloud) {
                FirebaseSync.pushToCloud(db, true);
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
        this.notifySubscribers(data);
    },

    /**
     * Simpan data: simpan ke lokal dan otomatis sinkronkan ke Firebase Cloud Realtime
     */
    saveData(data) {
        this.saveLocalOnly(data);
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.pushToCloud) {
            FirebaseSync.pushToCloud(data);
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
        const sourceSantri = (sourcePeriode && Array.isArray(sourcePeriode.santri_list) && sourcePeriode.santri_list.length > 0)
            ? sourcePeriode.santri_list
            : (db.master_santri || DEFAULT_SANTRI_TEMPLATE);

        // Salin seluruh daftar santri dari periode aktif sebelumnya ke periode baru
        const copiedSantriList = sourceSantri.map(s => ({
            id: s.id,
            nama_santri: s.nama_santri,
            kamar_kelas: s.kamar_kelas || '',
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
            targetPeriode.santri_list = JSON.parse(JSON.stringify(db.master_santri || DEFAULT_SANTRI_TEMPLATE));
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
        const newId = this.getNextId(db.pinjaman);
        const newRecord = {
            id: newId,
            periode_id: parseInt(periode_id),
            tanggal: tanggal || new Date().toISOString().split('T')[0],
            nama_peminjam: nama_peminjam || '',
            keperluan: keperluan || '',
            total_ambil: parseFloat(total_ambil) || 0,
            total_kembali: 0,
            tgl_kembali: null,
            tanda_bukti: tanda_bukti || '-'
        };
        db.pinjaman.push(newRecord);
        this.saveData(db);
        return newRecord;
    },

    cicilPinjaman(id, jumlahBayar, tglKembali) {
        const db = this.getData();
        const item = db.pinjaman.find(p => p.id === parseInt(id));
        if (!item) throw new Error('Pinjaman tidak ditemukan!');

        const bayar = parseFloat(jumlahBayar) || 0;
        item.total_kembali = (parseFloat(item.total_kembali) || 0) + bayar;
        if (item.total_kembali > item.total_ambil) item.total_kembali = item.total_ambil;

        item.tgl_kembali = tglKembali || new Date().toISOString().split('T')[0];
        const isLunas = item.total_kembali >= item.total_ambil;

        this.saveData(db);
        return { item, lunas: isLunas };
    },

    deletePinjaman(id) {
        const db = this.getData();
        const targetId = parseInt(id);
        const item = db.pinjaman.find(p => p.id === targetId);
        if (!item) throw new Error('Pinjaman tidak ditemukan!');
        db.pinjaman = db.pinjaman.filter(p => p.id !== targetId);
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
     * Status Kunci Tampilan (isLocked) — disinkronkan ke Firebase Cloud
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
        this.saveData(DEFAULT_SEED_DATA);
        return DEFAULT_SEED_DATA;
    }
};

// Hubungkan ke listener FirebaseSync jika tersedia
if (typeof FirebaseSync !== 'undefined' && FirebaseSync.onDataChange) {
    FirebaseSync.onDataChange((cloudData) => {
        // Data sudah di-save ke localStorage oleh listener .on('value') di firebase-config.js
        // Di sini cukup periksa apakah status kunci (is_locked) berubah dari cloud
        // dan terapkan ke UI agar semua device sinkron
        if (cloudData && cloudData.settings && typeof Auth !== 'undefined' && Auth.applyUIPermissions) {
            Auth.applyUIPermissions();
        }
    });
}

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
