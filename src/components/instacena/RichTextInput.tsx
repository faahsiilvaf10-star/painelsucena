import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";

const COLOR_STYLES: Record<string, string> = {
  yellow: "background-color: rgba(250, 204, 21, 0.3); padding: 0 2px; border-radius: 3px;",
  green: "background-color: rgba(74, 222, 128, 0.3); padding: 0 2px; border-radius: 3px;",
  blue: "background-color: rgba(96, 165, 250, 0.3); padding: 0 2px; border-radius: 3px;",
  pink: "background-color: rgba(244, 114, 182, 0.3); padding: 0 2px; border-radius: 3px;",
  purple: "background-color: rgba(192, 132, 252, 0.3); padding: 0 2px; border-radius: 3px;",
  orange: "background-color: rgba(251, 146, 60, 0.3); padding: 0 2px; border-radius: 3px;",
};

const FONT_STYLES: Record<string, string> = {
  serif: "font-family: serif;",
  mono: "font-family: monospace;",
  cursive: "font-family: serif; font-style: italic;",
  normal: "",
};

export interface RichTextInputHandle {
  focus: () => void;
  insertMention: (name: string, userId: string) => void;
  applyFormat: (type: string, value?: string) => void;
  getContent: () => string;
  clear: () => void;
  getPlainText: () => string;
}

interface RichTextInputProps {
  placeholder?: string;
  onInput?: (plainText: string) => void;
  className?: string;
}

/**
 * Converts the innerHTML of the contentEditable div back to the custom syntax
 * used by RichTextRenderer for storage.
 */
function htmlToCustomSyntax(container: HTMLElement): string {
  let result = "";

  container.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // Mention
      if (el.dataset.mentionId) {
        result += `@[${el.dataset.mentionName || el.textContent?.replace(/^@/, "")}](${el.dataset.mentionId})`;
        return;
      }

      const innerText = el.innerText || "";

      // Check data attributes for custom formatting
      if (el.dataset.formatType === "bold") {
        result += `**${innerText}**`;
      } else if (el.dataset.formatType === "italic") {
        result += `_${innerText}_`;
      } else if (el.dataset.formatType === "underline") {
        result += `__${innerText}__`;
      } else if (el.dataset.formatType === "color") {
        result += `{color:${el.dataset.formatValue}}${innerText}{/color}`;
      } else if (el.dataset.formatType === "glow") {
        result += `{glow}${innerText}{/glow}`;
      } else if (el.dataset.formatType === "font") {
        result += `{font:${el.dataset.formatValue}}${innerText}{/font}`;
      } else if (el.tagName === "BR") {
        result += "\n";
      } else if (el.tagName === "DIV" || el.tagName === "P") {
        // Block elements add newlines
        const blockContent = htmlToCustomSyntax(el);
        if (result.length > 0 && !result.endsWith("\n")) {
          result += "\n";
        }
        result += blockContent;
      } else {
        result += innerText;
      }
    }
  });

  return result;
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function placeCaretAfter(node: Node) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.setStartAfter(node);
  range.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export const RichTextInput = forwardRef<RichTextInputHandle, RichTextInputProps>(
  ({ placeholder, onInput, className }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const getContent = useCallback(() => {
      if (!editorRef.current) return "";
      return htmlToCustomSyntax(editorRef.current);
    }, []);

    const getPlainText = useCallback(() => {
      return editorRef.current?.innerText || "";
    }, []);

    const clear = useCallback(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    }, []);

    const insertMention = useCallback((name: string, userId: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      // Remove the @query text before inserting mention
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
          const text = textNode.textContent;
          const cursorPos = range.startOffset;
          const beforeCursor = text.slice(0, cursorPos);
          const atIdx = beforeCursor.lastIndexOf("@");
          if (atIdx >= 0) {
            textNode.textContent = text.slice(0, atIdx) + text.slice(cursorPos);
            // Set cursor position to where @ was
            range.setStart(textNode, atIdx);
            range.collapse(true);
          }
        }
      }

      const mention = document.createElement("span");
      mention.contentEditable = "false";
      mention.dataset.mentionId = userId;
      mention.dataset.mentionName = name;
      mention.className = "inline-flex items-center font-bold text-primary mx-0.5";
      mention.textContent = `@${name}`;

      const space = document.createTextNode("\u00A0");

      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(space);
        range.insertNode(mention);
        placeCaretAfter(space);
      } else {
        editor.appendChild(mention);
        editor.appendChild(space);
        placeCaretAtEnd(editor);
      }

      onInput?.(editor.innerText || "");
    }, [onInput]);

    const applyFormat = useCallback((type: string, value?: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        editor.focus();
        return;
      }

      const range = sel.getRangeAt(0);
      const selectedText = range.toString();

      const span = document.createElement("span");

      switch (type) {
        case "bold":
          span.style.fontWeight = "bold";
          span.dataset.formatType = "bold";
          break;
        case "italic":
          span.style.fontStyle = "italic";
          span.dataset.formatType = "italic";
          break;
        case "underline":
          span.style.textDecoration = "underline";
          span.style.textUnderlineOffset = "2px";
          span.dataset.formatType = "underline";
          break;
        case "color":
          span.setAttribute("style", COLOR_STYLES[value || "yellow"] || "");
          span.dataset.formatType = "color";
          span.dataset.formatValue = value || "yellow";
          break;
        case "glow":
          span.style.color = "hsl(var(--primary))";
          span.style.textShadow = "0 0 8px hsl(var(--primary) / 0.6), 0 0 16px hsl(var(--primary) / 0.3)";
          span.dataset.formatType = "glow";
          span.className = "animate-pulse";
          break;
        case "font":
          span.setAttribute("style", FONT_STYLES[value || "normal"] || "");
          span.dataset.formatType = "font";
          span.dataset.formatValue = value || "normal";
          break;
      }

      if (selectedText) {
        // Wrap selected text
        span.textContent = selectedText;
        range.deleteContents();
        range.insertNode(span);
        const space = document.createTextNode("\u00A0");
        span.after(space);
        placeCaretAfter(space);
      } else {
        // No selection: insert empty span and place cursor inside it
        span.textContent = "\u200B"; // zero-width space so span is not empty
        range.insertNode(span);
        // Place cursor inside the span, after the zero-width space
        const innerRange = document.createRange();
        innerRange.setStart(span.firstChild!, 1);
        innerRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(innerRange);
      }

      onInput?.(editor.innerText || "");
    }, [onInput]);

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      insertMention,
      applyFormat,
      getContent,
      clear,
      getPlainText,
    }), [insertMention, applyFormat, getContent, clear, getPlainText]);

    const handleInput = useCallback(() => {
      onInput?.(editorRef.current?.innerText || "");
    }, [onInput]);

    // Handle paste - strip formatting
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    }, []);

    return (
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          className={`min-h-[60px] resize-none border-none bg-muted/30 rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none ${className || ""}`}
        />
      </div>
    );
  }
);

RichTextInput.displayName = "RichTextInput";
