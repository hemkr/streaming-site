import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { X, Video, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL, TokenStorage, authFetch } from './api';

interface ChannelProps {
    currentUser: { id: number; username: string } | null;
    resetHome: () => void;
}

const Channel = ({
    currentUser
}: ChannelProps) => {
    const navigate = useNavigate();

    const [channelData, setChannelData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showProfileEditModal, setShowProfileEditModal] = useState(false);
    const [profileForm, setProfileForm] = useState({ bio: '' });
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
    const [updatingProfile, setUpdatingProfile] = useState(false);

    useEffect(() => {
        fetchChannelData();
    }, [currentUser]);

    const fetchChannelData = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const response = await authFetch(`${API_URL}/users/${currentUser.username}`);
            if (response.ok) {
                const data = await response.json();
                setChannelData(data);
                setProfileForm({ bio: data.bio || '' });
            }
        } catch (error) {
            console.error('Error fetching channel data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: FormEvent) => {
        e.preventDefault();
        setUpdatingProfile(true);

        const formData = new FormData();
        if (profileImageFile) formData.append('profileImage', profileImageFile);
        if (bannerImageFile) formData.append('bannerImage', bannerImageFile);
        formData.append('bio', profileForm.bio);

        try {
            const response = await fetch(`${API_URL}/profile/update`, {
                method: 'PUT',
                headers: TokenStorage.getAuthHeader(),
                                         body: formData,
            });

            if (response.ok) {
                const responseData = await response.json();

                alert('프로필이 업데이트되었습니다!');
                setShowProfileEditModal(false);
                setProfileImageFile(null);
                setBannerImageFile(null);
                fetchChannelData();

                if (currentUser) {
                    const updatedUser = {
                        ...currentUser,
                        profileImage: responseData.profileImage,
                        bannerImage: responseData.bannerImage
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    window.location.reload();
                }
            } else {
                const errorData = await response.json();
                alert(`업데이트 실패: ${errorData.error || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('서버 연결 오류가 발생했습니다.');
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleVideoClick = (video: any) => {
        navigate(`/watch/${video.id}`);
    };

    if (loading) {
        return <div className="bg-[#0f0f0f] h-screen flex items-center justify-center text-white">로딩 중...</div>;
    }

    if (!channelData) return null;

    const VideoCard = ({ video }: { video: any }) => (
        <div className="cursor-pointer group flex flex-col h-full" onClick={() => handleVideoClick(video)}>
        <div className="relative overflow-hidden rounded-xl bg-gray-800 aspect-video w-full">
        {video.thumbnail ? (
            <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center">
            <Video className="text-gray-600" size={48} />
            </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
        {video.duration}
        </div>
        </div>
        <div className="mt-3">
        <h3 className="font-semibold text-white line-clamp-2 text-base">{video.title}</h3>
        <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
        <span>조회수 {video.views}회</span>
        <span>•</span>
        <span>{video.uploadTime}</span>
        </div>
        </div>
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto bg-[#0f0f0f] p-6">
        <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">내 채널</h1>
        </div>

        {/* 배너 + 프로필 섹션 */}
        <div className="bg-[#282828] rounded-xl overflow-hidden mb-8">
        {/* 배너 영역 - 프로필과 텍스트를 포함 */}
        <div className="relative w-full">
        {/* 배너 이미지 */}
        <div className="w-full h-52 bg-gradient-to-r from-purple-900 via-purple-700 to-red-600">
        {channelData.bannerImage ? (
            <img
            src={channelData.bannerImage}
            alt="배너"
            className="w-full h-full object-cover"
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Upload size={32} />
            </div>
        )}
        </div>

        {/* 프로필 정보 - 배너 위에 절대 위치 */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex items-end gap-6">
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-500 to-red-500 flex items-center justify-center text-4xl font-bold text-white flex-shrink-0 overflow-hidden border-4 border-[#282828] shadow-2xl">
        {channelData.profileImage ? (
            <img src={channelData.profileImage} alt="프로필" className="w-full h-full object-cover" />
        ) : (
            channelData.username[0].toUpperCase()
        )}
        </div>
        <div className="flex-1 pb-2">
        <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">{channelData.username}</h2>
        </div>
        </div>
        </div>

        {/* 나머지 정보 영역 */}
        <div className="px-6 pt-4 pb-6">
        <div className="flex gap-4 text-gray-400 text-sm mb-4">
        <span>구독자 {channelData.subscriberCount?.toLocaleString() || 0}명</span>
        <span>•</span>
        <span>동영상 {channelData.videoCount || 0}개</span>
        </div>
        {channelData.bio && <p className="text-gray-300 mb-4">{channelData.bio}</p>}
        <button
        onClick={() => setShowProfileEditModal(true)}
        className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors font-medium"
        >
        프로필 수정
        </button>
        </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-4">업로드한 동영상</h3>
        {channelData.videos && channelData.videos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
            <Video size={64} className="mx-auto mb-4 text-gray-600" />
            <p>아직 업로드한 동영상이 없습니다</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {channelData.videos?.map((video: any) => (
                <VideoCard key={video.id} video={video} />
            ))}
            </div>
        )}
        </div>

        {/* 프로필 수정 모달 */}
        {showProfileEditModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
            <form onSubmit={handleUpdateProfile} className="bg-[#282828] p-6 rounded-xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">프로필 수정</h2>
            <button
            type="button"
            onClick={() => {
                setShowProfileEditModal(false);
                setProfileImageFile(null);
                setBannerImageFile(null);
            }}
            className="text-gray-400 hover:text-white transition-colors"
            >
            <X size={24} />
            </button>
            </div>

            <div className="space-y-6">
            {/* 배너 이미지 업로드 */}
            <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">배너 이미지 (권장 크기: 1920x300)</label>
            <div className="w-full h-28 rounded-lg overflow-hidden bg-gradient-to-r from-purple-900 via-purple-700 to-red-600 mb-2">
            {channelData.bannerImage ? (
                <img src={channelData.bannerImage} alt="현재 배너" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Upload size={28} />
                </div>
            )}
            </div>
            <input
            type="file"
            accept="image/*"
            onChange={(e) => setBannerImageFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {bannerImageFile && (
                <p className="text-xs text-green-400 mt-1">선택됨: {bannerImageFile.name}</p>
            )}
            </div>

            {/* 프로필 이미지 */}
            <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">프로필 이미지</label>
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-red-500 flex items-center justify-center text-2xl font-bold text-white overflow-hidden mx-auto mb-2">
            {channelData.profileImage ? (
                <img src={channelData.profileImage} alt="프로필" className="w-full h-full object-cover" />
            ) : (
                channelData.username[0].toUpperCase()
            )}
            </div>
            <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {profileImageFile && (
                <p className="text-xs text-green-400 mt-1">선택됨: {profileImageFile.name}</p>
            )}
            </div>

            {/* 자기소개 */}
            <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">자기소개</label>
            <textarea
            value={profileForm.bio}
            onChange={(e) => setProfileForm({ bio: e.target.value })}
            className="w-full bg-[#121212] border border-gray-700 text-white p-3 rounded h-24 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="자신을 소개해주세요..."
            />
            </div>

            <button
            type="submit"
            disabled={updatingProfile}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {updatingProfile ? '저장 중...' : '저장하기'}
            </button>
            </div>
            </form>
            </div>
        )}
        </div>
    );
};

export default Channel;
