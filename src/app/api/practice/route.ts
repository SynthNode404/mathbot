import { NextRequest } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

const TOPICS = {
  algebra: "algebra (equations, inequalities, polynomials, factoring)",
  calculus: "calculus (derivatives, integrals, limits)",
  trigonometry: "trigonometry (identities, equations, unit circle)",
  geometry: "geometry (areas, volumes, angles, proofs)",
  statistics: "statistics and probability",
  "linear-algebra": "linear algebra (matrices, vectors, eigenvalues)",
  "number-theory": "number theory (primes, divisibility, modular arithmetic)",
};

type Difficulty = "easy" | "medium" | "hard";
type Topic = keyof typeof TOPICS;

function getGeneratePrompt(topic: Topic, difficulty: Difficulty): string {
  return `Generate exactly ONE ${difficulty} ${TOPICS[topic]} problem for a student to practice.

Format your response EXACTLY like this (no other text):
PROBLEM: [the problem statement]
ANSWER: [the correct final answer, concise]
HINT: [a helpful hint without giving away the answer]

Rules:
- The problem should be appropriate for the ${difficulty} difficulty level.
- Easy = straightforward single-step. Medium = multi-step. Hard = challenging/competition-level.
- The ANSWER should be a specific value or expression, not a full solution.
- Keep the problem statement clear and unambiguous.
- Use LaTeX notation wrapped in $ signs for math expressions.`;
}

function getCheckPrompt(problem: string, userAnswer: string, correctAnswer: string): string {
  return `A student was given this math problem:
${problem}

The correct answer is: ${correctAnswer}

The student answered: ${userAnswer}

Evaluate the student's answer. Respond in this format:
1. Start with either "CORRECT" or "INCORRECT" on the first line.
2. Then provide a brief explanation.
3. If incorrect, show the correct step-by-step solution using LaTeX ($ for inline, $$ for display math).
4. If correct, give a brief note on the approach or an interesting related fact.

Be encouraging regardless of whether they got it right.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, topic, difficulty, problem, userAnswer, correctAnswer } = body;

    let prompt: string;

    if (action === "generate") {
      prompt = getGeneratePrompt(topic || "algebra", difficulty || "medium");
    } else if (action === "check") {
      prompt = getCheckPrompt(problem, userAnswer, correctAnswer);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: {
          temperature: action === "generate" ? 0.8 : 0.3,
          num_predict: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.message?.content || "";

    if (action === "generate") {
      const problemMatch = content.match(/PROBLEM:\s*([\s\S]*?)(?=ANSWER:)/i);
      const answerMatch = content.match(/ANSWER:\s*([\s\S]*?)(?=HINT:)/i);
      const hintMatch = content.match(/HINT:\s*([\s\S]*?)$/i);

      return new Response(
        JSON.stringify({
          problem: problemMatch?.[1]?.trim() || content,
          answer: answerMatch?.[1]?.trim() || "",
          hint: hintMatch?.[1]?.trim() || "",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } else {
      const isCorrect = content.trim().toUpperCase().startsWith("CORRECT");
      const explanation = content.replace(/^(CORRECT|INCORRECT)\s*/i, "").trim();

      return new Response(
        JSON.stringify({ correct: isCorrect, explanation }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Practice API Error:", error);

    let message = error.message || "Something went wrong";
    if (error.cause?.code === "ECONNREFUSED") {
      message = "Can't connect to Ollama. Make sure Ollama is running.";
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
