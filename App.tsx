/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { Hero } from './components/Hero';
import { InputArea } from './components/InputArea';
import { LivePreview } from './components/LivePreview';
import { CreationHistory, Creation } from './components/CreationHistory';
import { ApiKeyModal } from './components/ApiKeyModal';
import { bringToLife, updateCode, validateApiKey } from './services/gemini';
import { ArrowUpTrayIcon, Cog6ToothIcon, CheckCircleIcon, ExclamationCircleIcon, KeyIcon } from '@heroicons/react/24/solid';

const MAX_HISTORY_ITEMS = 30;

const App: React.FC = () => {
  const [activeCreation, setActiveCreation] = useState<Creation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<Creation[]>([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const importInputRef = useRef<HTMLInputElement>(null);

  const checkApiConnection = async () => {
    const key = localStorage.getItem('user_gemini_api_key');
    if (!key) {
      setApiStatus('idle');
      // Small delay to ensure UI renders first
      setTimeout(() => setIsApiKeyModalOpen(true), 500);
      return;
    }
    setApiStatus('checking');
    const isValid = await validateApiKey(key);
    setApiStatus(isValid ? 'valid' : 'invalid');
  };

  // Initial Check for API Key
  useEffect(() => {
    checkApiConnection();
  }, []);

  // Load history from local storage or fetch examples on mount
  useEffect(() => {
    const initHistory = async () => {
      const saved = localStorage.getItem('gemini_app_history');
      let loadedHistory: Creation[] = [];

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          loadedHistory = parsed.map((item: any) => ({
              ...item,
              timestamp: new Date(item.timestamp)
          }));
        } catch (e) {
          console.error("Failed to load history", e);
        }
      }

      if (loadedHistory.length > 0) {
        setHistory(loadedHistory);
      } else {
        // If no history (new user or cleared), load examples
        try {
           const exampleUrls = [
               'https://storage.googleapis.com/sideprojects-asronline/bringanythingtolife/vibecode-blog.json',
               'https://storage.googleapis.com/sideprojects-asronline/bringanythingtolife/cassette.json',
               'https://storage.googleapis.com/sideprojects-asronline/bringanythingtolife/chess.json'
           ];

           const examples = await Promise.all(exampleUrls.map(async (url) => {
               const res = await fetch(url);
               if (!res.ok) return null;
               const data = await res.json();
               
               // Override names to be Chinese for the default examples
               let name = data.name;
               if (url.includes('vibecode-blog')) name = 'Vibe 博客';
               else if (url.includes('cassette')) name = '复古磁带';
               else if (url.includes('chess')) name = '国际象棋';

               return {
                   ...data,
                   name,
                   timestamp: new Date(data.timestamp || Date.now()),
                   id: data.id || crypto.randomUUID()
               };
           }));
           
           const validExamples = examples.filter((e): e is Creation => e !== null);
           setHistory(validExamples);
        } catch (e) {
            console.error("Failed to load examples", e);
        }
      }
    };

    initHistory();
  }, []);

  // Save history when it changes
  useEffect(() => {
    if (history.length > 0) {
        try {
            localStorage.setItem('gemini_app_history', JSON.stringify(history));
        } catch (e) {
            console.warn("Local storage full or error saving history", e);
        }
    } else {
        // If history is explicitly empty (and we've initialized), clear storage
        // Note: This runs on initial render too if history is empty, but initHistory handles that race slightly.
        // Better logic is handled in delete.
    }
  }, [history]);

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleError = (error: any) => {
      console.error(error);
      if (error.message === "API_KEY_MISSING") {
          setIsApiKeyModalOpen(true);
      } else if (error.toString().includes('403') || error.toString().includes('400')) {
          alert("API 密钥无效或请求被拒绝。请检查您的密钥设置。");
          setApiStatus('invalid');
          setIsApiKeyModalOpen(true);
      } else {
          alert("生成过程中出现问题。请重试。");
      }
  };

  const handleGenerate = async (promptText: string, file?: File) => {
    setIsGenerating(true);
    // Clear active creation to show loading state
    setActiveCreation(null);

    try {
      let imageBase64: string | undefined;
      let mimeType: string | undefined;

      if (file) {
        imageBase64 = await fileToBase64(file);
        mimeType = file.type.toLowerCase();
      }

      const html = await bringToLife(promptText, imageBase64, mimeType);
      
      if (html) {
        const newCreation: Creation = {
          id: crypto.randomUUID(),
          name: file ? file.name : '新创作',
          html: html,
          // Store the full data URL for easy display
          originalImage: imageBase64 && mimeType ? `data:${mimeType};base64,${imageBase64}` : undefined,
          timestamp: new Date(),
        };
        setActiveCreation(newCreation);
        // Add to history and enforce limit
        setHistory(prev => [newCreation, ...prev].slice(0, MAX_HISTORY_ITEMS));
      }

    } catch (error) {
      handleError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdate = async (prompt: string) => {
    if (!activeCreation) return;
    setIsGenerating(true);

    try {
        const newHtml = await updateCode(activeCreation.html, prompt);
        
        if (newHtml) {
            const updatedCreation: Creation = {
                ...activeCreation,
                id: crypto.randomUUID(), // New ID for history tracking
                name: `${activeCreation.name} (v2)`, // Indicate versioning
                html: newHtml,
                timestamp: new Date()
            };
            
            // Add to history, set as active, and enforce limit
            setHistory(prev => [updatedCreation, ...prev].slice(0, MAX_HISTORY_ITEMS));
            setActiveCreation(updatedCreation);
        }
    } catch (error) {
        handleError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setActiveCreation(null);
    setIsGenerating(false);
  };

  const handleSelectCreation = (creation: Creation) => {
    setActiveCreation(creation);
  };

  const handleDeleteCreation = (id: string) => {
    // If we are deleting the currently active creation, close the preview
    if (activeCreation?.id === id) {
        setActiveCreation(null);
    }

    setHistory(prev => {
        const newHistory = prev.filter(item => item.id !== id);
        // If history is completely cleared, clear local storage
        if (newHistory.length === 0) {
             localStorage.removeItem('gemini_app_history');
        }
        return newHistory;
    });
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = event.target?.result as string;
            const parsed = JSON.parse(json);
            
            // Basic validation
            if (parsed.html && parsed.name) {
                const importedCreation: Creation = {
                    ...parsed,
                    timestamp: new Date(parsed.timestamp || Date.now()),
                    id: parsed.id || crypto.randomUUID()
                };
                
                // Add to history if not already there (by ID check), ensure limit
                setHistory(prev => {
                    const exists = prev.some(c => c.id === importedCreation.id);
                    if (exists) return prev;
                    return [importedCreation, ...prev].slice(0, MAX_HISTORY_ITEMS);
                });

                // Set as active immediately
                setActiveCreation(importedCreation);
            } else {
                alert("无效的文件格式。");
            }
        } catch (err) {
            console.error("Import error", err);
            alert("导入失败。");
        }
        // Reset input
        if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleApiKeySaved = () => {
      setIsApiKeyModalOpen(false);
      checkApiConnection(); // Re-validate when user saves
  };

  const isFocused = !!activeCreation || isGenerating;

  return (
    <div className="h-[100dvh] bg-zinc-950 bg-dot-grid text-zinc-50 selection:bg-blue-500/30 overflow-y-auto overflow-x-hidden relative flex flex-col">
      
      {/* Settings Button & Status Indicator (Top Right) */}
      {/* Hidden when focused to avoid overlap with LivePreview header */}
      <div className={`absolute top-4 right-4 z-50 flex items-center gap-3 transition-all duration-500 ${isFocused ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100'}`}>
        {/* Status Indicator */}
        {apiStatus !== 'idle' && (
            <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all duration-500
                ${apiStatus === 'checking' ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400' : ''}
                ${apiStatus === 'valid' ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : ''}
                ${apiStatus === 'invalid' ? 'bg-red-500/10 border-red-500/20 text-red-400' : ''}
            `}>
                {apiStatus === 'checking' && (
                    <>
                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                        <span className="text-[10px] font-mono font-medium">连接中...</span>
                    </>
                )}
                {apiStatus === 'valid' && (
                    <>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_currentColor]"></div>
                        <span className="text-[10px] font-mono font-medium">API 正常</span>
                    </>
                )}
                {apiStatus === 'invalid' && (
                    <>
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        <span className="text-[10px] font-mono font-medium">API 错误</span>
                    </>
                )}
            </div>
        )}

        <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 rounded-full border border-zinc-800 transition-all backdrop-blur-sm group hover:border-zinc-600"
            title="配置 API 密钥"
        >
            <Cog6ToothIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            <span className="text-xs font-medium">配置 Key</span>
        </button>
      </div>

      {/* Centered Content Container */}
      <div 
        className={`
          min-h-full flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10 
          transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)
          ${isFocused 
            ? 'opacity-0 scale-95 blur-sm pointer-events-none h-[100dvh] overflow-hidden' 
            : 'opacity-100 scale-100 blur-0'
          }
        `}
      >
        {/* Main Vertical Centering Wrapper */}
        <div className="flex-1 flex flex-col justify-center items-center w-full py-12 md:py-20">
          
          {/* 1. Hero Section */}
          <div className="w-full mb-8 md:mb-16">
              <Hero />
          </div>

          {/* 2. Input Section */}
          <div className="w-full flex justify-center mb-8">
              <InputArea onGenerate={handleGenerate} isGenerating={isGenerating} disabled={isFocused} />
          </div>

        </div>
        
        {/* 3. History Section & Footer - Stays at bottom */}
        <div className="flex-shrink-0 pb-6 w-full mt-auto flex flex-col items-center gap-6">
            <div className="w-full px-2 md:px-0">
                <CreationHistory 
                    history={history} 
                    onSelect={handleSelectCreation} 
                    onDelete={handleDeleteCreation} 
                />
            </div>
            
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-600">
                <a 
                  href="https://x.com/ammaar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-zinc-400 transition-colors"
                >
                  由 @ammaar 制作
                </a>
                <span className="text-zinc-800">|</span>
                <button 
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="flex items-center gap-1 hover:text-blue-400 transition-colors group"
                >
                    <KeyIcon className="w-3 h-3 group-hover:text-blue-400" />
                    更换 API Key
                </button>
            </div>
        </div>
      </div>

      {/* Live Preview - Always mounted for smooth transition */}
      <LivePreview
        creation={activeCreation}
        isLoading={isGenerating}
        isFocused={isFocused}
        onReset={handleReset}
        onUpdate={handleUpdate}
        onOpenSettings={() => setIsApiKeyModalOpen(true)}
      />

      {/* Subtle Import Button (Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-50">
        <button 
            onClick={handleImportClick}
            className="flex items-center space-x-2 p-2 text-zinc-500 hover:text-zinc-300 transition-colors opacity-60 hover:opacity-100"
            title="导入作品"
        >
            <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline">上传之前的作品</span>
            <ArrowUpTrayIcon className="w-5 h-5" />
        </button>
        <input 
            type="file" 
            ref={importInputRef} 
            onChange={handleImportFile} 
            accept=".json" 
            className="hidden" 
        />
      </div>

      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setIsApiKeyModalOpen(false)} 
        onSave={handleApiKeySaved}
      />

    </div>
  );
};

export default App;