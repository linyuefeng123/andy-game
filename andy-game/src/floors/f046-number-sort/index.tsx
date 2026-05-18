import type { FloorProps } from '../_registry';

export default function PlaceholderGame({ onComplete }: FloorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px' }}>
      <span style={{ fontSize: '64px' }}>🏗️</span>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '18px' }}>正在建造中...</p>
      <button
        style={{ padding: '8px 24px', borderRadius: '8px', background: 'var(--color-primary)', color: 'var(--color-text-dark)', fontWeight: 700 }}
        onClick={() => onComplete(3)}
      >
        测试完成
      </button>
    </div>
  );
}
