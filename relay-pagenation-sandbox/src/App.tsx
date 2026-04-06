import { useEffect } from 'react';
import { useQueryLoader } from 'react-relay';
import { Routes, Route, Navigate } from 'react-router-dom';
import TokenSettingsPage from './pages/TokenSettingsPage';
import RepositoryListPage from './pages/RepositoryListPage';
import { starredRepositoryListQuery } from './pages/StarredRepositoryListPage';

/**
 * App: ルートコンポーネント
 *
 * SPA ナビゲーション構成:
 *   /settings → TokenSettingsPage（GitHub PAT 入力）
 *   /repositories → RepositoryListPage（リポジトリ一覧・Relay クエリ実行）
 *   その他 → /repositories にリダイレクト
 *
 * Relay との統合:
 *   - main.tsx で RelayEnvironmentProvider でラップ済み
 *   - どのページに遷移しても Relay Environment にアクセス可能
 *   - RepositoryListPage の useLazyLoadQuery が Environment を使用して
 *     認証付きでサーバーにリクエスト
 *
 * ページ遷移フロー:
 *   1. ユーザーが /settings へ
 *   2. Token 入力・保存
 *   3. /repositories へ遷移
 *   4. RepositoryListPage が Suspense で保護された Suspense 内で
 *      useLazyLoadQuery を実行
 *   5. Relay が fetchFn （localStorage の token で認証）を呼び出し
 *   6. Environment.store にデータがキャッシュされる
 *   7. Suspense 解除 → リポジトリ一覧表示
 */
export default function App() {
  /**
   * スターリポジトリの先読み
   * App マウント時に 1ページ目のデータを先読みして、
   * モーダルを開く前にキャッシュに用意する
   */
  const [starredQueryRef, loadStarredQuery] = useQueryLoader(starredRepositoryListQuery);

  /**
   * コンポーネントマウント時にスターリポジトリを先読み
   */
  useEffect(() => {
    const token = localStorage.getItem('github_pat');
    if (token) {
      loadStarredQuery({}, { fetchPolicy: 'store-or-network' });
    }
  }, [loadStarredQuery]);

  return (
    <Routes>
      <Route path="/settings" element={<TokenSettingsPage />} />
      <Route path="/repositories" element={<RepositoryListPage starredQueryRef={starredQueryRef} />} />
      <Route path="*" element={<Navigate to="/repositories" replace />} />
    </Routes>
  );
}
