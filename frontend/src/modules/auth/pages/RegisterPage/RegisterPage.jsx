import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { reset } from '../../store/auth.slice';
import RegisterForm from '../../components/RegisterForm/RegisterForm';

const RegisterPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { user, isSuccess } = useSelector((state) => state.auth);

    useEffect(() => {
        if (isSuccess || user) {
            navigate('/dashboard');
        }
        dispatch(reset());
    }, [user, isSuccess, navigate, dispatch]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Sign in
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <RegisterForm />
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
