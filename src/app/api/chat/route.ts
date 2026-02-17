import { NextRequest } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

const SYSTEM_PROMPT = `You are an expert math tutor with years of teaching experience. You explain complex concepts simply and show work step-by-step.

CRITICAL LaTeX Rules:
- Inline math: $x^2 + 2x + 1 = 0$
- Display math: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
- NEVER use brackets around LaTeX: NO [ $$...$$ ] or [ $...$ ]
- Matrices: $$\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$$
- Use \\\\ for new lines in matrices/arrays

Your Teaching Method:
1. **Identify** what type of problem this is
2. **Strategy** - explain your approach before solving
3. **Step-by-step** - show EVERY calculation clearly
4. **Explain** why each step matters
5. **Answer** - clearly state the final result
6. **Check** - verify your answer when possible

Special Instructions:
- For equations: solve using standard methods, show factoring/quadratic formula
- For calculus: show derivatives/integrals step-by-step
- For word problems: define variables, set up equations, solve
- For matrices: show row operations or formula usage
- For graphs: describe domain, range, intercepts, asymptotes, behavior
- Always simplify final answers
- If multiple methods exist, show the most efficient one

Be encouraging and clear. Learning math should feel empowering!`;

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

// Clean up LaTeX formatting - remove brackets around math expressions
function cleanLatex(text: string): string {
  return text
    // Remove brackets around display math: [ $$...$$ ] -> $$...$$
    .replace(/\[\s*\$\$(.*?)\$\$\s*\]/gs, '$$$$1$$')
    // Remove brackets around inline math: [ $...$ ] -> $...$
    .replace(/\[\s*\$(.*?)\$\s*\]/gs, '$$1')
    // Remove brackets around LaTeX environments
    .replace(/\[\s*\\begin\{(.*?)\}(.*?)\\end\{\1\}\s*\]/gs, '\\\\begin{$1}$2\\\\end{$1}')
    // Fix common matrix formatting issues
    .replace(/\\begin\{bmatrix\}\s*\\(.*?)\s*\\end\{bmatrix\}/g, '\\\\begin{bmatrix}$1\\\\end{bmatrix}')
    .replace(/\\begin\{pmatrix\}\s*\\(.*?)\s*\\end\{pmatrix\}/g, '\\\\begin{pmatrix}$1\\\\end{pmatrix}')
    .replace(/\\begin\{vmatrix\}\s*\\(.*?)\s*\\end\{vmatrix\}/g, '\\\\begin{vmatrix}$1\\\\end{vmatrix}')
    // Fix double backslashes
    .replace(/\\\\\s*\\\\/g, '\\\\')
    // Remove brackets around fractions
    .replace(/\[\s*\\frac\{(.*?)\}\{(.*?)\}\s*\]/gs, '\\\\frac{$1}{$2}')
    // Remove brackets around common functions
    .replace(/\[\s*\\sqrt\{(.*?)\}\s*\]/gs, '\\\\sqrt{$1}')
    .replace(/\[\s*\\sum_(.*?)\^(\.*?)\s*\]/gs, '\\\\sum_{$1}^{$2}')
    .replace(/\[\s*\\int_(.*?)\^(\.*?)\s*\]/gs, '\\\\int_{$1}^{$2}')
    // Clean up any remaining bracketed LaTeX patterns
    .replace(/\[\\([a-zA-Z]+)(.*?)\]/g, '\\\\$1$2');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    const ollamaMessages: OllamaMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    let needsVision = false;

    for (const msg of messages) {
      if (msg.role === "user") {
        if (msg.fileData) {
          if (msg.fileData.type === "image") {
            needsVision = true;
            const base64 = msg.fileData.data.replace(/^data:image\/\w+;base64,/, "");
            ollamaMessages.push({
              role: "user",
              content: msg.text || "Analyze and solve the math in this image.",
              images: [base64],
            });
          } else {
            ollamaMessages.push({
              role: "user",
              content: `${msg.text || "Solve the math problems in this file."}\n\n[Uploaded file: ${msg.fileData.name}]\n\nFile contents:\n${msg.fileData.data}`,
            });
          }
        } else {
          ollamaMessages.push({ role: "user", content: msg.text });
        }
      } else {
        ollamaMessages.push({ role: "assistant", content: msg.text });
      }
    }

    const model = needsVision ? (process.env.OLLAMA_VISION_MODEL || "llava") : MODEL;

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature: 0.2,  // Lower temperature for more consistent, faster responses
          num_predict: 2048,  // Reduce max tokens for faster responses
          top_p: 0.9,
          repeat_penalty: 1.1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error (${response.status}): ${errorText}`);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                  const cleanedContent = cleanLatex(json.message.content);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token: cleanedContent })}\n\n`)
                  );
                }
                if (json.done) {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("API Error:", error);

    let message = error.message || "Something went wrong";
    if (error.cause?.code === "ECONNREFUSED") {
      message = "Can't connect to Ollama. Make sure Ollama is running (open the Ollama app or run 'ollama serve').";
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
