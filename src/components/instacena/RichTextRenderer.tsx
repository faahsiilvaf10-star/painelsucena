import React from "react";

/**
 * Parses custom formatting tags in post content and renders them as styled spans.
 * Supported formats:
 * - **text** → bold
 * - _text_ → italic
 * - __text__ → underline
 * - {color:yellow}text{/color} → highlighted text
 * - {glow}text{/glow} → glowing text
 * - {font:serif}text{/font} → font style
 */

const COLOR_CLASSES: Record<string, string> = {
  yellow: "bg-yellow-200/80 dark:bg-yellow-800/40 px-0.5 rounded",
  green: "bg-green-200/80 dark:bg-green-800/40 px-0.5 rounded",
  blue: "bg-blue-200/80 dark:bg-blue-800/40 px-0.5 rounded",
  pink: "bg-pink-200/80 dark:bg-pink-800/40 px-0.5 rounded",
  purple: "bg-purple-200/80 dark:bg-purple-800/40 px-0.5 rounded",
  orange: "bg-orange-200/80 dark:bg-orange-800/40 px-0.5 rounded",
};

const FONT_CLASSES: Record<string, string> = {
  serif: "font-serif",
  mono: "font-mono",
  cursive: "italic font-serif",
  normal: "",
};

interface RichSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  glow?: boolean;
  font?: string;
}

function parseRichText(input: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let remaining = input;

  // Process formatting tags using regex replacements
  const regex = /(\*\*(.+?)\*\*|_(.+?)_|__(.+?)__|{color:(\w+)}(.+?){\/color}|{glow}(.+?){\/glow}|{font:(\w+)}(.+?){\/font})/gs;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index) });
    }

    if (match[2] !== undefined) {
      // **bold**
      segments.push({ text: match[2], bold: true });
    } else if (match[4] !== undefined) {
      // __underline__ (must check before _italic_ since __ contains _)
      segments.push({ text: match[4], underline: true });
    } else if (match[3] !== undefined) {
      // _italic_
      segments.push({ text: match[3], italic: true });
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // {color:x}text{/color}
      segments.push({ text: match[6], color: match[5] });
    } else if (match[7] !== undefined) {
      // {glow}text{/glow}
      segments.push({ text: match[7], glow: true });
    } else if (match[8] !== undefined && match[9] !== undefined) {
      // {font:x}text{/font}
      segments.push({ text: match[9], font: match[8] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ text: input });
  }

  return segments;
}

export function RichTextRenderer({ content }: { content: string }) {
  // Check if content has any formatting markers
  const hasFormatting = /(\*\*|_{1,2}|{color:|{glow}|{font:)/.test(content);

  if (!hasFormatting) {
    return <>{content}</>;
  }

  const segments = parseRichText(content);

  return (
    <>
      {segments.map((seg, i) => {
        const classes: string[] = [];
        const styles: React.CSSProperties = {};

        if (seg.bold) classes.push("font-bold");
        if (seg.italic) classes.push("italic");
        if (seg.underline) classes.push("underline underline-offset-2");
        if (seg.color && COLOR_CLASSES[seg.color]) classes.push(COLOR_CLASSES[seg.color]);
        if (seg.font && FONT_CLASSES[seg.font]) classes.push(FONT_CLASSES[seg.font]);
        if (seg.glow) {
          classes.push("animate-pulse");
          styles.textShadow = "0 0 8px hsl(var(--primary) / 0.6), 0 0 16px hsl(var(--primary) / 0.3)";
          styles.color = "hsl(var(--primary))";
        }

        if (classes.length === 0 && Object.keys(styles).length === 0) {
          return <React.Fragment key={i}>{seg.text}</React.Fragment>;
        }

        return (
          <span key={i} className={classes.join(" ")} style={styles}>
            {seg.text}
          </span>
        );
      })}
    </>
  );
}
