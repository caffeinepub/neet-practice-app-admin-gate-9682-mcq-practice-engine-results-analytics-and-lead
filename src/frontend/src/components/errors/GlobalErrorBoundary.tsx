import React, { Component, ReactNode } from 'react';
import GlobalErrorScreen from './GlobalErrorScreen';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <GlobalErrorScreen error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
