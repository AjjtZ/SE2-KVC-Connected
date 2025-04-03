import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { Button } from '../components/Button';
import { useNavigate } from "react-router-dom";
import FormGroup from '../components/FormGroup';
import "../css/Forms.css";


const SignupPetOwner = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => {
    // Retrieve stored form data from sessionStorage
    const storedData = sessionStorage.getItem("signupStep1");
    return storedData
      ? JSON.parse(storedData)
      : {
          fname: "",
          lname: "",
          email: "",
          contact: "",
          address: "",
          password: "",
          confirmPassword: "",
        };
  });


  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  const handleChange = (e) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newFormData);
    sessionStorage.setItem("signupStep1", JSON.stringify(newFormData)); // Save to sessionStorage
  };




  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear any previous errors
    console.log("Signing up pet owner:", formData);


    // Validate empty fields
   if (!formData.fname.trim()) {
    setError("First name is required");
    return;
  }
  if (!formData.lname.trim()) {
    setError("Last name is required");
    return;
  }
  if (!formData.email.trim()) {
    setError("Email is required");
    return;
  }
  if (!formData.contact.trim()) {
    setError("Contact number is required");
    return;
  }
  if (!formData.address.trim()) {
    setError("Address is required");
    return;
  }
  if (!formData.password.trim()) {
    setError("Password is required");
    return;
  }
  if (!formData.confirmPassword.trim()) {
    setError("Please confirm your password");
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    setError("Passwords do not match");
    return;
  }


   // Store the form data in sessionStorage before sending the request
   sessionStorage.setItem("signupStep1", JSON.stringify(formData));


    try {
      const response = await fetch("http://localhost:5000/auth/signup/petowner-step1", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
     
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Signup failed");
        throw new Error(data.error || "Signup failed");
      }
 
      const token = response.headers.get("Authorization")?.split(" ")[1] || data.token;
      if (token) {
        localStorage.setItem("jwt", token);
      }


      setMessage(data.message);
      window.location.replace(data.redirectUrl)
    } catch (error) {
      console.error("Error:", error.message);
      setError(error.message);
    }
  };


  return (
    <>
    <Navbar />
    <div className="signup-container">
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
              required
            />
          </div>


          <FormGroup
            label="Address"
            type="text"
            name="address"
            value={formData.address}
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


          <FormGroup
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />


          <Button buttonStyle='btn--secondary' type='submit' className="form-btn-3">NEXT</Button>
        </form>
       
      </div>


    </div>
    </>
  );
};


export default SignupPetOwner;



