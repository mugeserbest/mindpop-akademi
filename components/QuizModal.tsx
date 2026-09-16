"use client";

import { useCallback, useEffect, useState } from "react";
import BodyText from "./BodyText";
import Button from "./button";
import Modal from "./Modal";
import SectionTitle from "./SectionTitle";

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  displayOrder: number;
};

type QuizQuestionResponse = {
  id: number;
  question: string;
  options: string[];
  display_order: number;
};

type QuizFeedback = {
  isCorrect: boolean;
  correctOptionText: string;
  explanation: string | null;
  isLastQuestion: boolean;
};

type QuizFeedbackResponse = {
  is_correct: boolean;
  correct_option_text: string;
  explanation: string | null;
  is_last_question: boolean;
};

type QuizResult = {
  score: number;
  bestScore: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
};

type QuizResultResponse = {
  score: number;
  best_score: number;
  correct_count: number;
  total_questions: number;
  passed: boolean;
};

type QuizModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  quizId: string;
  onQuizCompleted?: (newBadgeKeys: string[]) => void;
};

function isQuizQuestion(value: unknown): value is QuizQuestionResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const question = value as Record<string, unknown>;

  return (
    Number.isSafeInteger(question.id) &&
    typeof question.question === "string" &&
    Array.isArray(question.options) &&
    question.options.every((option) => typeof option === "string") &&
    Number.isSafeInteger(question.display_order)
  );
}

function isQuizFeedback(value: unknown): value is QuizFeedbackResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const feedback = value as Record<string, unknown>;

  return (
    typeof feedback.is_correct === "boolean" &&
    typeof feedback.correct_option_text === "string" &&
    (typeof feedback.explanation === "string" ||
      feedback.explanation === null) &&
    typeof feedback.is_last_question === "boolean"
  );
}

function isQuizResult(value: unknown): value is QuizResultResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Record<string, unknown>;

  return (
    typeof result.score === "number" &&
    typeof result.best_score === "number" &&
    typeof result.correct_count === "number" &&
    typeof result.total_questions === "number" &&
    typeof result.passed === "boolean"
  );
}

export default function QuizModal({
  open,
  onClose,
  title,
  quizId,
  onQuizCompleted,
}: QuizModalProps) {
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetQuiz() {
    setAttemptId(null);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setFeedback(null);
    setResult(null);
    setIsStarting(false);
    setIsAnswering(false);
    setIsFinishing(false);
    setError(null);
  }

  const startQuiz = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId: Number(quizId),
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        attempt?: unknown;
      };

      if (
        !response.ok ||
        !data.success ||
        typeof data.attempt !== "object" ||
        data.attempt === null
      ) {
        throw new Error(data.error ?? "Quiz başlatılamadı.");
      }

      const attempt = data.attempt as Record<string, unknown>;

      if (
        !Number.isSafeInteger(attempt.attempt_id) ||
        !Array.isArray(attempt.questions)
      ) {
        throw new Error("Quiz soruları okunamadı.");
      }

      const selectedQuestions = attempt.questions
        .filter(isQuizQuestion)
        .sort(
          (firstQuestion, secondQuestion) =>
            firstQuestion.display_order - secondQuestion.display_order,
        )
        .map((question) => ({
          id: question.id,
          question: question.question,
          options: question.options,
          displayOrder: question.display_order,
        }));

      if (selectedQuestions.length === 0) {
        throw new Error("Quiz için soru bulunamadı.");
      }

      setAttemptId(Number(attempt.attempt_id));
      setQuizQuestions(selectedQuestions);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Quiz başlatılamadı.",
      );
    } finally {
      setIsStarting(false);
    }
  }, [quizId]);

  useEffect(() => {
    if (!open || attemptId !== null || result !== null) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      void startQuiz();
    });

    return () => cancelAnimationFrame(frameId);
  }, [open, attemptId, result, startQuiz]);

  async function submitAnswer() {
    const currentQuestion = quizQuestions[currentQuestionIndex];

    if (attemptId === null || !currentQuestion || selectedOption === null) {
      return;
    }

    setIsAnswering(true);
    setError(null);

    try {
      const response = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId,
          questionId: currentQuestion.id,
          selectedOption,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        feedback?: unknown;
      };

      if (!response.ok || !data.success || !isQuizFeedback(data.feedback)) {
        throw new Error(data.error ?? "Cevap değerlendirilemedi.");
      }

      setFeedback({
        isCorrect: data.feedback.is_correct,
        correctOptionText: data.feedback.correct_option_text,
        explanation: data.feedback.explanation,
        isLastQuestion: data.feedback.is_last_question,
      });
    } catch (answerError) {
      setError(
        answerError instanceof Error
          ? answerError.message
          : "Cevap değerlendirilemedi.",
      );
    } finally {
      setIsAnswering(false);
    }
  }

  async function finishQuiz() {
    if (attemptId === null) {
      return;
    }

    setIsFinishing(true);
    setError(null);

    try {
      const response = await fetch("/api/quiz/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attemptId }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        result?: unknown;
        newBadgeKeys?: unknown;
      };

      if (!response.ok || !data.success || !isQuizResult(data.result)) {
        throw new Error(data.error ?? "Quiz sonucu hesaplanamadı.");
      }

      setResult({
        score: data.result.score,
        bestScore: data.result.best_score,
        correctCount: data.result.correct_count,
        totalQuestions: data.result.total_questions,
        passed: data.result.passed,
      });

      onQuizCompleted?.(
        Array.isArray(data.newBadgeKeys)
          ? data.newBadgeKeys.filter(
              (badgeKey): badgeKey is string => typeof badgeKey === "string",
            )
          : [],
      );
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : "Quiz sonucu hesaplanamadı.",
      );
    } finally {
      setIsFinishing(false);
    }
  }

  function handleContinue() {
    if (!feedback) {
      return;
    }

    if (feedback.isLastQuestion) {
      void finishQuiz();
      return;
    }

    setCurrentQuestionIndex((currentIndex) => currentIndex + 1);
    setSelectedOption(null);
    setFeedback(null);
    setError(null);
  }

  function handleClose() {
    resetQuiz();
    onClose();
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];

  if (result) {
    return (
      <Modal open={open} onClose={handleClose} title={title}>
        <div className="text-center">
          <SectionTitle
            as="h3"
            title={result.passed ? "Quiz’i Geçtin!" : "Tekrar Deneyebilirsin"}
          />

          <p className="mt-5 text-5xl font-black text-main-purple">
            %{result.score}
          </p>

          <BodyText className="mt-3">
            {result.correctCount} / {result.totalQuestions} soruyu doğru
            cevapladın.
          </BodyText>

          <BodyText className="mt-2 text-sm text-muted">
            En iyi puanın: %{result.bestScore}
          </BodyText>

          <BodyText className="mt-5 text-sm font-semibold text-black">
            {result.passed
              ? "Harika! Dünya geçişi için quiz şartını tamamladın."
              : "Geçme puanına ulaşmak için quiz’i yeniden çözebilirsin."}
          </BodyText>

          <div className="mt-7 flex justify-center gap-3">
            {!result.passed && (
              <Button variant="secondary" onClick={resetQuiz}>
                Tekrar Dene
              </Button>
            )}

            <Button variant="gold" onClick={handleClose}>
              Kapat
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (isStarting) {
    return (
      <Modal open={open} onClose={handleClose} title={title}>
        <BodyText className="py-10 text-center">
          Sana özel sorular hazırlanıyor...
        </BodyText>
      </Modal>
    );
  }

  if (!currentQuestion) {
    return (
      <Modal open={open} onClose={handleClose} title={title}>
        <div className="py-8 text-center">
          <BodyText>{error ?? "Quiz soruları şu anda yüklenemedi."}</BodyText>

          <Button
            variant="gold"
            className="mt-6"
            onClick={() => void startQuiz()}
          >
            Tekrar Dene
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div>
        <div className="flex items-center justify-between gap-4">
          <BodyText as="span" size="sm" tone="muted" weight="bold">
            Soru {currentQuestionIndex + 1} / {quizQuestions.length}
          </BodyText>
        </div>

        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-cream"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={quizQuestions.length}
          aria-valuenow={currentQuestionIndex + 1}
          aria-label="Quiz ilerlemesi"
        >
          <div
            className="h-full rounded-full bg-light-green transition-all"
            style={{
              width: `${
                ((currentQuestionIndex + 1) / quizQuestions.length) * 100
              }%`,
            }}
          />
        </div>

        <SectionTitle
          as="h3"
          title={currentQuestion.question}
          className="mt-8"
          uppercase={false}
        />

        <div className="mt-5 grid gap-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrectOption = feedback?.correctOptionText === option;

            return (
              <button
                key={`${option}-${index}`}
                type="button"
                disabled={feedback !== null || isAnswering}
                onClick={() => setSelectedOption(index)}
                className={`rounded-card border-card p-4 text-left font-body text-sm font-semibold transition ${
                  feedback
                    ? isCorrectOption
                      ? "border-green-400 bg-green-100 text-green-900"
                      : isSelected
                        ? "border-red-300 bg-red-100 text-red-800"
                        : "bg-white text-black"
                    : isSelected
                      ? "bg-main-purple text-white"
                      : "bg-white text-black hover:bg-cream"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div
            className={`mt-5 rounded-card border p-4 text-sm ${
              feedback.isCorrect
                ? "border-green-300 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            <p className="font-bold">
              {feedback.isCorrect ? "Doğru cevap!" : "Henüz değil."}
            </p>

            {!feedback.isCorrect && (
              <p className="mt-2">
                Doğru cevap:{" "}
                <span className="font-semibold">
                  {feedback.correctOptionText}
                </span>
              </p>
            )}

            {feedback.explanation && (
              <p className="mt-2">{feedback.explanation}</p>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-button border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          {feedback ? (
            <Button
              variant="gold"
              disabled={isFinishing}
              onClick={handleContinue}
            >
              {isFinishing
                ? "Sonuç hesaplanıyor..."
                : feedback.isLastQuestion
                  ? "Sonucu Gör"
                  : "Sonraki Soru"}
            </Button>
          ) : (
            <Button
              variant="gold"
              disabled={selectedOption === null || isAnswering}
              onClick={() => void submitAnswer()}
            >
              {isAnswering ? "Kontrol ediliyor..." : "Cevabımı Kontrol Et"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
