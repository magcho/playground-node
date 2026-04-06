import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { RelayEnvironmentProvider } from 'react-relay';
import { BrowserRouter } from 'react-router-dom';
import { relayEnvironment } from './relay/environment';
import App from './App';

/**
 * React アプリケーションのルート
 *
 * Relay 学習ポイント: プロバイダー層の構成
 *
 * 1. RelayEnvironmentProvider
 *    - Relay Environment をコンテキスト経由ですべての子コンポーネントに提供
 *    - useLazyLoadQuery, useFragment などが Environment に アクセス可能になる
 *    - アプリケーション全体で1つだけ配置する
 *
 * 2. Suspense
 *    - Relay のデータ取得は Suspense 境界と統合
 *    - コンポーネントがデータを必要とするが未取得の場合、
 *      Suspense が throw を検知して fallback を表示
 *    - ネットワーク待機中に「Loading...」と表示される
 *
 * 3. BrowserRouter
 *    - React Router による SPA ナビゲーション
 *    - ページ遷移時に新しいクエリを実行（Suspense 境界で待機）
 *
 * データの流れ:
 *   App コンポーネント → 各ページ
 *   → useLazyLoadQuery でデータ取得開始（Suspense が待機）
 *   → fetchFn が実行 → Environment.store にキャッシュ
 *   → Suspense 解除 → コンポーネント描画
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RelayEnvironmentProvider environment={relayEnvironment}>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
          <App />
        </Suspense>
      </BrowserRouter>
    </RelayEnvironmentProvider>
  </React.StrictMode>
);
