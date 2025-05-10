import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import '../../assets/css/AIChat.css';
import { sendChatMessage, getChatSessions, getChatSession, updateChatSession, deleteChatSession } from '../../api/ProjectApi';

const AIChat = ({ onClose, projectId, logoUrl = '/assets/icons/ai_icon.svg', searchIconUrl = '/assets/icons/search_icon.svg', homeIconUrl = '/assets/icons/home_icon.svg' }) => {
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const messagesEndRef = useRef(null);

    // States cho more actions popup
    const [showActionsPopup, setShowActionsPopup] = useState(false);
    const [activePopupChatId, setActivePopupChatId] = useState(null);
    const [showRenameForm, setShowRenameForm] = useState(false);
    const [newChatName, setNewChatName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Hàm xử lý hiển thị popup
    const toggleActionsPopup = (e, chatId) => {
        e.stopPropagation(); // Ngăn chặn sự kiện click lan ra chat item
        if (activePopupChatId === chatId) {
            setShowActionsPopup(false);
            setActivePopupChatId(null);
        } else {
            setShowActionsPopup(true);
            setActivePopupChatId(chatId);
            setShowRenameForm(false);
            setShowDeleteConfirm(false);
        }
    };

    // Hàm xử lý hiển thị form đổi tên
    const showRenameFormHandler = (e) => {
        e.stopPropagation();
        const chat = chatHistory.find(c => c.id === activePopupChatId);
        if (chat) {
            setNewChatName(chat.title);
        }
        setShowRenameForm(true);
        setShowDeleteConfirm(false);
    };

    // Hàm xử lý đổi tên chat
    const handleRenameChat = async (e) => {
        e.stopPropagation();
        if (newChatName.trim() && activePopupChatId) {
            try {
                // Gọi API cập nhật tên phiên chat
                await updateChatSession(activePopupChatId, newChatName.trim());
                console.log(`Đã cập nhật tên phiên chat ${activePopupChatId} thành: ${newChatName.trim()}`);

                // Cập nhật UI sau khi đổi tên thành công
                setChatHistory(prev => prev.map(chat =>
                    chat.id === activePopupChatId
                        ? { ...chat, title: newChatName.trim() }
                        : chat
                ));

                // Đóng form đổi tên
                setShowRenameForm(false);
                setShowActionsPopup(false);
            } catch (error) {
                console.error("Lỗi khi đổi tên phiên chat:", error);
                alert(`Không thể đổi tên phiên chat: ${error.message}`);
            }
        }
    };

    // Hàm xử lý hiển thị xác nhận xóa
    const showDeleteConfirmHandler = (e) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
        setShowRenameForm(false);
    };

    // Hàm xử lý xóa chat
    const handleDeleteChat = async (e) => {
        e.stopPropagation();
        if (activePopupChatId) {
            try {
                // Gọi API xóa phiên chat
                await deleteChatSession(activePopupChatId);
                console.log(`Đã xóa phiên chat ${activePopupChatId}`);

                // Cập nhật UI sau khi xóa thành công
                setChatHistory(prev => prev.filter(chat => chat.id !== activePopupChatId));

                // Nếu đang xóa chat đang active, reset về trạng thái ban đầu
                if (activePopupChatId === sessionId) {
                    setSessionId(null);
                    setActiveChat(null);
                    setMessages([]);
                }

                // Xóa khỏi localStorage
                localStorage.removeItem(`messages_${activePopupChatId}`);

                // Đóng form xác nhận xóa
                setShowDeleteConfirm(false);
                setShowActionsPopup(false);
            } catch (error) {
                console.error("Lỗi khi xóa phiên chat:", error);
                alert(`Không thể xóa phiên chat: ${error.message}`);
            }
        }
    };

    // Đóng popup khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = () => {
            setShowActionsPopup(false);
            setShowRenameForm(false);
            setShowDeleteConfirm(false);
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Fetch chat sessions when component mounts
    useEffect(() => {
        const fetchChatSessions = async () => {
            try {
                const sessions = await getChatSessions();
                console.log('Fetched sessions:', sessions);
                if (sessions && Array.isArray(sessions)) {
                    // Xử lý loại bỏ trùng lặp theo ID
                    const uniqueSessions = [];
                    const sessionIds = new Set();

                    sessions.forEach(session => {
                        const id = session.id || session.session_id;
                        if (id && !sessionIds.has(id)) {
                            sessionIds.add(id);

                            // Lấy title từ tin nhắn đầu tiên nếu có thể
                            let title = session.title || session.app_name || 'Untitled Chat';

                            // Không cho phép title là "spm"
                            if (title.toLowerCase() === "spm") {
                                // Kiểm tra nếu có messages, lấy từ message đầu tiên
                                if (session.events && Array.isArray(session.events) && session.events.length > 0) {
                                    const firstUserMessage = session.events.find(evt =>
                                        (evt.role === 'user') ||
                                        (evt.content && evt.content.role === 'user')
                                    );

                                    if (firstUserMessage) {
                                        const messageText = firstUserMessage.content?.parts?.[0]?.text ||
                                            firstUserMessage.text ||
                                            firstUserMessage.content ||
                                            'New Chat';

                                        const words = messageText.trim().split(/\s+/);
                                        const maxWords = Math.min(words.length, 4);
                                        title = words.slice(0, maxWords).join(' ');
                                    }
                                }
                            }

                            // Xử lý date hợp lệ
                            let formattedDate;
                            try {
                                // Thử chuyển đổi timestamp hoặc date string
                                const timestamp = session.last_update_time || session.created_at;
                                if (timestamp) {
                                    // Nếu là timestamp (số), nhân với 1000 để chuyển từ giây sang millisecond
                                    const date = typeof timestamp === 'number'
                                        ? new Date(timestamp * 1000)
                                        : new Date(timestamp);

                                    if (!isNaN(date.getTime())) {
                                        formattedDate = date.toLocaleDateString();
                                    } else {
                                        formattedDate = new Date().toLocaleDateString();
                                    }
                                } else {
                                    formattedDate = new Date().toLocaleDateString();
                                }
                            } catch (error) {
                                console.error('Error formatting date in session:', error);
                                formattedDate = new Date().toLocaleDateString();
                            }

                            uniqueSessions.push({
                                id: id,
                                title: title,
                                date: formattedDate
                            });
                        }
                    });

                    console.log('Formatted history:', uniqueSessions);
                    setChatHistory(uniqueSessions);
                }
            } catch (error) {
                console.error('Error fetching chat sessions:', error);
            }
        };

        fetchChatSessions();
    }, []);

    // Load chat history from localStorage when component mounts
    useEffect(() => {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            setChatHistory(JSON.parse(savedHistory));
        }

        const savedMessages = localStorage.getItem('currentMessages');
        if (savedMessages) {
            setMessages(JSON.parse(savedMessages));
        }

        const savedSessionId = localStorage.getItem('currentSessionId');
        if (savedSessionId) {
            setSessionId(savedSessionId);
            setActiveChat(savedSessionId);
        }
    }, []);

    // Save chat history to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }, [chatHistory]);

    // Save current messages to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('currentMessages', JSON.stringify(messages));
    }, [messages]);

    // Save current session ID to localStorage whenever it changes 
    useEffect(() => {
        if (sessionId) {
            localStorage.setItem('currentSessionId', sessionId);
        }
    }, [sessionId]);

    // Save messages for current session whenever they change
    useEffect(() => {
        if (sessionId) {
            localStorage.setItem(`messages_${sessionId}`, JSON.stringify(messages));
        }
    }, [messages, sessionId]);

    // Tự động cuộn xuống khi có tin nhắn mới
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Xử lý gửi tin nhắn
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        // Bắt buộc phải có projectId
        if (!projectId) {
            const errorMessage = {
                isUser: false,
                text: "Không thể gửi tin nhắn. Vui lòng chọn một dự án trước khi bắt đầu cuộc trò chuyện."
            };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
            return;
        }

        const userMessage = {
            isUser: true,
            text: inputMessage
        };
        setMessages(prevMessages => [...prevMessages, userMessage]);

        // Làm mới ô input tin nhắn ngay lập tức sau khi gửi
        const messageSent = inputMessage;
        setInputMessage('');

        try {
            // Đảm bảo luôn gửi projectId
            const response = await sendChatMessage(messageSent, sessionId, projectId);
            console.log('Chat API response:', response);

            // Tạo session mới nếu cần
            if (response.session_id && !sessionId) {
                setSessionId(response.session_id);
                setActiveChat(response.session_id);

                // Tạo title từ tin nhắn đầu tiên theo quy tắc mới
                const words = messageSent.trim().split(/\s+/);
                const maxWords = Math.min(words.length, 4); // Lấy tối đa 4 từ hoặc ít hơn nếu câu không đủ 4 từ
                const title = words.slice(0, maxWords).join(' ');

                // Thêm chat mới vào history với định dạng ngày hợp lệ
                addNewChatToHistory(response.session_id, title);
            }

            // Thêm phản hồi từ AI
            const aiMessage = {
                isUser: false,
                text: response.response || response.message || "No response received"
            };
            setMessages(prevMessages => [...prevMessages, aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                isUser: false,
                text: error.message || "Lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau."
            };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
        }
    };

    // Thêm notification ở đầu component
    useEffect(() => {
        // Hiển thị thông báo nếu không có projectId
        if (!projectId) {
            const notification = {
                isUser: false,
                text: "Lưu ý: Bạn cần phải chọn dự án để có thể sử dụng chức năng chat với AI."
            };
            setMessages([notification]);
        }
    }, [projectId]);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Lọc danh sách hiển thị dựa trên searchQuery
    const filteredChatHistory = chatHistory.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Nhóm các chat theo ngày
    const groupChatsByDate = () => {
        const groups = {};

        // Sắp xếp danh sách chat theo ngày, mới nhất lên đầu
        const sortedChats = [...filteredChatHistory].sort((a, b) => {
            // Chuyển đổi chuỗi ngày thành đối tượng Date
            let dateA, dateB;
            try {
                // Thử chuyển đổi từ định dạng chuỗi ngày tháng
                dateA = new Date(a.date);
                dateB = new Date(b.date);

                // Kiểm tra nếu là Invalid Date
                if (isNaN(dateA.getTime())) {
                    console.log('Invalid date A:', a.date);
                    dateA = new Date(); // Dùng ngày hiện tại nếu không hợp lệ
                }
                if (isNaN(dateB.getTime())) {
                    console.log('Invalid date B:', b.date);
                    dateB = new Date(); // Dùng ngày hiện tại nếu không hợp lệ
                }
            } catch (error) {
                console.error('Error parsing date:', error);
                dateA = new Date();
                dateB = new Date();
            }

            return dateB.getTime() - dateA.getTime();
        });

        // Nhóm các chat theo ngày
        sortedChats.forEach(chat => {
            // Xử lý ngày hợp lệ
            let dateKey;
            try {
                const chatDate = new Date(chat.date);
                if (!isNaN(chatDate.getTime())) {
                    // Nếu ngày hợp lệ, dùng làm key
                    dateKey = chatDate.toLocaleDateString();
                } else {
                    // Nếu ngày không hợp lệ, dùng ngày hiện tại
                    console.log('Invalid chat date:', chat.date);
                    dateKey = new Date().toLocaleDateString();
                }
            } catch (error) {
                console.error('Error with date grouping:', error);
                dateKey = new Date().toLocaleDateString();
            }

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(chat);
        });

        return groups;
    };

    // Tạo danh sách được nhóm
    const groupedChats = groupChatsByDate();

    // Hàm định dạng ngày thành "Hôm nay", "Hôm qua" hoặc ngày cụ thể
    const formatDateLabel = (dateStr) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        let chatDate;
        try {
            chatDate = new Date(dateStr);
            if (isNaN(chatDate.getTime())) {
                console.error('Invalid date in formatDateLabel:', dateStr);
                return "Cuộc trò chuyện";
            }
            chatDate.setHours(0, 0, 0, 0);
        } catch (error) {
            console.error('Error formatting date label:', error);
            return "Cuộc trò chuyện";
        }

        try {
            // So sánh thời gian dưới dạng timestamp để đảm bảo so sánh chính xác
            if (chatDate.getTime() === today.getTime()) {
                return "Hôm nay";
            } else if (chatDate.getTime() === yesterday.getTime()) {
                return "Hôm qua";
            } else if (chatDate >= lastWeek) {
                // Tính số ngày giữa hai ngày
                const diffTime = Math.abs(today.getTime() - chatDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return `${diffDays} ngày trước đó`;
            } else {
                // Định dạng ngày tháng năm
                return chatDate.toLocaleDateString('vi-VN', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric'
                });
            }
        } catch (error) {
            console.error('Error in date comparison:', error);
            return "Cuộc trò chuyện";
        }
    };

    const selectChat = async (chatId) => {
        setActiveChat(chatId);
        setSessionId(chatId);

        try {
            // Lấy chi tiết session và messages từ API
            const sessionData = await getChatSession(chatId);
            console.log('Session data:', sessionData);

            if (sessionData && sessionData.events && Array.isArray(sessionData.events)) {
                // Chuyển đổi events thành định dạng messages
                const formattedMessages = sessionData.events.map(event => {
                    // Kiểm tra cấu trúc của event để trích xuất đúng dữ liệu
                    if (event.content && event.content.role) {
                        // Định dạng cũ
                        return {
                            isUser: event.content.role === 'user',
                            text: event.content.parts[0].text
                        };
                    } else {
                        // Định dạng mới
                        return {
                            isUser: event.role === 'user',
                            text: event.content || "No content"
                        };
                    }
                });

                setMessages(formattedMessages);
                console.log('Formatted messages:', formattedMessages);

                // Cập nhật title nếu chưa có
                if (formattedMessages.length > 0) {
                    const firstUserMessage = formattedMessages.find(msg => msg.isUser);
                    if (firstUserMessage) {
                        const currentChat = chatHistory.find(chat => chat.id === chatId);
                        if (currentChat && (currentChat.title === 'Untitled Chat' || !currentChat.title)) {
                            const words = firstUserMessage.text.trim().split(/\s+/);
                            const maxWords = Math.min(words.length, 4);
                            const newTitle = words.slice(0, maxWords).join(' ');

                            // Cập nhật title trong chatHistory
                            setChatHistory(prev => prev.map(chat =>
                                chat.id === chatId
                                    ? { ...chat, title: newTitle }
                                    : chat
                            ));
                        }
                    }
                }
            } else {
                setMessages([]); // Reset messages nếu không có data
                console.warn('No events data found in session:', sessionData);
            }
        } catch (error) {
            console.error('Error loading session messages:', error);
            setMessages([]); // Reset messages nếu có lỗi
        }
    };

    // Hàm tạo chat mới
    const startNewChat = () => {
        // Reset trạng thái hiện tại
        setSessionId(null);
        setActiveChat(null);
        setMessages([]);
        setInputMessage('');

        // Đóng tất cả popup nếu đang mở
        setShowActionsPopup(false);
        setShowRenameForm(false);
        setShowDeleteConfirm(false);
    };

    // Hàm thêm chat mới vào history với kiểm tra ngày hợp lệ
    const addNewChatToHistory = (sessionId, title) => {
        const today = new Date();
        const formattedDate = today.toLocaleDateString();

        const newChat = {
            id: sessionId,
            title: title,
            date: formattedDate // Luôn sử dụng định dạng ngày hợp lệ
        };

        // Kiểm tra xem session này đã tồn tại chưa
        const sessionExists = chatHistory.some(chat => chat.id === sessionId);

        if (!sessionExists) {
            setChatHistory(prev => {
                // Lọc thêm một lần nữa để đảm bảo không có trùng lặp
                const filtered = prev.filter(chat => chat.id !== sessionId);
                return [newChat, ...filtered];
            });
        }
    };

    return (
        <div className="ai-chat-container">
            {/* Left sidebar - Chat history */}
            <div className="chat-sidebar">
                <div className="chat-header">
                    <div
                        className="logo-container"
                        onClick={startNewChat}
                        style={{ cursor: 'pointer' }}
                        title="Tạo cuộc trò chuyện mới"
                    >
                        <img src={logoUrl} alt="AI Logo" className="ai-logo-img ai-logo-colored" />
                    </div>
                    <div className="search-input-wrapper">
                        <img src={searchIconUrl} alt="Search" className="search-icon-img" />
                        <input
                            type="text"
                            className="chat-search-input"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                    </div>
                </div>

                {/* Chat history list */}
                <div className="chat-list">
                    {Object.entries(groupedChats).map(([date, chats]) => (
                        <div key={date} className="chat-group">
                            <div className="chat-group-header">
                                <span>{formatDateLabel(date)}</span>
                            </div>
                            {chats.map(chat => (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${activeChat === chat.id ? 'active' : ''}`}
                                    onClick={() => selectChat(chat.id)}
                                >
                                    <div className="chat-item-title">{chat.title}</div>
                                    <div className="chat-more" onClick={(e) => toggleActionsPopup(e, chat.id)}>
                                        <span>⋮</span>
                                    </div>

                                    {/* Hiển thị popup nếu chat này đang được chọn để hiện popup */}
                                    {showActionsPopup && activePopupChatId === chat.id && (
                                        <div className="actions-popup" onClick={(e) => e.stopPropagation()}>
                                            <div className="actions-popup-content">
                                                <button className="action-btn rename-btn" onClick={(e) => showRenameFormHandler(e)}>
                                                    Đổi tên
                                                </button>
                                                <button className="action-btn delete-btn" onClick={(e) => showDeleteConfirmHandler(e)}>
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Form đổi tên */}
                                    {showRenameForm && activePopupChatId === chat.id && (
                                        <div className="rename-form" onClick={(e) => e.stopPropagation()}>
                                            <div className="rename-form-content">
                                                <input
                                                    type="text"
                                                    value={newChatName}
                                                    onChange={(e) => setNewChatName(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="rename-actions">
                                                    <button className="action-btn save-btn" onClick={(e) => handleRenameChat(e)}>
                                                        Lưu
                                                    </button>
                                                    <button className="action-btn cancel-btn" onClick={(e) => toggleActionsPopup(e, chat.id)}>
                                                        Hủy
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Xác nhận xóa */}
                                    {showDeleteConfirm && activePopupChatId === chat.id && (
                                        <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
                                            <div className="delete-confirm-content">
                                                <p>Bạn có chắc chắn muốn xóa cuộc trò chuyện này?</p>
                                                <div className="delete-actions">
                                                    <button className="action-btn delete-yes-btn" onClick={(e) => handleDeleteChat(e)}>
                                                        Có
                                                    </button>
                                                    <button className="action-btn delete-no-btn" onClick={(e) => toggleActionsPopup(e, chat.id)}>
                                                        Không
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right side - Chat content */}
            <div className="chat-content">
                <div className="ai-assistant-header">
                    <div className="ai-header-left">
                        <img src={homeIconUrl} alt="Home" className="home-icon" />
                    </div>
                    <div className="ai-title">
                        <img src={logoUrl} alt="AI Logo" className="ai-logo-img ai-logo-colored" />
                        <span>AI assistant</span>
                    </div>
                    <div className="ai-header-right">
                        <button className="close-button" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div className="messages-container">
                    {messages.map((message, index) => (
                        <div key={index} className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}>
                            {!message.isUser && (
                                <div className="avatar-wrapper">
                                    <img src={logoUrl} alt="AI" className="ai-avatar-img ai-logo-colored" />
                                </div>
                            )}
                            <div className="message-content">
                                {message.isUser ? (
                                    message.text
                                ) : (
                                    <div className="markdown-content">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeRaw]}
                                            components={{
                                                a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />
                                            }}
                                        >
                                            {message.text}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-container">
                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder="Write something..."
                            className="input-field"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                        />
                        <div className="input-actions">
                            <button className="send-button" onClick={handleSendMessage}>
                                <img src="/assets/icons/send_icon.svg" alt="Send" className="send-icon" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
