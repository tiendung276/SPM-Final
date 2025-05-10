import React, { useState, useEffect } from "react";
import Navigation from "./Navigation";
import SocialButtons from "./SocialButtons";
import "../assets/css/Auth.css";
import { useLocation, useNavigate } from "react-router-dom";
import config from "../config/config";

const { API_BASE_URL } = config;

const AuthInterface = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isSignInRoute = location.pathname === "/login";
  const [isSignIn, setIsSignIn] = useState(isSignInRoute);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setIsSignIn(isSignInRoute);
    setErrors({});
    setPassword("");
    setConfirmPassword("");
  }, [isSignInRoute]);

  useEffect(() => {
    if (email) setErrors((prev) => ({ ...prev, email: "", server: "" }));
    if (password) setErrors((prev) => ({ ...prev, password: "", server: "" }));
    if (confirmPassword)
      setErrors((prev) => ({ ...prev, confirmPassword: "", server: "" }));
    if (firstName)
      setErrors((prev) => ({ ...prev, firstName: "", server: "" }));
    if (lastName) setErrors((prev) => ({ ...prev, lastName: "", server: "" }));
  }, [email, password, confirmPassword, firstName, lastName]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = "Email không được để trống";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
    }

    if (!isSignIn) {
      if (!confirmPassword) {
        newErrors.confirmPassword = "Xác nhận mật khẩu không được để trống";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
      }

      if (!firstName) {
        newErrors.firstName = "Tên không được để trống";
      }

      if (!lastName) {
        newErrors.lastName = "Họ không được để trống";
      }

      if (!agreeToTerms) {
        newErrors.terms = "Bạn phải đồng ý với điều khoản dịch vụ";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  // Xử lý đăng kí
  const handleSignUp = async () => {
    try {
      setIsLoading(true);
      setErrors({});

      console.log('Đang gửi request đăng ký với:', { email, password, firstName, lastName });

      const response = await fetch(`${API_BASE_URL}/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          first_name: firstName,
          last_name: lastName
        }),
      });

      // Kiểm tra status code
      console.log('Status code đăng ký:', response.status);

      // Đọc text response trước khi parse JSON
      const textResponse = await response.text();
      console.log('Response text đăng ký:', textResponse);

      // Parse JSON nếu có nội dung
      let data;
      try {
        data = textResponse ? JSON.parse(textResponse) : {};
        console.log('Parsed data đăng ký:', data);
      } catch (e) {
        console.error('Lỗi parse JSON:', e);
        throw new Error('Lỗi xử lý dữ liệu từ server');
      }

      if (!response.ok) {
        throw new Error(data.detail || 'Đăng ký thất bại');
      }

      // Thông báo đăng ký thành công và chuyển hướng đến trang đăng nhập
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');

    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      setErrors({
        server: error.message || 'Đăng ký thất bại. Vui lòng thử lại.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý đăng nhập - Cập nhật theo API
  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrors({});

      console.log('Đang gửi request đăng nhập với:', { email, password });

      const response = await fetch(`${API_BASE_URL}/sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      // Kiểm tra status code
      console.log('Status code:', response.status);

      // Đọc text response trước khi parse JSON
      const textResponse = await response.text();
      console.log('Response text:', textResponse);

      // Parse JSON nếu có nội dung
      let data;
      try {
        data = textResponse ? JSON.parse(textResponse) : {};
        console.log('Parsed data:', data);
      } catch (e) {
        console.error('Lỗi parse JSON:', e);
        throw new Error('Lỗi xử lý dữ liệu từ server');
      }

      if (!response.ok) {
        throw new Error(data.detail || 'Đăng nhập thất bại');
      }

      // Luôn lưu token ở cả hai nơi để đảm bảo không gặp vấn đề
      // Token chính (lưu ở cả hai nơi để đảm bảo hoạt động đúng)
      localStorage.setItem('access_token', data.access_token);
      sessionStorage.setItem('access_token', data.access_token);
      localStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('isAuthenticated', 'true');

      // Lưu email người dùng
      localStorage.setItem('user_email', email);
      sessionStorage.setItem('user_email', email);

      // Lưu thêm kiểu token nếu server trả về
      if (data.token_type) {
        localStorage.setItem('token_type', data.token_type);
        sessionStorage.setItem('token_type', data.token_type);
      }

      // Xóa bất kỳ dữ liệu dự án cũ nào
      localStorage.removeItem('userProjects');
      localStorage.removeItem('userProjectsTimestamp');

      // Xóa các dữ liệu người dùng project cũ
      const projectKeyPattern = /^project_\d+_users$/;
      Object.keys(localStorage).forEach(key => {
        if (projectKeyPattern.test(key)) {
          localStorage.removeItem(key);
        }
      });

      navigate('/home');
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      setErrors({
        server: error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý quên mật khẩu
  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, server: "" }));

    if (!validateForm()) {
      return;
    }

    if (isSignIn) {
      handleSignIn();
    } else {
      handleSignUp();
    }
  };

  return (
    <div className="auth-container">
      <Navigation />

      <div className="auth-content">
        <div className="auth-form-container">
          <div className="card auth-card">
            <div className="card-body">
              <div className="auth-toggle-buttons">
                <button
                  className={`btn ${!isSignIn ? "btn-primary" : "btn-outline-primary"
                    }`}
                  // onClick={() => {
                  //   setIsSignIn(false);
                  //   setErrors({});
                  // }}
                  onClick={() => navigate("/register")}
                >
                  Sign Up
                </button>
                <button
                  className={`btn ${isSignIn ? "btn-primary" : "btn-outline-primary"
                    }`}
                  // onClick={() => {
                  //   setIsSignIn(true);
                  //   setErrors({});
                  // }}
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </button>
              </div>

              <p className="text-muted auth-message text-center">
                {isSignIn
                  ? "Welcome back to sign in. As a returning customer, you have access to your previously saved all information."
                  : "Let's create your account and Shop like a pro and save money."}
              </p>

              <SocialButtons />

              <div className="auth-divider">
                <hr className="text-muted" />
                <span className="auth-divider-text">Or Continue with</span>
              </div>

              {errors.server && (
                <div className="alert alert-danger">{errors.server}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <input
                    type="email"
                    className={`form-control ${errors.email ? "is-invalid" : ""
                      }`}
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}
                </div>

                {isSignIn && (
                  <div className="mb-3" style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`form-control ${errors.password ? "is-invalid" : ""
                        }`}
                      placeholder="Password (6 characters minimum)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="btn btn-link password-toggle-btn"
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        padding: 0,
                      }}
                    >
                      <img
                        src={
                          showPassword
                            ? "/assets/icons/eye-off-icon.svg"
                            : "/assets/icons/eye-icon.svg"
                        }
                        alt={showPassword ? "Hide password" : "Show password"}
                        style={{
                          width: "24px",
                          height: "24px",
                        }}
                      />
                    </button>
                    {errors.password && (
                      <div className="invalid-feedback">{errors.password}</div>
                    )}
                  </div>
                )}

                {!isSignIn && (
                  <>
                    <div className="mb-3" style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`form-control ${errors.password ? "is-invalid" : ""
                          }`}
                        placeholder="Password (6 characters minimum)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="btn btn-link password-toggle-btn"
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          padding: 0,
                        }}
                      >
                        <img
                          src={
                            showPassword
                              ? "/assets/icons/eye-off-icon.svg"
                              : "/assets/icons/eye-icon.svg"
                          }
                          alt={showPassword ? "Hide password" : "Show password"}
                          style={{
                            width: "24px",
                            height: "24px",
                          }}
                        />
                      </button>
                      {errors.password && (
                        <div className="invalid-feedback">{errors.password}</div>
                      )}
                    </div>

                    <div className="mb-3" style={{ position: "relative" }}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className={`form-control ${errors.confirmPassword ? "is-invalid" : ""
                          }`}
                        placeholder="Password confirmation"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="btn btn-link password-toggle-btn"
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          padding: 0,
                        }}
                      >
                        <img
                          src={
                            showConfirmPassword
                              ? "/assets/icons/eye-off-icon.svg"
                              : "/assets/icons/eye-icon.svg"
                          }
                          alt={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          style={{
                            width: "24px",
                            height: "24px",
                          }}
                        />
                      </button>
                      {errors.confirmPassword && (
                        <div className="invalid-feedback">
                          {errors.confirmPassword}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <input
                        type="text"
                        className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                      {errors.firstName && (
                        <div className="invalid-feedback">{errors.firstName}</div>
                      )}
                    </div>

                    <div className="mb-3">
                      <input
                        type="text"
                        className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                      {errors.lastName && (
                        <div className="invalid-feedback">{errors.lastName}</div>
                      )}
                    </div>
                  </>
                )}

                {isSignIn ? (
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="rememberMe">
                        Remember me
                      </label>
                    </div>
                    <button
                      type="button"
                      className="text-primary text-decoration-none forgot-password-btn"
                      onClick={handleForgotPassword}
                    >
                      Forgot your password?
                    </button>
                  </div>
                ) : (
                  <div className="form-check mb-3">
                    <input
                      type="checkbox"
                      className={`form-check-input ${errors.terms ? "is-invalid" : ""
                        }`}
                      id="agreeTerms"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="agreeTerms">
                      I agree to the
                      <span className="text-primary"> Terms of Service</span>,
                      <span className="text-primary">
                        {" "}
                        General Terms and Conditions
                      </span>
                      , and
                      <span className="text-primary"> Privacy Policy</span>
                    </label>
                    {errors.terms && (
                      <div className="invalid-feedback">{errors.terms}</div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100 auth-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                  ) : null}
                  {isSignIn ? "Sign In" : "Sign Up"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="auth-image-container">
          <div className="auth-image-content">
            <img
              src="/assets/icons/Group.svg"
              alt="Illustration"
              className="auth-image"
            />
            <p className="auth-image-text">
              The best of luxury brand values, high quality products, and
              innovative services
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthInterface;
