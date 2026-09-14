import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  evaluateMainTask,
  MAIN_TASK_REVIEW_MODEL,
  type MainTaskReviewAttachment,
} from "@/lib/ai/evaluate-main-task";
import {
  MEDIA_TRANSCRIPTION_MODEL,
  transcribeMediaAttachments,
} from "@/lib/ai/transcribe-media";
import { consumeAiQuota } from "@/lib/ai/quota";

export const runtime = "nodejs";

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_REVIEW_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_REVIEW_ATTACHMENTS_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_ATTACHMENTS = 1;
const MAX_VIDEO_FRAMES_PER_VIDEO = 4;
const MAX_VIDEO_FRAME_SIZE_BYTES = 1024 * 1024;

const reviewableFileExtensions = new Set([
  "pdf",
  "txt",
  "md",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "html",
  "css",
  "py",
  "java",
  "c",
  "cpp",
  "cs",
]);

const transcribableMediaExtensions = new Set([
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "wav",
  "webm",
]);

function canPopReviewAttachment(file: File, attachmentType: AttachmentType) {
  return (
    attachmentType === "image" ||
    attachmentType === "audio" ||
    attachmentType === "video" ||
    (attachmentType === "file" &&
      reviewableFileExtensions.has(getFileExtension(file.name)))
  );
}

async function prepareReviewAttachments(
  attachments: Array<{
    file: File;
    attachmentType: "image" | "file";
    index: number;
  }>,
  signedFileUrls: Map<number, string>,
): Promise<MainTaskReviewAttachment[]> {
  return Promise.all(
    attachments.map(async ({ file: attachment, attachmentType, index }) => {

      if (attachmentType === "image") {
        const base64Data = Buffer.from(await attachment.arrayBuffer()).toString(
          "base64",
        );

        return {
          kind: "image" as const,
          filename: attachment.name,
          dataUrl: `data:${attachment.type};base64,${base64Data}`,
        };
      }

      const fileUrl = signedFileUrls.get(index);

      if (!fileUrl) {
        throw new Error(
          `${attachment.name} için güvenli dosya bağlantısı oluşturulamadı.`,
        );
      }

      return {
        kind: "file" as const,
        filename: attachment.name,
        fileUrl,
      };
    }),
  );
}

async function prepareVideoFrameAttachments(videoFrames: File[]) {
  return Promise.all(
    videoFrames.map(async (frame) => {
      const base64Data = Buffer.from(await frame.arrayBuffer()).toString(
        "base64",
      );

      return {
        kind: "video_frame" as const,
        filename: frame.name,
        dataUrl: `data:${frame.type};base64,${base64Data}`,
      };
    }),
  );
}

type AttachmentType = "image" | "audio" | "video" | "file";

const genericFileExtensions = new Set([
  "pdf",
  "zip",
  "txt",
  "md",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "html",
  "css",
  "py",
  "java",
  "c",
  "cpp",
  "cs",
]);

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension ?? "";
}

function getAttachmentType(file: File): AttachmentType | null {
  const mimeType = file.type.toLowerCase();

  if (["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return "image";
  }

  if (
    ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm"].includes(
      mimeType,
    ) || ["mp3", "m4a", "ogg", "wav"].includes(getFileExtension(file.name))
  ) {
    return "audio";
  }

  if (
    ["video/mp4", "video/webm"].includes(mimeType) ||
    ["mp4", "webm"].includes(getFileExtension(file.name))
  ) {
    return "video";
  }

  if (genericFileExtensions.has(getFileExtension(file.name))) {
    return "file";
  }

  return null;
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ taskId: string }>;
  },
) {
  const { taskId } = await params;

  if (!/^\d+$/.test(taskId)) {
    return NextResponse.json(
      { success: false, error: "Geçersiz ana görev numarası." },
      { status: 400 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Gönderilen çalışma okunamadı." },
      { status: 400 },
    );
  }

  const rawSubmissionText = formData.get("submissionText");

  if (rawSubmissionText !== null && typeof rawSubmissionText !== "string") {
    return NextResponse.json(
      { success: false, error: "Çalışma metni geçersiz." },
      { status: 400 },
    );
  }

  const submissionText = (rawSubmissionText ?? "").trim();

  const attachments = formData
    .getAll("attachments")
    .filter((entry): entry is File => typeof entry !== "string");
  const videoFrames = formData
    .getAll("videoFrames")
    .filter((entry): entry is File => typeof entry !== "string");

  if (attachments.length > MAX_ATTACHMENTS) {
    return NextResponse.json(
      { success: false, error: "En fazla 5 dosya gönderebilirsin." },
      { status: 400 },
    );
  }

  if (
    videoFrames.some(
      (frame) =>
        frame.size === 0 || frame.size > MAX_VIDEO_FRAME_SIZE_BYTES,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Video görüntü karesi en fazla 1 MB olabilir.",
      },
      { status: 400 },
    );
  }

  if (
    videoFrames.some(
      (frame) =>
        !["image/jpeg", "image/png", "image/webp"].includes(frame.type),
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Video görüntü kareleri geçerli bir görsel biçiminde olmalı.",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: "Bu işlem için giriş yapmalısın." },
      { status: 401 },
    );
  }

  const attachmentStoragePaths = attachments.map((attachment) => {
    const extension = getFileExtension(attachment.name);

    return `submissions/${user.id}/${crypto.randomUUID()}.${extension}`;
  });

  // RLS, kullanıcının yalnızca kendi ana görevini bulmasına izin verir.
  const { data: task, error: taskError } = await supabase
    .from("world_tasks")
    .select(
      "id, world_id, task_type, title, description, status, accepted_submission_types, submission_instructions, evaluation_rubric",
    )
    .eq("id", taskId)
    .eq("task_type", "main")
    .maybeSingle();

  if (taskError) {
    console.error("Ana görev kontrol hatası:", taskError);

    return NextResponse.json(
      { success: false, error: "Ana görev şu anda kontrol edilemedi." },
      { status: 500 },
    );
  }

  if (!task) {
    return NextResponse.json(
      { success: false, error: "Ana görev bulunamadı." },
      { status: 404 },
    );
  }

  if (task.status !== "active") {
    return NextResponse.json(
      { success: false, error: "Bu ana görev artık teslim edilemez." },
      { status: 409 },
    );
  }

  const acceptedSubmissionTypes = Array.isArray(task.accepted_submission_types)
    ? task.accepted_submission_types
    : ["text"];

  const evaluationRubric = Array.isArray(task.evaluation_rubric)
    ? task.evaluation_rubric.filter(
        (criterion): criterion is string =>
          typeof criterion === "string" && criterion.trim().length > 0,
      )
    : [];

  if (evaluationRubric.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Bu ana görevin değerlendirme ölçütleri eksik.",
      },
      { status: 500 },
    );
  }

  const allowsText = acceptedSubmissionTypes.some((type) =>
    ["text", "code", "url"].includes(type),
  );

  if (submissionText.length > 10000) {
    return NextResponse.json(
      {
        success: false,
        error: "Çalışma metni en fazla 10000 karakter olabilir.",
      },
      { status: 400 },
    );
  }

  if (!allowsText && submissionText.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Bu görev metin ile teslim kabul etmiyor.",
      },
      { status: 400 },
    );
  }

  if (submissionText.length === 0 && attachments.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Bir metin veya en az bir dosya göndermelisin.",
      },
      { status: 400 },
    );
  }

  const attachmentTypes: AttachmentType[] = [];

  for (const attachment of attachments) {
    if (attachment.size === 0 || attachment.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Her dosya 1 byte ile 25 MB arasında olmalı.",
        },
        { status: 400 },
      );
    }

    const attachmentType = getAttachmentType(attachment);

    if (!attachmentType || !acceptedSubmissionTypes.includes(attachmentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `${attachment.name} bu görev için kabul edilen bir dosya türü değil.`,
        },
        { status: 400 },
      );
    }

    if (
      (attachmentType === "audio" || attachmentType === "video") &&
      !transcribableMediaExtensions.has(getFileExtension(attachment.name))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `${attachment.name} ses değerlendirmesi için desteklenen bir biçimde değil. MP3, M4A, WAV, OGG, MP4 veya WebM kullanmalısın.`,
        },
        { status: 400 },
      );
    }

    attachmentTypes.push(attachmentType);
  }

  const videoAttachmentCount = attachmentTypes.filter(
    (attachmentType) => attachmentType === "video",
  ).length;

  if (videoAttachmentCount > MAX_VIDEO_ATTACHMENTS) {
    return NextResponse.json(
      {
        success: false,
        error: "Bir ana görev teslimine en fazla bir video ekleyebilirsin.",
      },
      { status: 400 },
    );
  }

  if (videoFrames.length > videoAttachmentCount * MAX_VIDEO_FRAMES_PER_VIDEO) {
    return NextResponse.json(
      {
        success: false,
        error: "Her video için en fazla dört görüntü karesi gönderilebilir.",
      },
      { status: 400 },
    );
  }

  if (attachments.length > 0) {
    const unsupportedAttachmentIndex = attachmentTypes.findIndex(
      (attachmentType, index) =>
        !canPopReviewAttachment(attachments[index], attachmentType),
    );

    if (unsupportedAttachmentIndex !== -1) {
      const unsupportedFile = attachments[unsupportedAttachmentIndex];

      return NextResponse.json(
        {
          success: false,
          error: `${unsupportedFile.name} POP tarafından içerik olarak incelenemiyor. Görsel, desteklenen ses/video veya PDF/metin/kod dosyası gönderebilirsin.`,
        },
        { status: 400 },
      );
    }

    const oversizedAttachment = attachments.find(
      (attachment) => attachment.size > MAX_REVIEW_ATTACHMENT_SIZE_BYTES,
    );

    if (oversizedAttachment) {
      return NextResponse.json(
        {
          success: false,
          error: `${oversizedAttachment.name} POP incelemesi için 5 MB sınırını aşıyor.`,
        },
        { status: 400 },
      );
    }

    const totalAttachmentSize = attachments.reduce(
      (total, attachment) => total + attachment.size,
      0,
    );

    if (totalAttachmentSize > MAX_REVIEW_ATTACHMENTS_TOTAL_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error:
            "POP incelemesi için dosyaların toplam boyutu en fazla 10 MB olabilir.",
        },
        { status: 400 },
      );
    }
  }

  const { data: steps, error: stepsError } = await supabase
    .from("main_task_steps")
    .select("id, completed")
    .eq("task_id", taskId);

  if (stepsError) {
    console.error("Ana görev adımları kontrol hatası:", stepsError);

    return NextResponse.json(
      {
        success: false,
        error: "Ana görev adımları kontrol edilemedi.",
      },
      { status: 500 },
    );
  }

  if (!steps || steps.length === 0) {
    return NextResponse.json(
      { success: false, error: "Ana görev adımları bulunamadı." },
      { status: 400 },
    );
  }

  if (steps.some((step) => !step.completed)) {
    return NextResponse.json(
      {
        success: false,
        error: "Teslimden önce bütün ana görev adımlarını tamamlamalısın.",
      },
      { status: 400 },
    );
  }

  const [pendingResult, lastAttemptResult] = await Promise.all([
    supabase
      .from("main_task_submissions")
      .select("id")
      .eq("task_id", taskId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),

    supabase
      .from("main_task_submissions")
      .select("attempt_number")
      .eq("task_id", taskId)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (pendingResult.error || lastAttemptResult.error) {
    console.error(
      "Ana görev teslim geçmişi kontrol hatası:",
      pendingResult.error ?? lastAttemptResult.error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Teslim geçmişi şu anda kontrol edilemedi.",
      },
      { status: 500 },
    );
  }

  if (pendingResult.data) {
    return NextResponse.json(
      {
        success: false,
        error: "Bu görev için zaten POP incelemesi bekleyen bir teslim var.",
      },
      { status: 409 },
    );
  }

  const adminSupabase = createAdminClient();

  let quota;

  try {
    quota = await consumeAiQuota(adminSupabase, user.id, "main_task_review");
  } catch (quotaError) {
    console.error("Ana görev kotası okunamadı:", quotaError);

    return NextResponse.json(
      { success: false, error: "Kullanım limitin şu anda kontrol edilemedi." },
      { status: 500 },
    );
  }

  if (!quota.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Bugünkü POP ana görev inceleme limitine ulaştın. Yarın tekrar deneyebilirsin.",
      },
      { status: 429 },
    );
  }

  const { data: submission, error: submissionError } = await adminSupabase
    .from("main_task_submissions")
    .insert({
      task_id: Number(taskId),
      user_id: user.id,
      attempt_number: Number(lastAttemptResult.data?.attempt_number ?? 0) + 1,
      submission_text: submissionText || null,
      attachment_paths: attachmentStoragePaths,
      status: "pending",
    })
    .select("id, attempt_number, status, created_at")
    .single();

  if (submissionError) {
    console.error("Ana görev teslim hatası:", submissionError);

    if (submissionError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "Bu görev için zaten bekleyen bir teslim bulunuyor.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Çalışman şu anda POP’a gönderilemedi." },
      { status: 500 },
    );
  }

  const uploadedPaths: string[] = [];

  try {
    const attachmentRows = [];

    for (const [index, attachment] of attachments.entries()) {
      const storagePath = attachmentStoragePaths[index];

      if (!storagePath) {
        throw new Error("Dosya yolu hazırlanamadı.");
      }

      const { error: uploadError } = await adminSupabase.storage
        .from("main-task-submissions")
        .upload(storagePath, attachment, {
          contentType: attachment.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedPaths.push(storagePath);

      attachmentRows.push({
        submission_id: submission.id,
        attachment_type: attachmentTypes[index],
        storage_path: storagePath,
        original_file_name: attachment.name,
        mime_type: attachment.type || "application/octet-stream",
        file_size_bytes: attachment.size,
        display_order: index + 1,
      });
    }

    if (attachmentRows.length > 0) {
      const { error: attachmentError } = await adminSupabase
        .from("main_task_submission_attachments")
        .insert(attachmentRows);

      if (attachmentError) {
        throw new Error(attachmentError.message);
      }
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: removeError } = await adminSupabase.storage
        .from("main-task-submissions")
        .remove(uploadedPaths);

      if (removeError) {
        console.error("Yüklenen dosyalar temizlenemedi:", removeError);
      }
    }

    const { error: deleteError } = await adminSupabase
      .from("main_task_submissions")
      .delete()
      .eq("id", submission.id);

    if (deleteError) {
      console.error("Eksik teslim kaydı temizlenemedi:", deleteError);
    }

    console.error("Dosya yükleme hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Dosyalar yüklenemedi. Tekrar deneyebilirsin.",
      },
      { status: 500 },
    );
  }

  try {
    const signedFileUrls = new Map<number, string>();

    for (const [index, attachment] of attachments.entries()) {
      if (attachmentTypes[index] !== "file") {
        continue;
      }

      const storagePath = uploadedPaths[index];

      if (!storagePath) {
        throw new Error(`${attachment.name} için yüklenen dosya bulunamadı.`);
      }

      const { data: signedUrlData, error: signedUrlError } =
        await adminSupabase.storage
          .from("main-task-submissions")
          .createSignedUrl(storagePath, 60);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(
          `${attachment.name} için güvenli inceleme bağlantısı oluşturulamadı.`,
        );
      }

      signedFileUrls.set(index, signedUrlData.signedUrl);
    }

    const reviewAttachments = await prepareReviewAttachments(
      attachments.flatMap((attachment, index) => {
        const attachmentType = attachmentTypes[index];

        return attachmentType === "image" || attachmentType === "file"
          ? [{ file: attachment, attachmentType, index }]
          : [];
      }),
      signedFileUrls,
    );

    const mediaTranscripts = await transcribeMediaAttachments(
      attachments.flatMap((attachment, index) => {
        const attachmentType = attachmentTypes[index];

        return attachmentType === "audio" || attachmentType === "video"
          ? [{ file: attachment, mediaType: attachmentType }]
          : [];
      }),
    );
    const videoFrameAttachments = await prepareVideoFrameAttachments(videoFrames);

    const evaluation = await evaluateMainTask({
      taskTitle: task.title,
      taskDescription: task.description,
      submissionInstructions: task.submission_instructions,
      evaluationRubric,
      submissionText,
      attachments: [
        ...reviewAttachments,
        ...mediaTranscripts,
        ...videoFrameAttachments,
      ],
    });

    const reviewDetails = {
      criteria: evaluation.criteria,
      evaluation_version: 3,
      media_transcription_model:
        mediaTranscripts.length > 0 ? MEDIA_TRANSCRIPTION_MODEL : null,
      media_transcript_count: mediaTranscripts.length,
      video_frame_count: videoFrameAttachments.length,
    };

    const reviewResult =
      evaluation.decision === "approved"
        ? await adminSupabase.rpc("approve_main_task_submission", {
            p_user_id: user.id,
            p_submission_id: submission.id,
            p_review_score: evaluation.score,
            p_review_feedback: evaluation.feedback,
            p_ai_model: MAIN_TASK_REVIEW_MODEL,
            p_review_details: reviewDetails,
          })
        : await adminSupabase.rpc("reject_main_task_submission", {
            p_user_id: user.id,
            p_submission_id: submission.id,
            p_review_score: evaluation.score,
            p_review_feedback: evaluation.feedback,
            p_ai_model: MAIN_TASK_REVIEW_MODEL,
            p_review_details: reviewDetails,
          });

    if (reviewResult.error) {
      throw new Error(reviewResult.error.message);
    }

    let progress: unknown = null;
    let badges: unknown = null;

    // Yalnızca onaylanan ana görev, dünya geçişi ve rozet kontrolünü tetikler.
    if (evaluation.decision === "approved") {
      const { data: progressData, error: progressError } =
        await adminSupabase.rpc("complete_world_if_eligible", {
          p_user_id: user.id,
          p_world_id: Number(task.world_id),
        });

      if (progressError) {
        console.error(
          "Ana görev sonrası dünya geçişi kontrol hatası:",
          progressError,
        );
      } else {
        progress = progressData;
      }

      const { data: badgesData, error: badgesError } = await adminSupabase.rpc(
        "evaluate_user_badges",
        {
          p_user_id: user.id,
        },
      );

      if (badgesError) {
        console.error("Ana görev sonrası rozet kontrol hatası:", badgesError);
      } else {
        badges = badgesData;
      }
    }

    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        status: evaluation.decision,
      },
      attachmentCount: attachments.length,
      evaluation,
      reviewResult: reviewResult.data,
      progress,
      badges,
    });
  } catch (evaluationError) {
    console.error("POP ana görev değerlendirme hatası:", evaluationError);
    if (uploadedPaths.length > 0) {
      const { error: removeError } = await adminSupabase.storage
        .from("main-task-submissions")
        .remove(uploadedPaths);

      if (removeError) {
        console.error(
          "Başarısız POP incelemesindeki dosyalar temizlenemedi:",
          removeError,
        );
      }
    }

    // İnceleme başarısızsa kullanıcı yeniden deneyebilsin diye bekleyen kaydı siler.
    const { error: cleanupError } = await adminSupabase
      .from("main_task_submissions")
      .delete()
      .eq("id", submission.id)
      .eq("status", "pending");

    if (cleanupError) {
      console.error("Başarısız POP incelemesi temizlenemedi:", cleanupError);
    }

    return NextResponse.json(
      {
        success: false,
        error: "POP çalışmanı şu anda değerlendiremedi. Lütfen tekrar gönder.",
      },
      { status: 502 },
    );
  }
}
