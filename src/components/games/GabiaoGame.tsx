import { useState, useCallback, useEffect, useRef } from "react";
import { useSaveGameScore } from "@/hooks/useGameScores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Star, Check, X, Timer, Zap, ArrowLeft, Heart, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GabiaoQuestion {
  id: string;
  scenario: string;
  emoji: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: "estrutura" | "drenagem" | "manutencao" | "seguranca";
}

const ALL_QUESTIONS: GabiaoQuestion[] = [
  {
    id: "g1", category: "estrutura", emoji: "🪨",
    scenario: "Qual é o principal material utilizado no preenchimento de gabiões?",
    options: ["Areia", "Pedra de mão (rachão)", "Cimento", "Terra compactada"],
    correctIndex: 1,
    explanation: "Gabiões são preenchidos com pedras de mão (rachão) que permitem drenagem natural e oferecem resistência estrutural."
  },
  {
    id: "g2", category: "estrutura", emoji: "🔗",
    scenario: "Qual material compõe a tela/malha do gabião?",
    options: ["Arame galvanizado de dupla torção", "Tela de nylon", "Grade de madeira", "Fibra de vidro"],
    correctIndex: 0,
    explanation: "A tela de arame galvanizado de dupla torção é resistente à corrosão e garante a integridade estrutural do gabião."
  },
  {
    id: "g3", category: "drenagem", emoji: "💧",
    scenario: "Qual a principal função do gabião em obras de infraestrutura?",
    options: [
      "Decoração paisagística",
      "Contenção de encostas e proteção contra erosão",
      "Pavimentação de estradas",
      "Geração de energia"
    ],
    correctIndex: 1,
    explanation: "Gabiões são estruturas de contenção que protegem encostas contra erosão, controlam drenagem e estabilizam taludes."
  },
  {
    id: "g4", category: "manutencao", emoji: "🔍",
    scenario: "Na inspeção de gabiões, qual sinal indica necessidade de reparo urgente?",
    options: [
      "Presença de vegetação entre as pedras",
      "Rompimento da tela com perda de pedras",
      "Coloração escura das pedras",
      "Presença de insetos"
    ],
    correctIndex: 1,
    explanation: "O rompimento da tela com perda de pedras compromete a integridade estrutural e exige reparo imediato para evitar desmoronamento."
  },
  {
    id: "g5", category: "seguranca", emoji: "🦺",
    scenario: "Qual EPI é específico para o trabalho de montagem de gabiões?",
    options: [
      "Óculos de sol",
      "Luvas de raspa de couro para manuseio de arame e pedras",
      "Máscara PFF1",
      "Protetor solar"
    ],
    correctIndex: 1,
    explanation: "Luvas de raspa de couro protegem contra cortes no manuseio de arames e abrasão no contato com pedras."
  },
  {
    id: "g6", category: "drenagem", emoji: "🌊",
    scenario: "Por que o gabião é considerado uma estrutura permeável?",
    options: [
      "Porque é feito de plástico",
      "Porque os espaços entre as pedras permitem a passagem da água",
      "Porque possui furos na tela",
      "Porque absorve água como esponja"
    ],
    correctIndex: 1,
    explanation: "Os vazios entre as pedras permitem que a água passe livremente, aliviando a pressão hidrostática e prevenindo o acúmulo de água atrás da estrutura."
  },
  {
    id: "g7", category: "estrutura", emoji: "📏",
    scenario: "Qual a diferença entre gabião caixa e gabião colchão (Reno)?",
    options: [
      "São idênticos",
      "O caixa é mais alto (>0.5m) para contenção; o colchão é raso (<0.3m) para revestimento",
      "O colchão é mais resistente",
      "O caixa é usado apenas em rios"
    ],
    correctIndex: 1,
    explanation: "Gabião caixa tem altura acima de 0.5m para contenção de taludes. O colchão Reno é raso (até 0.3m) e reveste margens e leitos contra erosão."
  },
  {
    id: "g8", category: "manutencao", emoji: "🌱",
    scenario: "A vegetação que cresce nos gabiões deve ser:",
    options: [
      "Sempre removida completamente",
      "Mantida quando rasteira (ajuda na estabilização), removida quando arbórea (danifica a tela)",
      "Ignorada completamente",
      "Regada diariamente"
    ],
    correctIndex: 1,
    explanation: "Vegetação rasteira ajuda a estabilizar o gabião. Plantas arbóreas devem ser removidas pois suas raízes podem deformar e romper a tela."
  },
  {
    id: "g9", category: "seguranca", emoji: "⚠️",
    scenario: "Qual o principal risco ao trabalhar na recomposição de gabiões em taludes?",
    options: [
      "Queimadura solar",
      "Queda de materiais e instabilidade do terreno",
      "Picada de inseto",
      "Excesso de barulho"
    ],
    correctIndex: 1,
    explanation: "Em taludes, há risco de queda de pedras e deslizamento. É obrigatório isolamento da área e uso de cinto de segurança quando necessário."
  },
  {
    id: "g10", category: "drenagem", emoji: "🔄",
    scenario: "Para que serve a manta geotêxtil colocada atrás do gabião?",
    options: [
      "Apenas para estética",
      "Para filtrar finos do solo e evitar que obstruam os vazios entre as pedras",
      "Para impermeabilizar",
      "Para aumentar o peso"
    ],
    correctIndex: 1,
    explanation: "A manta geotêxtil atua como filtro, impedindo que partículas finas do solo obstruam os vazios entre as pedras e comprometam a drenagem."
  },
  {
    id: "g11", category: "estrutura", emoji: "🏗️",
    scenario: "Como as caixas de gabião são conectadas entre si?",
    options: [
      "Com cimento",
      "Com arame de costura/amarração",
      "Com cola especial",
      "Apenas empilhadas"
    ],
    correctIndex: 1,
    explanation: "As caixas são costuradas entre si com arame galvanizado, formando uma estrutura monolítica que distribui as cargas uniformemente."
  },
  {
    id: "g12", category: "manutencao", emoji: "🛡️",
    scenario: "Qual a principal causa de deterioração da tela do gabião ao longo do tempo?",
    options: [
      "Exposição ao sol",
      "Corrosão do arame por contato com água ácida ou solo agressivo",
      "Peso das pedras",
      "Vento forte"
    ],
    correctIndex: 1,
    explanation: "A corrosão do arame é a principal causa de deterioração. Por isso, usa-se arame galvanizado e, em ambientes agressivos, revestimento com PVC."
  },
  {
    id: "g13", category: "seguranca", emoji: "🪜",
    scenario: "Antes de iniciar trabalhos de recomposição de gabião, qual procedimento é obrigatório?",
    options: [
      "Começar imediatamente",
      "Isolar a área, avaliar estabilidade do terreno e realizar APR/PT",
      "Apenas vestir capacete",
      "Chamar mais operários"
    ],
    correctIndex: 1,
    explanation: "É obrigatório isolar a área, avaliar riscos, elaborar APR (Análise Preliminar de Risco) e emitir PT (Permissão de Trabalho) quando necessário."
  },
  {
    id: "g14", category: "drenagem", emoji: "🕳️",
    scenario: "O que é um bueiro de greide e qual sua relação com gabiões?",
    options: [
      "É um tipo de gabião",
      "É uma travessia de drenagem sob a estrada, frequentemente protegida por gabiões na entrada/saída",
      "É uma ferramenta de construção",
      "Não tem relação"
    ],
    correctIndex: 1,
    explanation: "Bueiros de greide são travessias de drenagem sob estradas. Gabiões protegem suas bocas (entrada/saída) contra erosão da água."
  },
  {
    id: "g15", category: "estrutura", emoji: "📐",
    scenario: "Qual o cuidado principal no preenchimento de gabiões com pedras?",
    options: [
      "Colocar as pedras de qualquer forma",
      "Arranjar as pedras com encaixe firme, minimizando vazios excessivos",
      "Usar pedras pequenas apenas",
      "Preencher apenas metade"
    ],
    correctIndex: 1,
    explanation: "As pedras devem ser arranjadas com encaixe firme, usando pedras menores para preencher vazios grandes, garantindo estabilidade e peso adequado."
  },
  {
    id: "g16", category: "manutencao", emoji: "📋",
    scenario: "Qual é o intervalo recomendado para inspeções periódicas em estruturas de gabião?",
    options: [
      "A cada 5 anos",
      "Semestralmente e após eventos climáticos severos",
      "Apenas quando visualmente danificado",
      "Nunca, gabiões são permanentes"
    ],
    correctIndex: 1,
    explanation: "Inspeções semestrais e após chuvas intensas detectam danos precoces e permitem manutenção preventiva antes de falhas graves."
  },
  {
    id: "g17", category: "drenagem", emoji: "🏔️",
    scenario: "Qual a função das canaletas de drenagem associadas aos gabiões?",
    options: [
      "Apenas estética",
      "Conduzir a água superficial de forma controlada, reduzindo erosão no talude",
      "Servir de caminho para pedestres",
      "Armazenar água da chuva"
    ],
    correctIndex: 1,
    explanation: "Canaletas conduzem a água superficial de forma controlada até pontos seguros de descarga, protegendo os taludes contra erosão."
  },
  {
    id: "g18", category: "seguranca", emoji: "🏋️",
    scenario: "Qual o risco ergonômico principal no manuseio de pedras para gabiões?",
    options: [
      "Dor de cabeça",
      "Lesões na coluna por levantamento inadequado de peso",
      "Problemas visuais",
      "Desidratação"
    ],
    correctIndex: 1,
    explanation: "O levantamento de pedras pesadas sem técnica adequada causa lesões lombares. Deve-se usar técnicas de ergonomia e equipamentos auxiliares."
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  estrutura: { label: "Estrutura", color: "text-blue-500" },
  drenagem: { label: "Drenagem", color: "text-cyan-500" },
  manutencao: { label: "Manutenção", color: "text-amber-500" },
  seguranca: { label: "Segurança", color: "text-red-500" },
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const ROUND_SIZE = 10;
const TIME_PER_QUESTION = 60;

export function GabiaoGame({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "finished">("idle");
  const [questions, setQuestions] = useState<GabiaoQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string; chosenIndex: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [answers, setAnswers] = useState<{ question: GabiaoQuestion; chosenIndex: number; correct: boolean }[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveScore = useSaveGameScore();
  const scoreSavedRef = useRef(false);

  useEffect(() => {
    if (gameState === "finished" && !scoreSavedRef.current) {
      scoreSavedRef.current = true;
      const correctCount = answers.filter(a => a.correct).length;
      saveScore.mutate({ gameId: "gabiao", score, correctAnswers: correctCount, totalQuestions: answers.length, bestStreak });
    }
    if (gameState === "idle") scoreSavedRef.current = false;
  }, [gameState]);

  const currentQuestion = questions[currentIndex] || null;
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  const startGame = useCallback(() => {
    setQuestions(shuffleArray(ALL_QUESTIONS).slice(0, ROUND_SIZE));
    setCurrentIndex(0);
    setScore(0);
    setLives(3);
    setFeedback(null);
    setTimeLeft(TIME_PER_QUESTION);
    setAnswers([]);
    setStreak(0);
    setBestStreak(0);
    setGameState("playing");
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || feedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(-1);
          return TIME_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, feedback, currentIndex]);

  const handleAnswer = useCallback((chosenIndex: number) => {
    if (!currentQuestion || feedback) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const isTimeout = chosenIndex === -1;
    const correct = !isTimeout && chosenIndex === currentQuestion.correctIndex;
    let points = 0;
    let newStreak = streak;
    let newLives = lives;

    if (correct) {
      points = 10 + Math.floor(timeLeft);
      newStreak = streak + 1;
    } else {
      newStreak = 0;
      newLives = lives - 1;
    }

    setScore((prev) => prev + points);
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setLives(newLives);
    setFeedback({ correct, explanation: currentQuestion.explanation, chosenIndex: isTimeout ? -1 : chosenIndex });
    setAnswers((prev) => [...prev, { question: currentQuestion, chosenIndex: isTimeout ? -1 : chosenIndex, correct }]);

    setTimeout(() => {
      setFeedback(null);
      setTimeLeft(TIME_PER_QUESTION);
      if (newLives <= 0 || currentIndex + 1 >= questions.length) {
        setGameState("finished");
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 2500);
  }, [currentQuestion, feedback, streak, bestStreak, timeLeft, currentIndex, questions.length, lives]);

  const getStarRating = () => {
    const correctCount = answers.filter(a => a.correct).length;
    const pct = (correctCount / answers.length) * 100;
    if (pct >= 80) return 3;
    if (pct >= 50) return 2;
    if (pct >= 25) return 1;
    return 0;
  };

  const timeBarPct = (timeLeft / TIME_PER_QUESTION) * 100;
  const timeColor = timeLeft <= 3 ? "bg-red-500" : timeLeft <= 7 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar aos Games
      </Button>

      {gameState === "idle" && (
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="p-6 md:p-10 text-center space-y-6">
            <div className="text-6xl md:text-8xl">🪨</div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Quiz de Gabião</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Teste seus conhecimentos sobre estruturas de gabião, drenagem, manutenção e segurança! Você tem 3 vidas.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(CATEGORY_LABELS).map(([key, cat]) => (
                <div key={key} className="p-3 rounded-xl border border-border bg-muted/30">
                  <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span className="text-sm ml-2">3 vidas</span>
            </div>
            <Button onClick={startGame} size="lg" className="gap-2 text-base px-8">
              <Zap className="w-5 h-5" /> Iniciar Quiz
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === "playing" && currentQuestion && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1 text-sm"><Trophy className="w-3.5 h-3.5" /> {score} pts</Badge>
            {streak > 1 && <Badge className="gap-1 text-sm bg-amber-500/90 text-white">🔥 {streak}x</Badge>}
            <div className="flex-1" />
            <div className="flex gap-0.5">
              {[1, 2, 3].map((l) => (
                <Heart key={l} className={`w-4 h-4 transition-all ${l <= lives ? "text-red-500 fill-red-500" : "text-muted"}`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{currentIndex + 1}/{questions.length}</span>
          </div>

          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${timeColor} rounded-full`}
              initial={{ width: "100%" }}
              animate={{ width: `${timeBarPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentQuestion.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
              <Card className="border-2 border-border">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-xs ${CATEGORY_LABELS[currentQuestion.category].color}`}>
                      {CATEGORY_LABELS[currentQuestion.category].label}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{currentQuestion.emoji}</span>
                    <p className="text-base font-medium text-foreground leading-snug pt-1">{currentQuestion.scenario}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="grid gap-2">
            {currentQuestion.options.map((option, idx) => {
              let optionClass = "border-border hover:border-primary/50 hover:bg-primary/5";
              if (feedback) {
                if (idx === currentQuestion.correctIndex) {
                  optionClass = "border-green-500 bg-green-500/10";
                } else if (idx === feedback.chosenIndex && !feedback.correct) {
                  optionClass = "border-red-500 bg-red-500/10";
                }
              }
              return (
                <motion.button
                  key={idx}
                  disabled={!!feedback}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm ${optionClass}`}
                  whileTap={!feedback ? { scale: 0.97 } : {}}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-foreground">{option}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className={`border-2 ${feedback.correct ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    {feedback.correct ? <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> : <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
                    <p className="text-sm text-foreground">{feedback.explanation}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {gameState === "finished" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="text-5xl mb-2">🪨</div>
              <CardTitle className="text-2xl">Fim do Quiz!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-1">
                {[1, 2, 3].map((star) => (
                  <Star key={star} className={`w-8 h-8 ${star <= getStarRating() ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-primary">{score}</div><div className="text-xs text-muted-foreground">Pontos</div></div>
                <div className="p-3 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-green-600">{answers.filter(a => a.correct).length}/{answers.length}</div><div className="text-xs text-muted-foreground">Acertos</div></div>
                <div className="p-3 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-amber-500">{bestStreak}x</div><div className="text-xs text-muted-foreground">Melhor Combo</div></div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Resumo das Respostas</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {answers.map((answer, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${answer.correct ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {answer.correct ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> : <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span className="text-base">{answer.question.emoji}</span>
                      <span className="flex-1 truncate text-foreground text-xs">{answer.question.scenario.slice(0, 60)}...</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Leaf className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Dica Técnica</p>
                    <p className="text-xs text-muted-foreground">Gabiões bem mantidos podem durar décadas. A inspeção periódica e a manutenção preventiva são essenciais para garantir a segurança das estruturas de contenção!</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={startGame} className="flex-1 gap-2" size="lg"><RotateCcw className="w-4 h-4" /> Jogar Novamente</Button>
                <Button onClick={onBack} variant="outline" size="lg">Voltar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
