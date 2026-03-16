import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  Plus, 
  X, 
  Play, 
  Download, 
  Loader2, 
  Key, 
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Code2,
  Variable,
  Maximize2,
  Layout
} from 'lucide-react';
import { GeneratedImage, AppState } from './types';
import { editImage, checkApiKey, openKeySelector } from './services/geminiService';

export default function App() {
  const [state, setState] = useState<AppState>({
    originalImage: null,
    prompts: [''],
    dataJson: '{\n  "name": "Cyberpunk",\n  "color": "neon pink"\n}',
    results: [],
    isProcessing: false,
    apiKeySelected: false,
    imageSize: "1K",
    aspectRatio: "auto",
    model: "gemini-3.1-flash-image-preview"
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyKey = async () => {
      const hasKey = await checkApiKey();
      setState(prev => ({ ...prev, apiKeySelected: hasKey }));
    };
    verifyKey();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ ...prev, originalImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addPrompt = () => {
    setState(prev => ({ ...prev, prompts: [...prev.prompts, ''] }));
  };

  const updatePrompt = (index: number, value: string) => {
    const newPrompts = [...state.prompts];
    newPrompts[index] = value;
    setState(prev => ({ ...prev, prompts: newPrompts }));
  };

  const removePrompt = (index: number) => {
    if (state.prompts.length > 1) {
      const newPrompts = state.prompts.filter((_, i) => i !== index);
      setState(prev => ({ ...prev, prompts: newPrompts }));
    }
  };

  const handleSelectKey = async () => {
    await openKeySelector();
    // Assume success and proceed as per guidelines
    setState(prev => ({ ...prev, apiKeySelected: true }));
  };

  const processWildcards = (text: string, data: any) => {
    let processed = text;
    Object.keys(data).forEach(key => {
      const value = data[key];
      // Replace $key with value
      const regex = new RegExp(`\\$${key}`, 'g');
      processed = processed.replace(regex, String(value));
    });
    return processed;
  };

  const startProcessing = async () => {
    if (!state.originalImage) {
      setError("Please upload an image first.");
      return;
    }
    
    const validPrompts = state.prompts.filter(p => p.trim().length > 0);
    if (validPrompts.length === 0) {
      setError("Please add at least one prompt.");
      return;
    }

    let jsonData: any = {};
    try {
      if (state.dataJson.trim()) {
        jsonData = JSON.parse(state.dataJson);
      }
    } catch (e) {
      setError("Invalid JSON data. Please check your syntax (e.g., wrap lists in [ ] and ensure keys are quoted).");
      return;
    }

    setError(null);
    
    // Handle both single object and array of objects
    const dataItems = Array.isArray(jsonData) ? jsonData : [jsonData];
    
    const resultsToProcess: { id: string; prompt: string; finalPrompt: string; status: 'pending' }[] = [];
    
    dataItems.forEach((dataItem: any) => {
      validPrompts.forEach((p) => {
        const finalPrompt = processWildcards(p, dataItem);
        resultsToProcess.push({
          id: Math.random().toString(36).substr(2, 9),
          prompt: p,
          finalPrompt: finalPrompt,
          status: 'pending'
        });
      });
    });

    setState(prev => ({ 
      ...prev, 
      isProcessing: true,
      results: resultsToProcess.map(r => ({
        id: r.id,
        prompt: r.finalPrompt, // Show the final prompt in the UI
        url: '',
        status: 'pending'
      }))
    }));

    for (let i = 0; i < resultsToProcess.length; i++) {
      const item = resultsToProcess[i];
      
      setState(prev => {
        const newResults = [...prev.results];
        newResults[i].status = 'processing';
        return { ...prev, results: newResults };
      });

      try {
        const resultUrl = await editImage(
          state.originalImage, 
          item.finalPrompt,
          state.imageSize,
          state.aspectRatio,
          state.model
        );
        setState(prev => {
          const newResults = [...prev.results];
          newResults[i].url = resultUrl;
          newResults[i].status = 'completed';
          return { ...prev, results: newResults };
        });
      } catch (err: any) {
        console.error(`Error processing prompt "${item.finalPrompt}":`, err);
        setState(prev => {
          const newResults = [...prev.results];
          newResults[i].status = 'error';
          newResults[i].error = err.message || "Failed to generate image";
          return { ...prev, results: newResults };
        });
      }
    }

    setState(prev => ({ ...prev, isProcessing: false }));
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-12 text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4"
        >
          <Sparkles className="w-3 h-3" />
          Powered by {state.model === 'gemini-3.1-flash-image-preview' ? 'Nano Banana 2' : 'Nano Banana Pro'}
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-4">
          Batch <span className="text-emerald-600">Editor</span>
        </h1>
        <p className="text-zinc-500 max-w-2xl mx-auto text-lg">
          Upload an image and apply multiple AI prompts with dynamic wildcards.
        </p>
      </header>

      {!state.apiKeySelected && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto mb-12 p-6 rounded-2xl bg-zinc-900 text-white shadow-xl text-center"
        >
          <Key className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
          <h2 className="text-xl font-bold mb-2">API Key Required</h2>
          <p className="text-zinc-400 text-sm mb-6">
            {state.model === 'gemini-3.1-flash-image-preview' ? 'Nano Banana 2' : 'Nano Banana Pro'} requires a paid API key. Please select your key to continue.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-900 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Select API Key
          </button>
          <p className="mt-4 text-[10px] text-zinc-500">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-300">Learn about billing</a>
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 space-y-8">
          {/* Image Upload */}
          <section className="glass rounded-3xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Source Image
            </h3>
            
            <div className="relative group">
              {state.originalImage ? (
                <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-zinc-200">
                  <img 
                    src={state.originalImage} 
                    alt="Original" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => setState(prev => ({ ...prev, originalImage: null }))}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100 hover:border-emerald-400 transition-all cursor-pointer group">
                  <Upload className="w-12 h-12 text-zinc-300 group-hover:text-emerald-500 mb-4 transition-colors" />
                  <span className="text-sm font-medium text-zinc-500">Click to upload image</span>
                  <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                </label>
              )}
            </div>
          </section>

          {/* Image Configuration */}
          <section className="glass rounded-3xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <Maximize2 className="w-4 h-4" />
              Output Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Model
                </label>
                <select 
                  value={state.model}
                  onChange={(e) => setState(prev => ({ ...prev, model: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 border-transparent text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  disabled={state.isProcessing}
                >
                  <option value="gemini-3.1-flash-image-preview">Nano Banana 2</option>
                  <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" /> Size
                  </label>
                  <select 
                    value={state.imageSize}
                    onChange={(e) => setState(prev => ({ ...prev, imageSize: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 border-transparent text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    disabled={state.isProcessing}
                  >
                    <option value="1K">1K (Standard)</option>
                    <option value="2K">2K (High)</option>
                    <option value="4K">4K (Ultra)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Layout className="w-3 h-3" /> Aspect Ratio
                  </label>
                  <select 
                    value={state.aspectRatio}
                    onChange={(e) => setState(prev => ({ ...prev, aspectRatio: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 border-transparent text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    disabled={state.isProcessing}
                  >
                    <option value="auto">Auto (Original)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3 (Classic)</option>
                    <option value="3:4">3:4 (Portrait)</option>
                    <option value="16:9">16:9 (Wide)</option>
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="1:4">1:4 (Tall)</option>
                    <option value="4:1">4:1 (Panoramic)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* JSON Data Input */}
          <section className="glass rounded-3xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              Wildcard Data (JSON)
            </h3>
            <p className="text-[10px] text-zinc-400 mb-3">
              Use <code className="bg-zinc-100 px-1 rounded">$key</code> in prompts to inject values from this JSON.
            </p>
            <textarea
              value={state.dataJson}
              onChange={(e) => setState(prev => ({ ...prev, dataJson: e.target.value }))}
              className="w-full h-32 px-4 py-3 rounded-xl bg-zinc-100 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-xs font-mono custom-scrollbar"
              placeholder='{ "name": "Cyberpunk", "color": "neon pink" }'
              disabled={state.isProcessing}
            />
          </section>

          {/* Prompt List */}
          <section className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Variable className="w-4 h-4" />
                Edit Prompts
              </h3>
              <button 
                onClick={addPrompt}
                className="p-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                disabled={state.isProcessing}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {state.prompts.map((prompt, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex gap-2 items-start"
                  >
                    <textarea
                      value={prompt}
                      onChange={(e) => updatePrompt(index, e.target.value)}
                      placeholder="e.g., Make it $name style with $color"
                      className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm min-h-[80px] resize-none custom-scrollbar"
                      disabled={state.isProcessing}
                    />
                    <button 
                      onClick={() => removePrompt(index)}
                      className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mt-1"
                      disabled={state.isProcessing || state.prompts.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              onClick={startProcessing}
              disabled={state.isProcessing || !state.apiKeySelected || !state.originalImage}
              className="w-full mt-6 py-4 rounded-2xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-zinc-200"
            >
              {state.isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Batch...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Generate Variations
                </>
              )}
            </button>
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7">
          <section className="glass rounded-3xl p-6 min-h-[600px]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Generated Results
            </h3>

            {state.results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[500px] text-zinc-300">
                <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Your variations will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <AnimatePresence>
                  {state.results.map((result) => (
                    <motion.div 
                      key={result.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-200"
                    >
                      <div className="aspect-square relative flex items-center justify-center bg-zinc-100">
                        {result.status === 'processing' && (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Processing</span>
                          </div>
                        )}
                        {result.status === 'pending' && (
                          <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-zinc-400 animate-spin" />
                        )}
                        {result.status === 'completed' && (
                          <img 
                            src={result.url} 
                            alt={result.prompt} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {result.status === 'error' && (
                          <div className="p-6 text-center">
                            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                            <p className="text-xs text-red-500 font-medium">{result.error}</p>
                          </div>
                        )}

                        {/* Hover Overlay */}
                        {result.status === 'completed' && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button 
                              onClick={() => downloadImage(result.url, `variation-${result.id}.png`)}
                              className="p-3 bg-white text-zinc-900 rounded-xl hover:scale-110 transition-transform"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-white">
                        <p className="text-xs font-medium text-zinc-600 italic break-words">
                          "{result.prompt}"
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-zinc-200 text-center text-zinc-400 text-sm">
        <p>© 2026 AI Studio Build • Image Batch Editor</p>
      </footer>
    </div>
  );
}
