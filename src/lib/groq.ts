import Groq from "groq-sdk";

let _groq: Groq | null = null;

function getGroq() {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

export async function generateQuestions(
  material: string,
  count: number = 10
) {
  const groq = getGroq();
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
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
