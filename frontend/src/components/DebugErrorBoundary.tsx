import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class DebugErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, background: '#fee2e2', color: '#991b1b', borderRadius: 2, m: 4 }}>
          <Typography variant="h6" color="error">Something went wrong.</Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', mt: 2 }}>
            {this.state.error?.toString()}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', mt: 2, fontSize: '0.8rem' }}>
            {this.state.errorInfo?.componentStack}
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}
