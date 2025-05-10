import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../assets/css/CyclesLayout.css';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createCycle, getProjectCycles, getProjectDetail, updateCycle, deleteCycle, getTasksInCycle } from '../../api/ProjectApi';
import AIChat from '../AIChatPage/AIChat';
import config from '../../config/config';

const { API_BASE_URL } = config;

// Component hiển thị chi tiết của một Cycle và các task trong đó
const CycleDetail = ({ projectId, cycle, onBack }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [taskMenuPosition, setTaskMenuPosition] = useState({ top: 0, left: 0 });
    const [showTaskMenu, setShowTaskMenu] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [editTaskData, setEditTaskData] = useState({
        taskName: '',
        description: '',
        status: 'DONE',
        assignee: 'No assignees',
        priority: 'Critical',
        tag: 'NO TAG',
        startDate: '',
        endDate: ''
    });
    const taskMenuRef = useRef(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                setLoading(true);
                const tasksData = await getTasksInCycle(projectId, cycle.cycle_id);

                // Lấy thông tin assignees cho mỗi task
                const tasksWithAssignees = await Promise.all(
                    tasksData.map(async (task) => {
                        try {
                            // Gọi API lấy danh sách assignees cho task
                            const response = await fetch(
                                `${API_BASE_URL}/projects/${projectId}/tasks/${task.task_id}/assignees`,
                                {
                                    headers: {
                                        authentication: localStorage.getItem('access_token') || sessionStorage.getItem('access_token'),
                                        accept: "application/json"
                                    }
                                }
                            );

                            if (response.ok) {
                                const assigneesData = await response.json();
                                // Kiểm tra cấu trúc dữ liệu
                                const assignees = Array.isArray(assigneesData) ? assigneesData : [];
                                console.log(`Assignees cho task ${task.task_id}:`, assignees);

                                // Trả về task với thông tin assignees đã được cập nhật
                                return {
                                    ...task,
                                    assignees: assignees
                                };
                            } else {
                                console.warn(`Không thể lấy assignees cho task ${task.task_id}`);
                                return task;
                            }
                        } catch (error) {
                            console.error(`Lỗi khi lấy assignees cho task ${task.task_id}:`, error);
                            return task;
                        }
                    })
                );

                setTasks(tasksWithAssignees || []);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách task:', error);
            } finally {
                setLoading(false);
            }
        };

        if (cycle?.cycle_id) {
            fetchTasks();
        }
    }, [projectId, cycle]);

    useEffect(() => {
        const fetchProjectMembers = async () => {
            try {
                const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

                if (!accessToken) {
                    console.error('Không tìm thấy token xác thực');
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/projects/${projectId}/users`, {
                    headers: {
                        'authentication': accessToken,
                        'accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Lỗi khi lấy danh sách thành viên: ${response.status} ${response.statusText}`);
                }

                const members = await response.json();
                console.log('Danh sách thành viên dự án:', members);
                setProjectMembers(members);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách thành viên dự án:', error);
            }
        };

        if (projectId) {
            fetchProjectMembers();
        }
    }, [projectId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (taskMenuRef.current && !taskMenuRef.current.contains(event.target) &&
                !event.target.closest('.more-actions-btn')) {
                setShowTaskMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleTaskMoreActions = (e, taskId) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setTaskMenuPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX - 170,
        });
        setSelectedTaskId(taskId);
        setShowTaskMenu(!showTaskMenu);
    };

    const handleEditTask = () => {
        // Tìm task được chọn
        const selectedTask = tasks.find(task => task.task_id === selectedTaskId);
        if (selectedTask) {
            setEditTaskData({
                taskName: selectedTask.task_name,
                description: selectedTask.description || '',
                status: selectedTask.task_status || 'DONE',
                assignee: selectedTask.assignees?.length > 0 ? getFullName(selectedTask.assignees[0]) : 'No assignees',
                priority: selectedTask.task_priority || 'Critical',
                tag: selectedTask.task_tag || 'NO TAG',
                startDate: selectedTask.start_date || '',
                endDate: selectedTask.end_date || ''
            });
            setShowEditTaskModal(true);
        }
        setShowTaskMenu(false);
    };

    const handleSaveTaskChanges = async () => {
        try {
            const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

            if (!accessToken) {
                alert('Vui lòng đăng nhập để cập nhật task');
                return;
            }

            // Chuẩn bị dữ liệu cập nhật task theo định dạng API
            const updateTaskPayload = {
                task_name: editTaskData.taskName,
                description: editTaskData.description,
                task_status: editTaskData.status,
                task_priority: editTaskData.priority,
                start_date: editTaskData.startDate,
                end_date: editTaskData.endDate,
                task_tag: editTaskData.tag === 'NO TAG' ? null : editTaskData.tag,
                cycle_id: cycle.cycle_id
            };

            console.log("Đang gửi yêu cầu cập nhật task với dữ liệu:", updateTaskPayload);

            // Gọi API để cập nhật task
            const response = await fetch(
                `${API_BASE_URL}/projects/${projectId}/tasks/${selectedTaskId}/update`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'authentication': accessToken
                    },
                    body: JSON.stringify(updateTaskPayload)
                }
            );

            if (!response.ok) {
                throw new Error(`Lỗi cập nhật task: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Task đã được cập nhật thành công:", result);

            // Cập nhật assignee nếu có thay đổi và không phải 'No assignees'
            if (editTaskData.assignee !== 'No assignees') {
                try {
                    const assignResponse = await fetch(
                        `${API_BASE_URL}/projects/${projectId}/tasks/${selectedTaskId}/assign`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'authentication': accessToken
                            },
                            body: JSON.stringify({
                                user_email: editTaskData.assignee
                            })
                        }
                    );

                    if (!assignResponse.ok) {
                        console.warn(`Không thể gán người dùng cho task: ${assignResponse.status} ${assignResponse.statusText}`);
                    } else {
                        console.log("Đã gán người dùng cho task thành công");
                    }
                } catch (assignError) {
                    console.error("Lỗi khi gán người dùng cho task:", assignError);
                }
            }

            // Đóng modal và cập nhật lại danh sách task
            setShowEditTaskModal(false);

            // Cập nhật lại danh sách task hiển thị
            const updatedTasks = tasks.map(task => {
                if (task.task_id === selectedTaskId) {
                    return {
                        ...task,
                        task_name: editTaskData.taskName,
                        description: editTaskData.description,
                        task_status: editTaskData.status,
                        task_priority: editTaskData.priority,
                        start_date: editTaskData.startDate,
                        end_date: editTaskData.endDate,
                        task_tag: editTaskData.tag === 'NO TAG' ? null : editTaskData.tag
                    };
                }
                return task;
            });

            setTasks(updatedTasks);

            // Làm mới danh sách task để cập nhật thông tin assignee
            if (cycle?.cycle_id) {
                const fetchTasksAgain = async () => {
                    try {
                        setLoading(true);
                        const tasksData = await getTasksInCycle(projectId, cycle.cycle_id);

                        // Lấy thông tin assignees cho mỗi task
                        const tasksWithAssignees = await Promise.all(
                            tasksData.map(async (task) => {
                                try {
                                    // Gọi API lấy danh sách assignees cho task
                                    const response = await fetch(
                                        `${API_BASE_URL}/projects/${projectId}/tasks/${task.task_id}/assignees`,
                                        {
                                            headers: {
                                                authentication: localStorage.getItem('access_token') || sessionStorage.getItem('access_token'),
                                                accept: "application/json"
                                            }
                                        }
                                    );

                                    if (response.ok) {
                                        const assigneesData = await response.json();
                                        // Kiểm tra cấu trúc dữ liệu
                                        const assignees = Array.isArray(assigneesData) ? assigneesData : [];
                                        console.log(`Assignees cho task ${task.task_id}:`, assignees);

                                        // Trả về task với thông tin assignees đã được cập nhật
                                        return {
                                            ...task,
                                            assignees: assignees
                                        };
                                    } else {
                                        console.warn(`Không thể lấy assignees cho task ${task.task_id}`);
                                        return task;
                                    }
                                } catch (error) {
                                    console.error(`Lỗi khi lấy assignees cho task ${task.task_id}:`, error);
                                    return task;
                                }
                            })
                        );

                        setTasks(tasksWithAssignees || []);
                    } catch (error) {
                        console.error('Lỗi khi lấy danh sách task:', error);
                    } finally {
                        setLoading(false);
                    }
                };

                fetchTasksAgain();
            }

        } catch (error) {
            console.error("Lỗi khi cập nhật task:", error);
            alert(`Không thể cập nhật task: ${error.message}`);
        }
    };

    const handleCopyTaskLink = () => {
        // Tạo URL cho task detail
        const taskDetailUrl = `${window.location.origin}/task-detail/${projectId}/${selectedTaskId}`;

        // Sao chép URL vào clipboard
        navigator.clipboard.writeText(taskDetailUrl)
            .then(() => {
                console.log('Đã sao chép link task:', taskDetailUrl);
                // Thay đổi alert thành thông báo trong UI
                const task = tasks.find(task => task.task_id === selectedTaskId);
                setSuccessMessage({
                    title: 'Success!',
                    message: `Đã sao chép đường dẫn đến task ${task?.task_name || ''}`
                });
                setShowSuccessNotification(true);
                setTimeout(() => {
                    setShowSuccessNotification(false);
                }, 3000);
            })
            .catch(err => {
                console.error('Không thể sao chép link:', err);
                // Fallback cho trình duyệt không hỗ trợ clipboard API
                const textArea = document.createElement('textarea');
                textArea.value = taskDetailUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                // Cũng thay đổi thông báo ở đây
                const task = tasks.find(task => task.task_id === selectedTaskId);
                setSuccessMessage({
                    title: 'Success!',
                    message: `Đã sao chép đường dẫn đến task ${task?.task_name || ''}`
                });
                setShowSuccessNotification(true);
                setTimeout(() => {
                    setShowSuccessNotification(false);
                }, 3000);
            });

        setShowTaskMenu(false);
    };

    // Hàm format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const month = date.toLocaleString('en-US', { month: 'short' });
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month} ${day}, ${year}`;
    };

    // Chuyển đổi trạng thái từ API sang dạng hiển thị
    const mapStatus = (apiStatus) => {
        switch (apiStatus) {
            case "TODO":
            case "BACKLOG":
                return "To do";
            case "IN_PROGRESS":
                return "In progress";
            case "DONE":
                return "Done";
            default:
                return apiStatus;
        }
    };

    // Lấy chữ cái đầu của tên người dùng
    const getInitials = (name) => {
        if (!name || name === "Unassigned") return "UA";
        const words = name.split(" ");
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return words
            .slice(0, 2)
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase();
    };

    // Tạo màu ngẫu nhiên nhưng nhất quán dựa trên tên
    const stringToColor = (string) => {
        if (!string) return "#cccccc";
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            hash = string.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = [
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD",
            "#D4A5A5", "#9B59B6", "#3498DB", "#E74C3C", "#2ECC71"
        ];
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    // Lấy tên đầy đủ từ dữ liệu assignee
    const getFullName = (assignee) => {
        if (!assignee) return "Unassigned";
        const firstName = assignee.user_first_name || "";
        const lastName = assignee.user_last_name || "";
        if (firstName || lastName) {
            return `${firstName} ${lastName}`.trim();
        }
        return assignee.user_email || "Unknown";
    };

    return (
        <div className="cycle-detail-container">
            {showSuccessNotification && (
                <div className="success-notification">
                    <div className="notification-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <div className="notification-content">
                        <div>{successMessage.title}</div>
                        <div>{successMessage.message}</div>
                    </div>
                </div>
            )}
            <div className="cycle-detail-header">
                <button className="back-button" onClick={onBack}>
                    <span>←</span> Back to Cycles
                </button>
                <div className="cycle-detail-title">
                    <h1>{cycle.cycle_name}</h1>
                    <div className="cycle-dates">
                        {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
                    </div>
                </div>
            </div>

            <div className="cycle-tasks-container">
                <h2>Tasks in this Cycle</h2>

                {loading ? (
                    <div className="loading-message">Đang tải danh sách task...</div>
                ) : tasks.length > 0 ? (
                    <div className="table-container">
                        <table className="task-table">
                            <thead>
                                <tr>
                                    <th className="name-header">Name</th>
                                    <th className="status-header">Status</th>
                                    <th className="tag-header">Tag</th>
                                    <th className="priority-header">Priority</th>
                                    <th className="assign-header">Assign</th>
                                    <th className="date-header">Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task) => (
                                    <tr className="task-row" key={task.task_id}>
                                        <td className="name-cell">
                                            <div className="task-name">{task.task_name}</div>
                                        </td>
                                        <td className="status-cell">
                                            <span className={`status-badge ${task.task_status?.toLowerCase().replace(/\s+/g, "")}`}>
                                                {mapStatus(task.task_status)}
                                            </span>
                                        </td>
                                        <td className="tag-cell">{task.task_tag || "No Tag"}</td>
                                        <td className="priority-cell">
                                            <span className={`priority-badge ${task.task_priority?.toLowerCase().replace(/\s+/g, "")}`}>
                                                {task.task_priority || "LOW"}
                                            </span>
                                        </td>
                                        <td className="assign-cell">
                                            <div className="assignee-info d-flex align-items-center">
                                                {(task.assignees && task.assignees.length > 0) ? (
                                                    <>
                                                        <div
                                                            className="avatar-initials-a"
                                                            style={{ backgroundColor: stringToColor(getFullName(task.assignees[0])) }}
                                                            title={getFullName(task.assignees[0])}
                                                        >
                                                            {getInitials(getFullName(task.assignees[0]))}
                                                        </div>
                                                        <span className="assignee-name-kanban-a">
                                                            {getFullName(task.assignees[0])}
                                                            {task.assignees.length > 1 && ` +${task.assignees.length - 1}`}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="avatar-initials-a" style={{ backgroundColor: "#cccccc" }}>UA</div>
                                                        <span className="assignee-name-kanban-a">Unassigned</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="date-cell">
                                            <div className="date-with-actions">
                                                <span>{formatDate(task.created_at || new Date())}</span>
                                                <button
                                                    className="more-actions-btn"
                                                    onClick={(e) => handleTaskMoreActions(e, task.task_id)}
                                                >
                                                    <img src="/assets/icons/more_project_icon.svg" alt="More Actions" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="no-tasks-message">
                        <p>No tasks found in this cycle</p>
                    </div>
                )}
            </div>

            {showTaskMenu && (
                <div
                    className="task-actions-menu"
                    ref={taskMenuRef}
                    style={{
                        top: `${taskMenuPosition.top}px`,
                        left: `${taskMenuPosition.left}px`,
                        position: 'fixed',
                        zIndex: 1000
                    }}
                >
                    <div className="action-menu-item" onClick={handleEditTask}>
                        <img src="/assets/icons/edit_icon.svg" alt="Edit" />
                        <span>Edit Task</span>
                    </div>
                    <div className="action-menu-item" onClick={handleCopyTaskLink}>
                        <img src="/assets/icons/link_icon.svg" alt="Copy Link" />
                        <span>Copy Link</span>
                    </div>
                </div>
            )}

            {showEditTaskModal && (
                <div className="modal-overlay">
                    <div className="edit-task-modal">
                        <div className="modal-header">
                            <h2>Task Details</h2>
                            <button className="close-button" onClick={() => setShowEditTaskModal(false)}>×</button>
                        </div>
                        <div className="modal-content">
                            <div className="task-details-sidebar">
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={editTaskData.status}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, status: e.target.value })}
                                    >
                                        <option value="BACKLOG">BACKLOG</option>
                                        <option value="TODO">TODO</option>
                                        <option value="IN_PROGRESS">IN PROGRESS</option>
                                        <option value="DONE">DONE</option>
                                        <option value="STASHED">STASHED</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Assignee</label>
                                    <select
                                        value={editTaskData.assignee}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, assignee: e.target.value })}
                                    >
                                        <option value="No assignees">No assignees</option>
                                        {projectMembers.map(member => (
                                            <option
                                                key={member.user_id}
                                                value={member.user_email}
                                            >
                                                {member.user_first_name && member.user_last_name
                                                    ? `${member.user_first_name} ${member.user_last_name}`
                                                    : member.user_email}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Priority:</label>
                                    <select
                                        value={editTaskData.priority}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, priority: e.target.value })}
                                    >
                                        <option value="CRITICAL">CRITICAL</option>
                                        <option value="HIGH">HIGH</option>
                                        <option value="MID">MID</option>
                                        <option value="LOW">LOW</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Tag</label>
                                    <select
                                        value={editTaskData.tag}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, tag: e.target.value })}
                                    >
                                        <option value="NO TAG">NO TAG</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Dates:</label>
                                    <div className="date-inputs">
                                        <div className="date-input-container">
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" className="calendar-icon" />
                                            <input
                                                type="date"
                                                value={editTaskData.startDate}
                                                onChange={(e) => setEditTaskData({ ...editTaskData, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="date-input-container">
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" className="calendar-icon" />
                                            <input
                                                type="date"
                                                value={editTaskData.endDate}
                                                onChange={(e) => setEditTaskData({ ...editTaskData, endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button className="save-changes-btn" onClick={handleSaveTaskChanges}>
                                    Save changes
                                </button>
                            </div>
                            <div className="modal-main-content">
                                <div className="form-group">
                                    <input
                                        type="text"
                                        value={editTaskData.taskName}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, taskName: e.target.value })}
                                        placeholder="Task name"
                                    />
                                </div>
                                <div className="form-group">
                                    <textarea
                                        value={editTaskData.description}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                                        placeholder="Description"
                                    />
                                </div>
                                <div className="attachments-section">
                                    <h3>Attachments</h3>
                                    <div className="attachment-dropzone">
                                        Drag & drop files, or click to select
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CyclesLayout = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [activeExpanded, setActiveExpanded] = useState(true);
    const [upcomingExpanded, setUpcomingExpanded] = useState(true);
    const [completedExpanded, setCompletedExpanded] = useState(true);
    const [projectName, setProjectName] = useState('Project');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cycleName, setCycleName] = useState('');
    const [cycleDescription, setCycleDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [editCycleName, setEditCycleName] = useState('Cycle 1');
    const [editCycleDescription, setEditCycleDescription] = useState('');
    const [editStartDate, setEditStartDate] = useState('2025-03-10');
    const [editEndDate, setEditEndDate] = useState('2025-03-23');
    const [hasActiveCycle, setHasActiveCycle] = useState(false);
    const [showMoreActions, setShowMoreActions] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [cycles, setCycles] = useState({
        active: [],
        upcoming: [],
        completed: []
    });
    const [loading, setLoading] = useState(true);
    const [cycleId, setCycleId] = useState(null);
    const [activeSection, setActiveSection] = useState(null);
    const [showAIChat, setShowAIChat] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState(null);
    const [showCycleDetail, setShowCycleDetail] = useState(false);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

    const moreActionsRef = useRef(null);
    const btnRef = useRef(null);

    const toggleActive = () => setActiveExpanded(!activeExpanded);
    const toggleUpcoming = () => setUpcomingExpanded(!upcomingExpanded);
    const toggleCompleted = () => setCompletedExpanded(!completedExpanded);

    const openCreateModal = () => setShowCreateModal(true);
    const closeCreateModal = () => {
        setShowCreateModal(false);
        setShowStartDatePicker(false);
        setShowEndDatePicker(false);
    };

    const openEditModal = () => {
        setShowEditModal(true);
        setShowMoreActions(false);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setShowStartDatePicker(false);
        setShowEndDatePicker(false);
    };

    const handleMoreActions = (e, cycle, section) => {
        e.stopPropagation();

        setActiveSection(section);

        const rect = e.currentTarget.getBoundingClientRect();

        setMenuPosition({
            top: rect.top - 30,
            left: rect.left - 170,
        });

        setShowMoreActions(!showMoreActions);

        if (cycle) {
            setCycleId(cycle.cycle_id);
        }
    };

    const handleEditCycle = () => {
        const allCycles = [...cycles.active, ...cycles.upcoming, ...cycles.completed];
        const currentCycle = allCycles.find(cycle => cycle.cycle_id === cycleId);

        if (currentCycle) {
            setEditCycleName(currentCycle.cycle_name || '');
            setEditCycleDescription(currentCycle.description || '');
            setEditStartDate(currentCycle.start_date || '');
            setEditEndDate(currentCycle.end_date || '');
        }

        openEditModal();
    };

    const handleSaveEdit = async () => {
        console.log({
            editCycleName,
            editCycleDescription,
            editStartDate,
            editEndDate
        });
        try {
            const result = await updateCycle(projectId, cycleId, {
                cycleName: editCycleName,
                cycleDescription: editCycleDescription,
                startDate: editStartDate,
                endDate: editEndDate
            });
            console.log('Cập nhật cycle thành công:', result);

            setSuccessMessage({
                title: 'Success!',
                message: 'Cycle updated successfully.'
            });
            setShowSuccessNotification(true);
            setTimeout(() => {
                setShowSuccessNotification(false);
            }, 3000);

            closeEditModal();
            fetchCycles();
        } catch (error) {
            console.error('Lỗi khi cập nhật cycle:', error);
            alert(error.message || 'Có lỗi xảy ra khi cập nhật cycle');
        }
    };

    const handleDeleteCycle = () => {
        setShowMoreActions(false);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
    };

    const confirmDeleteCycle = async () => {
        try {
            console.log('Đang xóa cycle:', cycleId);
            await deleteCycle(projectId, cycleId);
            console.log('Xóa cycle thành công');

            // Thêm lại thông báo thành công
            setSuccessMessage({
                title: 'Success!',
                message: 'Cycle deleted successfully.'
            });
            setShowSuccessNotification(true);
            setTimeout(() => {
                setShowSuccessNotification(false);
            }, 3000);

            setShowDeleteModal(false);
            setShowMoreActions(false);
            fetchCycles();
        } catch (error) {
            console.error('Lỗi khi xóa cycle:', error);
            alert(error.message || 'Có lỗi xảy ra khi xóa cycle');
            setShowDeleteModal(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (moreActionsRef.current && !moreActionsRef.current.contains(event.target) &&
                !event.target.closest('.more-actions-btn')) {
                setShowMoreActions(false);
            }

            const datePickerElements = document.querySelectorAll('.datepicker-popup, .date-range-item, .date-icon');
            let isClickedInsideDatePicker = false;

            datePickerElements.forEach(element => {
                if (element.contains(event.target)) {
                    isClickedInsideDatePicker = true;
                }
            });

            if (!isClickedInsideDatePicker) {
                setShowStartDatePicker(false);
                setShowEndDatePicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchCycles = async () => {
        try {
            setLoading(true);
            const cyclesData = await getProjectCycles(projectId);

            console.log("Dữ liệu cycles nhận được:", cyclesData);
            console.log("Kiểu dữ liệu của cyclesData:", typeof cyclesData);
            console.log("Là mảng?", Array.isArray(cyclesData));

            if (!Array.isArray(cyclesData)) {
                console.error("Dữ liệu cycles không phải là mảng:", cyclesData);
                setLoading(false);
                return;
            }

            const now = new Date();
            const activeCycles = [];
            const upcomingCycles = [];
            const completedCycles = [];

            // Lấy số lượng task trong mỗi cycle
            const cyclesWithTasksCount = await Promise.all(
                cyclesData.map(async (cycle) => {
                    try {
                        console.log(`Bắt đầu lấy tasks cho cycle ID: ${cycle.cycle_id}`);
                        const tasksData = await getTasksInCycle(projectId, cycle.cycle_id);
                        console.log(`Kết quả tasks cho cycle ${cycle.cycle_id}:`, tasksData);

                        // Kiểm tra kỹ dữ liệu trả về
                        let tasksCount = 0;
                        if (tasksData === null || tasksData === undefined) {
                            console.log(`Dữ liệu tasks trả về null/undefined cho cycle ${cycle.cycle_id}`);
                        } else if (Array.isArray(tasksData)) {
                            tasksCount = tasksData.length;
                            console.log(`Số lượng tasks trong cycle ${cycle.cycle_id}: ${tasksCount}`);
                        } else if (typeof tasksData === 'object' && tasksData.hasOwnProperty('length')) {
                            tasksCount = tasksData.length;
                            console.log(`Số lượng tasks từ thuộc tính length: ${tasksCount}`);
                        } else {
                            console.log(`Dữ liệu tasks không phải mảng cho cycle ${cycle.cycle_id}:`, typeof tasksData);
                        }

                        // Trả về cycle với số lượng task được cập nhật
                        return {
                            ...cycle,
                            tasks_count: tasksCount
                        };
                    } catch (error) {
                        console.error(`Lỗi khi lấy task cho cycle ${cycle.cycle_id}:`, error);
                        // Nếu có lỗi, vẫn giữ nguyên cycle với số lượng task hiện tại hoặc 0
                        return {
                            ...cycle,
                            tasks_count: cycle.tasks_count || 0
                        };
                    }
                })
            );

            // Phân loại cycle vào các mảng tương ứng
            cyclesWithTasksCount.forEach(cycle => {
                const startDate = new Date(cycle.start_date);
                const endDate = new Date(cycle.end_date);

                if (endDate < now) {
                    completedCycles.push(cycle);
                } else if (startDate > now) {
                    upcomingCycles.push(cycle);
                } else {
                    activeCycles.push(cycle);
                }
            });

            setCycles({
                active: activeCycles,
                upcoming: upcomingCycles,
                completed: completedCycles
            });

            setHasActiveCycle(activeCycles.length > 0);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách cycles:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectDetail = async () => {
        try {
            const projectDetail = await getProjectDetail(projectId);
            setProjectName(projectDetail.project_name);
        } catch (error) {
            console.error('Lỗi khi lấy thông tin project:', error);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchProjectDetail();
            fetchCycles();
        }
    }, [projectId]);

    const handleCreateCycle = async () => {
        try {
            if (!cycleName) {
                alert('Vui lòng nhập tên cycle');
                return;
            }

            if (!startDate) {
                alert('Vui lòng chọn ngày bắt đầu');
                return;
            }

            if (!endDate) {
                alert('Vui lòng chọn ngày kết thúc');
                return;
            }

            const cycleData = {
                cycleName,
                cycleDescription,
                startDate,
                endDate
            };

            const result = await createCycle(projectId, cycleData);
            console.log('Tạo cycle thành công:', result);

            setSuccessMessage({
                title: 'Success!',
                message: 'Cycle created successfully.'
            });
            setShowSuccessNotification(true);
            setTimeout(() => {
                setShowSuccessNotification(false);
            }, 3000);

            closeCreateModal();
            setCycleName('');
            setCycleDescription('');
            setStartDate('');
            setEndDate('');

            fetchCycles();
        } catch (error) {
            console.error('Lỗi khi tạo cycle:', error);
            alert(error.message || 'Có lỗi xảy ra khi tạo cycle');
        }
    };

    const handleStartDateClick = () => {
        setShowEndDatePicker(false);
        setShowStartDatePicker(!showStartDatePicker);
    };

    const handleEndDateClick = () => {
        setShowStartDatePicker(false);
        setShowEndDatePicker(!showEndDatePicker);
    };

    const handleStartDateChange = (date) => {
        setStartDate(date ? date.toISOString().split('T')[0] : '');
        setShowStartDatePicker(false);
    };

    const handleEndDateChange = (date) => {
        setEndDate(date ? date.toISOString().split('T')[0] : '');
        setShowEndDatePicker(false);
    };

    const handleEditStartDateClick = () => {
        setShowEndDatePicker(false);
        setShowStartDatePicker(!showStartDatePicker);
    };

    const handleEditEndDateClick = () => {
        setShowStartDatePicker(false);
        setShowEndDatePicker(!showEndDatePicker);
    };

    const handleEditStartDateChange = (date) => {
        setEditStartDate(date ? date.toISOString().split('T')[0] : '');
        setShowStartDatePicker(false);
    };

    const handleEditEndDateChange = (date) => {
        setEditEndDate(date ? date.toISOString().split('T')[0] : '');
        setShowEndDatePicker(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const month = date.toLocaleString('en-US', { month: 'short' });
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month} ${day}, ${year}`;
    };

    const closeAIChat = () => {
        setShowAIChat(false);
    };

    const handleCycleItemClick = (cycle) => {
        try {
            console.log(`Đang xem chi tiết cycle: ${cycle.cycle_name} (${cycle.cycle_id})`);
            setSelectedCycle(cycle);
            setShowCycleDetail(true);
        } catch (error) {
            console.error('Lỗi khi xem chi tiết cycle:', error);
            alert('Không thể xem chi tiết cycle. Vui lòng thử lại sau.');
        }
    };

    const handleBackToCycles = () => {
        setSelectedCycle(null);
        setShowCycleDetail(false);
    };

    const handleCopyPageLink = () => {
        const pageUrl = window.location.href;

        navigator.clipboard.writeText(pageUrl)
            .then(() => {
                console.log('Đã sao chép đường dẫn trang Cycles:', pageUrl);
                setSuccessMessage({
                    title: 'Success!',
                    message: 'Đã sao chép đường dẫn trang Cycles'
                });
                setShowSuccessNotification(true);
                setTimeout(() => {
                    setShowSuccessNotification(false);
                }, 3000);
            })
            .catch(err => {
                console.error('Không thể sao chép đường dẫn:', err);
                // Fallback cho trình duyệt không hỗ trợ clipboard API
                const textArea = document.createElement('textarea');
                textArea.value = pageUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                setSuccessMessage({
                    title: 'Success!',
                    message: 'Đã sao chép đường dẫn trang Cycles'
                });
                setShowSuccessNotification(true);
                setTimeout(() => {
                    setShowSuccessNotification(false);
                }, 3000);
            });
    };

    return (
        <div className="cycles-container">
            {showCycleDetail && selectedCycle ? (
                <CycleDetail
                    projectId={projectId}
                    cycle={selectedCycle}
                    onBack={handleBackToCycles}
                />
            ) : (
                <>
                    {showSuccessNotification && (
                        <div className="success-notification">
                            <div className="notification-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <div className="notification-content">
                                <div>{successMessage.title}</div>
                                <div>{successMessage.message}</div>
                            </div>
                        </div>
                    )}

                    <div className="cycles-header">
                        <div className="breadcrumb">
                            <span>{projectName}</span> / <span>Cycles</span>
                        </div>
                        <div className="cycles-title-container">
                            <h1 className="cycles-title">Cycles</h1>
                            <button className="copy-link-btn" onClick={handleCopyPageLink}>
                                <img src="/assets/icons/copy_link_cycle_icon.svg" alt="Copy Link" title="Copy link to clipboard" />
                            </button>
                        </div>
                        <button className="create-cycle-btn" onClick={openCreateModal}>
                            <span className="plus-icon">+</span> Create Cycle
                        </button>
                    </div>

                    <div className="cycles-content">
                        <div className="cycle-section">
                            <div className="cycle-header active-cycle" onClick={toggleActive}>
                                <div className="cycle-icon-title">
                                    <div className="icon orange">
                                        <img src="/assets/icons/cycle_icon.svg" alt="Active Cycle" />
                                    </div>
                                    <h2>Active Cycle</h2>
                                </div>
                                <div className={`arrow ${activeExpanded ? 'expanded' : ''}`}>
                                    <img src="/assets/icons/arrow_icon.svg" alt="Arrow Icon" />
                                </div>
                            </div>
                            {activeExpanded && (
                                <div className="cycle-content">
                                    {loading ? (
                                        <div className="loading-message">Đang tải...</div>
                                    ) : hasActiveCycle ? (
                                        cycles.active.map((cycle) => (
                                            <div className="cycle-item" key={cycle.cycle_id} onClick={() => handleCycleItemClick(cycle)}>
                                                <div className="cycle-item-details">
                                                    <div className="cycle-name">{cycle.cycle_name}</div>
                                                    <div className="cycle-dates">
                                                        {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
                                                    </div>
                                                    <div className="cycle-tasks">{cycle.tasks_count || 0} Tasks</div>
                                                    <div className="cycle-actions">
                                                        <button
                                                            className="more-actions-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Ngăn sự kiện click lan tỏa lên phần tử cha
                                                                handleMoreActions(e, cycle, 'active');
                                                            }}
                                                        >
                                                            <img src="/assets/icons/more_project_icon.svg" alt="More Actions" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-cycle-message">No Active Cycle</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="cycle-section">
                            <div className="cycle-header upcoming-cycle" onClick={toggleUpcoming}>
                                <div className="cycle-icon-title">
                                    <div className="icon purple">
                                        <img src="/assets/icons/cycle_icon.svg" alt="Upcoming Cycle" />
                                    </div>
                                    <h2>Upcoming Cycle</h2>
                                </div>
                                <div className={`arrow ${upcomingExpanded ? 'expanded' : ''}`}>
                                    <img src="/assets/icons/arrow_icon.svg" alt="Arrow Icon" />
                                </div>
                            </div>
                            {upcomingExpanded && (
                                <div className="cycle-content">
                                    {loading ? (
                                        <div className="loading-message">Đang tải...</div>
                                    ) : cycles.upcoming.length > 0 ? (
                                        cycles.upcoming.map((cycle) => (
                                            <div className="cycle-item" key={cycle.cycle_id} onClick={() => handleCycleItemClick(cycle)}>
                                                <div className="cycle-item-details">
                                                    <div className="cycle-name">{cycle.cycle_name}</div>
                                                    <div className="cycle-dates">
                                                        {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
                                                    </div>
                                                    <div className="cycle-tasks">{cycle.tasks_count || 0} Tasks</div>
                                                    <div className="cycle-actions">
                                                        <button
                                                            className="more-actions-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Ngăn sự kiện click lan tỏa lên phần tử cha
                                                                handleMoreActions(e, cycle, 'upcoming');
                                                            }}
                                                        >
                                                            <img src="/assets/icons/more_project_icon.svg" alt="More Actions" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-cycle-message">No Upcoming Cycles</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="cycle-section">
                            <div className="cycle-header completed-cycle" onClick={toggleCompleted}>
                                <div className="cycle-icon-title">
                                    <div className="icon green">
                                        <img src="/assets/icons/cycle_icon.svg" alt="Completed Cycle" />
                                    </div>
                                    <h2>Completed Cycle</h2>
                                </div>
                                <div className={`arrow ${completedExpanded ? 'expanded' : ''}`}>
                                    <img src="/assets/icons/arrow_icon.svg" alt="Arrow Icon" />
                                </div>
                            </div>
                            {completedExpanded && (
                                <div className="cycle-content">
                                    {loading ? (
                                        <div className="loading-message">Đang tải...</div>
                                    ) : cycles.completed.length > 0 ? (
                                        cycles.completed.map((cycle) => (
                                            <div className="cycle-item" key={cycle.cycle_id} onClick={() => handleCycleItemClick(cycle)}>
                                                <div className="cycle-item-details">
                                                    <div className="cycle-name">{cycle.cycle_name}</div>
                                                    <div className="cycle-dates">
                                                        {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
                                                    </div>
                                                    <div className="cycle-tasks">{cycle.tasks_count || 0} Tasks</div>
                                                    <div className="cycle-actions">
                                                        <button
                                                            className="more-actions-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Ngăn sự kiện click lan tỏa lên phần tử cha
                                                                handleMoreActions(e, cycle, 'completed');
                                                            }}
                                                        >
                                                            <img src="/assets/icons/more_project_icon.svg" alt="More Actions" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-cycle-message">No Completed Cycles</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {showMoreActions && (
                <div
                    className="actions-dropdown"
                    ref={moreActionsRef}
                    style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, position: 'fixed' }}
                >
                    <div className="action-menu-item" onClick={handleEditCycle}>
                        <img src="/assets/icons/edit_icon.svg" alt="Edit" />
                        <span>Edit Cycle</span>
                    </div>
                    <div className="action-menu-item delete" onClick={handleDeleteCycle}>
                        <img src="/assets/icons/delete_icon.svg" alt="Delete" />
                        <span>Delete Cycle</span>
                    </div>
                </div>
            )}

            {(showCreateModal || showEditModal || showDeleteModal || showAIChat) && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
                    {showCreateModal && (
                        <div className="create-cycle-modal">
                            <h2>Create new cycle</h2>

                            <div className="form-group">
                                <label>Enter cycle name</label>
                                <input
                                    type="text"
                                    placeholder="Enter cycle name"
                                    value={cycleName}
                                    onChange={(e) => setCycleName(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Cycle Description</label>
                                <textarea
                                    placeholder="Describe your cycle"
                                    value={cycleDescription}
                                    onChange={(e) => setCycleDescription(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="date-range-container">
                                {startDate || endDate ? (
                                    <>
                                        <div className="date-range-item" onClick={handleStartDateClick}>
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" />
                                            {startDate ? formatDate(startDate) : 'Start date'}
                                        </div>
                                        <div className="date-arrow">→</div>
                                        <div className="date-range-item" onClick={handleEndDateClick}>
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" />
                                            {endDate ? formatDate(endDate) : 'End date'}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="date-range-item" onClick={handleStartDateClick}>
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" /> Start date
                                        </div>
                                        <div className="date-arrow">→</div>
                                        <div className="date-range-item" onClick={handleEndDateClick}>
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" /> End date
                                        </div>
                                    </>
                                )}
                                {showStartDatePicker && (
                                    <div className="datepicker-popup">
                                        <DatePicker
                                            selected={startDate ? new Date(startDate) : null}
                                            onChange={handleStartDateChange}
                                            dateFormat="dd/MM/yyyy"
                                            inline
                                        />
                                    </div>
                                )}
                                {showEndDatePicker && (
                                    <div className="datepicker-popup">
                                        <DatePicker
                                            selected={endDate ? new Date(endDate) : null}
                                            onChange={handleEndDateChange}
                                            dateFormat="dd/MM/yyyy"
                                            minDate={startDate ? new Date(startDate) : null}
                                            inline
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button className="cancel-btn" onClick={closeCreateModal}>Cancel</button>
                                <button className="create-btn" onClick={handleCreateCycle}>
                                    Create cycle
                                </button>
                            </div>
                        </div>
                    )}

                    {showEditModal && (
                        <div className="edit-cycle-modal">
                            <h2>Edit cycle</h2>

                            <div className="form-group">
                                <label>Cycle name</label>
                                <input
                                    type="text"
                                    value={editCycleName}
                                    onChange={(e) => setEditCycleName(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Cycle Description</label>
                                <textarea
                                    placeholder="No description"
                                    value={editCycleDescription}
                                    onChange={(e) => setEditCycleDescription(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="date-range-container">
                                {editStartDate || editEndDate ? (
                                    <>
                                        <div className="date-range-item" onClick={handleEditStartDateClick}>
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" />
                                            {editStartDate ? formatDate(editStartDate) : 'Start date'}
                                        </div>
                                        <div className="date-arrow">→</div>
                                        <div className="date-range-item" onClick={handleEditEndDateClick}>
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" />
                                            {editEndDate ? formatDate(editEndDate) : 'End date'}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="date-range-item" onClick={handleEditStartDateClick}>
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" /> Start date
                                        </div>
                                        <div className="date-arrow">→</div>
                                        <div className="date-range-item" onClick={handleEditEndDateClick}>
                                            <img src="/assets/icons/calendar_icon.svg" alt="Calendar" /> End date
                                        </div>
                                    </>
                                )}
                                {showStartDatePicker && (
                                    <div className="datepicker-popup">
                                        <DatePicker
                                            selected={editStartDate ? new Date(editStartDate) : null}
                                            onChange={handleEditStartDateChange}
                                            dateFormat="dd/MM/yyyy"
                                            inline
                                        />
                                    </div>
                                )}
                                {showEndDatePicker && (
                                    <div className="datepicker-popup">
                                        <DatePicker
                                            selected={editEndDate ? new Date(editEndDate) : null}
                                            onChange={handleEditEndDateChange}
                                            dateFormat="dd/MM/yyyy"
                                            minDate={editStartDate ? new Date(editStartDate) : null}
                                            inline
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button className="cancel-btn" onClick={closeEditModal}>Cancel</button>
                                <button className="save-btn" onClick={handleSaveEdit}>
                                    Save
                                </button>
                            </div>
                        </div>
                    )}

                    {showDeleteModal && (
                        <div className="edit-cycle-modal">
                            <h2>Are you sure you want to delete this cycle?</h2>
                            <p>This action cannot be undone. All related data will be permanently deleted.</p>

                            <div className="modal-actions">
                                <button className="cancel-btn" onClick={closeDeleteModal}>No</button>
                                <button className="delete-btn" onClick={confirmDeleteCycle}>
                                    Yes
                                </button>
                            </div>
                        </div>
                    )}

                    {showAIChat && <AIChat onClose={closeAIChat} />}
                </div>
            )}
        </div>
    );
};

export default CyclesLayout;
