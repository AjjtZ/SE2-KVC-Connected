import React from 'react';
import '../css/Landing.css';
import Navbar from "../components/Navbar";
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faPhone, faEnvelope, faClock, faStethoscope, faSyringe, faUserMd, faHospital, faFlask, faPaw } from '@fortawesome/free-solid-svg-icons';

function Landing() {
  const button = true;
  return (
    <>
     <Navbar />
      <div className="hero-section-wrapper">
        <section className="hero" id="home">
          <div className="hero-content">
            <h1>
              KHO <br /> VETERINARY <br /> CLINIC
            </h1>
            <p>Four Paws, Two Feet, One Heart</p>
            <Link to="/signup-petowner">
              <Button buttonStyle="btn--primary" to="/signup-petowner">SIGN UP</Button>
            </Link>
          </div>
        </section>
      </div>
      
      <div className='about-section-wrapper'>
        <div className="cat2">
          <img src="/cat2.png" alt="Cat2" />
        </div>
        <section className="about" id="about">
          <div className="about-text-images">
            <div className="about-text">
              <h2>ABOUT</h2>
            </div>
            <div className="about-images">
              <div className="about-images-cat-dog">
                <img src="/cat.png" alt="Cat" />
                <img src="/dog.png" alt="Dog" />
              </div>
              <div className="about-images-bird">
                <img src="/bird.png" alt="Bird" />
              </div>
            </div>
          </div>
          <div className='about-right-section'>
            <div className="about-services">
              <h2>WE OFFER 24 HOURS <br />VET SERVICES</h2>
            </div>
            <div className="dog-text">
              <div className="about-text">
                <p>
                <strong>
                   <em>
                     "At Kho Veterinary Clinic, we dedicate ourselves to providing exceptional veterinary
                     care services to pets while delivering excellent customer service to their owners."
                   </em>
                 </strong>
                 Established in 2008 by Dr. Williefredo Kho in Naga City, Camarines Sur,
                 Kho Veterinary Clinic is a 24/7 veterinary facility with eight branches—seven
                 across the Bicol Region and one in Sampaloc, Manila.
                 Originating from Dr. Kho's home service practice in 2001,
                 the clinic has expanded into a trusted name in veterinary medicine.
                 <br /><br />
                 To streamline operations, this
                 Record Manager System efficiently manages patient records and medical histories.
                 This digital innovation ensures seamless record management while maintaining
                 the standards of data security and accessibility.
               </p>
             </div>
              <div className="dog2">
                <img src="/dog2.png" alt="Dog2" />
              </div>
            </div>
          </div>
        </section>
        </div>


        <div className="services-section-wrapper">
       <section className="services" id="services">
         <h2>OUR SERVICES</h2>
         <div className="services-grid">
           <div className="service-item">
             <FontAwesomeIcon icon={faStethoscope} className="service-icon"/>
             <h3>Check Up/Treatment</h3>
             <p>Comprehensive health examinations and medical treatments for your pets</p>
           </div>
           <div className="service-item">
             <FontAwesomeIcon icon={faSyringe} className="service-icon"/>
             <h3>Vaccination/Deworming</h3>
             <p>Preventive care through regular vaccinations and deworming programs</p>
           </div>
           <div className="service-item">
             <FontAwesomeIcon icon={faUserMd} className="service-icon"/>
             <h3>Minor & Major Surgery</h3>
             <p>Advanced surgical procedures performed by experienced veterinarians</p>
           </div>
           <div className="service-item">
             <FontAwesomeIcon icon={faHospital} className="service-icon"/>
             <h3>Confinement</h3>
             <p>24/7 care and monitoring in our modern facility</p>
           </div>
           <div className="service-item">
             <FontAwesomeIcon icon={faFlask} className="service-icon"/>
             <h3>Laboratory</h3>
             <p>State-of-the-art diagnostic services and testing</p>
           </div>
           <div className="service-item">
             <FontAwesomeIcon icon={faPaw} className="service-icon"/>
             <h3>Pet Supplies</h3>
             <p>Quality pet food, medications, and accessories</p>
           </div>
         </div>
       </section>
     </div>


        <div className="contact-section-wrapper"> 
          <section className="contact" id="contact">
            <h2>CONTACT US</h2>
            <div className="map-place">
              <div className="google-map">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.8611940740166!2d120.990829974573!3d14.606981976921476!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c93d5079b1dd%3A0xb6c4b4365ca4cb2d!2sKho%20Veterinary%20Clinic!5e0!3m2!1sen!2sph!4v1737052687426!5m2!1sen!2sph"
                  width={1000}
                  height={410}
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <div className="clinicplace">
                <img src="/clinicplace.png" alt="Clinic Place" />
              </div>
            </div>

            <div className="contact-details">
              <div className="contact-detail-item">
                <FontAwesomeIcon icon={faLocationDot} className="contact-icon"/>
                <p>
                  <strong>LOCATION</strong>
                </p>
                <p>715 Earnshaw St, Sampaloc, Manila, 1008 Metro Manila</p>
              </div>
              <div className="contact-detail-item">
                <FontAwesomeIcon icon={faPhone} className="contact-icon"/>
                <p>
                  <strong>PHONE NUMBER</strong>
                </p>
                <p>0968 605 1371 / 0929 694 4414</p>
              </div>
              <div className="contact-detail-item">
                <FontAwesomeIcon icon={faEnvelope} className="contact-icon"/>
                <p>
                  <strong>EMAIL</strong>
                </p>
                <p>khovetclinic@email.com</p>
              </div>
              <div className="contact-detail-item">
                <FontAwesomeIcon icon={faClock} className="contact-icon"/>
                <p>
                  <strong>WORKING HOURS</strong>
                </p>
                <p>
                  Monday to Sunday 
                  <br />
                  8:00 AM to 8:00 PM
                </p>
              </div>
            </div>

          </section>
        </div>
      
        <footer className="footer">
       <p>© 2025 KHODE. All Rights Reserved.</p>
     </footer>

     
    </>
  )
}
export default Landing;
