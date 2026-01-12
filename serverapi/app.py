from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, timedelta
from functools import wraps
import jwt
from database import db, Video, User, Subscription, VideoLike, VideoDislike, Comment, get_kst_now
import pytz

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

KST = pytz.timezone('Asia/Seoul')

# JWT 설정
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'  # 실제 운영시 환경변수로 관리
app.config['JWT_EXPIRATION_HOURS'] = 24

# SQLite 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "videos.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads/videos')
THUMBNAIL_FOLDER = os.path.join(BASE_DIR, 'uploads/thumbnails')

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}
ALLOWED_IMAGES = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['THUMBNAIL_FOLDER'] = THUMBNAIL_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(THUMBNAIL_FOLDER, exist_ok=True)

# DB 및 마이그레이션 초기화
db.init_app(app)
migrate = Migrate(app, db)

def allowed_file(filename, allowed_set):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_set

BASE_URL = 'http://jcher.iptime.org:8087'

# JWT 토큰 생성 함수
def generate_token(user_id, username):
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=app.config['JWT_EXPIRATION_HOURS']),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

# JWT 토큰 검증 데코레이터
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Authorization 헤더에서 토큰 추출
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # "Bearer <token>" 형식
            except IndexError:
                return jsonify({'error': '잘못된 토큰 형식입니다.'}), 401

        if not token:
            return jsonify({'error': '토큰이 필요합니다.'}), 401

        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(payload['user_id'])
            if not current_user:
                return jsonify({'error': '유효하지 않은 사용자입니다.'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': '토큰이 만료되었습니다. 다시 로그인해주세요.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': '유효하지 않은 토큰입니다.'}), 401

        return f(current_user, *args, **kwargs)

    return decorated

# 선택적 인증 데코레이터 (로그인하지 않아도 접근 가능하지만, 로그인한 경우 사용자 정보 제공)
def optional_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        current_user = None

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
                payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                current_user = User.query.get(payload['user_id'])
            except:
                pass  # 토큰이 유효하지 않아도 계속 진행

        return f(current_user, *args, **kwargs)

    return decorated

def format_date(upload_time):
    """업로드 날짜를 YYYY.MM.DD 형식으로 반환"""
    if upload_time is None:
        return ""

    if isinstance(upload_time, str):
        try:
            upload_time = datetime.fromisoformat(upload_time)
        except:
            return ""

    # upload_time에 타임존 정보가 없으면 KST로 설정
    if upload_time.tzinfo is None:
        upload_time = KST.localize(upload_time)

    return upload_time.strftime('%Y.%m.%d')

@app.route('/api/videos', methods=['GET'])
def get_videos():
    try:
        query = request.args.get('q', '').strip()

        if query:
            videos = Video.query.filter(
                db.or_(
                    Video.title.like(f'%{query}%'),
                    Video.description.like(f'%{query}%'),
                    Video.channel.like(f'%{query}%')
                )
            ).order_by(Video.upload_time.desc()).all()
        else:
            videos = Video.query.order_by(Video.upload_time.desc()).all()

        video_list = []
        for video in videos:
            video_list.append({
                'id': video.id,
                'title': video.title,
                'description': video.description,
                'channel': video.channel,
                'thumbnail': f'{BASE_URL}/api/thumbnails/{video.thumbnail}' if video.thumbnail else None,
                'views': format_views(video.views),
                'uploadTime': format_time(video.upload_time),
                'uploadDate': format_date(video.upload_time),
                'duration': video.duration,
                'likes': video.likes,
                'dislikes': video.dislikes,
                'videoUrl': f'{BASE_URL}/api/videos/{video.id}/stream'
            })

        return jsonify(video_list)
    except Exception as e:
        print(f"Error fetching videos: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<int:video_id>', methods=['GET'])
def get_video(video_id):
    video = Video.query.get_or_404(video_id)
    video.views = (video.views or 0) + 1
    db.session.commit()

    subscriber_count = Subscription.query.filter_by(following_channel=video.channel).count()

    return jsonify({
        'id': video.id,
        'title': video.title,
        'description': video.description,
        'channel': video.channel,
        'thumbnail': f'{BASE_URL}/api/thumbnails/{video.thumbnail}' if video.thumbnail else None,
        'views': format_views(video.views),
        'uploadTime': format_time(video.upload_time),
        'uploadDate': format_date(video.upload_time),
        'duration': video.duration,
        'likes': video.likes,
        'dislikes': video.dislikes,
        'videoUrl': f'{BASE_URL}/api/videos/{video.id}/stream',
        'subscriberCount': subscriber_count
    })

@app.route('/api/videos/<int:video_id>', methods=['DELETE'])
@token_required
def delete_video(current_user, video_id):
    try:
        video = Video.query.get_or_404(video_id)

        # 본인이 업로드한 비디오인지 확인
        if video.channel != current_user.username:
            return jsonify({'error': '본인이 업로드한 동영상만 삭제할 수 있습니다.'}), 403

        # 파일 삭제
        if video.filename:
            video_path = os.path.join(app.config['UPLOAD_FOLDER'], video.filename)
            if os.path.exists(video_path):
                os.remove(video_path)

        if video.thumbnail:
            thumb_path = os.path.join(app.config['THUMBNAIL_FOLDER'], video.thumbnail)
            if os.path.exists(thumb_path):
                os.remove(thumb_path)

        db.session.delete(video)
        db.session.commit()

        return jsonify({'message': 'Video deleted successfully'}), 200

    except Exception as e:
        print(f"Delete Error: {e}")
        return jsonify({'error': 'Failed to delete video', 'details': str(e)}), 500


@app.route('/api/videos/<int:video_id>', methods=['PUT'])
@token_required
def update_video(current_user, video_id):
    try:
        video = Video.query.get_or_404(video_id)

        # 본인이 업로드한 비디오인지 확인
        if video.channel != current_user.username:
            return jsonify({'error': '본인이 업로드한 동영상만 수정할 수 있습니다.'}), 403

        # 새 썸네일 파일이 있는지 확인
        thumbnail_file = request.files.get('thumbnail')
        if thumbnail_file and allowed_file(thumbnail_file.filename, ALLOWED_IMAGES):
            # 기존 썸네일 삭제
            if video.thumbnail:
                old_thumb_path = os.path.join(app.config['THUMBNAIL_FOLDER'], video.thumbnail)
                if os.path.exists(old_thumb_path):
                    os.remove(old_thumb_path)

            # 새 썸네일 저장
            thumbnail_filename = secure_filename(f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{thumbnail_file.filename}")
            thumbnail_path = os.path.join(app.config['THUMBNAIL_FOLDER'], thumbnail_filename)
            thumbnail_file.save(thumbnail_path)
            video.thumbnail = thumbnail_filename

        # 텍스트 정보 업데이트
        if 'title' in request.form:
            video.title = request.form.get('title')
        if 'description' in request.form:
            video.description = request.form.get('description')
        if 'duration' in request.form:
            video.duration = request.form.get('duration')

        db.session.commit()

        return jsonify({
            'message': 'Video updated successfully',
            'video': {
                'id': video.id,
                'title': video.title,
                'description': video.description,
                'thumbnail': f'{BASE_URL}/api/thumbnails/{video.thumbnail}' if video.thumbnail else None,
                'duration': video.duration
            }
        }), 200

    except Exception as e:
        print(f"Update Error: {e}")
        return jsonify({'error': 'Failed to update video', 'details': str(e)}), 500

@app.route('/api/videos/<int:video_id>/stream', methods=['GET'])
def stream_video(video_id):
    video = Video.query.get_or_404(video_id)
    return send_from_directory(app.config['UPLOAD_FOLDER'], video.filename)

@app.route('/api/thumbnails/<filename>', methods=['GET'])
def get_thumbnail(filename):
    return send_from_directory(app.config['THUMBNAIL_FOLDER'], filename)

@app.route('/api/videos/upload', methods=['POST'])
@token_required
def upload_video(current_user):
    if 'video' not in request.files:
        return jsonify({'error': 'No video file'}), 400

    video_file = request.files['video']
    thumbnail_file = request.files.get('thumbnail')

    if video_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(video_file.filename, ALLOWED_EXTENSIONS):
        return jsonify({'error': 'Invalid video format'}), 400

    try:
        video_filename = secure_filename(f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{video_file.filename}")
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
        video_file.save(video_path)

        thumbnail_filename = None
        if thumbnail_file and allowed_file(thumbnail_file.filename, ALLOWED_IMAGES):
            thumbnail_filename = secure_filename(f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{thumbnail_file.filename}")
            thumbnail_path = os.path.join(app.config['THUMBNAIL_FOLDER'], thumbnail_filename)
            thumbnail_file.save(thumbnail_path)

        title = request.form.get('title', 'Untitled Video')
        description = request.form.get('description', '')
        duration = request.form.get('duration', '0:00')

        # 채널명은 현재 로그인한 사용자의 username으로 고정
        channel = current_user.username

        new_video = Video(
            title=title,
            description=description,
            channel=channel,
            filename=video_filename,
            thumbnail=thumbnail_filename,
            duration=duration
        )

        db.session.add(new_video)
        db.session.commit()

        return jsonify({
            'message': 'Video uploaded successfully',
            'video_id': new_video.id
        }), 201

    except Exception as e:
        print(f"Upload Error: {e}")
        return jsonify({'error': 'Upload failed', 'details': str(e)}), 500

@app.route('/api/videos/<int:video_id>/like', methods=['POST'])
@token_required
def like_video(current_user, video_id):
    video = Video.query.get_or_404(video_id)
    liked = VideoLike.query.filter_by(user_id=current_user.id, video_id=video_id).first()

    if liked:
        db.session.delete(liked)
        video.likes = max(0, video.likes - 1)
        status = False
    else:
        # 싫어요가 눌려있으면 제거
        disliked = VideoDislike.query.filter_by(user_id=current_user.id, video_id=video_id).first()
        if disliked:
            db.session.delete(disliked)
            video.dislikes = max(0, video.dislikes - 1)

        new_like = VideoLike(user_id=current_user.id, video_id=video_id)
        db.session.add(new_like)
        video.likes += 1
        status = True

    db.session.commit()
    return jsonify({'likes': video.likes, 'dislikes': video.dislikes, 'isLiked': status})

@app.route('/api/videos/<int:video_id>/dislike', methods=['POST'])
@token_required
def dislike_video(current_user, video_id):
    video = Video.query.get_or_404(video_id)
    disliked = VideoDislike.query.filter_by(user_id=current_user.id, video_id=video_id).first()

    if disliked:
        db.session.delete(disliked)
        video.dislikes = max(0, video.dislikes - 1)
        status = False
    else:
        # 좋아요가 눌려있으면 제거
        liked = VideoLike.query.filter_by(user_id=current_user.id, video_id=video_id).first()
        if liked:
            db.session.delete(liked)
            video.likes = max(0, video.likes - 1)

        new_dislike = VideoDislike(user_id=current_user.id, video_id=video_id)
        db.session.add(new_dislike)
        video.dislikes += 1
        status = True

    db.session.commit()
    return jsonify({'likes': video.likes, 'dislikes': video.dislikes, 'isDisliked': status})

def format_views(views):
    if views is None: return "0"
    if views >= 1000000:
        return f"{views/1000000:.1f}M"
    elif views >= 1000:
        return f"{views/1000:.0f}K"
    return str(views)

def format_time(upload_time):
    if upload_time is None:
        return "Unknown"

    # 현재 한국 시간
    now = datetime.now(KST)

    # upload_time이 문자열인 경우 처리
    if isinstance(upload_time, str):
        try:
            upload_time = datetime.fromisoformat(upload_time)
        except:
            return upload_time

    # upload_time에 타임존 정보가 없으면 KST로 설정
    if upload_time.tzinfo is None:
        upload_time = KST.localize(upload_time)

    diff = now - upload_time
    if diff.days > 365:
        return f"{diff.days // 365}년 전"
    elif diff.days > 30:
        return f"{diff.days // 30}개월 전"
    elif diff.days > 0:
        return f"{diff.days}일 전"
    elif diff.seconds > 3600:
        return f"{diff.seconds // 3600}시간 전"
    elif diff.seconds > 60:
        return f"{diff.seconds // 60}분 전"
    else:
        return "방금 전"



@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json

    # 입력 검증 (생략된 기존 코드와 동일)
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': '아이디와 비밀번호를 입력해주세요.'}), 400

    try:
        existing_user = User.query.filter_by(username=data['username']).first()
        if existing_user:
            return jsonify({'error': '이미 존재하는 아이디입니다.'}), 400

        # 비밀번호 해싱 처리
        hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')

        # 해싱된 비밀번호 저장
        new_user = User(username=data['username'], password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        return jsonify({'message': '회원가입 성공'}), 201
    except Exception as e:
        return jsonify({'error': '회원가입 중 오류가 발생했습니다.'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json

    if not data.get('username') or not data.get('password'):
        return jsonify({'error': '아이디와 비밀번호를 입력해주세요.'}), 400

    # 1. 아이디로 사용자 조회
    user = User.query.filter_by(username=data['username']).first()

    # 2. 사용자가 존재하고 비밀번호 해시가 일치하는지 확인
    if user and check_password_hash(user.password, data['password']):
        token = generate_token(user.id, user.username)
        return jsonify({
            'id': user.id,
            'username': user.username,
            'token': token
        })

    return jsonify({'error': '아이디 또는 비밀번호가 틀렸습니다.'}), 401

@app.route('/api/verify-token', methods=['GET'])
@token_required
def verify_token(current_user):
    """토큰 유효성 검증 엔드포인트"""
    return jsonify({
        'valid': True,
        'user': {
            'id': current_user.id,
            'username': current_user.username
        }
    })

@app.route('/api/subscribe', methods=['POST'])
@token_required
def toggle_subscribe(current_user):
    data = request.json
    channel_name = data.get('channelName')

    if not channel_name:
        return jsonify({'error': '채널명이 필요합니다.'}), 400

    # 자기 자신 구독 방지
    if current_user.username == channel_name:
        return jsonify({'error': '자기 자신은 구독할 수 없습니다.'}), 400

    existing = Subscription.query.filter_by(
        follower_id=current_user.id,
        following_channel=channel_name
    ).first()

    if existing:
        db.session.delete(existing)
        status = False
    else:
        new_sub = Subscription(follower_id=current_user.id, following_channel=channel_name)
        db.session.add(new_sub)
        status = True

    db.session.commit()
    return jsonify({'subscribed': status})

@app.route('/api/subscriptions/<int:user_id>', methods=['GET'])
@token_required
def get_subscriptions(current_user, user_id):
    # 본인의 구독 목록만 조회 가능
    if current_user.id != user_id:
        return jsonify({'error': '본인의 구독 목록만 조회할 수 있습니다.'}), 403

    try:
        subs = Subscription.query.filter_by(follower_id=user_id).all()
        channels = [sub.following_channel for sub in subs]
        return jsonify(channels)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/channels/<channel_name>/subscribers/count', methods=['GET'])
def get_subscriber_count(channel_name):
    count = Subscription.query.filter_by(following_channel=channel_name).count()
    return jsonify({'count': count})

@app.route('/api/videos/<int:video_id>/comments', methods=['GET'])
def get_comments(video_id):
    try:
        comments = Comment.query.filter_by(video_id=video_id).order_by(Comment.created_at.desc()).all()
        comment_list = []
        for c in comments:
            comment_list.append({
                'id': c.id,
                'username': c.username,
                'content': c.content,
                'createdAt': format_time(c.created_at),
                'userId': c.user_id  # 댓글 삭제를 위해 추가
            })
        return jsonify(comment_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<int:video_id>/comments', methods=['POST'])
@token_required
def add_comment(current_user, video_id):
    data = request.json
    content = data.get('content')

    if not content or not content.strip():
        return jsonify({'error': '댓글 내용을 입력해주세요.'}), 400

    try:
        new_comment = Comment(
            video_id=video_id,
            user_id=current_user.id,
            username=current_user.username,
            content=content.strip()
        )
        db.session.add(new_comment)
        db.session.commit()
        return jsonify({
            'message': 'Comment added',
            'comment': {
                'id': new_comment.id,
                'username': new_comment.username,
                'content': new_comment.content,
                'createdAt': format_time(new_comment.created_at),
                'userId': new_comment.user_id
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/comments/<int:comment_id>', methods=['DELETE'])
@token_required
def delete_comment(current_user, comment_id):
    comment = Comment.query.get_or_404(comment_id)

    # 본인의 댓글만 삭제 가능
    if comment.user_id != current_user.id:
        return jsonify({'error': '본인의 댓글만 삭제할 수 있습니다.'}), 403

    db.session.delete(comment)
    db.session.commit()
    return jsonify({'message': 'Deleted'})


# 댓글 수정 엔드포인트 추가 (delete_comment 함수 아래에)
@app.route('/api/comments/<int:comment_id>', methods=['PUT'])
@token_required
def update_comment(current_user, comment_id):
    comment = Comment.query.get_or_404(comment_id)

    # 본인의 댓글만 수정 가능
    if comment.user_id != current_user.id:
        return jsonify({'error': '본인의 댓글만 수정할 수 있습니다.'}), 403

    data = request.json
    content = data.get('content')

    if not content or not content.strip():
        return jsonify({'error': '댓글 내용을 입력해주세요.'}), 400

    comment.content = content.strip()
    db.session.commit()

    return jsonify({
        'message': 'Updated',
        'comment': {
            'id': comment.id,
            'content': comment.content
        }
    })



# 1. 사용자 검색 및 목록 조회
@app.route('/api/users', methods=['GET'])
def search_users():
    try:
        query = request.args.get('q', '').strip()

        if query:
            # 아이디에 검색어가 포함된 사용자 검색
            users = User.query.filter(User.username.like(f'%{query}%')).all()
        else:
            # 검색어가 없으면 전체 사용자 중 최근 가입순(ID 역순)으로 10명만 표시
            users = User.query.order_by(User.id.desc()).limit(10).all()

        user_list = []
        for user in users:
            # 각 사용자의 구독자 수 계산
            sub_count = Subscription.query.filter_by(following_channel=user.username).count()
            user_list.append({
                'id': user.id,
                'username': user.username,
                'subscriberCount': sub_count
            })

        return jsonify(user_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 2. 특정 사용자(채널) 상세 정보 조회
# 4. get_user_profile 함수 수정 (bannerImage 포함)
@app.route('/api/users/<username>', methods=['GET'])
@optional_token
def get_user_profile(current_user, username):
    try:
        user = User.query.filter_by(username=username).first_or_404()

        videos = Video.query.filter_by(channel=username).order_by(Video.upload_time.desc()).all()
        video_list = []
        for v in videos:
            video_list.append({
                'id': v.id,
                'title': v.title,
                'thumbnail': f'{BASE_URL}/api/thumbnails/{v.thumbnail}' if v.thumbnail else None,
                'views': format_views(v.views),
                'uploadTime': format_time(v.upload_time),
                'uploadDate': format_date(v.upload_time),
                'duration': v.duration
            })

        sub_count = Subscription.query.filter_by(following_channel=username).count()

        is_subscribed = False
        if current_user:
            existing = Subscription.query.filter_by(
                follower_id=current_user.id,
                following_channel=username
            ).first()
            is_subscribed = True if existing else False

        return jsonify({
            'id': user.id,
            'username': user.username,
            'subscriberCount': sub_count,
            'isSubscribed': is_subscribed,
            'videos': video_list,
            'profileImage': f'{BASE_URL}/api/profiles/{user.profile_image}' if user.profile_image else None,
            'bannerImage': f'{BASE_URL}/api/banners/{user.banner_image}' if user.banner_image else None,
            'bio': user.bio,
            'videoCount': len(video_list)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# 프로필 폴더 설정 추가 (맨 위 설정 부분에)
PROFILE_FOLDER = os.path.join(BASE_DIR, 'uploads/profiles')
app.config['PROFILE_FOLDER'] = PROFILE_FOLDER
os.makedirs(PROFILE_FOLDER, exist_ok=True)

# 1. 배너 폴더 설정 (PROFILE_FOLDER 설정 부분 근처에 추가)
BANNER_FOLDER = os.path.join(BASE_DIR, 'uploads/banners')
app.config['BANNER_FOLDER'] = BANNER_FOLDER
os.makedirs(BANNER_FOLDER, exist_ok=True)

# 프로필 이미지 제공 엔드포인트 (get_thumbnail 아래에)
@app.route('/api/profiles/<filename>', methods=['GET'])
def get_profile(filename):
    return send_from_directory(app.config['PROFILE_FOLDER'], filename)

# 2. 배너 이미지 제공 엔드포인트 (get_profile 함수 아래에 추가)
@app.route('/api/banners/<filename>', methods=['GET'])
def get_banner(filename):
    return send_from_directory(app.config['BANNER_FOLDER'], filename)


# 3. 프로필 업데이트 엔드포인트 수정 (기존 update_profile 함수를 아래 코드로 교체)
@app.route('/api/profile/update', methods=['PUT'])
@token_required
def update_profile(current_user):
    try:
        profile_file = request.files.get('profileImage')
        banner_file = request.files.get('bannerImage')

        # 프로필 이미지 처리
        if profile_file and allowed_file(profile_file.filename, ALLOWED_IMAGES):
            # 기존 프로필 이미지 삭제
            if current_user.profile_image:
                old_profile_path = os.path.join(app.config['PROFILE_FOLDER'], current_user.profile_image)
                if os.path.exists(old_profile_path):
                    os.remove(old_profile_path)

            # 새 프로필 이미지 저장
            profile_filename = secure_filename(f"profile_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{profile_file.filename}")
            profile_path = os.path.join(app.config['PROFILE_FOLDER'], profile_filename)
            profile_file.save(profile_path)
            current_user.profile_image = profile_filename

        # 배너 이미지 처리
        if banner_file and allowed_file(banner_file.filename, ALLOWED_IMAGES):
            # 기존 배너 이미지 삭제
            if current_user.banner_image:
                old_banner_path = os.path.join(app.config['BANNER_FOLDER'], current_user.banner_image)
                if os.path.exists(old_banner_path):
                    os.remove(old_banner_path)

            # 새 배너 이미지 저장
            banner_filename = secure_filename(f"banner_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{banner_file.filename}")
            banner_path = os.path.join(app.config['BANNER_FOLDER'], banner_filename)
            banner_file.save(banner_path)
            current_user.banner_image = banner_filename

        # bio 업데이트
        if 'bio' in request.form:
            current_user.bio = request.form.get('bio')

        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'profileImage': f'{BASE_URL}/api/profiles/{current_user.profile_image}' if current_user.profile_image else None,
            'bannerImage': f'{BASE_URL}/api/banners/{current_user.banner_image}' if current_user.banner_image else None,
            'bio': current_user.bio
        }), 200

    except Exception as e:
        print(f"Profile Update Error: {e}")
        return jsonify({'error': 'Failed to update profile', 'details': str(e)}), 500

# 비밀번호 변경
@app.route('/api/profile/change-password', methods=['PUT'])
@token_required
def change_password(current_user):
    data = request.json

    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')

    if not current_password or not new_password:
        return jsonify({'error': '현재 비밀번호와 새 비밀번호를 입력해주세요.'}), 400

    # 현재 비밀번호 확인
    if not check_password_hash(current_user.password, current_password):
        return jsonify({'error': '현재 비밀번호가 일치하지 않습니다.'}), 401

    # 새 비밀번호 해싱 및 저장
    current_user.password = generate_password_hash(new_password, method='pbkdf2:sha256')
    db.session.commit()

    return jsonify({'message': '비밀번호가 변경되었습니다.'}), 200


# 회원 탈퇴
@app.route('/api/profile/delete-account', methods=['DELETE'])
@token_required
def delete_account(current_user):
    data = request.json
    password = data.get('password')

    if not password:
        return jsonify({'error': '비밀번호를 입력해주세요.'}), 400

    # 비밀번호 확인
    if not check_password_hash(current_user.password, password):
        return jsonify({'error': '비밀번호가 일치하지 않습니다.'}), 401

    try:
        # 사용자가 업로드한 모든 비디오 삭제
        videos = Video.query.filter_by(channel=current_user.username).all()
        for video in videos:
            # 비디오 파일 삭제
            if video.filename:
                video_path = os.path.join(app.config['UPLOAD_FOLDER'], video.filename)
                if os.path.exists(video_path):
                    os.remove(video_path)

            # 썸네일 삭제
            if video.thumbnail:
                thumb_path = os.path.join(app.config['THUMBNAIL_FOLDER'], video.thumbnail)
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)

            db.session.delete(video)

        # 프로필 이미지 삭제
        if current_user.profile_image:
            profile_path = os.path.join(app.config['PROFILE_FOLDER'], current_user.profile_image)
            if os.path.exists(profile_path):
                os.remove(profile_path)

                        # 배너 이미지 삭제
        if current_user.banner_image:
            banner_path = os.path.join(app.config['BANNER_FOLDER'], current_user.banner_image)
            if os.path.exists(banner_path):
                os.remove(banner_path)

        # 사용자 삭제 (cascade로 연관 데이터 자동 삭제)
        db.session.delete(current_user)
        db.session.commit()

        return jsonify({'message': '회원탈퇴가 완료되었습니다.'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Delete Account Error: {e}")
        return jsonify({'error': '회원탈퇴 중 오류가 발생했습니다.'}), 500





if __name__ == '__main__':
    app.run(debug=True, port=8000)
