import Groq from "groq-sdk";

let _groq: Groq | null = null;

function getGroq() {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

async function generateQuestionBatch(
  material: string,
  count: number
) {
  const groq = getGroq();
  const response = await groq.chat.completions.create({
    // Structured outputs strict (response_format json_schema) HANYA didukung
    // oleh openai/gpt-oss-120b & openai/gpt-oss-20b di Groq. Model llama &
    // groq/compound tidak mendukung json_schema.
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content: `Kamu adalah pembuat soal cerdas cermat keuangan syariah untuk kompetisi ISFO tingkat SMA.
Buat soal pilihan ganda berdasarkan materi yang diberikan.
Setiap soal harus memiliki tepat 4 pilihan jawaban dengan satu jawaban benar.
Soal harus dalam Bahasa Indonesia, jelas, dan menguji pemahaman konsep, bukan hafalan semata.
Variasikan tingkat kesulitan: mudah, sedang, dan sulit.`,
      },
      {
        role: "user",
        content: `Buat ${count} soal pilihan ganda dari materi berikut:\n\n${material}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
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
                    description: "4 pilihan jawaban",
                  },
                  correctIndex: {
                    type: "integer",
                    description: "Index jawaban benar (0-3)",
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
      },
    },
    temperature: 0.7,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq tidak mengembalikan response");
  }

  const parsed = JSON.parse(content);
  return parsed.questions as Array<{
    text: string;
    options: string[];
    correctIndex: number;
  }>;
}

export async function generateQuestions(
  material: string,
  count: number = 10
) {
  // Jika permintaan > 30 soal, bagi secara paralel untuk menghindari batas max_tokens & timeout.
  if (count > 30) {
    const batch1Count = Math.ceil(count / 2);
    const batch2Count = Math.floor(count / 2);

    const [batch1, batch2] = await Promise.all([
      generateQuestionBatch(material, batch1Count),
      generateQuestionBatch(material, batch2Count),
    ]);

    return [...batch1, ...batch2];
  }

  return generateQuestionBatch(material, count);
}

/*
  Pembahasan singkat untuk soal yang dijawab salah. Output teks biasa (bukan
  structured JSON) — lebih murah & cepat. Model sama: openai/gpt-oss-120b.
*/
export async function generateExplanation(input: {
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number;
}): Promise<string> {
  const groq = getGroq();
  const { question, options, correctIndex, selectedIndex } = input;

  const labels = ["A", "B", "C", "D"];
  const optionsText = options
    .map((o, i) => `${labels[i]}. ${o}`)
    .join("\n");

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content: `Kamu tutor keuangan syariah untuk siswa SMA (kompetisi ISFO).
Jelaskan secara singkat, jelas, dan edukatif dalam Bahasa Indonesia (2-4 kalimat).
Fokus: kenapa jawaban siswa keliru dan kenapa jawaban benar itu tepat.
Jangan mengulang seluruh soal, langsung ke inti konsepnya. Tanpa basa-basi pembuka.`,
      },
      {
        role: "user",
        content: `Soal: ${question}
Pilihan:
${optionsText}
Jawaban siswa (salah): ${labels[selectedIndex]}. ${options[selectedIndex]}
Jawaban benar: ${labels[correctIndex]}. ${options[correctIndex]}

Tulis pembahasan singkatnya.`,
      },
    ],
    temperature: 0.5,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Groq tidak mengembalikan pembahasan");
  }
  return content;
}
