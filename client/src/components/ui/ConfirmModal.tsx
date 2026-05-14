interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Leave lesson?</h2>
        <p className="text-gray-500 mb-6">Your progress will be lost.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-brand-red text-white font-bold py-3 rounded-xl hover:opacity-90 cursor-pointer transition-opacity"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
