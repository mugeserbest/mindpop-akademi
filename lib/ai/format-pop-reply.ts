export function formatPopReply(rawReply: string) {
  return rawReply
    .trim()
    .replace(/```[a-zA-Z0-9_-]*\n?/g, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
