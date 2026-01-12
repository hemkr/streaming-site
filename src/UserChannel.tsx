import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, Upload } from 'lucide-react';
import { API_URL,  authFetch } from './api';

interface UserChannelProps {
    currentUser: { id: number; username: string } | null;
}

const UserChannel = ({ currentUser }: UserChannelProps) => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();

    const [channelData, setChannelData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        fetchChannelData();
    }, [username]);

    const fetchChannelData = async () => {
        if (!username) return;
        try {
            setLoading(true);
            const response = await authFetch(`${API_URL}/users/${username}`);
            if (response.ok) {
                const data = await response.json();
                setChannelData(data);
            }
        } catch (error) {
            console.error('Error fetching channel data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (!currentUser) {
            alert('구독하려면 로그인이 필요합니다.');
            return;
        }

        setSubscribing(true);
        try {
            const response = await authFetch(`${API_URL}/subscribe`, {
                method: 'POST',
                body: JSON.stringify({ channelName: username })
            });

            if (response.ok) {
                const data = await response.json();
                setChannelData((prev: any) => ({
                    ...prev,
                    isSubscribed: data.subscribed,
                    subscriberCount: data.subscribed
                    ? prev.subscriberCount + 1
                    : prev.subscriberCount - 1
                }));
            }
        } catch (error) {
            console.error('Subscribe error:', error);
        } finally {
            setSubscribing(false);
        }
    };

    const handleVideoClick = (video: any) => {
        navigate(`/watch/${video.id}`);
    };

    if (loading) {
        return (
            <div className="bg-[#0f0f0f] h-screen flex items-center justify-center text-white">
            로딩 중...
            </div>
        );
    }

    if (!channelData) {
        return (
            <div className="bg-[#0f0f0f] h-screen flex items-center justify-center text-white">
            채널을 찾을 수 없습니다.
            </div>
        );
    }

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

        {/* 구독 버튼 (본인 채널이 아닐 때만 표시) */}
        {currentUser && currentUser.username !== username && (
            <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className={`px-6 py-2 rounded-full font-medium transition-colors disabled:opacity-50 ${
                channelData.isSubscribed
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            >
            {subscribing ? '처리중...' : channelData.isSubscribed ? '구독중' : '구독'}
            </button>
        )}
        </div>
        </div>

        {/* 업로드한 동영상 섹션 */}
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
        </div>
    );
};

export default UserChannel;
