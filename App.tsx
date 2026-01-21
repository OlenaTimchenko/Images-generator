
import React, { useState, useCallback, useEffect } from 'react';
import { ICONS, ASPECT_RATIOS, RESOLUTIONS } from './constants';
import { AspectRatio, Resolution, GenerationSettings, GeneratedImage, UserFile } from './types';
import { generateImages } from './services/geminiService';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [referenceFile, setReferenceFile] = useState<UserFile | null>(null);
  const [settings, setSettings] = useState<GenerationSettings>({
    aspectRatio: '1:1',
    resolution: Resolution.Standard,
    count: 1
  });
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setReferenceFile({
          data: base64,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt && !referenceFile) return;

    // Check Pro requirements
    const isPro = settings.resolution === Resolution.TwoK || settings.resolution === Resolution.FourK;
    if (isPro) {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
    }

    setIsGenerating(true);
    setError(null);
    try {
      const urls = await generateImages(prompt, settings, referenceFile || undefined);
      const newImages: GeneratedImage[] = urls.map((url, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        url,
        prompt,
        timestamp: Date.now(),
        settings: { ...settings }
      }));
      setImages(prev => [...newImages, ...prev]);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
         // @ts-ignore
         await window.aistudio.openSelectKey();
      }
      setError("Failed to generate images. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumina-ai-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareImage = async (url: string) => {
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], 'generated-image.png', { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Lumina AI Generation',
          text: 'Look at this amazing image I created with Lumina AI!'
        });
      } else {
        alert("Sharing not supported on this browser.");
      }
    } catch (err) {
      console.error("Sharing failed", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0a0a0a]">
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 glass p-6 flex flex-col overflow-y-auto h-screen sticky top-0 border-r border-white/5">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <ICONS.Sparkles className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">LUMINA <span className="gradient-text">STUDIO</span></h1>
        </div>

        <section className="space-y-6 flex-1">
          {/* Photoshoot Upload */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Photoshoot Reference</label>
            <div 
              className={`relative border-2 border-dashed rounded-xl p-4 transition-colors text-center ${referenceFile ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-white/20'}`}
            >
              {referenceFile ? (
                <div className="space-y-2">
                  <img src={`data:${referenceFile.mimeType};base64,${referenceFile.data}`} className="w-full h-32 object-cover rounded-lg" alt="Reference" />
                  <button 
                    onClick={() => setReferenceFile(null)}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center justify-center gap-1 w-full"
                  >
                    <ICONS.Trash className="w-3 h-3" /> Remove Reference
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <ICONS.Camera className="w-6 h-6 mx-auto mb-2 text-zinc-500" />
                  <span className="text-sm text-zinc-400">Upload person photo</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map(ratio => (
                <button
                  key={ratio.value}
                  onClick={() => setSettings({ ...settings, aspectRatio: ratio.value as AspectRatio })}
                  className={`p-2 rounded-lg text-left transition-all border ${settings.aspectRatio === ratio.value ? 'bg-white/10 border-blue-500/50 text-white' : 'border-transparent text-zinc-500 hover:bg-white/5'}`}
                >
                  <div className="text-xs font-medium">{ratio.label}</div>
                  <div className="text-[10px] opacity-50">{ratio.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quality</label>
            <div className="space-y-2">
              {RESOLUTIONS.map(res => (
                <button
                  key={res.value}
                  onClick={() => setSettings({ ...settings, resolution: res.value as Resolution })}
                  className={`w-full p-2 rounded-lg flex items-center justify-between text-sm transition-all border ${settings.resolution === res.value ? 'bg-white/10 border-blue-500/50 text-white' : 'border-transparent text-zinc-500 hover:bg-white/5'}`}
                >
                  <span>{res.label}</span>
                  {settings.resolution === res.value && <ICONS.Check className="w-4 h-4 text-blue-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Series Count */}
          <div className="space-y-3 pb-6">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quantity</label>
            <div className="flex items-center gap-2">
              {[1, 2, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setSettings({ ...settings, count: num })}
                  className={`flex-1 p-2 rounded-lg text-sm transition-all border ${settings.count === num ? 'bg-white/10 border-blue-500/50 text-white' : 'border-transparent text-zinc-500 hover:bg-white/5'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sidebar Action */}
        <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt && !referenceFile)}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${isGenerating || (!prompt && !referenceFile) ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 active:scale-[0.98]'}`}
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white/20 loader rounded-full" />
            ) : (
              <>
                <ICONS.Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
          <p className="text-[10px] text-zinc-600 text-center">Lumina AI Studio v1.2</p>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Prompt Input Area */}
        <div className="max-w-4xl w-full mx-auto space-y-4 mb-8">
          <div className="relative group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={referenceFile ? "Describe the outfit, setting, and mood for the photoshoot..." : "Describe the image you want to create..."}
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 pr-4 text-lg focus:outline-none focus:border-blue-500/50 transition-all resize-none placeholder-zinc-600"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!prompt && !referenceFile)}
              className={`flex-1 py-4 rounded-2xl text-lg font-bold shadow-xl flex items-center justify-center gap-3 transition-all ${isGenerating || (!prompt && !referenceFile) ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99]'}`}
            >
              {isGenerating ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/20 loader rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  <ICONS.Plus className="w-6 h-6" />
                  Generate Images
                </>
              )}
            </button>
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </div>

        {/* Results Gallery */}
        <div className="flex-1 overflow-y-auto">
          {images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center">
                <ICONS.Image className="w-10 h-10 opacity-20" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-zinc-500">No creations yet</p>
                <p className="text-sm">Start by entering a prompt or uploading a reference photo</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-12">
              {images.map(image => (
                <div key={image.id} className="group relative rounded-2xl overflow-hidden glass hover:border-white/20 transition-all">
                  <div className="aspect-square bg-zinc-900 relative">
                    <img 
                      src={image.url} 
                      className={`w-full h-full object-contain ${image.settings.aspectRatio === '9:16' ? 'object-cover' : 'object-contain'}`}
                      alt={image.prompt} 
                    />
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <p className="text-xs text-zinc-300 line-clamp-2 mb-4 italic">"{image.prompt || 'AI Photoshoot'}"</p>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => downloadImage(image.url, image.id)}
                          className="flex-1 bg-white/10 hover:bg-white/20 p-2 rounded-lg flex items-center justify-center gap-2 text-xs font-medium backdrop-blur-sm transition-colors"
                        >
                          <ICONS.Download className="w-4 h-4" /> Download
                        </button>
                        <button 
                          onClick={() => shareImage(image.url)}
                          className="flex-1 bg-white/10 hover:bg-white/20 p-2 rounded-lg flex items-center justify-center gap-2 text-xs font-medium backdrop-blur-sm transition-colors"
                        >
                          <ICONS.Share className="w-4 h-4" /> Share
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                    <span className="bg-white/5 px-2 py-1 rounded uppercase">{image.settings.aspectRatio}</span>
                    <span className="bg-white/5 px-2 py-1 rounded uppercase">{image.settings.resolution}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
