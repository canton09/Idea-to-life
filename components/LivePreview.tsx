/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useRef } from 'react';
import { ArrowDownTrayIcon, PlusIcon, ViewColumnsIcon, DocumentIcon, CodeBracketIcon, XMarkIcon, PaperAirplaneIcon, SparklesIcon, LockClosedIcon, KeyIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Creation } from './CreationHistory';

interface LivePreviewProps {
  creation: Creation | null;
  isLoading: boolean;
  isFocused: boolean;
  onReset: () => void;
  onUpdate: (prompt: string) => void;
  onOpenSettings: () => void;
}

// Add type definition for the global pdfjsLib
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const LoadingStep = ({ text, active, completed }: { text: string, active: boolean, completed: boolean }) => (
    <div className={`flex items-center space-x-3 transition-all duration-500 ${active || completed ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-4'}`}>
        <div className={`w-4 h-4 flex items-center justify-center ${completed ? 'text-green-400' : active ? 'text-blue-400' : 'text-zinc-700'}`}>
            {completed ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : active ? (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
            ) : (
                <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div>
            )}
        </div>
        <span className={`font-mono text-xs tracking-wide uppercase ${active ? 'text-zinc-200' : completed ? 'text-zinc-400 line-through' : 'text-zinc-600'}`}>{text}</span>
    </div>
);

const PdfRenderer = ({ dataUrl }: { dataUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderPdf = async () => {
      if (!window.pdfjsLib) {
        setError("PDF 库未初始化");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Load the document
        const loadingTask = window.pdfjsLib.getDocument(dataUrl);
        const pdf = await loadingTask.promise;
        
        // Get the first page
        const page = await pdf.getPage(1);
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        
        // Calculate scale to make it look good (High DPI)
        const viewport = page.getViewport({ scale: 2.0 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        setLoading(false);
      } catch (err) {
        console.error("Error rendering PDF:", err);
        setError("无法渲染 PDF 预览。");
        setLoading(false);
      }
    };

    renderPdf();
  }, [dataUrl]);

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6 text-center">
            <DocumentIcon className="w-12 h-12 mb-3 opacity-50 text-red-400" />
            <p className="text-sm mb-2 text-red-400/80">{error}</p>
        </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        )}
        <canvas 
            ref={canvasRef} 
            className={`max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
        />
    </div>
  );
};

export const LivePreview: React.FC<LivePreviewProps> = ({ creation, isLoading, isFocused, onReset, onUpdate, onOpenSettings }) => {
    const [loadingStep, setLoadingStep] = useState(0);
    const [showSplitView, setShowSplitView] = useState(false);
    const [updatePrompt, setUpdatePrompt] = useState("");

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");

    // Handle loading animation steps
    useEffect(() => {
        if (isLoading) {
            setLoadingStep(0);
            const interval = setInterval(() => {
                setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
            }, 2000); 
            return () => clearInterval(interval);
        } else {
            setLoadingStep(0);
        }
    }, [isLoading]);

    // Default to Split View when a new creation with an image is loaded
    useEffect(() => {
        if (creation?.originalImage) {
            setShowSplitView(true);
        } else {
            setShowSplitView(false);
        }
    }, [creation]);

    const handleExport = () => {
        if (!creation) return;
        const dataStr = JSON.stringify(creation, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${creation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_artifact.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (updatePrompt.trim()) {
            onUpdate(updatePrompt);
            setUpdatePrompt("");
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === "canton09" && password === "WW810922") {
            setIsAuthenticated(true);
            setShowLogin(false);
            setAuthError("");
            setUsername("");
            setPassword("");
        } else {
            setAuthError("访问被拒绝：凭证无效");
            setPassword(""); // Clear password on error
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
    };

  return (
    <div
      className={`
        fixed z-40 flex flex-col
        rounded-lg overflow-hidden border border-zinc-800 bg-[#0E0E10] shadow-2xl
        transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)
        ${isFocused
          ? 'inset-2 md:inset-4 opacity-100 scale-100'
          : 'top-1/2 left-1/2 w-[90%] h-[60%] -translate-x-1/2 -translate-y-1/2 opacity-0 scale-95 pointer-events-none'
        }
      `}
    >
      {/* Minimal Technical Header */}
      <div className="bg-[#121214] px-4 py-3 flex items-center justify-between border-b border-zinc-800 shrink-0">
        {/* Left: Controls */}
        <div className="flex items-center space-x-3 w-32">
           <div className="flex space-x-2 group/controls mr-2">
                <button 
                  onClick={onReset}
                  className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-red-500 hover:!bg-red-600 transition-colors flex items-center justify-center focus:outline-none"
                  title="关闭预览"
                >
                  <XMarkIcon className="w-2 h-2 text-black opacity-0 group-hover/controls:opacity-100" />
                </button>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-yellow-500 transition-colors"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-green-500 transition-colors"></div>
           </div>
           
           {/* Settings Access in Preview */}
           <button 
             onClick={onOpenSettings} 
             className="text-zinc-600 hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-zinc-800"
             title="API Key 设置"
           >
             <Cog6ToothIcon className="w-4 h-4" />
           </button>
        </div>
        
        {/* Center: Title */}
        <div className="flex items-center space-x-2 text-zinc-500">
            <CodeBracketIcon className="w-3 h-3" />
            <span className="text-[11px] font-mono uppercase tracking-wider">
                {isLoading ? '系统处理中...' : creation ? creation.name : '预览模式'}
            </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end space-x-1 w-32">
            {!isLoading && creation && (
                <>
                    {creation.originalImage && (
                         <button 
                            onClick={() => setShowSplitView(!showSplitView)}
                            title={showSplitView ? "仅显示应用" : "与原图对比"}
                            className={`p-1.5 rounded-md transition-all ${showSplitView ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            <ViewColumnsIcon className="w-4 h-4" />
                        </button>
                    )}

                    <button 
                        onClick={handleExport}
                        title="导出成品 (JSON)"
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>

                    <button 
                        onClick={onReset}
                        title="新建上传"
                        className="ml-2 flex items-center space-x-1 text-xs font-bold bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded-md transition-colors"
                    >
                        <PlusIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">新建</span>
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full flex-1 bg-[#09090b] flex overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 w-full z-10 bg-[#09090b]">
             {/* Technical Loading State */}
             <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 mb-6 text-blue-500 animate-spin-slow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-zinc-100 font-mono text-lg tracking-tight">正在构建环境</h3>
                    <p className="text-zinc-500 text-sm mt-2">正在优化程序代码...</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[loading_3s_ease-in-out_infinite] w-1/3"></div>
                </div>

                 {/* Terminal Steps */}
                 <div className="border border-zinc-800 bg-black/50 rounded-lg p-4 space-y-3 font-mono text-sm">
                     <LoadingStep text="正在分析请求" active={loadingStep === 0} completed={loadingStep > 0} />
                     <LoadingStep text="正在重构代码" active={loadingStep === 1} completed={loadingStep > 1} />
                     <LoadingStep text="正在应用更改" active={loadingStep === 2} completed={loadingStep > 2} />
                     <LoadingStep text="正在重新编译" active={loadingStep === 3} completed={loadingStep > 3} />
                 </div>
             </div>
          </div>
        ) : creation?.html ? (
          <>
            {/* Split View: Left Panel (Original Image) */}
            {showSplitView && creation.originalImage && (
                <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-zinc-800 bg-[#0c0c0e] relative flex flex-col shrink-0">
                    <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur text-zinc-400 text-[10px] font-mono uppercase px-2 py-1 rounded border border-zinc-800">
                        输入源
                    </div>
                    <div className="w-full h-full p-6 flex items-center justify-center overflow-hidden">
                        {creation.originalImage.startsWith('data:application/pdf') ? (
                            <PdfRenderer dataUrl={creation.originalImage} />
                        ) : (
                            <img 
                                src={creation.originalImage} 
                                alt="原始输入" 
                                className="max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* App Preview Panel */}
            <div className={`relative h-full bg-white transition-all duration-500 ${showSplitView && creation.originalImage ? 'w-full md:w-1/2 h-1/2 md:h-full' : 'w-full'}`}>
                 <iframe
                    title="Gemini 实时预览"
                    srcDoc={creation.html}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                />
            </div>
          </>
        ) : null}
      </div>

      {/* Footer / Modification Bar (Gated) */}
      {!isLoading && creation && (
        <div className="bg-[#121214] border-t border-zinc-800 p-3 shrink-0 min-h-[64px] flex items-center justify-center transition-all duration-300">
            {isAuthenticated ? (
                /* Authenticated State: Modification Input */
                <form onSubmit={handleUpdateSubmit} className="relative max-w-3xl mx-auto w-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="absolute -top-10 left-0 bg-blue-900/30 text-blue-400 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1">
                        <KeyIcon className="w-3 h-3" />
                        管理员已登录: CANTON09
                    </div>
                    
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SparklesIcon className="h-4 w-4 text-zinc-500" />
                        </div>
                        <input
                            type="text"
                            value={updatePrompt}
                            onChange={(e) => setUpdatePrompt(e.target.value)}
                            placeholder="输入指令以修改程序 (例如：把背景改成星空，增加计分板...)"
                            className="block w-full rounded-md border-0 py-2.5 pl-10 pr-4 bg-zinc-900 text-zinc-200 placeholder:text-zinc-600 focus:ring-1 focus:ring-blue-500 sm:text-sm sm:leading-6 font-mono shadow-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!updatePrompt.trim()}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <PaperAirplaneIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">发送</span>
                    </button>
                    <button 
                        type="button" 
                        onClick={handleLogout}
                        className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-md transition-colors"
                        title="退出管理员模式"
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    </button>
                </form>
            ) : (
                /* Unauthenticated State: Login Trigger */
                <div className="w-full flex justify-center">
                    {showLogin ? (
                         <form onSubmit={handleLogin} className="flex items-center space-x-2 bg-zinc-900/50 p-1.5 rounded-md border border-zinc-700 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center text-zinc-500 px-2 border-r border-zinc-700 mr-1">
                                <LockClosedIcon className="w-3 h-3 mr-1.5" />
                                <span className="text-[10px] font-mono tracking-wider">ADMIN_AUTH</span>
                            </div>
                            
                            <input 
                                type="text" 
                                placeholder="用户名" 
                                className="bg-black border border-zinc-700 text-zinc-300 text-xs px-2 py-1.5 rounded w-28 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono placeholder:text-zinc-700"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                autoFocus
                            />
                            <input 
                                type="password" 
                                placeholder="密码" 
                                className="bg-black border border-zinc-700 text-zinc-300 text-xs px-2 py-1.5 rounded w-28 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono placeholder:text-zinc-700"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            
                            <button type="submit" className="bg-zinc-100 hover:bg-white text-zinc-900 text-xs px-3 py-1.5 rounded font-bold font-mono transition-colors">
                                登录
                            </button>
                            
                            {authError && (
                                <span className="text-red-500 text-[10px] font-mono px-1 animate-pulse">{authError}</span>
                            )}
                            
                            <button type="button" onClick={() => {setShowLogin(false); setAuthError("");}} className="text-zinc-500 hover:text-zinc-300 ml-1">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                         </form>
                    ) : (
                        <button 
                            onClick={() => setShowLogin(true)}
                            className="group flex items-center space-x-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-zinc-500 hover:text-zinc-300"
                        >
                            <LockClosedIcon className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" />
                            <span className="text-xs font-mono tracking-wide">启用管理员修改模式</span>
                        </button>
                    )}
                </div>
            )}
        </div>
      )}
    </div>
  );
};