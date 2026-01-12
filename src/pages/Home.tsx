// type-only import로 변경
import type { VideoType } from '../VideoPlayerOverlay';
import { Play, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// VideoCardProps 정의 및 onClick 추가
interface VideoCardProps {
    video: VideoType;
    isLarge?: boolean;
    onClick: () => void;
}

// onClick을 destructured props로 받아 div에 연결
const VideoCard = ({ video, isLarge = false, onClick }: VideoCardProps) => (
    <div
    className={`cursor-pointer group flex flex-col h-full`}
    onClick={onClick} // 전달받은 함수 실행
    >
    <div className="relative overflow-hidden rounded-xl bg-gray-800 aspect-video w-full">
    {video.thumbnail ? (
        <img
        src={video.thumbnail}
        alt={video.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
        }}
        />
    ) : null}
    <div className={`absolute inset-0 flex items-center justify-center bg-gray-800 ${video.thumbnail ? '-z-10' : ''}`}>
    <Video className="text-gray-600" size={48} />
    </div>

    <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
    {video.duration}
    </div>
    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
    <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 fill-white" size={48} />
    </div>
    </div>
    <div className="mt-3 flex gap-3">
    <div className="flex-1">
    <h3 className={`font-semibold text-white line-clamp-2 ${isLarge ? 'text-lg' : 'text-base'}`}>
    {video.title}
    </h3>
    <p className="text-gray-400 text-sm mt-1 hover:text-white transition-colors">
    {video.channel}
    </p>
    <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
    <span>조회수 {video.views}회</span>
    <span>•</span>
    <span>{video.uploadTime}</span>
    </div>
    </div>
    </div>
    </div>
);


interface HomeProps {
    videos: VideoType[];
    loading: boolean;
    // 사용하지 않는 props 정의 제거 (빌드 오류 방지)
}

// 사용하지 않는 props는 매개변수에서 제거
const categories = ['전체', '게임', '음악', '실시간', '요리', '축구', '프로그래밍'];

const Home = ({ videos, loading }: HomeProps) => {
    const navigate = useNavigate();

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0f0f0f]">
        <div className="max-w-[2000px] mx-auto">
        {/* --- 카테고리 태그 영역 추가 --- */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
            <button
            key={category}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                category === '전체'
                ? 'bg-white text-black'
                : 'bg-[#272727] text-white hover:bg-[#3f3f3f]'
            }`}
            >
            {category}
            </button>
        ))}
        </div>
        {/* --------------------------- */}

        {loading ? (
            <div className="text-white">로딩중...</div>
        ) : videos.length === 0 ? (
            <div className="text-white">비디오가 없습니다</div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-y-8 gap-x-4">
            {videos.map(video => (
                <VideoCard
                key={video.id}
                video={video}
                onClick={() => navigate(`/watch/${video.id}`)}
                />
            ))}
            </div>
        )}
        </div>
        </div>
    );
};

export default Home;
