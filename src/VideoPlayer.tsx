import { memo } from 'react';

interface VideoPlayerProps {
    videoUrl?: string;
}

const VideoPlayer = memo(({ videoUrl }: VideoPlayerProps) => {
    if (!videoUrl) return <div className="w-full h-full bg-black" />;

    return (
        <video
        controls
        autoPlay
        className="w-full h-full"
        src={videoUrl}
        // 재생 시점을 유지하고 싶다면 onTimeUpdate 등을 활용할 수 있지만,
        // 태그 자체가 유지되는 것이 근본 해결책입니다.
        >
        브라우저가 비디오를 지원하지 않습니다.
        </video>
    );
}, (prev, next) => prev.videoUrl === next.videoUrl); // URL이 같으면 절대 리렌더링 안 함

export default VideoPlayer;
