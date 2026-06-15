import { getAccessToken } from './apiClient';

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1` || 'https://api.unitedmess.uk/api/v1';

const UPLOAD_TIMEOUT = 60000;

export function uploadFile(method, url, formData, { timeout = UPLOAD_TIMEOUT, onProgress } = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const fullUrl = url.startsWith('http') ? url : `${BASE_URL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;

        xhr.open(method.toUpperCase(), fullUrl);
        xhr.withCredentials = true;
        xhr.timeout = timeout;

        const token = getAccessToken();
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        if (typeof onProgress === 'function') {
            xhr.upload.addEventListener('progress', onProgress);
        }

        xhr.onload = () => {
            try {
                const parsed = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({ data: parsed });
                } else {
                    const err = new Error(parsed?.error || parsed?.message || 'Upload failed');
                    err.response = { status: xhr.status, data: parsed };
                    reject(err);
                }
            } catch {
                const err = new Error('Upload failed');
                err.response = { status: xhr.status, data: xhr.responseText };
                reject(err);
            }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));

        xhr.send(formData);
    });
}
