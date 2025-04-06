import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { Button } from '../components/Button';
import FormGroup from '../components/FormGroup';
import "../css/Forms.css";
import { useUserRole } from "../contexts/UserRoleContext";
import { useNavigate } from "react-router-dom";


const PetInfo = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => {
    // Retrieve stored form data from sessionStorage
    const storedData = sessionStorage.getItem("signupStep2");
    return storedData
      ? JSON.parse(storedData)
      : {
          petname: "",
          gender: "",
          speciesDescription: "",
          breed: "",
          birthdate: "",
          altPerson1: "",
          altContact1: "",
          captchaInput: "",
        };
  });


  const [captcha, setCaptcha] = useState({ image: "", captchaKey: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isCaptchaIncorrect, setIsCaptchaIncorrect] = useState(false);


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
        setIsCaptchaIncorrect(false); // Reset CAPTCHA status when new one is loaded
      } catch (error) {
        console.error("Failed to load CAPTCHA:", error);
        setError("Failed to load CAPTCHA. Please refresh the page.");
      }
  };

  // to prevent future dates
  const validateBirthday = (dateString) => {
    if (!dateString) return true; // Birthday is optional
   
    const selectedDate = new Date(dateString);
    const currentDate = new Date();
   
    // Reset the time portion to compare just the dates
    selectedDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
   
    return selectedDate <= currentDate;
  };



  const handleChange = (e) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newFormData);
    sessionStorage.setItem("signupStep2", JSON.stringify(newFormData)); // Save to sessionStorage
    // Clear error if a new value is entered
    if (error) setError("");
  };




  const handleBack = () => {
    sessionStorage.setItem("signupStep2", JSON.stringify(formData));
    navigate("/signup-petowner"); // Navigate back to page 1
  };




  const { setCurrentRole } = useUserRole(); // Access the context to set the role
  ///const navigate = useNavigate();


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear any previous errors
    setIsCaptchaIncorrect(false); // Reset CAPTCHA status
    console.log("Pet Info Submitted:", formData);


   


   // Validate empty fields
   if (!formData.petname.trim()) {
    setError("Pet name is required");
    fetchCaptcha(); // Refresh CAPTCHA
    return;
  }
  if (!formData.gender) {
    setError("Please select a gender");
    fetchCaptcha(); // Refresh CAPTCHA
    return;
  }
  if (!formData.speciesDescription) {
    setError("Please select a species");
    fetchCaptcha(); // Refresh CAPTCHA
    return;
  }
  // Validate birthday if it's provided
  if (formData.birthdate && !validateBirthday(formData.birthdate)) {
    setError("Future dates not allowed");
    fetchCaptcha(); // Refresh CAPTCHA
    return;
  }

  if (!formData.altPerson1.trim()) {
    setError("Emergency contact person is required");
    fetchCaptcha(); // Refresh CAPTCHA
    return;
  }
  if (!formData.altContact1.trim()) {
    setError("Emergency contact number is required");
    fetchCaptcha(); // Refresh CAPTCHA
    return;
  }
  if (!formData.captchaInput?.trim()) {
    setError("CAPTCHA is required");
    fetchCaptcha(); // Refresh CAPTCHA
    return;
  }


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
                setIsCaptchaIncorrect(true); // Show X emoji for incorrect CAPTCHA
            }
            setError(data.error || "An error occurred during signup.");
            throw new Error(data.error || "An error occurred during signup.");
        }


        // Clear sessionStorage for both signup steps
      sessionStorage.removeItem("signupStep1");
      sessionStorage.removeItem("signupStep2");


        // Handle successful signup
      setCurrentRole(data.role); // Set the user's role in the context
      navigate(getLandingPage(data.role)); // Redirect to the landing page based on role
       
    } catch (error) {
        console.error("Error:", error.message);
        setError(error.message);
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
          <h1>KHO<br /> VETERINARY<br /> CLINIC</h1>
          <div className="alternate-links">
          <Link to="/signup-employee">
            <Button buttonStyle="btn--primary" className="form-btn-2">Sign up as Employee</Button>
          </Link>
            <p>Not a Pet Owner?</p>
          </div>
        </div>
      <div className="right-section">
        <h2>Create Account</h2>
        <p>Your pet's care starts here!</p>
        {error && (
          <div className={`auth-error-message ${error === "Future dates not allowed" ? "future-date-error" : ""}`}>
            {error}
          </div>
        )}
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
            <label>Gender <span className="required-asterisk">*</span></label>
              <div className="radio-group">
                <input
                  type="radio"
                  id="male"
                  name="gender"
                  value="male"
                  onChange={handleChange}
                />
                <label htmlFor="male">Male</label>


                <input
                  type="radio"
                  id="female"
                  name="gender"
                  value="female"
                  onChange={handleChange}
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
              selectOptions={[
                "Dog (Standard)",
                "Cat (Standard)",
                "Snake (Exotic)",
                "Turtles (Exotic)",
                "Birds (Exotic)",
                "Rabbit (Exotic)",
                "Lab Rat (Exotic)",
                "Others"
              ]}
              required
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
            onChange={(e) => {
              // Call handleChange to update state
              handleChange(e);
             
              // Check if it's a future date and set an error
              if (e.target.value && !validateBirthday(e.target.value)) {
                setError("Future dates not allowed");
              }
            }}

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
              {isCaptchaIncorrect && <span className="captcha-error"></span>}
            </div>
          </div>


          <div className="button-group">
           <Button buttonStyle='btn--secondary' type="button" onClick={handleBack} className="form-btn-3">BACK</Button>
           <Button buttonStyle='btn--primary' type="submit" className="form-btn-1" >SIGN UP</Button>
         </div>


        </form>
      </div>
    </div>
    </>
  );
};


export default PetInfo;



