// src/VideoPlayerOverlay.tsx
import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Share2, Video, Trash2, Loader2, Edit } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { API_URL, authFetch } from './api';


export interface VideoType {
    id: number;
    title: string;
    thumbnail: string;
    channel: string;
    views: string;
    uploadTime: string;
    uploadDate?: string;
    duration: string;
    description: string;
    likes: number;
    dislikes: number;
    videoUrl?: string;
    subscriberCount?: number;

}

interface CommentType {
    id: number;
    username: string;
    content: string;
    createdAt: string;
    userId: number;
}

interface VideoPlayerOverlayProps {
    video: VideoType;
    currentUser: { id: number; username: string; profileImage?: string } | null;
    subscribedChannels: string[];
    liked: { [key: number]: 'like' | 'dislike' | null };
    videoStats: { [key: number]: { likes: number; dislikes: number } };
    videos: VideoType[];
    onClose: () => void;
    onDelete: (video: VideoType) => void;
    onLike: (videoId: number) => void;
    onDislike: (videoId: number) => void;
    onShare: (video: VideoType) => void;
    onSubscribe: (channelName: string) => void;
    onVideoSelect: (video: VideoType) => void;
    onShowAuthModal: () => void;
    onEdit: (video: VideoType) => void;
    hideCloseButton?: boolean;
    moveEditDeleteButtons?: boolean;
}

const VideoPlayerOverlay = memo(({
    video,
    currentUser,
    subscribedChannels,
    liked,
    videoStats,
    videos,
    onDelete,
    onLike,
    onDislike,
    onShare,
    onSubscribe,
    onVideoSelect,
    onShowAuthModal,
    onEdit,
    moveEditDeleteButtons = false
}: VideoPlayerOverlayProps) => {
    const navigate = useNavigate();  // 👈 이 줄 추가
    const [comments, setComments] = useState<CommentType[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [channelProfile, setChannelProfile] = useState<{ profileImage: string | null } | null>(null);
    const [commentProfiles, setCommentProfiles] = useState<{[username: string]: string | null}>({});

    // 상태 추가 (기존 useState들 아래에)
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');


    // 채널 프로필 가져오기
    useEffect(() => {
        const fetchChannelProfile = async () => {
            try {
                const response = await fetch(`${API_URL}/users/${video.channel}`);
                if (response.ok) {
                    const data = await response.json();
                    setChannelProfile({ profileImage: data.profileImage });
                }
            } catch (error) {
                console.error('Failed to fetch channel profile', error);
            }
        };

        fetchChannelProfile();
    }, [video.channel]);

    useEffect(() => {
        fetchComments();
    }, [video.id]);

    const fetchComments = async () => {
        setLoadingComments(true);
        try {
            const response = await fetch(`${API_URL}/videos/${video.id}/comments`);
            if (response.ok) {
                const data = await response.json();
                setComments(data);

                // 댓글 작성자들의 프로필 가져오기
const uniqueUsernames = [...new Set(data.map((c: CommentType) => c.username))] as string[];
                const profiles: {[username: string]: string | null} = {};

                for (const username of uniqueUsernames) {
                    try {
                        const profileResponse = await fetch(`${API_URL}/users/${username}`);
                        if (profileResponse.ok) {
                            const profileData = await profileResponse.json();
                            profiles[username] = profileData.profileImage;
                        }
                    } catch (error) {
                        console.error(`Failed to fetch profile for ${username}`, error);
                    }
                }

                setCommentProfiles(profiles);
            }
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !commentText.trim() || submitting) return;

        setSubmitting(true);
        try {
            const response = await authFetch(`${API_URL}/videos/${video.id}/comments`, {
                method: 'POST',
                body: JSON.stringify({
                    userId: currentUser.id,
                    content: commentText
                })
            });

            if (response.ok) {
                const data = await response.json();
                const newComment = data.comment;
                setComments(prev => [newComment, ...prev]);
                setCommentText('');

                // 현재 사용자의 프로필 추가
                if (currentUser.profileImage) {
                    setCommentProfiles(prev => ({
                        ...prev,
                        [currentUser.username]: currentUser.profileImage || null
                    }));
                }
            } else {
                const errorData = await response.json();
                alert(errorData.error || '댓글 작성에 실패했습니다.');
            }
        } catch (error) {
            console.error('댓글 작성 실패:', error);
            alert('댓글 작성 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChannelClick = () => {
        if (currentUser && currentUser.username === video.channel) {
            navigate('/channel');
        } else {
            navigate(`/channel/${video.channel}`);
        }
    };

    const handleCommentDelete = async (commentId: number) => {
        if (!commentId) {
            console.error("삭제하려는 댓글의 ID가 없습니다.");
            return;
        }

        if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

        try {
            const response = await authFetch(`${API_URL}/comments/${commentId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            } else if (response.status === 403) {
                alert("본인의 댓글만 삭제할 수 있습니다.");
            } else {
                alert("삭제에 실패했습니다.");
            }
        } catch (error) {
            console.error("삭제 중 오류 발생:", error);
            alert("댓글 삭제 중 오류가 발생했습니다.");
        }
    };

    // 댓글 수정 시작 함수 추가 (handleCommentDelete 위에)
    const handleCommentEdit = (comment: CommentType) => {
        setEditingCommentId(comment.id);
        setEditingCommentText(comment.content);
    };

    // 댓글 수정 제출 함수 추가
    const handleCommentUpdate = async (commentId: number) => {
        if (!editingCommentText.trim()) return;

        try {
            const response = await authFetch(`${API_URL}/comments/${commentId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    content: editingCommentText
                })
            });

            if (response.ok) {
                setComments(prev => prev.map(c =>
                c.id === commentId
                ? { ...c, content: editingCommentText }
                : c
                ));
                setEditingCommentId(null);
                setEditingCommentText('');
            } else {
                alert("수정에 실패했습니다.");
            }
        } catch (error) {
            console.error("수정 중 오류 발생:", error);
            alert("댓글 수정 중 오류가 발생했습니다.");
        }
    };

    // 댓글 수정 취소 함수 추가
    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditingCommentText('');
    };

    return (
        <div className="w-full h-full flex flex-col bg-black">
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-gray-800">
        <VideoPlayer videoUrl={video.videoUrl} />
        </div>

        <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">{video.title}</h1>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-4 flex-wrap">
        <div
        className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleChannelClick}
        >
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-red-500 flex items-center justify-center text-white font-bold overflow-hidden">
        {channelProfile?.profileImage ? (
            <img
            src={channelProfile.profileImage}
            alt={video.channel}
            className="w-full h-full object-cover"
            />
        ) : (
            video.channel.substring(0, 1).toUpperCase()
        )}
        </div>
        <div>
        <p className="text-white font-semibold">{video.channel}</p>
        <p className="text-gray-400 text-xs">
        구독자 {video.subscriberCount?.toLocaleString() || 0}명
        </p>
        </div>
        </div>

        {currentUser?.username !== video.channel && (
            <button
            onClick={(e) => {
                e.stopPropagation();
                onSubscribe(video.channel);
            }}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                subscribedChannels.includes(video.channel)
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
            >
            {subscribedChannels.includes(video.channel) ? '구독중' : '구독'}
            </button>
        )}

        {moveEditDeleteButtons && currentUser && currentUser.username === video.channel && (
            <>
            <button
            onClick={() => onEdit(video)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-full transition-colors"
            >
            <Edit size={18} />
            <span className="text-sm font-medium">수정</span>
            </button>
            <button
            onClick={() => onDelete(video)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full transition-colors"
            >
            <Trash2 size={18} />
            <span className="text-sm font-medium">삭제</span>
            </button>
            </>
        )}
        </div>

        <div className="flex items-center gap-2">
        <div className="flex rounded-full overflow-hidden" style={{ backgroundColor: '#2a2a2a', colorScheme: 'dark' }}>
        <button
        onClick={(e) => {
            e.stopPropagation();
            onLike(video.id);
        }}
        style={{ backgroundColor: 'transparent' }}
        className={`flex items-center gap-2 px-4 py-2 hover:bg-[#3f3f3f] transition-colors border-r border-gray-700 ${
            liked[video.id] === 'like' ? 'text-blue-400' : 'text-white'
        }`}
        >
        <ThumbsUp size={18} style={{ color: liked[video.id] === 'like' ? '#60a5fa' : 'white' }} />
        <span className="text-sm" style={{ color: 'white' }}>
        {(videoStats[video.id]?.likes ?? video.likes).toLocaleString()}
        </span>
        </button>

        <button
        onClick={(e) => {
            e.stopPropagation();
            onDislike(video.id);
        }}
        style={{ backgroundColor: 'transparent' }}
        className={`flex items-center gap-2 px-4 py-2 hover:bg-[#3f3f3f] transition-colors ${
            liked[video.id] === 'dislike' ? 'text-red-400' : 'text-white'
        }`}
        >
        <ThumbsDown size={18} style={{ color: liked[video.id] === 'dislike' ? '#f87171' : 'white' }} />
        <span className="text-sm" style={{ color: 'white' }}>
        {(videoStats[video.id]?.dislikes ?? video.dislikes).toLocaleString()}
        </span>
        </button>
        </div>

        <button
        onClick={(e) => {
            e.stopPropagation();
            onShare(video);
        }}
        className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-full hover:bg-gray-700 transition-colors"
        >
        <Share2 size={18} />
        <span className="text-sm hidden sm:inline">공유</span>
        </button>
        </div>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer">
        <div className="flex gap-2 text-sm text-white font-bold mb-2">
        <span>조회수 {video.views}</span>
        <span>•</span>
        <span>{video.uploadTime}</span>
        {video.uploadDate && (
            <>
            <span>•</span>
            <span>{video.uploadDate}</span>
            </>
        )}
        </div>
        <p className="text-gray-300 whitespace-pre-wrap">{video.description || '설명이 없습니다.'}</p>
        </div>

        {/* 댓글 섹션 */}
        <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-6">
        댓글 {comments.length}개
        </h3>

        {/* 댓글 입력 폼 */}
        <div className="flex gap-4 mb-8">
        <div className="w-10 h-10 rounded-full bg-purple-600 flex-shrink-0 flex items-center justify-center text-white font-bold overflow-hidden">
        {currentUser?.profileImage ? (
            <img
            src={currentUser.profileImage}
            alt="프로필"
            className="w-full h-full object-cover"
            />
        ) : (
            currentUser ? currentUser.username[0].toUpperCase() : '?'
        )}
        </div>
        <div className="flex-1">
        {currentUser ? (
            <form onSubmit={handleCommentSubmit}>
            <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글 추가..."
            disabled={submitting}
            className="w-full bg-transparent border-b border-gray-700 focus:border-white text-white pb-2 focus:outline-none transition-colors disabled:opacity-50"
            />
            <div className="flex justify-end gap-2 mt-2">
            <button
            type="button"
            onClick={() => setCommentText('')}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-transparent hover:bg-gray-800 rounded-full disabled:opacity-50"
            >
            취소
            </button>
            <button
            type="submit"
            disabled={!commentText.trim() || submitting}
            className={`px-4 py-2 text-sm font-medium rounded-full ${
                commentText.trim() && !submitting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
            >
            {submitting ? '등록 중...' : '댓글'}
            </button>
            </div>
            </form>
        ) : (
            <div
            onClick={onShowAuthModal}
            className="w-full border-b border-gray-700 pb-2 text-gray-400 cursor-pointer hover:border-gray-500"
            >
            댓글을 작성하려면 로그인이 필요합니다.
            </div>
        )}
        </div>
        </div>

        {/* 댓글 목록 */}
        <div className="space-y-6">
        {loadingComments ? (
            <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-gray-400" />
            </div>
        ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
            첫 댓글을 작성해보세요!
            </div>
        ) : (
            comments.map((comment) => (
                <div key={comment.id} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                {commentProfiles[comment.username] ? (
                    <img
                    src={commentProfiles[comment.username]!}
                    alt={comment.username}
                    className="w-full h-full object-cover"
                    />
                ) : (
                    comment.username ? comment.username[0].toUpperCase() : '?'
                )}
                </div>

                <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-sm font-semibold">
                {comment.username || '알 수 없는 사용자'}
                </span>
                <span className="text-gray-400 text-xs">
                {comment.createdAt}
                </span>
                </div>

                {/* 수정 모드일 때 */}
                {editingCommentId === comment.id ? (
                    <div className="mt-2">
                    <input
                    type="text"
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 focus:border-blue-500 text-white px-3 py-2 rounded focus:outline-none"
                    autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                    <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                    >
                    취소
                    </button>
                    <button
                    onClick={() => handleCommentUpdate(comment.id)}
                    disabled={!editingCommentText.trim()}
                    className={`px-3 py-1 text-sm rounded ${
                        editingCommentText.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    >
                    저장
                    </button>
                    </div>
                    </div>
                ) : (
                    <>
                    <p className="text-white text-sm whitespace-pre-wrap">
                    {comment.content}
                    </p>

                    {/* 수정/삭제 버튼 */}
                    {currentUser && currentUser.id === comment.userId && (
                        <div className="mt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                        onClick={() => handleCommentEdit(comment)}
                        className="flex items-center gap-1 text-gray-400 hover:text-blue-500 text-xs font-medium"
                        >
                        <Edit size={14} /> 수정
                        </button>
                        <button
                        onClick={() => handleCommentDelete(comment.id)}
                        className="flex items-center gap-1 text-gray-400 hover:text-red-500 text-xs font-medium"
                        >
                        <Trash2 size={14} /> 삭제
                        </button>
                        </div>
                    )}
                    </>
                )}
                </div>
                </div>
            ))
        )}
        </div>
        </div>
        </div>
        </div>

        <div className="lg:col-span-1">
        <h2 className="text-white font-bold text-lg mb-4">다음 동영상</h2>
        <div className="space-y-3">
        {videos.filter(v => v.id !== video.id).map(v => (

            <div key={v.id} className="flex gap-2 cursor-pointer group" onClick={() => onVideoSelect(v)}>
            <div className="w-40 aspect-video rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
            {v.thumbnail ? (
                <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500"><Video size={20} /></div>
            )}
            <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-[10px] px-1 rounded">
            {v.duration}
            </div>
            </div>
            <div className="flex-1">
            <h4 className="text-white text-sm font-semibold line-clamp-2 group-hover:text-gray-300">{v.title}</h4>
            <p className="text-gray-400 text-xs mt-1">{v.channel}</p>
            <p className="text-gray-400 text-xs mt-1">조회수 {v.views} • {v.uploadTime} • {v.uploadDate}</p>
            </div>
            </div>
        ))}
        </div>
        </div>
        </div>
        </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.video.id === nextProps.video.id &&
        prevProps.currentUser?.id === nextProps.currentUser?.id &&
        prevProps.subscribedChannels.length === nextProps.subscribedChannels.length &&
        JSON.stringify(prevProps.liked) === JSON.stringify(nextProps.liked) &&
        JSON.stringify(prevProps.videoStats) === JSON.stringify(nextProps.videoStats)
    );
});

export default VideoPlayerOverlay;
