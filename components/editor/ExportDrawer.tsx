"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Shield, X } from "lucide-react";
import { InlineLoadingAnimation } from "@/components/loading-animation";
import { Button } from "@/components/ui/button";
import { LiquidChromeButton } from "@/components/ui/liquid-chrome-button";
import { useEditor } from "./EditorContext";
import { toast } from "sonner";

const EXPORT_TARGETS = [
  { id: "tiktok", label: "TikTok", provider: "tiktok" },
  { id: "youtube", label: "YouTube", provider: "youtube" },
  { id: "instagram", label: "Instagram", provider: "instagram" },
  { id: "x", label: "X", provider: "x" },
  { id: "facebook", label: "Facebook", provider: "facebook" },
  { id: "linkedin", label: "LinkedIn", provider: "linkedin" },
  { id: "drive", label: "Google Drive", provider: "google_drive" },
  { id: "dropbox", label: "Dropbox", provider: "dropbox" },
];

export function ExportDrawer() {
  const router = useRouter();
  const { showExport, setShowExport, currentVideoUrl } = useEditor();
  const [authPromptProvider, setAuthPromptProvider] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Mock data for export - in a real P0 these would come from project state
  const projectTitle = "Prometheus Cinematic Export";

  const { data: connections } = useQuery({
    queryKey: ["user-connections"],
    queryFn: async () => {
      const res = await fetch("/api/user/connections");
      if (!res.ok) throw new Error("Failed to fetch connections");
      return res.json();
    },
    enabled: showExport,
  });

  const isConnected = (provider: string) => connections?.some((c: any) => c.provider === provider && c.connected);

  const handleExport = async (target: any) => {
    if (!isConnected(target.provider)) { 
      setAuthPromptProvider(target.provider); 
      return; 
    }

    setIsExporting(true);
    const toastId = toast.loading(`Publishing to ${target.label}...`);

    try {
      const res = await fetch(`/api/export/${target.provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          videoUrl: currentVideoUrl, 
          caption: projectTitle,
          title: projectTitle,
          fileName: `${projectTitle.toLowerCase().replace(/\s+/g, '-')}.mp4`
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");

      toast.success(`Published to ${target.label}!`, { id: toastId });
      setShowExport(false);
    } catch (e: any) {
      console.error("Export error:", e);
      toast.error(`Failed to publish: ${e.message}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (!showExport) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
        onClick={() => setShowExport(false)}
      >
        <motion.div 
          initial={{ y: '100%' }} 
          animate={{ y: 0 }} 
          exit={{ y: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md mx-4 mb-4 rounded-2xl bg-[#0c0c10]/90 backdrop-blur-[32px] border border-white/[0.08] shadow-2xl max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-end p-3">
            <button onClick={() => setShowExport(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X size={16} className="text-white/40" />
            </button>
          </div>
          
          <div className="px-5 pb-6">
            <h3 className="text-lg font-semibold text-white/90 mb-4">Export Video</h3>
            <div className="grid grid-cols-2 gap-3">
              {EXPORT_TARGETS.map(target => (
                <LiquidChromeButton 
                  key={target.id} 
                  onClick={() => handleExport(target)}
                  disabled={isExporting}
                  variant={isConnected(target.provider) ? "secondary" : "ghost"}
                  size="lg"
                  liquid
                  magnetic
                  ripple
                  className="h-auto min-h-[5.5rem] rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex-col items-center gap-2 hover:border-[rgba(0,255,136,0.3)] hover:shadow-[0_0_20px_rgba(0,255,136,0.15)] group disabled:opacity-50 disabled:cursor-not-allowed">
                  {isExporting ? (
                    <InlineLoadingAnimation size={20} label={`Publishing to ${target.label}`} />
                  ) : (
                    <span className="text-sm text-white/80 group-hover:text-white transition-colors">{target.label}</span>
                  )}
                  {!isExporting && (
                    isConnected(target.provider) ? (
                      <span className="text-[10px] text-[#00ff88] uppercase tracking-wider">Connected</span>
                    ) : (
                      <span className="text-[10px] text-white/30 uppercase tracking-wider">Not Connected</span>
                    )
                  )}
                </LiquidChromeButton>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {authPromptProvider && (
          <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAuthPromptProvider(null)}>
            <motion.div className="p-8 max-w-md w-full mx-4 bg-[#0c0c10] backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl"
              initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-amber-400" />
                  <h3 className="text-lg font-semibold text-white">Authorization Required</h3>
                </div>
                <button onClick={() => setAuthPromptProvider(null)} className="text-white/40 hover:text-white/80 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-zinc-400 mb-6 leading-relaxed">
                Prometheus requires authorization to publish directly to your{" "}
                <span className="text-white font-medium">{EXPORT_TARGETS.find(t => t.provider === authPromptProvider)?.label}</span>{" "}
                account. Your credentials are encrypted with AES-256-GCM and never exposed to the frontend.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setAuthPromptProvider(null)} className="flex-1 bg-white/5 border-white/10 text-white/70 hover:bg-white/10 transition-colors">Cancel</Button>
                <LiquidChromeButton onClick={() => { setAuthPromptProvider(null); setShowExport(false); router.push(`/settings/social-accounts?connect=${authPromptProvider}`); }}
                  variant="primary"
                  size="md"
                  liquid
                  magnetic
                  ripple
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/20 border-none transition-all">
                  Configure Integrations
                </LiquidChromeButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
