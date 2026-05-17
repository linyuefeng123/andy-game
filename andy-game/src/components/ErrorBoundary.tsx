import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          padding: '24px',
          textAlign: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '48px' }}>😵</span>
          <h3 style={{ color: '#ff6b6b', fontSize: '18px' }}>出了点问题</h3>
          <p style={{ color: '#a0a0c0', fontSize: '14px' }}>
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              padding: '8px 24px',
              borderRadius: '8px',
              background: 'rgba(77, 150, 255, 0.2)',
              border: '1px solid #4d96ff',
              color: '#4d96ff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🏠 返回大厅
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
