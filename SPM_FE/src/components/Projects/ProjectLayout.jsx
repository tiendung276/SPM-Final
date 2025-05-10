import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Form, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../../assets/css/ProjectLayout.css';
import { createProject, getUserProjects, assignUserToProject, getProjectUsers, deleteProject, saveProjectsToStorage, getProjectsFromStorage, getProjectUsersFromStorage, reassignUserRole, unassignUserFromProject, updateProject } from '../../api/ProjectApi';
import { PlusOutlined } from '@ant-design/icons';
import { Empty } from 'antd';
import config from '../../config/config';

const { API_BASE_URL } = config;

const ProjectsLayout = () => {
  const navigate = useNavigate();
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list' hoặc 'box'
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [apiProjects, setApiProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrumMaster, setIsScrumMaster] = useState(false); // Thêm state cho vai trò Scrum Master

  // State cho form tạo dự án mới
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    members: []
  });

  // State cho form thêm thành viên mới vào dự án
  const [newMember, setNewMember] = useState({
    email: '',
    role: 'Developer'
  });

  // State cho form thêm thành viên trong modal
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [isAddingMemberSubmitting, setIsAddingMemberSubmitting] = useState(false);

  // Thêm state lưu trữ thông tin project đang được xóa
  const [deletingProject, setDeletingProject] = useState({
    show: false,
    project: null
  });

  // Thêm state quản lý member context menu
  const [memberContextMenu, setMemberContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    memberId: null,
    memberName: '',
    projectId: null
  });

  // Thêm state để quản lý dropdown menu của project panel
  const [panelDropdown, setPanelDropdown] = useState(false);

  // Thêm state mới để quản lý trạng thái form Change Role
  const [changeRoleModal, setChangeRoleModal] = useState({
    show: false,
    memberId: null,
    memberName: '',
    memberEmail: '',
    currentRole: '',
    newRole: ''
  });

  // Thêm state để quản lý modal xác nhận xóa thành viên
  const [deletingMember, setDeletingMember] = useState({
    show: false,
    member: null,
    memberId: null,
    memberName: ''
  });

  // Thêm state để quản lý form chỉnh sửa project
  const [editProjectModal, setEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState({
    name: '',
    description: ''
  });

  // Thêm một state để theo dõi khi dữ liệu được tải lần đầu
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Thêm state cho thông báo thành công
  const [successToast, setSuccessToast] = useState({
    show: false,
    message: '',
    icon: null
  });

  // Lấy danh sách projects từ API khi component mount
  useEffect(() => {
    fetchUserProjects().then(() => {
      setInitialDataLoaded(true);
    });
  }, []);

  // Kết hợp dữ liệu mẫu với dữ liệu từ API
  const projects = [...apiProjects];

  // Lấy project đang được chọn (nếu có)
  const selectedProject = projects.length > 0 && selectedProjectIndex < projects.length
    ? projects[selectedProjectIndex]
    : {
      id: null,
      name: 'No Project Selected',
      description: 'Please select a project from the list',
      members: [],
      epicsCompleted: '0/0',
      sprintsCompleted: 0,
      epics: [],
      createdBy: '',
      createdAt: '',
      creatorAvatar: ''
    };

  // Thêm useEffect để tính toán số lượng task và cycle đã hoàn thành khi chọn project
  useEffect(() => {
    const calculateProjectStatistics = async () => {
      if (!initialDataLoaded || !projects.length) return;

      const currentSelectedProject = projects[selectedProjectIndex];
      if (!currentSelectedProject || !currentSelectedProject.id) return;

      try {
        // Tính toán số task đã hoàn thành
        const completedTasksRatio = await getCompletedTasksCount(currentSelectedProject.id);

        // Tính toán số cycle đã hoàn thành
        const completedCyclesCount = await getCompletedCyclesCount(currentSelectedProject.id);

        // Cập nhật state cho các giá trị này
        setApiProjects(prevProjects => {
          return prevProjects.map(project => {
            if (project.id === currentSelectedProject.id) {
              return {
                ...project,
                epicsCompleted: completedTasksRatio,
                sprintsCompleted: completedCyclesCount
              };
            }
            return project;
          });
        });
      } catch (error) {
        console.error("Lỗi khi tính toán thống kê dự án:", error);
      }
    };

    calculateProjectStatistics();
  }, [selectedProjectIndex, initialDataLoaded, projects]);

  // Thêm useEffect mới để tính toán tiến độ của từng cycle
  useEffect(() => {
    const calculateCycleProgress = async () => {
      if (!initialDataLoaded || !projects.length) return;

      const currentSelectedProject = projects[selectedProjectIndex];
      if (!currentSelectedProject || !currentSelectedProject.id) return;

      try {
        // Lấy danh sách cycles của project
        const cycles = await getProjectCycles(currentSelectedProject.id);

        if (cycles && cycles.length > 0) {
          // Lấy danh sách tasks của project
          const tasks = await getProjectTasks(currentSelectedProject.id);

          // Tính toán progress cho mỗi cycle
          const cyclesWithProgress = await Promise.all(cycles.slice(0, 2).map(async (cycle, index) => {
            const cycleProgress = calculateTasksCompletionForCycle(tasks, cycle);
            return {
              name: `Cycle ${index + 1}: ${cycle.cycle_name || ''}`,
              progress: cycleProgress,
              color: index === 0 ? '#4285F4' : '#34A853',
              cycleId: cycle.cycle_id
            };
          }));

          // Cập nhật state cho các giá trị này
          setApiProjects(prevProjects => {
            return prevProjects.map(project => {
              if (project.id === currentSelectedProject.id) {
                return {
                  ...project,
                  epics: cyclesWithProgress
                };
              }
              return project;
            });
          });
        }
      } catch (error) {
        console.error("Lỗi khi tính toán tiến độ của các cycle:", error);
      }
    };

    calculateCycleProgress();
  }, [selectedProjectIndex, initialDataLoaded, projects]);

  // Cập nhật hàm fetchUserProjects để xử lý dữ liệu từ cache tốt hơn
  const fetchUserProjects = async () => {
    try {
      setIsLoading(true);

      // Kiểm tra thông tin người dùng hiện tại
      const currentUserEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
      console.log("Người dùng hiện tại:", currentUserEmail);

      // Xóa dữ liệu dự án cũ để đảm bảo không hiển thị dữ liệu của người dùng khác
      localStorage.removeItem('userProjects');
      localStorage.removeItem('userProjectsTimestamp');

      // Xóa tất cả dữ liệu thành viên dự án cũ
      const projectKeyPattern = /^project_\d+_users$/;
      Object.keys(localStorage).forEach(key => {
        if (projectKeyPattern.test(key)) {
          localStorage.removeItem(key);
        }
      });

      // Tiếp tục với logic lấy dự án từ API
      try {
        const data = await getUserProjects();
        console.log("Dữ liệu projects từ API:", data);

        if (data && data.length > 0) {
          // Chuyển đổi dữ liệu từ API sang định dạng hiển thị
          const formattedProjects = data.map(project => {
            return {
              id: project.project_id,
              name: project.project_name,
              description: project.description || 'No description',
              members: [], // Sẽ được cập nhật bởi fetchProjectUsers
              createdBy: '',
              creatorAvatar: '',
              createdAt: new Date(project.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }),
              epicsCompleted: '0/0',
              sprintsCompleted: 0,
              epics: [
                { name: 'Cycle 1', progress: 0, color: '#4285F4' },
                { name: 'Cycle 2', progress: 0, color: '#34A853' }
              ]
            };
          });

          setApiProjects(formattedProjects);

          // Lấy thông tin thành viên cho từng dự án
          for (const project of formattedProjects) {
            fetchProjectUsers(project.id);
          }
        } else {
          // Nếu không có dự án, đặt mảng rỗng
          setApiProjects([]);
        }
      } catch (apiError) {
        console.error("Lỗi khi lấy dữ liệu từ API:", apiError);
        // Nếu không lấy được dữ liệu từ API, đặt mảng rỗng
        setApiProjects([]);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách projects:", error);
      setApiProjects([]);
      alert("Không thể lấy danh sách dự án. Vui lòng kiểm tra kết nối hoặc đăng nhập lại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm hàm mới để cập nhật thông tin dự án với dữ liệu người dùng
  const updateProjectWithUsers = (projectId, users) => {
    if (!users || users.length === 0) return;

    // Tìm owner của project
    const owner = users.find(user => user.role === "OWNER");
    let ownerName = 'Không có tên';
    let ownerFirstChar = '?';
    let ownerAvatarImg = null;

    if (owner) {
      // Kết hợp tên từ user_first_name và user_last_name của owner
      const firstName = owner.user_first_name || '';
      const lastName = owner.user_last_name || '';
      const email = owner.user_email || '';
      ownerAvatarImg = owner.avatar_url || null;

      // Tạo fullname từ firstName và lastName của owner
      if (firstName && lastName) {
        ownerName = `${firstName} ${lastName}`;
      } else if (firstName) {
        ownerName = firstName;
      } else if (lastName) {
        ownerName = lastName;
      } else if (email) {
        ownerName = email.split('@')[0];
      }

      // Lấy chữ cái đầu tiên của tên làm avatar
      if (firstName) {
        ownerFirstChar = firstName.charAt(0).toUpperCase();
      } else if (lastName) {
        ownerFirstChar = lastName.charAt(0).toUpperCase();
      } else if (email) {
        ownerFirstChar = email.charAt(0).toUpperCase();
      }
    }

    // Chuyển đổi dữ liệu người dùng
    const formattedMembers = users.map(user => {
      // Kết hợp tên từ user_first_name và user_last_name
      const firstName = user.user_first_name || '';
      const lastName = user.user_last_name || '';
      const email = user.user_email || '';

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

      // In ra để kiểm tra dữ liệu
      console.log(`Member ${fullname}: avatar='${firstChar}', email=${email}`);

      // Lấy vai trò, nếu không có thì mặc định là 'Member'
      const role = user.role || 'MEMBER';

      return {
        id: user.user_id || Math.random().toString(36).substring(7),
        name: fullname,
        role: formatRole(role),
        avatar: firstChar,
        avatarImg: user.avatar_url || null,
        isOwner: role === "OWNER"
      };
    });

    // In ra kiểm tra danh sách thành viên đã format
    console.log("Danh sách thành viên đã format:", formattedMembers);

    // Cập nhật lại danh sách thành viên cho dự án
    setApiProjects(prevProjects => {
      const updatedProjects = [...prevProjects];
      const projectIndex = updatedProjects.findIndex(p => p.id === projectId);

      if (projectIndex !== -1) {
        updatedProjects[projectIndex].members = formattedMembers;
        updatedProjects[projectIndex].createdBy = ownerName;
        updatedProjects[projectIndex].creatorAvatar = ownerFirstChar;
        updatedProjects[projectIndex].creatorAvatarImg = ownerAvatarImg;
      }

      return updatedProjects;
    });
  };

  // Cập nhật hàm fetchProjectUsers để sử dụng hàm updateProjectWithUsers
  const fetchProjectUsers = async (projectId) => {
    try {
      const users = await getProjectUsers(projectId);
      console.log("Danh sách người dùng trong dự án:", users);

      if (users && users.length > 0) {
        // Log chi tiết về dữ liệu người dùng để kiểm tra
        console.log("Chi tiết dữ liệu người dùng đầu tiên:", JSON.stringify(users[0]));

        // Sử dụng hàm mới để cập nhật thông tin dự án
        updateProjectWithUsers(projectId, users);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thành viên của dự án:", error);
    }
  };

  // Hàm định dạng role từ DEVELOPER -> Developer
  const formatRole = (role) => {
    if (!role) return 'Member';

    // Chuyển đổi DEVELOPER -> Developer
    const formattedRole = role.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return formattedRole;
  };

  // Hàm xử lý khi click nút Create Project
  const handleCreateProject = () => {
    setIsCreatingProject(true);
  };

  // Hàm đóng modal tạo dự án
  const handleCloseCreateProject = () => {
    setIsCreatingProject(false);
    // Reset form
    setNewProject({
      name: '',
      description: '',
      members: []
    });
    setNewMember({
      email: '',
      role: 'Developer'
    });
  };

  // Hàm xử lý khi thay đổi thông tin dự án
  const handleProjectChange = (e) => {
    const { name, value } = e.target;
    setNewProject({
      ...newProject,
      [name]: value
    });
  };

  // Hàm xử lý khi thay đổi thông tin thành viên mới
  const handleMemberChange = (e) => {
    const { name, value } = e.target;
    setNewMember({
      ...newMember,
      [name]: value
    });
  };

  // Hàm xử lý khi thêm thành viên vào dự án
  const handleAddTeamMember = () => {
    if (newMember.email.trim() === '') return;

    // Chỉ cần reset form mà không thêm vào danh sách members
    alert(`Member with email ${newMember.email} has been added (notification only).`);

    // Reset form thêm thành viên
    setNewMember({
      email: '',
      role: 'Developer'
    });
  };

  // Hàm xử lý khi click nút thêm thành viên
  const handleAddMember = () => {
    setIsAddingMember(true);
  };

  // Hàm đóng modal thêm thành viên
  const handleCloseAddMember = () => {
    setIsAddingMember(false);
  };

  // Cập nhật hàm xử lý khi submit form tạo project
  const handleSubmitProject = async () => {
    try {
      if (!newProject.name) {
        alert('Vui lòng nhập tên dự án');
        return;
      }

      const projectData = {
        name: newProject.name,
        description: newProject.description || 'No description'
      };

      console.log("Sending project data:", projectData);

      const response = await createProject(projectData);
      // Hiển thị thông báo thành công kiểu toast
      setSuccessToast({
        show: true,
        message: 'Project created successfully.',
        icon: 'success'
      });

      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setSuccessToast({
          show: false,
          message: '',
          icon: null
        });
      }, 3000);

      handleCloseCreateProject();

      // Lấy lại danh sách dự án sau khi tạo thành công
      await fetchUserProjects();

      // Cập nhật localStorage và phát sự kiện để thông báo cho sidebar
      try {
        const updatedData = await getUserProjects();
        saveProjectsToStorage(updatedData);

        // Phát sự kiện custom để thông báo cho sidebar cập nhật
        const projectsUpdatedEvent = new CustomEvent('projectsUpdated');
        window.dispatchEvent(projectsUpdatedEvent);
      } catch (error) {
        console.error("Lỗi khi cập nhật localStorage sau khi tạo dự án:", error);
      }

    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  // Hàm xử lý khi thay đổi email của thành viên trong modal
  const handleMemberEmailChange = (e) => {
    setMemberEmail(e.target.value);
  };

  // Hàm xử lý khi thay đổi vai trò của thành viên trong modal
  const handleMemberRoleChange = (e) => {
    setMemberRole(e.target.value);
  };

  // Cập nhật hàm xử lý khi submit form thêm thành viên
  const handleAddMemberSubmit = async () => {
    if (!memberEmail.trim()) {
      alert('Vui lòng nhập email của thành viên');
      return;
    }

    try {
      setIsAddingMemberSubmitting(true);

      if (!isValidEmail(memberEmail)) {
        alert('Vui lòng nhập đúng định dạng email');
        return;
      }

      const validRoles = ['OWNER', 'ADMIN', 'MEMBER'];
      if (!validRoles.includes(memberRole)) {
        alert('Vai trò không hợp lệ');
        return;
      }

      await assignUserToProject(selectedProject.id, {
        email: memberEmail,
        role: memberRole
      });

      await fetchProjectUsers(selectedProject.id);
      alert(`Đã thêm thành viên ${memberEmail} với vai trò ${formatRole(memberRole)} vào dự án thành công!`);
      handleCloseAddMember();
      setMemberEmail('');
      setMemberRole('MEMBER');

    } catch (error) {
      alert(error.message);
    } finally {
      setIsAddingMemberSubmitting(false);
    }
  };

  // Hàm kiểm tra email hợp lệ
  const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Xử lý khi click vào project
  const handleProjectClick = (index) => {
    setSelectedProjectIndex(index);
  };

  // Thêm hàm xử lý double click để chuyển đến trang project board
  const handleProjectDoubleClick = (project) => {
    if (project && project.id) {
      navigate(`/project/board/${project.id}`);
    }
  };

  // Thêm hàm xử lý khi click vào nút List View
  const handleGoToListView = () => {
    if (selectedProject && selectedProject.id) {
      navigate(`/project/list/${selectedProject.id}`);
    } else {
      alert('Vui lòng chọn một dự án trước');
    }
  };

  // Thêm hàm xử lý khi click vào nút Go to Detail
  const handleGoToDetail = () => {
    if (selectedProject && selectedProject.id) {
      navigate(`/project/board/${selectedProject.id}`);
    } else {
      alert('Vui lòng chọn một dự án trước');
    }
  };

  // Hàm tạo màu ngẫu nhiên nhưng nhất quán cho avatar dựa trên chữ cái
  const getAvatarColor = (char) => {
    const colors = [
      '#2733b5', // Blue - màu mặc định trong CSS của bạn
      '#1976d2', // Blue
      '#388e3c', // Green
      '#d32f2f', // Red
      '#f57c00', // Orange
      '#7b1fa2', // Purple
      '#c2185b', // Pink
      '#0097a7', // Teal
      '#00796b', // Dark Green
      '#ef6c00'  // Dark Orange
    ];

    // Nếu là chữ cái, tính toán màu dựa trên mã ASCII
    if (char && typeof char === 'string') {
      const charCode = char.charCodeAt(0);
      return colors[charCode % colors.length];
    }

    // Trả về màu mặc định nếu không phải chữ cái
    return colors[0];
  };

  // Thêm useEffect để lấy danh sách thành viên khi chọn dự án
  useEffect(() => {
    if (selectedProject && selectedProject.id) {
      fetchProjectUsers(selectedProject.id);
    }
  }, [selectedProjectIndex]);

  // Hàm xử lý khi click ra ngoài context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (memberContextMenu.visible) {
        setMemberContextMenu({ ...memberContextMenu, visible: false });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [memberContextMenu]);

  // Cập nhật hàm confirmDeleteProject để xử lý dữ liệu một cách an toàn
  const confirmDeleteProject = async () => {
    try {
      // Lưu lại tham chiếu đến dự án đang bị xóa và index hiện tại
      const projectIdToDelete = deletingProject.project.id;
      const projectNameToDelete = deletingProject.project.name;
      const isSelectedProject = projects.findIndex(p => p.id === projectIdToDelete) === selectedProjectIndex;

      // Đóng modal trước khi gọi API
      setDeletingProject({ show: false, project: null });

      // Gọi API để xóa project
      await deleteProject(projectIdToDelete);

      // Hiển thị thông báo thành công
      setSuccessToast({
        show: true,
        message: `Project "${projectNameToDelete}" has been deleted.`,
        icon: 'success'
      });

      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setSuccessToast({
          show: false,
          message: '',
          icon: null
        });
      }, 3000);

      // Cập nhật UI
      const updatedProjects = apiProjects.filter(p => p.id !== projectIdToDelete);
      setApiProjects(updatedProjects);

      // Điều chỉnh selectedProjectIndex nếu cần
      if (updatedProjects.length === 0) {
        setSelectedProjectIndex(0);
      } else if (isSelectedProject) {
        setSelectedProjectIndex(Math.min(selectedProjectIndex, updatedProjects.length - 1));
      }

      // Cập nhật localStorage để sidebar có thể đọc dữ liệu này khi được render lại
      try {
        const updatedData = await getUserProjects();
        // Lưu vào localStorage ngay cả khi không cập nhật UI
        saveProjectsToStorage(updatedData);

        // Phát sự kiện custom để thông báo cho sidebar cập nhật
        const projectsUpdatedEvent = new CustomEvent('projectsUpdated');
        window.dispatchEvent(projectsUpdatedEvent);

      } catch (fetchError) {
        console.error("Lỗi khi cập nhật danh sách dự án sau khi xóa:", fetchError);
        // Nếu không lấy được dữ liệu mới, lưu danh sách đã cập nhật vào localStorage
        saveProjectsToStorage(updatedProjects.map(p => ({
          project_id: p.id,
          project_name: p.name,
          description: p.description,
          created_at: new Date().toISOString()
        })));

        // Vẫn phát sự kiện custom
        const projectsUpdatedEvent = new CustomEvent('projectsUpdated');
        window.dispatchEvent(projectsUpdatedEvent);
      }

    } catch (error) {
      // Hiển thị thông báo lỗi
      alert(error.message);
      setDeletingProject({ show: false, project: null });
    }
  };

  // Hàm đóng modal delete
  const cancelDeleteProject = () => {
    setDeletingProject({ show: false, project: null });
  };

  // Thêm hàm xử lý sự kiện click chuột phải vào thành viên
  const handleMemberContextMenu = (e, member, projectId) => {
    e.preventDefault(); // Ngăn chặn hành vi mặc định
    e.stopPropagation(); // Ngăn chặn sự kiện lan ra ngoài

    // Lấy vị trí của icon more action
    const iconRect = e.currentTarget.getBoundingClientRect();

    // Hiển thị context menu ở vị trí cân đối - không quá trái hoặc quá phải
    setMemberContextMenu({
      visible: true,
      x: iconRect.left + (iconRect.width / 2), // Vị trí ở giữa icon
      y: iconRect.bottom,
      memberId: member.id,
      memberName: member.name,
      projectId: projectId
    });
  };

  // Hàm đóng member context menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = () => {
      if (memberContextMenu.visible) {
        setMemberContextMenu({ ...memberContextMenu, visible: false });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [memberContextMenu]);

  // Cập nhật hàm handleChangeRole để hiển thị modal thay đổi vai trò
  const handleChangeRole = () => {
    // Lấy thông tin thành viên được chọn
    const member = selectedProject.members.find(m => m.id === memberContextMenu.memberId);

    if (member) {
      // Hiển thị modal với thông tin của thành viên
      setChangeRoleModal({
        show: true,
        memberId: member.id,
        memberName: member.name,
        memberEmail: member.email || '', // Thêm email nếu có
        currentRole: member.role,
        newRole: member.role // Mặc định là vai trò hiện tại
      });
    }

    // Đóng context menu
    setMemberContextMenu({ ...memberContextMenu, visible: false });
  };

  // Thêm hàm đóng modal thay đổi vai trò
  const handleCloseChangeRole = () => {
    setChangeRoleModal({
      show: false,
      memberId: null,
      memberName: '',
      memberEmail: '',
      currentRole: '',
      newRole: ''
    });
  };

  // Thêm hàm xử lý khi thay đổi vai trò mới
  const handleRoleChange = (e) => {
    setChangeRoleModal({
      ...changeRoleModal,
      newRole: e.target.value
    });
  };

  // Cập nhật hàm xử lý khi submit form thay đổi vai trò
  const handleSubmitRoleChange = async () => {
    try {
      console.log("Thay đổi vai trò của", changeRoleModal.memberName, "từ", changeRoleModal.currentRole, "thành", changeRoleModal.newRole);

      // Chuyển đổi vai trò từ "Owner" -> "OWNER" để phù hợp với API
      const roleMapping = {
        'Owner': 'OWNER',
        'Admin': 'ADMIN',
        'Member': 'MEMBER'
      };

      const apiRole = roleMapping[changeRoleModal.newRole] || 'MEMBER';

      // Lưu lại vai trò hiện tại để khôi phục nếu có lỗi
      const currentRole = changeRoleModal.currentRole;
      const memberId = changeRoleModal.memberId;
      const newRole = changeRoleModal.newRole;

      // Đóng modal trước để cải thiện trải nghiệm người dùng
      handleCloseChangeRole();

      // Gọi API để thay đổi vai trò trước khi cập nhật UI
      await reassignUserRole(
        selectedProject.id,
        memberId,
        apiRole
      );

      // Chỉ cập nhật UI sau khi API thành công
      setApiProjects(prevProjects => {
        const updatedProjects = [...prevProjects];
        const projectIndex = updatedProjects.findIndex(p => p.id === selectedProject.id);

        if (projectIndex !== -1) {
          const memberIndex = updatedProjects[projectIndex].members.findIndex(
            m => m.id === memberId
          );

          if (memberIndex !== -1) {
            updatedProjects[projectIndex].members[memberIndex].role = newRole;
          }
        }

        return updatedProjects;
      });

      // Hiển thị thông báo thành công
      alert(`Đã thay đổi vai trò của ${changeRoleModal.memberName} thành ${newRole}`);

      // Làm mới danh sách thành viên từ server
      await fetchProjectUsers(selectedProject.id);

    } catch (error) {
      console.error("Lỗi khi thay đổi vai trò:", error);
      alert(error.message || "Không thể thay đổi vai trò. Vui lòng thử lại sau.");

      // Refresh lại danh sách thành viên để đảm bảo hiển thị đúng vai trò
      await fetchProjectUsers(selectedProject.id);
    }
  };

  // Thêm hàm xử lý khi click vào "Delete Member" trong menu
  const handleDeleteMember = () => {
    // Lấy thông tin thành viên được chọn
    const memberToDelete = selectedProject.members.find(m => m.id === memberContextMenu.memberId);

    if (memberToDelete) {
      // Hiển thị modal xác nhận xóa
      setDeletingMember({
        show: true,
        member: memberToDelete,
        memberId: memberToDelete.id,
        memberName: memberToDelete.name
      });
    }

    // Đóng context menu
    setMemberContextMenu({ ...memberContextMenu, visible: false });
  };

  // Cập nhật hàm xác nhận xóa thành viên
  const confirmDeleteMember = async () => {
    try {
      console.log("Xác nhận xóa thành viên:", deletingMember.memberName);
      setDeletingMember({ show: false, member: null, memberId: null, memberName: '' });

      // Cập nhật UI trước
      setApiProjects(prevProjects => {
        const updatedProjects = [...prevProjects];
        const projectIndex = updatedProjects.findIndex(p => p.id === selectedProject.id);

        if (projectIndex !== -1) {
          updatedProjects[projectIndex].members = updatedProjects[projectIndex].members.filter(
            m => m.id !== deletingMember.memberId
          );
        }

        return updatedProjects;
      });

      await unassignUserFromProject(selectedProject.id, deletingMember.memberId);
      alert(`Đã xóa thành viên ${deletingMember.memberName} khỏi dự án thành công!`);
      await fetchProjectUsers(selectedProject.id);

    } catch (error) {
      alert(error.message);
      // Refresh lại danh sách thành viên nếu có lỗi
      await fetchProjectUsers(selectedProject.id);
    }
  };

  // Thêm hàm hủy xóa thành viên
  const cancelDeleteMember = () => {
    setDeletingMember({ show: false, member: null, memberId: null, memberName: '' });
  };

  // Thêm hàm xử lý khi click vào nút Create AI
  // const handleCreateAI = () => {
  //   setShowAIChat(true);
  // };

  // Thêm hàm để đóng AI Chat
  // const handleCloseAIChat = () => {
  //   setShowAIChat(false);
  // };

  // Thêm hàm xử lý khi click vào icon panel
  const handlePanelIconClick = (e) => {
    e.stopPropagation();
    setPanelDropdown(!panelDropdown);
  };

  // Thêm useEffect để đóng panel dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = () => {
      if (panelDropdown) {
        setPanelDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [panelDropdown]);

  // Thêm hàm xử lý khi click vào update Project
  const handleEditProject = () => {
    // Đặt giá trị ban đầu cho form từ project hiện tại
    setEditingProject({
      name: selectedProject.name,
      description: selectedProject.description
    });
    setEditProjectModal(true);
    setPanelDropdown(false);
  };

  // Hàm xử lý khi thay đổi giá trị trong form update project
  const handleEditProjectChange = (e) => {
    const { name, value } = e.target;
    setEditingProject(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Hàm xử lý khi lưu chỉnh sửa project
  const handleSaveProject = async () => {
    try {
      if (!editingProject.name.trim()) {
        alert('Tên dự án không được để trống');
        return;
      }

      // Chuẩn bị dữ liệu để gửi API
      const projectData = {
        project_name: editingProject.name,
        project_short: selectedProject.name.substring(0, 2).toUpperCase(),
        description: editingProject.description || ''
      };

      console.log('Đang gửi dữ liệu cập nhật:', projectData);

      // Gọi API để cập nhật project
      const response = await updateProject(selectedProject.id, projectData);

      // Cập nhật project trong state
      setApiProjects(prevProjects => {
        const updatedProjects = [...prevProjects];
        const projectIndex = updatedProjects.findIndex(p => p.id === selectedProject.id);

        if (projectIndex !== -1) {
          updatedProjects[projectIndex].name = editingProject.name;
          updatedProjects[projectIndex].description = editingProject.description;
        }

        return updatedProjects;
      });

      // Cập nhật localStorage và phát sự kiện để thông báo cho sidebar
      try {
        const updatedData = await getUserProjects();
        saveProjectsToStorage(updatedData);

        // Phát sự kiện custom để thông báo cho sidebar cập nhật
        const projectsUpdatedEvent = new CustomEvent('projectsUpdated');
        window.dispatchEvent(projectsUpdatedEvent);
      } catch (error) {
        console.error("Lỗi khi cập nhật localStorage sau khi cập nhật dự án:", error);
      }

      // Hiển thị thông báo thành công
      setSuccessToast({
        show: true,
        message: 'Project updated successfully.',
        icon: 'success'
      });

      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setSuccessToast({
          show: false,
          message: '',
          icon: null
        });
      }, 3000);

      // Đóng modal
      setEditProjectModal(false);
    } catch (error) {
      console.error('Lỗi khi cập nhật dự án:', error);
      alert('Không thể cập nhật dự án. Vui lòng thử lại.');
    }
  };

  // Hàm đóng modal chỉnh sửa project
  const handleCancelEdit = () => {
    setEditProjectModal(false);
  };

  // Thêm hàm xử lý khi click vào Copy Link
  const handleCopyLink = () => {
    if (selectedProject && selectedProject.id) {
      // Lấy domain hiện tại
      const domain = window.location.origin;

      // Lấy token từ cả hai nơi lưu trữ có thể có token
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token') ||
        localStorage.getItem('token') || sessionStorage.getItem('token');

      // Lấy email người dùng hiện tại
      const userEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');

      // Tạo URL cơ bản đến project board
      const baseProjectUrl = `${domain}/project/board/${selectedProject.id}`;

      // Tạo URL với token (nếu có) để người dùng không cần đăng nhập lại
      let projectUrl = baseProjectUrl;
      if (token) {
        // Thêm token vào URL dưới dạng query parameter
        const urlWithParams = new URL(baseProjectUrl);
        urlWithParams.searchParams.append('token', token);
        if (userEmail) {
          urlWithParams.searchParams.append('email', userEmail);
        }
        projectUrl = urlWithParams.toString();
      }

      // Copy URL vào clipboard
      navigator.clipboard.writeText(projectUrl);

      alert(`Link đến dự án "${selectedProject.name}" đã được sao chép!`);
    } else {
      alert('Vui lòng chọn một dự án trước');
    }
    setPanelDropdown(false);
  };

  // Cập nhật hàm xử lý khi click vào Delete Project trong context menu
  const handlePanelDeleteClick = () => {
    // Hiển thị modal xác nhận
    setDeletingProject({
      show: true,
      project: selectedProject
    });
    setPanelDropdown(false);
  };

  // Thêm useEffect để kiểm tra vai trò Scrum Master khi chọn project
  useEffect(() => {
    const checkScrumMasterRole = () => {
      if (selectedProject && selectedProject.members) {
        const currentUserEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
        const currentUser = selectedProject.members.find(member => member.email === currentUserEmail);
        setIsScrumMaster(currentUser && (currentUser.role === 'Owner' || currentUser.role === 'Admin'));
      } else {
        setIsScrumMaster(false);
      }
    };

    checkScrumMasterRole();
  }, [selectedProjectIndex, selectedProject]);

  // Thêm hàm để lấy số lượng task đã hoàn thành và tổng số task
  const getCompletedTasksCount = async (projectId) => {
    try {
      // Sử dụng lại hàm getProjectTasks đã có
      const tasks = await getProjectTasks(projectId);

      // Đếm số task đã hoàn thành
      const completedTasks = tasks.filter(task => task.task_status === "DONE").length;
      const totalTasks = tasks.length;

      // Trả về chuỗi dạng "x/y"
      return `${completedTasks}/${totalTasks}`;
    } catch (error) {
      console.error("Lỗi khi lấy số lượng task đã hoàn thành:", error);
      return "0/0"; // Giá trị mặc định nếu có lỗi
    }
  };

  // Thêm hàm để lấy số lượng cycle đã hoàn thành
  const getCompletedCyclesCount = async (projectId) => {
    try {
      // Sử dụng lại hàm getProjectCycles đã có
      const cycles = await getProjectCycles(projectId);

      // Lấy ngày hiện tại
      const currentDate = new Date();

      // Đếm số cycle đã hoàn thành (end_date trước ngày hiện tại)
      const completedCycles = cycles.filter(cycle => {
        const endDate = new Date(cycle.end_date);
        return endDate < currentDate;
      }).length;

      return completedCycles;
    } catch (error) {
      console.error("Lỗi khi lấy số lượng cycle đã hoàn thành:", error);
      return 0; // Giá trị mặc định nếu có lỗi
    }
  };

  // Hàm để lấy danh sách cycles của project
  const getProjectCycles = async (projectId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/cycles/1/10`, {
        headers: {
          'Authentication': localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
        }
      });

      const data = await response.json();

      // Xử lý dữ liệu trả về
      let cycles = [];
      if (Array.isArray(data)) {
        cycles = data;
      } else if (data && data.cycles && Array.isArray(data.cycles)) {
        cycles = data.cycles;
      }

      return cycles;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách cycles:", error);
      return [];
    }
  };

  // Hàm để lấy danh sách tasks của project
  const getProjectTasks = async (projectId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks/0/1000`, {
        headers: {
          'Authentication': localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
        }
      });

      const data = await response.json();

      // Xử lý dữ liệu trả về
      let tasks = [];
      if (Array.isArray(data)) {
        tasks = data;
      } else if (data && data.tasks && Array.isArray(data.tasks)) {
        tasks = data.tasks;
      }

      return tasks;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách tasks:", error);
      return [];
    }
  };

  // Hàm để tính toán tỷ lệ hoàn thành của các task trong cycle
  const calculateTasksCompletionForCycle = (tasks, cycle) => {
    if (!tasks || !tasks.length || !cycle) return 0;

    // Lấy thời gian bắt đầu và kết thúc của cycle
    const cycleStartDate = new Date(cycle.start_date);
    const cycleEndDate = new Date(cycle.end_date);

    // Lọc các task thuộc cycle này (dựa trên thời gian)
    const tasksInCycle = tasks.filter(task => {
      if (!task.start_date || !task.end_date) return false;

      const taskStartDate = new Date(task.start_date);
      const taskEndDate = new Date(task.end_date);

      // Task thuộc cycle nếu có overlap về mặt thời gian
      return (
        (taskStartDate >= cycleStartDate && taskStartDate <= cycleEndDate) ||
        (taskEndDate >= cycleStartDate && taskEndDate <= cycleEndDate) ||
        (taskStartDate <= cycleStartDate && taskEndDate >= cycleEndDate)
      );
    });

    // Nếu không có task nào trong cycle này
    if (!tasksInCycle.length) return 0;

    // Đếm số task đã hoàn thành
    const completedTasks = tasksInCycle.filter(task => task.task_status === "DONE").length;

    // Tính phần trăm
    const progressPercent = Math.round((completedTasks / tasksInCycle.length) * 100);

    return progressPercent;
  };

  return (
    <Container fluid className="project-container projects-page p-0 m-0 border-0">
      <div className="project-header-wrapper mt-0 pt-0 border-0">
        <Row className="project-header align-items-center m-0 pt-4 border-0">
          <Col>
            <h1>Projects</h1>
          </Col>
          <Col xs="auto">
            <Button
              type="primary"
              className="create-project-btn"
              onClick={() => setIsCreatingProject(true)}
            >
              <PlusOutlined className="plus-icon" />
              Create Project
            </Button>
          </Col>
        </Row>
      </div>

      <div style={{ marginBottom: "20px" }}></div>

      <Row className="m-0 p-0 border-0">
        <Col md={9} className="p-0">
          <div className="d-flex justify-content-end mb-3">
            <div className="view-toggle">
              <Dropdown>
                <Dropdown.Toggle variant="light" id="dropdown-view" className="view-toggle-btn">
                  <img
                    src={`/assets/icons/${viewMode}_icon.svg`}
                    alt="View"
                    className="view-icon"
                  /> View
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item
                    onClick={() => setViewMode('list')}
                    className="dropdown-item-custom"
                  >
                    {viewMode === 'list' && (
                      <img src="/assets/icons/check_icon.svg" alt="Selected" className="check-icon" />
                    )}
                    <img src="/assets/icons/list_icon.svg" alt="List" className="view-icon" />
                    List
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => setViewMode('box')}
                    className="dropdown-item-custom"
                  >
                    {viewMode === 'box' && (
                      <img src="/assets/icons/check_icon.svg" alt="Selected" className="check-icon" />
                    )}
                    <img src="/assets/icons/box_icon.svg" alt="Box" className="view-icon" />
                    Box
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>

          <div className={`view-container ${viewMode}`}>
            {isLoading ? (
              <div className="text-center p-5">
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : projects.length === 0 ? (
              <Empty description="Không có dự án nào." />
            ) : viewMode === 'list' ? (
              // List View
              <div className="project-table animated-items">
                <div className="table-header">
                  <div className="header-cell checkbox-cell"></div>
                  <div className="header-cell name-cell">Name</div>
                  <div className="header-cell members-cell">Members</div>
                  <div className="header-cell created-by-cell">Created By</div>
                  <div className="header-cell created-at-cell">Created At</div>
                </div>

                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    className={`table-row animated-item item-${index} ${selectedProjectIndex === index ? 'selected' : ''}`}
                    onClick={() => handleProjectClick(index)}
                    onDoubleClick={() => handleProjectDoubleClick(project)}
                  >
                    <div className="cell checkbox-cell">
                      <Form.Check type="checkbox" onClick={(e) => e.stopPropagation()} />
                    </div>
                    <div className="cell name-cell">{project.name}</div>
                    <div className="cell members-cell">
                      <div className="members-list-view">
                        {project.members.slice(0, 5).map((member, i) => (
                          <span
                            key={i}
                            className="member-avatar-list"
                            style={{
                              backgroundColor: member.avatarImg ? 'transparent' : getAvatarColor(member.avatar)
                            }}
                            title={`${member.name} (${member.role})`}
                          >
                            {member.avatarImg ?
                              <img src={member.avatarImg} alt={member.name} className="avatar-img" /> :
                              member.avatar}
                          </span>
                        ))}
                        {project.members.length > 5 && (
                          <span className="member-avatar-list more-members-list">+{project.members.length - 5}</span>
                        )}
                      </div>
                    </div>
                    <div className="cell created-by-cell">
                      {project.createdBy}
                    </div>
                    <div className="cell created-at-cell">
                      {project.createdAt}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Box View
              <div className="project-grid animated-items">
                <Row>
                  {projects.map((project, index) => (

                    <Col md={4} lg={4} key={project.id} className={`animated-item item-box-${index}`}>
                      <div
                        className={`project-card ${selectedProjectIndex === index ? 'selected' : ''}`}
                        onClick={() => handleProjectClick(index)}
                        onDoubleClick={() => handleProjectDoubleClick(project)}
                      >
                        <div className="card-header">
                          <div className="left-section">
                            <div className="project-card-icon">
                              <img
                                src="/assets/icons/project_icon.svg"
                                alt="Project"
                              />
                            </div>
                          </div>
                          <div className="right-section">
                            <div className="project-card-title">
                              {project.name}
                            </div>
                            <div className="member-list">
                              {project.members.slice(0, 2).map((member, i) => (
                                <span
                                  key={i}
                                  className="member-avatar"
                                  style={{
                                    backgroundColor: member.avatarImg ? 'transparent' : getAvatarColor(member.avatar)
                                  }}
                                  title={`${member.name} (${member.role})`}
                                >
                                  {member.avatarImg ?
                                    <img src={member.avatarImg} alt={member.name} className="avatar-img" /> :
                                    member.avatar}
                                </span>
                              ))}
                              {project.members.length > 2 && (
                                <span
                                  className="member-avatar more-members"
                                  style={{ backgroundColor: '#ffefed', color: '#ff4d4d' }}
                                >
                                  +{project.members.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="card-description">
                          {project.description}
                        </div>
                        <div className="card-footer">
                          <div className="creator-info">
                            <div className="creator-avatar" style={{ backgroundColor: project.creatorAvatarImg ? 'transparent' : getAvatarColor(project.creatorAvatar || '?') }}>
                              {project.creatorAvatarImg ?
                                <img src={project.creatorAvatarImg} alt={project.createdBy} className="avatar-img" /> :
                                (project.creatorAvatar || '?')}
                            </div>
                            <div className="creator-name">{project.createdBy || 'Unknown'}</div>
                          </div>
                          <div className="created-at">{project.createdAt}</div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            )}
          </div>
        </Col>

        <Col md={3}>
          <div className="project-detail-panel">
            <div className="panel-top-icon" onClick={handlePanelIconClick}>
              <img src="/assets/icons/more_project_icon.svg" alt="Panel Icon" />
              {panelDropdown && (
                <div className="panel-dropdown">
                  <div className="panel-dropdown-item" onClick={handleEditProject}>
                    <img src="/assets/icons/edit_icon.svg" alt="Edit Icon" />
                    <span>Update Project</span>
                  </div>
                  <div className="panel-dropdown-item" onClick={handleCopyLink}>
                    <img src="/assets/icons/link_icon.svg" alt="Link Icon" />
                    <span>Copy Link</span>
                  </div>
                  <div className="panel-dropdown-item delete-item" onClick={handlePanelDeleteClick}>
                    <img src="/assets/icons/delete_icon.svg" alt="Delete Icon" />
                    <span>Delete Project</span>
                  </div>
                </div>
              )}
            </div>
            <div className="project-title">
              <div className="project-card-icon">
                <img
                  src="/assets/icons/project_icon.svg"
                  alt="Project"
                />

              </div>
              <h3>{selectedProject.name}</h3>
            </div>

            <div className="project-description">
              {selectedProject.description}
            </div>

            <div className="members-section">
              <div className="members-header">
                <h5>Members</h5>
                {isScrumMaster && (
                  <span className="add-member-btn" onClick={handleAddMember}>+</span>
                )}
              </div>
              {selectedProject.members && selectedProject.members.map((member, index) => (
                <div
                  key={index}
                  className="member-item"
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className="member-avatar" style={{ backgroundColor: member.avatarImg ? 'transparent' : getAvatarColor(member.avatar) }}>
                    {member.avatarImg ?
                      <img src={member.avatarImg} alt={member.name} className="avatar-img" /> :
                      member.avatar}
                  </span>
                  <div className="member-info">
                    <div className="member-name">{member.name}</div>
                    <div className="member-role">{member.role}</div>
                  </div>
                  <div
                    className="member-more-action"
                    onClick={(e) => handleMemberContextMenu(e, member, selectedProject.id)}
                    title="More actions"
                  >
                    <i className="fas fa-ellipsis-v"></i>
                  </div>
                </div>
              ))}

              {/* Modal thêm thành viên */}
              {isAddingMember && (
                <div className="add-member-modal">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5>Add People To This Project</h5>
                    </div>
                    <div className="modal-body">
                      <Form>
                        <Form.Group className="mb-3">
                          <Form.Label>Enter Email <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="email"
                            placeholder="Email@Company.Com"
                            value={memberEmail}
                            onChange={handleMemberEmailChange}
                            disabled={isAddingMemberSubmitting}
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Role <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            value={memberRole}
                            onChange={handleMemberRoleChange}
                            disabled={isAddingMemberSubmitting}
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                            <option value="OWNER">Owner</option>
                          </Form.Select>
                        </Form.Group>

                        <div className="connected-to mb-3">
                          <span>Connected To</span>
                          <img src="/assets/icons/google_icon.svg" alt="Google" className="google-icon" />
                        </div>

                        <div className="recaptcha-notice mb-4">
                          <small className="text-muted">
                            This Site Is Protected By ReCAPTCHA And The Google <a href="https://policies.google.com/privacy" className="text-primary" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, And <a href="https://policies.google.com/terms" className="text-primary" target="_blank" rel="noopener noreferrer">Terms Of Service</a> Apply.
                          </small>
                        </div>

                        <div className="d-flex justify-content-end">
                          <Button
                            variant="light"
                            className="me-2"
                            onClick={handleCloseAddMember}
                            disabled={isAddingMemberSubmitting}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="danger"
                            onClick={handleAddMemberSubmit}
                            disabled={isAddingMemberSubmitting}
                          >
                            {isAddingMemberSubmitting ? 'Đang thêm...' : 'Add'}
                          </Button>
                        </div>
                      </Form>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="summary-section">
              <div className="summary-header">
                <h5>Summary</h5>
              </div>

              <div className="summary-item d-flex justify-content-between">
                <div className="summary-label">Tasks Completed</div>
                <div className="summary-value">
                  {selectedProject.epicsCompleted}
                </div>
              </div>
              <div className="summary-item d-flex justify-content-between">
                <div className="summary-label">Cycle Completed</div>
                <div className="summary-value">
                  {selectedProject.sprintsCompleted}
                </div>
              </div>

              <div className="progress-section">
                {selectedProject.epics.map((epic, index) => (
                  <div key={index} className="progress-item">
                    <div className="d-flex justify-content-between">
                      <div className="progress-label">{epic.name}</div>
                      <div className="progress-value">{epic.progress}%</div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${epic.progress}%`, backgroundColor: epic.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="danger"
                className="go-to-project-btn"
                onClick={handleGoToDetail}
              >
                Go To Project
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Modal tạo dự án mới */}
      {isCreatingProject && (
        <div className="edit-project-modal">
          <div className="edit-project-content">
            <h2>Create New Project</h2>

            <div className="edit-project-section">
              <h4>Project Details</h4>

              <div className="edit-project-field">
                <label>Project Name</label>
                <input
                  type="text"
                  name="name"
                  value={newProject.name}
                  onChange={handleProjectChange}
                  placeholder="Enter project name"
                />
              </div>

              <div className="edit-project-field">
                <label>Project Description</label>
                <textarea
                  name="description"
                  value={newProject.description}
                  onChange={handleProjectChange}
                  placeholder="Describe your project"
                  rows={5}
                />
              </div>
            </div>

            <div className="edit-project-actions">
              <button className="cancel-btn" onClick={handleCloseCreateProject}>Cancel</button>
              <button className="save-btn" onClick={handleSubmitProject}>
                <i className="fa fa-check"></i> Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận delete project */}
      {deletingProject.show && deletingProject.project && (
        <div className="delete-project-modal">
          <div className="delete-project-content">
            <h3>Are you sure you want to delete this project?</h3>
            <p>This action cannot be undone.</p>

            <div className="delete-project-actions">
              <button className="cancel-btn" onClick={cancelDeleteProject}>
                Cancel
              </button>
              <button className="delete-btn" onClick={confirmDeleteProject}>
                Yes, delete it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Context Menu */}
      {memberContextMenu.visible && (
        <div
          className="context-menu member-context-menu"
          style={{
            position: 'absolute',
            top: `${memberContextMenu.y}px`,
            left: `${memberContextMenu.x}px`
          }}
        >
          <div className="context-menu-item" onClick={handleChangeRole}>
            <i className="fas fa-user-edit"></i> Change Role
          </div>
          <div className="context-menu-item" onClick={handleDeleteMember}>
            <i className="fas fa-trash-alt"></i> Delete Member
          </div>
        </div>
      )}

      {/* Modal thay đổi vai trò */}
      {changeRoleModal.show && (
        <div className="change-role-modal">
          <div className="modal-content">
            <div className="modal-body">
              <h4 className="mb-4">Change Role</h4>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={changeRoleModal.memberEmail || changeRoleModal.memberName}
                    disabled
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    value={changeRoleModal.newRole}
                    onChange={handleRoleChange}
                  >
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Member">Member</option>
                  </Form.Select>
                </Form.Group>

                <div className="d-flex justify-content-end mt-4">
                  <Button
                    variant="light"
                    className="me-2"
                    onClick={handleCloseChangeRole}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleSubmitRoleChange}
                  >
                    Change Role
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa thành viên */}
      {deletingMember.show && (
        <div className="archive-project-modal">
          <div className="modal-content">
            <div className="modal-body text-center">
              <h4>Are you sure you want to delete member?</h4>
              <p>This action cannot be undone.</p>

              <div className="d-flex justify-content-center mt-4">
                <Button
                  variant="light"
                  className="me-2"
                  onClick={cancelDeleteMember}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="archive-btn"
                  onClick={confirmDeleteMember}
                >
                  Yes, delete it
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa project */}
      {editProjectModal && (
        <div className="edit-project-modal">
          <div className="edit-project-content">
            <h2>Update Project</h2>

            <div className="edit-project-section">
              <h4>Project Details</h4>

              <div className="edit-project-field">
                <label>Project Name</label>
                <input
                  type="text"
                  name="name"
                  value={editingProject.name}
                  onChange={handleEditProjectChange}
                  placeholder="Enter project name"
                />
              </div>

              <div className="edit-project-field">
                <label>Project Description</label>
                <textarea
                  name="description"
                  value={editingProject.description}
                  onChange={handleEditProjectChange}
                  placeholder="No description"
                  rows={5}
                />
              </div>
            </div>

            <div className="edit-project-actions">
              <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
              <button className="save-btn" onClick={handleSaveProject}>
                <i className="fa fa-check"></i> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast thông báo thành công */}
      {successToast.show && (
        <div className="success-toast">
          <div className="toast-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="toast-content">
            <div className="toast-title">Success!</div>
            <div className="toast-message">{successToast.message}</div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default ProjectsLayout;
