import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import '../assets/css/Sidebar.css';
import '../assets/css/Sidebar.css';
import { getUserProjects } from '../api/ProjectApi'; // Import API để lấy danh sách project

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProjectActive, setIsProjectActive] = useState(false);
  const [showProjectsList, setShowProjectsList] = useState(() => {
    // Khởi tạo từ localStorage nếu có, mặc định là false
    return localStorage.getItem('showProjectsList') === 'true';
  });
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [expandedProject, setExpandedProject] = useState(() => {
    // Khởi tạo từ localStorage nếu có, mặc định là null
    const savedExpandedProject = localStorage.getItem('expandedProject');
    return savedExpandedProject || null;
  });
  const [collapsed, setCollapsed] = useState(() => {
    // Khởi tạo từ localStorage nếu có, mặc định là false
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  useEffect(() => {
    setIsProjectActive(location.pathname === "/projects");
  }, [location.pathname]);

  // Theo dõi thay đổi của showProjectsList và lưu vào localStorage
  useEffect(() => {
    localStorage.setItem('showProjectsList', showProjectsList);

    // Nếu danh sách projects được hiển thị, tải dữ liệu
    if (showProjectsList && projects.length === 0) {
      loadProjects();
    }
  }, [showProjectsList]);

  // Theo dõi thay đổi của expandedProject và lưu vào localStorage
  useEffect(() => {
    if (expandedProject) {
      localStorage.setItem('expandedProject', expandedProject);
    } else {
      localStorage.removeItem('expandedProject');
    }
  }, [expandedProject]);

  // Lưu trạng thái thu gọn sidebar vào localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed);
  }, [collapsed]);

  // Tách hàm loadProjects thành một hàm riêng để tái sử dụng
  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const data = await getUserProjects();
      setProjects(data);
    } catch (error) {
      console.error("Không thể lấy danh sách project:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleProjectsClick = () => {
    navigate('/projects');
  };

  // Hàm toggle hiển thị danh sách projects
  const toggleProjectsList = async (e) => {
    e.stopPropagation();
    setShowProjectsList(!showProjectsList);
  };

  // Hàm xử lý khi nhấp vào icon đóng sidebar
  const handleCloseSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Hàm xử lý khi click vào một project
  const handleProjectItemClick = (projectId, e) => {
    e.stopPropagation();

    // Điều hướng tới trang project board khi click vào tên project
    navigate(`/project/board/${projectId}`);

    // Vẫn giữ chức năng mở rộng/thu gọn
    if (expandedProject === projectId) {
      setExpandedProject(null);
    } else {
      setExpandedProject(projectId);
    }
  };

  // Hàm xử lý khi click vào một mục trong sub-menu của project
  const navigateToProjectSection = (projectId, section, e) => {
    e.stopPropagation();

    // Lấy đường dẫn hiện tại
    const currentPath = location.pathname;
    const isCurrentlyInModuleDetail = currentPath.includes(`/project/${projectId}/modules`) &&
      !currentPath.endsWith(`/modules`);

    // Khi click vào All tasks, điều hướng đến trang list
    if (section === 'tasks') {
      navigate(`/project/list/${projectId}`);
    } else if (section === 'modules') {
      // Đối với modules, chỉ thêm force=list nếu đang ở trang chi tiết module
      if (isCurrentlyInModuleDetail) {
        navigate(`/project/${projectId}/${section}?force=list`);
      } else {
        navigate(`/project/${projectId}/${section}`);
      }
    } else {
      navigate(`/project/${projectId}/${section}`);
    }
  };

  // Thêm useEffect để lắng nghe sự kiện projectsUpdated
  useEffect(() => {
    const handleProjectsUpdated = async () => {
      console.log("Nhận sự kiện projectsUpdated, đang cập nhật danh sách dự án...");
      await loadProjects();
    };

    // Đăng ký lắng nghe sự kiện
    window.addEventListener('projectsUpdated', handleProjectsUpdated);

    // Hủy đăng ký khi component unmount
    return () => {
      window.removeEventListener('projectsUpdated', handleProjectsUpdated);
    };
  }, []);

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        <div className="logo">
          <img src="/assets/images/logo.png" alt="Crate Logo" className="icon" />
          <span className={`logo-text ${collapsed ? 'hidden' : ''}`}>crate</span>
          <img
            src="/assets/icons/Close_Sidebar_icon.svg"
            alt="Close Sidebar"
            className="close-sidebar-icon"
            onClick={handleCloseSidebar}
          />
        </div>
        <ul className="menu">
          <li className="menu-item" onClick={() => navigate('/home')}>
            <img src="/assets/icons/home_icon.svg" alt="Home" className="icon" />
            {!collapsed && <span className="menu-text">Home</span>}
          </li>
          <li className="menu-item projects-menu-item" onClick={handleProjectsClick}>
            <div className="menu-item-content">
              <img src="/assets/icons/Projects_icon.svg" alt="Projects" className="icon" />
              {!collapsed && <span className="menu-text">Projects</span>}
            </div>
            {!collapsed && (
              <span
                className={`projects-toggle-icon ${showProjectsList ? 'active' : ''}`}
                onClick={toggleProjectsList}
              >
                {showProjectsList ? '−' : '+'}
              </span>
            )}
          </li>

          {/* Danh sách projects */}
          {showProjectsList && !collapsed && (
            <div className="projects-list">
              {isLoadingProjects ? (
                <div className="loading-projects">Đang tải...</div>
              ) : projects.length > 0 ? (
                projects.map(project => (
                  <div key={project.project_id} className="project-container">
                    <div
                      className={`project-item ${expandedProject === project.project_id ? 'expanded' : ''}`}
                      onClick={(e) => handleProjectItemClick(project.project_id, e)}
                    >
                      <span className="project-icon">P</span>
                      <div className="project-name-container" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/project/board/${project.project_id}`);
                      }}>
                        <span className="project-name">{project.project_name}</span>
                        <span className="project-name-tooltip">{project.project_name}</span>
                      </div>
                      {expandedProject === project.project_id ? (
                        <span className="project-toggle" onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProject(null);
                        }}>−</span>
                      ) : (
                        <span className="project-toggle" onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProject(project.project_id);
                        }}>+</span>
                      )}
                    </div>

                    {/* Sub-menu cho project */}
                    {expandedProject === project.project_id && (
                      <div className="project-submenu">
                        <div className="submenu-item"
                          onClick={(e) => navigateToProjectSection(project.project_id, 'dashboard', e)}>
                          <img src="/assets/icons/Dashboards_icon.svg" alt="Dashboard" className="submenu-icon" />
                          <span>Dashboard</span>
                        </div>
                        <div className="submenu-item"
                          onClick={(e) => navigateToProjectSection(project.project_id, 'overview', e)}>
                          <img src="/assets/icons/Overview_icon.svg" alt="Overview" className="submenu-icon" />
                          <span>Overview</span>
                        </div>
                        <div className="submenu-item"
                          onClick={(e) => navigateToProjectSection(project.project_id, 'tasks', e)}>
                          <img src="/assets/icons/All_tasks_icon.svg" alt="All tasks" className="submenu-icon" />
                          <span>All tasks</span>
                        </div>
                        <div className="submenu-item"
                          onClick={(e) => navigateToProjectSection(project.project_id, 'cycles', e)}>
                          <img src="/assets/icons/Cycles_icon.svg" alt="Cycles" className="submenu-icon" />
                          <span>Cycles</span>
                        </div>
                        <div className="submenu-item"
                          onClick={(e) => navigateToProjectSection(project.project_id, 'modules', e)}>
                          <img src="/assets/icons/Module_icon.svg" alt="Modules" className="submenu-icon" />
                          <span>Modules</span>
                        </div>
                        <div className="submenu-item"
                          onClick={(e) => navigateToProjectSection(project.project_id, 'members', e)}>
                          <img src="/assets/icons/member_icon.svg" alt="Team members" className="submenu-icon" />
                          <span>Team members</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-projects">Không có dự án nào</div>
              )}
            </div>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
