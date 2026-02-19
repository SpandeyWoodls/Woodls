/**
 * Strip markdown formatting from text for TTS consumption.
 * Removes headings, bold, italic, code blocks, inline code, links, and images.
 */
export function stripMarkdown(text: string): string {
  return (
    text
      // Remove code blocks (```...```)
      .replace(/```[\s\S]*?```/g, "")
      // Remove headings (### etc.)
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      // Remove italic (*text* or _text_)
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/(?<!\w)_(.*?)_(?!\w)/g, "$1")
      // Remove strikethrough (~~text~~)
      .replace(/~~(.*?)~~/g, "$1")
      // Remove inline code (`text`)
      .replace(/`([^`]*)`/g, "$1")
      // Remove images (![alt](url))
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Remove links ([text](url))
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Remove blockquotes
      .replace(/^>\s?/gm, "")
      // Remove unordered list markers
      .replace(/^[\s]*[-+*]\s+/gm, "")
      // Remove ordered list markers
      .replace(/^[\s]*\d+\.\s+/gm, "")
  );
}
