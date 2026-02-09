import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import ErrorBoundary from './ErrorBoundary';

const AppProviders = ({ children }) => {
    return (
        <ErrorBoundary>
            <Provider store={store}>
                <BrowserRouter>
                    {children}
                </BrowserRouter>
            </Provider>
        </ErrorBoundary>
    );
};

export default AppProviders;
