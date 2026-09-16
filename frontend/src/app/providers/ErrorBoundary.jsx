import { Component } from 'react';
import { Button } from '@/shared/components/ui';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(_error, errorInfo) {
        console.error('Uncaught error:', errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-screen bg-background">
                    <div className="p-8 bg-card rounded-lg shadow-md border border-border">
                        <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong.</h1>
                        <p className="text-muted-foreground">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <Button
                            variant="primary"
                            onClick={() => window.location.reload()}
                            className="mt-4"
                        >
                            Refresh Page
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.displayName = 'ErrorBoundary';
export default ErrorBoundary;
