"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import * as math from "mathjs";

interface MathGraphProps {
  expression: string;
  xMin?: number;
  xMax?: number;
  samples?: number;
}

export default function MathGraph({
  expression,
  xMin = -10,
  xMax = 10,
  samples = 200,
}: MathGraphProps) {
  const data = useMemo(() => {
    try {
      const node = math.parse(expression);
      const compiled = node.compile();
      const step = (xMax - xMin) / samples;
      const points: { x: number; y: number | null }[] = [];

      for (let i = 0; i <= samples; i++) {
        const x = xMin + i * step;
        try {
          const y = compiled.evaluate({ x });
          if (typeof y === "number" && isFinite(y) && Math.abs(y) < 1e6) {
            points.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
          } else {
            points.push({ x: Math.round(x * 1000) / 1000, y: null });
          }
        } catch {
          points.push({ x: Math.round(x * 1000) / 1000, y: null });
        }
      }
      return points;
    } catch {
      return null;
    }
  }, [expression, xMin, xMax, samples]);

  if (!data) {
    return (
      <div className="text-xs text-zinc-400 dark:text-zinc-600 italic py-2">
        couldn&apos;t parse: {expression}
      </div>
    );
  }

  return (
    <div className="my-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 p-4">
      <div className="text-[10px] text-zinc-400 dark:text-zinc-600 mb-2 font-mono">
        f(x) = {expression}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a30" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[xMin, xMax]}
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickCount={7}
            stroke="#3f3f4640"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickCount={7}
            stroke="#3f3f4640"
          />
          <ReferenceLine x={0} stroke="#71717a40" />
          <ReferenceLine y={0} stroke="#71717a40" />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "0.5rem",
              fontSize: "11px",
              color: "#a1a1aa",
            }}
            formatter={(value: any) => [value, "y"]}
            labelFormatter={(label: any) => `x = ${label}`}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#a1a1aa"
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Graph detection utility ---

const FUNCTION_PATTERNS = [
  /f\s*\(\s*x\s*\)\s*=\s*(.+)/i,
  /y\s*=\s*(.+)/i,
  /graph\s+(?:of\s+)?(.+)/i,
  /plot\s+(?:of\s+)?(.+)/i,
];

const LATEX_CLEANUP: [RegExp, string][] = [
  [/\\frac\{([^}]+)\}\{([^}]+)\}/g, "(($1)/($2))"],
  [/\\sqrt\{([^}]+)\}/g, "sqrt($1)"],
  [/\\sin/g, "sin"],
  [/\\cos/g, "cos"],
  [/\\tan/g, "tan"],
  [/\\ln/g, "log"],
  [/\\log/g, "log10"],
  [/\\pi/g, "pi"],
  [/\\cdot/g, "*"],
  [/\\times/g, "*"],
  [/\^{([^}]+)}/g, "^($1)"],
  [/\{|\}/g, ""],
  [/\\\s/g, ""],
];

export function extractGraphExpressions(text: string): string[] {
  const expressions: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const cleanLine = line.replace(/\$\$/g, "").replace(/\$/g, "").trim();

    for (const pattern of FUNCTION_PATTERNS) {
      const match = cleanLine.match(pattern);
      if (match) {
        let expr = match[1].trim();
        // Clean up LaTeX notation
        for (const [regex, replacement] of LATEX_CLEANUP) {
          expr = expr.replace(regex, replacement);
        }
        // Remove trailing punctuation/text
        expr = expr.replace(/[,.]?\s*(where|for|when|if|,).*$/i, "").trim();
        // Validate it can be parsed
        try {
          const node = math.parse(expr);
          node.compile().evaluate({ x: 1 });
          if (!expressions.includes(expr)) {
            expressions.push(expr);
          }
        } catch {
          // not a valid expression
        }
        break;
      }
    }
  }

  return expressions.slice(0, 3); // max 3 graphs per message
}
