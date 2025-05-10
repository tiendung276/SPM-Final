import React, { useState } from 'react';
import '../../assets/css/SidebarRight.css';

const Comment = ({ comment, onReply }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText);
      setReplyText('');
      setShowReplyForm(false);
    }
  };

  return (
    <div className="comment-item">
      <div className="comment-header">
        <strong>{comment.author}</strong>
        <span>({comment.date})</span>
      </div>
      <div className="comment-content">
        <p>{comment.text}</p>
        <div className="comment-actions">
          <button className="reply-btn" onClick={() => setShowReplyForm(!showReplyForm)}>
            <img src="/assets/icons/reply.svg" alt="Reply" />
            Reply
          </button>
        </div>
      </div>

      {showReplyForm && (
        <div className="comment-input-wrapper reply-input-wrapper">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleReply()}
            placeholder="Write a reply..."
            className="comment-textbox expanded"
            autoFocus
          />
          <button className="send-btn" onClick={handleReply} title="Send">
            <img src="/assets/icons/send.svg" alt="Send" />
          </button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply, index) => (
            <div key={index} className="comment-item">
              <div className="comment-header">
                <strong>{reply.author}</strong>
                <span>({reply.date})</span>
              </div>
              <div className="comment-content">
                <p>{reply.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SidebarRight = ({ showComments, setShowComments, comments = [] }) => {
  const [newComment, setNewComment] = useState('');
  const [commentsList, setCommentsList] = useState(comments);

  const toggleComments = () => setShowComments(prev => !prev);

  const handleAddComment = () => {
    if (newComment.trim()) {
      const newCommentData = {
        id: Date.now(),
        author: 'Current User',
        text: newComment,
        date: new Date().toLocaleString(),
        replies: []
      };
      const updatedComments = [...commentsList, newCommentData];
      setCommentsList(updatedComments);
      setNewComment('');
    }
  };

  const handleReply = (commentId, replyText) => {
    const reply = {
      id: Date.now(),
      author: 'Current User',
      text: replyText,
      date: new Date().toLocaleString()
    };

    const updatedComments = commentsList.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), reply]
        };
      }
      return comment;
    });

    setCommentsList(updatedComments);
  };

  return (
    <div className="sidebar-right-container">
      <div className="sidebar-right">
        <div className="sidebar-content">
          {showComments && commentsList.length > 0 && (
            <div className="comments-section">
              {commentsList.map((comment, index) => (
                <Comment
                  key={comment.id || index}
                  comment={comment}
                  onReply={handleReply}
                />
              ))}
            </div>
          )}
          {showComments && commentsList.length === 0 && <p>No comments available</p>}
        </div>
        {showComments && (
          <div className="add-comment-section fixed-to-bottom">
            <div className="comment-input-wrapper">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                className="comment-textbox expanded"
              />
              <button className="send-btn" onClick={handleAddComment} title="Send">
                <img src="/assets/icons/send.svg" alt="Send" />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="sidebar-buttons-fixed">
        <div className="button-wrapper" onClick={toggleComments}>
          <button className="comment-btn">
            <span>
              <img
                src="/assets/icons/comment_icon.svg"
                alt="Comments"
                className="button-icon"
              />
            </span>
            {showComments ? "Comments" : "Comments"}
          </button>
        </div>
        <div className="button-wrapper">
          <button className="ai-btn">
            <span>
              <img
                src="/assets/icons/ai.svg"
                alt="Create AI"
                className="button-icon"
              />
            </span>
            Create AI
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarRight;
