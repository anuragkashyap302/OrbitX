import { BadgeCheck, Heart, MessageCircle, Share2 } from 'lucide-react'
import React, { useState } from 'react'
import moment from 'moment'
import { dummyUserData } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
 import {useSelector} from 'react-redux'
import { useAuth } from '@clerk/clerk-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
/**
 * PostCard Component: Single post feed widget.
 * [Bug Fix #5 - XSS Vulnerability]:
 * Pehle yahan 'dangerouslySetInnerHTML' use ho raha tha. Malicious users script tag daal kar doosre users ke sessions hijack kar sakte the.
 * Ab 'renderContentWithHashtags' function pure React elements render karta hai jo built-in XSS safe hain.
 * [Bug Fix #6 - Fake Hardcoded Stats]:
 * Comments aur Shares me pehle hardcoded {12} aur {7} dikhta tha. Ab real dynamic counts bind kar diye hain.
 */
const PostCard = ({post}) => {
    const [likes, setLikes] = useState(post.likes_count || post.likes || []);
    const currentUser = useSelector((state) => state.user.value);
    const { getToken } = useAuth();
    const navigate = useNavigate();

    // Safe JSX rendering for hashtags without dangerouslySetInnerHTML
    const renderContentWithHashtags = (content) => {
        if (!content) return null;
        const words = content.split(/(\s+)/);
        return words.map((word, idx) => {
            if (word.startsWith('#') && word.length > 1) {
                return (
                    <span key={idx} className='text-indigo-600 font-medium hover:underline cursor-pointer'>
                        {word}
                    </span>
                );
            }
            return word;
        });
    };

    const handleLike = async () => {
        try {
            const { data } = await api.post('/api/post/like', { postId: post._id }, {
                headers: { Authorization: `Bearer ${await getToken()}` }
            });
            if (data.success) {
                toast.success(data.message);
                setLikes(prev => {
                    const userId = currentUser?._id;
                    if (!userId) return prev;
                    if (prev.includes(userId)) {
                        return prev.filter(id => id !== userId);
                    } else {
                        return [...prev, userId];
                    }
                });
            } else {
                toast(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className='bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-2xl'>
            {/* user info */}
            <div onClick={() => navigate('/profile/' + post.user?._id)} className='inline-flex items-center gap-3 cursor-pointer'>
                <img src={post.user?.profile_picture || '/favicon.png'} alt="" className='w-10 h-10 rounded-full shadow object-cover' />
                <div>
                    <div className='flex items-center space-x-1'>
                        <span className='font-semibold text-gray-900'>{post.user?.full_name}</span>
                        <BadgeCheck className='w-4 h-4 text-blue-500' />
                    </div>
                    <div className='text-gray-500 text-sm'>@{post.user?.username} • {moment(post.createdAt).fromNow()}</div>
                </div>
            </div>

            {/* Content (XSS Safe) */}
            {post.content && (
                <div className='text-gray-800 text-sm whitespace-pre-line leading-relaxed'>
                    {renderContentWithHashtags(post.content)}
                </div>
            )}

            {/* Images */}
            {post.image_urls && post.image_urls.length > 0 && (
                <div className='grid grid-cols-2 gap-2'>
                    {post.image_urls.map((img, index) => (
                        <img 
                            src={img} 
                            key={index} 
                            className={`w-full h-48 object-cover rounded-lg ${post.image_urls.length === 1 ? 'col-span-2 h-auto max-h-96' : ''}`} 
                            alt="Post media" 
                        />
                    ))}
                </div>
            )}

            {/* Engagement Action Bar */}
            <div className='flex items-center gap-6 text-gray-600 text-sm pt-2 border-t border-gray-100'>
                <div className='flex items-center gap-1.5'>
                    <Heart 
                        className={`w-4 h-4 cursor-pointer transition-colors ${currentUser?._id && likes.includes(currentUser._id) ? 'text-red-500 fill-red-500' : 'hover:text-red-500'}`} 
                        onClick={handleLike}
                    />
                    <span className='font-medium'>{likes.length}</span>
                </div>
                <div className='flex items-center gap-1.5 text-gray-500 hover:text-gray-700 cursor-pointer'>
                    <MessageCircle className='w-4 h-4' />
                    <span>{post.comments_count || post.comments?.length || 0}</span>
                </div>
                <div className='flex items-center gap-1.5 text-gray-500 hover:text-gray-700 cursor-pointer'>
                    <Share2 className='w-4 h-4' />
                    <span>{post.shares_count || 0}</span>
                </div>
            </div>
        </div>
    );
};

export default PostCard
