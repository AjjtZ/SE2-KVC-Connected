import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import FormGroup from "../components/FormGroup";
import "../css/Forms.css";
import { useUserRole } from "../contexts/UserRoleContext";
import { useNavigate } from "react-router-dom";

const PetInfo = () => {
  const [formData, setFormData] = useState({
    petname: "",
    gender: "",
    speciesDescription: "",
    breed: "",
    birthdate: "",
    altPerson1: "",
    altContact1: "",
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
        credentials: "include", // Ensure session persistence
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
    console.log("Pet Info Submitted:", formData);

    try {
        const response = await fetch("http://localhost:5000/auth/signup/petowner-step2", {
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
        setCurrentRole(data.role); // Set the user's role in the context
      navigate(getLandingPage(data.role)); // Redirect to the landing page based on role
        
    } catch (error) {
        console.error("Error:", error.message);
        setMessage(error.message);
    }
};

const getLandingPage = (role) => {
  switch (role) {   
    case "owner":
      return "/mypets";
    default:
      return "/login";
  }
};

  return (
    <>
      <Navbar />
      <div className="petinfo-container">
        <div className="left-section">
          <h1>
            KHO
            <br /> VETERINARY
            <br /> CLINIC
          </h1>
          <div className="alternate-links">
            <Link to="/signup-employee">
              <Button buttonStyle="btn--primary" className="form-btn-2">
                Sign up as Employee
              </Button>
            </Link>
            <p>Not a Pet Owner?</p>
          </div>
        </div>
        <div className="right-section">
          <h2>Create Account</h2>
          <p>Your pet's care starts here!</p>
          <form onSubmit={handleSubmit}>
            <div className="signup-form-row">
              <FormGroup
                label="Pet Name"
                type="text"
                name="petname"
                value={formData.petname}
                onChange={handleChange}
                required
              />

              <div className="radio">
                <label>Gender*</label>
                <div className="radio-group">
                  <input
                    type="radio"
                    id="male"
                    name="gender"
                    value="male"
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="male">Male</label>

                  <input
                    type="radio"
                    id="female"
                    name="gender"
                    value="female"
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="female">Female</label>
                </div>
              </div>
            </div>

            <div className="signup-form-row">
              <FormGroup
                label="Pet Species"
                type="select"
                name="speciesDescription"
                value={formData.speciesDescription}
                onChange={handleChange}
                required
                selectOptions={[
                  "Dog (Standard)",
                  "Cat (Standard)",
                  "Snake (Exotic)",
                  "Turtles (Exotic)",
                  "Birds (Exotic)",
                  "Rabbit (Exotic)",
                  "Lab Rat (Exotic)",
                  "Others",
                ]}
              />
              <FormGroup
                label="Pet Breed (Optional)"
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
              />
            </div>

            <FormGroup
              label="Birthday (Optional)"
              type="date"
              name="birthdate"
              value={formData.birthdate}
              onChange={handleChange}
            />

            <div className="signup-form-row">
              <FormGroup
                label="Emergency Contact Person"
                type="text"
                name="altPerson1"
                value={formData.altPerson1}
                onChange={handleChange}
                required
              />
              <FormGroup
                label="Emergency Contact Number"
                type="text"
                name="altContact1"
                value={formData.altContact1}
                onChange={handleChange}
                required
              />
            </div>

            <div className="forms-group captcha">
              <label htmlFor="captcha">Enter Captcha</label>
              <div className="captcha-container">
                <img
                  src={`${captcha.image}`}
                  className="generated"
                  alt="CAPTCHA"
                />
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

            <div className="button-group">
              <Button
                buttonStyle="btn--secondary"
                onClick={() => window.history.back()}
                className="form-btn-3"
              >
                BACK
              </Button>
              <Button
                buttonStyle="btn--primary"
                type="submit"
                className="form-btn-1"
              >
                SIGN UP
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default PetInfo;
