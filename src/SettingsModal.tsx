// SettingsModal.tsx
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { API_URL, authFetch  } from './api';

interface SettingsModalProps {
    onClose: () => void;
    onLogout: () => void;
}

const SettingsModal = ({ onClose, onLogout }: SettingsModalProps) => {
    const [activeTab, setActiveTab] = useState<'password' | 'account'>('password');

    // 비밀번호 변경
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);

    // 회원 탈퇴
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        if (passwordForm.newPassword.length < 4) {
            alert('비밀번호는 최소 4자 이상이어야 합니다.');
            return;
        }

        setChangingPassword(true);

        try {
            const response = await authFetch(`${API_URL}/profile/change-password`, {
                method: 'PUT',
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('비밀번호가 변경되었습니다.');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                onClose();
            } else {
                alert(data.error || '비밀번호 변경에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('서버 오류가 발생했습니다.');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!window.confirm('정말로 회원 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.')) {
            return;
        }

        setDeleting(true);

        try {
            const response = await authFetch(`${API_URL}/profile/delete-account`, {
                method: 'DELETE',
                body: JSON.stringify({ password: deletePassword })
            });

            const data = await response.json();

            if (response.ok) {
                alert('회원 탈퇴가 완료되었습니다.');
                onLogout();
                onClose();
            } else {
                alert(data.error || '회원 탈퇴에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('서버 오류가 발생했습니다.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
        <div className="bg-[#282828] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 z-10 bg-[#282828]">
        <h2 className="text-white text-xl font-bold">설정</h2>
        <button
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors p-1 bg-transparent"
        >
        <X size={24} />
        </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex border-b border-gray-700">
        <button
        onClick={() => setActiveTab('password')}
        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'password'
            ? 'text-white border-b-2 border-blue-500'
            : 'text-gray-400 hover:text-white'
        }`}
        >
        비밀번호 변경
        </button>
        <button
        onClick={() => setActiveTab('account')}
        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'account'
            ? 'text-white border-b-2 border-blue-500'
            : 'text-gray-400 hover:text-white'
        }`}
        >
        회원 탈퇴
        </button>
        </div>

        <div className="p-6">
        {activeTab === 'password' ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
            현재 비밀번호
            </label>
            <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-blue-500"
            placeholder="현재 비밀번호를 입력하세요"
            required
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
            새 비밀번호
            </label>
            <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-blue-500"
            placeholder="새 비밀번호를 입력하세요"
            required
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
            새 비밀번호 확인
            </label>
            <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-blue-500"
            placeholder="새 비밀번호를 다시 입력하세요"
            required
            />
            </div>

            <button
            type="submit"
            disabled={changingPassword}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
            {changingPassword ? (
                <>
                <Loader2 className="animate-spin" size={20} />
                <span>변경 중...</span>
                </>
            ) : (
                '비밀번호 변경'
            )}
            </button>
            </form>
        ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm font-medium mb-2">⚠️ 경고</p>
            <ul className="text-red-300 text-sm space-y-1 list-disc list-inside">
            <li>회원 탈퇴 시 모든 데이터가 영구적으로 삭제됩니다.</li>
            <li>업로드한 동영상, 댓글, 구독 정보가 모두 삭제됩니다.</li>
            <li>삭제된 데이터는 복구할 수 없습니다.</li>
            </ul>
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
            비밀번호 확인
            </label>
            <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-red-500"
            placeholder="비밀번호를 입력하세요"
            required
            />
            </div>

            <button
            type="submit"
            disabled={deleting}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
            {deleting ? (
                <>
                <Loader2 className="animate-spin" size={20} />
                <span>탈퇴 처리 중...</span>
                </>
            ) : (
                '회원 탈퇴'
            )}
            </button>
            </form>
        )}
        </div>
        </div>
        </div>
    );
};

export default SettingsModal;
