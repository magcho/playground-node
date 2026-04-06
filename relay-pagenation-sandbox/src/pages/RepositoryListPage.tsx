import { Suspense, useState, useCallback } from 'react';
import { useLazyLoadQuery, useFragment, graphql } from 'react-relay';
import { useNavigate } from 'react-router-dom';
import RepositoryCard from '../components/RepositoryCard';
import type { RepositoryListPageQuery as QueryType } from '../__generated__/RepositoryListPageQuery.graphql';
import type { RepositoryListPage_viewer$key } from '../__generated__/RepositoryListPage_viewer.graphql';

/**
 * RepositoryListPage_viewer Fragment
 *
 * Relay Fragment の役割:
 *   - コンポーネントが必要とするデータ構造を宣言
 *   - parent コンポーネントから受け取った $key に基づいて useFragment が自動的にデータを抽出
 *   - Fragment 内での型定義により、TypeScript の型安全性を確保
 *
 * @argumentDefinitions:
 *   - Fragment が受け取る引数（パラメータ）を定義
 *   - count: ページあたりのリポジトリ数（デフォルト 10）
 *   - cursor: ページネーション用のカーソル（次のページ開始位置）
 *
 * @connection:
 *   - Relay のページネーション管理の核となる指定
 *   - repositories フィールドをコネクション（接続）として登録
 *   - "さらに読み込む" で新しいデータが追加される時、
 *     Relay が自動的に edges を追加・マージしてくれる
 *   - key="RepositoryListPage_repositories" は接続の一意識別子
 *
 * ...RepositoryCard_repository:
 *   - RepositoryCard.tsx で定義された Fragment を展開
 *   - Fragment の「コロケーション」：データ要件が各コンポーネントの近くで定義される
 *   - 親が子コンポーネントのデータ要件を明示的に知る必要がない
 */
const viewerFragment = graphql`
  fragment RepositoryListPage_viewer on User
    @argumentDefinitions(
      count: { type: "Int!", defaultValue: 10 }
      cursor: { type: "String" }
    ) {
    login
    repositories(
      first: $count
      after: $cursor
      orderBy: { field: UPDATED_AT, direction: DESC }
      ownerAffiliations: [OWNER]
    ) @connection(key: "RepositoryListPage_repositories") {
      edges {
        node {
          id
          ...RepositoryCard_repository
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * RepositoryListPageQuery
 *
 * 役割: ページの初期データを取得するルートクエリ
 *
 * Relay では、ページごとに通常1つの「ルートクエリ」を持ちます。
 * 複数の Fragment の親となり、アプリケーションの「エントリーポイント」です。
 *
 * $count, $cursor の変数:
 *   - useLazyLoadQuery 実行時に { count: 10, cursor: "..." } で渡される
 *   - Fragment に @arguments で転送される
 *
 * @arguments:
 *   - Fragment の @argumentDefinitions で定義された引数に値を渡す
 *   - viewer Fragment が $count と $cursor を受け取る
 *
 * ページネーションのフロー:
 *   1. 初回: cursor = undefined で実行
 *   2. "さらに読み込む" クリック
 *   3. 親コンポーネント (RepositoryListPage) が cursor state を更新
 *   4. key={cursor} により Suspense 境界が再マウント
 *   5. 新しい cursor でルートクエリ再実行
 *   6. @connection で edges が自動マージされる
 */
const repositoryListQuery = graphql`
  query RepositoryListPageQuery($count: Int = 10, $cursor: String) {
    viewer {
      ...RepositoryListPage_viewer @arguments(count: $count, cursor: $cursor)
    }
  }
`;

/**
 * RepositoryList コンポーネント
 *
 * 役割: 取得したデータを画面に表示（表示層）
 *
 * Relay の設計パターン:
 *   - 親コンポーネント: useLazyLoadQuery でクエリ実行 → $key を渡す
 *   - 子コンポーネント: useFragment で $key からデータ抽出
 *
 * viewerRef（$key）:
 *   - 親の RepositoryListContent が useLazyLoadQuery で取得した data.viewer
 *   - useFragment にこの $key を渡すことで、Fragment で定義されたデータが抽出される
 *   - RepositoryListPage_viewer$key という型で型安全性が保証される
 */
function RepositoryList({ viewerRef, onLoadMore }: { viewerRef: RepositoryListPage_viewer$key; onLoadMore: (cursor: string) => void }) {
  /**
   * useFragment: Fragment データの取得
   *
   * 役割:
   *   - parent ($key) から Fragment で定義されたデータを抽出
   *   - Environment.store からキャッシュデータを読み込む
   *   - TypeScript の型情報を Fragment から生成
   *
   * Relay のキャッシュシステム:
   *   1. ルートクエリ実行時にサーバーからデータ取得
   *   2. Relay が自動的にデータをノーマライズして store に保存
   *   3. useFragment が store から必要なデータだけを抽出
   *   4. もしデータが不足していても、Relay が自動的に再フェッチ
   */
  const data = useFragment(viewerFragment, viewerRef);

  const handleLoadMore = useCallback(() => {
    if (data.repositories.pageInfo?.endCursor) {
      onLoadMore(data.repositories.pageInfo.endCursor);
    }
  }, [data.repositories.pageInfo?.endCursor, onLoadMore]);

  const edges = data.repositories.edges ?? [];
  const hasNextPage = data.repositories.pageInfo?.hasNextPage ?? false;

  return (
    <div>
      <h2>@{data.login} のリポジトリ</h2>
      {edges.length === 0 ? (
        <p style={{ color: '#888' }}>リポジトリがありません</p>
      ) : (
        edges.map((edge) => {
          if (!edge?.node) return null;
          return <RepositoryCard key={edge.node.id} repository={edge.node} />;
        })
      )}

      {hasNextPage && (
        <button
          onClick={handleLoadMore}
          style={{
            padding: '0.75rem 2rem',
            width: '100%',
            marginTop: '1rem',
            cursor: 'pointer',
          }}
        >
          さらに読み込む
        </button>
      )}
      {!hasNextPage && edges.length > 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '1rem' }}>すべて表示しました</p>
      )}
    </div>
  );
}

/**
 * RepositoryListContent コンポーネント
 *
 * 役割: Relay のクエリ実行（データ取得層）
 *
 * Relay のデータ取得パターン:
 *   1. useLazyLoadQuery でクエリ実行開始
 *   2. Relay がサーバーにリクエスト（Environment.network.fetchFn を呼び出し）
 *   3. データがキャッシュされるまで Suspense throw（親の Suspense が fallback 表示）
 *   4. キャッシュ完了後、コンポーネント描画
 *   5. 子に $key を渡す
 */
function RepositoryListContent({ cursor, onLoadMore }: { cursor?: string; onLoadMore: (cursor: string) => void }) {
  /**
   * useLazyLoadQuery: 最初のクエリ実行
   *
   * 役割:
   *   - コンポーネント描画時にクエリを実行
   *   - キャッシュが完成するまで Suspense を throw
   *   - 親コンポーネントの Suspense が fallback を表示
   *
   * Suspense 統合の仕組み:
   *   - Relay のキャッシュが「完全」になるまで Promise を throw
   *   - React が throw を捕捉して Suspense 境界で fallback を表示
   *   - キャッシュが完全になると Promise 完了 → 描画再開
   *
   * 変数の渡し方:
   *   - count: 1ページあたりのリポジトリ数
   *   - cursor: ページネーション用カーソル（undefined なら最初のページ）
   */
  const data = useLazyLoadQuery<QueryType>(repositoryListQuery, { count: 10, cursor });
  return <RepositoryList viewerRef={data.viewer} onLoadMore={onLoadMore} />;
}

/**
 * RepositoryListPage（メインコンポーネント）
 *
 * 役割: ページレベルのロジックと Suspense 境界の管理
 *
 * アーキテクチャの階層:
 *   RepositoryListPage（ページ層）
 *     ↓ Suspense で保護
 *   RepositoryListContent（クエリ層・useLazyLoadQuery）
 *     ↓ $key を渡す
 *   RepositoryList（表示層・useFragment）
 *     ↓ 各フィールドの $key を渡す
 *   RepositoryCard（詳細層・useFragment）
 *
 * ページネーション実装のポイント:
 *   1. cursor state で現在のページ位置を管理
 *   2. "さらに読み込む" で新しい cursor に update
 *   3. key={cursor} で RepositoryListContent が再マウント
 *   4. 新しい cursor で useLazyLoadQuery 再実行
 *   5. @connection により edges が自動マージされる
 *      （古いデータと新しいデータが1つの配列に結合される）
 */
export default function RepositoryListPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('github_pat');

  /**
   * cursor state: ページネーション用
   *   - undefined: 最初のページ
   *   - string: GraphQL API の endCursor（次のページ開始位置）
   *
   * setCursor が呼ばれる → key={cursor} で RepositoryListContent 再マウント
   *   → useLazyLoadQuery が新しい cursor で再実行
   *   → Suspense が待機 → 新規データ取得完了で描画再開
   */
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  if (!token) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <p>GitHub Personal Access Token が設定されていません。</p>
        <button onClick={() => navigate('/settings')} style={{ padding: '0.5rem 1.5rem' }}>
          設定ページへ
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>リポジトリ一覧</h1>
        <button onClick={() => navigate('/settings')} style={{ padding: '0.5rem 1rem' }}>
          トークン設定
        </button>
      </div>
      {/*
        Suspense 境界: Relay のデータ取得を待機
        - RepositoryListContent が useLazyLoadQuery でデータ完全キャッシュまで throw
        - fallback を表示して待機
        - キャッシュ完了後、通常描画に切り替わる
      */}
      <Suspense fallback={<p>リポジトリを読み込み中...</p>}>
        {/*
          key={cursor}: ページネーション時に RepositoryListContent を再マウント
          - cursor が変わる → コンポーネント再マウント
          - 新しい cursor で useLazyLoadQuery が再実行される
        */}
        <RepositoryListContent key={cursor} cursor={cursor} onLoadMore={setCursor} />
      </Suspense>
    </div>
  );
}
