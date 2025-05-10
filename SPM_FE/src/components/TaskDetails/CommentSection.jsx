
// export default CommentSection;
import React, { useState, useRef, useEffect } from "react";
import "../../assets/css/TaskDetails/CommentSection.css";

// Helper function to generate a unique color based on a string (e.g., username)
const stringToColor = (string) => {
  if (!string) return "#CCCCCC"; // Default color if string is empty
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEEAD",
    "#D4A5A5",
    "#9B59B6",
    "#3498DB",
    "#E74C3C",
    "#2ECC71",
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const CommentSection = ({ showComments, comments }) => {
  const [messages, setMessages] = useState(
    comments.map((comment) => ({
      id: comment.id,
      avatar: comment.author.charAt(0).toUpperCase(),
      username: comment.author,
      timestamp: comment.date,
      text: comment.text,
      replies: comment.replies || [],
      attachment: comment.attachment || null,
    }))
  );
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Adjust textarea height based on content
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [newComment, attachedFile]);

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setAttachedFile(file);
      setTimeout(adjustTextareaHeight, 0);
    }
  };

  const handleSubmit = () => {
    if (!newComment.trim() && !attachedFile) return;

    const newMessage = {
      id: Date.now(),
      avatar: "U",
      username: "Current User",
      timestamp: new Date().toLocaleString("en-US", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      text: newComment,
      attachment: attachedFile
        ? {
            name: attachedFile.name,
            type: attachedFile.type,
            size: attachedFile.size,
            url: URL.createObjectURL(attachedFile),
          }
        : null,
    };

    if (replyingTo) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === replyingTo.id
            ? {
                ...msg,
                replies: [
                  ...(msg.replies || []),
                  {
                    ...newMessage,
                    replyToUsername: replyingTo.username,
                  },
                ],

              }
            : msg
        )
      );
      setReplyingTo(null);
    } else {

      setMessages((prev) => [...prev, { ...newMessage, replies: [] }]);
    }

    setNewComment("");
    setAttachedFile(null);

  };

  const handleCopyComment = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="comments-section">
      <div className="comments-list">

        {messages.map((message) => {
          const avatarColor = stringToColor(message.username);
          return (
            <div key={message.id} className="comment-thread">
              <div className="comment">
                <div
                  className="comment-avatar"
                  style={{ backgroundColor: avatarColor }}
                >
                  {message.avatar}
                </div>
                <div className="comment-content">
                  <div className="comment-header">
                    <div className="comment-info">
                      <span className="author">{message.username}</span>
                      <span className="timestamp">{message.timestamp}</span>
                    </div>
                    <div className="comment-actions">
                      <button
                        className="icon-button"
                        onClick={() =>
                          setReplyingTo({
                            id: message.id,
                            username: message.username,
                          })
                        }
                      >
                        <img src="/assets/icons/reply-icon.svg" alt="Reply" />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => handleCopyComment(message.text)}
                      >
                        <img
                          src="/assets/icons/copy_comment_icon.svg"
                          alt="Copy"
                        />
                      </button>
                    </div>
                  </div>
                  <p className="comment-text">{message.text}</p>
                  {message.attachment && (
                    <div className="comment-attachment">
                      <a
                        href={message.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-link"
                      >
                        <img
                          src={
                            message.attachment.type.includes("image")
                              ? message.attachment.url
                              : "/assets/icons/file.svg"
                          }
                          alt="Attachment"
                          className={
                            message.attachment.type.includes("image")
                              ? "attachment-preview"
                              : "attachment-icon"
                          }
                        />
                        <span className="attachment-name">
                          {message.attachment.name}
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {message.replies && message.replies.length > 0 && (
                <div className="replies-container">
                  {message.replies.map((reply, index) => {
                    const replyAvatarColor = stringToColor(reply.username);
                    return (
                      <div key={index} className="reply-comment">
                        <div
                          className="comment-avatar"
                          style={{ backgroundColor: replyAvatarColor }}
                        >
                          {reply.avatar}
                        </div>
                        <div className="comment-content">
                          <div className="comment-header">
                            <div className="comment-info">
                              <span className="author">{reply.username}</span>
                              <span className="timestamp">
                                {reply.timestamp}
                              </span>
                            </div>
                            <div className="comment-actions">
                              <button
                                className="action-button"
                                onClick={() =>
                                  setReplyingTo({
                                    id: message.id,
                                    username: reply.username,
                                  })
                                }
                              >
                                <img
                                  src="/assets/icons/reply-icon.svg"
                                  alt="Reply"
                                  className="action-icon"
                                />
                              </button>
                              <button
                                className="action-button"
                                onClick={() => handleCopyComment(reply.text)}
                              >
                                <img
                                  src="/assets/icons/copy_comment_icon.svg"
                                  alt="Copy"
                                  className="action-icon"
                                />
                              </button>
                            </div>
                          </div>
                          <p className="comment-text">
                            <span className="reply-to">
                              {reply.replyToUsername}
                            </span>
                            {reply.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="comment-form fixed-to-bottom">
        <div className="comment-input-wrapper">
          {replyingTo && (
            <div className="replying-to">
              Replying to <span>{replyingTo.username}</span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="cancel-reply"
              >
                ✕
              </button>
            </div>
          )}
          {attachedFile && (
            <div className="attached-file-preview">
              <div className="attached-file-info">
                <span className="file-icon">📎</span>
                <span className="file-name">{attachedFile.name}</span>
                <button
                  className="remove-file-btn"
                  onClick={() => setAttachedFile(null)}
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                replyingTo ? "Write a reply..." : "Write something..."
              }
              className="comment-textbox expanded"
              rows="1"
            />
            <div className="action-buttons">
              <button
                type="button"
                onClick={handleFileClick}
                className="attach-btn"
                title="Attach File"
              >
                <img src="/assets/icons/attachment_icon.svg" alt="Attach" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button type="button" onClick={handleSubmit} className="send-btn">
                <img src="/assets/icons/send_icon.svg" alt="Send" />
                <span className="send-btn-fallback">Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CommentSection;
