import { useEffect } from 'react';
import { usePreloadedQuery, usePaginationFragment, graphql } from 'react-relay';
import RepositoryCard from '../components/RepositoryCard';
import type { StarredRepositoryListPageQuery as QueryType } from '../__generated__/StarredRepositoryListPageQuery.graphql';
import type { StarredRepositoryListPage_viewer$key } from '../__generated__/StarredRepositoryListPage_viewer.graphql';
import type { StarredRepositoryListPagePaginationQuery as PaginationQueryType } from '../__generated__/StarredRepositoryListPagePaginationQuery.graphql';

/**
 * StarredRepositoryListPage_viewer Fragment
 *
 * usePaginationFragment 用の Fragment（スターリポジトリ版）
 *
 * 重要な指定:
 *   - @refetchable(queryName: "StarredRepositoryListPagePaginationQuery")
 *     Relay が「次ページ読み込み」時に実行するクエリを自動生成する
 *
 *   - @argumentDefinitions
 *     ページネーション用の引数：count（1ページのアイテム数）、cursor（次ページ開始位置）
 *
 *   - @connection
 *     edges をコネクション（接続）として管理
 *     loadNext/loadPrevious で新しい edges が自動マージされる
 */
const viewerFragment = graphql`
  fragment StarredRepositoryListPage_viewer on User
    @refetchable(queryName: "StarredRepositoryListPagePaginationQuery")
    @argumentDefinitions(
      count: { type: "Int", defaultValue: 10 }
      cursor: { type: "String" }
    ) {
    login
    starredRepositories(
      first: $count
      after: $cursor
      orderBy: { field: STARRED_AT, direction: DESC }
    ) @connection(key: "StarredRepositoryListPage_starredRepositories") {
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
 * StarredRepositoryListPageQuery
 *
 * 役割: スターリポジトリページの初期データを取得するルートクエリ
 */
export const starredRepositoryListQuery = graphql`
  query StarredRepositoryListPageQuery {
    viewer {
      ...StarredRepositoryListPage_viewer
    }
  }
`;

/**
 * StarredRepositoryList コンポーネント
 *
 * 役割: usePaginationFragment を使ってスターリポジトリのページネーション機能を実装
 *
 * 自動読み込み:
 *   - useEffect が hasNext && !isLoadingNext を監視
 *   - 次ページがあれば自動的に loadNext(10) を実行
 *   - すべてのページが読み込まれるまで繰り返す
 *   - UI には「読み込み中...」テキストのみ表示（ボタンなし）
 *
 * preload 戦略:
 *   - App.tsx の useQueryLoader で 1 ページ目を事前読み込み
 *   - モーダルを開くと usePreloadedQuery がキャッシュから即座に返す
 *   - 2 ページ目以降は自動読み込みで fetch
 */
function StarredRepositoryList({ viewerRef }: { viewerRef: StarredRepositoryListPage_viewer$key }) {
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    PaginationQueryType,
    StarredRepositoryListPage_viewer$key
  >(viewerFragment, viewerRef);

  const edges = data.starredRepositories.edges ?? [];

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
      <h2>@{data.login} のスターリポジトリ</h2>
      {edges.length === 0 ? (
        <p style={{ color: '#888' }}>スターリポジトリがありません</p>
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
 * StarredRepositoryListContent コンポーネント
 *
 * 役割: 先読み済みのクエリデータを消費する（スターリポジトリ版）
 *       RepositoryListPage 内で Suspense 境界によって保護される
 *
 * usePreloadedQuery の仕組み:
 *   - props: queryReference（App.tsx の useQueryLoader で先読み済み）
 *   - cache に 1 ページ目のデータが既に存在
 *   - Suspense をスキップして即座にデータを返す
 *   - モーダルを開いた時点で表示準備完了
 *
 * preload vs on-demand:
 *   - リポジトリ一覧: on-demand（ボタンクリック後に fetch）
 *   - スターリポジトリ: preload（App マウント時に fetch）
 *   - 理由: スターリポジトリは初回アクセス時に 1 ページ目を先読み
 *     → モーダル開く時の待機時間を削減
 */
export function StarredRepositoryListContent({ queryReference }: { queryReference: any }) {
  const data = usePreloadedQuery<QueryType>(starredRepositoryListQuery, queryReference);
  return <StarredRepositoryList viewerRef={data.viewer} />;
}
