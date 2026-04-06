import { useFragment, graphql } from 'react-relay';
import type { RepositoryCard_repository$key } from '../__generated__/RepositoryCard_repository.graphql';

/**
 * RepositoryCard_repository Fragment
 *
 * Relay の「Fragment コロケーション」パターン:
 *   - コンポーネント（RepositoryCard）が必要なデータを Fragment で明示
 *   - 親コンポーネントは子が何を必要とするか知らない
 *   - Fragment 展開（...RepositoryCard_repository）で親が自動的に必要な fields を含める
 *
 * 利点:
 *   1. コンポーネントの独立性
 *      - RepositoryCard が必要な fields を明確に定義
 *      - 親が細かいデータ要件を管理する必要がない
 *
 *   2. 再利用性
 *      - 異なるページで同じ RepositoryCard を使用
 *      - Fragment が同じデータセットを自動的に要求
 *
 *   3. 保守性
 *      - RepositoryCard が新しい field が必要になった場合、
 *        Fragment を修正するだけで済む
 *      - 親の GraphQL クエリは自動的に新しい field を含める
 */
const repositoryFragment = graphql`
  fragment RepositoryCard_repository on Repository {
    id
    name
    nameWithOwner
    description
    url
    stargazerCount
    forkCount
    primaryLanguage {
      name
      color
    }
    updatedAt
    isPrivate
  }
`;

/**
 * Props の型定義
 *
 * RepositoryCard_repository$key:
 *   - Relay が自動生成した型
 *   - parent から受け取った「opaque reference」（不透明な参照）
 *   - この $key を useFragment に渡して実際のデータを抽出
 *   - 型チェックにより不正な props の渡し方がコンパイル時に検知される
 *
 * $key の仕組み:
 *   1. parent が ...RepositoryCard_repository 展開を含めて Fragment を実行
 *   2. Relay が node の参照（$key）を生成
 *   3. parent が child に $key を渡す
 *   4. child の useFragment が $key から実際の node データを復元
 *
 * この仕組みにより、parent は Repository の具体的な fields を知らなくても
 * child に正しいデータを渡せる（Fragment コロケーション）
 */
type Props = {
  repository: RepositoryCard_repository$key;
};

/**
 * RepositoryCard: Repository の詳細情報を表示
 *
 * Relay パターン: Fragment 使用コンポーネント
 *   - $key を prop で受け取る
 *   - useFragment で実データを抽出
 *   - Fragment で定義された fields にアクセス可能
 */
export default function RepositoryCard({ repository }: Props) {
  /**
   * useFragment: Fragment データの抽出
   *
   * 実行フロー:
   *   1. Fragment 定義（repositoryFragment）で要求する fields を確認
   *   2. Environment.store からその fields のデータを取得
   *   3. data として型安全にアクセス可能
   *
   * キャッシング:
   *   - parent の useLazyLoadQuery で一度キャッシュされたら、
   *     useFragment は常に cache から読む（追加リクエストなし）
   *   - 複数の child で同じ node を参照していても、store に1つの実体
   */
  const data = useFragment(repositoryFragment, repository);

  return (
    <div
      style={{
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        padding: '1rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <a href={data.url} target="_blank" rel="noopener noreferrer">
          <strong>{data.nameWithOwner}</strong>
        </a>
        {data.isPrivate && (
          <span
            style={{
              fontSize: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '0 6px',
              backgroundColor: '#f6f8fa',
            }}
          >
            Private
          </span>
        )}
      </div>
      {data.description && (
        <p style={{ color: '#586069', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
          {data.description}
        </p>
      )}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#586069', flexWrap: 'wrap' }}>
        {data.primaryLanguage && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: data.primaryLanguage.color ?? '#ccc',
              }}
            />
            {data.primaryLanguage.name}
          </span>
        )}
        <span>★ {data.stargazerCount}</span>
        <span>⑂ {data.forkCount}</span>
        <span>Updated: {new Date(data.updatedAt).toLocaleDateString('ja-JP')}</span>
      </div>
    </div>
  );
}
