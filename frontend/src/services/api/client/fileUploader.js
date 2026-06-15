import { getAccessToken } from './apiClient';

// ⚠️  Template literals NEVER return undefined/null — `${undefined}/api/v1` produces the
// truthy string "undefined/api/v1", so the || fallback would never activate.
// Use a conditional check to build the URL correctly.
const _envBase = import.meta.env.VITE_API_URL;
const BASE_URL = _envBase
    ? `${_envBase.replace(/\/+$/, '')}/api/v1`
    : 'https://api.unitedmess.uk/api/v1';

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
                    // Backend error middleware sends `error` key; fallback to `message`.
                    const errMsg = parsed?.message || parsed?.error || 'Upload failed';
                    const err = new Error(errMsg);
                    // Expose both keys so upstream catch handlers are resilient
                    // regardless of which key they read first.
                    err.response = {
                        status: xhr.status,
                        data: { ...parsed, message: errMsg, error: errMsg },
                    };
                    reject(err);
                }
            } catch {
                const err = new Error('Upload failed — unexpected server response');
                err.response = { status: xhr.status, data: { message: err.message, error: err.message } };
                reject(err);
            }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));

        xhr.send(formData);
    });
}
