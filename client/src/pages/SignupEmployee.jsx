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
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const { setCurrentRole } = useUserRole(); // Access the context to set the role
  const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Signing up employee:", formData);

        // Check if passwords match before sending the request
        if (formData.password !== formData.confirmPassword) {
            setMessage("❌ Passwords do not match!");
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
                }
                throw new Error(data.error || "An error occurred during signup.");
            }

            // Handle successful signup
            console.log(data.message);
            setCurrentRole(data.role); // Set the user's role in the context
      navigate(data.redirectUrl); // Redirect to the landing page based on role
            window.location.replace(data.redirectUrl);
        } catch (error) {
            console.error("Error:", error.message);
            setMessage(error.message);
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
                            <label>Choose Role*</label>
                            <div className="radio-group">
                                <input
                                    type="radio"
                                    id="clinicians"
                                    name="role"
                                    value="clinician"
                                    onChange={handleChange}
                                    required
                                />
                                <label htmlFor="clinicians">Clinician</label>
                                <input
                                    type="radio"
                                    id="staff"
                                    name="role"
                                    value="staff"
                                    onChange={handleChange}
                                    required
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
                            <label htmlFor="captcha">Enter Captcha</label>
                            <div className="captcha-container">
                                <img src={`${captcha.image}`} className="generated" alt="CAPTCHA" />
                                <input
                                    type="text"
                                    id="captcha"
                                    name="captchaInput"
                                    value={formData.captchaInput}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <Button buttonStyle="btn--primary" type="submit" className="form-btn-1">SIGN UP</Button>
                    </form>
                    {message && <p>{message}</p>}
                </div>
            </div>
        </>
    );
};

function getLandingPage(role) {
    switch (role) {
      case "clinician":
      case "staff":
        return "/patients";      
      default:
        return "/login";
    }
  }


export default SignupEmployee;
