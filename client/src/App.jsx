
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router';


import { GenericLayout, NotFoundLayout, LoginLayout, TotpLayout, PublicLayout, OrdersLayout } from './components/Layout';
import { Dashboard } from './components/Dashboard.jsx';
import API from './API.js';

function App() {

  const navigate = useNavigate();

  // --- AUTHENTICATION STATE ---
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loggedInTotp, setLoggedInTotp] = useState(false);

  // --- GENERAL APP STATE ---
  const [message, setMessage] = useState('');
  // dirty: Reload data after delete
  const [dirty, setDirty] = useState(true);
  const [openOrderOnLogin, setOpenOrderOnLogin] = useState(false);

  const handleErrors = (err) => {
    let msg = '';
    if (err.error) msg = err.error;
    else if (String(err) === "string") msg = String(err);
    else msg = "Unknown Error";

    setMessage(msg);

    if (msg === 'Not authenticated') {
      setTimeout(() => {
        setUser(undefined); 
        setLoggedIn(false); 
        setLoggedInTotp(false); 
        setDirty(true);
      }, 2000);
    } else {
      setTimeout(()=>setDirty(true), 2000); 
    }
  }

  // login check
 useEffect(()=> {
    const checkAuth = async() => {
      try {
        const userOrNot = await API.getUserInfo(); // This will give always 200: OK with different content
        
        // Check if the received object has property isAuthenticated to false
        if (userOrNot.isAuthenticated === false) {
           // We do nothing
           return; 
        }

        // Valid user
        setLoggedIn(true);
        setUser(userOrNot);
        if (userOrNot.isTotp)
          setLoggedInTotp(true);
          
      } catch(err) {
        // just for server errors
        console.error(err);
      }
    };
    checkAuth();
  }, []);
  const filters = {
    'all': { label: 'Dashboard', url: '/', filterFunction: () => true },
  };

  const filtersToArray = Object.entries(filters);
  const filterArray = filtersToArray.map(([filterName, obj ]) =>
     ({ filterName: filterName, ...obj }));


  // --- LOGIN LOGIC ---
  const handleLogin = async (credentials) => {
    try {
      const user = await API.logIn(credentials);
      setUser(user);
      setLoggedIn(true);
    } catch (err) {
      throw err;
    }
  };

  // --- LOGOUT LOGIC ---
  const handleLogout = async () => {
    try {
      await API.logOut(); // Erase session
    } catch (err) {
      console.log("Server side not necessary or failed", err);
    }
    
    setLoggedIn(false);
    setUser(null);
    setLoggedInTotp(false); 
    navigate('/'); 
};

  return (
      // no container here because there was a problem in the margin
        <Routes>
          {/* Principal route (with login) */}
          <Route path="/" element={loggedIn ? 
              <GenericLayout 
                filterArray={filterArray} 
                message={message} 
                setMessage={setMessage}
                loggedIn={loggedIn} 
                user={user} 
                loggedInTotp={loggedInTotp} 
                logout={handleLogout} 
              /> 
              : 
              <PublicLayout 
                loggedIn={loggedIn} // false
                user={user}         // null
                logout={handleLogout} 
                message={message} setMessage={setMessage}
              />
            } >
            
            <Route index element={
              <Dashboard 
                user={user}
                message={message}
                openOrderOnLogin={openOrderOnLogin}       
                setOpenOrderOnLogin={setOpenOrderOnLogin} 
              />
            } />

            <Route path="/orders" element={<OrdersLayout loggedInTotp={loggedInTotp}/>} />
            
            <Route path="*" element={<NotFoundLayout />} />
          </Route>

          {/*Login route */}
          <Route path='/login' element={ 
            <LoginWithTotp 
              loggedIn={loggedIn} 
              login={handleLogin}
              user={user} 
              logout={handleLogout}
              setLoggedInTotp={setLoggedInTotp} 
              setOpenOrderOnLogin={setOpenOrderOnLogin}
              loggedInTotp={loggedInTotp}
              setMessage={setMessage}
            /> 
          } />
        </Routes>
  );
}

// Wrapper to manage login and TOTP form
function LoginWithTotp(props) {
  const location = useLocation();

  useEffect(() => {
    if (props.loggedIn && location.state && location.state.openOrderForm) {
      props.setOpenOrderOnLogin(true);
    }
  }, [props.loggedIn, location.state]);

  useEffect(() => {
    if (props.loggedIn && props.user && !props.user.canDoTotp) {
        if (location.state && location.state.orderIdForAuth) {
            props.setMessage("Operation failed: You cannot delete orders because 2FA is not enabled on your account.");
        }
        // no message
    }
  }, [props.loggedIn, props.user, location.state, props.setMessage]);

  
  if (props.loggedIn) {
    if (props.user.canDoTotp) {
      // --- USER WITH TOTP ---
      if (props.loggedInTotp) {
        if (location.state && location.state.orderIdForAuth) {
            return <Navigate replace to='/orders' state={{ openDeleteModalId: location.state.orderIdForAuth }} />;
        }
        return <Navigate replace to='/'/>;
      } else {
        return <TotpLayout 
            totpSuccessful={() => props.setLoggedInTotp(true)} 
            logout={props.logout}      
            user={props.user}          
            loggedIn={props.loggedIn}  
        />
      }
    } else {
      // --- USER WITHOUT TOTP ---
      return <Navigate replace to='/'/>;
    }
  } else {
    return <LoginLayout login={props.login} />;
  }
}
export default App;