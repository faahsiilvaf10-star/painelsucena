import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { SlideData } from "@/hooks/usePresentations";
import ReactMarkdown from "react-markdown";

interface SlideViewerProps {
  slides: SlideData[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
}

function SlideContent({ slide }: { slide: SlideData }) {
  switch (slide.layout) {
    case "title":
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-12 gap-6">
          <h1 className="text-4xl md:text-5xl font-bold text-primary">{slide.title}</h1>
          <div className="text-xl text-muted-foreground max-w-2xl prose prose-lg dark:prose-invert">
            <ReactMarkdown>{slide.content}</ReactMarkdown>
          </div>
        </div>
      );
    case "stats":
      return (
        <div className="flex flex-col h-full px-10 py-8 gap-6">
          <h2 className="text-3xl font-bold">{slide.title}</h2>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 items-center">
            {slide.stats?.map((s, i) => (
              <div key={i} className="bg-muted/50 rounded-xl p-6 text-center">
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {slide.content && (
            <div className="text-sm text-muted-foreground prose dark:prose-invert">
              <ReactMarkdown>{slide.content}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    case "quote":
      return (
        <div className="flex flex-col items-center justify-center h-full px-12 text-center gap-6">
          <h2 className="text-2xl font-bold">{slide.title}</h2>
          {slide.quote && (
            <blockquote className="border-l-4 border-primary pl-6 text-left max-w-xl">
              <p className="text-xl italic">"{slide.quote.text}"</p>
              <footer className="text-sm text-muted-foreground mt-3">— {slide.quote.author}</footer>
            </blockquote>
          )}
          {slide.content && (
            <div className="text-sm text-muted-foreground prose dark:prose-invert">
              <ReactMarkdown>{slide.content}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    case "two-column":
      const parts = slide.content.split("---");
      return (
        <div className="flex flex-col h-full px-10 py-8 gap-4">
          <h2 className="text-3xl font-bold">{slide.title}</h2>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="prose dark:prose-invert">
              <ReactMarkdown>{parts[0] || ""}</ReactMarkdown>
            </div>
            <div className="prose dark:prose-invert">
              <ReactMarkdown>{parts[1] || ""}</ReactMarkdown>
            </div>
          </div>
        </div>
      );
    default: // content
      return (
        <div className="flex flex-col h-full px-10 py-8 gap-4">
          <h2 className="text-3xl font-bold">{slide.title}</h2>
          <div className="flex-1 prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown>{slide.content}</ReactMarkdown>
          </div>
        </div>
      );
  }
}

export function SlideViewer({ slides, currentSlide, onSlideChange }: SlideViewerProps) {
  const [fullscreen, setFullscreen] = useState(false);

  if (slides.length === 0) return null;

  const slide = slides[currentSlide];

  const goBack = () => onSlideChange(Math.max(0, currentSlide - 1));
  const goForward = () => onSlideChange(Math.min(slides.length - 1, currentSlide + 1));

  const viewer = (
    <div className={`flex flex-col ${fullscreen ? "fixed inset-0 z-50 bg-background" : "h-full"}`}>
      {/* Slide area */}
      <div className="flex-1 relative bg-card rounded-lg border overflow-hidden flex items-stretch min-h-[300px] md:min-h-[400px]">
        <div className="flex-1 flex flex-col justify-center">
          <SlideContent slide={slide} />
        </div>
        {/* Nav arrows */}
        <button
          onClick={goBack}
          disabled={currentSlide === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background disabled:opacity-30 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={goForward}
          disabled={currentSlide === slides.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background disabled:opacity-30 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        {/* Fullscreen toggle */}
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="absolute top-3 right-3 p-2 rounded-full bg-background/80 hover:bg-background transition"
        >
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      {/* Slide indicators */}
      <div className="flex items-center justify-center gap-1 py-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => onSlideChange(i)}
            className={`w-2.5 h-2.5 rounded-full transition ${i === currentSlide ? "bg-primary" : "bg-muted-foreground/30"}`}
          />
        ))}
        <span className="ml-3 text-xs text-muted-foreground">
          {currentSlide + 1}/{slides.length}
        </span>
      </div>
    </div>
  );

  return viewer;
}
