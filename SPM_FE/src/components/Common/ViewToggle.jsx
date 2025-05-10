import React, { useState } from 'react';
import { Dropdown, Menu } from 'antd';
import { DownOutlined, CheckOutlined } from '@ant-design/icons';
import './ViewToggle.css';

const ViewToggle = ({ viewMode, onChangeViewMode }) => {
    const [visible, setVisible] = useState(false);

    const handleVisibleChange = (flag) => {
        setVisible(flag);
    };

    const handleMenuClick = (e) => {
        onChangeViewMode(e.key);
        setVisible(false);
    };

    const menu = (
        <Menu
            className="view-toggle-menu"
            selectedKeys={[viewMode]}
            onClick={handleMenuClick}
        >
            <Menu.Item key="box" className="view-toggle-menu-item">
                <div className="view-option">
                    {viewMode === 'box' && <CheckOutlined className="check-icon" />}
                    <div className="view-icon box-icon">
                        <div className="box-icon-grid">
                            <div className="box-icon-item"></div>
                            <div className="box-icon-item"></div>
                            <div className="box-icon-item"></div>
                            <div className="box-icon-item"></div>
                        </div>
                    </div>
                    <span>Box</span>
                </div>
            </Menu.Item>
            <Menu.Item key="list" className="view-toggle-menu-item">
                <div className="view-option">
                    {viewMode === 'list' && <CheckOutlined className="check-icon" />}
                    <div className="view-icon list-icon">
                        <div className="list-icon-lines">
                            <div className="list-icon-line"></div>
                            <div className="list-icon-line"></div>
                            <div className="list-icon-line"></div>
                        </div>
                    </div>
                    <span>List</span>
                </div>
            </Menu.Item>
        </Menu>
    );

    return (
        <Dropdown
            overlay={menu}
            visible={visible}
            onVisibleChange={handleVisibleChange}
            trigger={['click']}
            overlayClassName="view-toggle-dropdown"
        >
            <div className="view-toggle-button">
                <div className={`view-icon ${viewMode === 'box' ? 'box-icon' : 'list-icon'}`}>
                    {viewMode === 'box' ? (
                        <div className="box-icon-grid">
                            <div className="box-icon-item"></div>
                            <div className="box-icon-item"></div>
                            <div className="box-icon-item"></div>
                            <div className="box-icon-item"></div>
                        </div>
                    ) : (
                        <div className="list-icon-lines">
                            <div className="list-icon-line"></div>
                            <div className="list-icon-line"></div>
                            <div className="list-icon-line"></div>
                        </div>
                    )}
                </div>
                <span>View</span>
                <DownOutlined className="dropdown-icon" />
            </div>
        </Dropdown>
    );
};

export default ViewToggle; 