import 'bootstrap-icons/font/bootstrap-icons.css';

import { Navbar, Nav, Form } from 'react-bootstrap';

import { LoginButton, LogoutButton } from './Auth';

const Navigation = (props) => {

    return (
        <Navbar bg="primary" expand="md" variant="dark" className="navbar-padding">
            <Navbar.Brand className="mx-2 fs-3 fw-bold">
                <i className="bi bi-cloud-check mx-2" />
                Cloud VM Manager
            </Navbar.Brand>
            <Nav className="ms-auto d-flex align-items-center">
                <Navbar.Text className="mx-2 fs-5 fw-bold text-white">
                    {props.user && props.user.name && 
                    `Logged in ${props.loggedInTotp ? '(2FA)' : ''} as: ${props.user.name}`}
                </Navbar.Text>
                    {props.loggedIn || props.showLogout ?
                        <LogoutButton logout={props.logout} /> : 
                        (!props.hideLoginButton && <LoginButton />)
                    }           
            </Nav>
        </Navbar>
    );
}

export { Navigation };
