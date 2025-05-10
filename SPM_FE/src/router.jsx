import { createBrowserRouter } from "react-router-dom";
import React, { useEffect } from "react";
import AuthInterface from "./components/AuthInterface";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TaskDetails from './components/TaskDetails/TaskDetail';
import ProjectsLayout from './components/Projects/ProjectLayout';
import HomePage from './components/HomePages/HomePage';
import CyclesLayout from './components/Cycles/CyclesLayout';
import Module from './components/Modules/Module';
import ProjectPageBoard from './components/ProjectPageBoard';
import ProjectPageList from './components/ProjectPageList';
import CreateTask from './components/TaskDetail';
import OverView from './components/OverviewPage/OverView';
import TaskDetailToCopy from './components/TaskDetails/TaskDetailToCopy';
import DashBoardLayout from './components/DashBoard/DashBoardLayout';
import Member from './components/Members/Member';

const MainLayout = ({ children }) => (
  <div className="d-flex">
    <Sidebar />
    <div className="content-wrapper">
      <Header />
      <div className="content-area">
        {children}
      </div>
    </div>
  </div>
);

// Tạo component Tasks tạm thời
const Tasks = () => (
  <div>
    <h1>Tasks Page</h1>
    {/* Sau này sẽ hiển thị danh sách tasks ở đây */}
  </div>
);

// Component để xử lý token từ URL khi mở project board
const ProjectBoardWithAuth = () => {
  useEffect(() => {
    // Lấy token và email từ URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const emailFromUrl = urlParams.get('email');

    // Kiểm tra xem có token trong URL không
    if (tokenFromUrl) {
      console.log("Đã tìm thấy token trong URL");

      // Lưu token vào cả sessionStorage và localStorage để đảm bảo
      sessionStorage.setItem('access_token', tokenFromUrl);
      localStorage.setItem('access_token', tokenFromUrl);
      sessionStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('isAuthenticated', 'true');

      // Nếu có email, lưu thông tin email người dùng
      if (emailFromUrl) {
        console.log("Đã tìm thấy email trong URL:", emailFromUrl);
        sessionStorage.setItem('user_email', emailFromUrl);
        localStorage.setItem('user_email', emailFromUrl);
      }

      // Xóa token khỏi URL để tránh lộ thông tin nhạy cảm
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      // Reload trang để áp dụng token mới
      window.location.reload();
    }
  }, []);

  return <ProjectPageBoard />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthInterface />, // Trang đăng nhập/đăng ký mặc định
  },
  {
    path: "/login",
    element: <AuthInterface />,
  },
  {
    path: "/register",
    element: <AuthInterface />,
  },
  {
    path: "/home",
    element: <MainLayout>
      <HomePage />
    </MainLayout>,
  },
  {
    path: "/sidebar",
    element: <MainLayout>
    </MainLayout>,
  },
  {
    path: "/projects",
    element: <MainLayout>
      <ProjectsLayout />
    </MainLayout>,
  },
  {
    path: "/messages",
    element: <MainLayout>
      <Tasks />
    </MainLayout>,
  },
  {
    path: "/task",
    element: <MainLayout>
      <Tasks />
    </MainLayout>,
  },
  {
    path: "/task/add/:id",
    element: <CreateTask />
  },
  {
    path: "/project/:projectId/task/:taskId",
    element: <TaskDetails />
  },
  {
    path: "/taskdetail",
    element: <MainLayout>
      <div style={{ padding: "20px" }}>
        <h2>Task Detail Preview</h2>
        <TaskDetails />
      </div>
    </MainLayout>,
  },
  {
    path: "/projects/:projectId/tasks/:taskId",
    element: <MainLayout>
      <div style={{ padding: "20px" }}>
        <TaskDetails />
      </div>
    </MainLayout>
  },
  {
    path: "/cycles",
    element: <MainLayout>
      <CyclesLayout />
    </MainLayout>,
  },
  {
    path: "/project/:projectId/cycles",
    element: <MainLayout>
      <CyclesLayout />
    </MainLayout>,
  },
  {
    path: "/modules",
    element: <MainLayout>
      <Module />
    </MainLayout>,
  },
  {
    path: "/project/:projectId/modules",
    element: <MainLayout>
      <Module />
    </MainLayout>,
  },
  {
    path: "/project/:projectId/overview",
    element: <MainLayout>
      <OverView />
    </MainLayout>,
  },
  {
    path: "/project/board/:projectId",
    element: <ProjectBoardWithAuth />
  },
  {
    path: "/project/list/:projectId",
    element: <ProjectPageList />
  },
  {
    path: "/overview",
    element: <MainLayout>
      <OverView />
    </MainLayout>,
  },
  {
    path: "/task-detail/:projectId/:taskId",
    element: <TaskDetailToCopy />,
  },
  {
    path: "/dashboard",
    element: <MainLayout>
      <DashBoardLayout />
    </MainLayout>,
  },
  {
    path: "/project/:projectId/dashboard",
    element: <MainLayout>
      <DashBoardLayout />
    </MainLayout>,
  },
  {
    path: "/members",
    element: <MainLayout>
      <Member />
    </MainLayout>,
  },
  {
    path: "/project/:projectId/members",
    element: <MainLayout>
      <Member />
    </MainLayout>,
  },
]);

export default router;
