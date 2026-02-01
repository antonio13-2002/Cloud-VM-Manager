import { Row, Col, Button, Alert, Container, Spinner, Modal } from 'react-bootstrap';
import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useEffect, useState} from 'react';
import API from '../API';

import { Navigation } from './Navigation';
import { LoginForm, TotpForm } from './Auth';
import { CircularProgress } from './CircularProgress';
import { CreateOrderButton } from './Order';
import { OrderItem } from './OrderList';

function NotFoundLayout() {
    return (
      <>
        <Navigation loggedIn={props.loggedIn} user={props.user} logout={props.logout} />
        <h2>This route is not valid!</h2>
        <Link to="/">
          <Button variant="primary">Go back to the main page!</Button>
        </Link>
      </>
    );
  }

  function LoginLayout(props) {
    return (
      <>
      <Navigation loggedIn={props.loggedIn} user={props.user} logout={props.logout} />
      <Row className="mt-5">
        <Col>
          <LoginForm login={props.login} />
        </Col>
      </Row>
      </>
    );
  }

function TotpLayout(props) {
  return (
    <>
    <Navigation loggedIn={props.loggedIn} user={props.user} logout={props.logout} showLogout={true}/>
    <Row className="mt-5">
      <Col>
        <TotpForm totpSuccessful={props.totpSuccessful} />
      </Col>
    </Row>
    </>
  );
}
  
  function GenericLayout(props) {
  return (
    <>
      <Navigation 
        loggedIn={props.loggedIn} 
        user={props.user} 
        loggedInTotp={props.loggedInTotp} 
        logout={props.logout} 
      />

      <Container className="mt-5">
        
        {/* Alert Messages */}
        <Row className="justify-content-center">
          <Col xs={12} md={10}>
            {props.message ? 
              <Alert className='my-1' onClose={() => props.setMessage('')} variant='danger' dismissible>
                {props.message}
              </Alert> : null}
          </Col>
        </Row>
        <Outlet />

      </Container>
    </>
  );
}

  //public layout for non-authenticated users
  function PublicLayout(props) {

  const [resources, setResources] = useState(null); // from /api/resources
  const [specs, setSpecs] = useState(null);         // from /api/specifications
  const [loading, setLoading] = useState(true);

  //download specifications and used resources
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resData, specsData] = await Promise.all([
          API.getResources(),
          API.getSpecifications()
        ]);
        setResources(resData);
        setSpecs(specsData);
        setLoading(false);
      } catch (err) {
        console.error("Errore nel recupero dati pubblici", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      
          <Navigation 
            loggedIn={props.loggedIn} 
            user={props.user} 
            logout={props.logout} 
          />
        
      {props.message ? 
        <Container className="mt-4">
            <Alert onClose={() => props.setMessage('')} variant='danger' dismissible>
              {props.message}
            </Alert> 
        </Container>
       : null}

      {/* Welcome message */}
      <Container className="mt-5">
        <Row className="mb-0 text-center">
          <Col>
            <h1 className="display-3 fw-bold" style={{ fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#2c3e50' }}>
              Welcome to <span className="text-primary">Cloud VM Manager</span>
            </h1>
            <p className="lead text-muted mt-2 mb-0">
              Monitor the global status of cloud resources in real time.
            </p>
          </Col>
        </Row>

        {loading ? (
          <div className="d-flex justify-content-center my-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <Row className="justify-content-center align-items-center g-4" style={{ marginTop: '-50px' }}>
            {/* Circle 1: RAM instances  */}
            <Col md={5} lg={4}>
              {resources && specs ? (
                <>
                <CircularProgress 
                  value={specs.max_active_instances - (resources.totalRam || resources.instances)} 
                  max={specs.max_active_instances} 
                  unit="Units"
                  color="#0d6efd" 
                />
                <h5 className="fw-bold text-secondary text-center" style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>
                  Free RAM instances
                </h5>
                </>
              ) : null}
            </Col>

            {/* Circle 2: Storage */}
            <Col md={5} lg={4}>
              {resources && specs ? (
                <>
                <CircularProgress 
                  value={specs.max_total_storage - resources.totalStorage} 
                  max={specs.max_total_storage} 
                  unit="TB"
                  color="#198754" 
                />
                <h5 className="fw-bold text-secondary text-center" style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>
                  Total available storage
                </h5>
                </>
              ) : null}
            </Col>
          </Row>
        )}
        
        <Row className="mt-5 text-center">
             <Col>
                <CreateOrderButton loggedIn={props.loggedIn} />
             </Col>
        </Row>
      </Container>
    </>
  );
}

function OrdersLayout(props) {
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [totpErrorId, setTotpErrorId] = useState(null);

  // 1. Data loading
  useEffect(() => {
    const getData = async () => {
      try {
        const [ordersData, configData] = await Promise.all([
            API.getOrders(),
            API.getSpecifications()
        ]);
        setOrders(ordersData);
        setConfig(configData);
        setLoading(false);
      } catch (err) {
        setError('Error loading orders history.');
        setLoading(false);
      }
    };
    getData();
  }, []);

  useEffect(() => {
    // if we go back from the TOTP form
    if (location.state && location.state.totpCancelled && location.state.orderId) {
        setTotpErrorId(location.state.orderId);
        
        window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
      if (location.state && location.state.openDeleteModalId) {
          // set order to delete
          setOrderToDelete(location.state.openDeleteModalId);
          setShowModal(true);
          
          window.history.replaceState({}, document.title);
      }
  }, [location]);

  const handleDeleteClick = (orderId) => {
      setTotpErrorId(null);

      if (props.loggedInTotp) {
          // A: Logged with TOTP -> show Popup
          setOrderToDelete(orderId);
          setShowModal(true);
      } else {
          // B: no TOTP -> go to totp form
          navigate('/login', { 
              state: { 
                  from: '/orders', 
                  orderIdForAuth: orderId // orderId for eventual future deletion
              } 
          });
      }
  };

  const confirmDelete = async () => {
      if (!orderToDelete) return;
      setIsDeleting(true);
      try {
          await API.deleteOrder(orderToDelete);
          setOrders(currentOrders => currentOrders.filter(o => o.id !== orderToDelete));
          setShowModal(false);
          setOrderToDelete(null);
      } catch (err) {
          console.error(err);
          setError("Error deleting the order. Please try again.");
          setShowModal(false);
      } finally {
          setIsDeleting(false);
      }
  };

  const handleCloseModal = () => {
      setShowModal(false);
      setOrderToDelete(null);
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" variant="primary"/></div>;

  return (
    <Container>
        <Row className="mb-4 align-items-center">
            <Col>
                <h2 className="display-6 fw-bold">My Orders History</h2>
            </Col>
            <Col xs="auto">
                <Link to="/">
                    <Button variant="outline-secondary">
                        <i className="bi bi-arrow-left me-2"></i>Back to Dashboard
                    </Button>
                </Link>
            </Col>
        </Row>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

        {!error && orders.length === 0 ? (
            <Alert variant="info">You have no active orders yet.</Alert>
        ) : (
            orders.map(order => (
                <OrderItem 
                    key={order.id} 
                    order={order} 
                    config={config} 
                    onDeleteClick={handleDeleteClick}
                    loggedInTotp={props.loggedInTotp}
                    showTotpError={totpErrorId === order.id}
                />
            ))
        )}

        <Modal show={showModal} onHide={handleCloseModal} centered>
            <Modal.Header closeButton>
                <Modal.Title className="text-danger">Confirm Deletion</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Are you sure you want to delete <strong>Order #{orderToDelete}</strong>?</p>
                <p className="text-muted small">
                    This action will permanently remove the instance and release resources.
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseModal} disabled={isDeleting}>
                    Cancel
                </Button>
                <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>
                    {isDeleting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Delete Order'}
                </Button>
            </Modal.Footer>
        </Modal>

    </Container>
  );
}

  export { GenericLayout, NotFoundLayout, LoginLayout, TotpLayout, PublicLayout, OrdersLayout };