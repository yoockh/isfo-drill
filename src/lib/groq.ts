import Groq from "groq-sdk";
import { getSubject, getLevel, type SubjectId, type LevelId } from "./subjects";

let _groq: Groq | null = null;

function getGroq() {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

// Structured outputs strict (response_format json_schema) HANYA didukung oleh
// openai/gpt-oss-120b & openai/gpt-oss-20b di Groq. Model llama & groq/compound
// tidak mendukung json_schema.
const MODEL = "openai/gpt-oss-120b";
const labels = ["A", "B", "C", "D", "E", "F"];

export interface GenerateOptions {
  subject?: SubjectId;
  level?: LevelId;
  customInstruction?: string;
}

// Skema JSON keluaran — sama untuk generate maupun impor, sehingga frontend
// bisa memakai bentuk data yang identik.
const QUESTION_SCHEMA = {
  name: "quiz_questions",
  strict: true,
  schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "Teks soal" },
            options: {
              type: "array",
              items: { type: "string" },
              description: "Daftar pilihan jawaban (2-6 opsi)",
            },
            correctIndex: {
              type: "integer",
              description: "Index jawaban benar (mulai 0)",
            },
          },
          required: ["text", "options", "correctIndex"],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  },
} as const;

type RawQuestion = { text: string; options: string[]; correctIndex: number };

// Bersihkan & validasi keluaran model agar aman dipakai UI (2-6 opsi, index valid).
function sanitize(questions: RawQuestion[]): RawQuestion[] {
  return questions
    .filter(
      (q) =>
        q &&
        typeof q.text === "string" &&
        q.text.trim().length > 0 &&
        Array.isArray(q.options)
    )
    .map((q) => {
      const options = q.options
        .map((o) => String(o ?? "").trim())
        .filter((o) => o.length > 0)
        .slice(0, 6);
      let correctIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : 0;
      if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;
      return { text: q.text.trim(), options, correctIndex };
    })
    .filter((q) => q.options.length >= 2);
}

function buildSystemPrompt(opts: GenerateOptions): string {
  const subject = getSubject(opts.subject);
  const level = getLevel(opts.level);

  const parts: string[] = [
    subject.persona,
    "Tugasmu membuat soal pilihan ganda bermutu tinggi berdasarkan materi yang diberikan.",
    `PANDUAN UMUM:
1. Setiap soal memiliki 4 pilihan jawaban (A, B, C, D) dengan HANYA SATU jawaban benar, kecuali materi menuntut lain.
2. Tingkat kesulitan bervariasi (mudah, sedang, sulit/analisis).
3. Opsi pengecoh harus masuk akal dan tidak asal-asalan.
4. Bahasa pengantar: Bahasa Indonesia baku, jelas, dan tidak ambigu.`,
    `PANDUAN BIDANG ${subject.label.toUpperCase()}:\n${subject.guidance}`,
  ];

  if (subject.useMath) {
    parts.push(
      "PENULISAN RUMUS: Tulis semua notasi/rumus matematis dalam LaTeX di antara tanda $...$ (inline) atau $$...$$ (blok). Contoh: $\\frac{1}{2}mv^2$."
    );
  }
  if (subject.useCode) {
    parts.push(
      "PENULISAN KODE: Bila menampilkan kode, pseudocode, atau log, bungkus dalam blok kode markdown ```...```."
    );
  }
  if (level) {
    parts.push(`SASARAN PESERTA: Sesuaikan bobot & kedalaman soal untuk ${level.hint}.`);
  }
  if (opts.customInstruction && opts.customInstruction.trim()) {
    parts.push(
      `INSTRUKSI TAMBAHAN DARI PENGGUNA (prioritaskan):\n${opts.customInstruction.trim()}`
    );
  }

  return parts.join("\n\n");
}

async function generateQuestionBatch(
  material: string,
  count: number,
  opts: GenerateOptions
): Promise<RawQuestion[]> {
  const groq = getGroq();
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(opts) },
      {
        role: "user",
        content: `Buat ${count} soal pilihan ganda dari materi berikut:\n\n${material}`,
      },
    ],
    response_format: { type: "json_schema", json_schema: QUESTION_SCHEMA },
    temperature: 0.7,
    max_tokens: 8192,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Groq tidak mengembalikan response");
  const parsed = JSON.parse(content);
  return sanitize(parsed.questions as RawQuestion[]);
}

export async function generateQuestions(
  material: string,
  count: number = 10,
  opts: GenerateOptions = {}
): Promise<RawQuestion[]> {
  // Untuk permintaan besar, bagi paralel agar tidak menabrak batas token/timeout.
  if (count > 25) {
    const half = Math.ceil(count / 2);
    const [a, b] = await Promise.all([
      generateQuestionBatch(material, half, opts),
      generateQuestionBatch(material, count - half, opts),
    ]);
    return [...a, ...b];
  }
  return generateQuestionBatch(material, count, opts);
}

/* ---------------------------------------------------------------------------
   IMPOR / PARSE SOAL SIAP PAKAI
   Diberi teks yang SUDAH berupa daftar soal (mis. hasil salin dari dokumen /
   PDF), AI mengubahnya menjadi struktur soal — BUKAN mengarang soal baru.
--------------------------------------------------------------------------- */

const PARSE_SYSTEM_PROMPT = `Kamu adalah asisten yang mengekstrak soal pilihan ganda dari teks mentah menjadi data terstruktur.

ATURAN PENTING:
1. JANGAN mengarang soal baru. Ambil HANYA soal yang benar-benar ada di teks.
2. Pertahankan jumlah opsi asli setiap soal (boleh 2 sampai 6 opsi).
3. Tentukan correctIndex (mulai 0) dari kunci jawaban yang tertera di teks (mis. "Jawaban: C", "Kunci: B", tanda bintang/tebal, atau daftar kunci di akhir).
4. Jika kunci jawaban TIDAK tercantum di teks, tentukan jawaban yang paling benar berdasarkan pengetahuanmu.
5. Pertahankan notasi apa adanya: rumus LaTeX ($...$), potongan kode (blok \`\`\`), dan teks Arab jika ada.
6. Buang penomoran/label ("1.", "A)", dsb) dari teks soal dan opsi — cukup isinya saja.`;

async function parseQuestionChunk(text: string): Promise<RawQuestion[]> {
  const groq = getGroq();
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: PARSE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Ekstrak semua soal pilihan ganda dari teks berikut:\n\n${text}`,
      },
    ],
    response_format: { type: "json_schema", json_schema: QUESTION_SCHEMA },
    temperature: 0.1,
    max_tokens: 8192,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Groq tidak mengembalikan response");
  const parsed = JSON.parse(content);
  return sanitize(parsed.questions as RawQuestion[]);
}

// Pecah teks panjang menjadi potongan ~9000 karakter di batas baris kosong,
// agar daftar soal yang banyak (mis. 50 soal) tetap muat dalam satu panggilan.
function chunkText(text: string, maxLen = 9000): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf("\n\n", maxLen);
    if (cut < maxLen * 0.5) cut = rest.lastIndexOf("\n", maxLen);
    if (cut < maxLen * 0.5) cut = maxLen;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
}

export async function parseQuestions(text: string): Promise<RawQuestion[]> {
  const chunks = chunkText(text.trim());
  const results = await Promise.all(chunks.map((c) => parseQuestionChunk(c)));
  return results.flat();
}

/* ---------------------------------------------------------------------------
   PEMBAHASAN SINGKAT untuk soal yang dijawab salah (teks biasa, lebih murah).
--------------------------------------------------------------------------- */
export async function generateExplanation(input: {
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number;
}): Promise<string> {
  const groq = getGroq();
  const { question, options, correctIndex, selectedIndex } = input;

  const optionsText = options
    .map((o, i) => `${labels[i] ?? String.fromCharCode(65 + i)}. ${o}`)
    .join("\n");

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Kamu tutor yang menjelaskan pembahasan soal secara singkat, jelas, dan edukatif dalam Bahasa Indonesia (2-4 kalimat).
Fokus: kenapa jawaban peserta keliru dan kenapa jawaban benar itu tepat.
Jangan mengulang seluruh soal, langsung ke inti konsepnya. Tanpa basa-basi pembuka.
Pertahankan notasi rumus (LaTeX $...$) atau kode bila relevan.`,
      },
      {
        role: "user",
        content: `Soal: ${question}
Pilihan:
${optionsText}
Jawaban peserta (salah): ${labels[selectedIndex] ?? selectedIndex}. ${options[selectedIndex]}
Jawaban benar: ${labels[correctIndex] ?? correctIndex}. ${options[correctIndex]}

Tulis pembahasan singkatnya.`,
      },
    ],
    temperature: 0.5,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Groq tidak mengembalikan pembahasan");
  return content;
}
