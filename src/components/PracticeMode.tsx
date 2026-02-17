"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Loader2,
  Lightbulb,
  RotateCcw,
  Send,
  Trophy,
  Target,
  Flame,
  ChevronDown,
} from "lucide-react";

const TOPICS = [
  { id: "algebra", label: "Algebra" },
  { id: "calculus", label: "Calculus" },
  { id: "trigonometry", label: "Trig" },
  { id: "geometry", label: "Geometry" },
  { id: "statistics", label: "Statistics" },
  { id: "linear-algebra", label: "Linear Algebra" },
  { id: "number-theory", label: "Number Theory" },
];

const DIFFICULTIES = [
  { id: "easy", label: "easy", color: "text-emerald-500" },
  { id: "medium", label: "medium", color: "text-amber-500" },
  { id: "hard", label: "hard", color: "text-red-400" },
];

interface PracticeState {
  problem: string;
  answer: string;
  hint: string;
}

interface Stats {
  total: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

const STATS_KEY = "mathbot_practice_stats";

function loadStats(): Stats {
  if (typeof window === "undefined") return { total: 0, correct: 0, streak: 0, bestStreak: 0 };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : { total: 0, correct: 0, streak: 0, bestStreak: 0 };
  } catch {
    return { total: 0, correct: 0, streak: 0, bestStreak: 0 };
  }
}

function saveStats(stats: Stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export default function PracticeMode() {
  const [topic, setTopic] = useState("algebra");
  const [difficulty, setDifficulty] = useState("medium");
  const [practice, setPractice] = useState<PracticeState | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stats, setStats] = useState<Stats>({ total: 0, correct: 0, streak: 0, bestStreak: 0 });
  const [topicOpen, setTopicOpen] = useState(false);
  const answerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const generateProblem = async () => {
    setGenerating(true);
    setPractice(null);
    setFeedback(null);
    setUserAnswer("");
    setShowHint(false);

    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", topic, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPractice(data);
      setTimeout(() => answerRef.current?.focus(), 100);
    } catch (err: any) {
      setPractice({
        problem: `Error: ${err.message}`,
        answer: "",
        hint: "",
      });
    } finally {
      setGenerating(false);
    }
  };

  const checkAnswer = async () => {
    if (!userAnswer.trim() || !practice) return;
    setChecking(true);

    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          problem: practice.problem,
          userAnswer: userAnswer.trim(),
          correctAnswer: practice.answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFeedback(data);

      const newStats = { ...stats };
      newStats.total += 1;
      if (data.correct) {
        newStats.correct += 1;
        newStats.streak += 1;
        if (newStats.streak > newStats.bestStreak) {
          newStats.bestStreak = newStats.streak;
        }
      } else {
        newStats.streak = 0;
      }
      setStats(newStats);
      saveStats(newStats);
    } catch (err: any) {
      setFeedback({
        correct: false,
        explanation: `Error checking answer: ${err.message}`,
      });
    } finally {
      setChecking(false);
    }
  };

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 text-xs text-zinc-400 dark:text-zinc-500">
        <div className="flex items-center gap-1.5" title="Accuracy">
          <Target size={12} />
          <span>{accuracy}%</span>
        </div>
        <div className="flex items-center gap-1.5" title="Total solved">
          <Trophy size={12} />
          <span>{stats.correct}/{stats.total}</span>
        </div>
        <div className="flex items-center gap-1.5" title="Current streak">
          <Flame size={12} className={stats.streak >= 3 ? "text-orange-400" : ""} />
          <span>{stats.streak}</span>
          {stats.bestStreak > 0 && (
            <span className="text-zinc-300 dark:text-zinc-700">(best: {stats.bestStreak})</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Topic & difficulty selector */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Topic dropdown */}
            <div className="relative">
              <button
                onClick={() => setTopicOpen(!topicOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {TOPICS.find((t) => t.id === topic)?.label}
                <ChevronDown size={12} className={`transition-transform ${topicOpen ? "rotate-180" : ""}`} />
              </button>
              {topicOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTopicOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 min-w-[140px]">
                    {TOPICS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTopic(t.id);
                          setTopicOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                          topic === t.id ? "text-zinc-800 dark:text-zinc-200 font-medium" : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Difficulty pills */}
            <div className="flex gap-1">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    difficulty === d.id
                      ? `bg-zinc-200 dark:bg-zinc-700 ${d.color} font-medium`
                      : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button
              onClick={generateProblem}
              disabled={generating}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50 transition-colors font-medium"
            >
              {generating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : practice ? (
                <RotateCcw size={12} />
              ) : null}
              {practice ? "next" : "start"}
            </button>
          </div>

          {/* Problem display */}
          {generating && (
            <div className="flex items-center justify-center py-16 text-zinc-400 dark:text-zinc-500">
              <Loader2 size={18} className="animate-spin" />
            </div>
          )}

          {practice && !generating && (
            <div className="space-y-4 animate-in">
              <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-5">
                <div className="prose prose-zinc dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {practice.problem}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Hint */}
              {practice.hint && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <Lightbulb size={12} />
                  {showHint ? "hide hint" : "show hint"}
                </button>
              )}
              {showHint && practice.hint && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/40 dark:border-amber-800/20 rounded-xl px-4 py-3 animate-in">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {practice.hint}
                  </ReactMarkdown>
                </div>
              )}

              {/* Answer input */}
              {!feedback && (
                <div className="flex items-center gap-2">
                  <input
                    ref={answerRef}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") checkAnswer();
                    }}
                    placeholder="your answer..."
                    className="flex-1 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 outline-none focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors"
                  />
                  <button
                    onClick={checkAnswer}
                    disabled={checking || !userAnswer.trim()}
                    className="p-2.5 rounded-xl bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-30 transition-colors"
                  >
                    {checking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div
                  className={`rounded-2xl p-5 animate-in ${
                    feedback.correct
                      ? "bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/40 dark:border-emerald-800/20"
                      : "bg-red-50 dark:bg-red-900/10 border border-red-200/40 dark:border-red-800/20"
                  }`}
                >
                  <div className={`text-sm font-medium mb-2 ${feedback.correct ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {feedback.correct ? "correct!" : "not quite"}
                  </div>
                  <div className="prose prose-zinc dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {feedback.explanation}
                    </ReactMarkdown>
                  </div>
                  <button
                    onClick={generateProblem}
                    className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors font-medium"
                  >
                    <RotateCcw size={12} />
                    next problem
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!practice && !generating && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="text-3xl">🎯</div>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">
                pick a topic and difficulty, then hit start to practice
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
