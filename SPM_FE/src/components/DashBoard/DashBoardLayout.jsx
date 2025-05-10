import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import '../../assets/css/DashBoardLayout.css';
import { getUserProjects, getProjectDetail, getProjectUsers, getProjectCycles } from '../../api/ProjectApi';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Filler, Legend } from 'chart.js';
import { FaLink, FaRegCopy, FaCheck } from 'react-icons/fa';
import config from '../../config/config';

const { API_BASE_URL } = config;

// Đăng ký các thành phần cần thiết của Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

const DashBoardLayout = () => {
    console.log("DashboardLayout rendering...");
    const { projectId } = useParams();
    const location = useLocation();
    const [copied, setCopied] = useState(false);

    // Thêm lệnh log để theo dõi projectId
    useEffect(() => {
        console.log("DashboardLayout mounted/updated with projectId:", projectId);
    }, [projectId]);

    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('Description For This Project');
    const [createdAt, setCreatedAt] = useState('Mar 23, 10:34 PM');
    const [deadline, setDeadline] = useState('Jun 02, 04:01 PM');
    const [createdBy, setCreatedBy] = useState('Hieu Nguyen Minh');

    // State cho current cycle
    const [currentCycle, setCurrentCycle] = useState({
        cycleName: 'Cycle 3',
        createdAt: 'Mar 10, 00:00 PM',
        deadline: 'Mar 30, 0:00 AM',
        createdBy: 'Hieu Nguyen Minh'
    });

    // State cho cycle icon
    const [cycleIcon, setCycleIcon] = useState('');

    // State cho active tab
    const [activeProjectTab, setActiveProjectTab] = useState('all');
    const [activeCycleTab, setActiveCycleTab] = useState('all');

    // State cho số lượng task của project
    const [projectTaskCounts, setProjectTaskCounts] = useState({
        all: 0,
        done: 0,
        progress: 0,
        overdue: 0
    });

    // State cho số lượng task của cycle
    const [cycleTaskCounts, setCycleTaskCounts] = useState({
        all: 0,
        done: 0,
        progress: 0,
        overdue: 0
    });

    // State để lưu trữ dữ liệu biểu đồ cho các loại task
    const [taskChartDataCache, setTaskChartDataCache] = useState({
        all: [33, 53, 66, 70, 45, 33],
        done: [20, 28, 35, 40, 45, 50],
        progress: [5, 8, 12, 15, 8, 10],
        overdue: [0, 1, 2, 3, 1, 3],
        labels: ['Feb 2', 'Feb 12', 'Feb 22', 'Mar 4', 'Mar 14', 'Now']
    });

    // State cho dữ liệu biểu đồ cycle theo loại
    const [cycleChartDataCache, setCycleChartDataCache] = useState({
        all: [5, 8, 12, 9, 6, 4],
        done: [0, 1, 2, 3, 4, 5],
        progress: [2, 3, 5, 6, 7, 7],
        overdue: [0, 0, 0, 0, 0, 0],
        labels: ['Mar 2', 'Mar 8', 'Mar 14', 'Mar 20', 'Mar 24', 'Now']
    });

    // State cho danh sách thành viên dự án
    const [projectMembers, setProjectMembers] = useState([]);

    // State cho dữ liệu biểu đồ analytics
    const [analyticsData, setAnalyticsData] = useState({
        labels: [],
        datasets: [
            {
                label: 'Tasks',
                data: [],
                backgroundColor: '#3b82f6',
                borderRadius: 6,
                borderWidth: 0,
                barThickness: 20,
            }
        ]
    });

    // State để lưu trữ thông tin avatar user
    const [userAvatars, setUserAvatars] = useState([]);

    // State cho dữ liệu biểu đồ project
    const [projectChartData, setProjectChartData] = useState({
        labels: ['Feb 2', 'Feb 12', 'Feb 22', 'Mar 4', 'Mar 14', 'Now'],
        datasets: [
            {
                fill: true,
                label: 'Tasks',
                data: [33, 53, 66, 70, 45, 33],
                borderColor: '#5856d6',
                backgroundColor: 'rgba(88, 86, 214, 0.1)',
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#5856d6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 8,
            }
        ]
    });

    // State cho dữ liệu biểu đồ cycle
    const [cycleChartData, setCycleChartData] = useState({
        labels: ['Mar 2', 'Mar 8', 'Mar 14', 'Mar 20', 'Mar 24', 'Now'],
        datasets: [
            {
                fill: true,
                label: 'Tasks',
                data: [5, 8, 12, 9, 6, 4],
                borderColor: '#5856d6',
                backgroundColor: 'rgba(88, 86, 214, 0.1)',
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#5856d6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 8,
            }
        ]
    });

    // Cấu hình cho biểu đồ
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#333',
                titleFont: {
                    size: 14,
                    weight: 'bold',
                },
                bodyFont: {
                    size: 12,
                },
                padding: 10,
                displayColors: false,
                callbacks: {
                    title: function (context) {
                        return context[0].label;
                    },
                    label: function (context) {
                        return `Tasks: ${context.raw}`;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    display: false,
                }
            },
            y: {
                min: 0,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    stepSize: 20,
                    font: {
                        size: 10,
                    },
                    color: '#999',
                }
            }
        },
        elements: {
            line: {
                borderWidth: 3,
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    // Cấu hình cho biểu đồ analytics
    const analyticsOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#333',
                titleFont: {
                    size: 14,
                    weight: 'bold',
                },
                bodyFont: {
                    size: 12,
                },
                padding: 10,
                displayColors: false,
                callbacks: {
                    title: function (context) {
                        return context[0].label;
                    },
                    label: function (context) {
                        return `Tasks: ${context.raw}`;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    stepSize: 10,
                    font: {
                        size: 10,
                    },
                    color: '#999',
                }
            },
            y: {
                grid: {
                    display: false,
                },
                ticks: {
                    font: {
                        size: 12,
                    },
                    color: '#666',
                }
            }
        },
        layout: {
            padding: {
                left: 10,
                right: 10
            }
        }
    };

    useEffect(() => {
        // Lấy thông tin project nếu có projectId
        const fetchProjectInfo = async () => {
            if (projectId) {
                try {
                    // Lấy thông tin cơ bản của dự án
                    const projects = await getUserProjects();
                    const project = projects.find(p => p.project_id.toString() === projectId);

                    if (project) {
                        setProjectName(project.project_name);

                        // Cập nhật các thông tin khác nếu có
                        if (project.project_description) {
                            setProjectDescription(project.project_description);
                        } else if (project.description) {
                            setProjectDescription(project.description);
                        }

                        // Định dạng ngày tạo nếu có
                        if (project.created_at) {
                            const createdDate = new Date(project.created_at);
                            setCreatedAt(formatDate(createdDate));
                        }

                        // Định dạng deadline nếu có
                        if (project.deadline) {
                            const deadlineDate = new Date(project.deadline);
                            setDeadline(formatDate(deadlineDate));
                        }

                        // Lấy thông tin chi tiết hơn của dự án (nếu cần)
                        try {
                            const projectDetail = await getProjectDetail(projectId);
                            console.log("Chi tiết dự án:", projectDetail);

                            // Cập nhật mô tả nếu có
                            if (projectDetail.description) {
                                setProjectDescription(projectDetail.description);
                            }
                        } catch (detailError) {
                            console.error("Không thể lấy thông tin chi tiết dự án:", detailError);
                        }

                        // Lấy danh sách người dùng để tìm người tạo dự án
                        try {
                            const projectUsers = await getProjectUsers(projectId);
                            console.log("Danh sách người dùng dự án:", projectUsers);

                            // Lưu danh sách thành viên dự án
                            setProjectMembers(projectUsers);

                            // Tìm người có vai trò OWNER (thường là người tạo dự án)
                            const owner = projectUsers.find(user => user.role === "OWNER");
                            if (owner) {
                                // Dựa vào cấu trúc dữ liệu API, có thể có các field khác nhau chứa tên
                                if (owner.user_name) {
                                    setCreatedBy(owner.user_name);
                                } else if (owner.name) {
                                    setCreatedBy(owner.name);
                                } else if (owner.user_first_name) {
                                    // Nếu có cả họ và tên
                                    setCreatedBy(`${owner.user_first_name} ${owner.user_last_name || ''}`);
                                } else if (owner.first_name) {
                                    setCreatedBy(`${owner.first_name} ${owner.last_name || ''}`);
                                } else if (owner.email) {
                                    // Sử dụng email nếu không có tên
                                    setCreatedBy(owner.email);
                                }
                            }
                        } catch (usersError) {
                            console.error("Không thể lấy danh sách người dùng dự án:", usersError);
                        }

                        // Lấy danh sách cycles để tìm cycle hiện tại
                        try {
                            const cycles = await getProjectCycles(projectId);
                            console.log("Danh sách cycles của dự án:", cycles);

                            if (cycles && cycles.length > 0) {
                                // Lấy ngày hiện tại
                                const today = new Date();

                                // Tìm cycle có khoảng thời gian chứa ngày hiện tại
                                const current = cycles.find(cycle => {
                                    const startDate = new Date(cycle.start_date);
                                    const endDate = new Date(cycle.end_date);
                                    return today >= startDate && today <= endDate;
                                });

                                // Nếu tìm thấy cycle hiện tại, cập nhật state
                                if (current) {
                                    console.log("Tìm thấy cycle hiện tại:", current);
                                    setCurrentCycle({
                                        cycleName: current.cycle_name || 'Current Cycle',
                                        createdAt: formatDate(new Date(current.created_at || current.start_date)),
                                        deadline: formatDate(new Date(current.end_date)),
                                        createdBy: createdBy // Sử dụng owner của project làm người tạo cycle
                                    });

                                    // Cập nhật icon nếu có
                                    if (current.cycle_icon) {
                                        setCycleIcon(current.cycle_icon);
                                    } else {
                                        setCycleIcon('/assets/icons/cycle_icon.svg'); // Đường dẫn mặc định
                                    }

                                    // Tính toán số lượng task trong cycle
                                    fetchCycleTasks(projectId, current.cycle_id);
                                } else {
                                    console.log("Không tìm thấy cycle hiện tại, sử dụng cycle gần nhất");
                                    // Nếu không tìm thấy cycle hiện tại, sử dụng cycle mới nhất
                                    // Sắp xếp cycles theo thời gian bắt đầu, lấy cycle mới nhất
                                    const sortedCycles = [...cycles].sort((a, b) =>
                                        new Date(b.start_date) - new Date(a.start_date)
                                    );

                                    if (sortedCycles.length > 0) {
                                        const latest = sortedCycles[0];
                                        setCurrentCycle({
                                            cycleName: latest.cycle_name || 'Latest Cycle',
                                            createdAt: formatDate(new Date(latest.created_at || latest.start_date)),
                                            deadline: formatDate(new Date(latest.end_date)),
                                            createdBy: createdBy // Sử dụng owner của project làm người tạo cycle
                                        });

                                        // Cập nhật icon nếu có
                                        if (latest.cycle_icon) {
                                            setCycleIcon(latest.cycle_icon);
                                        } else {
                                            setCycleIcon('/assets/icons/cycle_icon.svg'); // Đường dẫn mặc định
                                        }

                                        // Tính toán số lượng task trong cycle
                                        fetchCycleTasks(projectId, latest.cycle_id);
                                    }
                                }
                            }
                        } catch (cyclesError) {
                            console.error("Không thể lấy danh sách cycles:", cyclesError);
                        }

                        // Lấy và tính toán số lượng task của project
                        fetchProjectTasks(projectId);
                    }
                } catch (error) {
                    console.error("Error fetching project info:", error);
                }
            }
        };

        fetchProjectInfo();

        // Cleanup function khi component unmount
        return () => {
            // Reset các state khi unmount để tránh hiển thị dữ liệu cũ
            console.log("Dashboard component unmounting, cleaning up...");
            setProjectTaskCounts({
                all: 0,
                done: 0,
                progress: 0,
                overdue: 0
            });
            setCycleTaskCounts({
                all: 0,
                done: 0,
                progress: 0,
                overdue: 0
            });
            setUserAvatars([]);
            setAnalyticsData({
                labels: [],
                datasets: [{
                    label: 'Tasks',
                    data: [],
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 20,
                }]
            });
        };
    }, [projectId, createdBy]);

    // Hàm lấy và tính toán số task của project
    const fetchProjectTasks = async (projectId) => {
        try {
            // Giả lập API call để lấy danh sách task của project 
            // Thay bằng API thực tế khi có
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks/0/1000`, {
                headers: {
                    authentication: localStorage.getItem('access_token') || sessionStorage.getItem('access_token'),
                    accept: "application/json"
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch project tasks');
            }

            const data = await response.json();
            const tasks = Array.isArray(data) ? data : (data.tasks || []);

            const now = new Date();

            // Tính toán số lượng task theo trạng thái
            const counts = {
                all: tasks.length,
                done: tasks.filter(task => task.task_status === "DONE").length,
                progress: tasks.filter(task => task.task_status === "IN_PROGRESS").length,
                overdue: tasks.filter(task => {
                    const taskDeadline = new Date(task.end_date);
                    return taskDeadline < now && task.task_status !== "DONE";
                }).length
            };

            console.log("Số lượng task của project:", counts);
            setProjectTaskCounts(counts);

            // Tính toán dữ liệu cho biểu đồ
            generateProjectChartData(tasks);

            // Tính toán dữ liệu cho Task Analytics
            generateAnalyticsData(tasks);

        } catch (error) {
            console.error("Lỗi khi lấy danh sách task của project:", error);
            // Nếu có lỗi, sử dụng dữ liệu demo
            setProjectTaskCounts({
                all: 80,
                done: 50,
                progress: 10,
                overdue: 3
            });
        }
    };

    // Function to generate data for project chart
    const generateProjectChartData = (tasks) => {
        if (!tasks || tasks.length === 0) return;

        try {
            // Time points for chart (7 time points for 15 days)
            const today = new Date();
            const fifteenDaysAgo = new Date(today);
            fifteenDaysAgo.setDate(today.getDate() - 15);

            const timePoints = [];
            const timeLabels = [];
            const interval = 6; // divide into 6 intervals (7 points)

            for (let i = 0; i <= interval; i++) {
                const date = new Date(fifteenDaysAgo);
                date.setDate(fifteenDaysAgo.getDate() + Math.floor(i * 15 / interval));

                if (i === interval) {
                    timePoints.push(today);
                    timeLabels.push(`${today.toLocaleString('en-US', { month: 'short' })} ${today.getDate()}`);
                } else {
                    timePoints.push(date);
                    timeLabels.push(`${date.toLocaleString('en-US', { month: 'short' })} ${date.getDate()}`);
                }
            }

            // Count tasks for each time point
            const allTaskCounts = timePoints.map(date => {
                return tasks.filter(task => new Date(task.created_at) <= date).length;
            });

            const doneTaskCounts = timePoints.map(date => {
                return tasks.filter(task =>
                    task.task_status === 'DONE' && new Date(task.end_date) <= date
                ).length;
            });

            const progressTaskCounts = timePoints.map(date => {
                return tasks.filter(task =>
                    task.task_status === 'IN_PROGRESS' && new Date(task.created_at) <= date
                ).length;
            });

            const overdueTaskCounts = timePoints.map(date => {
                return tasks.filter(task => {
                    const taskDeadline = new Date(task.end_date);
                    return taskDeadline < date && task.task_status !== "DONE";
                }).length;
            });

            console.log("Project chart data created:", {
                labels: timeLabels,
                all: allTaskCounts,
                done: doneTaskCounts,
                progress: progressTaskCounts,
                overdue: overdueTaskCounts
            });

            // Update chart state
            setProjectChartData(prev => ({
                ...prev,
                labels: timeLabels,
                datasets: [{
                    ...prev.datasets[0],
                    data: allTaskCounts,
                    borderColor: '#ff9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.1)',
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: '#ff9500',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                }]
            }));

            // Store data for other task types to use when switching tabs
            setTaskChartDataCache({
                all: allTaskCounts,
                done: doneTaskCounts,
                progress: progressTaskCounts,
                overdue: overdueTaskCounts,
                labels: timeLabels
            });

        } catch (error) {
            console.error("Error creating chart data:", error);
            // In case of error, initialize with empty data
            setProjectChartData(prev => ({
                ...prev,
                labels: [],
                datasets: [{
                    ...prev.datasets[0],
                    data: [],
                }]
            }));
            setTaskChartDataCache({
                all: [],
                done: [],
                progress: [],
                overdue: [],
                labels: []
            });
        }
    };

    // Hàm tạo dữ liệu cho Task Analytics
    const generateAnalyticsData = async (tasks) => {
        console.log("Đang tạo dữ liệu Task Analytics với số task:", tasks?.length || 0);

        if (!tasks || tasks.length === 0 || !projectMembers || projectMembers.length === 0) {
            console.log("Không đủ dữ liệu để tạo biểu đồ Task Analytics");
            // Thay dữ liệu mẫu bằng dữ liệu rỗng
            setAnalyticsData({
                labels: [],
                datasets: [{
                    label: 'Tasks',
                    data: [],
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 20,
                }]
            });

            // Không hiển thị avatar khi không có dữ liệu
            setUserAvatars([]);

            return;
        }

        try {
            console.log("Đang lấy assignees cho các task...");
            // Lấy danh sách task có assignees từ API
            const tasksWithAssignees = await Promise.all(
                tasks.map(async (task) => {
                    try {
                        const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
                        if (!accessToken) {
                            throw new Error('No access token found');
                        }

                        const config = {
                            headers: {
                                authentication: accessToken,
                                accept: "application/json"
                            }
                        };

                        // Lấy assignees cho mỗi task
                        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks/${task.task_id}/assignees`, config);
                        if (!response.ok) {
                            console.log(`Không thể lấy assignees cho task ${task.task_id}, response status:`, response.status);
                            return { ...task, assignees: [] };
                        }

                        const assignees = await response.json();
                        return { ...task, assignees: Array.isArray(assignees) ? assignees : [] };
                    } catch (error) {
                        console.error(`Lỗi khi lấy assignees cho task ${task.task_id}:`, error);
                        return { ...task, assignees: [] };
                    }
                })
            );

            console.log("Tổng số task có assignees:", tasksWithAssignees.length);
            console.log("Số lượng task có ít nhất 1 assignee:", tasksWithAssignees.filter(task => task.assignees && task.assignees.length > 0).length);

            // Tạo map đếm số lượng task cho mỗi user
            const userTaskCounts = new Map();
            const userInfoMap = new Map();

            // Khởi tạo số lượng task cho mỗi thành viên là 0
            projectMembers.forEach(member => {
                const firstName = member.user_first_name || '';
                const lastName = member.user_last_name || '';
                const email = member.user_email || '';

                // Tạo fullname từ firstName và lastName
                let fullname = '';
                if (firstName && lastName) {
                    fullname = `${firstName} ${lastName}`;
                } else if (firstName) {
                    fullname = firstName;
                } else if (lastName) {
                    fullname = lastName;
                } else if (email) {
                    fullname = email.split('@')[0];
                } else {
                    fullname = 'Không có tên';
                }

                // Lấy chữ cái đầu tiên của tên làm avatar
                let firstChar = '?';
                if (firstName) {
                    firstChar = firstName.charAt(0).toUpperCase();
                } else if (lastName) {
                    firstChar = lastName.charAt(0).toUpperCase();
                } else if (email) {
                    firstChar = email.charAt(0).toUpperCase();
                }

                userTaskCounts.set(fullname, 0);
                userInfoMap.set(fullname, {
                    name: fullname,
                    avatar: firstChar,
                    avatarImg: member.avatar_url || null,
                    email: email
                });
            });

            // Đếm số lượng task cho mỗi user
            tasksWithAssignees.forEach(task => {
                if (task.assignees && task.assignees.length > 0) {
                    task.assignees.forEach(assignee => {
                        const firstName = assignee.user_first_name || '';
                        const lastName = assignee.user_last_name || '';
                        const email = assignee.user_email || '';

                        // Tạo fullname từ firstName và lastName
                        let fullname = '';
                        if (firstName && lastName) {
                            fullname = `${firstName} ${lastName}`;
                        } else if (firstName) {
                            fullname = firstName;
                        } else if (lastName) {
                            fullname = lastName;
                        } else if (email) {
                            fullname = email.split('@')[0];
                        } else {
                            fullname = 'Không có tên';
                        }

                        // Lấy chữ cái đầu tiên của tên làm avatar
                        let firstChar = '?';
                        if (firstName) {
                            firstChar = firstName.charAt(0).toUpperCase();
                        } else if (lastName) {
                            firstChar = lastName.charAt(0).toUpperCase();
                        } else if (email) {
                            firstChar = email.charAt(0).toUpperCase();
                        }

                        if (userTaskCounts.has(fullname)) {
                            userTaskCounts.set(fullname, userTaskCounts.get(fullname) + 1);
                        } else {
                            userTaskCounts.set(fullname, 1);
                            userInfoMap.set(fullname, {
                                name: fullname,
                                avatar: firstChar,
                                avatarImg: assignee.avatar_url || null,
                                email: email
                            });
                        }
                    });
                }
            });

            console.log("Tổng số người dùng có task:", userTaskCounts.size);

            // Chuyển đổi map thành arrays cho chart
            const sortedEntries = [...userTaskCounts.entries()]
                .sort((a, b) => b[1] - a[1]) // Sắp xếp giảm dần theo số lượng task
                .slice(0, 10); // Lấy 10 người có nhiều task nhất

            const labels = sortedEntries.map(entry => entry[0]);
            const data = sortedEntries.map(entry => entry[1]);

            console.log("Dữ liệu biểu đồ Task Analytics:", {
                labels,
                data
            });

            // Lưu thông tin avatar cho các user có trong biểu đồ
            const avatarData = labels.map(name => ({
                name,
                ...userInfoMap.get(name)
            }));

            setUserAvatars(avatarData);

            // Tạo màu dựa trên avatar cho biểu đồ
            const barColors = avatarData.map(user => getAvatarColor(user.avatar));

            // Cập nhật state cho biểu đồ analytics
            setAnalyticsData({
                labels,
                datasets: [{
                    label: 'Tasks',
                    data,
                    backgroundColor: barColors,
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 20,
                }]
            });

            console.log("Dữ liệu biểu đồ Task Analytics đã được cập nhật thành công");

        } catch (error) {
            console.error("Lỗi khi tạo dữ liệu cho Task Analytics:", error);
            // Sử dụng dữ liệu rỗng thay vì dữ liệu mẫu khi có lỗi
            setAnalyticsData({
                labels: [],
                datasets: [{
                    label: 'Tasks',
                    data: [],
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 20,
                }]
            });

            // Không hiển thị avatar khi có lỗi
            setUserAvatars([]);
        }
    };

    // Function to get and calculate the number of tasks in a cycle
    const fetchCycleTasks = async (projectId, cycleId) => {
        try {
            // API to get the list of tasks within the cycle timeframe
            // Need to implement actual API
            console.log(`Getting tasks for cycle ${cycleId}`);

            // Simulate API call
            const response = await fetch(`${API_BASE_URL}/projects/${projectId}/cycles/${cycleId}/tasks`, {
                headers: {
                    authentication: localStorage.getItem('access_token') || sessionStorage.getItem('access_token'),
                    accept: "application/json"
                }
            });

            if (!response.ok) {
                // If API doesn't exist, use alternative method to get information
                return fetchCycleTasksAlternative(projectId, cycleId);
            }

            const tasks = await response.json();
            const now = new Date();

            // Calculate number of tasks by status
            const counts = {
                all: tasks.length,
                done: tasks.filter(task => task.task_status === "DONE").length,
                progress: tasks.filter(task => task.task_status === "IN_PROGRESS").length,
                overdue: tasks.filter(task => {
                    const taskDeadline = new Date(task.end_date);
                    return taskDeadline < now && task.task_status !== "DONE";
                }).length
            };

            console.log("Number of tasks in cycle:", counts);
            setCycleTaskCounts(counts);

            // Get cycle time information
            const cycleResponse = await fetch(`${API_BASE_URL}/projects/${projectId}/cycles/${cycleId}`, {
                headers: {
                    authentication: localStorage.getItem('access_token') || sessionStorage.getItem('access_token'),
                    accept: "application/json"
                }
            });

            if (cycleResponse.ok) {
                const cycleData = await cycleResponse.json();
                const cycleStart = new Date(cycleData.start_date);
                const cycleEnd = new Date(cycleData.end_date);

                // Create chart for cycle from tasks data and cycle time
                generateCycleChartData(tasks, cycleStart, cycleEnd);
            }

        } catch (error) {
            console.error("Error getting cycle task list:", error);
            // Try alternative method if API doesn't work
            fetchCycleTasksAlternative(projectId, cycleId);
        }
    };

    // Alternative method to calculate number of tasks in a cycle
    const fetchCycleTasksAlternative = async (projectId, cycleId) => {
        try {
            // Get detailed information about the cycle to know the timeframe
            const cycleResponse = await fetch(`${API_BASE_URL}/projects/${projectId}/cycles/${cycleId}`, {
                headers: {
                    authentication: localStorage.getItem('access_token') || sessionStorage.getItem('access_token'),
                    accept: "application/json"
                }
            });

            if (!cycleResponse.ok) {
                throw new Error('Failed to fetch cycle details');
            }

            const cycleData = await cycleResponse.json();
            const cycleStart = new Date(cycleData.start_date);
            const cycleEnd = new Date(cycleData.end_date);

            // Get all tasks of the project
            const taskResponse = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks/0/1000`, {
                headers: {
                    authentication: localStorage.getItem('access_token') || sessionStorage.getItem('access_token'),
                    accept: "application/json"
                }
            });

            if (!taskResponse.ok) {
                throw new Error('Failed to fetch project tasks');
            }

            const taskData = await taskResponse.json();
            const allTasks = Array.isArray(taskData) ? taskData : (taskData.tasks || []);

            // Filter tasks within the cycle timeframe
            const cycleTasks = allTasks.filter(task => {
                const taskStart = new Date(task.start_date);
                const taskEnd = new Date(task.end_date);

                // Task is considered part of the cycle if:
                // 1. Task starts within the cycle timeframe
                // 2. Task ends within the cycle timeframe
                // 3. Task covers the entire cycle timeframe
                return (taskStart >= cycleStart && taskStart <= cycleEnd) ||
                    (taskEnd >= cycleStart && taskEnd <= cycleEnd) ||
                    (taskStart <= cycleStart && taskEnd >= cycleEnd);
            });

            const now = new Date();

            // Calculate number of tasks by status
            const counts = {
                all: cycleTasks.length,
                done: cycleTasks.filter(task => task.task_status === "DONE").length,
                progress: cycleTasks.filter(task => task.task_status === "IN_PROGRESS").length,
                overdue: cycleTasks.filter(task => {
                    const taskDeadline = new Date(task.end_date);
                    return taskDeadline < now && task.task_status !== "DONE";
                }).length
            };

            console.log("Number of tasks in cycle (alternative method):", counts);
            setCycleTaskCounts(counts);

            // Create chart data for cycle based on actual tasks
            generateCycleChartData(cycleTasks, cycleStart, cycleEnd);

        } catch (error) {
            console.error("Error calculating cycle tasks:", error);
            // If there's an error, use demo data
            setCycleTaskCounts({
                all: 14,
                done: 5,
                progress: 7,
                overdue: 0
            });
        }
    };

    // Function to generate data for cycle chart
    const generateCycleChartData = (cycleTasks, cycleStart, cycleEnd) => {
        if (!cycleTasks || cycleTasks.length === 0 || !cycleStart || !cycleEnd) return;

        try {
            console.log("Creating cycle chart data with", cycleTasks.length, "tasks");

            // Calculate time points within the cycle range
            const timePoints = [];
            const timeLabels = [];
            const interval = 5; // divide into 5 intervals (6 points)

            const cycleRange = cycleEnd.getTime() - cycleStart.getTime();
            const today = new Date();
            const intervalMs = cycleRange / interval;

            for (let i = 0; i <= interval; i++) {
                const pointDate = new Date(cycleStart.getTime() + (i * intervalMs));

                // Ensure date doesn't exceed cycle end date
                const date = pointDate > cycleEnd ? cycleEnd : pointDate;

                if (i === interval) {
                    // Last point is cycle end date
                    timePoints.push(cycleEnd);
                    timeLabels.push(`${cycleEnd.toLocaleString('en-US', { month: 'short' })} ${cycleEnd.getDate()}`);
                } else {
                    timePoints.push(date);
                    timeLabels.push(`${date.toLocaleString('en-US', { month: 'short' })} ${date.getDate()}`);
                }
            }

            // Count tasks at each time point
            const allTaskCounts = timePoints.map(date => {
                return cycleTasks.filter(task => new Date(task.created_at) <= date).length;
            });

            const doneTaskCounts = timePoints.map(date => {
                return cycleTasks.filter(task =>
                    task.task_status === 'DONE' && new Date(task.end_date) <= date
                ).length;
            });

            const progressTaskCounts = timePoints.map(date => {
                return cycleTasks.filter(task =>
                    task.task_status === 'IN_PROGRESS' && new Date(task.created_at) <= date
                ).length;
            });

            const overdueTaskCounts = timePoints.map(date => {
                return cycleTasks.filter(task => {
                    const taskDeadline = new Date(task.end_date);
                    return taskDeadline < date && task.task_status !== "DONE";
                }).length;
            });

            console.log("Generated cycle chart data:", {
                labels: timeLabels,
                all: allTaskCounts,
                done: doneTaskCounts,
                progress: progressTaskCounts,
                overdue: overdueTaskCounts
            });

            // Update state for cycle chart
            setCycleChartData(prev => ({
                labels: timeLabels,
                datasets: [{
                    ...prev.datasets[0],
                    data: allTaskCounts,
                    borderColor: '#ff9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.1)',
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: '#ff9500',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                }]
            }));

            // Save to cache for tab switching
            setCycleChartDataCache({
                all: allTaskCounts,
                done: doneTaskCounts,
                progress: progressTaskCounts,
                overdue: overdueTaskCounts,
                labels: timeLabels
            });

            // Reset tab to 'all'
            setActiveCycleTab('all');

        } catch (error) {
            console.error("Error creating cycle chart data:", error);
        }
    };

    // Date formatting function
    const formatDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;

        return `${month} ${day}, ${formattedHours}:${minutes} ${ampm}`;
    };

    // Function to create color for avatar based on character
    const getAvatarColor = (char) => {
        // List of fixed attractive colors for avatars
        const colors = [
            '#f44336', '#e91e63', '#9c27b0', '#673ab7',
            '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
            '#009688', '#4caf50', '#8bc34a', '#cddc39',
            '#ffc107', '#ff9800', '#ff5722', '#795548'
        ];

        // If no character, return default color
        if (!char || char === '?') {
            return '#757575'; // gray color
        }

        // Calculate color index based on character code of first character
        const charCode = char.charCodeAt(0);
        return colors[charCode % colors.length];
    };

    // Update chart data function when tab changes
    useEffect(() => {
        // Use data from cache if available
        if (taskChartDataCache) {
            let projectData;
            let borderColor = '#5856d6'; // default color
            let backgroundColor = 'rgba(88, 86, 214, 0.1)'; // default color

            switch (activeProjectTab) {
                case 'done':
                    projectData = taskChartDataCache.done;
                    borderColor = '#ff3b30'; // red color for Done
                    backgroundColor = 'rgba(255, 59, 48, 0.1)';
                    break;
                case 'progress':
                    projectData = taskChartDataCache.progress;
                    borderColor = '#3b3bdc'; // blue color for In Progress
                    backgroundColor = 'rgba(59, 59, 220, 0.1)';
                    break;
                case 'overdue':
                    projectData = taskChartDataCache.overdue;
                    borderColor = '#ff2d55'; // pink color for Overdue
                    backgroundColor = 'rgba(255, 45, 85, 0.1)';
                    break;
                default: // 'all'
                    projectData = taskChartDataCache.all;
                    borderColor = '#ff9500'; // orange color for All
                    backgroundColor = 'rgba(255, 149, 0, 0.1)';
            }

            setProjectChartData(prev => ({
                ...prev,
                labels: taskChartDataCache.labels,
                datasets: [{
                    ...prev.datasets[0],
                    data: projectData,
                    borderColor,
                    backgroundColor,
                    pointBackgroundColor: borderColor
                }]
            }));
        }
    }, [activeProjectTab, taskChartDataCache]);

    // Update cycle chart data when tab changes
    useEffect(() => {
        // Change data for cycle chart based on selected tab
        let cycleData;
        let borderColor = '#5856d6'; // default color
        let backgroundColor = 'rgba(88, 86, 214, 0.1)'; // default color

        switch (activeCycleTab) {
            case 'done':
                cycleData = cycleChartDataCache.done;
                borderColor = '#ff3b30'; // red color for Done
                backgroundColor = 'rgba(255, 59, 48, 0.1)';
                break;
            case 'progress':
                cycleData = cycleChartDataCache.progress;
                borderColor = '#3b3bdc'; // blue color for In Progress
                backgroundColor = 'rgba(59, 59, 220, 0.1)';
                break;
            case 'overdue':
                cycleData = cycleChartDataCache.overdue;
                borderColor = '#ff2d55'; // pink color for Overdue
                backgroundColor = 'rgba(255, 45, 85, 0.1)';
                break;
            default: // 'all'
                cycleData = cycleChartDataCache.all;
                borderColor = '#ff9500'; // orange color for All
                backgroundColor = 'rgba(255, 149, 0, 0.1)';
        }

        setCycleChartData(prev => ({
            ...prev,
            labels: cycleChartDataCache.labels,
            datasets: [{
                ...prev.datasets[0],
                data: cycleData,
                borderColor,
                backgroundColor,
                pointBackgroundColor: borderColor
            }]
        }));
    }, [activeCycleTab, cycleChartDataCache]);

    // Hàm copy link dashboard
    const copyDashboardLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Không thể copy link:', err);
                alert('Không thể copy link!');
            });
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="breadcrumb">{projectName ? `${projectName} / Dashboard` : 'Dashboard'}</div>
                <h1>
                    Dashboard
                    <div className="copy-link-icon" onClick={copyDashboardLink} title="Copy link">
                        {copied ? <FaCheck className="check-icon" /> : <FaLink />}
                    </div>
                </h1>
            </div>

            <div className="dashboard-content">
                <div className="card project-card">
                    <div className="card-content">
                        <div className="project-title">{projectName || 'Project Name'}</div>
                        <div className="project-description">{projectDescription}</div>

                        <div className="project-info">
                            <div className="info-item">
                                <div className="info-label">Created</div>
                                <div className="info-value">{createdAt}</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Deadline</div>
                                <div className="info-value">{deadline}</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Created by</div>
                                <div className="info-value">{createdBy}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card cycle-card">
                    <div className="cycle-box">
                        <div className="cube-icon">
                            {cycleIcon ? (
                                <img src={cycleIcon} alt="Cycle icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                '⬚'
                            )}
                        </div>
                        <span className="cycle-title">{currentCycle.cycleName}</span>
                    </div>
                    <div className="cycle-info">
                        <div className="info-item">
                            <div className="info-label">Created</div>
                            <div className="info-value">{currentCycle.createdAt}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Deadline</div>
                            <div className="info-value">{currentCycle.deadline}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Created by</div>
                            <div className="info-value">{currentCycle.createdBy}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="card project-overview-card">
                    <div className="card-header">
                        Project Overview
                        <div className="task-indicator">
                            <div className="task-label">Tasks: {
                                activeProjectTab === 'all' ? projectTaskCounts.all :
                                    activeProjectTab === 'done' ? projectTaskCounts.done :
                                        activeProjectTab === 'progress' ? projectTaskCounts.progress :
                                            projectTaskCounts.overdue
                            }</div>
                            <div className="date-label">Date: {formatDate(new Date()).split(',')[0]}</div>
                        </div>
                    </div>
                    <div className="tab-container">
                        <div className="tabs">
                            <div
                                className={`tab ${activeProjectTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveProjectTab('all')}
                            >
                                All Tasks
                            </div>
                            <div
                                className={`tab ${activeProjectTab === 'done' ? 'active' : ''}`}
                                onClick={() => setActiveProjectTab('done')}
                            >
                                Done Tasks
                            </div>
                            <div
                                className={`tab tab-progress ${activeProjectTab === 'progress' ? 'active' : ''}`}
                                onClick={() => setActiveProjectTab('progress')}
                            >
                                In Progress Tasks
                            </div>
                            <div
                                className={`tab ${activeProjectTab === 'overdue' ? 'active' : ''}`}
                                onClick={() => setActiveProjectTab('overdue')}
                            >
                                Over Due Tasks
                            </div>
                        </div>
                        <div className="task-counts">
                            <div className={`count-item all ${activeProjectTab === 'all' ? 'active' : ''}`}>
                                {projectTaskCounts.all}
                            </div>
                            <div className={`count-item done ${activeProjectTab === 'done' ? 'active' : ''}`}>
                                {projectTaskCounts.done}
                            </div>
                            <div className={`count-item progress ${activeProjectTab === 'progress' ? 'active' : ''}`}>
                                {projectTaskCounts.progress}
                            </div>
                            <div className={`count-item overdue ${activeProjectTab === 'overdue' ? 'active' : ''}`}>
                                {projectTaskCounts.overdue}
                            </div>
                        </div>
                    </div>
                    <div className="chart-container">
                        <div className="chart">
                            <Line data={projectChartData} options={chartOptions} />
                        </div>
                        <div className="chart-labels">
                            {projectChartData.labels.map((label, index) => (
                                <span key={index}>{label}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card analytics-card">
                    <div className="card-header">Task Analytics</div>
                    <div className="task-count-label">Tasks: {projectTaskCounts.all}</div>
                    <div className="bar-chart-container">
                        <Bar data={analyticsData} options={analyticsOptions} />
                    </div>
                    <div className="user-avatars-container">
                        {userAvatars.map((user, index) => (
                            <div key={index} className="user-avatar-item">
                                <span
                                    className="user-avatar"
                                    style={{
                                        backgroundColor: user.avatarImg ? 'transparent' : getAvatarColor(user.avatar),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title={user.name}
                                >
                                    {user.avatarImg ?
                                        <img src={user.avatarImg} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                                        user.avatar
                                    }
                                </span>
                                <span className="user-name">{user.name.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="card cycle-overview-card">
                    <div className="card-header">
                        Cycle Overview
                        <div className="task-indicator">
                            <div className="task-label">Tasks: {
                                activeCycleTab === 'all' ? cycleTaskCounts.all :
                                    activeCycleTab === 'done' ? cycleTaskCounts.done :
                                        activeCycleTab === 'progress' ? cycleTaskCounts.progress :
                                            cycleTaskCounts.overdue
                            }</div>
                            <div className="date-label">Date: {formatDate(new Date()).split(',')[0]}</div>
                        </div>
                    </div>
                    <div className="tab-container">
                        <div className="tabs">
                            <div
                                className={`tab ${activeCycleTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveCycleTab('all')}
                            >
                                All Tasks
                            </div>
                            <div
                                className={`tab ${activeCycleTab === 'done' ? 'active' : ''}`}
                                onClick={() => setActiveCycleTab('done')}
                            >
                                Done Tasks
                            </div>
                            <div
                                className={`tab tab-progress ${activeCycleTab === 'progress' ? 'active' : ''}`}
                                onClick={() => setActiveCycleTab('progress')}
                            >
                                In Progress Tasks
                            </div>
                            <div
                                className={`tab ${activeCycleTab === 'overdue' ? 'active' : ''}`}
                                onClick={() => setActiveCycleTab('overdue')}
                            >
                                Over Due Tasks
                            </div>
                        </div>
                        <div className="task-counts">
                            <div className={`count-item all ${activeCycleTab === 'all' ? 'active' : ''}`}>
                                {cycleTaskCounts.all}
                            </div>
                            <div className={`count-item done ${activeCycleTab === 'done' ? 'active' : ''}`}>
                                {cycleTaskCounts.done}
                            </div>
                            <div className={`count-item progress ${activeCycleTab === 'progress' ? 'active' : ''}`}>
                                {cycleTaskCounts.progress}
                            </div>
                            <div className={`count-item overdue ${activeCycleTab === 'overdue' ? 'active' : ''}`}>
                                {cycleTaskCounts.overdue}
                            </div>
                        </div>
                    </div>
                    <div className="chart-container">
                        <div className="chart">
                            <Line data={cycleChartData} options={chartOptions} />
                        </div>
                        <div className="chart-labels">
                            {cycleChartData.labels.map((label, index) => (
                                <span key={index}>{label}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashBoardLayout;
