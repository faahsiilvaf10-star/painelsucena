import { Fragment } from "react";
import { RichTextRenderer } from "./RichTextRenderer";

/**
 * Parses content with mentions in format @[Name](user_id)
 * Renders mentions as bold text with sparkle animation
 * Non-mention text is passed through RichTextRenderer for formatting
 */
export function MentionText({ content }: { content: string }) {
  // Match @[Name](user_id)
  const mentionRegex = /@\[([^\]]+)\]\([^)]+\)/g;
  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "mention", value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <span><RichTextRenderer content={content} /></span>;
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.type === "mention" ? (
          <span
            key={i}
            className="mention-spark inline-flex items-center font-bold text-primary"
          >
            @{part.value}
          </span>
        ) : (
          <Fragment key={i}>
            <RichTextRenderer content={part.value} />
          </Fragment>
        )
      )}
    </span>
  );
}
