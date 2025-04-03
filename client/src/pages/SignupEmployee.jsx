import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import FormGroup from "../components/FormGroup";
import "../css/Forms.css";
import { useUserRole } from "../contexts/UserRoleContext";
import { useNavigate } from "react-router-dom";


const SignupEmployee = () => {
    const [formData, setFormData] = useState({
        fname: "",
        lname: "",
        email: "",
        contact: "",
        role: "",
        password: "",
        confirmPassword: "",
        captchaInput: "",
    });
    const [captcha, setCaptcha] = useState({ image: "", captchaKey: "" });
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isCaptchaIncorrect, setIsCaptchaIncorrect] = useState(false);
    const { setCurrentRole } = useUserRole();

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
            setIsCaptchaIncorrect(false); // Reset CAPTCHA status when new one is loaded
        } catch (error) {
            console.error("Failed to load CAPTCHA:", error);
            setError("Failed to load CAPTCHA. Please refresh the page.");
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(""); // Clear error when user makes changes
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); // Clear any previous errors
        setIsCaptchaIncorrect(false); // Reset CAPTCHA status
        console.log("Signing up employee:", formData);

        // Validate empty fields
       if (!formData.fname.trim()) {
        setError("First name is required");
        fetchCaptcha(); // Refresh CAPTCHA
        return;
    }
    if (!formData.lname.trim()) {
        setError("Last name is required");
        fetchCaptcha(); // Refresh CAPTCHA
        return;
    }
    if (!formData.email.trim()) {
        setError("Email is required");
        fetchCaptcha(); // Refresh CAPTCHA
        return;
    }
    if (!formData.role) {
        setError("Please select a role");
        fetchCaptcha(); // Refresh CAPTCHA
        return;
    }
    if (!formData.password.trim()) {
        setError("Password is required");
        fetchCaptcha(); // Refresh CAPTCHA
        return;
    }
    if (!formData.confirmPassword.trim()) {
        setError("Please confirm your password");
        fetchCaptcha(); // Refresh CAPTCHA
        return;
    }
     // Check if passwords match
     if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        fetchCaptcha(); // Refresh CAPTCHA
        return;
    }
    if (!formData.captchaInput?.trim()) {
        setError("CAPTCHA is required");
        fetchCaptcha(); // Refresh CAPTCHA
        return;
    }

        try {
            const response = await fetch("http://localhost:5000/auth/signup/employee", {
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
                    // Update the CAPTCHA image
                    setCaptcha({ image: data.newCaptcha.image, captchaKey: data.newCaptcha.captchaKey });
                    setIsCaptchaIncorrect(true);
                }
                setError(data.error || "An error occurred during signup");
                throw new Error(data.error || "An error occurred during signup.");
            }

            // Handle successful signup
            console.log(data.message);
            window.location.replace(data.redirectUrl);
        } catch (error) {
            console.error("Error:", error.message);
            setError(error.message);
        }
    };

    const getLandingPage = (role) => {
      switch (role) {   
        case "clinician":
          case "staff":
          return "/patients";
        default:
          return "/login";
      }
    };

    return (
        <>
            <Navbar />
            <div className="signup-container">
                <div className="left-section">
                    <h1>KHO<br /> VETERINARY<br /> CLINIC</h1>
                    <div className="alternate-links">
                        <Link to="/signup-petowner">
                            <Button buttonStyle="btn--primary" className="form-btn-2">Sign up as Pet Owner</Button>
                        </Link>
                        <p>Not an Employee?</p>
                    </div>
                </div>
                <div className="right-section">
                    <h2>Create Account</h2>
                    <p>Become part of our team!</p>
                    {error && <div className="auth-error-message">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="signup-form-row">
                            <FormGroup
                                label="First Name"
                                type="text"
                                name="fname"
                                value={formData.fname}
                                onChange={handleChange}
                                required
                            />
                            <FormGroup
                                label="Last Name"
                                type="text"
                                name="lname"
                                value={formData.lname}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="signup-form-row">
                            <FormGroup
                                label="Email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            <FormGroup
                                label="Contact Number"
                                type="text"
                                name="contact"
                                value={formData.contact}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="radio">
                        <label>Choose Role <span className="required-asterisk">*</span></label>
                            <div className="radio-group">
                                <input
                                    type="radio"
                                    id="clinicians"
                                    name="role"
                                    value="clinician"
                                    onChange={handleChange}
                                />
                                <label htmlFor="clinicians">Clinician</label>
                                <input
                                    type="radio"
                                    id="staff"
                                    name="role"
                                    value="staff"
                                    onChange={handleChange}
                                />
                                <label htmlFor="staff">Front Desk Staff</label>
                            </div>
                        </div>
                        <FormGroup
                            label="Password"
                            type="password"
                            name="password"
                            value={formData.password}
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
                        <div className="forms-group captcha">
                          <label htmlFor="captcha">Enter CAPTCHA <span className="required-asterisk">*</span></label>
                            <div className="captcha-container">
                                <img src={`${captcha.image}`} className="generated" alt="CAPTCHA" />
                                <input
                                    type="text"
                                    id="captcha"
                                    name="captchaInput"
                                    value={formData.captchaInput}
                                    onChange={handleChange}
                                />
                                {isCaptchaIncorrect && <span className="captcha-error"></span>}
                            </div>
                        </div>
                        <Button buttonStyle="btn--primary" type="submit" className="form-btn-1">SIGN UP</Button>
                    </form>
                </div>
            </div>
        </>
    );
};


export default SignupEmployee;
