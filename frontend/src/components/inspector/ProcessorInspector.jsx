/**
 * ProcessorInspector.jsx
 *
 * Tabbed inspector panel: Registers, Data Memory, and Pipeline Details.
 * All data comes from the real backend.
 */

import React, { useState } from 'react';
import RegisterFile from './RegisterFile.jsx';
import MemoryViewer from './MemoryViewer.jsx';

const TABS = [
  { id: 'registers', label: 'Registers' },
  { id: 'memory', label: 'Memory' },
  { id: 'pipeline', label: 'Pipeline' },
];

export default function ProcessorInspector({
  registers,
  memory,
  memoryAddress,
  memoryWords,
  pipelineState,
  cycles,
  busy,
  onMemoryRefresh,
  onAddressChange,
  onWordsChange,
}) {
  const [activeTab, setActiveTab] = useState('registers');

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="flex border-b border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-semibold transition ${
              activeTab === tab.id
                ? 'border-b-2 border-cyan-500 text-sky-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
        {activeTab === 'registers' && (
          <RegisterFile registers={registers} recentMod={-1} />
        )}
        {activeTab === 'memory' && (
          <MemoryViewer
            memory={memory}
            cycles={0}
            onRefresh={() => {}}
            address={0}
            words={16}
            onAddressChange={() => {}}
            onWordsChange={() => {}}
            busy={false}
          />
        )}
        {activeTab === 'pipeline' && (
          <div className="p-3 space-y-3 overflow-y-auto">
            {['IF', 'ID', 'EX', 'MEM', 'WB'].map((stage) => {
              const stageData = pipelineState?.[stage];
              const inst = stageData?.instruction;
              const hasInst = inst && stageData?.valid;

              return (
                <div key={stage} className="flex-1 flex flex-col px-2 py-1 mx-0.5 rounded cursor-pointer transition border border-transparent hover:bg-slate-800/40">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold">{stage}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${inst && stageData?.valid ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </div>
                  <div className="truncate font-semibold text-slate-200 mt-0.5">
                    {inst && inst.valid !== false ? inst.source : 'NOP / Bubble'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
