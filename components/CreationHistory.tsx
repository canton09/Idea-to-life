/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { ClockIcon, ArrowRightIcon, DocumentIcon, PhotoIcon, TrashIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

export interface Creation {
  id: string;
  name: string;
  html: string;
  originalImage?: string; // Base64 data URL
  timestamp: Date;
}

interface CreationHistoryProps {
  history: Creation[];
  onSelect: (creation: Creation) => void;
  onDelete: (id: string) => void;
}

export const CreationHistory: React.FC<CreationHistoryProps> = ({ history, onSelect, onDelete }) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center space-x-3">
            <ClockIcon className="w-4 h-4 text-zinc-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                历史记录 <span className="text-zinc-700 font-normal ml-1">({history.length}/30)</span>
            </h2>
        </div>
        <div className="h-px flex-1 bg-zinc-800 ml-4"></div>
      </div>
      
      {/* Horizontal Scroll Container for Compact Layout */}
      <div className="flex overflow-x-auto space-x-4 pb-4 px-2 scrollbar-hide">
        {history.map((item) => {
          const isPdf = item.originalImage?.startsWith('data:application/pdf');
          const hasImage = !!item.originalImage && !isPdf;
          
          return (
            <div
              key={item.id}
              className="group flex-shrink-0 relative flex flex-col w-48 h-32 bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-xl transition-all duration-300 overflow-hidden shadow-lg hover:shadow-blue-900/10 cursor-pointer"
              onClick={() => onSelect(item)}
            >
              {/* Thumbnail Background */}
              {hasImage ? (
                  <div className="absolute inset-0">
                      <img 
                          src={item.originalImage} 
                          alt="thumbnail" 
                          className="w-full h-full object-cover opacity-50 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent"></div>
                  </div>
              ) : (
                  <div className="absolute inset-0 bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                      {/* Code Pattern Background for non-image items */}
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px]"></div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                          {isPdf ? <DocumentIcon className="w-16 h-16" /> : <CodeBracketIcon className="w-16 h-16" />}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent"></div>
                  </div>
              )}

              {/* Delete Button (Top Right) */}
              <button
                onClick={(e) => {
                    e.stopPropagation(); // Critical: Prevent selecting the card
                    if(window.confirm(`确定要删除 "${item.name}" 吗？此操作无法撤销。`)) {
                        onDelete(item.id);
                    }
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-500 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md border border-white/10 z-50 hover:scale-110 shadow-lg"
                title="删除此项目"
              >
                <TrashIcon className="w-4 h-4" />
              </button>

              {/* Content Overlay */}
              <div className="relative z-10 flex flex-col h-full p-4 pointer-events-none">
                <div className="flex items-start justify-between">
                  <div className={`p-1 rounded-md border backdrop-blur-md ${hasImage ? 'bg-black/30 border-white/10 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                      {isPdf ? (
                          <DocumentIcon className="w-3.5 h-3.5" />
                      ) : hasImage ? (
                          <PhotoIcon className="w-3.5 h-3.5" />
                      ) : (
                          <CodeBracketIcon className="w-3.5 h-3.5" />
                      )}
                  </div>
                </div>
                
                <div className="mt-auto space-y-1">
                  <h3 className="text-sm font-medium text-zinc-200 group-hover:text-blue-300 truncate leading-tight transition-colors">
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500">
                        {item.timestamp.toLocaleDateString('zh-CN')}
                    </span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <span className="text-[10px] font-bold text-blue-500">加载</span>
                        <ArrowRightIcon className="w-3 h-3 text-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};