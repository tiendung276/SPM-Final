import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import '../../assets/css/Module.css';
import { createModule, getProjectDetail, getProjectModules, updateModule, deleteModule, getModuleProgress, getTasksInModule, addTasksToModule, getProjectUsers, removeTaskFromModule } from '../../api/ProjectApi';
import TaskInfo from '../TaskDetails/TaskInfo';
import SidebarRight from '../TaskDetails/SidebarRight';
import axios from 'axios';
import config from '../../config/config';

const { API_BASE_URL } = config;

const Module = () => {
    const { projectId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [projectName, setProjectName] = useState('Project');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [moduleName, setModuleName] = useState('');
    const [moduleDescription, setModuleDescription] = useState('');
    const [showMoreActions, setShowMoreActions] = useState(false);
    const [selectedModuleId, setSelectedModuleId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const moreActionsRef = useRef(null);
    const [modules, setModules] = useState([]);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [selectedModule, setSelectedModule] = useState(null);
    const [moduleTasks, setModuleTasks] = useState([]);
    const [showModuleDetail, setShowModuleDetail] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [projectTasks, setProjectTasks] = useState([]);
    const [isLoadingProjectTasks, setIsLoadingProjectTasks] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTaskToAdd, setSelectedTaskToAdd] = useState(null);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [showTaskDetail, setShowTaskDetail] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [selectedTaskData, setSelectedTaskData] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskMoreActionsId, setTaskMoreActionsId] = useState(null);
    const [taskMenuPosition, setTaskMenuPosition] = useState({ top: 0, left: 0 });
    const [showTaskMoreActions, setShowTaskMoreActions] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const getAuthToken = () => {
        const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        return accessToken;
    };

    // Kiểm tra và xử lý trường hợp chuyển từ tab khác sang
    useEffect(() => {
        // Kiểm tra xem có token không
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        const isAuthenticated = localStorage.getItem('isAuthenticated') || sessionStorage.getItem('isAuthenticated');

        if (!token || !isAuthenticated) {
            navigate('/login', { state: { from: location.pathname } });
        }
    }, [navigate, location]);

    // Xử lý đường dẫn để xác định xem có hiển thị trang chi tiết module không
    useEffect(() => {
        // Kiểm tra URL có chứa tham số force=list không
        const searchParams = new URLSearchParams(location.search);
        const forceList = searchParams.get('force') === 'list';

        // Chỉ kiểm tra tham số forceList, không kiểm tra đường dẫn 
        // để không ảnh hưởng đến click trực tiếp vào module item
        if (forceList && showModuleDetail) {
            console.log("Quay lại danh sách modules theo yêu cầu từ URL");
            setShowModuleDetail(false);
            setSelectedModule(null);
            setModuleTasks([]);
        }
    }, [location.search, showModuleDetail]);

    // Hàm để lấy thông tin dự án và modules
    const fetchProjectInfo = useCallback(async () => {
        if (!projectId) return;

        try {
            // Lấy thông tin project từ API
            const projectData = await getProjectDetail(projectId);
            setProjectName(projectData.project_name);

            // Lấy modules của project
            const modulesData = await getProjectModules(projectId);
            setModules(modulesData);

            // Tính toán tiến độ cho từng module
            const updatedModules = await Promise.all(modulesData.map(async (module) => {
                try {
                    const progress = await getModuleProgress(projectId, module.id);
                    return { ...module, completed: progress };
                } catch (error) {
                    console.error(`Lỗi khi tính toán tiến độ cho module ${module.id}:`, error);
                    return { ...module, completed: 0 };
                }
            }));

            setModules(updatedModules);
        } catch (error) {
            console.error("Lỗi khi lấy thông tin dự án:", error);
            // Hiện tại chỉ thiết lập tên dự án mẫu khi có lỗi
            setProjectName(`Project ${projectId}`);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProjectInfo();
    }, [fetchProjectInfo]);

    // Thêm useEffect để lấy danh sách thành viên dự án
    useEffect(() => {
        // Lấy danh sách thành viên dự án khi projectId thay đổi
        const fetchProjectMembers = async () => {
            if (projectId) {
                try {
                    const members = await getProjectUsers(projectId);
                    console.log("Thành viên của dự án:", members);
                    setProjectMembers(members);
                } catch (error) {
                    console.error("Lỗi khi lấy danh sách thành viên dự án:", error);
                }
            }
        };

        fetchProjectMembers();
    }, [projectId]);

    // Xử lý đóng datepicker khi click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (moreActionsRef.current && !moreActionsRef.current.contains(event.target)) {
                setShowMoreActions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Mở modal tạo module mới
    const openCreateModal = () => {
        setShowCreateModal(true);
    };

    // Đóng modal tạo module mới
    const closeCreateModal = () => {
        setShowCreateModal(false);
        setModuleName('');
        setModuleDescription('');
    };

    // Mở modal edit module
    const openEditModal = (module) => {
        setModuleName(module.name);
        setModuleDescription(module.description || '');
        setSelectedModuleId(module.id);
        setShowEditModal(true);
        setShowMoreActions(false);
    };

    // Đóng modal edit module
    const closeEditModal = () => {
        setShowEditModal(false);
        setModuleName('');
        setModuleDescription('');
    };

    // Mở modal delete module
    const openDeleteModal = (moduleId) => {
        setSelectedModuleId(moduleId);
        setShowDeleteModal(true);
        setShowMoreActions(false);
    };

    // Đóng modal delete module
    const closeDeleteModal = () => {
        setShowDeleteModal(false);
    };

    // Xử lý khi tạo module mới
    const handleCreateModule = async () => {
        try {
            if (!moduleName) {
                alert('Vui lòng nhập tên module');
                return;
            }

            // Tạo module mới với dữ liệu theo định dạng chuẩn
            const moduleData = {
                moduleName: moduleName.trim(),
                description: moduleDescription || ""
            };

            try {
                console.log("Gửi request tạo module với dữ liệu:", moduleData);

                // Gọi API tạo module
                const response = await createModule(projectId, moduleData);
                console.log("Module đã được tạo:", response);

                // Kiểm tra response
                if (response && response.status === "create module success") {
                    // Hiển thị thông báo thành công
                    setShowSuccessToast(true);
                    setTimeout(() => {
                        setShowSuccessToast(false);
                    }, 3000);

                    // Đóng modal
                    closeCreateModal();

                    // Tải lại danh sách modules từ server để đảm bảo đồng bộ
                    await fetchProjectInfo();
                } else {
                    throw new Error('Phản hồi không đúng định dạng');
                }
            } catch (apiError) {
                console.error("Lỗi API:", apiError);
                alert(`Lỗi khi tạo module: ${apiError.message}`);
            }
        } catch (error) {
            console.error("Lỗi khi tạo module:", error);
            alert('Có lỗi xảy ra khi tạo module. Vui lòng thử lại sau.');
        }
    };

    // Xử lý khi cập nhật module
    const handleUpdateModule = async () => {
        try {
            if (!moduleName) {
                alert('Vui lòng nhập tên module');
                return;
            }

            // Tìm module được chọn
            const moduleToEdit = modules.find(module => module.id === selectedModuleId);
            if (!moduleToEdit) {
                alert('Không tìm thấy module cần cập nhật');
                return;
            }

            // Tạo dữ liệu để cập nhật module
            const moduleData = {
                moduleName: moduleName.trim(),
                description: moduleDescription || ""
            };

            console.log("Gửi request cập nhật module với dữ liệu:", moduleData);

            // Gọi API để cập nhật module
            await updateModule(projectId, selectedModuleId, moduleData);

            // Hiển thị thông báo thành công
            setShowSuccessToast(true);
            setTimeout(() => {
                setShowSuccessToast(false);
            }, 3000);

            // Đóng modal
            closeEditModal();

            // Tải lại danh sách modules từ server để đảm bảo đồng bộ
            await fetchProjectInfo();
        } catch (error) {
            console.error("Lỗi khi cập nhật module:", error);
            alert(`Có lỗi xảy ra khi cập nhật module: ${error.message}`);
        }
    };

    // Xử lý khi xóa module
    const handleDeleteModule = async () => {
        try {
            // Gọi API để xóa module
            await deleteModule(projectId, selectedModuleId);

            // Hiển thị thông báo thành công
            setShowSuccessToast(true);
            setTimeout(() => {
                setShowSuccessToast(false);
            }, 3000);

            // Đóng modal xác nhận xóa
            closeDeleteModal();

            // Tải lại danh sách modules từ server để đảm bảo đồng bộ
            await fetchProjectInfo();
        } catch (error) {
            console.error("Lỗi khi xóa module:", error);
            alert(`Có lỗi xảy ra khi xóa module: ${error.message}`);
        }
    };

    // Hàm xử lý hiển thị menu more actions
    const handleMoreActionsClick = (event, moduleId) => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        setMenuPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX - 160, // Căn chỉnh để menu hiển thị phù hợp
        });
        setSelectedModuleId(moduleId);
        setShowMoreActions(true);
    };

    // Các hàm xử lý cho các action trong menu
    const handleEditModule = () => {
        // Tìm module được chọn
        const moduleToEdit = modules.find(module => module.id === selectedModuleId);
        if (moduleToEdit) {
            openEditModal(moduleToEdit);
        }
    };

    const handleDeleteModuleClick = () => {
        // Mở modal xác nhận xóa
        openDeleteModal(selectedModuleId);
    };

    // Hàm xử lý copy link trang module
    const handleCopyModulePageLink = () => {
        // Lấy URL hiện tại
        const currentUrl = window.location.href;

        // Lưu token vào localStorage để có thể truy cập từ tab khác
        const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        const userEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');

        if (accessToken) {
            // Đảm bảo token luôn lưu trong localStorage (không chỉ sessionStorage)
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('isAuthenticated', 'true');
            if (userEmail) {
                localStorage.setItem('user_email', userEmail);
            }
        }

        // Copy URL vào clipboard
        navigator.clipboard.writeText(currentUrl)
            .then(() => {
                // Hiển thị thông báo đã copy thành công
                setShowCopyToast(true);

                // Tự động ẩn toast sau 2 giây
                setTimeout(() => {
                    setShowCopyToast(false);
                }, 2000);
            })
            .catch(err => {
                console.error('Không thể copy URL: ', err);
                alert('Không thể copy URL!');
            });
    };

    // Hàm xử lý khi click vào module để xem chi tiết
    const handleViewModuleTasks = async (moduleId) => {
        try {
            setIsLoadingTasks(true);
            setSelectedModule(moduleId);

            // Tìm module được chọn
            const selectedModuleInfo = modules.find(module => module.id === moduleId);
            if (!selectedModuleInfo) {
                throw new Error('Không tìm thấy thông tin module');
            }

            // Lấy danh sách task trong module
            let tasks = await getTasksInModule(projectId, moduleId);

            console.log("Tasks từ API:", tasks);

            // Định dạng lại dữ liệu task để hiển thị
            const formattedTasks = tasks.map(task => ({
                id: task.task_id,
                task_id: task.task_id,
                title: task.task_name,
                task_name: task.task_name,
                description: task.description || "",
                status: task.task_status,
                task_status: task.task_status,
                priority: task.task_priority,
                task_priority: task.task_priority,
                start_date: task.start_date,
                end_date: task.end_date,
                task_tag: task.task_tag || "",
                task_short: task.task_short || `TASK-${task.task_id.slice(-4)}`,
                module_id: moduleId, // Đảm bảo lưu module_id
                assignees: task.assignees || [],
                assignee_name: task.assignee_name || (task.assignees && task.assignees[0] ? task.assignees[0].name : "Unassigned")
            }));

            console.log("Tasks đã định dạng:", formattedTasks);

            setModuleTasks(formattedTasks);

            // Hiển thị trang chi tiết module
            setShowModuleDetail(true);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách task trong module:", error);
            alert(`Lỗi khi lấy danh sách task: ${error.message}`);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    // Hàm đóng trang chi tiết module và quay lại danh sách modules
    const closeModuleDetail = () => {
        setShowModuleDetail(false);
        setSelectedModule(null);
        setModuleTasks([]);
    };

    // Render một task item trong modal
    const renderTaskItem = (task) => {
        return (
            <div className="task-item" key={task.task_id}>
                <div className="task-name">
                    <span>{task.task_name}</span>
                </div>
                <div className="task-status">
                    <span className={`status-badge ${task.task_status.toLowerCase()}`}>
                        {task.task_status}
                    </span>
                </div>
            </div>
        );
    };

    // Render một module item
    const renderModuleItem = (module) => {
        return (
            <div className="module-item" key={module.id} onClick={() => handleViewModuleTasks(module.id)}>
                <div className="module-status-name">
                    <div className="module-status">
                        {module.completed < 100 ? (
                            <div className="circle-progress">
                                <div className="progress-circle" style={{
                                    background: `conic-gradient(
                                        #f44336 ${module.completed * 3.6}deg,
                                        #e0e0e0 ${module.completed * 3.6}deg 360deg
                                    )`
                                }}>
                                    <div className="progress-inner">
                                        <span className="progress-text">{module.completed}%</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="completed-icon">
                                <svg width="40" height="40" viewBox="0 0 40 40">
                                    <defs>
                                        <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#f44336" />
                                            <stop offset="100%" stopColor="#ff9800" />
                                        </linearGradient>
                                    </defs>
                                    <circle cx="20" cy="20" r="19" fill="white" stroke="url(#checkGradient)" strokeWidth="2" />
                                    <circle cx="20" cy="20" r="16" fill="url(#checkGradient)" />
                                    <path d="M14 20l4 4 8-8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="module-name">
                        <span>{module.name}</span>
                    </div>
                </div>

                <div className="module-info-container">
                    <div className="module-actions">
                        <button className="more-actions" onClick={(e) => {
                            e.stopPropagation(); // Ngăn chặn sự kiện click lan tỏa tới parent (module-item)
                            handleMoreActionsClick(e, module.id);
                        }}>
                            <img src="/assets/icons/more_project_icon.svg" alt="More actions" width="18" height="18" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Hàm lấy danh sách các task trong project
    const fetchProjectTasks = async () => {
        try {
            setIsLoadingProjectTasks(true);
            // Gọi API để lấy danh sách task từ backend
            // Trong trường hợp này, bạn cần thêm API cho việc này trong ProjectApi.js
            const response = await fetch(`http://localhost:8881/api/projects/${projectId}/tasks/0/1000`, {
                headers: {
                    authentication: localStorage.getItem('access_token') || sessionStorage.getItem('access_token'),
                    accept: "application/json",
                }
            });

            if (!response.ok) {
                throw new Error('Không thể tải danh sách task');
            }

            const data = await response.json();
            let tasks = [];

            if (Array.isArray(data)) {
                tasks = data;
            } else if (data.tasks && Array.isArray(data.tasks)) {
                tasks = data.tasks;
            }

            // Lấy project_short từ project info
            const projectData = await getProjectDetail(projectId);
            const projectShort = projectData.project_short || projectName.substring(0, 3).toUpperCase();

            // Nếu đã có module đang được chọn, loại bỏ các task đã thuộc module đó
            if (selectedModule) {
                const moduleTasks = await getTasksInModule(projectId, selectedModule);
                const moduleTaskIds = moduleTasks.map(task => task.task_id);
                tasks = tasks.filter(task => !moduleTaskIds.includes(task.task_id));
            }

            // Thêm project_short vào mỗi task
            tasks = tasks.map(task => ({
                ...task,
                task_short: `${projectShort}-${task.task_id.slice(-4)}`
            }));

            setProjectTasks(tasks);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách task:", error);
        } finally {
            setIsLoadingProjectTasks(false);
        }
    };

    // Hàm mở modal chọn task
    const openAddTaskModal = async () => {
        await fetchProjectTasks();
        setShowAddTaskModal(true);
    };

    // Hàm đóng modal chọn task
    const closeAddTaskModal = () => {
        setShowAddTaskModal(false);
        setSelectedTasks([]);
        setSearchQuery('');
    };

    // Hàm xử lý khi chọn/bỏ chọn một task
    const handleTaskSelection = (taskId) => {
        if (selectedTasks.includes(taskId)) {
            setSelectedTasks(selectedTasks.filter(id => id !== taskId));
        } else {
            setSelectedTasks([...selectedTasks, taskId]);
        }
    };

    // Hàm xử lý thêm task hiện có vào module đang chọn
    const handleAddTaskToModule = async () => {
        if (!selectedModule) {
            alert("Vui lòng chọn một module để thêm task");
            return;
        }

        if (selectedTasks.length === 0) {
            alert("Vui lòng chọn ít nhất một task để thêm");
            return;
        }

        try {
            setIsAddingTask(true);
            // Gọi API để thêm task vào module
            const response = await addTasksToModule(projectId, selectedModule, selectedTasks);
            console.log("Thêm task vào module:", response);

            // Đóng modal và reset trạng thái đã chọn
            setShowAddTaskModal(false);
            setSelectedTasks([]);

            // Hiển thị thông báo thành công
            setShowSuccessToast(true);
            setTimeout(() => {
                setShowSuccessToast(false);
            }, 3000);

            // Tải lại danh sách task của module
            handleViewModuleTasks(selectedModule);

        } catch (error) {
            console.error("Lỗi khi thêm task vào module:", error);
            alert("Không thể thêm task vào module: " + error.message);
        } finally {
            setIsAddingTask(false);
        }
    };

    // Lọc task theo từ khóa tìm kiếm
    const getFilteredTasks = () => {
        if (!searchQuery) return projectTasks;

        return projectTasks.filter(task =>
            task.task_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.task_short?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    // Hàm xử lý khi click vào nút Create new task
    const handleCreateNewTask = () => {
        if (!projectId) {
            console.error("Không có project ID được cung cấp");
            return;
        }
        // Điều hướng đến trang tạo task với status mặc định là 'todo'
        navigate(`/task/add/todo`, {
            state: {
                projectId,
                moduleId: selectedModule,
                returnToModule: true,
                returnPath: `/project/${projectId}/modules?module=${selectedModule}`
            }
        });
    };

    // Hàm xử lý khi click vào một task
    const handleTaskClick = (task) => {
        setSelectedTaskId(task.task_id);
        // Chuẩn bị dữ liệu task cho TaskInfo component
        const taskData = {
            id: task.task_id,
            title: task.task_name,
            description: task.description || "",
            status: task.task_status,
            priority: task.priority,
            task_tag: task.tag || "No Tag",
            task_short: task.task_short || `TASK-${task.task_id.slice(-4)}`,
            assignees: [{ name: task.assignee_name || "Unassigned" }],
            startDate: task.start_date ? new Date(task.start_date) : new Date(),
            endDate: task.end_date ? new Date(task.end_date) : new Date(),
        };
        setSelectedTaskData(taskData);
        setShowTaskDetail(true);
    };

    // Hàm đóng task detail
    const handleCloseTaskDetail = () => {
        setShowTaskDetail(false);
        setSelectedTaskId(null);
        setSelectedTaskData(null);
    };

    // Sửa hàm updateTaskInDatabase để đảm bảo giữ nguyên module_id
    const updateTaskInDatabase = async (taskId, taskData) => {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error("No token found");
            }

            const config = {
                headers: {
                    authentication: token,
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
            };

            // Map giá trị status hiển thị sang giá trị API
            const statusMapping = {
                "TO DO": "TODO",
                "IN PROGRESS": "IN_PROGRESS",
                "DONE": "DONE",
                "BACKLOG": "BACKLOG"
            };

            // Map giá trị priority hiển thị sang giá trị API
            const priorityMapping = {
                "Critical": "CRITICAL",
                "High": "HIGH",
                "Mid": "MID",
                "Low": "LOW"
            };

            // Xử lý task_status
            let taskStatus = taskData.status;
            if (statusMapping[taskStatus]) {
                taskStatus = statusMapping[taskStatus];
            }

            // Xử lý task_priority
            let taskPriority = taskData.priority;
            if (priorityMapping[taskPriority]) {
                taskPriority = priorityMapping[taskPriority];
            } else {
                taskPriority = taskPriority.toUpperCase();
            }

            // Đây là phần quan trọng - đảm bảo chúng ta có module_id
            // Lấy module_id từ task hiện tại hoặc từ selectedModuleId nếu đang trong view module
            const moduleId = taskData.module_id || selectedModuleId;

            // Chuẩn bị dữ liệu theo định dạng API
            const payload = {
                task_name: taskData.title,
                description: taskData.description || "",
                task_status: taskStatus,
                task_priority: taskPriority,
                start_date: taskData.startDate ? new Date(taskData.startDate).toISOString().split('T')[0] : null,
                end_date: taskData.endDate ? new Date(taskData.endDate).toISOString().split('T')[0] : null,
                task_tag: taskData.task_tag === "NO TAG" || !taskData.task_tag ? null : taskData.task_tag,
                module_id: moduleId  // Đảm bảo luôn gán module_id
            };

            // Thêm cycle_id chỉ khi nó tồn tại
            if (taskData.cycle_id) {
                payload.cycle_id = taskData.cycle_id;
            }

            console.log("Sending update request with payload:", payload);

            const response = await axios.put(
                `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/update`,
                payload,
                config
            );

            console.log("Task updated successfully:", response.data);

            // Cập nhật assignee nếu có
            if (taskData.assignees && taskData.assignees.length > 0) {
                const assignee = taskData.assignees[0];
                if (assignee && assignee.emailAddress) {
                    try {
                        console.log("Assigning user to task:", assignee.emailAddress);
                        const assignPayload = {
                            user_email: assignee.emailAddress
                        };

                        await axios.post(
                            `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/assign`,
                            assignPayload,
                            config
                        );
                        console.log("User assigned successfully to task");
                    } catch (assignError) {
                        console.error("Error assigning user to task:", assignError);
                        // Không throw ở đây để không làm hỏng luồng cập nhật task
                    }
                }
            }

            return response.data;
        } catch (error) {
            console.error("Error updating task:", error);
            if (error.response) {
                console.error("Error response status:", error.response.status);
                console.error("Error response data:", error.response.data);

                if (error.response.status === 401 || error.response.status === 403) {
                    alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                } else if (error.response.status === 422) {
                    // Hiển thị thông báo lỗi chi tiết từ server nếu có
                    const errorDetail = error.response.data?.detail
                        ? `Lỗi xác thực dữ liệu: ${JSON.stringify(error.response.data.detail)}`
                        : "Dữ liệu không hợp lệ";
                    alert(errorDetail);
                } else {
                    alert(`Lỗi khi cập nhật task (${error.response.status}): ${error.message}`);
                }
            } else {
                alert(`Lỗi khi cập nhật task: ${error.message}`);
            }
            throw error;
        }
    };

    // Sửa hàm handleTaskUpdate
    const handleTaskUpdate = async (updatedTask) => {
        try {
            const taskId = updatedTask.id || updatedTask.task_id;

            // Lưu lại module_id hiện tại đang được xem
            const currentModuleId = selectedModule;

            // Đảm bảo updatedTask có module_id
            if (currentModuleId && !updatedTask.module_id) {
                updatedTask.module_id = currentModuleId;
            }

            console.log("Đang cập nhật task với module_id:", updatedTask.module_id);

            // Gọi API để cập nhật dữ liệu trên server
            await updateTaskInDatabase(taskId, updatedTask);

            // Sau khi cập nhật thành công, gọi lại handleViewModuleTasks để làm mới dữ liệu
            if (currentModuleId) {
                await handleViewModuleTasks(currentModuleId);

                // Cập nhật lại tiến độ của module
                const updatedModules = await Promise.all(modules.map(async (module) => {
                    if (module.id === currentModuleId) {
                        const progress = await getModuleProgress(projectId, module.id);
                        return { ...module, completed: progress };
                    }
                    return module;
                }));
                setModules(updatedModules);
            }

            // Đóng modal chi tiết task
            handleCloseTaskDetail();
        } catch (error) {
            console.error("Error in handleTaskUpdate:", error);
        }
    };

    // Cập nhật useEffect để khởi tạo giá trị ban đầu cho taskTitle và taskDescription
    useEffect(() => {
        if (selectedTaskData) {
            setTaskTitle(selectedTaskData.title || '');
            setTaskDescription(selectedTaskData.description || '');
        }
    }, [selectedTaskData]);

    // Thêm hàm fetchModuleTasks để lấy và xử lý dữ liệu task của module
    const fetchModuleTasks = async (moduleId) => {
        try {
            setIsLoadingTasks(true);
            console.log("Đang lấy danh sách task cho module:", moduleId);

            const token = getAuthToken();
            const config = {
                headers: {
                    authentication: token,
                    accept: "application/json",
                },
            };

            const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/modules/${moduleId}/tasks`, config);

            console.log("Response từ API tasks của module:", response.data);

            let tasks = [];
            if (Array.isArray(response.data)) {
                tasks = response.data;
            } else if (response.data && Array.isArray(response.data.tasks)) {
                tasks = response.data.tasks;
            }

            // Chuẩn hóa dữ liệu task
            const formattedTasks = tasks.map(task => ({
                id: task.task_id,
                task_id: task.task_id,
                title: task.task_name,
                task_name: task.task_name,
                description: task.description || "",
                status: task.task_status,
                task_status: task.task_status,
                priority: task.task_priority,
                task_priority: task.task_priority,
                start_date: task.start_date,
                end_date: task.end_date,
                task_tag: task.task_tag || "",
                task_short: task.task_short || `TASK-${task.task_id.slice(-4)}`,
                module_id: moduleId, // Đảm bảo lưu module_id
                assignees: task.assignees || []
            }));

            console.log("Danh sách task đã chuẩn hóa:", formattedTasks);
            setModuleTasks(formattedTasks);
            setIsLoadingTasks(false);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách task của module:", error);
            setIsLoadingTasks(false);
            setModuleTasks([]);
        }
    };

    // Component hiển thị trang chi tiết module
    const ModuleDetailView = () => {
        const selectedModuleInfo = modules.find(m => m.id === selectedModule);

        if (!selectedModuleInfo) {
            return (
                <div className="module-detail-container">
                    <div className="loading-container">Module không tồn tại</div>
                </div>
            );
        }

        return (
            <div className="module-detail-container" style={{ background: '#1A2745', width: '100%', minHeight: '100vh', padding: '20px' }}>
                <div className="module-detail-header" style={{
                    backgroundColor: '#2A3B5C',
                    padding: '24px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    <div className="module-detail-back" style={{ marginBottom: '20px' }}>
                        <button
                            className="back-button"
                            onClick={closeModuleDetail}
                            style={{
                                color: '#333',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                background: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                fontWeight: '500'
                            }}
                        >
                            <span style={{ marginRight: '6px' }}>←</span>
                            <span>Back to Modules</span>
                        </button>
                    </div>
                    <div className="module-detail-title" style={{ marginBottom: '20px' }}>
                        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '600', margin: '0 0 12px 0' }}>
                            {selectedModuleInfo.name}
                        </h1>
                        {selectedModuleInfo.description && (
                            <p style={{ color: '#E0E0E0', fontSize: '15px', margin: '0 0 16px 0', maxWidth: '800px', lineHeight: '1.5' }}>
                                {selectedModuleInfo.description}
                            </p>
                        )}
                        <div className="module-detail-progress" style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="progress-indicator" style={{ display: 'flex', alignItems: 'center', width: '300px' }}>
                                <div className="progress-bar" style={{
                                    flexGrow: 1,
                                    height: '8px',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    borderRadius: '4px',
                                    marginRight: '12px',
                                    overflow: 'hidden'
                                }}>
                                    <div
                                        className="progress-fill"
                                        style={{
                                            height: '100%',
                                            width: `${selectedModuleInfo.completed}%`,
                                            background: 'linear-gradient(to right, #FF4B2B, #FF9D45)',
                                            borderRadius: '4px',
                                            transition: 'width 0.3s ease'
                                        }}
                                    ></div>
                                </div>
                                <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
                                    {selectedModuleInfo.completed}% hoàn thành
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="module-detail-content">
                    {isLoadingTasks ? (
                        <div className="loading-container" style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '30px',
                            maxWidth: '1200px',
                            margin: '0 auto',
                            textAlign: 'center'
                        }}>
                            Đang tải danh sách task...
                        </div>
                    ) : moduleTasks.length === 0 ? (
                        <div className="no-tasks-container" style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '30px',
                            maxWidth: '1200px',
                            margin: '0 auto',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}>
                            <div className="no-tasks-content">
                                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                                    No tasks in the module
                                </h2>
                                <p style={{ fontSize: '16px', color: '#555', marginBottom: '30px' }}>
                                    Create or add tasks which you want to accomplish as part of this module
                                </p>

                                <div className="module-task-list-example" style={{ margin: '30px auto', maxWidth: '100%', textAlign: 'center' }}>
                                    <img
                                        src="/assets/images/backgroud_module.png"
                                        alt="Example of module tasks"
                                        className="task-list-image"
                                        style={{
                                            maxWidth: '95%',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                            border: '1px solid #eee'
                                        }}
                                    />
                                </div>

                                <div className="module-task-actions" style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '30px' }}>
                                    <button
                                        className="create-task-btn"
                                        style={{
                                            background: '#4264D0',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '10px 20px',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                        onClick={handleCreateNewTask}
                                    >
                                        Create new task
                                    </button>
                                    <button
                                        className="add-existing-btn"
                                        style={{
                                            background: 'white',
                                            color: '#333',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            padding: '10px 20px',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                        onClick={openAddTaskModal}
                                    >
                                        Add an existing task
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="module-tasks-container" style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            maxWidth: '1200px',
                            margin: '0 auto',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            overflow: 'hidden'
                        }}>
                            <div className="module-tasks-header" style={{
                                display: 'flex',
                                background: '#f9f9f9',
                                borderBottom: '1px solid #e0e0e0',
                                padding: '16px',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div className="task-column task-name" style={{ flex: '1.5', fontWeight: '500', color: '#666', paddingLeft: '20px' }}>Name</div>
                                <div className="task-column task-status" style={{ flex: '1', textAlign: 'center', fontWeight: '500', color: '#666' }}>Status</div>
                                <div className="task-column task-tag" style={{ flex: '1', textAlign: 'center', fontWeight: '500', color: '#666' }}>Tag</div>
                                <div className="task-column task-priority" style={{ flex: '1', textAlign: 'center', fontWeight: '500', color: '#666' }}>Priority</div>
                                <div className="task-column task-assignee" style={{ flex: '1', textAlign: 'center', fontWeight: '500', color: '#666' }}>Assign</div>
                                <div className="task-column task-created" style={{ flex: '1', textAlign: 'center', fontWeight: '500', color: '#666', paddingRight: '20px' }}>Created At</div>
                            </div>

                            <div className="module-tasks-list">
                                {moduleTasks.map(task => (
                                    <div className="module-task-item" key={task.task_id} style={{
                                        display: 'flex',
                                        borderBottom: '1px solid #e0e0e0',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        position: 'relative'
                                    }}
                                        onClick={() => handleTaskClick(task)}
                                    >
                                        <div className="task-column task-name" style={{ flex: '1.5', paddingLeft: '20px' }}>
                                            {task.task_name}
                                        </div>
                                        <div className="task-column task-status" style={{ flex: '1', textAlign: 'center' }}>
                                            <span className={`status-badge ${(task.task_status || 'todo').toLowerCase()}`} style={{
                                                display: 'inline-block',
                                                padding: '6px 16px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                backgroundColor: task.task_status?.toLowerCase() === 'in progress' ? '#FFF3DC' :
                                                    task.task_status?.toLowerCase() === 'to do' ? '#EAE8FC' : '#E8E8E8'
                                            }}>
                                                {task.task_status === 'in progress' ? 'In progress' :
                                                    task.task_status === 'to do' ? 'To do' : task.task_status || 'To do'}
                                            </span>
                                        </div>
                                        <div className="task-column task-tag" style={{ flex: '1', textAlign: 'center' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>
                                                {task.tag || 'No Tag'}
                                            </span>
                                        </div>
                                        <div className="task-column task-priority" style={{ flex: '1', textAlign: 'center' }}>
                                            <span className={`priority-badge ${(task.priority || 'low').toLowerCase()}`} style={{
                                                display: 'inline-block',
                                                padding: '6px 16px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                backgroundColor: task.priority?.toLowerCase() === 'high' || task.priority?.toLowerCase() === 'critical' ? '#FCDED8' :
                                                    task.priority?.toLowerCase() === 'mid' || task.priority?.toLowerCase() === 'medium' ? '#E5DEFA' : '#F3F3C8',
                                                color: task.priority?.toLowerCase() === 'high' || task.priority?.toLowerCase() === 'critical' ? '#DE3617' :
                                                    task.priority?.toLowerCase() === 'mid' || task.priority?.toLowerCase() === 'medium' ? '#6E4AE8' : '#878903'
                                            }}>
                                                {task.priority || 'Low'}
                                            </span>
                                        </div>
                                        <div className="task-column task-assignee" style={{ flex: '1', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <div className="avatar-circle" style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    fontSize: '14px',
                                                    backgroundColor: '#4E9CFF',
                                                    color: 'white'
                                                }}>
                                                    {task.assignee_short || 'UA'}
                                                </div>
                                                <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                                                    {task.assignee_name || 'Unassigned'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="task-column task-created" style={{ flex: '1', textAlign: 'center', fontSize: '14px', color: '#666', paddingRight: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <span style={{ marginRight: '10px' }}>{task.created_at ? task.created_at.split('T')[0] : '2025-04-18'}</span>
                                            <button
                                                className="more-actions"
                                                onClick={(e) => handleTaskMoreActionsClick(e, task.task_id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '5px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: '0.7',
                                                    transition: 'opacity 0.2s'
                                                }}
                                            >
                                                <img src="/assets/icons/more_project_icon.svg" alt="More actions" width="16" height="16" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className="add-existing-btn"
                                        style={{
                                            background: 'white',
                                            color: '#333',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            padding: '10px 20px',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                        onClick={openAddTaskModal}
                                    >
                                        Add an existing task
                                    </button>
                                    <button
                                        className="create-task-btn"
                                        style={{
                                            background: '#4264D0',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '10px 20px',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                        onClick={handleCreateNewTask}
                                    >
                                        Create new task
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hiển thị Task Detail dưới dạng Modal/Popup */}
                {showTaskDetail && selectedTaskData && (
                    <div className="task-detail-overlay" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        zIndex: 9999,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            width: '100%',
                            maxWidth: '800px',
                            height: '80vh',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 16px',
                                borderBottom: '1px solid #eee',
                                backgroundColor: '#f9f9f9'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>
                                    Task Details
                                </h3>
                                <button
                                    onClick={handleCloseTaskDetail}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '18px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{
                                display: 'flex',
                                flex: 1,
                                overflow: 'hidden'
                            }}>
                                {/* Main Task Content */}
                                <div style={{
                                    flex: 2,
                                    padding: '16px',
                                    overflowY: 'auto',
                                    height: 'calc(80vh - 50px)'
                                }}>
                                    <input
                                        type="text"
                                        defaultValue={selectedTaskData.title || ''}
                                        id="task-title-input"
                                        style={{
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            border: '1px solid #ddd',
                                            padding: '6px 10px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            outline: 'none',
                                            marginBottom: '16px'
                                        }}
                                    />

                                    <div style={{ marginBottom: '20px' }}>
                                        <textarea
                                            defaultValue={selectedTaskData.description || ''}
                                            id="task-description-input"
                                            placeholder="Add description..."
                                            style={{
                                                fontSize: '14px',
                                                color: '#666',
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd',
                                                minHeight: '80px',
                                                resize: 'vertical',
                                                outline: 'none'
                                            }}
                                        ></textarea>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Attachments</div>
                                        <div style={{
                                            border: '1px dashed #ddd',
                                            borderRadius: '4px',
                                            padding: '12px',
                                            textAlign: 'center',
                                            color: '#666',
                                            fontSize: '14px'
                                        }}>
                                            {selectedTaskData.attachments && selectedTaskData.attachments.length > 0
                                                ? selectedTaskData.attachments.map((attachment, index) => (
                                                    <div key={index} style={{ marginBottom: '4px' }}>{attachment.name}</div>
                                                ))
                                                : "Drag & drop files, or click to select"
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar */}
                                <div style={{
                                    flex: 1,
                                    minWidth: '200px',
                                    maxWidth: '250px',
                                    padding: '16px',
                                    backgroundColor: '#f5f5f5',
                                    borderLeft: '1px solid #eee',
                                    overflowY: 'auto',
                                    height: 'calc(80vh - 50px)'
                                }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Status</div>
                                        <select
                                            defaultValue={selectedTaskData.status || "TO DO"}
                                            id="task-status-input"
                                            style={{
                                                width: '100%',
                                                padding: '6px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="TO DO">TO DO</option>
                                            <option value="IN PROGRESS">IN PROGRESS</option>
                                            <option value="DONE">DONE</option>
                                            <option value="BACKLOG">BACKLOG</option>
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Assignee</div>
                                        <select
                                            defaultValue={selectedTaskData.assignees && selectedTaskData.assignees.length > 0 ?
                                                selectedTaskData.assignees[0].emailAddress : ""}
                                            id="task-assignee-input"
                                            style={{
                                                width: '100%',
                                                padding: '6px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="">No assignees</option>
                                            {projectMembers.map((member) => (
                                                <option key={member.user_id} value={member.user_email}>
                                                    {`${member.user_first_name || ''} ${member.user_last_name || ''}`.trim() || member.user_email}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Priority:</div>
                                        <select
                                            defaultValue={selectedTaskData.priority || "Mid"}
                                            id="task-priority-input"
                                            style={{
                                                width: '100%',
                                                padding: '6px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="Critical">Critical</option>
                                            <option value="High">High</option>
                                            <option value="Mid">Mid</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Tag</div>
                                        <select
                                            defaultValue={selectedTaskData.task_tag || ""}
                                            id="task-tag-input"
                                            style={{
                                                width: '100%',
                                                padding: '6px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="">NO TAG</option>
                                            <option value="Design">Design</option>
                                            <option value="FE">FE</option>
                                            <option value="BE">BE</option>
                                            <option value="DevOps">DevOps</option>
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Dates:</div>
                                        <div style={{ fontSize: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ marginRight: '8px' }}>📅</span>
                                                <input
                                                    type="date"
                                                    id="task-startdate-input"
                                                    defaultValue={selectedTaskData.startDate ?
                                                        new Date(selectedTaskData.startDate).toISOString().split('T')[0] :
                                                        new Date().toISOString().split('T')[0]
                                                    }
                                                    style={{
                                                        padding: '4px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '14px',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ marginRight: '8px' }}>📅</span>
                                                <input
                                                    type="date"
                                                    id="task-enddate-input"
                                                    defaultValue={selectedTaskData.endDate ?
                                                        new Date(selectedTaskData.endDate).toISOString().split('T')[0] :
                                                        new Date().toISOString().split('T')[0]
                                                    }
                                                    style={{
                                                        padding: '4px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '14px',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                                        <button
                                            onClick={async () => {
                                                // Lấy giá trị từ các trường input
                                                const titleInput = document.getElementById('task-title-input');
                                                const descriptionInput = document.getElementById('task-description-input');
                                                const statusInput = document.getElementById('task-status-input');
                                                const assigneeInput = document.getElementById('task-assignee-input');
                                                const startDateInput = document.getElementById('task-startdate-input');
                                                const endDateInput = document.getElementById('task-enddate-input');
                                                const priorityInput = document.getElementById('task-priority-input');
                                                const tagInput = document.getElementById('task-tag-input');

                                                // Tìm thông tin assignee
                                                const assigneeEmail = assigneeInput.value;
                                                let assigneeData = [];
                                                if (assigneeEmail) {
                                                    const selectedMember = projectMembers.find(member => member.user_email === assigneeEmail);
                                                    if (selectedMember) {
                                                        assigneeData = [{
                                                            name: `${selectedMember.user_first_name || ''} ${selectedMember.user_last_name || ''}`.trim(),
                                                            avatar: "/assets/images/avt.png",
                                                            emailAddress: assigneeEmail
                                                        }];
                                                    }
                                                }

                                                // Đảm bảo sử dụng đúng task_id từ selectedTaskData
                                                const taskId = selectedTaskData.id || selectedTaskData.task_id;

                                                if (!taskId) {
                                                    alert('Không tìm thấy ID của task!');
                                                    return;
                                                }

                                                // Tạo đối tượng cập nhật
                                                const updatedTask = {
                                                    ...selectedTaskData,
                                                    id: taskId,
                                                    task_id: taskId,
                                                    title: titleInput.value,
                                                    description: descriptionInput.value,
                                                    status: statusInput.value,
                                                    assignees: assigneeData,
                                                    startDate: new Date(startDateInput.value),
                                                    endDate: new Date(endDateInput.value),
                                                    priority: priorityInput.value,
                                                    task_tag: tagInput.value,
                                                    module_id: selectedModule // Đảm bảo giữ lại module_id
                                                };

                                                // Gọi hàm cập nhật
                                                await handleTaskUpdate(updatedTask);
                                            }}
                                            style={{
                                                backgroundColor: '#4f46e5',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '8px 16px',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Save changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Thêm hàm xử lý click vào more icon của task
    const handleTaskMoreActionsClick = (event, taskId) => {
        event.stopPropagation(); // Ngăn chặn sự kiện click lan tỏa

        // Tính toán vị trí hiển thị menu
        const rect = event.currentTarget.getBoundingClientRect();
        setTaskMenuPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left - 100 + window.scrollX, // Điều chỉnh vị trí để menu không bị lệch ra ngoài
        });

        // Nếu đang hiển thị menu cho task này, ẩn nó đi
        if (taskMoreActionsId === taskId && showTaskMoreActions) {
            setShowTaskMoreActions(false);
            setTaskMoreActionsId(null);
        } else {
            // Nếu không, hiển thị menu cho task này
            setTaskMoreActionsId(taskId);
            setShowTaskMoreActions(true);
        }
    };

    // Thêm hàm xử lý khi click vào Edit Task trong menu
    const handleEditTaskFromMenu = (taskId) => {
        // Tìm task theo ID
        const taskToEdit = moduleTasks.find(task => task.task_id === taskId);
        if (taskToEdit) {
            // Đóng menu
            setShowTaskMoreActions(false);
            // Mở modal chỉnh sửa task giống như khi click vào task
            handleTaskClick(taskToEdit);
        }
    };

    // Hàm xử lý khi click vào Remove from Module trong menu
    const handleRemoveTaskFromModule = async (taskId) => {
        try {
            if (!projectId || !taskId) {
                alert("Không tìm thấy thông tin task hoặc project");
                return;
            }

            // Hiển thị xác nhận trước khi xóa
            if (window.confirm("Bạn có chắc muốn xóa task này khỏi module không?")) {
                // Đóng menu actions
                setShowTaskMoreActions(false);

                // Gọi API xóa task khỏi module
                await removeTaskFromModule(projectId, taskId);

                // Hiển thị thông báo thành công
                alert("Đã xóa task khỏi module thành công");

                // Tải lại danh sách task trong module để cập nhật giao diện
                if (selectedModule) {
                    await handleViewModuleTasks(selectedModule);
                }
            }
        } catch (error) {
            console.error("Lỗi khi xóa task khỏi module:", error);
            alert(`Không thể xóa task khỏi module: ${error.message}`);
        }
    };

    // Hàm xử lý khi click vào Copy Link trong menu của task
    const handleCopyTaskLink = (taskId) => {
        try {
            // Tạo đường dẫn đến task detail
            const taskDetailUrl = `${window.location.origin}/task-detail/${projectId}/${taskId}`;

            // Copy URL vào clipboard
            navigator.clipboard.writeText(taskDetailUrl)
                .then(() => {
                    // Đóng menu actions
                    setShowTaskMoreActions(false);

                    // Hiển thị thông báo đã copy thành công
                    setShowCopyToast(true);
                    setTimeout(() => {
                        setShowCopyToast(false);
                    }, 2000);
                })
                .catch(err => {
                    console.error('Không thể copy URL: ', err);
                    alert('Không thể copy URL!');
                });
        } catch (error) {
            console.error("Lỗi khi copy link task:", error);
            alert(`Không thể copy link task: ${error.message}`);
        }
    };

    return (
        <div className="modules-container">
            {showModuleDetail ? (
                <ModuleDetailView />
            ) : (
                <>
                    <div className="breadcrumb-container">
                        <span className="breadcrumb">{projectName} / Modules</span>
                    </div>
                    <div className="modules-header">
                        <div className="modules-title">
                            <h1>Modules</h1>
                            <span className="module-emoji" onClick={handleCopyModulePageLink} style={{ cursor: 'pointer' }}>
                                <img src="/assets/icons/copy_link_cycle_icon.svg" alt="Copy link" width="24" height="24" title="Copy link" />
                            </span>
                        </div>
                        <button className="add-module-btn" onClick={openCreateModal}>
                            <span>+</span>
                            <span>Create Module</span>
                        </button>
                    </div>

                    {/* Thông báo đã copy link thành công */}
                    {showCopyToast && (
                        <div className="copy-toast" style={{
                            position: 'fixed',
                            top: '20px',
                            right: '20px',
                            background: '#4CAF50',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            zIndex: 9999,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                        }}>
                            Đường dẫn task đã được sao chép vào clipboard
                        </div>
                    )}

                    <div className="modules-list">
                        {modules.map(renderModuleItem)}
                    </div>
                </>
            )}

            {/* Thông báo thành công khi tạo module */}
            {showSuccessToast && (
                <div className="success-toast" style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    background: 'white',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    zIndex: 9999,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    maxWidth: '400px',
                    border: '1px solid #e0e0e0'
                }}>
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#4CAF50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontWeight: '500', marginBottom: '4px', color: '#333' }}>Success!</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>Module created successfully.</div>
                    </div>
                    <button
                        onClick={() => setShowSuccessToast(false)}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#999'
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Menu More Actions */}
            {showMoreActions && (
                <div
                    className="actions-dropdown"
                    ref={moreActionsRef}
                    style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, position: 'fixed' }}
                >
                    <div className="action-menu-item" onClick={handleEditModule}>
                        <img src="/assets/icons/edit_icon.svg" alt="Edit" />
                        <span>Edit Module</span>
                    </div>
                    <div className="action-menu-item delete" onClick={handleDeleteModuleClick}>
                        <img src="/assets/icons/delete_icon.svg" alt="Delete" />
                        <span>Delete Module</span>
                    </div>
                </div>
            )}

            {/* Menu More Actions cho Task */}
            {showTaskMoreActions && taskMoreActionsId && (
                <div
                    className="actions-dropdown"
                    ref={moreActionsRef}
                    style={{ top: `${taskMenuPosition.top}px`, left: `${taskMenuPosition.left}px`, position: 'fixed', zIndex: 1500 }}
                >
                    <div className="action-menu-item" onClick={() => handleEditTaskFromMenu(taskMoreActionsId)}>
                        <img src="/assets/icons/edit_icon.svg" alt="Edit" />
                        <span>Edit Task</span>
                    </div>
                    <div className="action-menu-item" onClick={() => handleCopyTaskLink(taskMoreActionsId)}>
                        <img src="/assets/icons/link_icon.svg" alt="Copy Link" />
                        <span>Copy Link</span>
                    </div>
                    <div className="action-menu-item delete" onClick={() => handleRemoveTaskFromModule(taskMoreActionsId)}>
                        <img src="/assets/icons/delete_icon.svg" alt="Delete" />
                        <span>Remove from Module</span>
                    </div>
                </div>
            )}

            {/* Modal Tạo Module */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <h2>Create new module</h2>

                        <div className="form-group">
                            <label>Enter module name</label>
                            <input
                                type="text"
                                placeholder="Enter module name"
                                value={moduleName}
                                onChange={(e) => setModuleName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Module Description</label>
                            <textarea
                                placeholder="Describe your module"
                                value={moduleDescription}
                                onChange={(e) => setModuleDescription(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={closeCreateModal}>Cancel</button>
                            <button className="create-btn" onClick={handleCreateModule}>
                                <i className="check-icon"></i> Create module
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Module */}
            {showEditModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <h2>Edit module</h2>

                        <div className="form-group">
                            <label>Module name</label>
                            <input
                                type="text"
                                placeholder="Enter module name"
                                value={moduleName}
                                onChange={(e) => setModuleName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Module Description</label>
                            <textarea
                                placeholder="Describe your module"
                                value={moduleDescription}
                                onChange={(e) => setModuleDescription(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={closeEditModal}>Cancel</button>
                            <button className="create-btn" onClick={handleUpdateModule}>
                                <i className="check-icon"></i> Update module
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Xác nhận xóa Module */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-container" style={{ maxWidth: '450px', padding: '24px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 16px auto' }}>
                                <circle cx="12" cy="12" r="11" stroke="#FF3B30" strokeWidth="2" />
                                <path d="M15.5355 8.46447L8.46447 15.5355" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" />
                                <path d="M15.5355 15.5355L8.46447 8.46447" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <h2 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Are you sure you want to delete?</h2>
                            <p style={{ fontSize: '16px', color: '#666', margin: '0' }}>
                                All data related to this module will be permanently deleted.
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                            <button
                                style={{
                                    padding: '10px 24px',
                                    background: '#F1F1F1',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                                onClick={closeDeleteModal}
                            >
                                No
                            </button>
                            <button
                                style={{
                                    padding: '10px 24px',
                                    background: '#FF3B30',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                                onClick={handleDeleteModule}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add Existing Task */}
            {showAddTaskModal && (
                <div className="modal-overlay">
                    <div className="modal-container" style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '500' }}>Add an existing task</h2>
                            <div className="search-container" style={{ position: 'relative', width: '300px' }}>
                                <input
                                    type="text"
                                    placeholder="Type to search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px 8px 38px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px'
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '18px'
                                }}>
                                    <img src="/assets/icons/search_icon.svg" alt="Search" width="18" height="18" />
                                </div>
                            </div>
                        </div>

                        <div style={{
                            margin: '10px 0 20px',
                            backgroundColor: '#f5f5f5',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: '#666'
                        }}>
                            {selectedTasks.length === 0 ? 'No work items selected' : `${selectedTasks.length} work item${selectedTasks.length > 1 ? 's' : ''} selected`}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                            {isLoadingProjectTasks ? (
                                <div style={{ textAlign: 'center', padding: '30px' }}>
                                    Loading tasks...
                                </div>
                            ) : getFilteredTasks().length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                    No tasks found
                                </div>
                            ) : (
                                <div>
                                    {getFilteredTasks().map(task => (
                                        <div key={task.task_id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '12px 0',
                                            borderBottom: '1px solid #eee'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTasks.includes(task.task_id)}
                                                onChange={() => handleTaskSelection(task.task_id)}
                                                style={{ marginRight: '15px' }}
                                            />
                                            <div style={{
                                                width: '80px',
                                                color: '#444',
                                                fontWeight: '500',
                                                fontSize: '14px'
                                            }}>
                                                {task.task_short ? task.task_short.split('-')[0] : ''}
                                            </div>
                                            <div style={{ flex: 1, fontSize: '14px' }}>
                                                {task.task_name || 'Untitled Task'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <button
                                onClick={closeAddTaskModal}
                                style={{
                                    padding: '8px 16px',
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTaskToModule}
                                disabled={selectedTasks.length === 0}
                                style={{
                                    padding: '8px 16px',
                                    background: selectedTasks.length === 0 ? '#e0e0e0' : '#4264D0',
                                    color: selectedTasks.length === 0 ? '#999' : 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontWeight: '500',
                                    cursor: selectedTasks.length === 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Module;
