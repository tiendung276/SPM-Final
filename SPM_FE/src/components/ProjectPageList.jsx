import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import TaskPageHeader from "./ProjectPage/TaskPageHeader";
import ProjectTaskList from "./ProjectPage/ProjectTaskList";
import TaskInfo from "./TaskDetails/TaskInfo";
import AIChat from "./AIChatPage/AIChat";
import "../assets/css/ProjectPage/ProjectPage.css";
import { useParams } from "react-router-dom";

const ProjectPageList = () => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState("");
  const { projectId } = useParams();
  const [showAIChat, setShowAIChat] = useState(false);

  // Handle task selection
  const handleTaskSelect = (task) => {
    setSelectedTask(task);
  };

  // Handle task update
  const handleTaskUpdate = (updatedTask) => {
    setSelectedTask(updatedTask);
  };

  // Toggle between kanban and list views
  const toggleViewMode = (mode) => {
    setViewMode(mode);
  };

  // Hàm đóng AI Chat
  const handleCloseAIChat = () => {
    setShowAIChat(false);
  };

  // Hàm mở AI Chat
  const handleOpenAIChat = () => {
    setShowAIChat(true);
  };

  return (
    <div className="d-flex vh-100 overflow-hidden">
      <Sidebar />
      <div className="main-content d-flex flex-column flex-grow-1">
        <Header />
        <div className="scrollable-content d-flex flex-grow-1">
          <div className="calendar-container flex-grow-1" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 70px)' }}>
            <TaskPageHeader
              onViewModeChange={toggleViewMode}
              activeView={viewMode}
            />

            <ProjectTaskList
              projectId={projectId}
              onTaskSelect={handleTaskSelect}
              onTaskUpdate={handleTaskUpdate}
            />
          </div>

          <div className="task-info-sidebar">
            {selectedTask ? (
              <TaskInfo
                selectedTask={selectedTask}
                onTaskUpdate={handleTaskUpdate}
                projectId={projectId}
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

      <div className="floating-btn-container-1">
        <div className="tooltip-container-1">
          <span className="tooltip-1">Create AI</span>
          <button className="create-ai-btn-1" onClick={handleOpenAIChat}>
            <img
              src="/assets/icons/create-ai.svg"
              alt="Create AI"
              className="create-icon-1"
            />
          </button>
        </div>
      </div>

      {showAIChat && <AIChat onClose={handleCloseAIChat} projectId={projectId} />}
    </div>
  );
};

export default ProjectPageList;
