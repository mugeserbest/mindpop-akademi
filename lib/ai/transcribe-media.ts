import "server-only";

import { openai } from "@/lib/ai/openai";

export const MEDIA_TRANSCRIPTION_MODEL = "gpt-4o-transcribe";

export type MediaTranscript = {
  kind: "transcript";
  filename: string;
  mediaType: "audio" | "video";
  text: string;
};

type MediaAttachment = {
  file: File;
  mediaType: "audio" | "video";
};

export async function transcribeMediaAttachments(
  attachments: MediaAttachment[],
): Promise<MediaTranscript[]> {
  return Promise.all(
    attachments.map(async ({ file, mediaType }) => {
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: MEDIA_TRANSCRIPTION_MODEL,
      });
      const text = transcription.text.trim();

      if (!text) {
        if (mediaType === "video") {
          return {
            kind: "transcript" as const,
            filename: file.name,
            mediaType,
            text: "Videoda konuşma algılanamadı.",
          };
        }

        throw new Error(
          `${file.name} dosyasında değerlendirilebilecek bir konuşma bulunamadı.`,
        );
      }

      return {
        kind: "transcript" as const,
        filename: file.name,
        mediaType,
        text,
      };
    }),
  );
}
