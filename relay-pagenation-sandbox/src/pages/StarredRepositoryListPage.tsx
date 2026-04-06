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
 * usePaginationFragment を使ってスターリポジトリのページネーション機能を実装
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
 * usePreloadedQuery で先読み済みデータを取得
 */
export function StarredRepositoryListContent({ queryReference }: { queryReference: any }) {
  const data = usePreloadedQuery<QueryType>(starredRepositoryListQuery, queryReference);
  return <StarredRepositoryList viewerRef={data.viewer} />;
}
