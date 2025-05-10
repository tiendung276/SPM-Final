import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../../assets/css/OverView.css';
import axios from 'axios';
import config from '../../config/config';

const { API_BASE_URL } = config;

const OverView = () => {
    const [activeTab, setActiveTab] = useState('To Do');
    const [projectName, setProjectName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { projectId } = useParams();
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState(null);

    // Tạo instance axios với cấu hình chung
    const api = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            accept: "application/json",
        },
        withCredentials: true,
    });

    // Lấy token xác thực từ localStorage hoặc sessionStorage
    const getAccessToken = () => {
        return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
    };

    // Fetch thông tin project nếu có projectId
    useEffect(() => {
        const fetchProjectInfo = async () => {
            if (!projectId) {
                setProjectName('Overview');
                return;
            }

            try {
                setIsLoading(true);
                const accessToken = getAccessToken();

                if (!accessToken) {
                    console.error('Không tìm thấy access token');
                    return;
                }

                const config = {
                    headers: {
                        authentication: accessToken,
                    },
                };

                const response = await api.get(`/projects/${projectId}`, config);
                setProjectName(response.data.project_name || 'Project Overview');
            } catch (error) {
                console.error('Lỗi khi lấy thông tin project:', error);
                setProjectName('Project Overview');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectInfo();
    }, [projectId]);

    // Fetch danh sách task của user
    useEffect(() => {
        const fetchUserTasks = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const accessToken = getAccessToken();

                if (!accessToken) {
                    console.error('Không tìm thấy access token');
                    setError('Không tìm thấy access token, vui lòng đăng nhập lại');
                    return;
                }

                const config = {
                    headers: {
                        authentication: accessToken,
                    },
                };

                // Sử dụng API `/projects/{project_id}/tasks/my/` để lấy các task của user hiện tại
                let tasksUrl;
                if (projectId) {
                    tasksUrl = `/projects/${projectId}/tasks/my/`;
                } else {
                    // Nếu không có projectId, có thể cần sử dụng API khác để lấy tất cả task của user
                    tasksUrl = `/tasks/my`;
                }

                console.log('Đang gọi API tasks của user:', `${API_BASE_URL}${tasksUrl}`);

                const response = await api.get(tasksUrl, config);
                console.log('API Response:', response);

                // Xử lý dữ liệu API trả về
                let userTasks = [];

                if (response.data && Array.isArray(response.data)) {
                    console.log('Dữ liệu task là mảng trực tiếp, số lượng:', response.data.length);
                    userTasks = response.data;
                } else if (response.data && response.data.tasks && Array.isArray(response.data.tasks)) {
                    console.log('Dữ liệu task trong thuộc tính tasks, số lượng:', response.data.tasks.length);
                    userTasks = response.data.tasks;
                }

                console.log('Tasks của user:', userTasks);
                setTasks(userTasks);

            } catch (error) {
                console.error('Lỗi khi lấy danh sách task:', error);
                setError(`Lỗi khi lấy danh sách task: ${error.message}`);

                // Sử dụng dữ liệu mẫu nếu API không hoạt động
                setTasks([
                    { task_id: 1, task_name: 'Thiết kế giao diện', project_name: 'Mobile App', task_status: 'TODO' },
                    { task_id: 2, task_name: 'Xây dựng API', project_name: 'Mobile App', task_status: 'TODO' },
                    { task_id: 3, task_name: 'Phát triển tính năng đăng nhập', project_name: 'Mobile App', task_status: 'IN_PROGRESS' },
                    { task_id: 4, task_name: 'Tích hợp backend', project_name: 'Web App', task_status: 'IN_PROGRESS' },
                    { task_id: 5, task_name: 'Phân tích yêu cầu', project_name: 'Mobile App', task_status: 'DONE' },
                    { task_id: 6, task_name: 'Thiết kế database', project_name: 'Web App', task_status: 'DONE' }
                ]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserTasks();
    }, [projectId]);

    // Lọc task theo trạng thái dựa trên tab đang chọn
    const getFilteredTasks = () => {
        if (!tasks || !Array.isArray(tasks)) return [];

        let statusFilter = '';

        switch (activeTab) {
            case 'To Do':
                statusFilter = 'TODO';
                break;
            case 'In Progress':
                statusFilter = 'IN_PROGRESS';
                break;
            case 'Completed':
                statusFilter = 'DONE';
                break;
            default:
                return [];
        }

        // Lọc task theo trạng thái
        const filteredTasks = tasks.filter(task => {
            // Kiểm tra cả status_name và task_status vì API có thể trả về dữ liệu theo nhiều định dạng khác nhau
            const taskStatus = task.task_status || task.status_name || task.status;
            return taskStatus === statusFilter;
        });

        console.log(`Số lượng task có trạng thái ${statusFilter}:`, filteredTasks.length);
        return filteredTasks;
    };

    // Hàm xử lý khi chuyển tab
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const headerTitle = projectId ? `${projectName} / Overview` : 'Overview';
    const filteredTasks = getFilteredTasks();

    return (
        <div className="overview-container">
            <div className="overview-header">
                <div className="header-path">
                    <span>{headerTitle}</span>
                </div>
                <div className="header-title">
                    <h1>
                        Overview
                        <span className="title-icon">
                            <img src="/assets/icons/copy_link_cycle_icon.svg" alt="Overview Icon" />
                        </span>
                    </h1>
                </div>
            </div>

            <div className="overview-content">
                <div className="my-work-section">
                    <h2>My Work</h2>
                    <div className="tabs">
                        <button
                            className={activeTab === 'To Do' ? 'active' : ''}
                            onClick={() => handleTabChange('To Do')}
                        >
                            To Do
                        </button>
                        <button
                            className={activeTab === 'In Progress' ? 'active' : ''}
                            onClick={() => handleTabChange('In Progress')}
                        >
                            In Progress
                        </button>
                        <button
                            className={activeTab === 'Completed' ? 'active' : ''}
                            onClick={() => handleTabChange('Completed')}
                        >
                            Completed
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="loading-indicator">Đang tải dữ liệu...</div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <div className="task-list-container">
                            {filteredTasks.length > 0 ? (
                                <div className="task-list">
                                    {filteredTasks.map(task => (
                                        <div className="task-item" key={task.task_id || task.id}>
                                            <span>{task.task_name || task.title || task.name}</span>
                                            <span className="task-project">{task.project_name || task.project}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-tasks-message">
                                    Không có task nào trong trạng thái {activeTab}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OverView;
