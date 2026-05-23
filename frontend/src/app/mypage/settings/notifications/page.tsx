"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  areAllNotificationsEnabled,
  readNotificationSettings,
  type NotificationSettings,
  writeNotificationSettings,
} from "@/lib/users/notificationSettings";

export default function PushNotificationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(() => readNotificationSettings());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window
      ? window.Notification.permission
      : "unsupported",
  );
  const allNotifications = areAllNotificationsEnabled(settings);

  const updateSettings = (nextSettings: NotificationSettings) => {
    setSettings(nextSettings);
    writeNotificationSettings(nextSettings);
  };

  const handleToggleAll = () => {
    const newValue = !allNotifications;
    updateSettings({
      newTransaction: newValue,
      scheduleProposal: newValue,
      scheduleConfirmed: newValue,
      dayOfReminder: newValue,
      evaluated: newValue,
      cancellation: newValue,
    });
  };

  const handleToggle = (key: keyof typeof settings) => {
    updateSettings({ ...settings, [key]: !settings[key] });
  };

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const nextPermission = await window.Notification.requestPermission();
    setPermission(nextPermission);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-10 flex items-center border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="flex-1 text-center text-base font-black text-slate-900 pr-4">プッシュ通知</h1>
      </header>

      <section className="bg-white px-4 py-4 mt-2">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">すべての通知</h2>
            <p className="mt-1 text-xs text-slate-500">すべての通知のON/OFFを一括で設定できます</p>
          </div>
          <div className="pt-1">
            <ToggleSwitch checked={allNotifications} onChange={handleToggleAll} />
          </div>
        </div>
      </section>

      <section className="mt-3 bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">ブラウザ通知</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {permissionMessage(permission)}
            </p>
          </div>
          {permission === "default" ? (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="shrink-0 rounded-full bg-blue-600 px-3 py-2 text-xs font-bold text-white"
            >
              許可する
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 bg-white">
        <div className="px-4 py-3 bg-slate-50 border-y border-slate-100">
          <h3 className="text-xs font-bold text-slate-600">通知の種類ごとに設定</h3>
        </div>
        
        <div className="divide-y divide-slate-100 px-4">
          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-bold text-slate-900">新しい取引開始</span>
            <ToggleSwitch checked={settings.newTransaction} onChange={() => handleToggle("newTransaction")} />
          </div>

          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-bold text-slate-900">日時候補が届いた</span>
            <ToggleSwitch checked={settings.scheduleProposal} onChange={() => handleToggle("scheduleProposal")} />
          </div>

          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-bold text-slate-900">日時が確定した</span>
            <ToggleSwitch checked={settings.scheduleConfirmed} onChange={() => handleToggle("scheduleConfirmed")} />
          </div>

          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-bold text-slate-900">当日リマインド（受け渡し前）</span>
            <ToggleSwitch checked={settings.dayOfReminder} onChange={() => handleToggle("dayOfReminder")} />
          </div>

          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-bold text-slate-900">相手から評価された</span>
            <ToggleSwitch checked={settings.evaluated} onChange={() => handleToggle("evaluated")} />
          </div>

          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-bold text-slate-900">キャンセル通知</span>
            <ToggleSwitch checked={settings.cancellation} onChange={() => handleToggle("cancellation")} />
          </div>
        </div>
      </section>
    </main>
  );
}

function permissionMessage(permission: NotificationPermission | "unsupported"): string {
  switch (permission) {
    case "granted":
      return "この端末ではブラウザ通知が許可されています。";
    case "denied":
      return "この端末ではブラウザ通知がブロックされています。ブラウザ設定から変更できます。";
    case "unsupported":
      return "このブラウザは通知に対応していません。";
    case "default":
      return "通知を受け取るには、この端末でブラウザ通知を許可してください。";
  }
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-300"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}
