from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import pytz

db = SQLAlchemy()

# 한국 시간대 설정
KST = pytz.timezone('Asia/Seoul')

def get_kst_now():
    """현재 한국 시간 반환"""
    return datetime.now(KST)

class Video(db.Model):
    __tablename__ = 'videos'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    channel = db.Column(db.String(100), nullable=False)
    filename = db.Column(db.String(200), nullable=False)
    thumbnail = db.Column(db.String(200))
    views = db.Column(db.Integer, default=0)
    likes = db.Column(db.Integer, default=0)
    dislikes = db.Column(db.Integer, default=0)
    duration = db.Column(db.String(20), default='0:00')
    upload_time = db.Column(db.DateTime, default=get_kst_now)

    comments = db.relationship('Comment', backref='video', lazy=True, cascade='all, delete-orphan')
    likes_rel = db.relationship('VideoLike', backref='video', lazy=True, cascade='all, delete-orphan')
    dislikes_rel = db.relationship('VideoDislike', backref='video', lazy=True, cascade='all, delete-orphan')


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    profile_image = db.Column(db.String(200))
    bio = db.Column(db.Text)
    banner_image = db.Column(db.String(200))

    subscriptions = db.relationship('Subscription', backref='follower', lazy=True, cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='author', lazy=True, cascade='all, delete-orphan')
    liked_videos = db.relationship('VideoLike', backref='user', lazy=True, cascade='all, delete-orphan')
    disliked_videos = db.relationship('VideoDislike', backref='user', lazy=True, cascade='all, delete-orphan')


class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    follower_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    following_channel = db.Column(db.String(100), primary_key=True)


class VideoLike(db.Model):
    __tablename__ = 'video_likes'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.id'), primary_key=True)


class VideoDislike(db.Model):
    __tablename__ = 'video_dislikes'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.id'), primary_key=True)


class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    username = db.Column(db.String(80), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=get_kst_now)
