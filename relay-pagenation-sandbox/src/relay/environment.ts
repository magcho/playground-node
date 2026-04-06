import { Environment, Network, RecordSource, Store, FetchFunction } from 'relay-runtime';

const GITHUB_API_URL = 'https://api.github.com/graphql';
const TOKEN_STORAGE_KEY = 'github_pat';

/**
 * fetchFn: Relay がネットワークリクエストを実行するためのカスタム関数
 *
 * Relay のデータフロー:
 *   1. useLazyLoadQuery / useFragment などがデータが必要なことを検出
 *   2. Relay が自動的に fetchFn を呼び出す
 *   3. fetchFn がサーバーにGraphQLリクエストを送信
 *   4. レスポンスを Relay に返す
 *   5. Relay が Environment.store にデータをキャッシュ
 *   6. コンポーネントが再レンダリングされて最新データを表示
 *
 * FetchFunction の型定義:
 *   - request: { text: string } - GraphQLクエリのテキスト
 *   - variables: Record<string, any> - クエリ変数（$count, $cursor など）
 *   - 戻り値: Promise<any> - GraphQLレスポンスのデータ部分
 */
const fetchFn: FetchFunction = async (request, variables) => {
  // localStorage から Personal Access Token を毎回読み込む
  // （トークンが変更されていれば即座に新しいトークンが使われる）
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  const response = await fetch(GITHUB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Bearer トークン認証（GitHub GraphQL API の要件）
      'Authorization': `bearer ${token ?? ''}`,
    },
    body: JSON.stringify({
      query: request.text,      // GraphQL クエリテキスト（query/mutation）
      variables,                 // クエリ変数（ページネーション時の $count, $cursor など）
    }),
  });

  const json = await response.json();

  // GraphQL エラーハンドリング
  // HTTP 200 でもレスポンスに errors フィールドがある場合がある
  if (json.errors) {
    const isAuthError = json.errors.some(
      (e: { type?: string; message?: string }) =>
        e.type === 'FORBIDDEN' ||
        e.type === 'UNAUTHORIZED' ||
        (e.message?.includes('Bad credentials') ?? false)
    );
    if (isAuthError) {
      throw new Error('Authentication failed. Please check your GitHub PAT.');
    }
    throw new Error(json.errors.map((e: { message: string }) => e.message).join(', '));
  }

  return json;
};

/**
 * createEnvironment: Relay Environment の生成関数
 *
 * Environment は Relay の以下の責務を担当します：
 *
 * 1. Network（ネットワーク層）
 *    - GraphQL リクエストをサーバーに送信する
 *    - fetchFn を実行してカスタム認証ロジック（Bearer トークン）を実装
 *
 * 2. Store（キャッシュ層）
 *    - 取得したデータをメモリ上に保持
 *    - Fragment 実行時にキャッシュ内のデータを参照
 *    - ページネーション時に新しいデータをマージ
 *
 * 3. RecordSource（ノーマライズドキャッシュ）
 *    - GraphQL オブジェクトをノーマライズ（正規化）して保存
 *    - 例: Repository(id="123") のような各オブジェクトが個別の Record になる
 *    - 同じ id のオブジェクトが複数の場所に出現しても、実体は1つ
 *
 * 注: アプリ内で Environment は通常1つだけ生成し、
 *     RelayEnvironmentProvider 経由ですべてのコンポーネントで共有する
 */
export function createEnvironment() {
  return new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  });
}

// アプリケーション全体で使用される Environment インスタンス
export const relayEnvironment = createEnvironment();
