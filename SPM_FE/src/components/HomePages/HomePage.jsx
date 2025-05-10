import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../config/config';
import '../../assets/css/HomePage.css';

const { API_BASE_URL } = config;

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('todo');
  const [collapsedSections, setCollapsedSections] = useState({});
  const [userName, setUserName] = useState('');
  const [tasks, setTasks] = useState({
    todo: [],
    inProgress: [],
    completed: [],
    overdue: []
  });
  const [isLoading, setIsLoading] = useState(false);

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getAccessToken = () => {
    return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  };

  useEffect(() => {
    fetchUserProfile();
    fetchAllUserTasks();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setUserName('User');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/my-profile`, {
        headers: {
          authentication: accessToken,
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const userData = await response.json();
      console.log("User profile data:", userData);

      const { user_first_name, user_last_name } = userData;
      const fullName = `${user_first_name || "User"} ${user_last_name || ""}`.trim();
      setUserName(fullName);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserName('User');
    }
  };

  const fetchAllUserTasks = async () => {
    setIsLoading(true);
    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        console.error("No access token found");
        return;
      }

      // Lấy danh sách project của user
      const projectsResponse = await fetch(`${API_BASE_URL}/projects/my`, {
        headers: {
          authentication: accessToken,
          accept: "application/json",
        },
      });

      if (!projectsResponse.ok) {
        throw new Error("Failed to fetch user projects");
      }

      const projects = await projectsResponse.json();
      console.log("User projects:", projects);

      // Lấy tasks từ tất cả các project
      const allTasks = [];
      for (const project of projects) {
        try {
          const tasksResponse = await fetch(`${API_BASE_URL}/projects/${project.project_id}/tasks/my/`, {
            headers: {
              authentication: accessToken,
              accept: "application/json",
            },
          });

          if (tasksResponse.ok) {
            const responseData = await tasksResponse.json();
            // Kiểm tra xem response có property tasks không
            const projectTasks = responseData.tasks || responseData;

            // Thêm tên project vào mỗi task
            const tasksWithProject = projectTasks.map(task => ({
              ...task,
              project_name: project.project_name
            }));
            allTasks.push(...tasksWithProject);
          }
        } catch (error) {
          console.error(`Error fetching tasks for project ${project.project_id}:`, error);
        }
      }

      console.log("All tasks:", allTasks);

      // Phân loại task theo trạng thái
      const todoTasks = allTasks.filter(task =>
        task.task_status?.toLowerCase() === 'to_do' ||
        task.task_status?.toLowerCase() === 'todo'
      );

      const inProgressTasks = allTasks.filter(task =>
        task.task_status?.toLowerCase() === 'in_progress'
      );

      const completedTasks = allTasks.filter(task =>
        task.task_status?.toLowerCase() === 'done' ||
        task.task_status?.toLowerCase() === 'completed'
      );

      // Xác định các task quá hạn (overdue)
      const now = new Date();
      const overdueTasks = allTasks.filter(task => {
        if (task.task_status?.toLowerCase() === 'done' ||
          task.task_status?.toLowerCase() === 'completed') return false;

        if (!task.end_date) return false;
        const dueDate = new Date(task.end_date);
        return dueDate < now;
      });

      console.log("Categorized tasks:", {
        todo: todoTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks
      });

      setTasks({
        todo: todoTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks
      });
    } catch (error) {
      console.error("Error fetching all tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTaskItem = (task) => {
    return (
      <div className="task-item" key={task.task_id}>
        <div className="task-info">
          <div className="task-name">{task.task_name || 'Untitled Task'}</div>
          <div className="project-name">{task.project_name || 'General'}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="home-container">
      <div className="main-content">
        <div className="welcome-section">
          <h1>Welcome, {userName}!</h1>

          <div className="dashboard-content">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>My Work</h2>
                <div className="tabs">
                  <div
                    className={`tab ${activeTab === 'todo' ? 'active' : ''}`}
                    onClick={() => setActiveTab('todo')}
                  >
                    To Do
                  </div>
                  <div
                    className={`tab ${activeTab === 'in-progress' ? 'active' : ''}`}
                    onClick={() => setActiveTab('in-progress')}
                  >
                    In Progress
                  </div>
                  <div
                    className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                  >
                    Completed
                  </div>
                </div>
              </div>

              {isLoading && <div className="loading-indicator">Đang tải...</div>}

              {activeTab === 'todo' && !isLoading && (
                <>
                  <div className="section">
                    <div className="section-header" onClick={() => toggleSection('today')}>
                      <div className="collapse-icon">{collapsedSections.today ? '▶' : '▼'}</div>
                      <div className="section-title">Today</div>
                      <div className="section-count">{tasks.todo.length}</div>
                    </div>

                    {!collapsedSections.today && (
                      <div className="task-list">
                        {tasks.todo.length > 0 ? (
                          tasks.todo.map(task => renderTaskItem(task))
                        ) : (
                          <div className="no-tasks">Không có nhiệm vụ nào</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="section">
                    <div className="section-header" onClick={() => toggleSection('overdue')}>
                      <div className="collapse-icon">{collapsedSections.overdue ? '▶' : '▼'}</div>
                      <div className="section-title">Overdue</div>
                      <div className="section-count">{tasks.overdue.length}</div>
                    </div>
                    {!collapsedSections.overdue && (
                      <div className="task-list">
                        {tasks.overdue.length > 0 ? (
                          tasks.overdue.map(task => renderTaskItem(task))
                        ) : (
                          <div className="no-tasks">Không có nhiệm vụ quá hạn</div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'in-progress' && !isLoading && (
                <div className="section">
                  <div className="section-header">
                    <div className="section-title">In Progress Tasks</div>
                    <div className="section-count">{tasks.inProgress.length}</div>
                  </div>
                  <div className="task-list">
                    {tasks.inProgress.length > 0 ? (
                      tasks.inProgress.map(task => renderTaskItem(task))
                    ) : (
                      <div className="no-tasks">Không có nhiệm vụ đang thực hiện</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'completed' && !isLoading && (
                <div className="section">
                  <div className="section-header">
                    <div className="section-title">Completed Tasks</div>
                    <div className="section-count">{tasks.completed.length}</div>
                  </div>
                  <div className="task-list">
                    {tasks.completed.length > 0 ? (
                      tasks.completed.map(task => renderTaskItem(task))
                    ) : (
                      <div className="no-tasks">Không có nhiệm vụ đã hoàn thành</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;