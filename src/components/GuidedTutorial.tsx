import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  AlertCircle,
  Sparkles,
  Play,
  Monitor,
} from 'lucide-react';
import { LAB_STEPS } from '../data/labSteps';
import { LabStep } from '../types';

interface GuidedTutorialProps {
  onQuickSimulate: (sourceId: string, destId: string, port: number, proto: 'tcp' | 'udp' | 'icmp', payload: any) => void;
  onNavigateTab: (tab: any) => void;
}

export const GuidedTutorial: React.FC<GuidedTutorialProps> = ({
  onQuickSimulate,
  onNavigateTab,
}) => {
  const [currentStepId, setCurrentStepId] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const currentStep = LAB_STEPS.find((s) => s.id === currentStepId) || LAB_STEPS[0];

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  const toggleStepCompleted = (stepId: number) => {
    if (completedSteps.includes(stepId)) {
      setCompletedSteps(completedSteps.filter((id) => id !== stepId));
    } else {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const progressPercent = Math.round((completedSteps.length / LAB_STEPS.length) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar: Steps Navigation & Progress */}
      <div className="lg:col-span-4 space-y-4">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm sm:text-base text-white">
                Módulos del Laboratorio
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Steps List */}
          <div className="space-y-2">
            {LAB_STEPS.map((step) => {
              const isCurrent = step.id === currentStepId;
              const isCompleted = completedSteps.includes(step.id);

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepId(step.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isCurrent
                      ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepCompleted(step.id);
                    }}
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-slate-700 bg-slate-900 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-cyan-300' : 'text-slate-200'
                        }`}
                      >
                        Paso {step.id}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {step.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Windows Docker Tips Box */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <Monitor className="w-4 h-4" />
            <span>Nota para Docker Desktop en Windows</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Asegúrate de ejecutar PowerShell o Windows Terminal con WSL 2 habilitado. Los contenedores usan capacidades <code className="text-cyan-300 font-mono">NET_ADMIN</code> para manipular iptables.
          </p>
        </div>
      </div>

      {/* Main Content Area for Current Step */}
      <div className="lg:col-span-8 space-y-5">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-7 shadow-xl space-y-6">
          {/* Step Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {currentStep.badge}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Módulo {currentStep.id} de {LAB_STEPS.length}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {currentStep.title}
              </h2>
              <p className="text-xs sm:text-sm text-cyan-300/90 mt-0.5">
                {currentStep.subtitle}
              </p>
            </div>

            <button
              onClick={() => toggleStepCompleted(currentStep.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
                completedSteps.includes(currentStep.id)
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {completedSteps.includes(currentStep.id)
                  ? 'Paso Completado'
                  : 'Marcar como Completado'}
              </span>
            </button>
          </div>

          {/* Description & Core Concept */}
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentStep.description}
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                <Lightbulb className="w-4 h-4" />
                <span>Concepto Clave &bull; ¿Por qué hacemos esto?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {currentStep.conceptExplanation}
              </p>
            </div>
          </div>

          {/* Commands Box */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Comandos a Ejecutar:</span>
            </h3>

            <div className="space-y-3">
              {currentStep.commands.map((cmdItem, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {cmdItem.description}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {cmdItem.context}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-xs text-emerald-300">
                    <span className="select-all overflow-x-auto">{cmdItem.command}</span>
                    <button
                      onClick={() => handleCopy(cmdItem.command)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                      title="Copiar comando"
                    >
                      {copiedCmd === cmdItem.command ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expected Outcome & Troubleshooting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                <CheckCircle className="w-4 h-4" />
                <span>Resultado Esperado:</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                {currentStep.expectedOutcome}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="w-4 h-4" />
                <span>Solución de Problemas:</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                {currentStep.troubleshootingTip}
              </p>
            </div>
          </div>

          {/* Navigation Buttons (Prev / Next) */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              disabled={currentStepId === 1}
              onClick={() => setCurrentStepId(currentStepId - 1)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Paso Anterior</span>
            </button>

            {currentStepId < LAB_STEPS.length ? (
              <button
                onClick={() => {
                  toggleStepCompleted(currentStepId);
                  setCurrentStepId(currentStepId + 1);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Siguiente Paso</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onNavigateTab('challenges')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>¡Ir a los Desafíos Prácticos!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
