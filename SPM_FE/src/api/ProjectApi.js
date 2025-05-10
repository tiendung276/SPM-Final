import axios from 'axios';
import config from '../config/config';

const { API_BASE_URL } = config;

// NOTE: Nếu bạn gặp vấn đề CORS, hãy xem xét các giải pháp sau:
// 1. Sử dụng CORS proxy middleware trong development
// 2. Cấu hình server backend để cho phép CORS từ origin của frontend
// 3. Sử dụng proxy trong package.json khi sử dụng create-react-app
//    Ví dụ: thêm "proxy": "http://localhost:8881" vào package.json

// Tạo một instance axios tùy chỉnh với cấu hình cho các yêu cầu API
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  // Không sử dụng withCredentials để tránh vấn đề CORS 
  withCredentials: false,
});

// Interceptor để xử lý lỗi mạng và CORS
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('Lỗi kết nối mạng hoặc CORS:', error);
      return Promise.reject(new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc cấu hình CORS.'));
    }
    return Promise.reject(error);
  }
);

// Interceptor để thêm token authentication vào tất cả requests
apiClient.interceptors.request.use(
  config => {
    try {
      const token = getAuthToken();
      if (token) {
        // Sử dụng đúng format header authentication theo yêu cầu của server
        config.headers['Authentication'] = token;
      }
    } catch (error) {
      console.error('Lỗi khi thêm token vào request:', error);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Hàm lấy token từ localStorage hoặc sessionStorage
const getAuthToken = () => {
  try {
    // Kiểm tra tất cả các biến có thể chứa token
    let token = sessionStorage.getItem('access_token');
    console.log("Token từ sessionStorage(access_token):", token ? "Có token" : "Không có token");

    if (!token) {
      token = localStorage.getItem('access_token');
      console.log("Token từ localStorage(access_token):", token ? "Có token" : "Không có token");
    }

    // Kiểm tra cả biến lưu trữ token cũ (nếu có)
    if (!token) {
      token = sessionStorage.getItem('token');
      console.log("Token từ sessionStorage(token):", token ? "Có token" : "Không có token");
    }

    if (!token) {
      token = localStorage.getItem('token');
      console.log("Token từ localStorage(token):", token ? "Có token" : "Không có token");
    }

    if (!token) {
      console.error("Không tìm thấy token trong cả localStorage và sessionStorage");
      throw new Error('No authentication token found. Please login first.');
    }

    // Đảm bảo token được lưu ở cả hai nơi để tránh lỗi trong tương lai
    try {
      sessionStorage.setItem('access_token', token);
      localStorage.setItem('access_token', token);
    } catch (error) {
      console.error("Lỗi khi đồng bộ token:", error);
    }

    return token;
  } catch (error) {
    console.error("Lỗi khi lấy token:", error);
    throw error;
  }
};

// Hàm tạo project_short từ tên dự án
const generateProjectShort = (projectName) => {
  if (!projectName) return "PR";

  // Tách các từ trong tên dự án
  const words = projectName.split(/\s+/);

  // Lấy 2 ký tự đầu tiên của mỗi từ và viết hoa
  let shortName = words.map(word => {
    // Đảm bảo chỉ lấy tối đa 2 ký tự từ mỗi từ
    return word.substring(0, 2).toUpperCase();
  }).join('');

  // Nếu shortName quá dài, cắt bớt
  if (shortName.length > 10) {
    shortName = shortName.substring(0, 10);
  }

  // Nếu không có ký tự nào, trả về giá trị mặc định
  return shortName || "PR";
};

// Thêm hàm để lưu danh sách dự án vào localStorage
export const saveProjectsToStorage = (projects) => {
  try {
    localStorage.setItem('userProjects', JSON.stringify(projects));
    // Lưu thời gian lưu trữ để kiểm tra "tuổi" của dữ liệu
    localStorage.setItem('userProjectsTimestamp', Date.now());
  } catch (error) {
    console.error("Lỗi khi lưu dự án vào localStorage:", error);
  }
};

// Thêm hàm để lấy danh sách dự án từ localStorage
export const getProjectsFromStorage = () => {
  try {
    const projects = localStorage.getItem('userProjects');
    return projects ? JSON.parse(projects) : [];
  } catch (error) {
    console.error("Lỗi khi đọc dự án từ localStorage:", error);
    return [];
  }
};

// Thêm hàm để lưu thông tin thành viên dự án vào localStorage
export const saveProjectUsersToStorage = (projectId, users) => {
  try {
    const projectUsersKey = `project_${projectId}_users`;
    localStorage.setItem(projectUsersKey, JSON.stringify(users));
  } catch (error) {
    console.error(`Lỗi khi lưu thành viên dự án ${projectId} vào localStorage:`, error);
  }
};

// Thêm hàm để lấy thông tin thành viên dự án từ localStorage
export const getProjectUsersFromStorage = (projectId) => {
  try {
    const projectUsersKey = `project_${projectId}_users`;
    const users = localStorage.getItem(projectUsersKey);
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error(`Lỗi khi đọc thành viên dự án ${projectId} từ localStorage:`, error);
    return [];
  }
};

// Hàm gọi API tạo project
export const createProject = async (projectData) => {
  try {
    const token = getAuthToken();

    // Tạo project_short từ tên dự án
    const projectShort = generateProjectShort(projectData.name);

    // Chuyển đổi dữ liệu theo đúng định dạng API yêu cầu
    const formattedData = {
      project_name: projectData.name,
      project_short: projectShort,
      description: projectData.description || ""
    };

    console.log("Đang gửi request với token:", token);
    console.log("Dữ liệu gửi đi:", formattedData);

    const response = await apiClient.post(
      `/projects/create`,
      formattedData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    // Lấy thông tin của dự án vừa tạo
    const newProjectId = response.data.project_id;
    console.log("Dự án đã được tạo với ID:", newProjectId);

    // Lấy thông tin người dùng hiện tại từ localStorage (email)
    const userEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');

    // Tự động thêm người tạo dự án với vai trò OWNER vào dự án
    if (userEmail && newProjectId) {
      try {
        await assignUserToProject(newProjectId, {
          email: userEmail,
          role: "OWNER"
        });
        console.log("Đã thêm người tạo dự án vào dự án với vai trò OWNER:", userEmail);
      } catch (assignError) {
        console.error("Lỗi khi thêm người tạo dự án vào dự án:", assignError);
      }
    }

    // Sau khi tạo dự án thành công, tự động cập nhật danh sách dự án
    try {
      const projects = await getUserProjects();
      saveProjectsToStorage(projects);
    } catch (updateError) {
      console.error("Không thể tự động cập nhật danh sách dự án:", updateError);
    }

    return response.data;
  } catch (error) {
    console.error("Chi tiết lỗi:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      alert('Vui lòng đăng nhập để tạo dự án');
    } else if (error.response && error.response.status === 403) {
      alert('Bạn không có quyền thực hiện thao tác này. Token có thể đã hết hạn.');
      // Đăng xuất người dùng khi token hết hạn
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
      localStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('token_type');
      sessionStorage.removeItem('isAuthenticated');
      // Chuyển hướng đến trang đăng nhập
      window.location.href = '/login';
    } else {
      alert(`Lỗi khi tạo dự án: ${error.message}`);
    }
    throw error;
  }
};

// Thêm hàm lấy danh sách projects
export const getUserProjects = async () => {
  try {
    const token = getAuthToken();
    const response = await apiClient.get(
      `/projects/my`,
      {
        headers: {
          authentication: token,
        }
      }
    );

    // Lưu kết quả vào localStorage
    saveProjectsToStorage(response.data);

    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách dự án:", error);

    // Nếu có lỗi, thử lấy dữ liệu từ localStorage
    const cachedProjects = getProjectsFromStorage();
    if (cachedProjects && cachedProjects.length > 0) {
      console.log("Sử dụng dữ liệu dự án từ bộ nhớ cache");
      return cachedProjects;
    }

    throw error;
  }
};

// Thêm hàm lấy chi tiết project theo ID
export const getProjectDetail = async (projectId) => {
  try {
    const token = getAuthToken();
    const response = await apiClient.get(
      `/projects/${projectId}`,
      {
        headers: {
          authentication: token,
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết dự án:", error);
    throw error;
  }
};

// Thêm hàm cập nhật thông tin project
export const updateProject = async (projectId, projectData) => {
  try {
    const token = getAuthToken();

    // Chuẩn bị dữ liệu để gửi đi
    const formattedData = {
      project_name: projectData.project_name,
      project_short: projectData.project_short,
      description: projectData.description || ""
    };

    console.log("Đang gửi request cập nhật project:", projectId);
    console.log("Dữ liệu cập nhật:", formattedData);

    const response = await apiClient.put(
      `/projects/${projectId}/update`,
      formattedData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả cập nhật project:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi cập nhật dự án:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      alert('Vui lòng đăng nhập để cập nhật dự án');
    } else if (error.response && error.response.status === 403) {
      alert('Bạn không có quyền thực hiện thao tác này. Token có thể đã hết hạn.');
      // Đăng xuất người dùng khi token hết hạn
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
      localStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('token_type');
      sessionStorage.removeItem('isAuthenticated');
      // Chuyển hướng đến trang đăng nhập
      window.location.href = '/login';
    } else {
      alert(`Lỗi khi cập nhật dự án: ${error.message}`);
    }
    throw error;
  }
};

// Thêm hàm gán người dùng vào dự án
export const assignUserToProject = async (projectId, userData) => {
  try {
    const token = getAuthToken();
    const formattedData = {
      user_email: userData.email,
      role: userData.role
    };

    const response = await apiClient.post(
      `/projects/${projectId}/assign`,
      formattedData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Lỗi khi gán người dùng vào dự án:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để thêm thành viên');
    } else if (error.response && error.response.status === 403) {
      // Thay đổi xử lý lỗi 403
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.response && error.response.status === 500) {
      throw new Error(`Lỗi máy chủ: ${error.response.data.detail || 'Internal Server Error'}`);
    } else {
      throw new Error(`Lỗi khi gán người dùng vào dự án: ${error.message}`);
    }
  }
};

// Thêm hàm lấy danh sách người dùng trong dự án
export const getProjectUsers = async (projectId) => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy danh sách người dùng của dự án:", projectId);

    const response = await apiClient.get(
      `/projects/${projectId}/users`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Danh sách người dùng trong dự án:", response.data);

    // Lưu thông tin người dùng vào localStorage
    saveProjectUsersToStorage(projectId, response.data);

    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách người dùng trong dự án:", error.response || error);

    // Thử lấy dữ liệu từ localStorage
    const cachedUsers = getProjectUsersFromStorage(projectId);
    if (cachedUsers && cachedUsers.length > 0) {
      console.log(`Sử dụng dữ liệu thành viên dự án ${projectId} từ bộ nhớ cache`);
      return cachedUsers;
    }

    if (error.message === 'No authentication token found. Please login first.') {
      alert('Vui lòng đăng nhập để xem danh sách thành viên');
    } else if (error.response && error.response.status === 403) {
      alert('Bạn không có quyền thực hiện thao tác này. Token có thể đã hết hạn.');
      // Đăng xuất người dùng khi token hết hạn
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
      localStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('token_type');
      sessionStorage.removeItem('isAuthenticated');
      // Chuyển hướng đến trang đăng nhập
      window.location.href = '/login';
    } else {
      console.log(`Không thể lấy danh sách người dùng: ${error.message}`);
    }
    return []; // Trả về mảng rỗng nếu có lỗi
  }
};

// Thêm hàm reassign user role
export const reassignUserRole = async (projectId, userId, role) => {
  try {
    const token = getAuthToken();

    console.log("Đang gửi request thay đổi vai trò của người dùng trong dự án:", projectId);
    console.log("User ID:", userId);
    console.log("Vai trò mới:", role);

    const formattedData = {
      role: role
    };

    const response = await apiClient.put(
      `/projects/${projectId}/reassign/${userId}`,
      formattedData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả thay đổi vai trò người dùng:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi thay đổi vai trò người dùng trong dự án:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để thực hiện thao tác này');
    } else if (error.response && error.response.status === 403) {
      // Thay đổi xử lý lỗi 403, chỉ thông báo không bắt đăng nhập lại
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else {
      throw new Error(`Lỗi khi thay đổi vai trò người dùng: ${error.message}`);
    }
  }
};

// Thêm hàm xóa project
export const deleteProject = async (projectId) => {
  try {
    const token = getAuthToken();
    const response = await apiClient.delete(
      `/projects/${projectId}/delete`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Lỗi khi xóa dự án:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xóa dự án');
    } else if (error.response && error.response.status === 403) {
      // Thay đổi xử lý lỗi 403
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else {
      throw new Error(`Lỗi khi xóa dự án: ${error.message}`);
    }
  }
};

// Thêm hàm xóa người dùng khỏi dự án
export const unassignUserFromProject = async (projectId, userId) => {
  try {
    const token = getAuthToken();
    const response = await apiClient.delete(
      `/projects/${projectId}/unassign/${userId}`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Lỗi khi xóa người dùng khỏi dự án:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để thực hiện thao tác này');
    } else if (error.response && error.response.status === 403) {
      // Thay đổi xử lý lỗi 403
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else {
      throw new Error(`Lỗi khi xóa người dùng khỏi dự án: ${error.message}`);
    }
  }
};

// Thêm hàm tạo cycle cho project
export const createCycle = async (projectId, cycleData) => {
  try {
    const token = getAuthToken();

    // Chuẩn bị dữ liệu theo định dạng API yêu cầu
    const formattedData = {
      cycle_name: cycleData.cycleName,
      start_date: cycleData.startDate,
      end_date: cycleData.endDate,
      description: cycleData.cycleDescription || ""
    };

    console.log("Đang gửi request tạo cycle cho project:", projectId);
    console.log("Dữ liệu cycle:", formattedData);

    const response = await apiClient.post(
      `/projects/${projectId}/cycles/create`,
      formattedData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả tạo cycle:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi tạo cycle:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để tạo cycle');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error(`Lỗi khi tạo cycle: ${error.message}`);
    }
  }
};

// Thêm hàm lấy danh sách cycles của project
export const getProjectCycles = async (projectId, page = 1, pageSize = 10) => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy danh sách cycles của project:", projectId);
    console.log(`Gọi API: ${API_BASE_URL}/projects/${projectId}/cycles/${page}/${pageSize}`);

    const response = await apiClient.get(
      `/projects/${projectId}/cycles/${page}/${pageSize}`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Response đầy đủ:", response);
    console.log("Dữ liệu trả về:", response.data);

    // Kiểm tra cấu trúc dữ liệu
    if (response.data && response.data.cycles) {
      console.log("Số lượng cycles:", response.data.cycles.length);
      return response.data.cycles;
    } else if (Array.isArray(response.data)) {
      console.log("Response là mảng trực tiếp, số lượng cycles:", response.data.length);
      return response.data;
    } else {
      console.warn("Cấu trúc dữ liệu không như mong đợi:", response.data);
      return [];
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách cycles:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xem danh sách cycles');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền xem danh sách cycles');
    } else {
      throw new Error(`Lỗi khi lấy danh sách cycles: ${error.message}`);
    }
  }
};

// Thêm hàm cập nhật thông tin cycle
export const updateCycle = async (projectId, cycleId, cycleData) => {
  try {
    const token = getAuthToken();

    // Chuẩn bị dữ liệu theo định dạng API yêu cầu
    const formattedData = {
      cycle_name: cycleData.cycleName,
      start_date: cycleData.startDate,
      end_date: cycleData.endDate,
      description: cycleData.cycleDescription || ""
    };

    console.log("Đang gửi request cập nhật cycle:", cycleId);
    console.log("Dữ liệu cập nhật:", formattedData);

    const response = await apiClient.put(
      `/projects/${projectId}/cycles/${cycleId}/update`,
      formattedData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả cập nhật cycle:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi cập nhật cycle:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để cập nhật cycle');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error(`Lỗi khi cập nhật cycle: ${error.message}`);
    }
  }
};

// Thêm hàm lấy chi tiết của một cycle
export const getCycleDetail = async (projectId, cycleId) => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy chi tiết cycle:", cycleId);
    console.log(`Gọi API: ${API_BASE_URL}/projects/${projectId}/cycles/${cycleId}`);

    const response = await apiClient.get(
      `/projects/${projectId}/cycles/${cycleId}`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Chi tiết cycle:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết cycle:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xem chi tiết cycle');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền xem chi tiết cycle này');
    } else if (error.response && error.response.status === 404) {
      throw new Error('Không tìm thấy cycle');
    } else {
      throw new Error(`Lỗi khi lấy chi tiết cycle: ${error.message}`);
    }
  }
};

// Thêm hàm xóa cycle
export const deleteCycle = async (projectId, cycleId) => {
  try {
    const token = getAuthToken();

    console.log("Đang gửi request xóa cycle:", cycleId);

    const response = await apiClient.delete(
      `/projects/${projectId}/cycles/${cycleId}/delete`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả xóa cycle:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi xóa cycle:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xóa cycle');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.response && error.response.status === 404) {
      throw new Error('Không tìm thấy cycle');
    } else if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error(`Lỗi khi xóa cycle: ${error.message}`);
    }
  }
};

// Thêm hàm tạo module cho project
export const createModule = async (projectId, moduleData) => {
  try {
    const token = getAuthToken();

    // Chuẩn bị dữ liệu theo định dạng API yêu cầu
    const formattedData = {
      module_name: moduleData.moduleName,
      description: moduleData.description || ""
    };

    console.log("Đang gửi request tạo module cho project:", projectId);
    console.log("Dữ liệu module:", formattedData);

    const response = await apiClient.post(
      `/projects/${projectId}/modules/create`,
      formattedData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả tạo module:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi tạo module:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để tạo module');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error(`Lỗi khi tạo module: ${error.message}`);
    }
  }
};

// Thêm hàm lấy danh sách modules của project
export const getProjectModules = async (projectId, page = 1, pageSize = 10) => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy danh sách modules của project:", projectId);
    console.log(`Gọi API: ${API_BASE_URL}/projects/${projectId}/modules/${page}/${pageSize}`);

    const response = await apiClient.get(
      `/projects/${projectId}/modules/${page}/${pageSize}`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Response đầy đủ:", response);
    console.log("Dữ liệu trả về:", response.data);

    // Kiểm tra cấu trúc dữ liệu trả về và xử lý theo đúng định dạng
    let modulesData = [];

    if (response.data && response.data.modules && Array.isArray(response.data.modules)) {
      // API trả về cấu trúc { modules: [...] }
      modulesData = response.data.modules;
    } else if (Array.isArray(response.data)) {
      // API trả về trực tiếp mảng
      modulesData = response.data;
    } else {
      console.warn("Cấu trúc dữ liệu không như mong đợi:", response.data);
      return [];
    }

    // Chuẩn hóa dữ liệu module để hiển thị
    const formattedModules = modulesData.map(module => ({
      id: module.module_id,
      name: module.module_name,
      description: module.description,
      completed: 0 // Giá trị mặc định
    }));

    return formattedModules;

  } catch (error) {
    console.error("Lỗi khi lấy danh sách modules:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xem danh sách modules');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền xem danh sách modules');
    } else {
      throw new Error(`Lỗi khi lấy danh sách modules: ${error.message}`);
    }
  }
};

// Thêm hàm cập nhật module
export const updateModule = async (projectId, moduleId, moduleData) => {
  try {
    const token = getAuthToken();

    // Chuẩn bị dữ liệu theo định dạng API yêu cầu
    const formattedData = {
      module_name: moduleData.moduleName,
      description: moduleData.description || ""
    };

    console.log("Đang gửi request cập nhật module:", moduleId);
    console.log("Dữ liệu cập nhật:", formattedData);

    const response = await apiClient.put(
      `/projects/${projectId}/modules/${moduleId}/update`,
      formattedData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả cập nhật module:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi cập nhật module:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để cập nhật module');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error(`Lỗi khi cập nhật module: ${error.message}`);
    }
  }
};

// Thêm hàm lấy chi tiết module
export const getModuleDetail = async (projectId, moduleId) => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy chi tiết module:", moduleId);
    console.log(`Gọi API: ${API_BASE_URL}/projects/${projectId}/modules/${moduleId}`);

    const response = await apiClient.get(
      `/projects/${projectId}/modules/${moduleId}`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Chi tiết module:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết module:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xem chi tiết module');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền xem chi tiết module này');
    } else if (error.response && error.response.status === 404) {
      throw new Error('Không tìm thấy module');
    } else {
      throw new Error(`Lỗi khi lấy chi tiết module: ${error.message}`);
    }
  }
};

// Thêm hàm xóa module
export const deleteModule = async (projectId, moduleId) => {
  try {
    const token = getAuthToken();

    console.log("Đang gửi request xóa module:", moduleId);

    const response = await apiClient.delete(
      `/projects/${projectId}/modules/${moduleId}/delete`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả xóa module:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi xóa module:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xóa module');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.response && error.response.status === 404) {
      throw new Error('Không tìm thấy module');
    } else if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error(`Lỗi khi xóa module: ${error.message}`);
    }
  }
};

// Thêm hàm lấy số lượng task nằm trong khoảng thời gian của cycle
export const getTasksInCycle = async (projectId, cycleId) => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy số lượng task trong cycle:", cycleId);

    // Đầu tiên, lấy thông tin chi tiết của cycle để biết thời gian
    const cycleResponse = await apiClient.get(
      `/projects/${projectId}/cycles/${cycleId}`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    const cycleData = cycleResponse.data;
    const cycleStartDate = new Date(cycleData.start_date);
    const cycleEndDate = new Date(cycleData.end_date);

    console.log("Thông tin cycle:", cycleData);
    console.log(`Thời gian cycle: ${cycleStartDate} đến ${cycleEndDate}`);

    // Sau đó, lấy tất cả task của project
    const taskResponse = await apiClient.get(
      `/projects/${projectId}/tasks/0/1000`, // Lấy tất cả task với page size lớn
      {
        headers: {
          authentication: token,
        },
      }
    );

    // Kiểm tra cấu trúc dữ liệu trả về
    let allTasks = [];
    if (taskResponse.data && taskResponse.data.tasks && Array.isArray(taskResponse.data.tasks)) {
      allTasks = taskResponse.data.tasks;
    } else if (Array.isArray(taskResponse.data)) {
      allTasks = taskResponse.data;
    }

    console.log(`Tổng số task của project: ${allTasks.length}`);

    // Lọc các task nằm trong khoảng thời gian của cycle
    const tasksInCycle = allTasks.filter(task => {
      // Nếu task không có ngày bắt đầu hoặc kết thúc, bỏ qua
      if (!task.start_date || !task.end_date) {
        return false;
      }

      const taskStartDate = new Date(task.start_date);
      const taskEndDate = new Date(task.end_date);

      // Kiểm tra xem task có nằm trong khoảng thời gian của cycle không
      // Task được tính là nằm trong cycle nếu:
      // - Bắt đầu hoặc kết thúc trong khoảng thời gian của cycle
      // - Bắt đầu trước và kết thúc sau khoảng thời gian của cycle (bao phủ toàn bộ cycle)
      const isStartInCycle = taskStartDate >= cycleStartDate && taskStartDate <= cycleEndDate;
      const isEndInCycle = taskEndDate >= cycleStartDate && taskEndDate <= cycleEndDate;
      const isCoveringCycle = taskStartDate <= cycleStartDate && taskEndDate >= cycleEndDate;

      return isStartInCycle || isEndInCycle || isCoveringCycle;
    });

    console.log(`Số lượng task trong cycle ${cycleId}: ${tasksInCycle.length}`);
    console.log("Các task trong cycle:", tasksInCycle.map(t => t.task_id));

    return tasksInCycle;
  } catch (error) {
    console.error("Lỗi khi lấy số lượng task trong cycle:", error.response || error);

    // Xử lý lỗi 422 hoặc các lỗi khác
    if (error.response && error.response.status === 422) {
      console.warn(`Lỗi định dạng dữ liệu (422) khi lấy task trong cycle ${cycleId}:`, error.response.data);
      return []; // Trả về mảng rỗng khi có lỗi 422
    }

    if (error.message === 'No authentication token found. Please login first.') {
      console.warn('Token không tồn tại - trả về mảng rỗng');
      return []; // Trả về mảng rỗng thay vì throw error
    } else if (error.response && error.response.status === 403) {
      console.warn('Không có quyền truy cập - trả về mảng rỗng');
      return []; // Trả về mảng rỗng thay vì throw error
    } else if (error.response && error.response.status === 404) {
      console.warn('Không tìm thấy cycle hoặc task - trả về mảng rỗng');
      return []; // Trả về mảng rỗng thay vì throw error
    } else {
      console.warn(`Lỗi không xác định khi lấy task trong cycle ${cycleId} - trả về mảng rỗng`);
      return []; // Trả về mảng rỗng cho tất cả các lỗi khác
    }
  }
};

// Thêm hàm lấy số lượng task trong module
export const getTasksInModule = async (projectId, moduleId) => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy danh sách task trong module:", moduleId);

    // Lấy tất cả task của project
    const taskResponse = await apiClient.get(
      `/projects/${projectId}/tasks/0/1000`, // Lấy tất cả task với page size lớn
      {
        headers: {
          authentication: token,
        },
      }
    );

    // Kiểm tra cấu trúc dữ liệu trả về
    let allTasks = [];
    if (taskResponse.data && taskResponse.data.tasks && Array.isArray(taskResponse.data.tasks)) {
      allTasks = taskResponse.data.tasks;
    } else if (Array.isArray(taskResponse.data)) {
      allTasks = taskResponse.data;
    }

    console.log(`Tổng số task của project: ${allTasks.length}`);

    // Lọc các task thuộc module đã chọn
    const tasksInModule = allTasks.filter(task => task.module_id === moduleId);

    console.log(`Số lượng task trong module ${moduleId}: ${tasksInModule.length}`);
    console.log("Các task trong module:", tasksInModule.map(t => t.task_id));

    return tasksInModule;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách task trong module:", error.response || error);

    // Xử lý các loại lỗi
    if (error.response && error.response.status === 422) {
      console.warn(`Lỗi định dạng dữ liệu (422) khi lấy task trong module ${moduleId}:`, error.response.data);
      return []; // Trả về mảng rỗng khi có lỗi 422
    }

    if (error.message === 'No authentication token found. Please login first.') {
      console.warn('Token không tồn tại - trả về mảng rỗng');
      return []; // Trả về mảng rỗng thay vì throw error
    } else if (error.response && error.response.status === 403) {
      console.warn('Không có quyền truy cập - trả về mảng rỗng');
      return []; // Trả về mảng rỗng thay vì throw error
    } else if (error.response && error.response.status === 404) {
      console.warn('Không tìm thấy module hoặc task - trả về mảng rỗng');
      return []; // Trả về mảng rỗng thay vì throw error
    } else {
      console.warn(`Lỗi không xác định khi lấy task trong module ${moduleId} - trả về mảng rỗng`);
      return []; // Trả về mảng rỗng cho tất cả các lỗi khác
    }
  }
};

// Thêm hàm tính toán tiến độ của module
export const getModuleProgress = async (projectId, moduleId) => {
  try {
    const token = getAuthToken();

    console.log("Đang tính toán tiến độ của module:", moduleId);

    // Lấy danh sách task trong module
    const tasksInModule = await getTasksInModule(projectId, moduleId);

    // Nếu không có task nào, trả về 0%
    if (!tasksInModule || tasksInModule.length === 0) {
      console.log(`Module ${moduleId} không có task nào, tiến độ 0%`);
      return 0;
    }

    // Đếm số task đã hoàn thành (có trạng thái DONE)
    const completedTasks = tasksInModule.filter(task => task.task_status === "DONE");

    // Tính phần trăm hoàn thành
    const completionPercentage = Math.round((completedTasks.length / tasksInModule.length) * 100);

    console.log(`Module ${moduleId} có ${tasksInModule.length} task, ${completedTasks.length} task đã hoàn thành, tiến độ ${completionPercentage}%`);

    return completionPercentage;
  } catch (error) {
    console.error("Lỗi khi tính toán tiến độ module:", error);
    return 0; // Trả về 0% nếu có lỗi
  }
};

// Thêm hàm thêm task vào module
export const addTaskToModule = async (projectId, taskId, moduleId) => {
  try {
    const token = getAuthToken();

    console.log(`Đang thêm task ${taskId} vào module ${moduleId}`);

    // Đầu tiên lấy thông tin task hiện tại
    const taskResponse = await apiClient.get(
      `/projects/${projectId}/tasks/${taskId}`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    const taskData = taskResponse.data;
    console.log("Thông tin task hiện tại:", taskData);

    // Chuẩn bị dữ liệu cập nhật với module_id mới
    const updatedTaskData = {
      ...taskData,
      module_id: moduleId
    };

    // Cập nhật task với module_id mới
    const response = await apiClient.put(
      `/projects/${projectId}/tasks/${taskId}/update`,
      updatedTaskData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log(`Task ${taskId} đã được thêm vào module ${moduleId}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi thêm task vào module:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để thêm task vào module');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.response && error.response.status === 404) {
      throw new Error('Không tìm thấy task hoặc module');
    } else if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error(`Lỗi khi thêm task vào module: ${error.message}`);
    }
  }
};

// Thêm hàm xóa task khỏi module
export const removeTaskFromModule = async (projectId, taskId) => {
  try {
    const token = getAuthToken();

    console.log(`Đang xóa task ${taskId} khỏi module hiện tại`);

    // Đầu tiên lấy thông tin task hiện tại
    const taskResponse = await apiClient.get(
      `/projects/${projectId}/tasks/${taskId}`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    const taskData = taskResponse.data;
    console.log("Thông tin task hiện tại:", taskData);

    // Chuẩn bị dữ liệu cập nhật với module_id = null
    const updatedTaskData = {
      ...taskData,
      module_id: null
    };

    // Cập nhật task với module_id = null
    const response = await apiClient.put(
      `/projects/${projectId}/tasks/${taskId}/update`,
      updatedTaskData,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log(`Task ${taskId} đã được xóa khỏi module`);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi xóa task khỏi module:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xóa task khỏi module');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.response && error.response.status === 404) {
      throw new Error('Không tìm thấy task');
    } else if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error(`Lỗi khi xóa task khỏi module: ${error.message}`);
    }
  }
};

// Thêm hàm thêm nhiều task vào module
export const addTasksToModule = async (projectId, moduleId, taskIds) => {
  try {
    const token = getAuthToken();
    console.log(`Đang thêm ${taskIds.length} task vào module ${moduleId}`);

    // Thực hiện tuần tự các yêu cầu thêm task vào module
    const results = await Promise.all(taskIds.map(taskId =>
      addTaskToModule(projectId, taskId, moduleId)
    ));

    console.log(`Đã thêm ${taskIds.length} task vào module ${moduleId}`, results);
    return { success: true, count: taskIds.length };
  } catch (error) {
    console.error("Lỗi khi thêm nhiều task vào module:", error);
    throw new Error(`Lỗi khi thêm task vào module: ${error.message}`);
  }
};

// Thêm hàm gửi tin nhắn chat với xử lý CORS đặc biệt
export const sendChatMessage = async (message, sessionId = null, projectId = null, stream = false) => {
  try {
    const token = getAuthToken();

    // Kiểm tra nếu không có sessionId thì projectId phải có giá trị
    if (!sessionId && !projectId) {
      throw new Error('Yêu cầu phải có project_id khi bắt đầu cuộc trò chuyện mới');
    }

    console.log("Gửi tin nhắn chat với:", {
      message,
      sessionId,
      projectId,
      token: token ? "Đã có token" : "Không có token"
    });

    // Tạo dữ liệu để gửi
    const data = {
      message: message,
      stream: stream
    };

    // Chỉ thêm các field có giá trị
    if (sessionId) data.session_id = sessionId;
    if (projectId) data.project_id = projectId;

    // Thử cách 1: Sử dụng CORS proxy middleware nếu có
    try {
      // Sử dụng đường dẫn tương đối đến API, sẽ đi qua proxy nếu đã cấu hình
      const response = await axios.post('/api/chat/message', data, {
        headers: {
          'Authentication': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log("Kết quả gửi tin nhắn qua proxy:", response.data);
      return response.data;
    } catch (proxyError) {
      console.log("Gửi tin nhắn qua proxy không thành công, thử phương pháp khác:", proxyError);

      // Thử cách 2: Sử dụng Fetch API với mode no-cors nếu cách 1 thất bại
      const fetchResponse = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Authentication': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
        mode: 'cors',
        credentials: 'omit' // Không gửi cookie để tránh vấn đề CORS
      });

      if (!fetchResponse.ok) {
        throw new Error(`Error ${fetchResponse.status}: ${fetchResponse.statusText}`);
      }

      const responseData = await fetchResponse.json();
      console.log("Kết quả gửi tin nhắn qua fetch:", responseData);
      return responseData;
    }
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn:", error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để gửi tin nhắn');
    } else if (error.message.includes('403')) {
      throw new Error('Bạn không có quyền thực hiện thao tác này');
    } else if (error.message.includes('CORS') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      throw new Error('Lỗi kết nối CORS: Không thể kết nối đến máy chủ. Vui lòng kiểm tra cấu hình CORS trên máy chủ hoặc thử lại sau.');
    } else {
      throw new Error(`Lỗi khi gửi tin nhắn: ${error.message}`);
    }
  }
};

// Thêm hàm lấy danh sách chat sessions
export const getChatSessions = async () => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy danh sách chat sessions");

    const response = await apiClient.get(
      `/chat/sessions`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Danh sách chat sessions:", response.data);

    // Kiểm tra và xử lý định dạng phản hồi
    if (response.data && response.data.sessions && Array.isArray(response.data.sessions)) {
      // Định dạng mới: { sessions: [...] }
      return response.data.sessions;
    } else if (Array.isArray(response.data)) {
      // Định dạng cũ: trực tiếp là mảng
      return response.data;
    } else {
      console.warn("Định dạng phản hồi không như mong đợi:", response.data);
      return [];
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chat sessions:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xem danh sách chat');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền xem danh sách chat này');
    } else {
      throw new Error(`Lỗi khi lấy danh sách chat: ${error.message}`);
    }
  }
};

// Lấy chi tiết một chat session
export const getChatSession = async (sessionId) => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy chi tiết chat session:", sessionId);

    const response = await apiClient.get(
      `/chat/sessions/${sessionId}`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Chi tiết chat session:", response.data);

    // Xử lý trường hợp phản hồi trả về trực tiếp đối tượng session
    const sessionData = response.data;

    // Nếu không có trường events, thì tạo một mảng rỗng để tránh lỗi
    if (!sessionData.events) {
      sessionData.events = [];
    }

    // Đảm bảo events là một mảng
    if (!Array.isArray(sessionData.events)) {
      console.warn("Events không phải là mảng, chuyển đổi:", sessionData.events);
      sessionData.events = [];
    }

    return sessionData;
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết chat session:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xem chi tiết chat');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền xem chat session này');
    } else if (error.response && error.response.status === 404) {
      throw new Error('Không tìm thấy chat session');
    } else {
      throw new Error(`Lỗi khi lấy chi tiết chat session: ${error.message}`);
    }
  }
};

// Hàm cập nhật thông tin chat session
export const updateChatSession = async (sessionId, sessionName) => {
  try {
    const token = getAuthToken();

    console.log("Đang cập nhật thông tin chat session:", sessionId);
    console.log("Tên phiên chat mới:", sessionName);

    const response = await apiClient.put(
      `/chat/sessions/${sessionId}/update`,
      {
        user_session_name: sessionName
      },
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả cập nhật chat session:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi cập nhật chat session:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để cập nhật phiên chat');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền cập nhật phiên chat này');
    } else if (error.response && error.response.status === 404) {
      throw new Error('Không tìm thấy phiên chat');
    } else {
      throw new Error(`Lỗi khi cập nhật phiên chat: ${error.message}`);
    }
  }
};

// Hàm xóa chat session
export const deleteChatSession = async (sessionId) => {
  try {
    const token = getAuthToken();

    console.log("Đang xóa chat session:", sessionId);

    const response = await apiClient.delete(
      `/chat/sessions/${sessionId}/delete`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả xóa chat session:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi xóa chat session:", error.response || error);

    if (error.message === 'No authentication token found. Please login first.') {
      throw new Error('Vui lòng đăng nhập để xóa phiên chat');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Bạn không có quyền xóa phiên chat này');
    } else if (error.response && error.response.status === 404) {
      throw new Error('Không tìm thấy phiên chat');
    } else {
      throw new Error(`Lỗi khi xóa phiên chat: ${error.message}`);
    }
  }
};

// Thêm hàm lấy danh sách tags của project
export const getProjectTags = async (projectId) => {
  try {
    const token = getAuthToken();

    console.log("Đang lấy danh sách tags của project:", projectId);

    const response = await apiClient.get(
      `/projects/${projectId}/tags`,
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Danh sách tags của project:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tags:", error.response || error);
    throw new Error(`Lỗi khi lấy danh sách tags: ${error.message}`);
  }
};

// Thêm hàm cập nhật tags của project
export const updateProjectTags = async (projectId, tags) => {
  try {
    const token = getAuthToken();

    console.log("Đang cập nhật tags cho project:", projectId);
    console.log("Tags mới:", tags);

    const response = await apiClient.put(
      `/projects/${projectId}/tags/update`,
      { project_tags: tags },
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log("Kết quả cập nhật tags:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi cập nhật tags:", error.response || error);
    throw new Error(`Lỗi khi cập nhật tags: ${error.message}`);
  }
};

// Hàm kiểm tra và cập nhật email người dùng trong localStorage
export const updateUserEmailInStorage = (email) => {
  try {
    if (!email) {
      console.error('Không thể cập nhật email rỗng vào storage');
      return false;
    }

    // Ưu tiên lưu vào sessionStorage
    try {
      sessionStorage.setItem('user_email', email);
      console.log('Đã cập nhật email người dùng vào sessionStorage:', email);
    } catch (sessionError) {
      console.error('Lỗi khi cập nhật email vào sessionStorage:', sessionError);
    }

    // Lưu cả vào localStorage để đảm bảo tính nhất quán
    try {
      localStorage.setItem('user_email', email);
      console.log('Đã cập nhật email người dùng vào localStorage:', email);
    } catch (localError) {
      console.error('Lỗi khi cập nhật email vào localStorage:', localError);
    }

    return true;
  } catch (error) {
    console.error('Lỗi khi cập nhật email người dùng:', error);
    return false;
  }
};

// Hàm lấy email người dùng hiện tại từ storage
export const getUserEmailFromStorage = () => {
  try {
    // Ưu tiên email từ sessionStorage
    const sessionEmail = sessionStorage.getItem('user_email');
    console.log('Email từ sessionStorage:', sessionEmail);

    if (sessionEmail) {
      return sessionEmail;
    }

    // Nếu không có trong sessionStorage, kiểm tra localStorage
    const localEmail = localStorage.getItem('user_email');
    console.log('Email từ localStorage:', localEmail);

    // Nếu có email trong localStorage nhưng không có trong sessionStorage, sao chép qua
    if (localEmail) {
      try {
        sessionStorage.setItem('user_email', localEmail);
        console.log('Đã sao chép email từ localStorage sang sessionStorage');
      } catch (error) {
        console.error('Lỗi khi sao chép email vào sessionStorage:', error);
      }
    }

    return localEmail || null;
  } catch (error) {
    console.error('Lỗi khi lấy email người dùng từ storage:', error);
    return null;
  }
};

// Hàm kiểm tra và đồng bộ thông tin người dùng với server
export const syncUserInfo = async (projectId) => {
  try {
    const token = getAuthToken();
    const serverEmail = await getUserEmailFromServer(token);

    if (serverEmail) {
      console.log('Email người dùng từ server API:', serverEmail);

      // Ưu tiên lưu vào sessionStorage
      try {
        sessionStorage.setItem('user_email', serverEmail);
        console.log('Đã lưu email API vào sessionStorage');
      } catch (sessionError) {
        console.error('Lỗi khi lưu email API vào sessionStorage:', sessionError);
      }

      // Lưu cả vào localStorage để duy trì sau khi đóng tab
      try {
        localStorage.setItem('user_email', serverEmail);
        console.log('Đã lưu email API vào localStorage');
      } catch (localError) {
        console.error('Lỗi khi lưu email API vào localStorage:', localError);
      }

      return { success: true, message: 'Đã đồng bộ email người dùng', email: serverEmail };
    }

    return { success: false, message: 'Không lấy được email từ server' };
  } catch (error) {
    console.error('Lỗi khi đồng bộ thông tin người dùng:', error);
    return { success: false, message: error.message };
  }
};

// Hàm lấy email người dùng từ server dựa trên token
const getUserEmailFromServer = async (token) => {
  try {
    const response = await apiClient.get(
      '/users/me',
      {
        headers: {
          authentication: token,
        },
      }
    );

    console.log('Thông tin người dùng từ server:', response.data);
    return response.data.user_email || null;
  } catch (error) {
    console.error('Lỗi khi lấy thông tin người dùng từ server:', error);
    return null;
  }
};

