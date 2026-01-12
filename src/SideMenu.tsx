import { Home, TrendingUp, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { API_URL } from './api';

interface SideMenuProps {
    sidebarOpen: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    subscribedChannels: string[];
}

interface ChannelProfile {
    username: string;
    profileImage: string | null;
}

const SideMenu = ({
    sidebarOpen,
    activeTab,
    setActiveTab,
    subscribedChannels
}: SideMenuProps) => {
    const navigate = useNavigate();
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
                        console.log(`Profile data for ${channel}:`, data); // 👈 디버깅 추가
                        profiles[channel] = {
                            username: data.username,
                            profileImage: data.profileImage
                        };
                    }
                } catch (error) {
                    console.error(`Error fetching profile for ${channel}:`, error);
                }
            }

            console.log('All profiles:', profiles); // 👈 디버깅 추가
            setChannelProfiles(profiles);
        };

        if (subscribedChannels.length > 0) {
            fetchChannelProfiles();
        }
    }, [subscribedChannels]);

    return (
        <aside className={`${sidebarOpen ? 'w-60' : 'w-20'} bg-[#0f0f0f] overflow-y-auto transition-all duration-300 hidden md:block border-r border-gray-800`}>
        <div className="p-3 space-y-1 h-full bg-[#0f0f0f]">
        {/* 상단 메인 메뉴 */}
        {menuItems.map((item) => (
            <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{ backgroundColor: activeTab === item.id ? '#282828' : 'transparent' }}
            className={`flex items-center gap-4 w-full px-3 py-3 rounded-lg transition-colors ${
                activeTab === item.id ? 'font-bold text-white' : 'hover:bg-[#1a1a1a] text-white'
            }`}
            >
            <item.icon
            size={24}
            style={{ color: activeTab === item.id ? 'white' : '#9ca3af' }}
            className={activeTab === item.id ? "text-white" : "text-gray-400"}
            />
            <span className={`${!sidebarOpen && 'hidden'} text-sm text-white`}>{item.label}</span>
            </button>
        ))}

        <hr className="border-gray-700 my-2" />

        {/* 구독 섹션 */}
        <div className="bg-[#0f0f0f]">
        <div className={`px-3 py-2 text-gray-400 font-bold text-sm ${!sidebarOpen && 'hidden'}`} style={{ color: '#9ca3af' }}>
        구독
        </div>

        {subscribedChannels.length > 0 ? (
            subscribedChannels.map((channel, i) => {
                const profile = channelProfiles[channel];
                console.log(`Rendering ${channel}, profile:`, profile);

                return (
                    <button
                    key={i}
                    onClick={() => handleChannelClick(channel)}
                    style={{ backgroundColor: 'transparent' }}
                    className="flex items-center gap-4 w-full px-3 py-2 rounded-lg hover:bg-[#282828] text-white transition-colors group"
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
                    <span className={`${!sidebarOpen && 'hidden'} text-sm truncate`} style={{ color: '#ffffff' }}>
                    {channel}
                    </span>
                    </button>
                );
            })
        ) : (
            <p className={`px-3 py-2 text-xs text-gray-400 ${!sidebarOpen && 'hidden'}`} style={{ color: '#9ca3af' }}>
            구독 중인 채널이 없습니다.
            </p>
        )}
        </div>
        </div>
        </aside>
    );
};

export default SideMenu;
