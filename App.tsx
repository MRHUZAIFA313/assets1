import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Category, VisualAsset, GenerationResult, VisualControls, EnhancerCategory, INITIAL_CATEGORIES } from './types';
import { ICONS } from './constants';
import { generateImage } from './services/geminiService';

const DEFAULT_ASSETS: VisualAsset[] = [
  {
    id: '1',
    name: 'Cyber Samurai',
    type: 'Character',
    description: 'A robotic warrior with a glowing katana',
    promptSnippet: 'a futuristic robotic samurai with neon pink glowing edges and a translucent katana',
    imageUrl: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&q=80&w=400',
    tags: ['CHAR'],
    createdAt: Date.now()
  }
];

const ENHANCER_OPTIONS: Record<EnhancerCategory, { label: string, options: string[] }> = {
  Style: { label: 'Style', options: ['Auto', 'Cinematic', 'Photorealistic', 'Digital Art', '3D Render', 'Anime', 'Cyberpunk', 'Minimalism', 'Surrealism', 'Oil Painting', 'Sketch', 'Vaporwave'] },
  Lighting: { label: 'Lighting', options: ['Auto', 'Golden Hour', 'Studio Lighting', 'Neon Glow', 'Dramatic Shadows', 'Soft Natural', 'Moonlight', 'Volumetric'] },
  CameraAngle: { label: 'Camera Angle', options: ['Auto', 'Wide Angle', 'Close-up', 'Macro', 'Low Angle', 'Top Down', 'Fisheye'] },
  Mood: { label: 'Mood', options: ['Auto', 'Energetic', 'Calm/Zen', 'Melancholic', 'Mysterious', 'Epic', 'Whimsical', 'Gritty'] },
  ColorPalette: { label: 'Color Palette', options: ['Auto', 'Monochromatic', 'Complementary', 'Cyberpunk Neon', 'Pastel Dream', 'Vintage Film'] },
  TextureMaterial: { label: 'Texture', options: ['Auto', 'Organic', 'Polished Chrome', 'Soft Velvet', 'Liquid Metal', 'Holographic'] },
  ArtistInfluence: { label: 'Artist Influence', options: ['Auto', 'Salvador Dali', 'Wes Anderson', 'Greg Rutkowski', 'Roger Deakins', 'Hayao Miyazaki'] },
  Motion: { label: 'Motion', options: ['Auto', 'Static', 'Subtle', 'Dynamic', 'Chaotic'] },
  AspectRatio: { label: 'Aspect Ratio', options: ['Auto', '1:1', '16:9', '9:16', '4:3', '3:2'] },
};

const INITIAL_CONTROLS: VisualControls = {
  Style: 'Auto', Lighting: 'Auto', CameraAngle: 'Auto', Mood: 'Auto', ColorPalette: 'Auto', TextureMaterial: 'Auto', ArtistInfluence: 'Auto', Motion: 'Auto', AspectRatio: 'Auto'
};

export default function App() {
  // Navigation
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'assets' | 'history' | 'settings' | 'create-dna' | 'create-category'>('assets');
  
  // Data State
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [activeCategoryName, setActiveCategoryName] = useState<string>(categories[0].name);
  const [assets, setAssets] = useState<VisualAsset[]>(DEFAULT_ASSETS);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  
  // Generation State
  const [userPrompt, setUserPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<string | null>(null);
  const [externalReference, setExternalReference] = useState<string | null>(null);
  const [controls, setControls] = useState<VisualControls>(INITIAL_CONTROLS);
  const [isEnhancerExpanded, setIsEnhancerExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    model: 'gemini-2.5-flash-image',
    quality: 'Balanced',
    resolution: '1024x1024',
    seed: 0
  });

  // Inline Forms
  const [newCat, setNewCat] = useState({ name: '', description: '' });
  const [newAsset, setNewAsset] = useState({ name: '', prompt: '', category: '', image: '' });
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetFormFileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const selectedAssets = useMemo(() => assets.filter(a => selectedAssetIds.includes(a.id)), [assets, selectedAssetIds]);
  const activeCategoryAssets = useMemo(() => assets.filter(a => a.type === activeCategoryName), [assets, activeCategoryName]);

  const toggleTab = (tab: typeof activeTab) => {
    if (activeTab === tab && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      // Explicit reset when navigating to creation forms via sidebar
      if (tab === 'create-category') {
        setNewCat({ name: '', description: '' });
      }
      if (tab === 'create-dna') {
        setEditingAssetId(null);
        setNewAsset({ name: '', prompt: '', category: activeCategoryName || (categories[0]?.name || ''), image: '' });
      }
      
      setActiveTab(tab);
      setSidebarOpen(true);
    }
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    const promptParts = selectedAssets.map(a => a.promptSnippet);
    Object.entries(controls).forEach(([key, val]) => {
      if (val !== 'Auto') promptParts.push(`${val} ${key}`);
    });
    if (userPrompt) promptParts.push(userPrompt);

    try {
      const result = await generateImage(
        promptParts.join(', '), 
        externalReference ? [{ data: externalReference, mimeType: 'image/jpeg' }] : [], 
        controls.AspectRatio, 
        settings.model,
        settings.seed > 0 ? settings.seed : undefined
      );
      if (result) {
        setCurrentResult(result);
        setHistory(prev => [{ id: Date.now().toString(), url: result, prompt: promptParts.join(', '), timestamp: Date.now(), assetsUsed: [...selectedAssetIds] }, ...prev]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!currentResult) return;
    const link = document.createElement('a');
    link.href = currentResult;
    link.download = `visionary-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prompt box auto-expansion
  useEffect(() => {
    if (promptRef.current) {
      promptRef.current.style.height = 'auto';
      const scrollHeight = promptRef.current.scrollHeight;
      const maxHeight = 120; 
      promptRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [userPrompt]);

  const deleteCategory = (name: string) => {
    if (window.confirm('Delete this category and its assets? This cannot be undone.')) {
      const updatedCategories = categories.filter(c => c.name !== name);
      const updatedAssets = assets.filter(a => a.type !== name);
      
      setCategories(updatedCategories);
      setAssets(updatedAssets);
      // Deselect assets that were removed
      setSelectedAssetIds(prev => prev.filter(id => updatedAssets.some(a => a.id === id)));
      
      // If we deleted the active category, switch to the first available or clear it
      if (activeCategoryName === name) {
        setActiveCategoryName(updatedCategories.length > 0 ? updatedCategories[0].name : '');
      }
    }
  };

  const handleDeleteAsset = (id: string) => {
    if (window.confirm("Remove this asset from your DNA library?")) {
      const updatedAssets = assets.filter(a => a.id !== id);
      setAssets(updatedAssets);
      setSelectedAssetIds(prev => prev.filter(sid => sid !== id));
    }
  };

  const addCategory = () => {
    const name = newCat.name.trim();
    if (!name) {
      alert("Category name is required.");
      return;
    }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert("A category with this name already exists.");
      return;
    }
    setCategories([...categories, { name, description: newCat.description.trim() }]);
    setNewCat({ name: '', description: '' });
    setActiveTab('assets');
    setActiveCategoryName(name);
  };

  const saveAsset = () => {
    if (!newAsset.name.trim() || !newAsset.prompt.trim() || !newAsset.category) {
      alert("Name, Category, and Prompt Signature are required.");
      return;
    }
    if (!newAsset.image) {
      alert("Visual DNA image is required.");
      return;
    }

    if (editingAssetId) {
      setAssets(assets.map(a => a.id === editingAssetId ? {
        ...a,
        name: newAsset.name.trim(),
        type: newAsset.category,
        promptSnippet: newAsset.prompt.trim(),
        imageUrl: newAsset.image
      } : a));
      setEditingAssetId(null);
    } else {
      const asset: VisualAsset = {
        id: Date.now().toString(),
        name: newAsset.name.trim(),
        type: newAsset.category,
        description: '',
        promptSnippet: newAsset.prompt.trim(),
        imageUrl: newAsset.image,
        tags: [],
        createdAt: Date.now()
      };
      setAssets([...assets, asset]);
    }
    
    setNewAsset({ name: '', prompt: '', category: activeCategoryName || (categories[0]?.name || ''), image: '' });
    setActiveTab('assets');
  };

  const handleEditAsset = (asset: VisualAsset) => {
    setNewAsset({
      name: asset.name,
      prompt: asset.promptSnippet,
      category: asset.type,
      image: asset.imageUrl || ''
    });
    setEditingAssetId(asset.id);
    setActiveTab('create-dna');
  };

  const handleAssetFormFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setNewAsset(prev => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-white overflow-hidden">
      
      {/* 1. LEFT RAIL NAVIGATION */}
      <nav className="w-[72px] h-full border-r border-white/5 flex flex-col items-center py-6 gap-6 shrink-0 bg-[#050505] z-50">
        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg mb-4 text-white">
          <ICONS.Sparkles size={24} />
        </div>
        
        <button 
          onClick={() => toggleTab('assets')} 
          className={`p-3 rounded-2xl transition-all ${activeTab === 'assets' && sidebarOpen ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/20 hover:text-white'}`}
          title="DNA Library"
        >
          <ICONS.Box size={24} />
        </button>
        
        <button 
          onClick={() => toggleTab('history')} 
          className={`p-3 rounded-2xl transition-all ${activeTab === 'history' && sidebarOpen ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/20 hover:text-white'}`}
          title="Chronology"
        >
          <ICONS.History size={24} />
        </button>
        
        <button 
          onClick={() => toggleTab('settings')} 
          className={`p-3 rounded-2xl mt-auto transition-all ${activeTab === 'settings' && sidebarOpen ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/20 hover:text-white'}`}
          title="Studio Settings"
        >
          <ICONS.Settings size={24} />
        </button>
      </nav>

      {/* 2. SIDEBAR */}
      {sidebarOpen && (
        <aside className="w-[340px] h-full border-r border-white/5 bg-[#09090b] flex shrink-0 animate-reveal z-40 overflow-hidden shadow-2xl">
          
          {activeTab === 'assets' && (
            <div className="flex w-full">
              <div className="w-[120px] border-r border-white/5 overflow-y-auto custom-scrollbar flex flex-col bg-[#07070a]">
                <div className="p-4 border-b border-white/5 text-[9px] font-black uppercase text-white/20 tracking-widest">CATEGORIES</div>
                <div className="flex-1 pb-4">
                  {categories.map(cat => (
                    <div key={cat.name} className="relative group w-full">
                      <button 
                        onClick={() => setActiveCategoryName(cat.name)} 
                        className={`w-full px-4 py-4 text-[9px] font-black uppercase text-left transition-all pr-10 ${activeCategoryName === cat.name ? 'category-active' : 'text-white/20 hover:text-white/40'}`}
                      >
                        {cat.name}
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          deleteCategory(cat.name); 
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all z-50 cursor-pointer"
                        title="Delete Category"
                        type="button"
                      >
                        <ICONS.Trash size={12}/>
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => {
                    setNewCat({ name: '', description: '' });
                    setActiveTab('create-category');
                  }} 
                  className="p-4 border-t border-white/5 text-indigo-400/40 hover:text-indigo-400 flex justify-center sticky bottom-0 bg-[#07070a]"
                  title="New Category"
                >
                  <ICONS.Plus size={20}/>
                </button>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-[9px] font-black uppercase text-white/20">DNA FRAGMENTS</h3>
                  <button onClick={() => setSidebarOpen(false)} className="text-white/10 hover:text-white"><ICONS.X size={16}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 custom-scrollbar content-start">
                  {activeCategoryAssets.map(asset => (
                    <div 
                      key={asset.id} 
                      onClick={() => setSelectedAssetIds(prev => prev.includes(asset.id) ? prev.filter(id => id !== asset.id) : [...prev, asset.id])}
                      className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border transition-all ${selectedAssetIds.includes(asset.id) ? 'border-indigo-600 ring-4 ring-indigo-600/10' : 'border-white/5 hover:border-white/20'}`}
                    >
                      <img src={asset.imageUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pointer-events-none">
                        <span className="text-[8px] font-bold uppercase truncate block text-white/80">{asset.name}</span>
                      </div>
                      
                      {/* Hover Actions - High Z-Index & Stop Propagation */}
                      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                         <button 
                           onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation(); 
                             handleDeleteAsset(asset.id); 
                           }} 
                           className="w-7 h-7 bg-black/60 hover:bg-red-500/90 rounded-lg flex items-center justify-center text-white/80 hover:text-white backdrop-blur-sm border border-white/10 shadow-lg cursor-pointer transition-colors"
                           title="Delete DNA Fragment"
                           type="button"
                          >
                            <ICONS.Trash size={12}/>
                          </button>
                         <button 
                           onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation(); 
                             handleEditAsset(asset); 
                           }} 
                           className="w-7 h-7 bg-black/60 hover:bg-indigo-600/90 rounded-lg flex items-center justify-center text-white/80 hover:text-white backdrop-blur-sm border border-white/10 shadow-lg cursor-pointer transition-colors"
                           title="Edit DNA Fragment"
                           type="button"
                          >
                            <ICONS.Edit size={12}/>
                          </button>
                      </div>

                      {selectedAssetIds.includes(asset.id) && (
                        <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center border border-white/20 shadow-lg z-40"><ICONS.Check size={10} /></div>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => { 
                      setEditingAssetId(null); 
                      setNewAsset({ name: '', prompt: '', category: activeCategoryName || (categories[0]?.name || ''), image: '' });
                      setActiveTab('create-dna'); 
                    }} 
                    className="aspect-square rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-white/10 hover:text-white/30 transition-all gap-2 hover:bg-white/5"
                    title="New DNA Fragment"
                  >
                    <ICONS.Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create-category' && (
            <div className="flex flex-col w-full p-8 gap-6 animate-reveal">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase text-white/20 tracking-widest">New Category</h2>
                <button onClick={() => setActiveTab('assets')} className="text-white/20 hover:text-white"><ICONS.X size={18}/></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/20">Name</label>
                  <input value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} type="text" placeholder="e.g. Archetypes" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-indigo-600/40" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/20">Description</label>
                  <textarea value={newCat.description} onChange={e => setNewCat({...newCat, description: e.target.value})} placeholder="What defines this DNA type?" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] h-24 outline-none resize-none focus:border-indigo-600/40" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setActiveTab('assets')} className="flex-1 py-3 border border-white/5 rounded-xl text-[9px] font-black uppercase text-white/20 hover:text-white">Cancel</button>
                  <button onClick={addCategory} className="flex-1 py-3 btn-primary rounded-xl text-[9px] font-black uppercase">Create</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create-dna' && (
            <div className="flex flex-col w-full p-8 gap-6 animate-reveal overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase text-white/20 tracking-widest">{editingAssetId ? 'Update DNA' : 'Anchor DNA'}</h2>
                <button onClick={() => { setEditingAssetId(null); setActiveTab('assets'); }} className="text-white/20 hover:text-white"><ICONS.X size={18}/></button>
              </div>
              <div className="space-y-4">
                <div 
                  onClick={() => assetFormFileInputRef.current?.click()}
                  className="aspect-video glass rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-white/10 hover:border-indigo-600/40 cursor-pointer transition-all relative overflow-hidden group"
                >
                   {newAsset.image ? (
                     <img src={newAsset.image} className="w-full h-full object-cover" />
                   ) : (
                     <>
                        <ICONS.Camera size={24}/>
                        <span className="text-[8px] font-black uppercase mt-2">Upload Visual DNA</span>
                     </>
                   )}
                   <input type="file" ref={assetFormFileInputRef} hidden accept="image/*" onChange={handleAssetFormFileUpload} />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                     <span className="text-[9px] font-black uppercase">Change Image</span>
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/20">Asset Name</label>
                  <input value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} type="text" placeholder="e.g. Neon Knight" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-indigo-600/40" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/20">Category</label>
                  <select value={newAsset.category} onChange={e => setNewAsset({...newAsset, category: e.target.value})} className="w-full h-11 px-4 bg-[#111111] border border-white/10 rounded-xl text-[11px] font-bold uppercase outline-none focus:border-indigo-600/40">
                    {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/20">Prompt Signature</label>
                  <textarea value={newAsset.prompt} onChange={e => setNewAsset({...newAsset, prompt: e.target.value})} placeholder="Describe the core DNA fragment..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] h-32 outline-none resize-none focus:border-indigo-600/40" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setEditingAssetId(null); setActiveTab('assets'); }} className="flex-1 py-3 border border-white/5 rounded-xl text-[9px] font-black uppercase text-white/20 hover:text-white">Cancel</button>
                  <button onClick={saveAsset} className="flex-1 py-3 btn-primary rounded-xl text-[9px] font-black uppercase">{editingAssetId ? 'Update' : 'Commit'}</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col w-full h-full overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Chronology</h2>
                <button onClick={() => setSidebarOpen(false)} className="text-white/10 hover:text-white"><ICONS.X size={16}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {history.length > 0 ? history.map(item => (
                  <div key={item.id} className="group glass rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-indigo-600/30 transition-all" onClick={() => setCurrentResult(item.url)}>
                    <img src={item.url} className="w-full aspect-[4/3] object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                      <p className="text-[9px] line-clamp-2 text-white/70 italic">"{item.prompt}"</p>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4">
                    <ICONS.History size={48} strokeWidth={1}/>
                    <p className="text-[9px] font-black uppercase tracking-widest">Archive Empty</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex flex-col w-full p-8 gap-8">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase text-white/20 tracking-widest">Studio Config</h2>
                <button onClick={() => setSidebarOpen(false)} className="text-white/10 hover:text-white"><ICONS.X size={16}/></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest">Image Engine</label>
                  <select value={settings.model} onChange={e => setSettings({...settings, model: e.target.value})} className="w-full h-11 px-4 bg-[#111111] border border-white/10 rounded-xl text-[11px] font-bold uppercase outline-none">
                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
                    <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest">Quality</label>
                  <select value={settings.quality} onChange={e => setSettings({...settings, quality: e.target.value})} className="w-full h-11 px-4 bg-[#111111] border border-white/10 rounded-xl text-[11px] font-bold uppercase outline-none">
                    <option value="Fast">Fast</option>
                    <option value="Balanced">Balanced</option>
                    <option value="High">High Fidelity</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest">Resolution</label>
                  <select value={settings.resolution} onChange={e => setSettings({...settings, resolution: e.target.value})} className="w-full h-11 px-4 bg-[#111111] border border-white/10 rounded-xl text-[11px] font-bold uppercase outline-none">
                    <option value="1024x1024">1024x1024</option>
                    <option value="1k">1K</option>
                    <option value="2k">2K</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest">Manual Seed</label>
                  <input type="number" value={settings.seed} onChange={e => setSettings({...settings, seed: parseInt(e.target.value) || 0})} className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-indigo-600/40" placeholder="0 for random" />
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="mt-auto w-full py-4 btn-primary rounded-xl text-[10px] font-black uppercase tracking-widest">Commit Config</button>
            </div>
          )}
        </aside>
      )}

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col relative h-full bg-[#050505] overflow-hidden">
        
        {/* CENTER CANVAS */}
        <div className="flex-1 min-h-0 relative flex items-center justify-center p-6 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          
          {isGenerating && (
            <div className="absolute inset-0 z-30 glass flex flex-col items-center justify-center gap-6 backdrop-blur-3xl border-none">
              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[11px] font-black uppercase tracking-[0.6em] text-indigo-400">MANIFESTING...</span>
            </div>
          )}

          <div className="w-full h-full flex items-center justify-center relative">
            {currentResult ? (
              <div className="relative group max-w-full max-h-full flex items-center justify-center">
                <img src={currentResult} className="max-w-full max-h-full object-contain shadow-[0_40px_100px_rgba(0,0,0,1)] rounded-3xl" />
                
                {/* Image Toolbar */}
                <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
                  <button onClick={() => setIsFullscreen(true)} className="p-3 glass rounded-xl text-white/60 hover:text-white shadow-2xl transition-all"><ICONS.Maximize size={18} /></button>
                  <button onClick={handleDownload} className="p-3 glass rounded-xl text-white/60 hover:text-white shadow-2xl transition-all"><ICONS.Download size={18} /></button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center opacity-5 select-none pointer-events-none">
                <ICONS.Image size={120} strokeWidth={1} />
                <p className="mt-8 text-[12px] font-black uppercase tracking-[1em]">VOID MANIFEST</p>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM CLUSTER */}
        <div className="w-full bg-[#09090b] border-t border-white/5 px-8 pb-8 pt-4 flex flex-col shrink-0 z-30 relative overflow-visible">
          
          {/* Active Asset Strip */}
          <div className="flex items-center gap-4 py-1 mb-2 overflow-x-auto scrollbar-hide h-[56px] shrink-0">
             {selectedAssets.length > 0 ? (
               <div className="flex items-center gap-2">
                 {selectedAssets.map(asset => (
                   <div key={asset.id} className="flex-shrink-0 flex items-center gap-2 glass rounded-full pl-1 pr-3 py-1 border-white/10 shadow-lg animate-reveal">
                     <img src={asset.imageUrl} className="w-7 h-7 rounded-full object-cover" />
                     <span className="text-[10px] font-black uppercase text-white/60 truncate max-w-[90px]">{asset.name}</span>
                     <button onClick={() => setSelectedAssetIds(prev => prev.filter(id => id !== asset.id))} className="text-white/20 hover:text-red-500 transition-colors"><ICONS.X size={12}/></button>
                   </div>
                 ))}
               </div>
             ) : (
               <span className="text-[9px] font-black uppercase text-white/10 italic tracking-widest">DNA Library Context Empty</span>
             )}
             
             <div className="h-4 w-px bg-white/5 mx-1"></div>
             
             <div className="flex items-center gap-2">
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer border-2 border-dashed transition-all ${externalReference ? 'border-indigo-600 bg-indigo-500/10 shadow-lg' : 'border-white/5 hover:border-indigo-600/30'}`}
                  title="Global Reference Key"
                >
                  {externalReference ? (
                    <img src={externalReference} className="w-full h-full object-cover rounded-lg" />
                  ) : <ICONS.Camera size={16} className="text-white/20" />}
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setExternalReference(reader.result as string);
                        reader.readAsDataURL(file);
                    }
                  }} />
                </div>
                {externalReference && (
                   <button onClick={() => setExternalReference(null)} className="text-white/20 hover:text-red-500 transition-colors"><ICONS.Trash size={14} /></button>
                )}
             </div>
          </div>

          {/* STUDIO ENHANCER */}
          <div className="relative h-[48px] mb-3 shrink-0">
             <div className={`absolute bottom-full left-0 mb-3 w-full glass rounded-[32px] p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl transition-all duration-300 ease-out z-50 max-h-[300px] overflow-y-auto custom-scrollbar ${isEnhancerExpanded ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-[0.98] pointer-events-none'}`}>
                {(Object.entries(ENHANCER_OPTIONS) as [EnhancerCategory, { label: string, options: string[] }][]).map(([key, config]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[8px] font-black text-white/20 uppercase tracking-widest">{config.label}</label>
                    <div className="relative">
                      <select 
                        value={controls[key]} 
                        onChange={e => setControls(prev => ({ ...prev, [key]: e.target.value }))}
                        className={`w-full h-9 px-3 bg-[#111111] border rounded-xl text-[10px] font-bold uppercase outline-none appearance-none cursor-pointer transition-all ${controls[key] !== 'Auto' ? 'border-indigo-600 text-indigo-400' : 'border-white/10 text-white/40 hover:border-white/20'}`}
                      >
                        {config.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <ICONS.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none" size={12}/>
                    </div>
                  </div>
                ))}
             </div>
             
             <button 
               onClick={() => setIsEnhancerExpanded(!isEnhancerExpanded)} 
               className="w-full h-full glass border border-white/5 rounded-2xl flex items-center justify-between px-6 text-[10px] font-black uppercase transition-all shadow-xl relative z-40 group"
             >
                <div className="flex items-center gap-3">
                   <ICONS.Filter size={16} className="text-indigo-400"/>
                   <span className="text-white/40 truncate max-w-[500px]">
                      {Object.entries(controls).filter(([_,v]) => v !== 'Auto').map(([_,v]) => v).join(' • ') || 'STUDIO ENHANCER (IDLE)'}
                   </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-white/20 group-hover:text-white/40 transition-colors">{isEnhancerExpanded ? 'CLOSE' : 'OPEN'}</span>
                  <ICONS.ChevronDown className={`transition-transform duration-300 text-white/20 ${isEnhancerExpanded ? 'rotate-180' : ''}`} size={16}/>
                </div>
             </button>
          </div>

          {/* PROMPT ENTRY */}
          <div className="flex gap-4 items-end relative shrink-0">
            <div className="flex-1 relative">
               <textarea 
                  ref={promptRef} 
                  placeholder="Describe context manifestation..." 
                  value={userPrompt} 
                  onChange={e => setUserPrompt(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                  className="w-full bg-[#111111]/80 border border-white/5 rounded-[24px] px-6 py-4 text-[14px] focus:outline-none focus:border-indigo-600/40 transition-all resize-none text-white placeholder:text-white/10 shadow-lg custom-scrollbar leading-relaxed" 
               />
            </div>
            <button 
              disabled={isGenerating || (!userPrompt && !selectedAssetIds.length)} 
              onClick={handleGenerate} 
              className="w-[150px] h-[56px] btn-primary rounded-[24px] text-[10px] font-black uppercase tracking-widest disabled:grayscale disabled:opacity-30 shrink-0 shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <ICONS.Sparkles size={18} />
              <span>Manifest</span>
            </button>
          </div>
        </div>
      </main>

      {/* FULLSCREEN PREVIEW */}
      {isFullscreen && currentResult && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center animate-reveal" onClick={() => setIsFullscreen(false)}>
           <button className="absolute top-10 right-10 p-5 glass rounded-full text-white/40 hover:text-white transition-all"><ICONS.X size={32}/></button>
           <div className="max-w-[95vw] max-h-[95vh] flex items-center justify-center p-10">
             <img src={currentResult} className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl" />
           </div>
        </div>
      )}
    </div>
  );
}
