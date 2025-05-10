import React, { useState, useEffect } from 'react';
import { Table, Input, Switch, Avatar, Typography, Spin, Select, Button, Modal, Form, message } from 'antd';
import { SearchOutlined, DownOutlined, CheckOutlined, UserAddOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import '../../assets/css/Member.css';
import { getProjectUsers, assignUserToProject, syncUserInfo, updateUserEmailInStorage, getUserEmailFromStorage } from '../../api/ProjectApi';

const { Title, Text } = Typography;
const { Option } = Select;

const Member = () => {
    const { projectId } = useParams();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [guestAccess, setGuestAccess] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState('');
    const [shouldRefreshUserRole, setShouldRefreshUserRole] = useState(true);
    const [projectOwner, setProjectOwner] = useState(null);
    const [defaultAssignee, setDefaultAssignee] = useState(null);
    const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
    const [newMember, setNewMember] = useState({ email: '', role: 'MEMBER' });
    const [addingMember, setAddingMember] = useState(false);
    const [form] = Form.useForm();
    const [userEmail, setUserEmail] = useState('');
    const [isOwner, setIsOwner] = useState(false);

    // Đồng bộ thông tin người dùng khi component được tải
    useEffect(() => {
        // Lấy email trực tiếp từ sessionStorage thay vì localStorage
        const sessionEmail = sessionStorage.getItem('user_email');
        console.log("Email từ sessionStorage:", sessionEmail);

        if (sessionEmail) {
            console.log("Sử dụng email từ sessionStorage:", sessionEmail);
            setUserEmail(sessionEmail);
        } else {
            console.log("Không tìm thấy email trong sessionStorage, thử lấy từ localStorage");
            const localEmail = localStorage.getItem('user_email');
            console.log("Email từ localStorage:", localEmail);

            if (localEmail) {
                console.log("Sử dụng email từ localStorage:", localEmail);
                setUserEmail(localEmail);
                // Lưu vào sessionStorage để dùng sau này
                try {
                    sessionStorage.setItem('user_email', localEmail);
                    console.log("Đã lưu email từ localStorage vào sessionStorage");
                } catch (error) {
                    console.error("Lỗi khi lưu email vào sessionStorage:", error);
                }
            } else {
                console.log("Không tìm thấy email trong cả localStorage và sessionStorage");
                // Cố gắng lấy email từ server nếu có token
                syncUser();
            }
        }
    }, []);

    // Hàm đồng bộ thông tin người dùng từ server
    const syncUser = async () => {
        try {
            const result = await syncUserInfo();
            if (result.success) {
                console.log("Đồng bộ email thành công từ API:", result.email);
                setUserEmail(result.email);
                // Lưu vào sessionStorage để dùng sau này
                try {
                    sessionStorage.setItem('user_email', result.email);
                    console.log("Đã lưu email từ API vào sessionStorage");
                } catch (error) {
                    console.error("Lỗi khi lưu email vào sessionStorage:", error);
                }
            } else {
                console.error("Không thể đồng bộ email:", result.message);
            }
        } catch (error) {
            console.error("Lỗi khi đồng bộ thông tin người dùng:", error);
        }
    };

    // Lấy dữ liệu thành viên từ server
    useEffect(() => {
        const fetchMembers = async () => {
            if (!projectId) return;

            try {
                setLoading(true);
                const users = await getProjectUsers(projectId);

                console.log("Dữ liệu users từ API:", users);
                console.log("Email hiện tại đang sử dụng để so sánh:", userEmail);

                // So sánh trực tiếp email của người dùng
                if (userEmail) {
                    console.log("Email người dùng hiện tại:", userEmail);
                    // Tìm người dùng hiện tại trong danh sách users
                    const currentUser = users.find(user => {
                        const apiEmail = user.user_email?.toLowerCase() || '';
                        const currentEmail = userEmail.toLowerCase();
                        console.log(`So sánh ${apiEmail} với ${currentEmail}`);
                        return apiEmail === currentEmail;
                    });

                    if (currentUser) {
                        console.log("ĐÃ TÌM THẤY người dùng hiện tại:", currentUser.user_email, "với vai trò:", currentUser.role);
                        // Cập nhật vai trò người dùng ngay lập tức
                        setCurrentUserRole(currentUser.role);
                    } else {
                        console.log("KHÔNG TÌM THẤY người dùng hiện tại trong danh sách users API");
                        setCurrentUserRole('');
                    }
                    // Đã cập nhật xong vai trò
                    setShouldRefreshUserRole(false);
                } else {
                    console.log("KHÔNG CÓ email người dùng để so sánh");
                }

                // Chuyển đổi dữ liệu từ API sang định dạng cần thiết
                const formattedMembers = users.map(user => {
                    // Kết hợp tên từ user_first_name và user_last_name
                    const firstName = user.user_first_name || '';
                    const lastName = user.user_last_name || '';
                    const email = user.user_email || '';

                    console.log("Thông tin người dùng:", { firstName, lastName, email, role: user.role });

                    // Nếu email khớp với userEmail, cập nhật vai trò ngay lập tức
                    if (email.toLowerCase() === userEmail?.toLowerCase()) {
                        console.log(`!!CẬP NHẬT vai trò cho ${email} thành ${user.role}`);
                        setCurrentUserRole(user.role);
                    }

                    // Tạo fullname từ firstName và lastName
                    let fullName = '';
                    if (firstName && lastName) {
                        fullName = `${firstName} ${lastName}`;
                    } else if (firstName) {
                        fullName = firstName;
                    } else if (lastName) {
                        fullName = lastName;
                    } else if (email) {
                        fullName = email.split('@')[0];
                    } else {
                        fullName = 'Không có tên';
                    }

                    // Lấy chữ cái đầu tiên của tên làm avatar
                    let avatar = '?';
                    if (firstName) {
                        avatar = firstName.charAt(0).toUpperCase();
                    } else if (lastName) {
                        avatar = lastName.charAt(0).toUpperCase();
                    } else if (email) {
                        avatar = email.charAt(0).toUpperCase();
                    }

                    // Tạo màu ngẫu nhiên nhưng nhất quán cho avatar
                    const colors = [
                        '#2e7d32', // Green
                        '#9e9e9e', // Grey
                        '#f44336', // Red
                        '#2733b5', // Blue
                        '#00796b', // Teal
                    ];
                    const charCode = avatar.charCodeAt(0);
                    const avatarColor = colors[charCode % colors.length];

                    // Lưu thông tin owner của project
                    if (user.role === 'OWNER') {
                        setProjectOwner({
                            id: user.user_id,
                            fullName,
                            email,
                            avatar,
                            avatarColor,
                            avatarImg: user.avatar_url || null
                        });
                    }

                    return {
                        key: user.user_id,
                        id: user.user_id,
                        fullName: fullName,
                        displayName: email,
                        email: email,
                        accountType: formatRole(user.role),
                        role: user.role,
                        joiningDate: new Date(user.assign_date || user.created_at || Date.now()).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        avatar: avatar,
                        avatarColor: avatarColor,
                        avatarImg: user.avatar_url || null
                    };
                });

                setMembers(formattedMembers);
                console.log("Danh sách thành viên sau khi xử lý:", formattedMembers);
                console.log("Vai trò người dùng hiện tại:", currentUserRole);

                // Thiết lập mặc định assignee là null
                setDefaultAssignee(null);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách thành viên:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, [projectId, userEmail, shouldRefreshUserRole]);

    // Sử dụng useEffect để theo dõi thay đổi của currentUserRole và set lại isOwner
    useEffect(() => {
        // Kiểm tra vai trò khi currentUserRole thay đổi
        console.log(`Cập nhật trạng thái isOwner dựa trên vai trò: ${currentUserRole}`);
        setIsOwner(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN');
    }, [currentUserRole]);

    // Log trạng thái hiện tại
    console.log(`UserEmail: ${userEmail}, CurrentUserRole: ${currentUserRole}, isOwner: ${isOwner}`);

    // Hàm định dạng vai trò từ DEVELOPER -> Developer
    const formatRole = (role) => {
        if (!role) return 'Member';

        // Chuyển đổi OWNER -> Owner
        return role.toLowerCase()
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Cấu hình các cột cho bảng
    const columns = [
        {
            title: 'Full name',
            dataIndex: 'fullName',
            key: 'fullName',
            render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {record.avatarImg ? (
                        <Avatar src={record.avatarImg} />
                    ) : (
                        <Avatar style={{ backgroundColor: record.avatarColor }}>
                            {record.avatar}
                        </Avatar>
                    )}
                    <Text>{text}</Text>
                </div>
            ),
        },
        {
            title: 'Display name',
            dataIndex: 'displayName',
            key: 'displayName',
        },
        {
            title: 'Account type',
            dataIndex: 'accountType',
            key: 'accountType',
        },
        {
            title: 'Joining date',
            dataIndex: 'joiningDate',
            key: 'joiningDate',
        },
    ];

    // Lọc dữ liệu dựa trên tìm kiếm
    const filteredData = members.filter(
        (item) =>
            item.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
            item.displayName.toLowerCase().includes(searchText.toLowerCase())
    );

    // Hàm xử lý khi thay đổi project lead
    const handleProjectLeadChange = (value) => {
        // Ở đây có thể gọi API để cập nhật project lead
        console.log('Đã thay đổi project lead:', value);
    };

    // Hàm xử lý khi thay đổi default assignee
    const handleDefaultAssigneeChange = (value) => {
        // Ở đây có thể gọi API để cập nhật default assignee
        if (value === 'none') {
            setDefaultAssignee(null);
        } else {
            const selectedMember = members.find(m => m.id === value);
            setDefaultAssignee(selectedMember);
        }
    };

    // Tùy chỉnh render cho option trong dropdown
    const renderOptionItem = (member, isSelected) => (
        <div className="select-option-user">
            {isSelected && <CheckOutlined style={{ color: '#1890ff', marginRight: '8px' }} />}
            {member.avatarImg ? (
                <Avatar src={member.avatarImg} size="small" />
            ) : (
                <Avatar style={{ backgroundColor: member.avatarColor }} size="small">
                    {member.avatar}
                </Avatar>
            )}
            <span>{member.fullName}</span>
        </div>
    );

    // Thêm hàm mở modal thêm thành viên
    const showAddMemberModal = () => {
        setIsAddMemberModalVisible(true);
    };

    // Thêm hàm đóng modal thêm thành viên
    const handleCancelAddMember = () => {
        setIsAddMemberModalVisible(false);
        form.resetFields();
        setNewMember({ email: '', role: 'MEMBER' });
    };

    // Thêm hàm xử lý khi thay đổi thông tin thành viên mới
    const handleNewMemberChange = (e) => {
        const { name, value } = e.target;
        setNewMember({
            ...newMember,
            [name]: value
        });
    };

    // Thêm hàm xử lý khi chọn role trong select
    const handleRoleChange = (value) => {
        setNewMember({
            ...newMember,
            role: value
        });
    };

    // Thêm hàm xử lý khi submit form thêm thành viên
    const handleAddMember = async () => {
        try {
            await form.validateFields();
            setAddingMember(true);

            // Gọi API để thêm thành viên
            await assignUserToProject(projectId, {
                email: newMember.email,
                role: newMember.role
            });

            message.success(`Đã thêm thành viên ${newMember.email} vào dự án!`);

            // Nếu người dùng thêm chính mình vào dự án với vai trò khác
            if (newMember.email === userEmail) {
                console.log("Người dùng đã thêm chính mình với vai trò:", newMember.role);
                setCurrentUserRole(newMember.role);
            }

            // Đánh dấu cần refresh vai trò của người dùng
            setShouldRefreshUserRole(true);

            // Cập nhật lại danh sách thành viên
            const updatedUsers = await getProjectUsers(projectId);

            // Chuyển đổi dữ liệu từ API sang định dạng cần thiết
            const formattedMembers = updatedUsers.map(user => {
                const firstName = user.user_first_name || '';
                const lastName = user.user_last_name || '';
                const email = user.user_email || '';

                let fullName = '';
                if (firstName && lastName) {
                    fullName = `${firstName} ${lastName}`;
                } else if (firstName) {
                    fullName = firstName;
                } else if (lastName) {
                    fullName = lastName;
                } else if (email) {
                    fullName = email.split('@')[0];
                } else {
                    fullName = 'Không có tên';
                }

                let avatar = '?';
                if (firstName) {
                    avatar = firstName.charAt(0).toUpperCase();
                } else if (lastName) {
                    avatar = lastName.charAt(0).toUpperCase();
                } else if (email) {
                    avatar = email.charAt(0).toUpperCase();
                }

                const colors = [
                    '#2e7d32', '#9e9e9e', '#f44336', '#2733b5', '#00796b',
                ];
                const charCode = avatar.charCodeAt(0);
                const avatarColor = colors[charCode % colors.length];

                // Kiểm tra nếu là người dùng hiện tại, cập nhật vai trò
                if (email === userEmail) {
                    console.log(`Cập nhật vai trò người dùng ${email} thành ${user.role}`);
                    setCurrentUserRole(user.role);
                }

                return {
                    key: user.user_id,
                    id: user.user_id,
                    fullName: fullName,
                    displayName: email,
                    email: email,
                    accountType: formatRole(user.role),
                    role: user.role,
                    joiningDate: new Date(user.assign_date || user.created_at || Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    avatar: avatar,
                    avatarColor: avatarColor,
                    avatarImg: user.avatar_url || null
                };
            });

            setMembers(formattedMembers);

            // Đóng modal và reset form
            setIsAddMemberModalVisible(false);
            form.resetFields();
            setNewMember({ email: '', role: 'MEMBER' });
        } catch (error) {
            if (error.name === 'ValidationError') {
                // Validation error from form
                return;
            }
            message.error(`Lỗi khi thêm thành viên: ${error.message}`);
        } finally {
            setAddingMember(false);
        }
    };

    return (
        <div className="member-container">
            <div className="defaults-section">
                <Title level={4}>Defaults</Title>

                <div className="defaults-row">
                    <div className="default-item">
                        <Text className="default-label">Project lead</Text>
                        {isOwner ? (
                            <Select
                                className="member-select"
                                value={projectOwner ? projectOwner.id : 'none'}
                                onChange={handleProjectLeadChange}
                                suffixIcon={<DownOutlined />}
                                dropdownMatchSelectWidth={false}
                                optionLabelProp="label"
                            >
                                <Option value="none" label="None">
                                    <div className="select-option-none">
                                        <span className="none-icon">⊘</span> None
                                    </div>
                                </Option>
                                {members.map(member => (
                                    <Option
                                        key={member.id}
                                        value={member.id}
                                        label={member.fullName}
                                    >
                                        {renderOptionItem(member, projectOwner && projectOwner.id === member.id)}
                                    </Option>
                                ))}
                            </Select>
                        ) : (
                            <div className="none-selector">
                                {projectOwner ? (
                                    <div className="selected-member">
                                        {projectOwner.avatarImg ? (
                                            <Avatar src={projectOwner.avatarImg} size="small" />
                                        ) : (
                                            <Avatar style={{ backgroundColor: projectOwner.avatarColor }} size="small">
                                                {projectOwner.avatar}
                                            </Avatar>
                                        )}
                                        <span>{projectOwner.fullName}</span>
                                    </div>
                                ) : (
                                    <>
                                        <span className="none-icon">⊘</span> None
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="default-item">
                        <Text className="default-label">Default assignee</Text>
                        {isOwner ? (
                            <Select
                                className="member-select"
                                value={defaultAssignee ? defaultAssignee.id : 'none'}
                                onChange={handleDefaultAssigneeChange}
                                suffixIcon={<DownOutlined />}
                                dropdownMatchSelectWidth={false}
                                optionLabelProp="label"
                            >
                                <Option value="none" label="None">
                                    <div className="select-option-none">
                                        <span className="none-icon">⊘</span> None
                                    </div>
                                </Option>
                                {members.map(member => (
                                    <Option
                                        key={member.id}
                                        value={member.id}
                                        label={member.fullName}
                                    >
                                        {renderOptionItem(member, defaultAssignee && defaultAssignee.id === member.id)}
                                    </Option>
                                ))}
                            </Select>
                        ) : (
                            <div className="none-selector">
                                {defaultAssignee ? (
                                    <div className="selected-member">
                                        {defaultAssignee.avatarImg ? (
                                            <Avatar src={defaultAssignee.avatarImg} size="small" />
                                        ) : (
                                            <Avatar style={{ backgroundColor: defaultAssignee.avatarColor }} size="small">
                                                {defaultAssignee.avatar}
                                            </Avatar>
                                        )}
                                        <span>{defaultAssignee.fullName}</span>
                                    </div>
                                ) : (
                                    <>
                                        <span className="none-icon">⊘</span> None
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="guest-access-row">
                    <div className="guest-access-text">
                        <Text strong>Grant view access to all work items for guest users:</Text>
                        <Text type="secondary">This will allow guests to have view access to all the project work items.</Text>
                    </div>
                    <Switch
                        checked={guestAccess}
                        onChange={setGuestAccess}
                        disabled={!isOwner}
                    />
                </div>
            </div>

            <div className="members-section">
                <div className="members-header">
                    <Title level={4}>Members</Title>
                    <div className="members-actions">
                        <Input
                            placeholder="Search"
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 250, marginRight: 16 }}
                        />
                        <Button
                            type="primary"
                            icon={<UserAddOutlined />}
                            disabled={!(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN')}
                            onClick={showAddMemberModal}
                        >
                            Add member
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <Spin size="large" />
                        <p>Đang tải dữ liệu thành viên...</p>
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        pagination={false}
                        rowClassName="member-table-row"
                    />
                )}
            </div>

            {/* Modal thêm thành viên */}
            <Modal
                title="Add People To This Project"
                open={isAddMemberModalVisible}
                onCancel={handleCancelAddMember}
                width={520}
                centered
                maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                bodyStyle={{ padding: '24px' }}
                style={{ zIndex: 1050 }}
                footer={[
                    <Button key="back" onClick={handleCancelAddMember}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={addingMember}
                        onClick={handleAddMember}
                        style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
                    >
                        Add
                    </Button>
                ]}
            >
                <Form
                    form={form}
                    layout="vertical"
                    name="add_member_form"
                    initialValues={{ role: 'MEMBER' }}
                >
                    <Form.Item
                        name="email"
                        label={<span>Enter Email <span style={{ color: '#ff4d4f' }}>*</span></span>}
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' }
                        ]}
                    >
                        <Input
                            name="email"
                            placeholder="Email@Company.Com"
                            value={newMember.email}
                            onChange={handleNewMemberChange}
                        />
                    </Form.Item>
                    <Form.Item
                        name="role"
                        label={<span>Role <span style={{ color: '#ff4d4f' }}>*</span></span>}
                    >
                        <Select
                            value={newMember.role}
                            onChange={handleRoleChange}
                            placeholder="Member"
                        >
                            <Option value="MEMBER">Member</Option>
                            <Option value="ADMIN">Admin</Option>
                            <Option value="OWNER">Owner</Option>
                        </Select>
                    </Form.Item>

                    <div style={{ marginBottom: 16 }}>
                        <span style={{ marginRight: 8 }}>Connected To</span>
                        <img
                            src="/assets/icons/google_icon.svg"
                            alt="Google"
                            className="google-icon"
                        />
                    </div>

                    <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
                        This Site Is Protected By ReCAPTCHA And The Google{' '}
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                            Privacy Policy
                        </a>
                        , And{' '}
                        <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
                            Terms Of Service
                        </a>{' '}
                        Apply.
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Member;
