import { useState, useEffect } from "react";

export default function CoverPage({ onEnter }: { onEnter: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-6"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-bypass]")) {
          onEnter();
        }
      }}
    >
      <div
        className={`max-w-lg w-full text-center transition-all duration-1000 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          data-bypass
          data-testid="cover-heading"
        >
          SignalLayerOS™
        </h1>

        <p className="text-sm sm:text-base text-white/50 font-medium tracking-widest uppercase mb-12" data-testid="cover-subheadline">
          Vertical GTM Intelligence Engine
        </p>

        <div className="space-y-6 text-sm sm:text-[15px] leading-relaxed text-white/60">
          <p>
            The internal signal detection and vertical dominance system
            <br className="hidden sm:block" />
            {" "}powering AgentLayerOS.
          </p>

          <p className="text-white/40">Not publicly available.</p>

          <p>
            Built for focused expansion.
            <br />
            One vertical at a time.
          </p>
        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
            We don't guess. We detect coordination breakdown before revenue feels it.
          </p>
          <a
            href="mailto:laura@agentlayeros.com"
            className="inline-block mt-3 text-sm text-white/70 hover:text-white transition-colors duration-300 underline underline-offset-4 decoration-white/20 hover:decoration-white/50"
            data-testid="cover-email-link"
          >
            laura@agentlayeros.com
          </a>
        </div>
      </div>
    </div>
  );
}
