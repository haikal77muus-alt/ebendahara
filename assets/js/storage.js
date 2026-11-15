/**
 * ============================================================
 * E-Bendahara — storage.js
 * Pengelola Database Lokal (localStorage), Seeder Data Awal,
 * & Fitur Ekspor / Impor Cadangan Data (Backup JSON)
 * ============================================================
 */

const STORAGE_KEY = 'ebendahara_database_v1';

// Seed Data Awal jika localStorage masih kosong
const DEFAULT_SEED_DATA = {
    users: [
        { id: 1, nama: 'Ustadzah Siti Aisyah', username: 'admin', password: 'admin123', role: 'bendahara_utama' },
        { id: 2, nama: 'Hj. Nurul Hidayah',    username: 'bendahara', password: 'bendahara123', role: 'bendahara_utama' },
        { id: 3, nama: 'Ahmad Fauzi',          username: 'sekretaris', password: 'sekretaris123', role: 'sekretaris_kas' },
        { id: 4, nama: 'K.H. Abdullah Gym',    username: 'pembina', password: 'pembina123', role: 'pembina' }
    ],
    periode: [
        { id: 1, nama_periode: 'Tahun Ajaran 2025/2026', tipe_bulan: 'juli_juni', is_active: 0 },
        { id: 2, nama_periode: 'Tahun Ajaran 2026/2027', tipe_bulan: 'juli_juni', is_active: 1 },
        { id: 3, nama_periode: 'Tahun 2025', tipe_bulan: 'januari_desember', is_active: 0 }
    ],
    master_santri: [
        { id: 1,  nama_santri: 'Abdullah Faqih',  kamar_kelas: 'Kamar Ali 01',    is_active: 1, urutan: 1 },
        { id: 2,  nama_santri: 'Muhammad Rizki',  kamar_kelas: 'Kamar Ali 02',    is_active: 1, urutan: 2 },
        { id: 3,  nama_santri: 'Ahmad Zainuddin', kamar_kelas: 'Kamar Umar 01',   is_active: 1, urutan: 3 },
        { id: 4,  nama_santri: 'Hasan Al-Bashri', kamar_kelas: 'Kamar Umar 02',   is_active: 1, urutan: 4 },
        { id: 5,  nama_santri: 'Umar Faruq',      kamar_kelas: 'Kamar Utsman 01', is_active: 1, urutan: 5 },
        { id: 6,  nama_santri: 'Ali Mustofa',     kamar_kelas: 'Kamar Utsman 02', is_active: 1, urutan: 6 },
        { id: 7,  nama_santri: 'Bilal Ibrahim',   kamar_kelas: 'Kamar Abu Bakar', is_active: 1, urutan: 7 },
        { id: 8,  nama_santri: 'Yusuf Hakim',     kamar_kelas: 'Kamar Abu Bakar', is_active: 1, urutan: 8 },
        { id: 9,  nama_santri: 'Hamzah Ridwan',   kamar_kelas: 'Kamar Zubair 01', is_active: 1, urutan: 9 },
        { id: 10, nama_santri: 'Khalid Walid',    kamar_kelas: 'Kamar Zubair 02', is_active: 1, urutan: 10 }
    ],
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

const Storage = {
    /**
     * Inisialisasi Database: Muat data dari localStorage atau pasang default seed data
     */
    init() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            this.saveData(DEFAULT_SEED_DATA);
            return DEFAULT_SEED_DATA;
        }
        try {
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.users) || !Array.isArray(data.periode) || !Array.isArray(data.master_santri) || !Array.isArray(data.buku_kas) || !Array.isArray(data.pinjaman)) {
                console.warn('Struktur data localStorage tidak lengkap, mereset ke data awal');
                this.saveData(DEFAULT_SEED_DATA);
                return DEFAULT_SEED_DATA;
            }
            return data;
        } catch (e) {
            console.error('Data rusak, mengembalikan ke data awal:', e);
            this.saveData(DEFAULT_SEED_DATA);
            return DEFAULT_SEED_DATA;
        }
    },

    getData() {
        return this.init();
    },

    saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
        
        // Nonaktifkan yang lain
        db.periode.forEach(p => p.is_active = 0);

        const newPeriode = {
            id: newId,
            nama_periode,
            tipe_bulan: tipe_bulan || 'juli_juni',
            is_active: 1
        };
        db.periode.push(newPeriode);

        // Jika opsi bawa saldo dicentang
        if (bawa_saldo && dari_periode_id) {
            const bkLama = db.buku_kas.filter(b => b.periode_id === parseInt(dari_periode_id));
            const saldoAkhir = bkLama.reduce((s, r) => s + (parseFloat(r.debit) || 0) - (parseFloat(r.kredit) || 0), 0);
            
            if (saldoAkhir > 0) {
                const newBkId = this.getNextId(db.buku_kas);
                const today = new Date().toISOString().split('T')[0];
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
    // MASTER DATA SANTRI (PERMANEN LINTAS TAHUN AJARAN)
    // ========================================================
    getAllSantri() {
        const db = this.getData();
        return (db.master_santri || []).sort((a, b) => b.is_active - a.is_active || (a.urutan || 0) - (b.urutan || 0) || a.id - b.id);
    },

    getActiveSantri() {
        return this.getAllSantri().filter(s => s.is_active === 1);
    },

    addSantri({ nama_santri, kamar_kelas }) {
        const db = this.getData();
        const newId = this.getNextId(db.master_santri);
        const maxUrutan = db.master_santri.reduce((max, s) => Math.max(max, s.urutan || 0), 0);
        
        const newSantri = {
            id: newId,
            nama_santri,
            kamar_kelas: kamar_kelas || '',
            is_active: 1,
            urutan: maxUrutan + 1
        };
        db.master_santri.push(newSantri);
        this.saveData(db);
        return newSantri;
    },

    toggleSantriStatus(id, isActive) {
        const db = this.getData();
        const santri = db.master_santri.find(s => s.id === parseInt(id));
        if (!santri) throw new Error('Santri tidak ditemukan!');
        santri.is_active = (isActive ? 1 : 0);
        this.saveData(db);
        return santri;
    },

    deleteSantri(id) {
        const db = this.getData();
        const targetId = parseInt(id);
        const target = db.master_santri.find(s => s.id === targetId);
        if (!target) throw new Error('Santri tidak ditemukan!');

        db.master_santri = db.master_santri.filter(s => s.id !== targetId);
        db.matriks_kas_bulanan = (db.matriks_kas_bulanan || []).filter(m => m.santri_id !== targetId);
        this.saveData(db);
        return target;
    },

    // ========================================================
    // MATRIKS KAS BULANAN
    // ========================================================
    getMatriksByPeriode(periodeId) {
        const db = this.getData();
        const pid = parseInt(periodeId);
        const activeSantri = this.getActiveSantri();
        const periode = db.periode.find(p => p.id === pid) || { tipe_bulan: 'juli_juni' };
        const records = (db.matriks_kas_bulanan || []).filter(m => m.periode_id === pid);

        // Format data: daftar santri aktif dengan map status bulan { 1: '...', ..., 12: '...' }
        const result = activeSantri.map(s => {
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
            if (!parsed.users || !parsed.periode || !parsed.master_santri || !parsed.buku_kas || !parsed.pinjaman) {
                throw new Error('Format file backup tidak valid atau tidak lengkap!');
            }
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

// Pastikan storage diinisialisasi saat skrip dimuat
Storage.init();

