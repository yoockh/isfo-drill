/*
  Definisi bidang (subject) & jenjang untuk generator soal multi-bidang.
  Setiap bidang menyuntikkan "persona" + panduan khusus ke system prompt AI,
  sehingga satu aplikasi bisa membuat soal untuk banyak lomba/mata pelajaran
  (KSR, OSN, latihan mandiri, dll) — tidak lagi terkunci di keuangan syariah.
*/

export type SubjectId =
  | "umum"
  | "keuangan_syariah"
  | "matematika"
  | "fisika"
  | "kimia"
  | "biologi"
  | "informatika"
  | "ekonomi"
  | "bahasa"
  | "cybersecurity";

export interface SubjectDef {
  id: SubjectId;
  label: string;
  emoji: string;
  /** Kalimat pembuka peran AI ("Kamu adalah ..."). */
  persona: string;
  /** Panduan khusus bidang yang ditempel ke system prompt. */
  guidance: string;
  /** Aktifkan anjuran penulisan rumus dalam LaTeX ($...$). */
  useMath?: boolean;
  /** Aktifkan anjuran menyertakan potongan kode/log dalam blok ```. */
  useCode?: boolean;
}

export const SUBJECTS: SubjectDef[] = [
  {
    id: "umum",
    label: "Umum / Campuran",
    emoji: "🧠",
    persona:
      "Kamu adalah pembuat soal cerdas cermat lintas bidang yang berpengalaman.",
    guidance:
      "Buat soal berbasis pemahaman konsep dan penalaran dari materi yang diberikan. Hindari soal jebakan yang ambigu.",
  },
  {
    id: "keuangan_syariah",
    label: "Keuangan Syariah (ISFO)",
    emoji: "🕌",
    persona:
      "Kamu adalah pembuat soal cerdas cermat keuangan syariah dan fikih muamalah untuk kompetisi ISFO tingkat SMA.",
    guidance: `EKSPLORASI DALIL ARAB & AYAT/HADIS:
- Jika materi sumber mengandung ayat Al-Qur'an, hadis Nabi, kaidah fikih, atau istilah berbahasa Arab, KAMU SANGAT DIANJURKAN membuat soal yang mencantumkan teks Arab aslinya secara langsung (mis. potongan ayat/hadis dalam aksara Arab).
- Bentuk soal berdalil Arab: menguji pemahaman makna dalil terhadap akad/transaksi syariah, menentukan dasar hukum dari ayat/hadis yang ditampilkan, atau mengaitkan kaidah fikih Arab dengan kasus muamalah modern.
- Tulis teks Arab dengan jelas dan rapi (boleh berharakat sesuai materi).`,
  },
  {
    id: "matematika",
    label: "Matematika",
    emoji: "➗",
    persona:
      "Kamu adalah pembuat soal olimpiade dan cerdas cermat matematika yang teliti.",
    guidance:
      "Variasikan antara soal hitungan, penalaran logis, dan pembuktian singkat. Pastikan hanya ADA SATU jawaban yang benar secara matematis dan opsi pengecoh masuk akal (hasil kesalahan umum siswa).",
    useMath: true,
  },
  {
    id: "fisika",
    label: "Fisika",
    emoji: "🧲",
    persona: "Kamu adalah pembuat soal olimpiade dan cerdas cermat fisika.",
    guidance:
      "Gabungkan soal konsep dan soal hitungan. Selalu cantumkan satuan SI yang benar. Untuk soal hitungan, pastikan angka pada opsi konsisten dengan besaran dan satuannya.",
    useMath: true,
  },
  {
    id: "kimia",
    label: "Kimia",
    emoji: "⚗️",
    persona: "Kamu adalah pembuat soal olimpiade dan cerdas cermat kimia.",
    guidance:
      "Gunakan penulisan rumus kimia, persamaan reaksi, dan tata nama yang benar. Seimbangkan persamaan reaksi bila diperlukan.",
    useMath: true,
  },
  {
    id: "biologi",
    label: "Biologi",
    emoji: "🧬",
    persona: "Kamu adalah pembuat soal olimpiade dan cerdas cermat biologi.",
    guidance:
      "Uji pemahaman proses, struktur, dan terminologi ilmiah (gunakan istilah Latin bila relevan). Sertakan soal analisis kasus/percobaan sederhana.",
  },
  {
    id: "informatika",
    label: "Informatika / TIK",
    emoji: "💻",
    persona:
      "Kamu adalah pembuat soal olimpiade informatika (OSN-K/computational thinking).",
    guidance:
      "Fokus pada logika, algoritma, struktur data, dan penalaran komputasional. Bila menampilkan kode/pseudocode, tulis dengan benar dan konsisten.",
    useMath: true,
    useCode: true,
  },
  {
    id: "ekonomi",
    label: "Ekonomi",
    emoji: "📈",
    persona: "Kamu adalah pembuat soal cerdas cermat dan olimpiade ekonomi.",
    guidance:
      "Gabungkan konsep ekonomi mikro/makro dengan soal hitungan sederhana (elastisitas, keseimbangan pasar, pendapatan nasional). Jelaskan konteks grafik secara tekstual bila diperlukan.",
    useMath: true,
  },
  {
    id: "bahasa",
    label: "Bahasa & Literasi",
    emoji: "📚",
    persona:
      "Kamu adalah pembuat soal pemahaman bacaan dan kebahasaan yang cermat.",
    guidance:
      "Uji pemahaman bacaan, tata bahasa, makna kata, dan penalaran verbal. Bila perlu, sertakan kutipan teks singkat di dalam soal sebagai stimulus.",
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity / Keamanan Siber",
    emoji: "🛡️",
    persona:
      "Kamu adalah instruktur keamanan siber yang membuat soal latihan bergaya CTF & sertifikasi.",
    guidance:
      "Cakup web security, jaringan, kriptografi, forensik, dan keamanan sistem. Buat soal skenario yang realistis dan aplikatif. Bila relevan, sertakan potongan kode, request HTTP, atau log dalam blok kode. Fokus pada pemahaman defensif dan konsep — hindari instruksi menyerang sistem nyata secara spesifik.",
    useCode: true,
  },
];

const SUBJECT_MAP: Record<string, SubjectDef> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s])
);

export function getSubject(id?: string | null): SubjectDef {
  return (id && SUBJECT_MAP[id]) || SUBJECT_MAP.umum;
}

export type LevelId = "sd" | "smp" | "sma" | "kuliah" | "umum";

export interface LevelDef {
  id: LevelId;
  label: string;
  hint: string;
}

export const LEVELS: LevelDef[] = [
  { id: "sd", label: "SD / MI", hint: "jenjang Sekolah Dasar" },
  { id: "smp", label: "SMP / MTs", hint: "jenjang Sekolah Menengah Pertama" },
  { id: "sma", label: "SMA / MA / SMK", hint: "jenjang Sekolah Menengah Atas" },
  { id: "kuliah", label: "Perguruan Tinggi", hint: "jenjang mahasiswa/perguruan tinggi" },
  { id: "umum", label: "Umum / Bebas", hint: "peserta umum tanpa jenjang khusus" },
];

const LEVEL_MAP: Record<string, LevelDef> = Object.fromEntries(
  LEVELS.map((l) => [l.id, l])
);

export function getLevel(id?: string | null): LevelDef | null {
  return (id && LEVEL_MAP[id]) || null;
}
