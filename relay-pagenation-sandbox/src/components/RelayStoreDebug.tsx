import { useRelayEnvironment } from 'react-relay';
import { useState, useEffect } from 'react';

type StoreSnapshot = Record<string, any>;

/**
 * RelayStoreDebug コンポーネント
 *
 * Relay の Store（ノーマライズ済みキャッシュ）を可視化するデバッグツール
 * 表形式（viewer & connection サマリー）と JSON 形式で表示
 */
export default function RelayStoreDebug() {
  const environment = useRelayEnvironment();
  const [snapshot, setSnapshot] = useState<StoreSnapshot>({});
  const [mode, setMode] = useState<'table' | 'json'>('table');

  /**
   * ストアの現在状態を取得する関数
   * source.toJSON() はノーマライズ済みキャッシュ全体を返す
   */
  const refreshSnapshot = () => {
    const source = environment.getStore().getSource();
    setSnapshot(source.toJSON());
  };

  useEffect(() => {
    refreshSnapshot();
  }, []);

  /**
   * Store から viewer 情報を抽出して表形式で表示する
   */
  const renderTableMode = () => {
    // client:root を取得（ルートレコード）
    const clientRoot = snapshot['client:root'];
    if (!clientRoot) {
      return <p style={{ color: '#888' }}>Store が空です</p>;
    }

    // viewer の参照 ID を取得
    const viewerRef = clientRoot.viewer?.['__ref'];
    const viewerRecord = viewerRef ? snapshot[viewerRef] : null;

    // repositories connection の情報を抽出
    const repositoriesRef = viewerRecord?.repositories?.['__ref'];
    const repositoriesEdges = repositoriesRef ? snapshot[repositoriesRef]?.edges : [];
    const repositoriesPageInfo = repositoriesRef ? snapshot[repositoriesRef]?.pageInfo : {};

    // starredRepositories connection の情報を抽出
    const starredRef = viewerRecord?.starredRepositories?.['__ref'];
    const starredEdges = starredRef ? snapshot[starredRef]?.edges : [];
    const starredPageInfo = starredRef ? snapshot[starredRef]?.pageInfo : {};

    // 全レコード数
    const allRecordCount = Object.keys(snapshot).length;

    return (
      <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#333' }}>
        <div style={{ marginBottom: '1rem' }}>
          <strong>viewer</strong>
          <ul style={{ marginLeft: '1rem', listStyle: 'none', paddingLeft: 0 }}>
            <li>login: {viewerRecord?.login ?? '(not loaded)'}</li>
            <li>id: {viewerRecord?.id ?? '(not loaded)'}</li>
          </ul>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <strong>repositories（RepositoryListPage_repositories）</strong>
          <ul style={{ marginLeft: '1rem', listStyle: 'none', paddingLeft: 0 }}>
            <li>キャッシュ済み件数: {Array.isArray(repositoriesEdges) ? repositoriesEdges.length : 0}</li>
            <li>hasNextPage: {repositoriesPageInfo?.hasNextPage?.toString() ?? '(not loaded)'}</li>
            <li>endCursor: {repositoriesPageInfo?.endCursor ?? '(none)'}</li>
          </ul>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <strong>starredRepositories（StarredRepositoryListPage_starredRepositories）</strong>
          <ul style={{ marginLeft: '1rem', listStyle: 'none', paddingLeft: 0 }}>
            <li>キャッシュ済み件数: {Array.isArray(starredEdges) ? starredEdges.length : 0}</li>
            <li>hasNextPage: {starredPageInfo?.hasNextPage?.toString() ?? '(not loaded)'}</li>
            <li>endCursor: {starredPageInfo?.endCursor ?? '(none)'}</li>
          </ul>
        </div>

        <div style={{ color: '#666', fontSize: '0.8rem' }}>
          <strong>全レコード数（store 合計）:</strong> {allRecordCount}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        marginTop: '2rem',
        padding: '1rem',
        border: '1px solid #ddd',
        borderRadius: '6px',
        background: '#f9f9f9',
      }}
    >
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', userSelect: 'none' }}>
          🔍 Relay Store Debug
        </summary>

        <div style={{ marginTop: '1rem' }}>
          {/* モード切り替えタブ */}
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setMode('table')}
              style={{
                padding: '0.5rem 1rem',
                background: mode === 'table' ? '#2563eb' : '#e5e7eb',
                color: mode === 'table' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              表形式
            </button>
            <button
              onClick={() => setMode('json')}
              style={{
                padding: '0.5rem 1rem',
                background: mode === 'json' ? '#2563eb' : '#e5e7eb',
                color: mode === 'json' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              JSON
            </button>
            <button
              onClick={refreshSnapshot}
              style={{
                padding: '0.5rem 1rem',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                marginLeft: 'auto',
              }}
            >
              🔄 更新
            </button>
          </div>

          {/* コンテンツ */}
          {mode === 'table' ? (
            renderTableMode()
          ) : (
            <pre
              style={{
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '1rem',
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '0.75rem',
              }}
            >
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          )}
        </div>
      </details>
    </div>
  );
}
