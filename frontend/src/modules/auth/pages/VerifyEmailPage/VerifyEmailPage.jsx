import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// TODO: Replace with env variable
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const API_URL = 'http://localhost:8080/api/v1';

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('verifying'); // verifying, success, error

    useEffect(() => {
        if (!token) {
            setStatus('error');
            toast.error('Invalid verification link');
            return;
        }

        const verifyEmail = async () => {
            try {
                await axios.get(`${API_URL}/auth/verify-email/${token}`);
                setStatus('success');
                toast.success('Email verified successfully!');
                setTimeout(() => {
                    navigate('/auth/login');
                }, 3000);
            } catch (error) {
                console.error(error);
                setStatus('error');
                toast.error(error.response?.data?.message || 'Verification failed');
            }
        };

        verifyEmail();
    }, [token, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="p-8 bg-card rounded-lg shadow-lg max-w-md w-full text-center border border-border">
                <h1 className="text-2xl font-bold mb-4 text-primary">Email Verification</h1>

                {status === 'verifying' && (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground">Verifying your email...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-green-600">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <p className="text-lg">Email verified successfully!</p>
                        <p className="text-sm text-muted-foreground mt-2">Redirecting to login...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-destructive">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        <p className="text-lg">Verification failed.</p>
                        <p className="text-sm text-muted-foreground mt-2">The link may be invalid or expired.</p>
                        <button
                            onClick={() => navigate('/auth/login')}
                            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;
