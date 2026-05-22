import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoPrincipal from "@/assets/logo-principal.png";
import loadingBuilding from "@/assets/loading-construindo.png";

interface LoginTransitionProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string;
  userCargo?: string;
}

export function LoginTransition({ onComplete, userName, userAvatar, userCargo }: LoginTransitionProps) {
  const [phase, setPhase] = useState<"blank" | "logo" | "building" | "welcome" | "fade" | "done">("blank");
  const { settings } = useSiteSettings();
  const logoUrl = settings.logo_url || logoPrincipal;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEndedRef = useRef(false);
  const visualDoneRef = useRef(false);
  const displayName = userName || "Usuário";

  const tryFinish = () => {
    if (audioEndedRef.current && visualDoneRef.current) {
      onComplete();
    }
  };

  useEffect(() => {
    const now = new Date();
    const audioDay = new Date(now);
    if (now.getHours() < 7) {
      audioDay.setDate(audioDay.getDate() - 1);
    }
    const dayKey = `${audioDay.getFullYear()}-${audioDay.getMonth() + 1}-${audioDay.getDate()}`;
    const storageKey = "login-welcome-audio-last-day";
    const lastPlayedDay = localStorage.getItem(storageKey);

    if (lastPlayedDay === dayKey) {
      audioEndedRef.current = true;
      tryFinish();
      return;
    }

    localStorage.setItem(storageKey, dayKey);

    const audio = new Audio("/sounds/login-welcome.wav");
    audio.volume = 0.5;
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      audioEndedRef.current = true;
      tryFinish();
    });

    audio.addEventListener("error", () => {
      audioEndedRef.current = true;
      tryFinish();
    });

    audio.play().catch(() => {
      audioEndedRef.current = true;
      tryFinish();
    });
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 300);
    const t2 = setTimeout(() => setPhase("building"), 3500);
    const t3 = setTimeout(() => setPhase("welcome"), 6500);
    const t4 = setTimeout(() => setPhase("fade"), 9500);
    const t5 = setTimeout(() => {
      setPhase("done");
      visualDoneRef.current = true;
      tryFinish();
    }, 10300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  return (
    <>
      <div className="loading-screen-3d-root">
        {/* Phase: Logo Initial */}
        {phase === "logo" && (
          <div className="lt-logo-wrap">
            <img src={logoUrl} alt="Logo" className="lt-logo-img" />
          </div>
        )}

        {/* Phase: Building Animation — uses reference image as background */}
        {phase === "building" && (
          <div className="loading-screen-img">
            <img src={loadingBuilding} alt="Construindo Ambiente Seguro" className="loading-bg-img" />
          </div>
        )}

        {/* Phase: Welcome (Final Result) */}
        {(phase === "welcome" || phase === "fade") && (
          <div className="lt-welcome">
            <div className="lt-avatar-wrap">
              {userAvatar ? (
                <img src={userAvatar} className="lt-avatar" />
              ) : (
                <div className="lt-avatar lt-avatar-fallback">
                  <User className="w-16 h-16 text-slate-400" />
                </div>
              )}
              <div className="lt-avatar-ring" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-blue-400 text-sm font-light tracking-[0.4em] uppercase opacity-70">
                Acesso Autorizado
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                {displayName}
              </h1>
              {userCargo && (
                <p className="text-slate-400 text-xs font-medium tracking-[0.2em] uppercase pt-2">
                  {userCargo}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .loading-screen-3d-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
          overflow: hidden;
          background: #020713;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lt-logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          animation: ltFadeIn 0.7s ease-out;
        }
        .lt-logo-img {
          height: 5rem;
          object-fit: contain;
          filter: brightness(1.25) drop-shadow(0 0 15px rgba(255,255,255,0.3));
        }

        /* ===== LOADING 3D 4K - SISTEMA DE GESTÃO ===== */
        .loading-screen {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background:
            radial-gradient(circle at 50% 35%, rgba(0, 120, 255, .22), transparent 35%),
            linear-gradient(180deg, #020713 0%, #050b1c 45%, #02040c 100%);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Inter", "Segoe UI", sans-serif;
          color: #9fd0ff;
        }
        .loading-screen::before {
          content: "";
          position: absolute;
          inset: 55% -20% -10%;
          background-image:
            linear-gradient(rgba(0, 120, 255, .22) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 120, 255, .22) 1px, transparent 1px);
          background-size: 90px 90px;
          transform: perspective(700px) rotateX(62deg);
          transform-origin: top;
          filter: drop-shadow(0 0 18px rgba(0, 119, 255, .35));
          animation: gridMove 4s linear infinite;
        }
        .loading-screen::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background:
            radial-gradient(circle at 15% 40%, rgba(0, 140, 255, .15), transparent 18%),
            radial-gradient(circle at 85% 40%, rgba(0, 140, 255, .12), transparent 18%);
          pointer-events: none;
        }
        .loading-box {
          position: relative;
          z-index: 2;
          text-align: center;
          animation: floatBox 3.5s ease-in-out infinite;
        }
        .loading-3d-icon {
          position: relative;
          width: 280px;
          height: 280px;
          margin: 0 auto 55px;
          transform-style: preserve-3d;
          perspective: 1200px;
        }
        .loading-card,
        .loading-card-2,
        .loading-card-3 {
          position: absolute;
          inset: 28px;
          border: 2px solid rgba(67, 163, 255, .75);
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(40, 133, 255, .18), rgba(2, 12, 35, .12));
          box-shadow:
            0 0 25px rgba(0, 135, 255, .45),
            inset 0 0 30px rgba(120, 190, 255, .18);
          backdrop-filter: blur(10px);
        }
        .loading-card {
          transform: rotateZ(0deg) rotateY(16deg);
          animation: rotateCard 7s linear infinite;
        }
        .loading-card-2 {
          transform: rotateZ(55deg) rotateY(-18deg);
          animation: rotateCard2 9s linear infinite;
        }
        .loading-card-3 {
          transform: rotateZ(-35deg) rotateX(18deg);
          animation: rotateCard3 11s linear infinite;
        }
        .house-3d {
          position: absolute;
          inset: 60px;
          z-index: 5;
          filter:
            drop-shadow(0 14px 10px rgba(0, 0, 0, .7))
            drop-shadow(0 0 22px rgba(33, 142, 255, .95));
        }
        .house-3d::before {
          content: "";
          position: absolute;
          inset: 18px 15px 8px;
          background: linear-gradient(145deg, #62b6ff, #0757c8 52%, #002a6d);
          clip-path: polygon(50% 0%, 100% 38%, 100% 100%, 68% 100%, 68% 58%, 32% 58%, 32% 100%, 0 100%, 0 38%);
          border-radius: 16px;
          box-shadow:
            inset 7px 7px 14px rgba(255,255,255,.28),
            inset -10px -12px 22px rgba(0,0,0,.55),
            0 0 45px rgba(0, 132, 255, .85);
        }
        .house-3d::after {
          content: "";
          position: absolute;
          inset: 38px 38px 20px;
          background: #020814;
          clip-path: polygon(50% 0%, 100% 35%, 100% 100%, 72% 100%, 72% 54%, 28% 54%, 28% 100%, 0 100%, 0 35%);
          opacity: .88;
        }
        .tool-hammer,
        .tool-barrier {
          position: absolute;
          z-index: 6;
          font-size: 46px;
          font-weight: 900;
          text-shadow:
            0 0 12px currentColor,
            0 12px 12px rgba(0,0,0,.55);
          animation: toolWork 1.1s ease-in-out infinite;
        }
        .tool-hammer {
          left: -55px;
          top: 20px;
          color: #ffc400;
          transform: rotate(-25deg);
        }
        .tool-hammer::before { content: "🔨"; }
        .tool-barrier {
          right: -65px;
          bottom: 42px;
          color: #ff8c1a;
          animation-delay: .35s;
        }
        .tool-barrier::before { content: "🚧"; }
        .loading-title {
          font-size: clamp(18px, 3vw, 34px);
          letter-spacing: 12px;
          text-transform: uppercase;
          font-weight: 800;
          color: #a9d7ff;
          text-shadow:
            0 0 8px rgba(112, 185, 255, .9),
            0 0 30px rgba(0, 123, 255, .7);
          animation: textPulse 1.8s ease-in-out infinite;
        }
        .loading-subtitle {
          margin-top: 12px;
          font-size: 13px;
          letter-spacing: 5px;
          color: rgba(160, 210, 255, .75);
          text-transform: uppercase;
        }
        .progress-3d {
          width: min(620px, 78vw);
          height: 22px;
          margin: 28px auto 0;
          padding: 4px;
          border-radius: 999px;
          background: linear-gradient(180deg, #071227, #020611);
          box-shadow:
            inset 0 2px 8px rgba(0,0,0,.9),
            0 0 25px rgba(0, 140, 255, .45);
          overflow: hidden;
        }
        .progress-3d span {
          display: block;
          height: 100%;
          width: 0%;
          border-radius: inherit;
          background:
            linear-gradient(90deg, #00b7ff, #2bd8ff, #008cff),
            repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,.25) 12px 24px);
          box-shadow:
            inset 0 2px 6px rgba(255,255,255,.55),
            0 0 18px rgba(0, 208, 255, .95);
          animation: loadingFill 3s ease-in-out forwards, shine 1.2s linear infinite;
        }
        .loading-percent::after {
          content: "0%";
          display: block;
          margin-top: 14px;
          font-size: 18px;
          font-weight: 700;
          color: #6fc7ff;
          text-shadow: 0 0 14px rgba(0, 170, 255, .9);
          animation: percentText 3s linear forwards;
        }

        /* Welcome phase */
        .lt-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: ltFadeInUp 1s ease-out;
        }
        .lt-avatar-wrap {
          position: relative;
          margin-bottom: 2rem;
        }
        .lt-avatar {
          width: 8rem;
          height: 8rem;
          border-radius: 9999px;
          object-fit: cover;
          border: 4px solid rgba(59,130,246,0.3);
          box-shadow: 0 0 30px rgba(59,130,246,0.5);
        }
        .lt-avatar-fallback {
          background: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lt-avatar-ring {
          position: absolute;
          inset: -0.5rem;
          border: 2px solid rgba(96,165,250,0.2);
          border-radius: 9999px;
          animation: ltPing 1.5s cubic-bezier(0,0,0.2,1) infinite;
        }

        @keyframes loadingFill { to { width: 100%; } }
        @keyframes percentText {
          0% { content: "0%"; }
          10% { content: "10%"; }
          25% { content: "25%"; }
          40% { content: "40%"; }
          55% { content: "55%"; }
          70% { content: "70%"; }
          85% { content: "85%"; }
          100% { content: "100%"; }
        }
        @keyframes gridMove {
          from { background-position: 0 0; }
          to { background-position: 0 90px; }
        }
        @keyframes floatBox {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-14px) scale(1.02); }
        }
        @keyframes rotateCard { to { transform: rotateZ(360deg) rotateY(16deg); } }
        @keyframes rotateCard2 { to { transform: rotateZ(-305deg) rotateY(-18deg); } }
        @keyframes rotateCard3 { to { transform: rotateZ(325deg) rotateX(18deg); } }
        @keyframes toolWork {
          0%, 100% { transform: translateY(0) rotate(-18deg) scale(1); }
          50% { transform: translateY(-10px) rotate(8deg) scale(1.08); }
        }
        @keyframes textPulse {
          0%, 100% { opacity: .75; }
          50% { opacity: 1; }
        }
        @keyframes shine {
          from { filter: brightness(1); }
          to { filter: brightness(1.45); }
        }
        @keyframes ltFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes ltFadeInUp {
          from { opacity: 0; transform: translateY(2rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ltPing {
          75%, 100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </>
  );
}
