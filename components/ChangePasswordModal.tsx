"use client";

import { useState } from "react";
import BodyText from "./BodyText";
import Button from "./button";
import Modal from "./Modal";
import { createClient } from "@/lib/supabase/client";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ChangePasswordModal({
  open,
  onClose,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setFormMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        throw new Error("Şifre değiştirmek için yeniden giriş yapmalısın.");
      }

      // Mevcut şifreyi doğrular.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Mevcut şifren doğru değil.");
      }

      // Doğrulama başarılıysa yeni şifreyi kaydeder.
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFormMessage("Şifren başarıyla güncellendi.");
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : "Şifre şu anda güncellenemedi.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Şifreyi Değiştir">
      <form onSubmit={handleSubmit} className="grid gap-5">
        <BodyText size="sm" tone="muted" weight="normal">
          Hesabını korumak için güçlü ve daha önce kullanmadığın bir şifre seç.
        </BodyText>

        <label className="grid gap-2">
          <BodyText as="span" size="sm" tone="default" weight="bold">
            Mevcut şifre
          </BodyText>

          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="rounded-button border-card bg-white px-4 py-3 font-body text-sm text-black outline-none focus:border-main-purple"
          />
        </label>

        <label className="grid gap-2">
          <BodyText as="span" size="sm" tone="default" weight="bold">
            Yeni şifre
          </BodyText>

          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="rounded-button border-card bg-white px-4 py-3 font-body text-sm text-black outline-none focus:border-main-purple"
          />
        </label>

        <label className="grid gap-2">
          <BodyText as="span" size="sm" tone="default" weight="bold">
            Yeni şifre tekrar
          </BodyText>

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-button border-card bg-white px-4 py-3 font-body text-sm text-black outline-none focus:border-main-purple"
          />
        </label>

        {confirmPassword && !passwordsMatch && (
          <BodyText size="xs" tone="accent" weight="bold">
            Yeni şifreler aynı değil.
          </BodyText>
        )}

        {formMessage && (
          <BodyText size="xs" tone="muted" weight="bold">
            {formMessage}
          </BodyText>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={!currentPassword || !passwordsMatch || isSaving}
          >
            Şifreyi Güncelle
          </Button>
        </div>
      </form>
    </Modal>
  );
}
