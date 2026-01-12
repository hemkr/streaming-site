// App.tsx 상단에 있던 토큰/API 관련 코드를 이리로 옮깁니다.
export const API_URL = 'http://jcher.iptime.org:8087/api';

// ========== 토큰 관리 유틸리티 ==========
export const TokenStorage = {
    setToken: (token: string) => {
        localStorage.setItem('auth_token', token);
    },
    getToken: (): string | null => {
        return localStorage.getItem('auth_token');
    },
    removeToken: () => {
        localStorage.removeItem('auth_token');
    },
    getAuthHeader: (): Record<string, string> => {
        const token = TokenStorage.getToken();
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }
        return {};
    }
};


// 인증이 필요한 API 호출
export const authFetch = async (url: string, options: RequestInit = {}) => {
    const authHeader = TokenStorage.getAuthHeader();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        TokenStorage.removeToken();
        localStorage.removeItem('user');
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        window.location.reload();
    }

    return response;
};



// FormData 업로드용
export const authFetchFormData = async (url: string, formData: FormData) => {
    const authHeader = TokenStorage.getAuthHeader();

    const headers: Record<string, string> = {
        ...authHeader
    };

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (response.status === 401) {
        TokenStorage.removeToken();
        localStorage.removeItem('user');
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        window.location.reload();
    }

    return response;
};

// 비밀번호 변경
export const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await authFetch(`${API_URL}/profile/change-password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
    });
    return response;
};

// 회원 탈퇴
export const deleteAccount = async (password: string) => {
    const response = await authFetch(`${API_URL}/profile/delete-account`, {
        method: 'DELETE',
        body: JSON.stringify({ password }),
    });
    return response;
};
