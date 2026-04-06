import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'github_pat';

/**
 * TokenSettingsPage: GitHub PAT 入力ページ
 *
 * Relay での認証フロー:
 *   1. このページで token を localStorage に保存
 *   2. src/relay/environment.ts の fetchFn が毎回 localStorage から token を読み込む
 *   3. Bearer <token> でサーバーに送信（Authorization ヘッダー）
 *   4. Relay が認証済みリクエストを自動的に実行
 *
 * Token は localStorage に保存（client-side only）
 *   - 本番環境では secure token storage を推奨
 *   - このサンドボックスではシンプルさを優先
 */
export default function TokenSettingsPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) ?? '');
  const [saved, setSaved] = useState(false);

  /**
   * handleSave: Token を localStorage に保存
   *
   * Relay との連携:
   *   - localStorage に token が保存される
   *   - fetchFn が毎回ここから読み込む
   *   - 以降のリクエストに自動的に Bearer token が含まれる
   *   - 認証が必要なクエリ（viewer など）が実行可能に
   */
  const handleSave = () => {
    localStorage.setItem(TOKEN_KEY, token.trim());
    setSaved(true);
    // /repositories へ遷移して RepositoryListPage を表示
    // (Suspense が useLazyLoadQuery をトリガー → 認証付きリクエスト実行)
    setTimeout(() => navigate('/repositories'), 500);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1>GitHub Personal Access Token 設定</h1>
      <p>
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Settings
        </a>{' '}
        で「repo」スコープを持つ PAT を生成してください。
      </p>
      <div>
        <label htmlFor="token">Personal Access Token:</label>
        <input
          id="token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxxxxxx"
          style={{
            width: '100%',
            marginTop: '0.5rem',
            padding: '0.5rem',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={!token.trim()}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1.5rem',
          cursor: token.trim() ? 'pointer' : 'not-allowed',
          opacity: token.trim() ? 1 : 0.5,
        }}
      >
        保存してリポジトリ一覧へ
      </button>
      {saved && <p style={{ color: 'green', marginTop: '1rem' }}>保存しました。遷移中...</p>}
    </div>
  );
}
