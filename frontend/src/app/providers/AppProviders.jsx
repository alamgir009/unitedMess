import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import ErrorBoundary from './ErrorBoundary';
import { ThemeProvider } from './ThemeProvider';

const AppProviders = ({ children }) => {
    return (
        <ThemeProvider>
            <ErrorBoundary>
                <Provider store={store}>
                    <BrowserRouter>
                        {children}
                    </BrowserRouter>
                </Provider>
            </ErrorBoundary>
        </ThemeProvider>
    );
};

export default AppProviders;
