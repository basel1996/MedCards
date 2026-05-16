import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  BrainCircuit, LayoutDashboard, MessageCircle, X, ChevronRight, 
  Activity, AlertTriangle, CheckCircle2, BookOpen, RotateCcw, ThumbsUp, ThumbsDown,
  Settings2, Monitor, Smartphone, Search, PlusCircle, Loader2, Sparkles, CloudOff, Wifi
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { generateFlashcards } from './lib/aiGenerator';
import { useNetworkStatus } from './lib/useNetworkStatus';
import { SyncManager } from './lib/syncManager';
import { useSpacedRepetition } from './hooks/useSpacedRepetition';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';

// --- MOCK DATA SECTION EXCISED ---

// --- LAYOUT & STATE MANAGER (CRITICAL) ---


interface PerformanceData {
  day: string;
  retention: number;
}

interface ErrorLedgerItem {
  topic: string;
  guideline: string;
  concept: string;
  severity: string;
}

export interface FlashcardData {
  id?: string;
  front: string;
  back: string;
  interval?: number;
  easeFactor?: number;
  repetitions?: number;
  nextReviewDate?: string;
}

// Define layout modes
type DeviceMode = 'auto' | 'desktop' | 'mobile';
type ActualMode = 'desktop' | 'mobile';

interface LayoutContextType {
  deviceMode: DeviceMode;
  setDeviceMode: (val: DeviceMode) => void;
  actualMode: ActualMode;
  view: 'dashboard' | 'study';
  setView: (val: 'dashboard' | 'study') => void;
  performanceData: PerformanceData[];
  errorLedger: ErrorLedgerItem[];
  flashcards: FlashcardData[];
  isLoading: boolean;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (val: boolean) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (val: boolean) => void;
  isGenerateModalOpen: boolean;
  setIsGenerateModalOpen: (val: boolean) => void;
  setFlashcards: React.Dispatch<React.SetStateAction<FlashcardData[]>>;
  isOnline: boolean;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
}


// --- CREATE CARD MODAL ---

function CreateCardModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const { setFlashcards } = useLayout();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!front || !back) return;
    setIsSaving(true);
    const newCard = { id: crypto.randomUUID(), front, back };
    
    // Save to SyncManager
    await SyncManager.saveRecord('flashcards', newCard, newCard.id);
    
    // Update local state immediately
    setFlashcards((prev: any) => [...prev, newCard]);
    
    setIsSaving(false);
    setFront("");
    setBack("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 overflow-hidden flex flex-col"
          >
             <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-xl font-bold text-slate-100">Create Flashcard</h2>
                <button 
                  onClick={onClose}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                   <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="space-y-4 mb-8">
                <div>
                   <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Question (Front)</label>
                   <textarea 
                     autoFocus
                     rows={3} 
                     placeholder="e.g., Mechanism of action for ACE inhibitors..." 
                     className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow resize-none custom-scrollbar"
                   />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Answer (Back)</label>
                   <textarea  
                     rows={5} 
                     placeholder="e.g., They competitively inhibit angiotensin-converting enzyme..." 
                     className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow resize-none custom-scrollbar"
                   />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Primary Topic</label>
                   <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow appearance-none cursor-pointer">
                      <option>Heart Failure</option>
                      <option>Arrhythmia</option>
                      <option>Ischemic Heart Disease</option>
                      <option>Valvular Disease</option>
                      <option>Pharmacology</option>
                      <option>General Medicine</option>
                   </select>
                </div>
             </div>
             
             <div className="flex justify-end items-center gap-3 border-t border-slate-800 pt-4">
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Card"
                  )}
                </button>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- SETTINGS MODAL ---


// --- GENERATE MODAL (AI) ---

function GenerateModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { setFlashcards } = useLayout();
  const [isGenerating, setIsGenerating] = useState(false);
  const [quantity, setQuantity] = useState(5);
  const [difficulty, setDifficulty] = useState("PGY-5/Fellow (Advanced)");
  const [topic, setTopic] = useState("General Mix");
  
  const focusOptions = ["Pathophysiology", "Diagnostics/ECG", "Guideline Sequencing", "Pharmacology"];
  const [selectedFocus, setSelectedFocus] = useState<string[]>(["Pathophysiology"]);

  const toggleFocus = (f: string) => {
    setSelectedFocus(prev => 
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  const handleGenerate = async () => {
    if (selectedFocus.length === 0) {
      toast.error("Please select at least one Focus Area.");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateFlashcards({
        quantity,
        difficulty,
        topic,
        focusAreas: selectedFocus
      });
      // Map to internal FlashcardData
      const newCards = result.cards.map(c => ({
        id: crypto.randomUUID(),
        front: c.front,
        back: c.back + "\n\n*Topic: " + c.topic + "*\n*Ref: " + c.guidelineCitation + "*"
      }));
      newCards.forEach(card => {
        SyncManager.saveRecord('flashcards', card, card.id);
      });
      setFlashcards((prev: any) => [...prev, ...newCards]);
      toast.success(`Success: Generated via ${result.modelName}`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Generation Failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isGenerating && onClose()}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden flex flex-col"
          >
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                  <h2 className="font-serif text-xl font-bold text-slate-100">AI Card Generator</h2>
                </div>
                <button 
                  onClick={onClose}
                  disabled={isGenerating}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-50"
                >
                   <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="space-y-5 mb-8">
                <div>
                   <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                   <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                     {[5, 10, 15].map(q => (
                       <button
                         key={q}
                         onClick={() => setQuantity(q)}
                         className={cn(
                           "flex-1 py-2 text-xs font-medium rounded-md transition",
                           quantity === q ? "bg-teal-600 text-white" : "text-slate-400 hover:text-slate-200"
                         )}
                       >
                         {q} Cards
                       </button>
                     ))}
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Difficulty</label>
                   <select 
                     value={difficulty}
                     onChange={(e) => setDifficulty(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow appearance-none cursor-pointer"
                   >
                     <option>PGY-3 (Intermediate)</option>
                     <option>PGY-5/Fellow (Advanced)</option>
                     <option>Board-Level/Consultant</option>
                   </select>
                </div>

                <div>
                   <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Topic</label>
                   <select 
                     value={topic}
                     onChange={(e) => setTopic(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow appearance-none cursor-pointer"
                   >
                     <option>Heart Failure</option>
                     <option>Ischemic Heart Disease</option>
                     <option>Arrhythmias</option>
                     <option>Valvular Disease</option>
                     <option>General Mix</option>
                   </select>
                </div>

                <div>
                   <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Focus Area</label>
                   <div className="flex flex-wrap gap-2">
                     {focusOptions.map(f => (
                       <button
                         key={f}
                         onClick={() => toggleFocus(f)}
                         className={cn(
                           "px-3 py-1.5 text-[11px] font-medium rounded-full border transition-colors",
                           selectedFocus.includes(f) 
                             ? "bg-teal-500/20 border-teal-500/50 text-teal-300" 
                             : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"
                         )}
                       >
                         {f}
                       </button>
                     ))}
                   </div>
                </div>
             </div>
             
             <div className="flex justify-end items-center gap-3 border-t border-slate-800 pt-4">
                <button 
                  onClick={onClose} 
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-w-[180px]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Consulting Models...
                    </>
                  ) : (
                    "Generate Flashcards"
                  )}
                </button>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- SETTINGS MODAL ---

function SettingsModal() {
  const { isSettingsOpen, setIsSettingsOpen } = useLayout();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setIsSettingsOpen]);

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSettingsOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden flex flex-col"
          >
             <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-xl font-bold text-slate-100">Settings</h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                   <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="space-y-6">
                <DeviceOverrideSelector />
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (isOnline) {
      SyncManager.backgroundSync();
    }
  }, [isOnline]);

  const [deviceMode, setDeviceMode] = useState<DeviceMode>('auto');
  const [view, setView] = useState<'dashboard' | 'study'>('dashboard');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [errorLedger, setErrorLedger] = useState<ErrorLedgerItem[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  
  useEffect(() => {
    async function fetchData() {
      const savedCards = SyncManager.getRecords('flashcards');
      if (savedCards.length > 0) {
        // @ts-ignore
        setFlashcards(savedCards.map(r => r.data));
      }
      // TODO: Fetch from cloud if online and update local store
    }
    fetchData();
  }, []);

  const isMobileMediaQuery = useMediaQuery('(max-width: 768px)');
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const actualMode: ActualMode = deviceMode === 'auto' 
    ? (isMobileMediaQuery ? 'mobile' : 'desktop') 
    : deviceMode;

  return (
    <LayoutContext.Provider value={{ deviceMode, setDeviceMode, actualMode, view, setView, performanceData, errorLedger, flashcards, isLoading, isSettingsOpen, setIsSettingsOpen, isCreateModalOpen, setIsCreateModalOpen, isGenerateModalOpen, setIsGenerateModalOpen, setFlashcards, isOnline }}>
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-teal-500/30 overflow-hidden">
        <Toaster theme="dark" position="bottom-center" />
        <AnimatePresence mode="wait">
          {actualMode === 'desktop' ? (
             <motion.div 
              key="desktop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-screen w-full flex"
             >
               <DesktopLayout />
             </motion.div>
          ) : (
            <motion.div 
              key="mobile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-screen w-full flex flex-col"
            >
              <MobileLayout />
            </motion.div>
          )}
        </AnimatePresence>
        <SettingsModal />
        <CreateCardModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        <GenerateModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} />
      </div>
    </LayoutContext.Provider>
  );
}

// --- FULL DESKTOP LAYOUT ---

function DesktopLayout() {
  const { view, setView, setIsSettingsOpen, isOnline } = useLayout();
  
  return (
    <div className="flex w-full h-full">
       {/* Sidebar */}
       <aside className="w-64 border-r border-slate-800/60 bg-slate-950 flex flex-col h-full shrink-0">
          <div className="p-6 relative">
            <div className="absolute top-6 right-6">
              {isOnline ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-green-500/20 bg-green-500/10" title="Online / Synced">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] tracking-wider font-semibold text-green-400 uppercase hidden">Sync</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-amber-500/20 bg-amber-500/10" title="Offline / Local Only">
                  <CloudOff className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] tracking-wider font-semibold text-amber-400 uppercase hidden">Local</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center">
                <span className="text-white font-bold font-serif">M</span>
              </div>
              <h1 className="font-serif text-xl font-bold tracking-tight">MedTrack <span className="text-teal-400">Pro</span></h1>
            </div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Clinical Board Tracker</p>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-2">
            <button 
              onClick={() => setView('dashboard')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium",
                view === 'dashboard' ? "bg-teal-500/10 text-teal-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button 
               onClick={() => setView('study')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium",
                view === 'study' ? "bg-teal-500/10 text-teal-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              )}
            >
              <RotateCcw className="w-5 h-5" />
              Study Mode
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            >
              <Settings2 className="w-5 h-5" />
              Settings
            </button>
          </nav>
       </aside>

       {/* Main Area */}
       <main className="flex-1 overflow-y-auto bg-slate-950 p-8 h-full">
         <AnimatePresence mode="wait">
           {view === 'dashboard' ? (
              <motion.div 
                key="desktop-dash"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto h-full flex flex-col gap-6"
              >
                  <DesktopStatsRow />
                  
                  <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
                     <div className="col-span-2">
                        <RetentionChart isMobile={false} />
                     </div>
                     <div className="col-span-1 border-slate-800 h-full w-full">
                        <ErrorLedgerLayout />
                     </div>
                  </div>
              </motion.div>
           ) : (
              <motion.div 
                key="desktop-study"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center min-h-[500px]"
              >
                 <StudyFlashcard isMobile={false} />
              </motion.div>
           )}
         </AnimatePresence>
       </main>

       {/* Floating UI */}
       <DesktopAIChatWidget />
    </div>
  );
}

// --- FULL MOBILE LAYOUT ---

function MobileLayout() {
  const { view, setView, setIsSettingsOpen, isOnline } = useLayout();
  
  return (
    <div className="flex flex-col h-full w-full bg-slate-950 relative overflow-hidden">
       {/* Mobile Header */}
       <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold font-serif">M</span>
              </div>
              <div className="absolute -top-1 -right-1">
                {isOnline ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-slate-950 animate-pulse" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center">
                   <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </div>
            <h1 className="font-serif text-lg font-semibold tracking-tight leading-none text-slate-100">MedTrack<span className="text-teal-400">Pro</span></h1>
          </div>
          <div className="flex gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
             <button 
                onClick={() => setView('dashboard')}
                className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition", view === 'dashboard' ? "bg-teal-500/20 text-teal-400" : "text-slate-400")}
             >Dash</button>
             <button 
                onClick={() => setView('study')}
                className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition", view === 'study' ? "bg-teal-500/20 text-teal-400" : "text-slate-400")}
             >Study</button>
             <div className="w-[1px] bg-slate-800 mx-1"></div>
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition flex items-center justify-center"
             ><Settings2 className="w-4 h-4" /></button>
          </div>
       </header>

       {/* Main Scrolling Area */}
       <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
             {view === 'dashboard' ? (
                <motion.div 
                  key="mobile-dash"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-6 py-6 pb-24"
                >
                   {/* Horizontal swipeable cards */}
                   <div className="px-4">
                      <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Overview</h2>
                      <MobileStatsCarousel />
                   </div>

                   {/* Vertical stacking for chart and ledger */}
                   <div className="px-4 h-[320px]">
                      <RetentionChart isMobile={true} />
                   </div>
                   
                   <div className="px-4">
                      <ErrorLedgerLayout />
                   </div>
                   

                </motion.div>
             ) : (
                <motion.div 
                  key="mobile-study"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full w-full p-4 flex flex-col justify-center items-center pb-24"
                >
                   <StudyFlashcard isMobile={true} />
                </motion.div>
             )}
          </AnimatePresence>
       </main>

       {/* Mobile FAB modal AI Assistant */}
       <MobileAIFab />
    </div>
  );
}


// --- SHARED COMPONENTS / REUSABLE PIECES ---

function DeviceOverrideSelector() {
  const { deviceMode, setDeviceMode } = useLayout();
  return (
    <div className="flex flex-col gap-2">
       <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Device Mode Override</span>
       <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => setDeviceMode('auto')}
            className={cn("flex-1 py-1.5 text-xs text-center rounded-md font-medium transition", deviceMode === 'auto' ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300")}
          >Auto</button>
          <button 
            onClick={() => setDeviceMode('desktop')}
            className={cn("flex-1 py-1.5 text-xs text-center rounded-md flex justify-center items-center gap-1 font-medium transition", deviceMode === 'desktop' ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300")}
          ><Monitor className="w-3 h-3" /> Desk</button>
          <button 
            onClick={() => setDeviceMode('mobile')}
            className={cn("flex-1 py-1.5 text-xs text-center rounded-md flex justify-center items-center gap-1 font-medium transition", deviceMode === 'mobile' ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300")}
          ><Smartphone className="w-3 h-3" /> Mob</button>
       </div>
    </div>
  );
}

// Stats Layouts

const dashStats = [
  { title: "Cards Mastered", value: "0", icon: CheckCircle2, color: "text-teal-400", bg: "bg-teal-500/10" },
  { title: "Guideline Adherence", value: "—", icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" },
  { title: "Critical Gaps", value: "0", icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10" },
];

function DesktopStatsRow() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {dashStats.map((s, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">{s.title}</span>
            <span className="text-3xl font-serif text-slate-100">{s.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function MobileStatsCarousel() {
  return (
    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scroll border-x-transparent pb-2 -mx-4 px-4 custom-scrollbar">
      {dashStats.map((s, i) => (
        <div key={i} className="min-w-[200px] snap-center shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-start relative">
          <s.icon className={cn("w-5 h-5 absolute top-4 right-4 opacity-50", s.color)} />
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">{s.title}</span>
           <span className="text-3xl font-serif text-slate-100">{s.value}</span>
        </div>
      ))}
    </div>
  )
}

// Chart Layout

function RetentionChart({ isMobile }: { isMobile?: boolean }) {
  const { performanceData } = useLayout();
  const data = performanceData.length > 0 ? performanceData : Array.from({ length: 30 }, (_, i) => ({ day: `Day ${i+1}`, retention: 0 }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full w-full relative">
      <div className="mb-4">
        <h4 className="text-sm font-serif text-slate-100 uppercase tracking-tight">Knowledge Retention</h4>
        <p className="text-[10px] text-slate-500">{isMobile ? '30d Trend' : '30-day clinical performance trend'}</p>
      </div>
      <div className="flex-1 w-full min-h-0 absolute inset-x-2 inset-y-16 bottom-2 sm:inset-5 sm:top-16 pb-2 px-2">
        {performanceData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
             <div className="bg-slate-900/60 backdrop-blur-[1px] absolute inset-0 rounded-b-2xl"></div>
             <p className="z-20 text-[10px] font-semibold text-slate-400 tracking-widest uppercase bg-slate-950 px-4 py-2 rounded-full border border-slate-800 shadow-xl">Insufficient Data</p>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            {/* Reduced grid & labels for mobile */}
            {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />}
            <XAxis 
              dataKey="day" 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              minTickGap={isMobile ? 60 : 30}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              domain={[40, 100]}
              tickFormatter={(val) => `${val}%`}
              width={isMobile ? 30 : 40}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9', borderRadius: '8px' }}
              itemStyle={{ color: '#2dd4bf' }}
            />
            <Area 
              type="monotone" 
              dataKey="retention" 
              stroke="#14b8a6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRetention)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Error Ledger Layout

function ErrorLedgerLayout() {
  const { errorLedger } = useLayout();
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden h-full relative">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shadow-sm z-10 bg-slate-900">
        <h4 className="text-sm font-serif text-slate-100">The Clinical Ledger</h4>
        <span className="text-[10px] px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20 font-bold uppercase tracking-widest">Review</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
        {errorLedger.length === 0 ? (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             className="m-auto flex flex-col items-center justify-center text-center p-4 space-y-3"
           >
             <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/20 mb-1">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
             </div>
             <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-[200px]">No critical knowledge gaps.</p>
           </motion.div>
        ) : (
          errorLedger.map((err, idx) => (
           <div key={idx} className={cn(
             "p-3 rounded-lg border-l-4 bg-slate-950/50 cursor-pointer border border-transparent shadow-sm",
             err.severity === 'critical' ? "border-l-rose-500" :
             err.severity === 'high' ? "border-l-amber-500" : "border-l-blue-500"
           )}>
              <h4 className="text-xs font-serif text-slate-100 leading-snug">{err.topic}</h4>
              <p className="text-[10px] text-slate-500 mt-1.5 max-w-full truncate">{err.concept}</p>
           </div>
          ))
        )}
      </div>
    </div>
  );
}

// Study Flashcard

function StudyFlashcard({ isMobile }: { isMobile: boolean }) {
  const { flashcards, setFlashcards, setIsCreateModalOpen, setIsGenerateModalOpen } = useLayout();
  const { dueCards, processReview } = useSpacedRepetition(flashcards, setFlashcards);
  const [isFlipped, setIsFlipped] = useState(false);

  if (dueCards.length === 0) {
    return (
      <div className={cn("w-full h-full flex flex-col items-center justify-center text-center", isMobile ? "max-w-full p-4" : "max-w-xl p-8")}>
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex flex-col items-center border border-slate-800 bg-slate-900 rounded-3xl p-8 sm:p-12 shadow-xl"
        >
          <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 mb-2">
             <BookOpen className="w-8 h-8 text-teal-400/80" />
          </div>
          <div>
            <h3 className="text-slate-100 font-serif text-xl sm:text-2xl font-bold mb-3">Deck Complete</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-8 max-w-sm">Excellent work. Add new cards to continue your practice.</p>
          </div>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // TODO: Implement Create Card Modal
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-full shadow-md hover:bg-teal-500 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            Add Flashcard
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (typeof navigator !== 'undefined' && !navigator.onLine) {
                toast.error("Network Disconnected: AI Generation requires an active internet connection.");
              } else {
                setIsGenerateModalOpen(true);
              }
            }}
            className="mt-4 flex items-center gap-2 px-6 py-3 bg-slate-800 text-teal-400 font-semibold rounded-full shadow-md hover:bg-slate-700 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Generate AI Cards
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const flashcardData = dueCards[0];

  return (
    <div className={cn("w-full h-full flex flex-col items-center", isMobile ? "max-w-full pt-4" : "max-w-2xl justify-center")}>
      <div className="w-full [perspective:1000px] flex-1 min-h-[300px] relative">
       <AnimatePresence mode="popLayout">
         <motion.div
            key={flashcardData.id}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1, rotateY: isFlipped ? 180 : 0 }}
            exit={{ x: -300, opacity: 0 }}
            className={cn("absolute inset-0 w-full h-full preserve-3d cursor-pointer")}
            onClick={() => !isFlipped && setIsFlipped(true)}
            transition={{ type: "spring", stiffness: 200, damping: 25, mass: 1 }}
            style={{ transformStyle: 'preserve-3d' }}
         >
             {/* FRONT OF CARD */}
            <div 
              className={cn(
                "absolute inset-0 backface-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-12 shadow-xl flex flex-col justify-center items-center text-center",
                "group transition-colors"
              )}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="absolute top-6 left-6 text-slate-600">
                <BrainCircuit className="w-6 h-6 opacity-30" />
              </div>
              <p className={cn("font-serif text-slate-100 leading-relaxed italic", isMobile ? "text-lg max-w-[90%]" : "text-xl md:text-2xl max-w-xl mb-6")}>
                "{flashcardData.front}"
              </p>
              
              {!isMobile && (
                <button className={cn(
                  "mt-8 px-6 py-3 bg-teal-500 text-slate-950 font-bold rounded-full text-[10px] uppercase tracking-widest",
                   isFlipped ? "opacity-0 pointer-events-none" : "opacity-100"
                )}>
                  Reveal Answer
                </button>
              )}
              
              {isMobile && !isFlipped && (
                 <div className="absolute bottom-6 w-full px-6 left-0">
                    <div className="w-full text-center bg-teal-500 text-slate-950 font-bold text-xs py-4 rounded-xl uppercase tracking-widest active:bg-teal-400">
                      Tap to Reveal
                    </div>
                 </div>
              )}
            </div>

            {/* BACK OF CARD */}
            <div 
              className="absolute inset-0 backface-hidden bg-slate-800 border border-teal-500/40 rounded-3xl p-6 md:p-12 shadow-[0_0_30px_rgba(20,184,166,0.1)] flex flex-col overflow-y-auto custom-scrollbar"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="flex-1 text-left prose prose-invert max-w-none text-sm md:text-base">
                <Markdown
                  components={{
                    h3: ({node, ...props}) => <h3 className="text-teal-400 font-serif font-bold text-lg md:text-xl mt-6 mb-3 first:mt-0" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 mb-6 text-slate-300 marker:text-teal-500" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-slate-100" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 text-slate-300 leading-relaxed" {...props} />,
                    em: ({node, ...props}) => <em className="text-slate-400 italic text-[11px] md:text-sm block mb-2" {...props} />
                  }}
                >
                  {flashcardData.back}
                </Markdown>
              </div>
            </div>
         </motion.div>
       </AnimatePresence>
      </div>

       {/* RATING CONTROLS */}
       <div className={cn("flex items-center justify-center shrink-0", isMobile ? "h-24 w-full" : "h-32 mt-8")}>
        <AnimatePresence>
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, type: "spring" }}
              className={cn("flex items-center gap-2", isMobile ? "w-full justify-between px-2" : "gap-4 p-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl")}
            >
              {[
                { label: 'Again', quality: 0, color: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 md:border-rose-500/20' },
                { label: 'Hard', quality: 3, color: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 md:border-amber-500/20' },
                { label: 'Good', quality: 4, color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 md:border-blue-500/20' },
                { label: 'Easy', quality: 5, color: 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 md:border-teal-500/20' },
              ].map((btn, i) => (
                <button
                  key={btn.label}
                  onClick={() => {
                     setIsFlipped(false);
                     if (flashcardData.id) {
                       processReview(flashcardData.id, btn.quality);
                     }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl transition-all duration-200 border-transparent",
                    isMobile ? "flex-1 h-[56px] min-h-[44px] border relative border-slate-700/50" : "w-24 h-16 border bg-slate-950/50 border-slate-800",
                    btn.color.split(' ')[1] // text color
                  )}
                  style={{
                    backgroundColor: isMobile ? undefined : ''
                  }}
                >
                   {/* Mobile just uses text to save space and fit 44px hit targets easily */}
                   <div className={cn("absolute inset-0 rounded-xl opacity-20", isMobile ? btn.color.split(' ')[0] : '')}></div>
                   <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider relative z-10">{btn.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// AI WIDGETS

function DesktopAIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
           <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 w-[360px] bg-slate-900 border border-teal-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]"
          >
             <AiChatContents onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-12 h-12 rounded-full shadow-2xl flex items-center justify-center border transition-all duration-300",
          isOpen 
            ? "bg-slate-800 border-slate-700 text-slate-400" 
            : "bg-teal-500 border-teal-400 text-slate-950 hover:shadow-teal-500/25"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>
    </div>
  )
}

function MobileAIFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-teal-500 text-slate-950 rounded-full shadow-[0_0_20px_rgba(20,184,166,0.3)] flex items-center justify-center z-40 border border-teal-400"
      >
         <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Full screen modal for Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-slate-900 flex flex-col"
          >
             <AiChatContents onClose={() => setIsOpen(false)} isMobile />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function AiChatContents({ onClose, isMobile }: { onClose: () => void, isMobile?: boolean }) {
  return (
    <>
      <div className={cn("flex flex-shrink-0 items-center justify-between p-4 bg-slate-950 border-b border-slate-800", isMobile ? "pt-12" : "")}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold font-serif">M</span>
          </div>
          <div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Clinical AI Assistant</h4>
              <p className="text-[9px] text-teal-400">Board Certified Match</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4 justify-center bg-slate-900 custom-scrollbar">
        <div className="w-12 h-12 rounded-full border border-teal-500/20 bg-slate-950 flex flex-col items-center justify-center shadow-lg">
           <MessageCircle className="w-6 h-6 text-teal-500" />
        </div>
        <p className="text-xs text-slate-500 font-medium tracking-wide">AI Assistant is ready.</p>
      </div>

      <div className={cn("p-4 bg-slate-950 border-t border-slate-800 flex-shrink-0", isMobile ? "pb-8" : "")}>
         <div className="relative">
            <input 
              disabled
              placeholder="Ask a clinical question..." 
              className="w-full bg-slate-900 border border-slate-700 rounded-full px-4 py-3 min-h-[44px] text-xs text-slate-300 focus:outline-none focus:border-teal-500 transition-colors pr-12"
            />
            <button className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-teal-500 text-slate-950 rounded-full flex items-center justify-center min-w-[36px] min-h-[36px]">
              <ChevronRight className="w-5 h-5 ml-0.5" />
            </button>
         </div>
      </div>
    </>
  )
}
