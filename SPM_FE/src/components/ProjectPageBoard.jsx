import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ProjectPageHeader from "./ProjectPage/ProjectPageHeader";
import TaskInfo from "./TaskDetails/TaskInfo";
import ProjectKanban from "./ProjectPage/ProjectKanban";
import "../assets/css/ProjectPage/ProjectPage.css";

const ProjectPageBoard = () => {
  const [selectedTask, setSelectedTask] = useState(null);
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Check for updated task from TaskDetail
  useEffect(() => {
    if (location.state?.updatedTask) {
      const updatedTask = location.state.updatedTask;
      setSelectedTask(updatedTask);
      handleTaskUpdate(updatedTask);
      // Clear the state to prevent re-triggering
      navigate(`/project/board/${projectId}`, { state: {}, replace: true });
    }
  }, [location.state, projectId, navigate]);

  useEffect(() => {
    // Kiểm tra và đồng bộ token giữa localStorage và sessionStorage
    const syncAuthTokens = () => {
      // Token có thể ở một trong hai nơi
      const localStorageToken = localStorage.getItem('access_token');
      const sessionStorageToken = sessionStorage.getItem('access_token');

      // Nếu có token ở một nơi nhưng không có ở nơi kia, đồng bộ chúng
      if (localStorageToken && !sessionStorageToken) {
        console.log("Đồng bộ token từ localStorage sang sessionStorage");
        sessionStorage.setItem('access_token', localStorageToken);
        sessionStorage.setItem('isAuthenticated', 'true');
      } else if (sessionStorageToken && !localStorageToken) {
        console.log("Đồng bộ token từ sessionStorage sang localStorage");
        localStorage.setItem('access_token', sessionStorageToken);
        localStorage.setItem('isAuthenticated', 'true');
      }
    };

    syncAuthTokens();
  }, []);

  const handleTaskSelect = (task) => {
    console.log("Task selected in ProjectPageBoard:", task);
    setSelectedTask(task);
  };

  const handleTaskUpdate = (updatedTask) => {
    console.log("Task updated in ProjectPageBoard:", updatedTask);
    setSelectedTask(updatedTask);
  };

  useEffect(() => {
    console.log("Selected task changed in ProjectPageBoard:", selectedTask);
  }, [selectedTask]);

  return (
    <div className="d-flex vh-100" style={{ overflow: 'hidden' }}>
      <Sidebar />
      <div className="main-content d-flex flex-column flex-grow-1">
        <Header />
        <div className="d-flex flex-grow-1" style={{ height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
          <div className="board-container flex-grow-1" style={{ overflowY: 'auto' }}>
            <ProjectPageHeader />
            <ProjectKanban
              projectId={projectId}
              onTaskSelect={handleTaskSelect}
              onTaskUpdate={handleTaskUpdate}
            />
          </div>
          <div className="task-info-sidebar" style={{ height: '100%', overflowY: 'auto', minWidth: '300px' }}>
            {selectedTask ? (
              <TaskInfo
                selectedTask={selectedTask}
                onTaskUpdate={handleTaskUpdate}
                projectId={projectId}
                isTaskDetail={false}
              />
            ) : (
              <div className="no-task-selected">
                <h2>No Task Selected</h2>
                <p>Please select a task to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPageBoard;
