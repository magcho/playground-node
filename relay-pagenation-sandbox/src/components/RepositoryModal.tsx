import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * RepositoryModal: リポジトリ一覧をモーダルで表示するコンポーネント
 *
 * 使用例:
 *   const [isOpen, setIsOpen] = useState(false);
 *   {isOpen && <RepositoryModal onClose={() => setIsOpen(false)}>
 *     <RepositoryListContent />
 *   </RepositoryModal>}
 *
 * Relay との統合:
 *   - 子に <Suspense> + <RepositoryListContent> を配置
 *   - モーダルが開いた時点でクエリが実行される
 *   - 閉じてもキャッシュは Environment.store に残る
 */
interface RepositoryModalProps {
  onClose: () => void;
  children: ReactNode;
}

export default function RepositoryModal({ onClose, children }: RepositoryModalProps) {
  // オーバーレイクリック時の処理
  const handleOverlayClick = (e: React.MouseEvent) => {
    // モーダル本体をクリックした場合は無視
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      // オーバーレイ
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      {/* モーダル本体 */}
      <div
        onClick={(e) => e.stopPropagation()} // 内部クリックで close されないようにする
        style={{
          position: 'fixed',
          background: 'white',
          borderRadius: '8px',
          width: 'min(600px, 90vw)',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 30px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            リポジトリ一覧
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem',
              lineHeight: 1,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* コンテンツエリア */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
