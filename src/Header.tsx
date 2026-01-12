import { Play, Menu, Search, Upload, Bell, Home, TrendingUp, Compass, X } from 'lucide-react'; // X, Home 등 추가
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, type KeyboardEvent } from 'react'; // useState, useEffect 추가
import { API_URL } from './api'; // API_URL 추가

interface ChannelProfile {
    username: string;
    profileImage: string | null;
}

// Props 타입 정의
interface HeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleSearch: () => void;
    handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
    currentUser: { id: number; username: string; profileImage?: string } | null;  // profileImage 추가
    showUserMenu: boolean;
    setShowUserMenu: (show: boolean) => void;
    setShowAuthModal: (show: boolean) => void;
    setShowUploadModal: (show: boolean) => void;
    handleLogout: () => void;
    handleMyChannel: () => void;
    resetHome: () => void;
     setShowSettingsModal: (show: boolean) => void;  // 추가
     subscribedChannels: string[];  // 추가
     activeTab: string;  // 추가
     setActiveTab: (tab: string) => void;  // 추가
}

const Header = ({
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    handleSearch,
    handleKeyDown,
    currentUser,
    showUserMenu,
    setShowUserMenu,
    setShowAuthModal,
    setShowUploadModal,
    handleLogout,
    handleMyChannel,
    resetHome,
    setShowSettingsModal,
    // 2. 이 아래 3가지를 반드시 여기서 선언해줘야 내부에서 사용 가능합니다 (에러 해결)
    subscribedChannels,
    activeTab,
    setActiveTab

}: HeaderProps) => {
        const navigate = useNavigate();
        const [showMobileMenu, setShowMobileMenu] = useState(false);
        const [channelProfiles, setChannelProfiles] = useState<{[key: string]: ChannelProfile}>({});

        // 메뉴 아이템 구성 데이터
        const menuItems = [
            { icon: Home, label: '홈', id: 'home' },
            { icon: TrendingUp, label: '인기', id: 'trending' },
            { icon: Compass, label: '탐색', id: 'explore' },
        ];

        // 구독 채널 클릭 핸들러
        const handleChannelClick = (channelName: string) => {
            navigate(`/channel/${channelName}`);
            setShowMobileMenu(false);
        };

        // 메뉴 아이템 클릭 핸들러
        const handleMenuClick = (tabId: string) => {
            setActiveTab(tabId);
            setShowMobileMenu(false);
        };

        // 구독한 채널들의 프로필 정보 가져오기
        useEffect(() => {
            const fetchChannelProfiles = async () => {
                const profiles: {[key: string]: ChannelProfile} = {};

                for (const channel of subscribedChannels) {
                    try {
                        const response = await fetch(`${API_URL}/users/${channel}`);
                        if (response.ok) {
                            const data = await response.json();
                            profiles[channel] = {
                                username: data.username,
                                profileImage: data.profileImage
                            };
                        }
                    } catch (error) {
                        console.error(`Error fetching profile for ${channel}:`, error);
                    }
                }

                setChannelProfiles(profiles);
            };

            if (subscribedChannels.length > 0) {
                fetchChannelProfiles();
            }
        }, [subscribedChannels]);

        return (
            <>
            <header className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 bg-[#0f0f0f] border-b border-gray-800 shrink-0 z-20 gap-3 md:gap-0">

            {/* [상단 섹션] 로고 및 모바일 전용 버튼들 */}
            <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-4">
            {/* 1. 햄버거 메뉴 버튼 */}
            <button
            onClick={() => {
                // PC에서는 사이드바 토글, 모바일에서는 모바일 메뉴 토글
                if (window.innerWidth >= 768) {
                    setSidebarOpen(!sidebarOpen);
                } else {
                    setShowMobileMenu(!showMobileMenu);
                }
            }}
            className="p-2 hover:bg-[#1f1f1f] rounded-full transition-colors text-white bg-transparent border-none outline-none appearance-none flex items-center justify-center"
            >
            <Menu size={24} />
            </button>

            <div className="flex items-center gap-1 cursor-pointer" onClick={() => {
                navigate('/');
                resetHome();
            }}>
            <div className="bg-red-600 p-1 rounded-lg">
            <Play className="text-white fill-white" size={16} />
            </div>
            <span className="text-xl font-bold tracking-tighter text-white">StreamHub</span>
            </div>
            </div>

            {/* 모바일 우측 버튼 영역 */}
            <div className="flex items-center gap-1 sm:gap-2 md:hidden relative">
            <button
            onClick={() => !currentUser ? setShowAuthModal(true) : setShowUploadModal(true)}
            className="p-2 text-white hover:bg-[#1f1f1f] rounded-full bg-transparent"
            >
            <Upload size={20} />
            </button>

            <button className="p-2 text-white hover:bg-[#1f1f1f] rounded-full bg-transparent">
            <Bell size={20} />
            </button>

            {/* 유저 버튼 - 프로필 이미지 표시 */}
            <button
            onClick={() => currentUser ? setShowUserMenu(!showUserMenu) : setShowAuthModal(true)}
            className="ml-1 p-1 rounded-full hover:bg-[#1f1f1f] bg-transparent"
            >
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs overflow-hidden">
            {currentUser?.profileImage ? (
                <img
                src={currentUser.profileImage}
                alt="프로필"
                className="w-full h-full object-cover"
                />
            ) : (
                currentUser ? currentUser.username[0].toUpperCase() : 'U'
            )}
            </div>
            </button>

            {/* 모바일용 유저 메뉴 */}
            {showUserMenu && currentUser && (
                <div className="md:hidden">
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div>
                <div className="absolute right-0 mt-12 w-48 border border-gray-700 rounded-xl shadow-xl z-20 py-2 bg-[#282828]">
                <div className="px-4 py-2 border-b border-gray-700 text-white">
                <p className="text-sm font-bold">{currentUser.username}</p>
                <button onClick={handleMyChannel} className="text-xs text-gray-400 hover:text-blue-400 bg-transparent border-none p-0">
                내 채널 보기
                </button>
                </div>
                <button
                onClick={() => {
                    setShowSettingsModal(true);
                    setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#3f3f3f] flex items-center gap-2 bg-transparent border-none"
                >
                <span>설정</span>
                </button>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#3f3f3f] flex items-center gap-2 bg-transparent border-none">
                <span>로그아웃</span>
                </button>
                </div>
                </div>
            )}
            </div>
            </div>


            {/* [PC용 검색창] */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="flex w-full">
            <input
            type="text"
            placeholder="검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#121212] border border-gray-700 text-white px-4 py-2 rounded-l-full focus:outline-none focus:border-blue-500"
            />
            <button
            onClick={handleSearch}
            className="bg-gray-800 border border-l-0 border-gray-700 px-6 py-2 rounded-r-full hover:bg-gray-700"
            >
            <Search className="text-white" size={20} />
            </button>
            </div>
            </div>

            {/* [모바일용 검색창] */}
            <div className="flex md:hidden w-full pb-1">
            <div className="flex w-full relative">
            <input
            type="text"
            placeholder="검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#121212] border border-gray-700 text-white px-4 py-2 rounded-full focus:outline-none focus:border-blue-500"
            />
            <button
            onClick={handleSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-transparent border-none outline-none appearance-none p-0 flex items-center justify-center"
            >
            <Search size={18} />
            </button>
            </div>
            </div>

            {/* [PC용 우측 메뉴] */}
            <div className="hidden md:flex items-center gap-3 relative">
            <button
            onClick={() => !currentUser ? setShowAuthModal(true) : setShowUploadModal(true)}
            className="flex items-center gap-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] px-3 py-2 rounded-full text-white transition-colors"
            >
            <Upload size={22} />
            <span className="hidden lg:inline font-medium">업로드</span>
            </button>

            <button className="p-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] rounded-full text-white">
            <Bell size={22} />
            </button>

            <div className="relative">
            <button
            onClick={() => currentUser ? setShowUserMenu(!showUserMenu) : setShowAuthModal(true)}
            className="p-1 bg-[#1f1f1f] hover:bg-[#2a2a2a] rounded-full"
            >
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white overflow-hidden">
            {currentUser?.profileImage ? (
                <img
                src={currentUser.profileImage}
                alt="프로필"
                className="w-full h-full object-cover"
                />
            ) : (
                currentUser ? currentUser.username[0].toUpperCase() : 'U'
            )}
            </div>
            </button>

            {/* 유저 메뉴 팝오버 */}
            {showUserMenu && currentUser && (
                <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 border border-gray-700 rounded-xl shadow-xl z-20 py-2 bg-[#282828]">
                <div className="px-4 py-2 border-b border-gray-700 text-white">
                <p className="text-sm font-bold">{currentUser.username}</p>
                <button onClick={handleMyChannel} className="text-xs text-gray-400 hover:text-blue-400 bg-transparent">
                내 채널 보기
                </button>
                </div>
                <button
                onClick={() => {
                    setShowSettingsModal(true);
                    setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#3f3f3f] flex items-center gap-2 bg-transparent border-none"
                >
                <span>설정</span>
                </button>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#3f3f3f] flex items-center gap-2 bg-transparent">
                <span>로그아웃</span>
                </button>
                </div>
                </>
            )}
            </div>
            </div>
            </header>

            {/* 모바일 사이드 메뉴 */}
            {showMobileMenu && (
                <div className="md:hidden fixed inset-0 z-50">
                {/* 배경 오버레이 */}
                <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setShowMobileMenu(false)}
                ></div>

                {/* 사이드 메뉴 */}
                <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0f0f0f] overflow-y-auto">
                <div className="p-4">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                <div className="bg-red-600 p-1 rounded-lg">
                <Play className="text-white fill-white" size={16} />
                </div>
                <span className="text-lg font-bold text-white cursor-pointer" onClick={() => {
                    navigate('/');
                    resetHome();
                    setShowMobileMenu(false);
                }}>StreamHub</span>
                </div>
                <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 hover:bg-[#1f1f1f] rounded-full text-white"
                >
                <X size={24} />
                </button>
                </div>

                {/* 메인 메뉴 */}
                <div className="space-y-1 mb-4">
                {menuItems.map((item) => (
                    <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`flex items-center gap-4 w-full px-3 py-3 rounded-lg transition-colors ${
                        activeTab === item.id
                        ? 'bg-[#282828] font-bold text-white'
                        : 'hover:bg-[#1a1a1a] text-white'
                    }`}
                    >
                    <item.icon
                    size={24}
                    className={activeTab === item.id ? "text-white" : "text-gray-400"}
                    />
                    <span className="text-sm">{item.label}</span>
                    </button>
                ))}
                </div>

                <hr className="border-gray-700 my-4" />

                {/* 구독 섹션 */}
                <div>
                <div className="px-3 py-2 text-gray-400 font-bold text-sm">
                구독
                </div>

                {subscribedChannels.length > 0 ? (
                    subscribedChannels.map((channel, i) => {
                        const profile = channelProfiles[channel];
                        return (
                            <button
                            key={i}
                            onClick={() => handleChannelClick(channel)}
                            className="flex items-center gap-4 w-full px-3 py-2 rounded-lg hover:bg-[#282828] text-white transition-colors"
                            >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-red-500 flex-shrink-0 text-[10px] flex items-center justify-center text-white overflow-hidden">
                            {profile?.profileImage ? (
                                <img
                                src={profile.profileImage}
                                alt={channel}
                                className="w-full h-full object-cover"
                                />
                            ) : (
                                channel[0].toUpperCase()
                            )}
                            </div>
                            <span className="text-sm truncate">{channel}</span>
                            </button>
                        );
                    })
                ) : (
                    <p className="px-3 py-2 text-xs text-gray-400">
                    구독 중인 채널이 없습니다.
                    </p>
                )}
                </div>
                </div>
                </div>
                </div>
            )}
            </>
        );
};

export default Header;
