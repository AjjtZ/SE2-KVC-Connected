"use client";
import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import { Button } from "../components/Button";
import FormGroup from "../components/FormGroup";
import "../css/Forms.css";
import { useUserRole } from "../contexts/UserRoleContext";
import { useNavigate } from "react-router-dom";


function LoginForm() {
  const [currentStep, setCurrentStep] = useState("login")

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    captcha: "",
    accessCode: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [captcha, setCaptcha] = useState({ image: "", captchaKey: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    try {
      const response = await fetch("http://localhost:5000/auth/captcha", {
        credentials: "include",
      });
      const data = await response.json();
      console.log("CAPTCHA loaded:", data);  
      setCaptcha({ image: data.image, captchaKey: data.captchaKey });
    } catch (error) {
      console.error("Failed to load CAPTCHA:", error);
      setError("Failed to load CAPTCHA. Please refresh the page.");
    }
  };

  const { setCurrentRole } = useUserRole(); // Access the context to set the role
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear any previous errors
    console.log("Form Submitted");

    // Validate empty fields
   if (!formData.email.trim()) {
    setError("Email is required");
    return;
  }
  if (!formData.password.trim()) {
    setError("Password is required");
    return;
  }
  if (!formData.captchaInput?.trim()) {
    setError("CAPTCHA is required");
    return;
  }

    try {
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
            if (data.newCaptcha) {
                console.log("Refreshing CAPTCHA..."); // Debug log
                setCaptcha({ image: data.newCaptcha.image, captchaKey: data.newCaptcha.captchaKey }); // Update CAPTCHA
            }
            setError(data.error || "Login failed");
            throw new Error(data.error || "Login failed");
      }

      const token = response.headers.get("Authorization")?.split(" ")[1] || data.token;
      if (token) {
        localStorage.setItem("jwt", token);
      }

      setCurrentRole(data.role);
      setMessage(data.message);
      navigate(getLandingPage(data.role)); 
    } catch (error) {
console.error("Error:", error.message);
      setMessage(error.message);
    }
  };

  const getLandingPage = (role) => {
    switch (role) {
      case "doctor":
      case "clinician":
      case "staff":
        return "/patients";
      case "owner":
        return "/mypets";
      default:
        return "/login";
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleForgotPassword = (e) => {
    e.preventDefault()
    setCurrentStep("forgotPassword")
  }

  const handleSendCode = async (e) => {
  e.preventDefault();
  setError(""); // Clear any previous errors

  // Validate email
  if (!formData.email.trim()) {
    setError("Email is required");
    return;
  }


    try {
      const response = await fetch("http://localhost:5000/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();
      if (!response.ok){
        setError(data.error || "Failed to send reset code"); 
        //throw new Error(data.error || "Failed to send reset code");
      }

      console.log(data.message); // "Reset code sent to your email."
      setMessage(data.message);
      setCurrentStep("enterCode"); // Move to the next step
    } catch (error) {
      console.error("Error requesting password reset:", error);
      setMessage(error.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(""); // Clear any previous errors
    console.log("Reset Password button clicked"); // Debug log
    console.log("Email:", formData.email);
    console.log("Access Code:", formData.accessCode);
  
    // Validate access code
   if (!formData.accessCode.trim()) {
    setError("Access code is required");
    return;
  }


    try {
      const response = await fetch("http://localhost:5000/auth/verify-reset-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email, code: formData.accessCode }),
      });
  
      const data = await response.json();
      console.log("Response from server:", data); // Debug log
  
      if (!response.ok){
        setError(data.error || "Invalid or expired reset code");
        throw new Error(data.error || "Invalid or expired reset code");
      }
  
      console.log(data.message); // "Code verified. Proceed to reset your password."
      setMessage(data.message);
      setCurrentStep("newPassword"); // Move to the next step
    } catch (error) {
      console.error("Error verifying reset code:", error);
      setError(error.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(""); // Clear any previous errors
    console.log("Change Password button clicked"); // Debug log
    console.log("Sending password reset request:", {
      email: formData.email,
      accessCode: formData.accessCode,
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword,
    });
  

    // Validate new password and confirm password
   if (!formData.newPassword.trim()) {
    setError("New password is required");
    return;
  }
  if (!formData.confirmPassword.trim()) {
    setError("Please confirm your new password");
    return;
  }
  if (formData.newPassword !== formData.confirmPassword) {
    setError("Passwords do not match");
    return;
  }


    try {
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }
  
      const response = await fetch("http://localhost:5000/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          accessCode: formData.accessCode,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });
  
      const data = await response.json();
      console.log("Response from server:", data); // Debug log
  
      if (!response.ok) {
        setError(data.error || "Failed to reset password");
        throw new Error(data.error || "Failed to reset password");
      }
 
      setMessage(data.message);
      console.log("Password reset successfully. Redirecting to login...");
      setCurrentStep("login"); // Redirect to login
    } catch (error) {
      console.error("Error resetting password:", error);
      setError(error.message);
    }
  };
  

  const handleResendCode = async (e) => {
    e.preventDefault();
    console.log("Resending code to:", formData.email);

    try {
        const response = await fetch("http://localhost:5000/auth/resend-reset-code", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: formData.email }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to resend reset code");
          throw new Error(data.error || "Failed to resend reset code");
        }
 
        console.log(data.message); // "A new reset code has been sent to your email."
        setMessage(data.message);
    } catch (error) {
        console.error("Error resending reset code:", error);
        setError(error.message);
    }
};

  const renderForm = () => {
    switch (currentStep) {
      case "forgotPassword":
        return (
          <>
            <h2>Forgot Password</h2>
            <p>Enter your email address and we'll send you an access code</p>
            <form onSubmit={handleSendCode}>
              <FormGroup
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <Button buttonStyle='btn--secondary' onClick={() => setCurrentStep("login")} className="form-btn-3">BACK</Button>
              <Button
                buttonStyle="btn--primary"
                type="submit"
                className="form-btn-1"
                onClick={handleSendCode} 
              >
                SEND
              </Button>
            </form>
          </>
        )

      case "enterCode":
        return (
          <>
            <h2>Forgot Password</h2>
            <p>Enter access code (6 digits) that was sent to your email</p>
            {error && <div className="auth-error-message">{error}</div>}
            <form onSubmit={handleResetPassword}>
              <FormGroup
                label="Access Code"
                type="text"
                name="accessCode"
                value={formData.accessCode}
                onChange={handleChange}
                required
              />
              <Button
                buttonStyle="btn--primary"
                type="submit"
                className="form-btn-1"
                onClick={handleResendCode}
              >
                Resend Code
              </Button>
              <Button
                buttonStyle="btn--primary"
                type="submit"
                className="form-btn-1"
                onClick={handleResetPassword}
              >
                RESET
              </Button>
            </form>
          </>
        )

      case "newPassword":
        return (
          <>
            <h2>Forgot Password</h2>
            <p>Reset Password</p>
            {error && <div className="auth-error-message">{error}</div>}
            <form onSubmit={handleChangePassword}>
              <FormGroup
                label="New Password"
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
              />
              <FormGroup
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <Button
                buttonStyle="btn--primary"
                type="submit"
                className="form-btn-1"
              >
                CHANGE
              </Button>
            </form>
          </>
        )

      default:
        return (
          <>
            <h2>Welcome Back!</h2>
            <p>Login to your account</p>
            {error && <div className="auth-error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <FormGroup
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <FormGroup
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <div className="forgot">
                <a href="#" onClick={handleForgotPassword}>
                  Forgot Password?
                </a>
              </div>
              <div className="forms-group captcha">
              <label htmlFor="captcha">Enter Captcha <span className="required-asterisk">*</span></label>
                <div className="captcha-container">
                  <img src={`${captcha.image}`} className="generated" alt="CAPTCHA" />
                  <input
                    type="text"
                    id="captcha"
                    name="captchaInput"
                    value={formData.captchaInput}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <Button buttonStyle="btn--primary" to="/patients" className="form-btn-1">
                LOGIN
              </Button>
            </form>
          </>
        )
    }
  }

  return (
    <>
      <Navbar />
      <div className="login-container">
        <div className="left-section">
          <h1 className="login-h1">
            KHO
            <br /> VETERINARY
            <br /> CLINIC
          </h1>
        </div>
        <div className="right-section">{renderForm()}</div>
      </div>
    </>
  )
}

export default LoginForm
