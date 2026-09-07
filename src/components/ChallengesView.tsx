import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Code2,
  Sparkles,
  Play,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CHALLENGES } from '../data/challenges';
import { ChallengeTask, ContainerNode, SimulationResult, UfwConfig } from '../types';
import { simulatePacketTraversal } from '../utils/simulationEngine';

interface ChallengesViewProps {
  nodes: ContainerNode[];
  ufwConfig: UfwConfig;
  completedChallengeIds: string[];
  onChallengeCompleted: (challengeId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({
  nodes,
  ufwConfig,
  completedChallengeIds,
  onChallengeCompleted,
  onNavigateToTab,
}) => {
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeTask>(CHALLENGES[0]);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    challengeId: string;
    passed: boolean;
    simResult: SimulationResult;
  } | null>(null);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [revealedSolutions, setRevealedSolutions] = useState<string[]>([]);
  const [copiedSolution, setCopiedSolution] = useState<string | null>(null);

  const handleTestChallenge = (task: ChallengeTask) => {
    setEvaluating(true);

    const sim = simulatePacketTraversal(task.testRequest, nodes, [], ufwConfig);

    const passed = sim.verdict === task.expectedVerdict;

    setTimeout(() => {
      setLastResult({
        challengeId: task.id,
        passed,
        simResult: sim,
      });
      setEvaluating(false);

      if (passed) {
        onChallengeCompleted(task.id);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }, 400);
  };

  const toggleHint = (id: string) => {
    setRevealedHints((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSolution = (id: string) => {
    setRevealedSolutions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopySolution = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSolution(id);
    setTimeout(() => setCopiedSolution(null), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Challenges List Sidebar */}
      <div className="lg:col-span-4 space-y-4">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm sm:text-base text-white">
                Misiones de Firewall
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              {completedChallengeIds.length}/{CHALLENGES.length} Superadas
            </span>
          </div>

          <div className="space-y-2">
            {CHALLENGES.map((task) => {
              const isSelected = selectedChallenge.id === task.id;
              const isDone = completedChallengeIds.includes(task.id);

              return (
                <button
                  key={task.id}
                  onClick={() => {
                    setSelectedChallenge(task);
                    setLastResult(null);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-amber-300' : 'text-slate-200'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {task.category}
                      </span>
                      <span
                        className={`font-semibold ${
                          task.difficulty === 'Fácil'
                            ? 'text-emerald-400'
                            : task.difficulty === 'Intermedio'
                            ? 'text-cyan-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {task.difficulty}
                      </span>
                    </div>
                  </div>

                  {isDone && (
                    <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Challenge Workspace */}
      <div className="lg:col-span-8 space-y-5">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-7 shadow-xl space-y-6">
          {/* Challenge Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {selectedChallenge.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Dificultad: {selectedChallenge.difficulty}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {selectedChallenge.title}
              </h2>
            </div>

            {completedChallengeIds.includes(selectedChallenge.id) && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Misión Superada
              </span>
            )}
          </div>

          {/* Mission Description & Objective */}
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {selectedChallenge.description}
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                Objetivo a Validar:
              </span>
              <p className="text-xs text-slate-200 font-medium">
                {selectedChallenge.goal}
              </p>
            </div>
          </div>

          {/* Test Validation Bar */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-slate-400 block text-[11px]">Vector de Prueba Automatizado:</span>
              <span className="font-mono text-cyan-300 font-bold">
                {selectedChallenge.testRequest.sourceNodeId} &rarr; {selectedChallenge.testRequest.destNodeId}:{selectedChallenge.testRequest.destPort} ({selectedChallenge.testRequest.payloadType})
              </span>
            </div>

            <button
              onClick={() => handleTestChallenge(selectedChallenge)}
              disabled={evaluating}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-all"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{evaluating ? 'Evaluando...' : 'Comprobar Reglas Actuales'}</span>
            </button>
          </div>

          {/* Evaluation Result Feedback Banner */}
          {lastResult && lastResult.challengeId === selectedChallenge.id && (
            <div
              className={`p-4 rounded-xl border text-xs sm:text-sm transition-all ${
                lastResult.passed
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {lastResult.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="font-bold">
                    {lastResult.passed
                      ? '¡Excelente! Objetivo cumplido con éxito.'
                      : 'El resultado no cumple con la política deseada.'}
                  </h4>
                  <p className="text-xs opacity-90">
                    Resultado obtenido: <code className="font-mono font-bold">{lastResult.simResult.verdict}</code> (Esperado: <code className="font-mono font-bold">{selectedChallenge.expectedVerdict}</code>).
                  </p>
                  <p className="text-xs text-slate-300 font-sans mt-1">
                    {lastResult.passed
                      ? selectedChallenge.explanation
                      : 'Revisa las reglas en la pestaña "Reglas & Rutas" o ejecuta el comando necesario en la "Terminal CLI".'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hint & Solution Accordions */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {/* Hint */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
              <button
                onClick={() => toggleHint(selectedChallenge.id)}
                className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-bold text-slate-300 hover:text-cyan-300 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>¿Necesitas una pista?</span>
                </div>
                {revealedHints.includes(selectedChallenge.id) ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {revealedHints.includes(selectedChallenge.id) && (
                <div className="px-4 pb-3 text-xs text-slate-300 border-t border-slate-900 font-sans leading-relaxed">
                  {selectedChallenge.hint}
                </div>
              )}
            </div>

            {/* Solution */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
              <button
                onClick={() => toggleSolution(selectedChallenge.id)}
                className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-bold text-slate-300 hover:text-amber-300 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span>Ver Solución / Comando UFW</span>
                </div>
                {revealedSolutions.includes(selectedChallenge.id) ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {revealedSolutions.includes(selectedChallenge.id) && (
                <div className="px-4 pb-3 space-y-2 border-t border-slate-900">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300">
                    <span className="select-all">{selectedChallenge.solutionCommand}</span>
                    <button
                      onClick={() =>
                        handleCopySolution(selectedChallenge.id, selectedChallenge.solutionCommand)
                      }
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    >
                      {copiedSolution === selectedChallenge.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Puedes pegar este comando en la pestaña &quot;Terminal CLI&quot; o crear la regla en &quot;Reglas &amp; Rutas&quot;.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
