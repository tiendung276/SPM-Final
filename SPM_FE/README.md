# SPM Frontend

Dự án frontend cho hệ thống SPM (Software Project Management).

## Yêu cầu hệ thống

- Node.js 18.x trở lên
- npm hoặc yarn
- Docker và Docker Compose (nếu chạy với Docker)

## Cài đặt và Chạy (Local Development)

1. Clone repository:
```bash
git clone <repository-url>
cd SPM_FE
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Thiết lập môi trường:
```bash
# Copy file môi trường mẫu
cp .env.example .env

# Chỉnh sửa các biến môi trường trong file .env theo môi trường local của bạn
```

4. Chạy ứng dụng ở môi trường development:
```bash
npm start
```

Ứng dụng sẽ chạy tại [http://localhost:3200](http://localhost:3200)

## Chạy với Docker

1. Build và chạy container:
```bash
# Build image
docker-compose build

# Chạy container
docker-compose up -d
```

2. Kiểm tra container đang chạy:
```bash
docker-compose ps
```

3. Dừng container:
```bash
docker-compose down
```

## Cấu trúc thư mục

```
SPM_FE/
├── src/              # Source code
├── public/           # Static files
├── .env.example      # File môi trường mẫu
├── .env             # File môi trường local (không commit)
├── Dockerfile       # Cấu hình Docker
└── docker-compose.yml # Cấu hình Docker Compose
```

## Biến môi trường

Các biến môi trường cần thiết:

```env
# Port Configuration
PORT=3200

# Node Configuration
NODE_OPTIONS=--openssl-legacy-provider

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8881/api

# Authentication Configuration
REACT_APP_AUTH_TOKEN_KEY=access_token

# Other Configurations
REACT_APP_APP_NAME=SPM Frontend
REACT_APP_VERSION=1.0.0
```

## Triển khai lên EC2

1. Kết nối SSH vào EC2 instance

2. Clone repository và cd vào thư mục project

3. Tạo file .env với các biến môi trường phù hợp:
```env
REACT_APP_API_BASE_URL=http://your-ec2-api-url/api
```

4. Build và chạy với Docker:
```bash
docker-compose up -d
```

5. Kiểm tra logs:
```bash
docker-compose logs -f
```

## Lưu ý

- Đảm bảo port 3200 đã được mở trong Security Group của EC2
- Kiểm tra URL API trong biến môi trường trỏ đến địa chỉ API thực tế
- Nếu sử dụng HTTPS, cần cấu hình thêm SSL trong Nginx

## Troubleshooting

1. Lỗi OpenSSL:
- Đảm bảo đã set `NODE_OPTIONS=--openssl-legacy-provider` trong file môi trường

2. Lỗi CORS:
- Kiểm tra cấu hình CORS ở backend
- Xác nhận URL API đúng trong biến môi trường

3. Lỗi 404 khi refresh trang:
- Đã được xử lý trong cấu hình Nginx của Docker

## Hỗ trợ

Nếu gặp vấn đề, vui lòng tạo issue trong repository hoặc liên hệ team phát triển. 