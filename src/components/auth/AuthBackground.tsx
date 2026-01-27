import { useMemo } from "react";

// Bible verses array - one for each day of the year
const bibleVerses = [
  { verse: "O Senhor é o meu pastor; nada me faltará.", reference: "Salmos 23:1" },
  { verse: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13" },
  { verse: "Confia no Senhor de todo o teu coração.", reference: "Provérbios 3:5" },
  { verse: "O Senhor é a minha luz e a minha salvação.", reference: "Salmos 27:1" },
  { verse: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.", reference: "João 3:16" },
  { verse: "Não temas, porque eu sou contigo.", reference: "Isaías 41:10" },
  { verse: "Sede fortes e corajosos.", reference: "Josué 1:9" },
  { verse: "O amor é paciente, o amor é bondoso.", reference: "1 Coríntios 13:4" },
  { verse: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.", reference: "Salmos 37:5" },
  { verse: "Busquem em primeiro lugar o Reino de Deus e a sua justiça.", reference: "Mateus 6:33" },
  { verse: "Eu sou o caminho, a verdade e a vida.", reference: "João 14:6" },
  { verse: "A fé é a certeza daquilo que esperamos.", reference: "Hebreus 11:1" },
  { verse: "Deus é o nosso refúgio e fortaleza.", reference: "Salmos 46:1" },
  { verse: "Em tudo dai graças.", reference: "1 Tessalonicenses 5:18" },
  { verse: "O Senhor abençoe e te guarde.", reference: "Números 6:24" },
  { verse: "Porque os que esperam no Senhor renovarão as suas forças.", reference: "Isaías 40:31" },
  { verse: "Alegrem-se sempre no Senhor.", reference: "Filipenses 4:4" },
  { verse: "O Senhor é bom, um refúgio em tempos de angústia.", reference: "Naum 1:7" },
  { verse: "Eu vim para que tenham vida, e a tenham em abundância.", reference: "João 10:10" },
  { verse: "Lança o teu cuidado sobre o Senhor, e ele te susterá.", reference: "Salmos 55:22" },
  { verse: "Não andeis ansiosos por coisa alguma.", reference: "Filipenses 4:6" },
  { verse: "O Senhor é fiel; ele vos fortalecerá e guardará.", reference: "2 Tessalonicenses 3:3" },
  { verse: "Bem-aventurados os pacificadores.", reference: "Mateus 5:9" },
  { verse: "A misericórdia do Senhor dura para sempre.", reference: "Salmos 136:1" },
  { verse: "Eis que estou convosco todos os dias.", reference: "Mateus 28:20" },
  { verse: "Vinde a mim, todos os que estais cansados e oprimidos.", reference: "Mateus 11:28" },
  { verse: "O fruto do Espírito é amor, alegria, paz.", reference: "Gálatas 5:22" },
  { verse: "Em todas as coisas somos mais que vencedores.", reference: "Romanos 8:37" },
  { verse: "Dai, e ser-vos-á dado.", reference: "Lucas 6:38" },
  { verse: "A tua palavra é lâmpada para os meus pés.", reference: "Salmos 119:105" },
  { verse: "E conhecereis a verdade, e a verdade vos libertará.", reference: "João 8:32" },
];

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  type: "small" | "medium" | "large";
}

export function AuthBackground() {
  // Generate random particles with varied sizes
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const rand = Math.random();
      let type: Particle["type"];
      let size: number;
      let opacity: number;

      if (rand < 0.5) {
        // 50% small particles
        type = "small";
        size = 1 + Math.random() * 2;
        opacity = 0.15 + Math.random() * 0.25;
      } else if (rand < 0.8) {
        // 30% medium particles
        type = "medium";
        size = 3 + Math.random() * 3;
        opacity = 0.2 + Math.random() * 0.3;
      } else {
        // 20% large particles
        type = "large";
        size = 5 + Math.random() * 4;
        opacity = 0.25 + Math.random() * 0.35;
      }

      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        duration: 8 + Math.random() * 12,
        delay: Math.random() * 8,
        opacity,
        type,
      };
    });
  }, []);

  // Get daily verse based on day of year
  const dailyVerse = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return bibleVerses[dayOfYear % bibleVerses.length];
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Main black background with centered gray radial gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse 80% 60% at 50% 50%,
            hsl(220, 10%, 25%) 0%,
            hsl(220, 12%, 18%) 25%,
            hsl(220, 15%, 12%) 50%,
            hsl(220, 18%, 6%) 75%,
            hsl(0, 0%, 0%) 100%
          )`
        }}
      />

      {/* Subtle inner glow for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            circle at 50% 45%,
            rgba(100, 110, 130, 0.15) 0%,
            transparent 45%
          )`
        }}
      />

      {/* Floating particles with varied sizes */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute rounded-full animate-float-particle ${
            particle.type === "large"
              ? "bg-white/30"
              : "bg-white/20"
          }`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            boxShadow: particle.type === "large"
              ? `0 0 ${particle.size}px ${particle.size / 2}px rgba(255, 255, 255, 0.15)`
              : "none",
          }}
        />
      ))}

      {/* Vignette effect on edges */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 40%,
            rgba(0, 0, 0, 0.5) 100%
          )`
        }}
      />

      {/* Daily Bible verse at bottom */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center px-6 text-center animate-fade-in">
        <p className="text-white/60 text-sm italic max-w-md leading-relaxed">
          "{dailyVerse.verse}"
        </p>
        <p className="text-white/40 text-xs mt-1.5 font-medium tracking-wide">
          — {dailyVerse.reference}
        </p>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes float-particle {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-5px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
        
        .animate-float-particle {
          animation: float-particle ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
