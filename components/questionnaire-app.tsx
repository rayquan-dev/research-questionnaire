'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardList, Lock, LoaderCircle, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'

type Role = 'sales' | 'product' | 'security'
type AnswerValue = string | string[] | Record<string, string>
type AnswerMap = Record<string, AnswerValue>

type BaseQuestion = {
  id: string
  text: string
  helper?: string
  showIf?: (answers: AnswerMap) => boolean
  optional?: boolean
}
type ScaleQuestion = BaseQuestion & { type: 'scale' }
type SingleQuestion = BaseQuestion & { type: 'single'; options: string[] }
type MultiQuestion = BaseQuestion & { type: 'multi'; options: string[] }
type RankQuestion = BaseQuestion & { type: 'rank'; options: string[] }
type TextQuestion = BaseQuestion & { type: 'text' }
type Question = ScaleQuestion | SingleQuestion | MultiQuestion | RankQuestion | TextQuestion

type Section = { id: string; title: string; questions: Question[] }

const roles: { id: Role; title: string; eyebrow: string; description: string; icon: typeof ClipboardList }[] = [
  { id: 'sales', title: 'Account Manager / Sales', eyebrow: 'Komersial', description: 'Memahami proses discovery, nilai bisnis, dan faktor yang mendorong keputusan pembelian.', icon: ClipboardList },
  { id: 'product', title: 'Product Lead', eyebrow: 'Produk', description: 'Mengukur relevansi solusi, diferensiasi produk, serta dukungan produk terhadap proses pre-sales.', icon: ShieldCheck },
  { id: 'security', title: 'Security Engineer', eyebrow: 'Teknis', description: 'Menggali kualitas validasi teknis, integrasi, compliance, dan kepercayaan terhadap solusi.', icon: LockKeyhole },
]

const scale = [
  { value: '1', label: 'Sangat tidak setuju' },
  { value: '2', label: 'Tidak setuju' },
  { value: '3', label: 'Netral' },
  { value: '4', label: 'Setuju' },
  { value: '5', label: 'Sangat setuju' },
]

const salesSections: Section[] = [
  {
    id: 'a1',
    title: 'Latar Belakang Responden',
    questions: [
      {
        id: 's_q1', type: 'single', text: 'Berapa lama Bapak/Ibu berkecimpung di bidang penjualan solusi IT Security / divisi ini?',
        options: ['Kurang dari 1 tahun', '1 – 3 tahun', '3 – 5 tahun', '5 – 10 tahun', 'Lebih dari 10 tahun'],
      },
      {
        id: 's_q2', type: 'single', text: 'Dalam satu bulan terakhir, berapa rata-rata calon klien baru yang Bapak/Ibu approach (hubungi/ajak bicara) secara aktif?',
        options: ['0 – 2 klien', '3 – 5 klien', '6 – 10 klien', '> 10 klien'],
      },
      {
        id: 's_q3', type: 'rank', text: 'Dari semua peluang yang masuk, sumber mana yang paling dominan menghasilkan prospek berkualitas?',
        helper: 'Urutkan dari yang paling dominan (1) hingga paling kecil (4).',
        options: ['Inbound (klien menghubungi langsung)', 'Referral dari klien lama/rekanan', 'Prospecting aktif (cold call/email/LinkedIn)', 'Upsell/cross-sell ke klien eksisting'],
      },
    ],
  },
  {
    id: 'a2',
    title: 'Initial Meeting & Kualifikasi',
    questions: [
      {
        id: 's_q4', type: 'multi', text: 'Sebelum initial meeting, informasi apa SAJA yang biasanya sudah Bapak/Ibu kumpulkan?',
        helper: 'Silakan centang semua yang sesuai.',
        options: ['Nama dan jabatan decision maker', 'Perkiraan anggaran (budget range)', 'Infrastruktur TI yang sedang dipakai saat ini', 'Pernah atau tidak mengalami insiden keamanan sebelumnya', 'Regulasi/kompliansi yang wajib dipenuhi (misal: PCI-DSS, ISO 27001)', 'Jumlah karyawan / skala perusahaan', 'Timeline atau deadline proyek'],
      },
      {
        id: 's_q5', type: 'text', text: 'Bagaimana cara Bapak/Ibu menilai apakah calon klien ini benar-benar punya kebutuhan (urgent), atau baru sekadar ingin tahu (explorasi)? Kriteria atau "red flag" apa yang paling Bapak/Ibu andalkan untuk membedakan keduanya?',
        helper: 'Jawab dalam bentuk paragraf singkat.',
      },
      {
        id: 's_q6', type: 'single', text: 'Apakah di tim/divisi Bapak/Ibu memiliki checklist atau kriteria baku sebelum memutuskan lanjut ke tahap demo?',
        options: ['Ya, selalu ada dan diikuti ketat', 'Ada, tapi fleksibel tergantung kasus', 'Tidak ada, keputusan berdasarkan intuisi/diskusi tim'],
      },
      {
        id: 's_q7', type: 'multi', text: 'Dalam initial meeting, siapa SAJA dari pihak klien yang biasanya hadir?',
        helper: 'Centang semua yang sesuai.',
        options: ['User / Tim Teknis (IT operations)', 'Manajer/Level koordinator', 'Direktur / C-level / Pemilik anggaran', 'Tim Pengadaan (Procurement)'],
      },
      {
        id: 's_q8', type: 'single', text: 'Seberapa sering kebutuhan yang kita perkirakan (di awal) ternyata BERBEDA dengan kebutuhan riil klien saat meeting/demo berlangsung?',
        options: ['Sangat sering (> 50% kasus)', 'Cukup sering (30–50%)', 'Kadang-kadang (10–30%)', 'Jarang (< 10%)', 'Hampir tidak pernah'],
      },
      {
        id: 's_q9', type: 'text', text: 'Jika pernah mengalami perbedaan kebutuhan (pada nomor sebelumnya), mohon ceritakan satu contoh konkret kejadian tersebut. Apa yang menjadi asumsi awal Bapak/Ibu, dan bagaimana fakta riil di lapangan?',
        helper: 'Jawab dalam bentuk paragraf.',
        showIf: (answers) => answers['s_q8'] === 'Sangat sering (> 50% kasus)' || answers['s_q8'] === 'Cukup sering (30–50%)',
      },
      {
        id: 's_q10', type: 'single', text: 'Menurut Bapak/Ibu, apa penyebab PALING UMUM yang membuat peluang berhenti di tahap awal (sebelum demo)?',
        options: ['Tidak ada budget/anggaran', 'Bukan decision maker yang kami ajak bicara', 'Tidak ada rasa urgensi (hanya explorasi)', 'Produk kami tidak sesuai dengan tech stack mereka', 'Kompetitor sudah lebih dulu masuk'],
      },
    ],
  },
  {
    id: 'a3',
    title: 'Demo & PoC',
    questions: [
      {
        id: 's_q11', type: 'text', text: 'Setelah demo selesai, faktor-faktor apa sajakah yang paling kritis menurut Bapak/Ibu dalam menentukan apakah klien mau lanjut ke PoC (Proof of Concept) atau tidak? Ceritakan bagaimana Bapak/Ibu membaca "sinyal hijau" dari klien di momen ini.',
        helper: 'Jawab dalam bentuk paragraf.',
      },
      {
        id: 's_q12', type: 'single', text: 'Bagaimana tingkat keterlibatan Bapak/Ibu selama PoC berlangsung?',
        options: ['Sangat intensif (hampir setiap hari komunikasi)', 'Cukup intensif (2–3 kali seminggu)', 'Sesekali (mingguan)', 'Hanya di awal dan akhir PoC saja'],
      },
      {
        id: 's_q13', type: 'single', text: 'Pernahkah mengalami PoC yang secara teknis berjalan mulus/sukses, tetapi pada akhirnya TIDAK jadi deal?',
        options: ['Ya, sering terjadi', 'Ya, pernah beberapa kali', 'Jarang', 'Tidak pernah'],
      },
      {
        id: 's_q14', type: 'single', text: 'Jika pernah, apa penyebab utamanya?',
        helper: 'Pilih salah satu yang paling sering.',
        options: ['Harga tidak kompetitif / over budget', 'Proses internal klien berubah (misal: hiring freeze, moratorium proyek)', 'Ada vendor lain yang menawarkan harga lebih murah meskipun fitur kurang', 'Klien tidak mendapat approval dari manajemen puncak', 'Lainnya'],
        showIf: (answers) => answers['s_q13'] !== 'Tidak pernah',
      },
    ],
  },
  {
    id: 'a4',
    title: 'Negosiasi & Keputusan Klien',
    questions: [
      {
        id: 's_q15', type: 'single', text: 'Setelah PoC selesai, siapa yang biasanya mengambil keputusan FINAL di sisi klien?',
        options: ['Tim Teknis (mereka yang menjalankan PoC)', 'Manajer IT / CIO', 'Direktur Utama / CEO (untuk UKM)', 'Komite / tim khusus (pembelian bersama)'],
      },
      {
        id: 's_q16', type: 'single', text: 'Seberapa sering harga menjadi alasan UTAMA deal batal di tahap negosiasi, dibandingkan alasan teknis/non-teknis lainnya?',
        options: ['Sangat sering (> 70%)', 'Sering (40–70%)', 'Kadang-kadang (20–40%)', 'Jarang (< 20%)'],
      },
      {
        id: 's_q17', type: 'single', text: 'Menurut pengalaman, tipe klien mana yang biasanya memiliki siklus keputusan PALING CEPAT?',
        options: ['Klien yang baru saja terkena insiden keamanan (ransomware/data breach)', 'Klien yang sedang dalam proses audit/kompliansi', 'Klien startup/teknologi dengan struktur flat', 'Klien BUMN/korporasi besar dengan proses panjang', 'Klien eksisting yang membeli produk tambahan'],
      },
    ],
  },
  {
    id: 'a5',
    title: 'Klien Eksisting vs Klien Baru',
    questions: [
      {
        id: 's_q18', type: 'text', text: 'Menurut pengalaman Bapak/Ibu, apa perbedaan paling mendasar dan terasa dalam pendekatan, strategi komunikasi, serta proses negosiasi antara menjual ke klien lama (eksisting) dibandingkan klien baru? Jelaskan secara spesifik.',
        helper: 'Jawab dalam bentuk paragraf.',
      },
      {
        id: 's_q19', type: 'multi', text: 'Untuk klien lama (eksisting), tahapan mana yang biasanya bisa DILEWATI atau dipersingkat?',
        helper: 'Centang semua yang sesuai.',
        options: ['Initial meeting / pengenalan ulang', 'Demo produk (karena sudah pernah lihat)', 'PoC / uji coba teknis (jika pembelian produk serupa)', 'Negosiasi harga (karena sudah ada kontrak kerangka)', 'Semua tahap tetap sama, tidak ada yang dilewati'],
      },
    ],
  },
  {
    id: 'a6',
    title: 'Persepsi Nilai Produk Keamanan',
    questions: [
      {
        id: 's_q20', type: 'single', text: 'Bagaimana biasanya klien memandang produk keamanan siber pada awal interaksi?',
        helper: 'Pilih salah satu yang paling sesuai.',
        options: ['Sebagai kebutuhan mendesak (top priority)', 'Sebagai kebutuhan penting tapi bisa ditunda (nice to have)', 'Sebagai pelengkap saja, setelah infrastruktur utama selesai', 'Sebagai biaya operasional (cost center) yang harus ditekan'],
      },
      {
        id: 's_q21', type: 'single', text: 'Apakah Bapak/Ibu pernah mengalami klien yang berubah sikap (dari ragu-ragu menjadi sangat serius) setelah mengalami insiden keamanan?',
        options: ['Ya, sering', 'Ya, pernah (1-2 kali)', 'Belum pernah'],
      },
      {
        id: 's_q22', type: 'text', text: 'Karena produk keamanan siber sering kali manfaatnya baru terasa ketika "tidak terjadi apa-apa" (tidak ada serangan/insiden), bagaimana cara paling efektif menurut Bapak/Ibu untuk menjelaskan nilai (value proposition) produk ini kepada klien agar mereka mau mengalokasikan anggaran? Ceritakan pendekatan atau analogi yang paling ampuh.',
        helper: 'Jawab dalam bentuk paragraf.',
      },
    ],
  },
  {
    id: 'a7',
    title: 'Kolaborasi dengan Engineer',
    questions: [
      {
        id: 's_q23', type: 'single', text: 'Menurut Bapak/Ibu, kapan waktu yang PALING TEPAT untuk melibatkan engineer (solutions architect / technical presales) dalam sebuah peluang?',
        options: ['Sebelum initial meeting (untuk persiapan teknis)', 'Saat initial meeting berlangsung', 'Setelah ada ketertarikan dari klien (pasca initial meeting)', 'Baru saat tahap PoC dimulai'],
      },
      {
        id: 's_q24', type: 'single', text: 'Pernahkah keterlibatan engineer terjadi terlalu cepat atau terlalu lambat?',
        options: ['Ya, terlalu cepat (membuang sumber daya)', 'Ya, terlalu lambat (klien kehilangan minat karena pertanyaan teknis tidak terjawab)', 'Ya, keduanya pernah terjadi', 'Tidak pernah, timing kami selalu tepat'],
      },
      {
        id: 's_q25', type: 'single', text: 'Jika pernah terjadi keterlibatan yang terlalu lambat, dampak apa yang paling sering dirasakan?',
        helper: 'Pilih satu.',
        options: ['Klien menganggap kami kurang kompeten secara teknis', 'Klien beralih ke kompetitor yang lebih cepat memberi solusi teknis', 'Proses jadi molor dan kehilangan momentum urgency', 'Lainnya'],
        showIf: (answers) => answers['s_q24'] === 'Ya, terlalu lambat (klien kehilangan minat karena pertanyaan teknis tidak terjawab)' || answers['s_q24'] === 'Ya, keduanya pernah terjadi',
      },
    ],
  },
]

const productSections: Section[] = [
  {
    id: 'b1',
    title: 'Latar Belakang dan Peran',
    questions: [
      {
        id: 'pl_q1', type: 'text', text: 'Mohon jelaskan cakupan tanggung jawab Bapak/Ibu sebagai Product Lead di divisi ini. Apa saja wewenang dan batasan peran Bapak/Ibu dalam menentukan arah produk?',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'pl_q2', type: 'text', text: 'Bagaimana proses pengambilan keputusan untuk menambah produk baru ke dalam portofolio, atau mengganti produk lama? Faktor-faktor apa saja yang paling dipertimbangkan (misal: permintaan pasar, margin, kompleksitas teknis, dukungan principal)?',
        helper: 'Jawab dalam paragraf.',
      },
    ],
  },
  {
    id: 'b2',
    title: 'Portofolio dan Positioning',
    questions: [
      {
        id: 'pl_q3', type: 'text', text: 'Dari produk utama yang kita bawa saat ini, menurut Bapak/Ibu produk mana yang paling mudah dijual, dan produk mana yang paling sulit dijual? Tolong jelaskan secara spesifik apa yang menyebabkan perbedaan tersebut (dari sisi value proposition, kompetitor, atau kebutuhan pasar).',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'pl_q4', type: 'text', text: 'Ketika ada produk dalam portofolio yang harganya kurang kompetitif di pasar, bagaimana proses Bapak/Ibu mencari alternatif atau menyiasatinya? Apakah lebih mengarah ke negosiasi ulang dengan principal, mencari produk substitusi, atau mengubah strategi bundling?',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'pl_q5', type: 'text', text: 'Bagaimana Bapak/Ibu memastikan bahwa produk-produk dalam portofolio kita saling melengkapi (complementary) dan tidak saling bersaing (kanibalisme) satu sama lain di mata klien? Adakah contoh kasus di mana tumpang tindih fitur sempat terjadi, dan bagaimana menyelesaikannya?',
        helper: 'Jawab dalam paragraf.',
      },
    ],
  },
  {
    id: 'b3',
    title: 'Pandangan atas Proses Pre-Sales',
    questions: [
      {
        id: 'pl_q6', type: 'single', text: 'Berdasarkan pengalaman Bapak/Ibu dalam setahun terakhir, di tahap manakah peluang penjualan PALING SERING berhenti (drop-out) dalam pipeline?',
        options: ['Sebelum initial meeting / tahap kualifikasi awal', 'Setelah demo, sebelum PoC dimulai', 'Saat PoC berlangsung', 'Setelah PoC selesai, pada tahap negosiasi harga/kontrak', 'Lainnya'],
      },
      {
        id: 'pl_q7', type: 'text', text: 'Menurut Bapak/Ibu, apa penyebab UTAMA dari tingginya drop-out pada tahap yang disebut sebelumnya? Apakah lebih disebabkan oleh faktor internal kita (misal: sumber daya, kemampuan teknis), faktor klien (misal: budget, urgensi), atau faktor produk (misal: fitur, stabilitas)? Jelaskan secara seimbang.',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'pl_q8', type: 'single', text: 'Apakah saat ini terdapat standar operasional prosedur (SOP) atau panduan tertulis yang mengatur tahapan pre-sales (mulai dari kualifikasi hingga PoC) untuk diikuti oleh tim sales dan engineer?',
        options: ['Ya, ada dokumen formal yang mengikat', 'Ada, tapi hanya sebatas panduan informal (tidak baku)', 'Belum ada sama sekali, setiap peluang berjalan secara situasional'],
      },
      {
        id: 'pl_q8_doc', type: 'text', text: 'Jika menjawab "Ya" atau "Ada", silakan sebutkan secara singkat nama dokumen/pedoman tersebut.',
        helper: 'Opsional.',
        optional: true,
        showIf: (answers) => answers['pl_q8'] === 'Ya, ada dokumen formal yang mengikat' || answers['pl_q8'] === 'Ada, tapi hanya sebatas panduan informal (tidak baku)',
      },
    ],
  },
  {
    id: 'b4',
    title: 'Proof of Concept (PoC)',
    questions: [
      {
        id: 'pl_q9', type: 'text', text: 'Bagaimana keputusan untuk menerima atau menolak permintaan PoC dari klien biasanya diambil di tim Bapak/Ibu? Apa saja parameter baku yang menjadi "syarat minimum" agar sebuah permintaan PoC disetujui (misal: anggaran, jumlah pengguna, kesesuaian arsitektur)?',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'pl_q10', type: 'single', text: 'Rata-rata, berapa besar sumber daya (waktu dan tenaga engineer) yang biasanya dihabiskan untuk satu kali pelaksanaan PoC dari awal hingga laporan akhir?',
        options: ['Kurang dari 5 hari kerja (setara 1 minggu)', '5 – 10 hari kerja (1 – 2 minggu)', '15 – 20 hari kerja (3 – 4 minggu)', 'Lebih dari 1 bulan'],
      },
      {
        id: 'pl_q11', type: 'text', text: 'Menurut pandangan Bapak/Ibu, elemen-elemen apa sajakah yang secara paling kuat membuat sebuah PoC berhasil meyakinkan klien untuk membeli? Apakah lebih ke performa teknis (misal: deteksi 100%), kemudahan implementasi, atau faktor pendekatan komunikasi selama PoC berlangsung?',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'pl_q12', type: 'single', text: 'Kriteria keberhasilan (success criteria) sebuah PoC biasanya disusun oleh siapa?',
        options: ['Sepenuhnya disusun oleh tim internal kita (vendor)', 'Sepenuhnya disusun oleh klien', 'Disusun secara bersama-sama (kolaborasi)'],
      },
      {
        id: 'pl_q13', type: 'text', text: 'Dari pengalaman Bapak/Ibu, metode penyusunan kriteria sukses PoC mana yang paling efektif (dari pilihan sebelumnya), dan mengapa? Ceritakan satu contoh ketika cara tersebut berhasil mencegah kesalahpahaman di akhir.',
        helper: 'Jawab dalam paragraf.',
      },
    ],
  },
  {
    id: 'b5',
    title: 'Kapabilitas Tim',
    questions: [
      {
        id: 'pl_q14', type: 'text', text: 'Menurut Bapak/Ibu, kapabilitas teknis atau non-teknis apa yang saat ini paling perlu diperkuat dari tim engineer (solutions architect / technical presales) untuk meningkatkan konversi di tahap pre-sales? Berikan alasan yang mendasari.',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'pl_q15', type: 'text', text: 'Bagaimana kondisi lab environment atau demo environment yang kita miliki saat ini (misal: ketersediaan perangkat keras, lisensi uji coba, akses cloud)? Seberapa besar pengaruh kondisi tersebut terhadap kelancaran dan kredibilitas proses pre-sales di mata klien?',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'pl_q16', type: 'text', text: 'Ketika menghadapi kendala teknis yang berat (misal: bug kritis, incompatibility dengan lingkungan klien), bagaimana pola dukungan yang biasanya datang dari distributor dan principal (vendor asli produk)? Seberapa responsif mereka, dan apakah itu menjadi pembatas dalam pemenuhan permintaan klien?',
        helper: 'Jawab dalam paragraf.',
      },
    ],
  },
  {
    id: 'b6',
    title: 'Arah ke Depan',
    questions: [
      {
        id: 'pl_q17', type: 'single', text: 'Apakah saat ini tim/divisi memiliki rencana untuk mengembangkan model layanan berlangganan (subscription-based) atau managed security service di luar model jual produk lisensi sekali beli?',
        options: ['Ya, sudah dalam tahap perencanaan / uji coba', 'Sudah berjalan untuk beberapa produk', 'Belum ada rencana dalam waktu dekat', 'Tidak, tetap fokus ke produk on-premise'],
      },
      {
        id: 'pl_q18', type: 'text', text: 'Apa hambatan utama yang Bapak/Ibu lihat jika ingin mengembangkan model layanan berlangganan atau managed service tersebut (misal: dari sisi regulasi, kompetensi SDM, perubahan mindset sales, atau keberatan dari principal)? Jelaskan tantangan yang paling kritis.',
        helper: 'Jawab dalam paragraf.',
      },
    ],
  },
]

const securitySections: Section[] = [
  {
    id: 'c1',
    title: 'Peran dalam Proses Pre-Sales',
    questions: [
      {
        id: 'se_q1', type: 'multi', text: 'Pada tahap apa SAJA Bapak/Ibu biasanya terlibat dalam sebuah peluang penjualan?',
        helper: 'Centang semua yang sesuai.',
        options: ['Sebelum initial meeting (misal: membantu riset teknis awal)', 'Saat initial meeting berlangsung (dampingi sales)', 'Persiapan materi demo (membangun environment / skenario)', 'Pelaksanaan demo produk di hadapan klien', 'Persiapan PoC (instalasi, konfigurasi awal)', 'Pelaksanaan PoC di lingkungan klien', 'Pasca-PoC (pembuatan laporan teknis, presentasi hasil)', 'Lainnya'],
      },
      {
        id: 'se_q2a', type: 'multi', text: 'Informasi apa SAJA yang biasanya sudah Bapak/Ibu terima dari tim sales sebelum masuk ke sebuah peluang?',
        helper: 'Centang semua yang sesuai.',
        options: ['Nama perusahaan dan industri klien', 'Kebutuhan teknis yang sudah diidentifikasi sales', 'Topologi / arsitektur infrastruktur TI klien saat ini', 'Jumlah pengguna / skala deployasi', 'Anggaran yang dialokasikan (jika diketahui)', 'Timeline atau deadline yang diharapkan klien', 'Nama dan jabatan kontak teknis di sisi klien', 'Lainnya'],
      },
      {
        id: 'se_q2b', type: 'single', text: 'Menurut Bapak/Ibu, apakah informasi yang diberikan oleh sales tersebut sudah cukup untuk memulai pekerjaan teknis (demo/PoC)?',
        options: ['Ya, selalu cukup lengkap', 'Cukup, tapi sering kali saya masih perlu mencari tambahan sendiri', 'Kurang, saya sering harus meminta ulang atau mengejar sales untuk informasi dasar'],
      },
      {
        id: 'se_q2c', type: 'text', text: 'Jika informasi dari sales dirasa kurang, informasi teknis apa yang PALING SERING hilang atau tidak tersampaikan, dan bagaimana dampaknya terhadap persiapan teknis Anda?',
        helper: 'Jawab dalam paragraf.',
        showIf: (answers) => answers['se_q2b'] !== 'Ya, selalu cukup lengkap',
      },
    ],
  },
  {
    id: 'c2',
    title: 'Demo dan Proof of Concept (PoC)',
    questions: [
      {
        id: 'se_q3', type: 'text', text: 'Bagaimana proses persiapan sebuah demo produk biasanya Bapak/Ibu lakukan? Mulai dari menyiapkan environment, memilih skenario, hingga finalisasi materi. Adakah checklist atau rutinitas baku yang selalu diikuti?',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'se_q4', type: 'text', text: 'Untuk pelaksanaan PoC, langkah-langkah apa SAJA yang biasanya Bapak/Ibu lakukan mulai dari tahap pre-PoC (sebelum instalasi) sampai dengan post-PoC (setelah uji coba selesai)? Jelaskan alur kerjanya secara runtut.',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'se_q5', type: 'text', text: 'Kendala teknis apa yang PALING SERING muncul saat pelaksanaan PoC di lingkungan klien (misal: masalah jaringan, kompatibilitas OS/DB, keterbatasan resource, atau ketersediaan akses dari klien)? Berikan contoh konkret dan bagaimana biasanya Anda menyiasatinya.',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'se_q6a', type: 'single', text: 'Pernahkah Bapak/Ibu mengalami PoC yang secara teknis tidak berhasil membuktikan kemampuan produk sesuai yang dijanjikan?',
        options: ['Ya, sering terjadi', 'Ya, pernah (1–3 kali)', 'Tidak pernah'],
      },
      {
        id: 'se_q6b', type: 'text', text: 'Jika pernah, menurut Bapak/Ibu apa penyebab UTAMA kegagalan tersebut? Apakah lebih karena keterbatasan produk itu sendiri, lingkungan klien yang tidak sesuai, atau faktor persiapan internal kita? Ceritakan salah satu kasus yang paling berkesan.',
        helper: 'Jawab dalam paragraf.',
        showIf: (answers) => answers['se_q6a'] !== 'Tidak pernah',
      },
      {
        id: 'se_q7a', type: 'single', text: 'Bagaimana kriteria keberhasilan (success criteria) sebuah PoC biasanya ditentukan?',
        options: ['Ditentukan sepenuhnya oleh tim internal kita (vendor)', 'Ditentukan sepenuhnya oleh klien', 'Ditentukan secara bersama-sama (kolaborasi)'],
      },
      {
        id: 'se_q7b', type: 'text', text: 'Apakah kriteria keberhasilan tersebut selalu sudah jelas dan disepakati SEJAK AWAL PoC? Jika pernah berubah di tengah jalan, bagaimana dinamikanya dan apa dampaknya terhadap proses pengujian yang sudah berjalan?',
        helper: 'Jawab dalam paragraf.',
      },
    ],
  },
  {
    id: 'c3',
    title: 'Interaksi dengan Klien',
    questions: [
      {
        id: 'se_q8', type: 'multi', text: 'Selama proses demo atau PoC, siapa dari sisi klien yang biasanya menjadi lawan bicara teknis utama Bapak/Ibu?',
        helper: 'Centang semua yang sesuai.',
        options: ['Tim IT Operasional / System Administrator', 'Arsitek Keamanan (Security Architect)', 'Manajer / Kepala Divisi IT', 'CISO / Chief Information Security Officer', 'Tim Jaringan (Network Engineer)', 'Tim Pengembang Aplikasi (DevOps/Developer)', 'Lainnya'],
      },
      {
        id: 'se_q9a', type: 'single', text: 'Apakah Bapak/Ibu pernah mengalami kesenjangan (gap) antara kebutuhan atau keinginan yang disampaikan oleh tim teknis klien, dengan keputusan akhir yang diambil oleh manajemen/pengambil anggaran di sisi klien?',
        options: ['Ya, sering', 'Ya, pernah beberapa kali', 'Jarang', 'Tidak pernah'],
      },
      {
        id: 'se_q9b', type: 'text', text: 'Jika pernah, bagaimana dampak kesenjangan tersebut terhadap proses penjualan? Misalnya apakah memperpanjang siklus, mengubah skope PoC, atau bahkan membatalkan deal? Ceritakan satu contoh nyata.',
        helper: 'Jawab dalam paragraf.',
        showIf: (answers) => answers['se_q9a'] !== 'Tidak pernah',
      },
    ],
  },
  {
    id: 'c4',
    title: 'Dukungan dan Sumber Daya',
    questions: [
      {
        id: 'se_q10', type: 'text', text: 'Bagaimana kondisi kecukupan lab atau demo environment yang saat ini tersedia untuk mendukung kebutuhan pekerjaan pre-sales Anda (misal: ketersediaan server, lisensi trial, akses cloud, topologi simulasi)? Apa kendala paling mengganggu dari sisi environment ini?',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'se_q11', type: 'text', text: 'Ketika Bapak/Ibu menghadapi kendala teknis yang berat (misal: bug, error kritis, atau ketidaksesuaian fitur) selama demo atau PoC, bagaimana kualitas dukungan yang diberikan oleh distributor dan principal (vendor asli produk)? Apakah responsif, dan seberapa besar hal itu membantu atau justru menghambat penyelesaian masalah di hadapan klien?',
        helper: 'Jawab dalam paragraf.',
      },
      {
        id: 'se_q12', type: 'text', text: 'Secara keseluruhan, menurut Bapak/Ibu, apa hal yang PALING MENGHAMBAT dalam menjalankan tahapan teknis pre-sales (baik dari sisi internal, klien, maupun ekosistem vendor)? Jelaskan secara spesifik dan, jika memungkinkan, berikan saran perbaikan singkat.',
        helper: 'Jawab dalam paragraf.',
      },
    ],
  },
]

const pagedSections: Partial<Record<Role, Section[]>> = {
  sales: salesSections,
  product: productSections,
  security: securitySections,
}

function isAnswered(question: Question, answers: AnswerMap): boolean {
  const value = answers[question.id]
  if (question.type === 'multi') {
    if (!Array.isArray(value) || value.length === 0) return false
    if (value.includes('Lainnya')) {
      const other = answers[`${question.id}__other`]
      return typeof other === 'string' && other.trim().length > 0
    }
    return true
  }
  if (question.type === 'rank') {
    if (!value || Array.isArray(value) || typeof value !== 'object') return false
    const picked = question.options.map((option) => value[option]).filter(Boolean)
    return picked.length === question.options.length && new Set(picked).size === question.options.length
  }
  if (typeof value !== 'string' || value.trim().length === 0) return false
  if (question.type === 'single' && value === 'Lainnya') {
    const other = answers[`${question.id}__other`]
    return typeof other === 'string' && other.trim().length > 0
  }
  return true
}

function visibleQuestions(questions: Question[], answers: AnswerMap): Question[] {
  return questions.filter((question) => !question.showIf || question.showIf(answers))
}

function requiredQuestions(questions: Question[], answers: AnswerMap): Question[] {
  return visibleQuestions(questions, answers).filter((question) => !question.optional)
}

export function QuestionnaireApp() {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role | null>(null)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [submitted, setSubmitted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [accessChecked, setAccessChecked] = useState(false)
  const [accessRole, setAccessRole] = useState<Role | null>(null)
  const [accessCode, setAccessCode] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [codeSubmitting, setCodeSubmitting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 80)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem('thesis-access-code')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.code && parsed.role) {
          setAccessCode(parsed.code)
          setAccessRole(parsed.role)
        }
      } catch { /* ignore invalid access code cache */ }
    }
    setAccessChecked(true)
  }, [])

  async function submitCode(event: React.FormEvent) {
    event.preventDefault()
    const code = codeInput.trim().toUpperCase()
    if (!code) return
    setCodeError(null)
    if (!supabase) {
      setCodeError('Supabase belum terkonfigurasi.')
      return
    }
    setCodeSubmitting(true)
    const { data, error } = await supabase.from('access_codes').select('role, used_at').eq('code', code).maybeSingle()
    setCodeSubmitting(false)
    if (error || !data) {
      setCodeError('Kode tidak valid.')
      return
    }
    if (data.used_at) {
      setCodeError('Kode ini sudah digunakan.')
      return
    }
    setAccessCode(code)
    setAccessRole(data.role as Role)
    window.localStorage.setItem('thesis-access-code', JSON.stringify({ code, role: data.role }))
  }

  useEffect(() => {
    const saved = window.localStorage.getItem('thesis-questionnaire-draft')
    if (saved) {
      try {
        const draft = JSON.parse(saved)
        setRole(draft.role ?? null)
        setAnswers(draft.answers ?? {})
        setStep(draft.step ?? 0)
        setSectionIndex(draft.sectionIndex ?? 0)
      } catch { /* ignore invalid draft */ }
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem('thesis-questionnaire-draft', JSON.stringify({ role, answers, step, sectionIndex }))
  }, [hydrated, role, answers, step, sectionIndex])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step, sectionIndex])

  const activeSections = role ? pagedSections[role] : undefined
  const selectedRole = roles.find((item) => item.id === role)

  const currentSection = activeSections ? activeSections[sectionIndex] : undefined
  const currentSectionQuestions = currentSection ? requiredQuestions(currentSection.questions, answers) : []
  const currentSectionRendered = currentSection ? visibleQuestions(currentSection.questions, answers) : []
  const currentSectionAnswered = currentSectionQuestions.filter((question) => isAnswered(question, answers)).length
  const isLastSection = Boolean(activeSections) && sectionIndex === (activeSections?.length ?? 0) - 1

  const pagedTotals = useMemo(() => {
    if (!activeSections) return { total: 0, answered: 0 }
    let total = 0
    let answered = 0
    for (const section of activeSections) {
      const required = requiredQuestions(section.questions, answers)
      total += required.length
      answered += required.filter((question) => isAnswered(question, answers)).length
    }
    return { total, answered }
  }, [activeSections, answers])

  const progress = step === 0
    ? 0
    : step === 1
      ? 18
      : step === 2 && activeSections
        ? Math.round((sectionIndex / activeSections.length) * 78) + 20
        : 100

  function chooseRole(nextRole: Role) {
    if (nextRole !== accessRole) return
    setRole(nextRole)
    setSectionIndex(0)
    setStep(2)
  }

  function updateAnswer(id: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [id]: value }))
  }

  function resetDraft() {
    window.localStorage.removeItem('thesis-questionnaire-draft')
    setStep(0)
    setRole(null)
    setAnswers({})
    setSectionIndex(0)
    setSubmitted(false)
  }

  function lockAccessCode() {
    window.localStorage.removeItem('thesis-access-code')
    setAccessRole(null)
    setAccessCode(null)
    setCodeInput('')
  }

  async function nextSection() {
    if (currentSectionAnswered < currentSectionQuestions.length) return
    if (isLastSection) {
      setSubmitError(null)
      if (!supabase) {
        setSubmitError('Supabase belum terkonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.')
        return
      }
      setSubmitting(true)
      const { error } = await supabase.from('submissions').insert({ role, answers })
      if (error) {
        setSubmitting(false)
        setSubmitError('Gagal mengirim jawaban. Silakan coba lagi.')
        return
      }
      if (accessCode) {
        await supabase.from('access_codes').update({ used_at: new Date().toISOString() }).eq('code', accessCode).is('used_at', null)
      }
      setSubmitting(false)
      window.localStorage.removeItem('thesis-questionnaire-draft')
      window.localStorage.removeItem('thesis-access-code')
      setSubmitted(true)
      return
    }
    setSectionIndex((index) => index + 1)
  }

  function backSection() {
    if (sectionIndex === 0) {
      setStep(1)
      return
    }
    setSectionIndex((index) => index - 1)
  }

  if (submitted) {
    return <SuccessScreen onReset={resetDraft} />
  }

  if (!accessChecked) {
    return <main className="min-h-screen bg-background" />
  }

  if (!accessRole) {
    return (
      <AccessGate
        codeInput={codeInput}
        onCodeInputChange={setCodeInput}
        onSubmit={submitCode}
        error={codeError}
        submitting={codeSubmitting}
      />
    )
  }

  return (
    <main className={`min-h-screen bg-background text-foreground transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
      <header className="animate-fade-in-up mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck aria-hidden="true" /></div>
          <div><p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">Thesis research</p><p className="font-semibold tracking-tight">Kuesioner Pre-Sales</p></div>
        </div>
        <button onClick={() => { resetDraft(); lockAccessCode() }} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><RotateCcw aria-hidden="true" /> Mulai ulang</button>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 lg:px-10"><div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>

      <section key={`${step}-${sectionIndex}`} className="mx-auto flex w-full max-w-6xl animate-fade-in-up flex-col gap-10 px-6 pb-20 pt-12 lg:px-10 lg:pt-20">
        {step === 0 && <Intro onStart={() => setStep(1)} />}
        {step === 1 && <RolePicker selected={role} unlockedRole={accessRole} onSelect={chooseRole} />}
        {step === 2 && currentSection && (
          <SectionStep
            section={currentSection}
            sectionNumber={sectionIndex + 1}
            sectionTotal={activeSections?.length ?? 0}
            questions={currentSectionRendered}
            answers={answers}
            role={selectedRole}
            onChange={updateAnswer}
            answeredCount={currentSectionAnswered}
            requiredCount={currentSectionQuestions.length}
            overallAnswered={pagedTotals.answered}
            overallTotal={pagedTotals.total}
            isLast={isLastSection}
            submitting={submitting}
            submitError={submitError}
            onBack={backSection}
            onNext={nextSection}
          />
        )}
      </section>
    </main>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  return <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"><div className="max-w-3xl"><p className="mb-6 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-accent"><span className="size-2 rounded-full bg-accent" /> Responden profesional B2B</p><h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-6xl lg:text-7xl">Apa yang membuat pre-sales <span className="text-primary">berhasil?</span></h1><p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">Bantu penelitian tentang faktor keberhasilan pre-sales solusi keamanan siber B2B melalui perspektif peran Anda.</p><button onClick={onStart} className="mt-10 inline-flex items-center gap-3 rounded-xl bg-primary px-6 py-4 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">Mulai kuesioner <ArrowRight aria-hidden="true" /></button></div><div className="border-l-2 border-accent pl-6 lg:mb-3"><p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tentang penelitian</p><p className="mt-3 leading-7 text-foreground/80">Jawaban Anda akan digunakan untuk memahami faktor komersial, produk, dan teknis yang memengaruhi keberhasilan proses pre-sales.</p><p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole aria-hidden="true" /> Estimasi pengisian 5–7 menit</p></div></div>
}

function RolePicker({ selected, unlockedRole, onSelect }: { selected: Role | null; unlockedRole: Role | null; onSelect: (role: Role) => void }) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-10">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-accent">01 / Profil responden</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Pilih posisi Anda</h2>
        <p className="mt-4 text-lg leading-7 text-muted-foreground">Kode akses Anda hanya berlaku untuk satu posisi.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((item) => {
          const Icon = item.icon
          const isLocked = unlockedRole !== null && item.id !== unlockedRole
          return (
            <button
              key={item.id}
              onClick={() => !isLocked && onSelect(item.id)}
              disabled={isLocked}
              className={`group flex min-h-64 flex-col justify-between rounded-2xl border p-6 text-left transition-all ${isLocked ? 'cursor-not-allowed border-border bg-muted/40 opacity-50' : 'hover:-translate-y-1 hover:border-primary'} ${selected === item.id ? 'border-accent bg-accent/10' : 'border-border bg-card'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-primary"><Icon aria-hidden="true" /></div>
                {isLocked ? <Lock className="text-muted-foreground" aria-hidden="true" /> : selected === item.id && <CheckCircle2 className="text-accent" aria-hidden="true" />}
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{item.eyebrow}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AccessGate({ codeInput, onCodeInputChange, onSubmit, error, submitting }: {
  codeInput: string
  onCodeInputChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  error: string | null
  submitting: boolean
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none select-none blur-md">
        <main className="min-h-screen">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck aria-hidden="true" /></div>
              <div><p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">Thesis research</p><p className="font-semibold tracking-tight">Kuesioner Pre-Sales</p></div>
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-12 lg:px-10 lg:pt-20">
            <Intro onStart={() => {}} />
          </div>
        </main>
      </div>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent"><LockKeyhole size={28} aria-hidden="true" /></div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">Akses Kuesioner</h2>
          <p className="mt-2 text-sm text-muted-foreground">Masukkan kode akses yang telah diberikan kepada Anda.</p>
          <input
            type="text"
            value={codeInput}
            onChange={(event) => onCodeInputChange(event.target.value)}
            autoFocus
            className="mt-6 w-full rounded-xl border border-border bg-background p-3.5 text-center text-sm font-mono uppercase tracking-widest outline-none transition-colors focus:border-accent"
          />
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting || !codeInput.trim()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
            {submitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            {submitting ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}

function QuestionRenderer({ question, index, answers, onChange }: { question: Question; index: number; answers: AnswerMap; onChange: (id: string, value: AnswerValue) => void }) {
  const value = answers[question.id]

  return (
    <fieldset className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <legend className="sr-only">{question.text}</legend>
      <div className="flex gap-4">
        <span className="font-mono text-sm text-accent">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex-1">
          <p className="font-medium leading-7">{question.text}</p>
          {question.helper && <p className="mt-1 text-sm text-muted-foreground">{question.helper}</p>}

          {question.type === 'scale' && (
            <div className="mt-5 grid grid-cols-5 gap-2">
              {scale.map((option) => (
                <label key={option.value} className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-2.5 text-center transition-colors ${value === option.value ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted'}`}>
                  <input className="sr-only" type="radio" name={question.id} value={option.value} checked={value === option.value} onChange={(event) => onChange(question.id, event.target.value)} />
                  <span className="font-mono text-lg font-semibold">{option.value}</span>
                  <span className="hidden text-[10px] leading-3 text-muted-foreground sm:block">{option.label}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'single' && (
            <div className="mt-5 flex flex-col gap-2.5">
              {question.options.map((option) => (
                <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm leading-6 transition-colors ${value === option ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted'}`}>
                  <input className="sr-only" type="radio" name={question.id} value={option} checked={value === option} onChange={(event) => onChange(question.id, event.target.value)} />
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${value === option ? 'border-accent bg-accent' : 'border-border'}`}>{value === option && <span className="size-1.5 rounded-full bg-accent-foreground" />}</span>
                  {option}
                </label>
              ))}
              {value === 'Lainnya' && (
                <input
                  type="text"
                  className="w-full rounded-xl border border-border bg-background p-3.5 text-sm outline-none transition-colors focus:border-accent"
                  placeholder="Sebutkan..."
                  value={typeof answers[`${question.id}__other`] === 'string' ? (answers[`${question.id}__other`] as string) : ''}
                  onChange={(event) => onChange(`${question.id}__other`, event.target.value)}
                />
              )}
            </div>
          )}

          {question.type === 'multi' && (
            <div className="mt-5 flex flex-col gap-2.5">
              {question.options.map((option) => {
                const selected = Array.isArray(value) && value.includes(option)
                return (
                  <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm leading-6 transition-colors ${selected ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted'}`}>
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        const current = Array.isArray(value) ? value : []
                        const next = selected ? current.filter((item) => item !== option) : [...current, option]
                        onChange(question.id, next)
                      }}
                    />
                    <span className={`flex size-4 shrink-0 items-center justify-center rounded-[5px] border ${selected ? 'border-accent bg-accent' : 'border-border'}`}>{selected && <Check size={12} className="text-accent-foreground" aria-hidden="true" />}</span>
                    {option}
                  </label>
                )
              })}
              {Array.isArray(value) && value.includes('Lainnya') && (
                <input
                  type="text"
                  className="w-full rounded-xl border border-border bg-background p-3.5 text-sm outline-none transition-colors focus:border-accent"
                  placeholder="Sebutkan..."
                  value={typeof answers[`${question.id}__other`] === 'string' ? (answers[`${question.id}__other`] as string) : ''}
                  onChange={(event) => onChange(`${question.id}__other`, event.target.value)}
                />
              )}
            </div>
          )}

          {question.type === 'rank' && (
            <RankInput question={question} value={typeof value === 'object' && !Array.isArray(value) ? value : {}} onChange={(next) => onChange(question.id, next)} />
          )}

          {question.type === 'text' && (
            <textarea
              className="mt-5 w-full rounded-xl border border-border bg-background p-4 text-sm leading-6 outline-none transition-colors focus:border-accent"
              rows={4}
              placeholder="Tulis jawaban Anda di sini..."
              value={typeof value === 'string' ? value : ''}
              onChange={(event) => onChange(question.id, event.target.value)}
            />
          )}
        </div>
      </div>
    </fieldset>
  )
}

function RankInput({ question, value, onChange }: { question: RankQuestion; value: Record<string, string>; onChange: (value: Record<string, string>) => void }) {
  const ranks = question.options.map((_, i) => String(i + 1))
  const usedRanks = Object.values(value)

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <p className="text-xs text-muted-foreground">Pilih peringkat untuk setiap opsi. Setiap peringkat hanya boleh dipakai sekali.</p>
      {question.options.map((option) => {
        const currentRank = value[option] ?? ''
        return (
          <div key={option} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
            <Select value={currentRank} onValueChange={(next) => onChange({ ...value, [option]: next ?? '' })}>
              <SelectTrigger className="w-32 shrink-0 font-semibold">
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                {ranks.map((rank) => (
                  <SelectItem key={rank} value={rank} disabled={usedRanks.includes(rank) && currentRank !== rank}>
                    Peringkat {rank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm leading-6">{option}</span>
          </div>
        )
      })}
    </div>
  )
}

function SectionStep({ section, sectionNumber, sectionTotal, questions, answers, role, onChange, answeredCount, requiredCount, overallAnswered, overallTotal, isLast, submitting, submitError, onBack, onNext }: {
  section: Section
  sectionNumber: number
  sectionTotal: number
  questions: Question[]
  answers: AnswerMap
  role?: typeof roles[number]
  onChange: (id: string, value: AnswerValue) => void
  answeredCount: number
  requiredCount: number
  overallAnswered: number
  overallTotal: number
  isLast: boolean
  submitting: boolean
  submitError: string | null
  onBack: () => void
  onNext: () => void
}) {
  const canProceed = answeredCount === requiredCount
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-accent">02 / Bagian {sectionNumber} dari {sectionTotal} — Perspektif {role?.title}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{section.title}</h2>
          <p className="mt-4 text-muted-foreground">Jawab semua pertanyaan pada bagian ini, lalu lanjut ke bagian berikutnya.</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm text-muted-foreground">{answeredCount}/{requiredCount} bagian ini</p>
          <p className="font-mono text-xs text-muted-foreground">{overallAnswered}/{overallTotal} total</p>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <QuestionRenderer key={question.id} question={question} index={index} answers={answers} onChange={onChange} />
        ))}
      </div>
      {submitError && <p className="text-right text-sm text-destructive">{submitError}</p>}
      <div className="mt-8 flex items-center justify-between gap-4">
        <button onClick={onBack} disabled={submitting} className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft aria-hidden="true" /> Kembali</button>
        <button disabled={!canProceed || submitting} onClick={onNext} className="flex items-center gap-3 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
          {submitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {isLast ? (submitting ? 'Mengirim...' : 'Kirim jawaban') : 'Lanjut'}
          {!submitting && <ArrowRight aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}

function SuccessScreen({ onReset }: { onReset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground"><div className="w-full max-w-xl text-center"><div className="mx-auto flex size-20 items-center justify-center rounded-full bg-accent/15 text-accent"><Check size={40} aria-hidden="true" /></div><p className="mt-8 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-accent">Jawaban terkirim</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">Terima kasih.</h1><p className="mx-auto mt-5 max-w-md text-lg leading-8 text-muted-foreground">Kontribusi Anda membantu memperkaya penelitian mengenai keberhasilan pre-sales solusi keamanan siber B2B.</p><button onClick={onReset} className="mt-10 inline-flex items-center gap-3 rounded-xl border border-border px-5 py-3 font-semibold hover:bg-muted">Isi kembali <RotateCcw aria-hidden="true" /></button></div></main>
}
