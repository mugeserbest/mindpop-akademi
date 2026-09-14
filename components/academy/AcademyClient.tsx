"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import TaskListCard from "../TaskListCard";
import MainTaskCard from "../MainTaskCard";
import WorldCard from "../WorldCard";
import GoalCard from "../GoalCard";
import ProgressCard from "../ProgressCard";
import QuizCard from "../QuizCard";
import QuizModal from "../QuizModal";
import Modal from "../Modal";
import Button from "../button";
import ProcessingOverlay from "../ProcessingOverlay";
import { extractVideoFrames } from "@/lib/video-frames";

type AcademyTask = {
  id: string;
  title: string;
  description?: string;
  xp: number;
  completed: boolean;
};

type AcademyMainTask = {
  id: string;
  title: string;
  description: string;
  submissionTypes: string[];
  submissionInstructions: string | null;
  completed: boolean;
  steps: {
    id: string;
    label: string;
    description?: string;
    completed: boolean;
  }[];
  reviewStatus: "pending" | "approved" | "rejected" | null;
  reviewScore: number | null;
  reviewFeedback: string | null;
};

export type AcademyWorld = {
  level: number;
  name: string;
  image: string;
  status: "current" | "unlocked" | "locked";
  type: "orman" | "koy" | "okyanus" | "volkan" | "krallik";
  currentXp: number;
  xpGoal: number;
  quizScore: number;
  quizPassScore: number;
  mainTaskApproved: boolean;
};

export type AcademyQuiz = {
  id: string;
  title: string;
  instructions: string | null;
  questionCount: number;
};

type AcademyClientProps = {
  goalDescription: string;
  currentXp: number;
  xpGoal: number;
  initialDailyTasks: AcademyTask[];
  initialWeeklyTasks: AcademyTask[];
  mainTask: AcademyMainTask | null;
  worlds: AcademyWorld[];
  quiz: AcademyQuiz | null;
};

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name);
}

export default function AcademyClient({
  goalDescription,
  currentXp,
  xpGoal,
  initialDailyTasks,
  initialWeeklyTasks,
  mainTask,
  worlds,
  quiz,
}: AcademyClientProps) {
  const router = useRouter();

  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const [isMainTaskModalOpen, setIsMainTaskModalOpen] = useState(false);

  const [submissionText, setSubmissionText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmittingMainTask, setIsSubmittingMainTask] = useState(false);

  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const [submissionSent, setSubmissionSent] = useState(false);
  const allowsFileSubmission =
    mainTask?.submissionTypes.some((type) =>
      ["image", "audio", "video", "file"].includes(type),
    ) ?? false;
  const acceptsMediaSubmission =
    mainTask?.submissionTypes.some((type) =>
      ["audio", "video"].includes(type),
    ) ?? false;
  const acceptedFileTypes = [
    ...(mainTask?.submissionTypes.includes("image")
      ? [".jpg", ".jpeg", ".png", ".webp"]
      : []),
    ...(mainTask?.submissionTypes.includes("audio")
      ? [".mp3", ".m4a", ".wav", ".ogg", ".webm"]
      : []),
    ...(mainTask?.submissionTypes.includes("video")
      ? [".mp4", ".webm"]
      : []),
    ...(mainTask?.submissionTypes.includes("file")
      ? [
          ".pdf",
          ".zip",
          ".txt",
          ".js",
          ".jsx",
          ".ts",
          ".tsx",
          ".html",
          ".css",
          ".json",
          ".md",
          ".py",
          ".java",
          ".c",
          ".cpp",
          ".cs",
        ]
      : []),
  ].join(",");

  function handleMainTaskComplete() {
    if (!mainTask) {
      return;
    }
    setSubmissionError(null);
    setSubmissionSent(false);
    setIsMainTaskModalOpen(true);
  }
  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 5) {
      setSubmissionError("En fazla 5 dosya seçebilirsin.");
      event.target.value = "";
      return;
    }

    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setSubmissionError("POP incelemesi için her dosya en fazla 5 MB olabilir.");
      event.target.value = "";
      return;
    }

    if (files.filter(isVideoFile).length > 1) {
      setSubmissionError("Bir ana görev teslimine en fazla bir video ekleyebilirsin.");
      event.target.value = "";
      return;
    }

    const totalSize = files.reduce((total, file) => total + file.size, 0);

    if (totalSize > 10 * 1024 * 1024) {
      setSubmissionError(
        "POP incelemesi için dosyaların toplam boyutu en fazla 10 MB olabilir.",
      );
      event.target.value = "";
      return;
    }

    setSelectedFiles(files);
    setSubmissionError(null);
  }
  const [mainTaskSteps, setMainTaskSteps] = useState(mainTask?.steps ?? []);
  const [updatingStepId, setUpdatingStepId] = useState<string | null>(null);

  async function handleToggleMainTaskStep(stepId: string) {
    if (updatingStepId !== null) {
      return;
    }

    const selectedStepIndex = mainTaskSteps.findIndex(
      (step) => step.id === stepId,
    );
    const selectedStep = mainTaskSteps[selectedStepIndex];

    if (!selectedStep) {
      return;
    }

    const nextCompleted = !selectedStep.completed;

    const hasIncompletePreviousStep = mainTaskSteps
      .slice(0, selectedStepIndex)
      .some((step) => !step.completed);
    const hasCompletedNextStep = mainTaskSteps
      .slice(selectedStepIndex + 1)
      .some((step) => step.completed);

    if (nextCompleted && hasIncompletePreviousStep) {
      setTaskError("Önce önceki ana görev adımını tamamlamalısın.");
      return;
    }

    if (!nextCompleted && hasCompletedNextStep) {
      setTaskError("Önce sonraki ana görev adımını geri almalısın.");
      return;
    }

    setUpdatingStepId(stepId);
    setTaskError(null);

    // İşareti kullanıcıya hemen gösterir.
    setMainTaskSteps((currentSteps) =>
      currentSteps.map((step) =>
        step.id === stepId ? { ...step, completed: nextCompleted } : step,
      ),
    );

    try {
      const response = await fetch(
        `/api/main-task-steps/${encodeURIComponent(stepId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            completed: nextCompleted,
          }),
        },
      );

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Ana görev adımı kaydedilemedi.");
      }
    } catch (error) {
      // Kayıt başarısızsa işareti eski hâline döndürür.
      setMainTaskSteps((currentSteps) =>
        currentSteps.map((step) =>
          step.id === stepId
            ? { ...step, completed: selectedStep.completed }
            : step,
        ),
      );

      setTaskError(
        error instanceof Error
          ? error.message
          : "Ana görev adımı kaydedilemedi.",
      );
    } finally {
      setUpdatingStepId(null);
    }
  }

  const [dailyTasks, setDailyTasks] = useState(initialDailyTasks);
  const [weeklyTasks, setWeeklyTasks] = useState(initialWeeklyTasks);

  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  async function handleCompleteTask(taskId: string) {
    if (completingTaskId !== null) {
      return;
    }

    setCompletingTaskId(taskId);
    setTaskError(null);

    try {
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/complete`,
        {
          method: "POST",
        },
      );

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Görev tamamlanırken bir sorun oluştu.",
        );
      }

      setDailyTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task,
        ),
      );

      setWeeklyTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task,
        ),
      );

      router.refresh();
    } catch (error) {
      setTaskError(
        error instanceof Error
          ? error.message
          : "Görev tamamlanırken bir sorun oluştu.",
      );
    } finally {
      setCompletingTaskId(null);
    }
  }
  async function handleSubmitMainTask() {
    if (!mainTask || isSubmittingMainTask) {
      return;
    }

    const cleanSubmissionText = submissionText.trim();

    if (!cleanSubmissionText && selectedFiles.length === 0) {
      setSubmissionError("Çalışmanı veya en az bir dosyayı göndermelisin.");
      return;
    }

    setIsSubmittingMainTask(true);
    setSubmissionError(null);

    try {
      const formData = new FormData();

      formData.set("submissionText", cleanSubmissionText);

      selectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const videoFiles = selectedFiles.filter(isVideoFile);
      const videoFrames = await Promise.all(
        videoFiles.map((file) => extractVideoFrames(file)),
      );

      videoFrames.flat().forEach((frame) => {
        formData.append("videoFrames", frame);
      });

      const response = await fetch(
        `/api/main-tasks/${encodeURIComponent(mainTask.id)}`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Çalışman POP’a gönderilemedi.");
      }

      setSubmissionSent(false);
      setIsMainTaskModalOpen(false);
      setSubmissionText("");
      setSelectedFiles([]);
      router.refresh();
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Çalışman POP’a gönderilemedi.",
      );
    } finally {
      setIsSubmittingMainTask(false);
    }
  }

  return (
    <main className="app-page">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <GoalCard description={goalDescription} />
            <ProgressCard currentXp={currentXp} xpGoal={xpGoal} />
          </div>
          <MainTaskCard
            category="Seviye Atlama Görevi"
            title={mainTask?.title ?? "Ana görev hazırlanıyor"}
            description={
              mainTask?.description ??
              "Yapay zekâ ana görevini hazırladığında burada gösterilecek."
            }
            steps={mainTaskSteps}
            completed={mainTask?.completed ?? false}
            onComplete={handleMainTaskComplete}
            onToggleStep={handleToggleMainTaskStep}
            image="/images/pop-icon/heyecanli-icon.png"
            reviewStatus={mainTask?.reviewStatus ?? null}
            reviewScore={mainTask?.reviewScore ?? null}
            reviewFeedback={mainTask?.reviewFeedback ?? null}
          />

          {taskError && (
            <p
              role="alert"
              className="rounded-button border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {taskError}
            </p>
          )}

          <div className="grid w-full gap-6 lg:grid-cols-2">
            <TaskListCard
              title="Günlük Görevler"
              tasks={dailyTasks}
              onToggleTask={handleCompleteTask}
            />
            <TaskListCard
              title="Haftalık Görevler"
              tasks={weeklyTasks}
              onToggleTask={handleCompleteTask}
            />
          </div>
        </section>

        <aside aria-label="Dünyalar" className="space-y-4">
          {worlds.map((world) => (
            <WorldCard
              key={world.level}
              level={world.level}
              name={world.name}
              image={world.image}
              status={world.status}
              type={world.type}
              currentXp={world.currentXp}
              xpGoal={world.xpGoal}
              quizScore={world.quizScore}
              quizPassScore={world.quizPassScore}
              mainTaskApproved={world.mainTaskApproved}
            />
          ))}
          {quiz && (
            <QuizCard
              title={quiz.title}
              description={
                quiz.instructions ?? "Öğrendiklerini kısa sorularla pekiştir."
              }
              questionCount={quiz.questionCount}
              onStart={() => setIsQuizOpen(true)}
            />
          )}
        </aside>
      </div>
      <QuizModal
        open={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        title={quiz?.title ?? "Quiz"}
        quizId={quiz?.id ?? ""}
        onQuizCompleted={() => router.refresh()}
      />
      <Modal
        open={isMainTaskModalOpen}
        title={mainTask?.title ?? "Ana Görev Teslimi"}
        onClose={() => setIsMainTaskModalOpen(false)}
      >
        <div>
          <p className="text-sm font-semibold text-black">
            Çalışmanı aşağıdaki alana yaz veya yapıştır.
          </p>

          <label
            htmlFor="main-task-submission"
            className="mt-5 block text-sm font-bold text-black"
          >
            Çalışman
          </label>

          <textarea
            id="main-task-submission"
            value={submissionText}
            onChange={(event) => setSubmissionText(event.target.value)}
            rows={10}
            maxLength={10000}
            placeholder="Çalışmanı buraya yaz..."
            className="mt-2 w-full resize-y rounded-card border-card bg-white p-4 font-body text-sm text-black outline-none focus:ring-2 focus:ring-main-purple"
          />

          <p className="mt-2 text-right text-xs text-gray-500">
            {submissionText.length} / 10000
          </p>
          {allowsFileSubmission && (
            <div className="mt-5">
              <label
                htmlFor="main-task-files"
                className="block text-sm font-bold text-black"
              >
                Dosyaların
              </label>

              <input
                id="main-task-files"
                type="file"
                multiple
                onChange={handleFilesChange}
                accept={acceptedFileTypes || undefined}
                className="sr-only"
              />

              <label
                htmlFor="main-task-files"
                className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-button bg-main-purple px-5 font-body text-sm font-bold text-white transition hover:bg-dark-purple focus-within:ring-2 focus-within:ring-main-purple focus-within:ring-offset-2"
              >
                Dosya Seç
              </label>

              <p className="mt-2 text-xs text-gray-500">
                En fazla 5 dosya, her biri en fazla 5 MB; toplamda en fazla 10 MB.
              </p>

              {acceptsMediaSubmission && (
                <p className="mt-1 text-xs text-gray-500">
                  Seslerde konuşma içeriği değerlendirilir. Videolarda sesin
                  yanı sıra en fazla dört temsilî görüntü karesi de incelenir;
                  videoda konuşma olması zorunlu değildir.
                </p>
              )}

              {selectedFiles.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-black">
                  {selectedFiles.map((file) => (
                    <li key={`${file.name}-${file.lastModified}`}>
                      {file.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {submissionError && (
            <p
              role="alert"
              className="mt-4 rounded-button border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {submissionError}
            </p>
          )}

          {submissionSent && (
            <p
              role="status"
              className="mt-4 rounded-button border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
            >
              Çalışman POP’a gönderildi. İnceleme bekleniyor.
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              variant="gold"
              disabled={
                isSubmittingMainTask ||
                submissionSent ||
                (submissionText.trim().length === 0 &&
                  selectedFiles.length === 0)
              }
              onClick={handleSubmitMainTask}
            >
              {isSubmittingMainTask
                ? "Gönderiliyor..."
                : submissionSent
                  ? "POP’a Gönderildi"
                  : "Teslimi POP’a Gönder"}
            </Button>
          </div>
        </div>
      </Modal>

      {isSubmittingMainTask && (
        <ProcessingOverlay
          title="POP çalışmanı inceliyor"
          description="Teslimin güvenle kaydediliyor ve değerlendirme hazırlanıyor."
        />
      )}
    </main>
  );
}
