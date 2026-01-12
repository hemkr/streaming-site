import { useState, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

// useNavigate, useLocation, VideoPlayerOverlay 등 사용하지 않는 import 제거
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import type { VideoType } from './VideoPlayerOverlay';
// Play, Video 제거
import { Upload, X, Loader2 } from 'lucide-react';
import Header from './Header';
import SideMenu from './SideMenu';
import Channel from './Channel';
import { API_URL, TokenStorage, authFetch, authFetchFormData } from './api';
import Home from './pages/Home';
import WatchPage from './pages/WatchPage';
import UserChannel from './UserChannel';
import SettingsModal from './SettingsModal';

type LikedState = {
  [key: number]: 'like' | 'dislike' | null;
};

// 중요: 여기서 const API_URL = ... 선언을 지워야 import 된 API_URL과 충돌하지 않습니다.

const AppContent = () => {
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [liked, setLiked] = useState<LikedState>({});
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    channel: '',
    duration: ''
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [currentUser, setCurrentUser] = useState<{id: number, username: string} | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [videoStats, setVideoStats] = useState<{[key: number]: {likes: number, dislikes: number}}>({});

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    duration: ''
  });
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  // State 추가
  const [showSettingsModal, setShowSettingsModal] = useState(false);


  // URL 파라미터에서 비디오 ID 확인하고 자동 재생
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('v');

    if (videoId && videos.length > 0) {
      const video = videos.find(v => v.id === parseInt(videoId));
      if (video) {
        handleVideoSelect(video);
      }
    }
  }, [videos]);

  // 로컬 스토리지에서 사용자 정보 및 토큰 복원
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = TokenStorage.getToken();

    if (savedUser && token) {
      try {
        const userData = JSON.parse(savedUser);
        authFetch(`${API_URL}/verify-token`)
        .then(response => {
          if (response.ok) {
            setCurrentUser(userData);
          } else {
            TokenStorage.removeToken();
            localStorage.removeItem('user');
          }
        })
        .catch(() => {
          TokenStorage.removeToken();
          localStorage.removeItem('user');
        });
      } catch (e) {
        console.error("저장된 사용자 정보를 읽는데 실패했습니다.", e);
        localStorage.removeItem('user');
        TokenStorage.removeToken();
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      setUploadForm(prev => ({
        ...prev,
        channel: currentUser.username
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async (query: string = '') => {
    try {
      const url = query
      ? `${API_URL}/videos?q=${encodeURIComponent(query)}`
      : `${API_URL}/videos`;

      const response = await fetch(url);
      const data = await response.json();
      setVideos(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchVideos(searchQuery);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleLogout = () => {
    TokenStorage.removeToken();
    localStorage.removeItem('user');
    setCurrentUser(null);
    setSubscribedChannels([]);
    setShowUserMenu(false);
    setUploadForm(prev => ({ ...prev, channel: '' }));
    alert("로그아웃 되었습니다.");
  };

  const handleLike = async (videoId: number) => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await authFetch(`${API_URL}/videos/${videoId}/like`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await response.json();

      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: data.likes, dislikes: data.dislikes } : v));

      setVideoStats(prev => ({
        ...prev,
        [videoId]: { likes: data.likes, dislikes: data.dislikes }
      }));

      setLiked(prev => ({ ...prev, [videoId]: data.isLiked ? 'like' : null }));
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  const handleDislike = async (videoId: number) => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await authFetch(`${API_URL}/videos/${videoId}/dislike`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await response.json();

      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: data.likes, dislikes: data.dislikes } : v));

      setVideoStats(prev => ({
        ...prev,
        [videoId]: { likes: data.likes, dislikes: data.dislikes }
      }));

      setLiked(prev => ({ ...prev, [videoId]: data.isDisliked ? 'dislike' : null }));

    } catch (error) {
      console.error('Error disliking video:', error);
    }
  };

  const handleDelete = async (video: VideoType) => {
    if (!currentUser) {
      alert("로그인이 필요한 서비스입니다.");
      setShowAuthModal(true);
      return;
    }

    if (video.channel !== currentUser.username) {
      alert("본인이 업로드한 동영상만 삭제할 수 있습니다.");
      return;
    }

    if (!window.confirm("정말로 이 비디오를 삭제하시겠습니까? 복구할 수 없습니다.")) {
      return;
    }

    try {
      const response = await authFetch(`${API_URL}/videos/${video.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert("비디오가 삭제되었습니다.");
        setSelectedVideo(null);

        // 비디오 목록 새로고침
        await fetchVideos(searchQuery);

        // Home으로 이동 (추가)
        navigate('/');
      } else {
        const data = await response.json();
        alert(`삭제 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('서버 오류로 삭제하지 못했습니다.');
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      alert('비디오 파일을 선택해주세요');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('video', videoFile);
    if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('duration', uploadForm.duration || '0:00');

    try {
      const response = await authFetchFormData(`${API_URL}/videos/upload`, formData);

      if (response.ok) {
        alert('업로드 완료!');
        setShowUploadModal(false);
        setUploadForm({ title: '', description: '', channel: currentUser?.username || '', duration: '' });
        setVideoFile(null);
        setThumbnailFile(null);
        fetchVideos();
      } else {
        const errData = await response.json();
        alert(`업로드 실패: ${errData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('서버 연결 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? 'login' : 'signup';
    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await response.json();

      if (response.ok) {
        if (authMode === 'login') {
          TokenStorage.setToken(data.token);

          // 사용자 프로필 정보 가져오기
          const profileResponse = await authFetch(`${API_URL}/users/${data.username}`);
          const profileData = await profileResponse.json();

          const userData = {
            id: data.id,
            username: data.username,
            profileImage: profileData.profileImage || null  // 프로필 이미지 추가
          };

          setCurrentUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));

          setShowAuthModal(false);
          setAuthForm({ username: '', password: '' });
          alert(`환영합니다, ${data.username}님!`);
        } else {
          alert("회원가입 완료! 로그인 해주세요.");
          setAuthMode('login');
          setAuthForm({ username: '', password: '' });
        }
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert("오류 발생");
    }
  };

  const fetchSubscriptions = async () => {
    if (!currentUser) return;
    try {
      const response = await authFetch(`${API_URL}/subscriptions/${currentUser.id}`);
      const data = await response.json();
      setSubscribedChannels(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchSubscriptions();
    } else {
      setSubscribedChannels([]);
    }
  }, [currentUser]);

  const handleSubscribe = async (channelName: string) => {
    if (!currentUser) {
      alert("로그인이 필요한 서비스입니다.");
      setShowAuthModal(true);
      return;
    }

    if (currentUser.username === channelName) {
      alert("자기 자신은 구독할 수 없습니다.");
      return;
    }

    try {
      const response = await authFetch(`${API_URL}/subscribe`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id, channelName })
      });

      if (response.ok) {
        await fetchSubscriptions();

        if (selectedVideo && selectedVideo.channel === channelName) {
          const videoResponse = await fetch(`${API_URL}/videos/${selectedVideo.id}`);
          if (videoResponse.ok) {
            const updatedVideo = await videoResponse.json();
            setSelectedVideo(updatedVideo);
          }
        }
      }
    } catch (error) {
      console.error('Error subscribing:', error);
    }
  };

  const handleVideoSelect = async (video: VideoType) => {
    if (selectedVideo?.id === video.id) {
      // setShowChannelPage(false); // 이 줄 삭제
      return;
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('v', video.id.toString());
      window.history.pushState({}, '', url);

      // setShowChannelPage(false); // 이 줄 삭제

      const response = await fetch(`${API_URL}/videos/${video.id}`);
      if (response.ok) {
        const updatedVideo = await response.json();
        setSelectedVideo(updatedVideo);
        setVideos(prev => prev.map(v => v.id === video.id ? updatedVideo : v));
      } else {
        setSelectedVideo(video);
      }
    } catch (error) {
      console.error('Error updating views:', error);
      setSelectedVideo(video);
      // setShowChannelPage(false); // 이 줄 삭제
    }
  };

  // App.tsx의 handleShare와 copyToClipboard 함수 부분만 수정

  // handleShare 함수 수정
  const handleShare = (video: VideoType) => {
    // WatchPage 경로에 맞게 URL 생성
    const url = `${window.location.origin}/watch/${video.id}`;
    setShareUrl(url);
    setShowShareModal(true);
    setCopySuccess(false);
  };

  // copyToClipboard 함수 수정
  const copyToClipboard = async () => {
    // shareUrl 상태를 직접 사용 (selectedVideo 의존성 제거)
    if (!shareUrl) {
      alert('공유할 URL이 없습니다.');
      return;
    }

    // 1. Clipboard API 사용 (최신 브라우저)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        return;
      } catch (err) {
        console.error('Clipboard API 실패:', err);
      }
    }

    // 2. Fallback 방식 (구형 브라우저 또는 Clipboard API 실패 시)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        throw new Error('execCommand copy 실패');
      }
    } catch (fallbackErr) {
      console.error('Fallback 복사 실패:', fallbackErr);
      alert('복사에 실패했습니다. URL을 수동으로 복사해주세요: ' + shareUrl);
    }
  };


  const handleMyChannel = () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setShowUserMenu(false);
    navigate('/channel'); // setShowChannelPage 대신 navigate 사용
  };

  const handleEditVideo = (video: VideoType) => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      setShowAuthModal(true);
      return;
    }

    if (video.channel !== currentUser.username) {
      alert("본인이 업로드한 동영상만 수정할 수 있습니다.");
      return;
    }

    setEditingVideo(video);
    setEditForm({
      title: video.title,
      description: video.description || '',
      duration: video.duration
    });
    setEditThumbnailFile(null);
    setShowEditModal(true);
  };

  const handleUpdateVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    setUpdating(true);
    const formData = new FormData();

    if (editThumbnailFile) {
      formData.append('thumbnail', editThumbnailFile);
    }
    formData.append('title', editForm.title);
    formData.append('description', editForm.description);
    formData.append('duration', editForm.duration || '0:00');

    try {
      const authHeader = TokenStorage.getAuthHeader();
      const response = await fetch(`${API_URL}/videos/${editingVideo.id}`, {
        method: 'PUT',
        headers: {
          ...authHeader
        },
        body: formData,
      });

      if (response.status === 401) {
        TokenStorage.removeToken();
        localStorage.removeItem('user');
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        window.location.reload();
        return;
      }

      if (response.ok) {
        alert('수정 완료!');
        setShowEditModal(false);
        setEditingVideo(null);
        setEditThumbnailFile(null);

        fetchVideos(searchQuery);

        if (selectedVideo?.id === editingVideo.id) {
          const videoResponse = await fetch(`${API_URL}/videos/${editingVideo.id}`);
          if (videoResponse.ok) {
            const updatedVideo = await videoResponse.json();
            setSelectedVideo(updatedVideo);
          }
        }
      } else {
        const errData = await response.json();
        alert(`수정 실패: ${errData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Error updating video:', error);
      alert('서버 연결 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] text-white overflow-hidden">
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
    setShowSettingsModal={setShowSettingsModal}
    subscribedChannels={subscribedChannels} // SideMenu에 전달하던 것과 동일한 변수
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    resetHome={() => {
      setActiveTab('home');
      setSelectedVideo(null);
      setSearchQuery('');
      fetchVideos('');
    }}
    />

    <div className="flex flex-1 overflow-hidden bg-[#0f0f0f]">
    <SideMenu
    sidebarOpen={sidebarOpen}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    subscribedChannels={subscribedChannels}
    />

    <Routes>
    <Route path="/" element={
      <Home
      videos={videos}
      loading={loading}
      />
    } />

    <Route path="/channel/:username" element={
      <UserChannel currentUser={currentUser} />
    } />

    <Route path="/watch/:id" element={
      <WatchPage
      currentUser={currentUser}
      subscribedChannels={subscribedChannels}
      liked={liked}
      videoStats={videoStats}
      videos={videos}
      handleLike={handleLike}
      handleDislike={handleDislike}
      handleSubscribe={handleSubscribe}
      handleDelete={handleDelete}
      handleShare={handleShare}
      handleEditVideo={handleEditVideo}
      setShowAuthModal={setShowAuthModal}
      // 아래 누락되었던 props들을 추가합니다.
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      handleSearch={handleSearch}
      handleKeyDown={handleKeyDown}
      showUserMenu={showUserMenu}
      setShowUserMenu={setShowUserMenu}
      setShowUploadModal={setShowUploadModal}
      handleLogout={handleLogout}
      handleMyChannel={handleMyChannel}
      setShowSettingsModal={setShowSettingsModal}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      resetHome={() => {
        navigate('/');
        setActiveTab('home');
        setSelectedVideo(null);
        setSearchQuery('');
        fetchVideos('');
      }}
      />
    } />

    {/* Channel 라우트 추가 */}
    <Route path="/channel" element={
      <Channel
      currentUser={currentUser}
      resetHome={() => {
        navigate('/');
        setActiveTab('home');
        setSelectedVideo(null);
        setSearchQuery('');
        fetchVideos('');
      }}
      />
    } />

    </Routes>
    </div>

    {/* 로그인/회원가입 모달 */}
    {showAuthModal && (
      <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
      <div className="p-8 rounded-xl w-full max-w-md relative shadow-2xl" style={{ backgroundColor: '#282828', colorScheme: 'dark' }}>
      <button
      onClick={() => setShowAuthModal(false)}
      style={{ backgroundColor: 'transparent' }}
      className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
      >
      <X size={24} style={{ color: '#9ca3af' }} />
      </button>

      <h2 className="text-2xl font-bold mb-6 text-white" style={{ color: '#ffffff' }}>
      {authMode === 'login' ? '로그인' : '회원가입'}
      </h2>

      <form onSubmit={handleAuth} className="space-y-4">
      <input
      type="text"
      placeholder="아이디"
      style={{ backgroundColor: '#121212', color: '#ffffff', borderColor: '#4b5563' }}
      className="w-full border p-3 rounded focus:outline-none focus:border-blue-500"
      value={authForm.username}
      onChange={e => setAuthForm({...authForm, username: e.target.value})}
      required
      />
      <input
      type="password"
      placeholder="비밀번호"
      style={{ backgroundColor: '#121212', color: '#ffffff', borderColor: '#4b5563' }}
      className="w-full border p-3 rounded focus:outline-none focus:border-blue-500"
      value={authForm.password}
      onChange={e => setAuthForm({...authForm, password: e.target.value})}
      required
      />
      <button
      type="submit"
      className="w-full bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-700 text-white transition-colors"
      style={{ color: '#ffffff' }}
      >
      {authMode === 'login' ? '로그인' : '회원가입'}
      </button>
      </form>

      <p className="mt-4 text-center text-gray-400 text-sm" style={{ color: '#9ca3af' }}>
      {authMode === 'login' ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
      <button
      onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
      className="ml-2 text-blue-400 hover:underline bg-transparent"
      style={{ backgroundColor: 'transparent', border: 'none' }}
      >
      {authMode === 'login' ? '회원가입' : '로그인'}
      </button>
      </p>
      </div>
      </div>
    )}

    {/* 업로드 모달 */}
    {showUploadModal && (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4">
      <div className="bg-[#282828] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
      <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 z-10" style={{ backgroundColor: '#282828', colorScheme: 'dark' }}>
      <h2 className="text-white text-xl font-bold" style={{ color: '#ffffff' }}>
      비디오 업로드
      </h2>
      <button
      onClick={() => !uploading && setShowUploadModal(false)}
      style={{ backgroundColor: 'transparent' }}
      className="text-gray-400 hover:text-white transition-colors p-1"
      >
      <X size={24} style={{ color: '#9ca3af' }} />
      </button>
      </div>

      <form onSubmit={handleUpload} className="p-6 space-y-6">
      {uploading ? (
        <div className="text-center py-10 space-y-4">
        <Loader2 className="animate-spin mx-auto text-blue-500" size={48} />
        <p className="text-white text-lg font-medium">비디오를 업로드하고 처리 중입니다...</p>
        <p className="text-gray-400 text-sm">파일 크기에 따라 시간이 걸릴 수 있습니다. 창을 닫지 마세요.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">비디오 파일 *</label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:bg-gray-800 transition-colors cursor-pointer relative">
        <input
        type="file"
        accept="video/*"
        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        required
        />
        <Upload className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-300">{videoFile ? videoFile.name : '비디오 선택 또는 드래그'}</p>
        </div>
        </div>

        <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">썸네일 이미지</label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:bg-gray-800 transition-colors cursor-pointer relative">
        <input
        type="file"
        accept="image/*"
        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="text-gray-400 text-sm">{thumbnailFile ? thumbnailFile.name : '이미지 선택'}</div>
        </div>
        </div>
        </div>

        <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">제목 *</label>
        <input
        type="text"
        value={uploadForm.title}
        onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
        className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-blue-500"
        placeholder="매력적인 제목을 입력하세요"
        required
        />
        </div>

        <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">설명</label>
        <textarea
        value={uploadForm.description}
        onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
        className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded h-32 focus:outline-none focus:border-blue-500 resize-none"
        placeholder="시청자에게 비디오에 대해 설명해주세요"
        />
        </div>

        <div className="grid grid-cols-2 gap-4">
        <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">채널명</label>
        <input
        type="text"
        value={uploadForm.channel}
        readOnly
        className="w-full bg-[#121212] border border-gray-600 text-gray-400 p-3 rounded cursor-not-allowed"
        placeholder="로그인 후 이용 가능"
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">재생 시간</label>
        <input
        type="text"
        value={uploadForm.duration}
        onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
        placeholder="예: 10:30"
        className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-blue-500"
        />
        </div>
        </div>

        <div className="flex justify-end pt-4">
        <button
        type="submit"
        disabled={uploading}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
        업로드
        </button>
        </div>
        </>
      )}
      </form>
      </div>
      </div>
    )}


    {showSettingsModal && (
      <SettingsModal
      onClose={() => setShowSettingsModal(false)}
      onLogout={handleLogout}
      />
    )}


    {/* 공유 모달 */}
    {showShareModal && (
      <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
      <div className="p-6 rounded-xl w-full max-w-md relative shadow-2xl" style={{ backgroundColor: '#282828', colorScheme: 'dark' }}>
      <button
      onClick={() => setShowShareModal(false)}
      style={{ backgroundColor: 'transparent' }}
      className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
      >
      <X size={24} />
      </button>

      <h2 className="text-2xl font-bold mb-6 text-white">동영상 공유</h2>

      <div className="space-y-4">
      <div className="flex gap-2">
      <input
      type="text"
      value={shareUrl}
      readOnly
      className="flex-1 bg-[#121212] border border-gray-600 text-white p-3 rounded focus:outline-none"
      onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
      onClick={copyToClipboard}
      className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
      {copySuccess ? (
        <>
        <span>✓</span>
        <span>복사됨</span>
        </>
      ) : (
        '복사'
      )}
      </button>
      </div>
      {copySuccess && (
        <p className="text-green-400 text-sm text-center animate-fade-in">
        링크가 클립보드에 복사되었습니다!
        </p>
      )}

      <div className="pt-4 border-t border-gray-700">
      <p className="text-gray-400 text-sm mb-3">소셜 미디어로 공유</p>
      <div className="grid grid-cols-3 gap-3">
      <button
      onClick={() => window.open(`https://www.kakaotalk.com/`, '_blank')}
      className="flex flex-col items-center gap-2 p-3 bg-[#1f1f1f] rounded-lg hover:bg-[#2a2a2a] transition-colors"
      >
      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold">
      K
      </div>
      <span className="text-xs text-gray-300">카카오톡</span>
      </button>

      <button
      onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')}
      className="flex flex-col items-center gap-2 p-3 bg-[#1f1f1f] rounded-lg hover:bg-[#2a2a2a] transition-colors"
      >
      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
      f
      </div>
      <span className="text-xs text-gray-300">Facebook</span>
      </button>

      <button
      onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank')}
      className="flex flex-col items-center gap-2 p-3 bg-[#1f1f1f] rounded-lg hover:bg-[#2a2a2a] transition-colors"
      >
      <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold">
      𝕏
      </div>
      <span className="text-xs text-gray-300">Twitter</span>
      </button>
      </div>
      </div>

      <button
      onClick={() => window.location.href = `mailto:?subject=동영상 공유&body=${encodeURIComponent(shareUrl)}`}
      className="w-full bg-[#1f1f1f] text-white py-3 rounded-lg hover:bg-[#2a2a2a] transition-colors flex items-center justify-center gap-2"
      >
      <span>📧</span>
      <span>이메일로 공유</span>
      </button>
      </div>
      </div>
      </div>
    )}

    {/* 수정 모달 */}
    {showEditModal && editingVideo && (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4">
      <div className="bg-[#282828] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
      <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 z-10" style={{ backgroundColor: '#282828', colorScheme: 'dark' }}>
      <h2 className="text-white text-xl font-bold">비디오 수정</h2>
      <button
      onClick={() => !updating && setShowEditModal(false)}
      style={{ backgroundColor: 'transparent' }}
      className="text-gray-400 hover:text-white transition-colors p-1"
      >
      <X size={24} />
      </button>
      </div>

      <form onSubmit={handleUpdateVideo} className="p-6 space-y-6">
      {updating ? (
        <div className="text-center py-10 space-y-4">
        <Loader2 className="animate-spin mx-auto text-blue-500" size={48} />
        <p className="text-white text-lg font-medium">비디오 정보를 업데이트하는 중입니다...</p>
        </div>
      ) : (
        <>
        <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">썸네일 이미지 변경</label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:bg-gray-800 transition-colors cursor-pointer relative">
        {editingVideo.thumbnail && !editThumbnailFile && (
          <div className="mb-4">
          <img
          src={editingVideo.thumbnail}
          alt="현재 썸네일"
          className="max-h-40 mx-auto rounded"
          />
          <p className="text-xs text-gray-400 mt-2">현재 썸네일</p>
          </div>
        )}
        <input
        type="file"
        accept="image/*"
        onChange={(e) => setEditThumbnailFile(e.target.files?.[0] || null)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-300">
        {editThumbnailFile ? editThumbnailFile.name : '새 이미지 선택 또는 드래그'}
        </p>
        </div>
        </div>

        <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">제목 *</label>
        <input
        type="text"
        value={editForm.title}
        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
        className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-blue-500"
        placeholder="매력적인 제목을 입력하세요"
        required
        />
        </div>

        <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">설명</label>
        <textarea
        value={editForm.description}
        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
        className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded h-32 focus:outline-none focus:border-blue-500 resize-none"
        placeholder="시청자에게 비디오에 대해 설명해주세요"
        />
        </div>

        <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">재생 시간</label>
        <input
        type="text"
        value={editForm.duration}
        onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
        placeholder="예: 10:30"
        className="w-full bg-[#121212] border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-blue-500"
        />
        </div>

        <div className="flex justify-end gap-3 pt-4">
        <button
        type="button"
        onClick={() => setShowEditModal(false)}
        className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition-colors"
        >
        취소
        </button>
        <button
        type="submit"
        disabled={updating}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
        수정 완료
        </button>
        </div>
        </>
      )}
      </form>
      </div>
      </div>
    )}


    </div>
  );
};

const VideoStreamingPlatform = () => {
  return (
    <BrowserRouter>
    <AppContent />
    </BrowserRouter>
  );
}

export default VideoStreamingPlatform;
