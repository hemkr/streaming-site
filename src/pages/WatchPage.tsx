import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayerOverlay from '../VideoPlayerOverlay';
import Header from '../Header';
// type-only import
import type { VideoType } from '../VideoPlayerOverlay';
import { API_URL } from '../api';

interface WatchPageProps {
    currentUser: any;
    subscribedChannels: string[];
    liked: any;
    videoStats: any;
    videos: VideoType[];
    handleLike: (id: number) => void;
    handleDislike: (id: number) => void;
    handleSubscribe: (channel: string) => void;
    handleDelete: (video: VideoType) => void;
    handleShare: (video: VideoType) => void;
    handleEditVideo: (video: VideoType) => void;
    setShowAuthModal: (show: boolean) => void;
    // Header에 필요한 props 추가
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleSearch: () => void;
    handleKeyDown: (e: any) => void;
    showUserMenu: boolean;
    setShowUserMenu: (show: boolean) => void;
    setShowUploadModal: (show: boolean) => void;
    handleLogout: () => void;
    handleMyChannel: () => void;
    resetHome: () => void;
    setShowSettingsModal: (show: boolean) => void;
    // 아래 두 줄을 인터페이스에 추가하세요
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const WatchPage = ({
    currentUser,
    subscribedChannels,
    liked,
    videoStats,
    videos,
    handleLike,
    handleDislike,
    handleSubscribe,
    handleDelete,
    handleShare,
    handleEditVideo,
    setShowAuthModal,
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    handleSearch,
    handleKeyDown,
    showUserMenu,
    setShowUserMenu,
    setShowUploadModal,
    handleLogout,
    handleMyChannel,
    resetHome,
       setShowSettingsModal,

       activeTab,
       setActiveTab
}: WatchPageProps) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [video, setVideo] = useState<VideoType | null>(null);

    useEffect(() => {
        if (id) {
            fetch(`${API_URL}/videos/${id}`)
            .then(res => res.json())
            .then(data => setVideo(data))
            .catch(err => console.error(err));
        }
    }, [id]);

    if (!video) return <div className="text-white p-10">로딩 중...</div>;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        handleKeyDown={handleKeyDown}
        currentUser={currentUser}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        setShowAuthModal={setShowAuthModal}
        setShowUploadModal={setShowUploadModal}
        handleLogout={handleLogout}
        handleMyChannel={handleMyChannel}
        resetHome={resetHome}
        setShowSettingsModal={setShowSettingsModal}
        // 4. Header에 새로 추가된 필수 props 전달 (에러 해결)
        subscribedChannels={subscribedChannels}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        />
        <div className="flex-1 overflow-y-auto">
        <VideoPlayerOverlay
        video={video}
        currentUser={currentUser}
        subscribedChannels={subscribedChannels}
        liked={liked}
        videoStats={videoStats}
        videos={videos}
        onClose={() => navigate('/')}
        onDelete={handleDelete}
        onLike={handleLike}
        onDislike={handleDislike}
        onShare={handleShare}
        onSubscribe={handleSubscribe}
        onVideoSelect={(v) => navigate(`/watch/${v.id}`)}
        onShowAuthModal={() => setShowAuthModal(true)}
        onEdit={handleEditVideo}
        hideCloseButton={true}
        moveEditDeleteButtons={true}
        />
        </div>
        </div>
    );
};

export default WatchPage;
