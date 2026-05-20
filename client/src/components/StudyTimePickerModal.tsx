import { useState } from 'react';
import { saveStudyReminder } from '../lib/supabase/studyReminder';

interface Props {
  userId: string;
  onClose: () => void;
}

// 6:00 AM → 11:00 PM in 30-minute increments
const TIME_SLOTS: { label: string; value: string }[] = (() => {
  const slots: { label: string; value: string }[] = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 23 && m > 0) break;
      const period = h < 12 ? 'AM' : 'PM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${hour12}:${String(m).padStart(2, '0')} ${period}`;
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push({ label, value });
    }
  }
  return slots;
})();

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function StudyTimePickerModal({ userId, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState(false);

  const handleSetReminder = async () => {
    if (!selected || loading) return;
    setLoading(true);

    let permission: NotificationPermission = 'default';
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = 'denied';
    }

    if (permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            import.meta.env.VITE_VAPID_PUBLIC_KEY as string,
          ),
        });
        await saveStudyReminder(userId, {
          studyReminderTime: selected,
          studyReminderEnabled: true,
          pushSubscription: subscription.toJSON(),
        });
        onClose();
        return;
      } catch {
        // push subscription failed — save time only
        await saveStudyReminder(userId, {
          studyReminderTime: selected,
          studyReminderEnabled: false,
        });
        onClose();
        return;
      }
    }

    // permission denied
    await saveStudyReminder(userId, {
      studyReminderTime: selected,
      studyReminderEnabled: false,
    });
    setLoading(false);
    setBlockedMsg(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh] animate-slide-up">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-none text-center">
          <h2 className="text-lg font-extrabold text-gray-800 mb-1">
            When do you like to study?
          </h2>
          <p className="text-sm text-gray-500">
            We'll remind you daily at your chosen time 🐌
          </p>
        </div>

        {/* Time slot list */}
        <div className="overflow-y-auto flex-1 px-4">
          {TIME_SLOTS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              className={`w-full text-left px-4 py-3 rounded-xl mb-2 font-semibold text-sm transition-colors cursor-pointer ${
                selected === value
                  ? 'bg-brand-green text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-10 pt-4 flex-none">
          {blockedMsg && (
            <p className="text-sm text-red-500 text-center mb-3">
              Notifications blocked. You can enable them in your browser settings.
            </p>
          )}
          <button
            type="button"
            onClick={handleSetReminder}
            disabled={!selected || loading}
            className="w-full bg-brand-green text-white font-bold py-3 rounded-xl text-sm mb-3 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? 'Setting…' : 'Set Reminder'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-gray-400 text-sm py-1.5 cursor-pointer hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
