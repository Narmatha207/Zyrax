/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Upload, 
  Grid, 
  Download, 
  Save, 
  Trash2, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  Plus,
  Palette,
  Layers,
  Zap,
  Menu,
  X,
  Loader2,
  ArrowRight,
  Camera,
  Shirt,
  Play,
  Pencil,
  RotateCcw,
  ArrowLeft,
  Scissors,
  Maximize2,
  Undo2,
  Redo2,
  Square,
  Circle,
  Minus,
  Brush,
  Eraser,
  Type,
  Settings,
  Info,
  Lock,
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { 
  generateFashionImage, 
  createAvatarFromPhoto, 
  applyOutfitToAvatar,
  generateFromSketch,
  customizeDesign
} from './services/geminiService';
import { User, Design } from './types';

// --- Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`glass rounded-2xl p-6 ${className}`}
  >
    {children}
  </motion.div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = "", 
  disabled = false,
  loading = false
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost',
  className?: string,
  disabled?: boolean,
  loading?: boolean
}) => {
  const variants = {
    primary: "bg-luxury-orange text-white shadow-lg hover:opacity-90",
    secondary: "bg-white text-zyrax-dark hover:bg-white/90",
    outline: "border border-white/20 hover:bg-white/10 text-white",
    ghost: "hover:bg-white/10 text-white"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-8 py-4 rounded-full font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
};

const SketchCanvas = ({ onSave }: { onSave: (dataUrl: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'brush' | 'eraser' | 'line' | 'rect' | 'circle'>('pencil');
  const [color, setColor] = useState('#FFFFFF');
  const [size, setSize] = useState(2);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    // Set initial white background if empty
    if (history.length === 0) {
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    // Scale coordinates based on canvas internal resolution vs display size
    return {
      x: (x / rect.width) * canvas.width,
      y: (y / rect.height) * canvas.height
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getPos(e);
    setStartPos(pos);
    
    // Take snapshot for shape preview
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
    ctx.lineWidth = tool === 'brush' ? size * 3 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      draw(e);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setSnapshot(null);
    saveToHistory();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pos = getPos(e);

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // Shape drawing: restore snapshot and draw new shape
      if (snapshot) {
        ctx.putImageData(snapshot, 0, 0);
      }
      
      ctx.beginPath();
      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
      } else if (tool === 'rect') {
        ctx.rect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      }
      ctx.stroke();
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadFromHistory(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadFromHistory(newIndex);
    }
  };

  const loadFromHistory = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = history[index];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Toolbar */}
      <GlassCard className="flex lg:flex-col gap-4 p-4 w-full lg:w-auto border-white/5">
        <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
          <button 
            onClick={() => setTool('pencil')}
            className={`p-3 rounded-xl transition-all ${tool === 'pencil' ? 'bg-zyrax-orange text-white' : 'hover:bg-white/10 text-white/60'}`}
            title="Pencil"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setTool('brush')}
            className={`p-3 rounded-xl transition-all ${tool === 'brush' ? 'bg-zyrax-orange text-white' : 'hover:bg-white/10 text-white/60'}`}
            title="Brush"
          >
            <Brush className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`p-3 rounded-xl transition-all ${tool === 'eraser' ? 'bg-zyrax-orange text-white' : 'hover:bg-white/10 text-white/60'}`}
            title="Eraser"
          >
            <Eraser className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setTool('line')}
            className={`p-3 rounded-xl transition-all ${tool === 'line' ? 'bg-zyrax-orange text-white' : 'hover:bg-white/10 text-white/60'}`}
            title="Line"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setTool('rect')}
            className={`p-3 rounded-xl transition-all ${tool === 'rect' ? 'bg-zyrax-orange text-white' : 'hover:bg-white/10 text-white/60'}`}
            title="Rectangle"
          >
            <Square className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setTool('circle')}
            className={`p-3 rounded-xl transition-all ${tool === 'circle' ? 'bg-zyrax-orange text-white' : 'hover:bg-white/10 text-white/60'}`}
            title="Circle"
          >
            <Circle className="w-5 h-5" />
          </button>
        </div>

        <div className="h-px bg-white/10 w-full hidden lg:block" />

        <div className="flex lg:flex-col gap-4 items-center">
          <input 
            type="color" 
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg bg-transparent cursor-pointer"
            title="Color Picker"
          />
          <div className="flex flex-col gap-2 items-center">
            <span className="text-[10px] uppercase font-bold text-white/40">Size</span>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-24 lg:w-20 accent-zyrax-orange"
            />
          </div>
        </div>

        <div className="h-px bg-white/10 w-full hidden lg:block" />

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-3 rounded-xl hover:bg-white/10 text-white/60 disabled:opacity-20 transition-all"
            title="Undo"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button 
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-3 rounded-xl hover:bg-white/10 text-white/60 disabled:opacity-20 transition-all"
            title="Redo"
          >
            <Redo2 className="w-5 h-5" />
          </button>
          <button 
            onClick={clear}
            className="p-3 rounded-xl hover:bg-white/10 text-red-400 transition-all col-span-2"
            title="Clear Canvas"
          >
            <Trash2 className="w-5 h-5 mx-auto" />
          </button>
        </div>
      </GlassCard>

      {/* Canvas Area */}
      <div className="flex-1 w-full space-y-6">
        <div className="aspect-[3/4] glass rounded-3xl overflow-hidden relative cursor-crosshair bg-black/60 shadow-inner">
          <canvas
            ref={canvasRef}
            width={800}
            height={1066}
            className="w-full h-full touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <Button variant="primary" className="w-full py-6 text-xl shadow-[0_0_30px_rgba(255,140,0,0.3)]" onClick={save}>
          <Sparkles className="w-6 h-6" /> Confirm Sketch Design
        </Button>
      </div>
    </div>
  );
};

// --- Pages ---

const LandingPage = ({ onStart }: { onStart: () => void }) => (
  <div className="min-h-screen flex flex-col bg-zyrax-dark relative overflow-hidden">
    {/* Background elements */}
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zyrax-orange/5 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zyrax-orange/5 blur-[150px] rounded-full" />
    </div>

    <nav className="p-12 flex justify-between items-center max-w-7xl mx-auto w-full z-10">
      <div className="text-2xl font-bold tracking-[0.2em] flex items-center gap-2">
        <span className="text-white">ZYRAX</span>
      </div>
      <div className="hidden md:flex gap-12 text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
        <span>Collection</span>
        <span>Technology</span>
        <span>About</span>
      </div>
    </nav>

    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="max-w-4xl"
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.5em] text-zyrax-orange mb-8">The Future of Couture</h2>
        <h1 className="text-6xl md:text-8xl font-serif italic mb-12 tracking-tight leading-tight">
          Redefining <br /> Fashion Identity
        </h1>
        <p className="text-lg md:text-xl text-white/40 mb-16 font-light tracking-widest max-w-xl mx-auto leading-relaxed">
          Experience the intersection of high-fashion and generative intelligence.
        </p>
        <Button 
          className="text-lg px-16 py-6 rounded-full tracking-[0.2em] uppercase" 
          onClick={onStart}
        >
          Launch Your Style
        </Button>
      </motion.div>
    </main>

    <footer className="p-12 flex justify-between items-center max-w-7xl mx-auto w-full text-white/10 text-[10px] uppercase tracking-[0.4em] z-10">
      <span>Paris / New York / Tokyo</span>
      <span>© 2024 ZYRAX / AI STUDIO</span>
    </footer>
  </div>
);

const AuthPage = ({ type, onSuccess }: { type: 'login' | 'signup', onSuccess: (user: User, token: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = type === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body = type === 'login' ? { email, password } : { name, email, password };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');

      onSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zyrax-dark">
      <GlassCard className="w-full max-w-md p-12 border-white/5">
        <h2 className="text-4xl font-bold mb-8 text-center tracking-tight">
          {type === 'login' ? 'Login' : 'Sign Up'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {type === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-zyrax-orange transition-colors"
                placeholder="Your Name"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-zyrax-orange transition-colors"
              placeholder="email@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-zyrax-orange transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          
          <Button loading={loading} className="w-full py-5">
            {type === 'login' ? 'Continue' : 'Create Account'}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
};

const Dashboard = ({ user, token, onLogout, onBack }: { user: User, token: string, onLogout: () => void, onBack: () => void }) => {
  const [step, setStep] = useState<'avatar' | 'studio' | 'customize' | 'showcase' | 'about' | 'settings'>('avatar');
  const [studioMode, setStudioMode] = useState<'prompt' | 'upload' | 'sketch'>('prompt');
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [outfitImage, setOutfitImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [refImage, setRefImage] = useState<string | null>(null);
  const [sketchImage, setSketchImage] = useState<string | null>(null);
  const [isShowcaseRunning, setIsShowcaseRunning] = useState(false);
  const [rawPhoto, setRawPhoto] = useState<string | null>(null);
  const [savedDesigns, setSavedDesigns] = useState<Design[]>([]);

  useEffect(() => {
    if (step === 'settings') {
      fetchDesigns();
    }
  }, [step]);

  const fetchDesigns = async () => {
    try {
      const res = await fetch('/api/design/mydesigns', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedDesigns(data);
      }
    } catch (err) {
      console.error("Failed to fetch designs", err);
    }
  };

  const handleDeleteDesign = async (id: number) => {
    if (!confirm("Are you sure you want to delete this design?")) return;
    try {
      const res = await fetch(`/api/design/delete/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedDesigns(savedDesigns.filter(d => d.id !== id));
      }
    } catch (err) {
      alert("Failed to delete design");
    }
  };

  // Customization state
  const [customizations, setCustomizations] = useState({
    color: '',
    sleeves: '',
    length: '',
    fabric: '',
    pattern: ''
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawPhoto(reader.result as string);
        setAvatarImage(null); // Reset avatar if new photo uploaded
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!rawPhoto) return;
    setLoading(true);
    try {
      const avatar = await createAvatarFromPhoto(rawPhoto);
      setAvatarImage(avatar);
    } catch (err) {
      alert("Failed to create avatar. Try another photo.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAvatar = async () => {
    handleGenerateAvatar();
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateOutfit = async () => {
    if (!avatarImage) return;
    setLoading(true);
    try {
      let outfit;
      if (studioMode === 'sketch' && sketchImage) {
        outfit = await generateFromSketch(avatarImage, sketchImage, prompt);
      } else {
        outfit = await applyOutfitToAvatar(avatarImage, prompt, refImage || undefined);
      }
      setOutfitImage(outfit);
      setStep('customize');
    } catch (err) {
      alert("Failed to generate outfit.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomizations = async () => {
    if (!outfitImage) return;
    setLoading(true);
    try {
      const updated = await customizeDesign(outfitImage, customizations);
      setOutfitImage(updated);
    } catch (err) {
      alert("Failed to apply customizations.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (step === 'showcase') setStep('customize');
    else if (step === 'customize') setStep('studio');
    else if (step === 'studio') setStep('avatar');
    else if (step === 'about' || step === 'settings') setStep('avatar');
    else onBack();
  };

  const handleSaveDesign = async () => {
    if (!outfitImage) return;
    setLoading(true);
    try {
      const res = await fetch('/api/design/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageUrl: outfitImage,
          prompt: prompt || 'Customized AI Design'
        })
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Design saved successfully to your collection!');
    } catch (err) {
      alert('Failed to save design.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = (imageUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-zyrax-dark flex flex-col">
      <nav className="p-8 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-6">
          <button onClick={handleGoBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-2xl font-bold tracking-tighter">ZYRAX</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 mr-4 border-r border-white/10 pr-6">
            <button 
              onClick={() => setStep('about')} 
              className={`text-sm font-medium transition-colors ${step === 'about' ? 'text-zyrax-orange' : 'text-white/40 hover:text-white'}`}
            >
              About
            </button>
            <button 
              onClick={() => setStep('settings')} 
              className={`text-sm font-medium transition-colors ${step === 'settings' ? 'text-zyrax-orange' : 'text-white/40 hover:text-white'}`}
            >
              Settings
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zyrax-orange flex items-center justify-center text-xs font-bold">
              {user.name[0]}
            </div>
            <span className="text-sm font-medium text-white/60">{user.name}</span>
          </div>
          <button onClick={onLogout} className="text-white/40 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'about' && (
            <motion.div 
              key="about"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto text-center py-12"
            >
              <div className="flex justify-center gap-6 mb-8">
                <div className="p-4 glass rounded-2xl">
                  <Shirt className="w-10 h-10 text-zyrax-orange" />
                </div>
                <div className="p-4 glass rounded-2xl">
                  <Zap className="w-10 h-10 text-zyrax-orange" />
                </div>
                <div className="p-4 glass rounded-2xl">
                  <Sparkles className="w-10 h-10 text-zyrax-orange" />
                </div>
              </div>
              
              <h2 className="text-6xl font-bold mb-8 tracking-tight">About Zyrax</h2>
              
              <GlassCard className="p-12 border-white/5 bg-white/[0.02]">
                <p className="text-2xl leading-relaxed text-white/80 font-light">
                  Zyrax is an AI-powered fashion platform that allows users to design outfits using prompts, sketches, or images and visualize them on a personalized avatar. This platform was created by <span className="text-zyrax-orange font-medium">Nammu N</span> to explore the combination of artificial intelligence and fashion design, making it easier for users to bring their clothing ideas to life.
                </p>
              </GlassCard>
              
              <div className="mt-12 flex justify-center gap-4">
                <Button onClick={() => setStep('avatar')} variant="outline" className="px-8">
                  Get Started
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'avatar' && (
            <motion.div 
              key="avatar-studio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-5xl font-bold mb-4">AI Avatar Generator</h2>
                <p className="text-white/40 text-lg">Create your realistic virtual model for the Zyrax fashion studio.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Upload Section */}
                <GlassCard className="space-y-8 border-white/5">
                  <div 
                    className="aspect-[3/4] glass rounded-3xl border-dashed border-2 border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group relative overflow-hidden"
                    onClick={() => document.getElementById('avatarInput')?.click()}
                  >
                    {rawPhoto ? (
                      <img src={rawPhoto} alt="Source" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-16 h-16 text-white/10 group-hover:text-zyrax-orange transition-colors mb-4" />
                        <p className="text-white/40 group-hover:text-white transition-colors">Upload Face Photo</p>
                      </>
                    )}
                    <input id="avatarInput" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </div>

                  <div className="flex flex-col gap-4">
                    <Button 
                      onClick={handleGenerateAvatar} 
                      loading={loading} 
                      disabled={!rawPhoto}
                      className="w-full py-6 text-xl shadow-[0_0_30px_rgba(255,140,0,0.2)]"
                    >
                      <Sparkles className="w-6 h-6" /> Generate Avatar
                    </Button>
                    
                    {avatarImage && (
                      <Button 
                        variant="outline" 
                        onClick={() => setStep('studio')}
                        className="w-full py-4"
                      >
                        Proceed to Studio <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </GlassCard>

                {/* Preview Section */}
                <div className="flex flex-col items-center justify-center">
                  <div className="aspect-[3/4] w-full glass rounded-3xl overflow-hidden relative shadow-2xl bg-black/40">
                    {avatarImage ? (
                      <img src={avatarImage} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/10 gap-4">
                        <UserIcon className="w-24 h-24" />
                        <p className="text-sm uppercase tracking-widest font-bold">Avatar Preview</p>
                      </div>
                    )}
                    
                    {avatarImage && (
                      <div className="absolute top-6 left-6 px-4 py-2 glass rounded-full text-xs font-bold uppercase tracking-widest">
                        Generated Avatar
                      </div>
                    )}

                    {avatarImage && (
                      <div className="flex gap-2 absolute bottom-6 right-6">
                        <button 
                          onClick={() => avatarImage && handleDownloadImage(avatarImage, 'zyrax-avatar.png')}
                          className="p-4 glass rounded-full hover:bg-white/10 transition-all text-white/60 hover:text-zyrax-orange"
                          title="Download Avatar"
                        >
                          <Download className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={handleRegenerateAvatar}
                          disabled={loading}
                          className="p-4 glass rounded-full hover:bg-white/10 transition-all text-white/60 hover:text-zyrax-orange"
                          title="Regenerate Avatar"
                        >
                          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <RotateCcw className="w-6 h-6" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'studio' && (
            <motion.div 
              key="studio"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              <div className="space-y-8">
                <div>
                  <h2 className="text-5xl font-bold mb-4">Design Studio</h2>
                  <div className="flex gap-4 mt-6">
                    <button 
                      onClick={() => setStudioMode('prompt')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${studioMode === 'prompt' ? 'bg-zyrax-orange text-white' : 'glass text-white/60'}`}
                    >
                      Prompt Design
                    </button>
                    <button 
                      onClick={() => setStudioMode('upload')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${studioMode === 'upload' ? 'bg-zyrax-orange text-white' : 'glass text-white/60'}`}
                    >
                      Image Upload
                    </button>
                    <button 
                      onClick={() => setStudioMode('sketch')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${studioMode === 'sketch' ? 'bg-zyrax-orange text-white' : 'glass text-white/60'}`}
                    >
                      Sketch Design
                    </button>
                  </div>
                </div>

                <GlassCard className="space-y-8 border-white/5">
                  {studioMode === 'prompt' && (
                    <div className="space-y-4">
                      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest">Text Prompt</label>
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-6 h-40 focus:outline-none focus:border-zyrax-orange transition-colors resize-none text-lg"
                        placeholder="e.g. Elegant black velvet evening gown with silver embroidery..."
                      />
                    </div>
                  )}

                  {studioMode === 'upload' && (
                    <div className="space-y-4">
                      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest">Reference Image</label>
                      <div 
                        className="h-64 glass rounded-2xl border-dashed border-2 border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-all overflow-hidden"
                        onClick={() => document.getElementById('refInput')?.click()}
                      >
                        {refImage ? (
                          <img src={refImage} alt="Reference" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-white/40">
                            <Upload className="w-8 h-8" />
                            <span>Upload reference dress</span>
                          </div>
                        )}
                        <input id="refInput" type="file" className="hidden" accept="image/*" onChange={handleRefUpload} />
                      </div>
                    </div>
                  )}

                  {studioMode === 'sketch' && (
                    <div className="space-y-4">
                      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest">Sketch Your Vision</label>
                      <SketchCanvas onSave={(data) => setSketchImage(data)} />
                      {sketchImage && (
                        <div className="mt-4 space-y-4">
                          <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest">Additional Details</label>
                          <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 h-24 focus:outline-none focus:border-zyrax-orange transition-colors resize-none"
                            placeholder="Describe colors, fabrics, or details for your sketch..."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={handleGenerateOutfit} 
                    loading={loading} 
                    className="w-full py-6 text-xl shadow-[0_0_30px_rgba(255,140,0,0.2)]"
                    disabled={
                      (studioMode === 'prompt' && !prompt) || 
                      (studioMode === 'upload' && !refImage) || 
                      (studioMode === 'sketch' && !sketchImage)
                    }
                  >
                    <Zap className="w-6 h-6" /> Generate Design
                  </Button>
                </GlassCard>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="aspect-[3/4] w-full max-w-md glass rounded-3xl overflow-hidden relative shadow-2xl">
                  {avatarImage && <img src={avatarImage} alt="Avatar" className="w-full h-full object-cover" />}
                  <div className="absolute top-6 left-6 px-4 py-2 glass rounded-full text-xs font-bold uppercase tracking-widest">
                    Virtual Model
                  </div>
                  <button 
                    onClick={handleRegenerateAvatar}
                    disabled={loading}
                    className="absolute bottom-6 right-6 p-4 glass rounded-full hover:bg-white/10 transition-all text-white/60 hover:text-zyrax-orange"
                    title="Regenerate Avatar"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <RotateCcw className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'customize' && (
            <motion.div 
              key="customize"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              <div className="space-y-8">
                <div>
                  <h2 className="text-5xl font-bold mb-4">Customization</h2>
                  <p className="text-white/40 text-lg">Refine the details of your generated design.</p>
                </div>

                <GlassCard className="space-y-6 border-white/5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/40 uppercase">Color</label>
                      <input 
                        type="text" 
                        value={customizations.color}
                        onChange={(e) => setCustomizations({...customizations, color: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zyrax-orange"
                        placeholder="e.g. Royal Blue"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/40 uppercase">Sleeves</label>
                      <input 
                        type="text" 
                        value={customizations.sleeves}
                        onChange={(e) => setCustomizations({...customizations, sleeves: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zyrax-orange"
                        placeholder="e.g. Puff Sleeves"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/40 uppercase">Length</label>
                      <input 
                        type="text" 
                        value={customizations.length}
                        onChange={(e) => setCustomizations({...customizations, length: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zyrax-orange"
                        placeholder="e.g. Floor Length"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/40 uppercase">Fabric</label>
                      <input 
                        type="text" 
                        value={customizations.fabric}
                        onChange={(e) => setCustomizations({...customizations, fabric: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zyrax-orange"
                        placeholder="e.g. Silk Satin"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/40 uppercase">Pattern</label>
                    <input 
                      type="text" 
                      value={customizations.pattern}
                      onChange={(e) => setCustomizations({...customizations, pattern: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zyrax-orange"
                      placeholder="e.g. Floral Embroidery"
                    />
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <Button onClick={handleApplyCustomizations} loading={loading} variant="outline" className="flex-1">
                      Apply Changes
                    </Button>
                    <Button onClick={() => setStep('showcase')} className="flex-1">
                      Finalize & Runway
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      onClick={handleSaveDesign} 
                      variant="ghost" 
                      className="border border-white/10"
                      loading={loading}
                    >
                      <Save className="w-4 h-4" /> Save Design
                    </Button>
                    <Button 
                      onClick={() => outfitImage && handleDownloadImage(outfitImage, 'zyrax-design.png')} 
                      variant="ghost"
                      className="border border-white/10"
                    >
                      <Download className="w-4 h-4" /> Download
                    </Button>
                  </div>
                </GlassCard>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="aspect-[3/4] w-full max-w-md glass rounded-3xl overflow-hidden relative shadow-2xl">
                  {outfitImage && <img src={outfitImage} alt="Customized" className="w-full h-full object-cover" />}
                  {loading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-12 h-12 text-zyrax-orange animate-spin" />
                      <p className="text-zyrax-orange font-medium">Updating design...</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'showcase' && (
            <motion.div 
              key="showcase"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-4xl mx-auto text-center"
            >
              <h2 className="text-5xl font-bold mb-12">The Runway</h2>
              
              <div className="relative aspect-[3/4] max-w-md mx-auto mb-12 overflow-hidden rounded-3xl shadow-[0_0_50px_rgba(255,140,0,0.2)] bg-black">
                {/* Runway Background */}
                <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/runway/800/1200')] opacity-20 grayscale" />
                
                {/* Catwalk Floor */}
                <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-white/10 to-transparent skew-x-[-20deg] origin-bottom" />
                <div className="absolute bottom-0 right-0 w-full h-1/4 bg-gradient-to-t from-white/10 to-transparent skew-x-[20deg] origin-bottom" />
                
                <motion.div
                  animate={isShowcaseRunning ? {
                    scale: [1, 1.1, 1.25, 1.4],
                    y: [0, -10, 20, 60, 120],
                    x: [0, 5, -5, 5, 0],
                    opacity: [1, 1, 1, 0.8, 0]
                  } : {}}
                  transition={{ 
                    duration: 6, 
                    ease: "easeInOut",
                    times: [0, 0.2, 0.5, 0.8, 1]
                  }}
                  className="w-full h-full relative z-10"
                >
                  {outfitImage && <img src={outfitImage} alt="Showcase" className="w-full h-full object-cover" />}
                </motion.div>
                
                {/* Runway Lighting Effect */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zyrax-dark via-transparent to-transparent opacity-60" />
                <div className="absolute top-0 left-1/4 w-1 h-full bg-white/5 blur-md rotate-[-15deg]" />
                <div className="absolute top-0 right-1/4 w-1 h-full bg-white/5 blur-md rotate-[15deg]" />
                <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-zyrax-orange/20 to-transparent" />
              </div>

              {!isShowcaseRunning ? (
                <div className="flex flex-col items-center gap-8">
                  <Button 
                    onClick={() => setIsShowcaseRunning(true)}
                    className="text-2xl px-16 py-8 rounded-full bg-luxury-orange"
                  >
                    <Play className="w-8 h-8 fill-current" /> Show Your Style
                  </Button>
                  
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      onClick={handleSaveDesign}
                      loading={loading}
                    >
                      <Save className="w-5 h-5" /> Save to Collection
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => outfitImage && handleDownloadImage(outfitImage, 'zyrax-runway.png')}
                    >
                      <Download className="w-5 h-5" /> Download Image
                    </Button>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <p className="text-zyrax-orange text-2xl font-bold tracking-widest uppercase animate-pulse">Runway in Progress</p>
                  <Button variant="outline" onClick={() => {
                    setIsShowcaseRunning(false);
                    setStep('customize');
                  }}>
                    Back to Studio
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto space-y-12 pb-24"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 glass rounded-2xl">
                  <Settings className="w-8 h-8 text-zyrax-orange" />
                </div>
                <h2 className="text-4xl font-bold">Account Settings</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile & Security */}
                <div className="lg:col-span-1 space-y-8">
                  {/* Profile Settings */}
                  <GlassCard className="p-8 space-y-6 border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <UserIcon className="w-5 h-5 text-zyrax-orange" />
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/60">Profile</h3>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4 py-4">
                      <div className="w-24 h-24 rounded-full bg-zyrax-orange flex items-center justify-center text-3xl font-bold shadow-2xl">
                        {user.name[0]}
                      </div>
                      <button className="text-xs font-bold text-zyrax-orange uppercase tracking-widest hover:text-white transition-colors">
                        Change Picture
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Full Name</label>
                        <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-4 py-3">
                          <UserIcon className="w-4 h-4 text-white/20" />
                          <input type="text" defaultValue={user.name} className="bg-transparent border-none focus:outline-none w-full text-sm" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Email Address</label>
                        <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-4 py-3">
                          <Mail className="w-4 h-4 text-white/20" />
                          <input type="email" defaultValue={user.email} className="bg-transparent border-none focus:outline-none w-full text-sm" />
                        </div>
                      </div>
                      <Button variant="outline" className="w-full py-3 text-xs">Update Profile</Button>
                    </div>
                  </GlassCard>

                  {/* Security Settings */}
                  <GlassCard className="p-8 space-y-6 border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <Lock className="w-5 h-5 text-zyrax-orange" />
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/60">Security</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">New Password</label>
                        <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-4 py-3">
                          <Lock className="w-4 h-4 text-white/20" />
                          <input type="password" placeholder="••••••••" className="bg-transparent border-none focus:outline-none w-full text-sm" />
                        </div>
                      </div>
                      <Button variant="outline" className="w-full py-3 text-xs">Change Password</Button>
                      <button onClick={onLogout} className="w-full py-3 text-xs flex items-center justify-center gap-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </GlassCard>
                </div>

                {/* Right Column: Avatar & Saved Designs */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Avatar Settings */}
                  <GlassCard className="p-8 space-y-6 border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Camera className="w-5 h-5 text-zyrax-orange" />
                        <h3 className="text-lg font-bold uppercase tracking-widest text-white/60">Avatar Management</h3>
                      </div>
                      <button onClick={() => setStep('avatar')} className="text-xs font-bold text-zyrax-orange uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors">
                        <RefreshCw className="w-3 h-3" /> Regenerate
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="aspect-[3/4] glass rounded-2xl overflow-hidden relative group">
                        {avatarImage ? (
                          <img src={avatarImage} alt="Current Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10">
                            <UserIcon className="w-16 h-16" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => setStep('avatar')} className="px-6 py-3 glass rounded-full text-xs font-bold uppercase tracking-widest">Update Photo</button>
                        </div>
                      </div>
                      <div className="space-y-4 flex flex-col justify-center">
                        <p className="text-sm text-white/40 leading-relaxed">
                          Your avatar is the base for all AI fashion generations. For best results, use a clear, front-facing photo with neutral lighting.
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-xs text-white/60">
                            <CheckCircle2 className="w-4 h-4 text-green-400" /> Face Preservation Active
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/60">
                            <CheckCircle2 className="w-4 h-4 text-green-400" /> High-Resolution Model
                          </div>
                        </div>
                        <Button variant="outline" className="mt-4" onClick={() => {
                          setAvatarImage(null);
                          setRawPhoto(null);
                          setStep('avatar');
                        }}>Reset Avatar</Button>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Saved Designs */}
                  <GlassCard className="p-8 space-y-6 border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <Save className="w-5 h-5 text-zyrax-orange" />
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/60">Saved Designs</h3>
                    </div>

                    {savedDesigns.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                          <Shirt className="w-8 h-8 text-white/10" />
                        </div>
                        <p className="text-white/20 uppercase tracking-widest text-xs font-bold">No designs saved yet</p>
                        <Button variant="outline" onClick={() => setStep('studio')}>Start Designing</Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {savedDesigns.map((design) => (
                          <div key={design.id} className="group relative aspect-[3/4] rounded-xl overflow-hidden glass border border-white/5">
                            <img src={design.imageUrl} alt="Design" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                              <p className="text-[10px] text-white/60 line-clamp-2 mb-3 font-medium">{design.prompt}</p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleDownloadImage(design.imageUrl, `zyrax-design-${design.id}.png`)}
                                  className="flex-1 py-2 glass rounded-lg text-[10px] font-bold uppercase hover:bg-white/10 transition-colors"
                                >
                                  Download
                                </button>
                                <button 
                                  onClick={() => handleDeleteDesign(design.id)}
                                  className="p-2 glass rounded-lg text-red-400 hover:bg-red-400/20 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'landing' | 'login' | 'signup' | 'dashboard'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('zyrax_token');
    const savedUser = localStorage.getItem('zyrax_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setView('dashboard');
    }
  }, []);

  const handleAuthSuccess = (user: User, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('zyrax_token', token);
    localStorage.setItem('zyrax_user', JSON.stringify(user));
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('zyrax_token');
    localStorage.removeItem('zyrax_user');
    setView('landing');
  };

  const handleBack = () => {
    if (view === 'login' || view === 'signup') setView('landing');
    else if (view === 'dashboard') setView('landing');
  };

  return (
    <div className="min-h-screen bg-zyrax-dark">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LandingPage onStart={() => setView('signup')} />
          </motion.div>
        )}
        {(view === 'login' || view === 'signup') && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute top-10 left-10 z-20">
              <button onClick={handleBack} className="p-3 glass rounded-full hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
            <AuthPage type={view} onSuccess={handleAuthSuccess} />
            <div className="text-center mt-[-4rem] relative z-20">
              <button 
                onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                className="text-zyrax-orange hover:underline font-medium"
              >
                {view === 'login' ? "New to Zyrax? Create account" : "Already have an account? Login"}
              </button>
            </div>
          </motion.div>
        )}
        {view === 'dashboard' && user && token && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard user={user} token={token} onLogout={handleLogout} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

