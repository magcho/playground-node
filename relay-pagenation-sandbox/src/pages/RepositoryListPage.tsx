import { Suspense, useState, useEffect } from 'react';
import { useLazyLoadQuery, usePaginationFragment, graphql } from 'react-relay';
import { useNavigate } from 'react-router-dom';
import RepositoryCard from '../components/RepositoryCard';
import RepositoryModal from '../components/RepositoryModal';
import { StarredRepositoryListContent } from './StarredRepositoryListPage';
import type { RepositoryListPageQuery as QueryType } from '../__generated__/RepositoryListPageQuery.graphql';
import type { RepositoryListPage_viewer$key } from '../__generated__/RepositoryListPage_viewer.graphql';
import type { RepositoryListPagePaginationQuery as PaginationQueryType } from '../__generated__/RepositoryListPagePaginationQuery.graphql';

/**
 * RepositoryListPage_viewer Fragment
 *
 * usePaginationFragment 用の Fragment
 *
 * 重要な指定:
 *   - @refetchable(queryName: "RepositoryListPagePaginationQuery")
 *     Relay が「次ページ読み込み」時に実行するクエリを自動生成する
 *     このクエリは relay-compiler が RepositoryListPagePaginationQuery.graphql.ts として生成
 *
 *   - @argumentDefinitions
 *     ページネーション用の引数：count（1ページのアイテム数）、cursor（次ページ開始位置）
 *
 *   - @connection
 *     edges をコネクション（接続）として管理
 *     loadNext/loadPrevious で新しい edges が自動マージされる
 */
const viewerFragment = graphql`
  fragment RepositoryListPage_viewer on User
    @refetchable(queryName: "RepositoryListPagePaginationQuery")
    @argumentDefinitions(
      count: { type: "Int", defaultValue: 10 }
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
 * usePaginationFragment での使用:
 *   - 初回ロード時のみ実行（cursor なしで最初のページを取得）
 *   - その後の "さらに読み込む" は usePaginationFragment が @refetchable で
 *     自動生成された RepositoryListPagePaginationQuery を使用
 *
 * $count のデフォルト値:
 *   - 最初の Fragment 引数が { count: 10 } で初期化されるため、
 *     このクエリからは $count を明示的に渡す必要がない
 */
const repositoryListQuery = graphql`
  query RepositoryListPageQuery {
    viewer {
      ...RepositoryListPage_viewer
    }
  }
`;

/**
 * RepositoryList コンポーネント
 *
 * 役割: usePaginationFragment を使ってページネーション機能を実装
 *
 * usePaginationFragment の利点:
 *   - loadNext / loadPrevious / refetch を自動的に提供
 *   - isLoadingNext / isLoadingPrevious でローディング状態を取得
 *   - データの自動マージを @connection が処理
 *   - cursor 管理を Relay に委譲（コンポーネント側は state 不要）
 *
 * 自動読み込み:
 *   - useEffect が hasNext && !isLoadingNext を監視
 *   - 次ページがあれば自動的に loadNext(10) を実行
 *   - すべてのページが読み込まれるまで繰り返す
 *   - UI には「読み込み中...」テキストのみ表示（ボタンなし）
 */
function RepositoryList({ viewerRef }: { viewerRef: RepositoryListPage_viewer$key }) {
  /**
   * usePaginationFragment: ページネーション対応 Fragment データ取得
   *
   * 戻り値:
   *   - data: Fragment で定義されたフィールド（login, repositories など）
   *   - loadNext: 次ページの読み込み（引数: first（読み込み件数））
   *   - loadPrevious: 前ページの読み込み
   *   - hasNext / hasPrevious: さらにページがあるかどうか
   *   - isLoadingNext / isLoadingPrevious: ローディング中かどうか
   *   - refetch: クエリを再実行
   *
   * @refetchable が RepositoryListPagePaginationQuery を自動生成しているため、
   * usePaginationFragment は loadNext() 呼び出し時にそのクエリを自動実行
   */
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    PaginationQueryType,
    RepositoryListPage_viewer$key
  >(viewerFragment, viewerRef);

  const edges = data.repositories.edges ?? [];

  /**
   * 自動読み込み: 次ページがあれば自動的に loadNext を実行
   */
  useEffect(() => {
    if (hasNext && !isLoadingNext) {
      loadNext(10);
    }
  }, [hasNext, isLoadingNext, loadNext]);

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

      {isLoadingNext && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '1rem' }}>読み込み中...</p>
      )}
      {!hasNext && edges.length > 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '1rem' }}>すべて表示しました</p>
      )}
    </div>
  );
}

/**
 * RepositoryListContent コンポーネント
 *
 * 役割: Relay のルートクエリ実行（データ取得層）
 *       RepositoryListPage 内で Suspense 境界によって保護される
 *
 * データ取得フロー:
 *   - useLazyLoadQuery で repositoryListQuery を実行（変数なし）
 *   - Fragment の @argumentDefinitions が default count: 10 を使用
 *   - Relay が fetchFn を呼び出す → サーバーから 1 ページ目を取得
 *   - Environment.store にキャッシュ → RepositoryList に $key を渡す
 *
 * usePaginationFragment との役割分担:
 *   - RepositoryListContent: ルートクエリ実行（初回ロード）
 *   - RepositoryList: usePaginationFragment でページネーション管理
 *     → loadNext() で次ページ fetch → auto-fetch で全ページロード
 */
function RepositoryListContent() {
  /**
   * useLazyLoadQuery: ルートクエリ実行
   *
   * 新しい形:
   *   - 変数なし（Fragment の @argumentDefinitions のデフォルト値が使用される）
   *   - シンプルに viewer のデータを取得するだけ
   *   - ページネーション管理は usePaginationFragment に任せる
   */
  const data = useLazyLoadQuery<QueryType>(repositoryListQuery, {});
  return <RepositoryList viewerRef={data.viewer} />;
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
 *   RepositoryList（表示層・usePaginationFragment）
 *     ↓ loadNext を呼び出してページネーション
 *   RepositoryCard（詳細層・useFragment）
 *
 * usePaginationFragment への変更:
 *   - cursor state が不要（Relay が内部管理）
 *   - key={cursor} による再マウントが不要
 *   - RepositoryListContent は1回だけマウント
 *   - "さらに読み込む" は usePaginationFragment の loadNext() で処理
 */
export default function RepositoryListPage({ starredQueryRef }: { starredQueryRef?: any }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('github_pat');

  /**
   * モーダル管理
   * isModalOpen = true のとき、RepositoryModal を表示
   */
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * スターリポジトリモーダル管理
   * isStarModalOpen = true のとき、スターリポジトリを表示
   */
  const [isStarModalOpen, setIsStarModalOpen] = useState(false);

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
      {/* ランディングセクション */}
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>リポジトリ管理</h1>
        <div style={{ marginBottom: '2rem', fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '1rem' }}>
            <strong>⭐ スターリポジトリ</strong>
            <br />
            初期読み込み時に 1 ページ目を取得 & モーダルを開いてからそのさきを読み込み（preload）
          </p>
          <p>
            <strong>リポジトリ一覧</strong>
            <br />
            モーダルを開いてから全件読み込み
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: '0.75rem 2rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            リポジトリ一覧を開く
          </button>
          <button
            onClick={() => setIsStarModalOpen(true)}
            style={{
              padding: '0.75rem 2rem',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            ⭐ スターリポジトリ一覧
          </button>
          <button
            onClick={() => navigate('/settings')}
            style={{
              padding: '0.75rem 2rem',
              background: '#e5e7eb',
              color: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            トークン設定
          </button>
        </div>
      </div>

      {/* リポジトリモーダル */}
      {isModalOpen && (
        <RepositoryModal onClose={() => setIsModalOpen(false)}>
          <Suspense fallback={<p>リポジトリを読み込み中...</p>}>
            <RepositoryListContent />
          </Suspense>
        </RepositoryModal>
      )}

      {/* スターリポジトリモーダル */}
      {isStarModalOpen && starredQueryRef ? (
        <RepositoryModal onClose={() => setIsStarModalOpen(false)}>
          <Suspense fallback={<p>スターリポジトリを読み込み中...</p>}>
            <StarredRepositoryListContent queryReference={starredQueryRef} />
          </Suspense>
        </RepositoryModal>
      ) : null}
    </div>
  );
}
