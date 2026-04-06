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
 *   /repositories → RepositoryListPage（リポジトリ一覧・データ取得）
 *   その他 → /repositories にリダイレクト
 *
 * Relay との統合:
 *   - main.tsx で RelayEnvironmentProvider でラップ済み
 *   - どのページに遷移しても Relay Environment にアクセス可能
 *   - RepositoryListContent（Suspense で保護）が useLazyLoadQuery で
 *     Environment を使用して認証付きでサーバーにリクエスト
 *
 * App での事前読み込み:
 *   - useQueryLoader で starredRepositoryListQuery を先読み
 *   - token がある場合、マウント時に loadStarredQuery を実行
 *   - 結果を starredQueryRef として RepositoryListPage に渡す
 *   - モーダル開く前に 1 ページ目が cache に準備される
 *
 * ページ遷移フロー:
 *   1. ユーザーが /settings へ
 *   2. Token 入力・保存
 *   3. /repositories へ遷移
 *   4. RepositoryListPage がマウント（starredQueryRef を受け取り）
 *   5. リポジトリ一覧ボタンクリック → RepositoryListContent が useLazyLoadQuery 実行
 *   6. スターリポジトリボタンクリック → usePreloadedQuery が cache から即座に返す
 *   7. Relay が fetchFn （localStorage の token で認証）を呼び出し
 *   8. Environment.store にデータがキャッシュされる
 *   9. Suspense 解除 → データ表示
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
