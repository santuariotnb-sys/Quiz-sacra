import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  src: string;
};

export function CheckoutModal({ open, onClose, src }: Props) {
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const iframeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      document.body.style.overflow = "hidden";

      // BUG 4 fallback: se iframe não carregar em 4s (X-Frame-Options block),
      // redireciona direto para a URL do Kirvano
      iframeTimerRef.current = window.setTimeout(() => {
        if (loading) {
          window.location.href = src;
        }
      }, 4000);
    } else {
      document.body.style.overflow = "";
      if (iframeTimerRef.current) {
        clearTimeout(iframeTimerRef.current);
        iframeTimerRef.current = null;
      }
    }
    return () => {
      document.body.style.overflow = "";
      if (iframeTimerRef.current) {
        clearTimeout(iframeTimerRef.current);
      }
    };
  }, [open, src]);

  const handleIframeLoad = () => {
    setLoading(false);
    if (iframeTimerRef.current) {
      clearTimeout(iframeTimerRef.current);
      iframeTimerRef.current = null;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-3xl h-[90vh] rounded-2xl overflow-hidden bg-[color:var(--milk)] shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[color:var(--deep-purple)] shadow-sm hover:bg-white transition"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color:var(--milk)] z-[5]">
                <Loader2 className="w-8 h-8 animate-spin text-[color:var(--amethyst)]" />
                <p className="text-sm text-[color:var(--amethyst)]">
                  Carregando checkout seguro…
                </p>
              </div>
            )}

            <iframe
              src={open ? src : "about:blank"}
              title="Checkout Kirvano"
              onLoad={handleIframeLoad}
              className="w-full h-full border-0"
              allow="payment *"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
