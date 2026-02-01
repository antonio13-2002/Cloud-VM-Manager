import { useState, useEffect } from 'react';
import { Row, Col, Spinner, Container, Alert } from 'react-bootstrap';
import { useLocation } from 'react-router';
import API from '../API';
import { CircularProgress } from './CircularProgress';
import { CreateOrderButton, ListOrdersButton, OrderForm } from './Order';

function Dashboard(props) {
  const [resources, setResources] = useState(null);
  const [specs, setSpecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const refreshData = async () => {
    try {
      const [resData, specsData] = await Promise.all([
        API.getResources(),
        API.getSpecifications()
      ]);
      setResources(resData);
      setSpecs(specsData);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const location = useLocation();
  useEffect(() => {
    if ((location.state && location.state.openOrderForm) || props.openOrderOnLogin) {
      setShowForm(true);
      if(props.setOpenOrderOnLogin) props.setOpenOrderOnLogin(false);
      window.history.replaceState({}, document.title);
    }
  }, [location, props.openOrderOnLogin]);

  const handleSaveOrder = async (orderData) => {
    setIsSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      await API.addOrder(orderData);
      
      setShowForm(false);
      setSuccessMsg("Order created successfully!");
      
      await refreshData();

    } catch (err) {
      let errorMsg = "Error creating order";
      
      if (err.error) {
          errorMsg = err.error; 
      } else if (err.errors && err.errors.length > 0) {
          errorMsg = err.errors[0].msg; 
      } else if (typeof err === "string") {
          errorMsg = err;
      }

      setError(errorMsg);
      await refreshData(); 
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Row className="mb-0 text-center">
        <Col>
          <h1 className="display-3 fw-bold" style={{ fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#2c3e50' }}>
            Welcome, <span className="text-primary">{props.user?.name}</span>
          </h1>
          <p className="lead text-muted mt-2 mb-0">
            Here is the status of your cloud resources.
          </p>
        </Col>
      </Row>

      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <Row className="justify-content-center align-items-center g-4" style={{ marginTop: '-50px' }}>
             <Col md={5} lg={4} className="d-flex flex-column align-items-center">
                {resources && specs ? (
                <>
                    <CircularProgress 
                    value={specs.max_active_instances - (resources.totalRam || resources.instances)} 
                    max={specs.max_active_instances} 
                    unit="Units"
                    color="#0d6efd" 
                    />
                    <h5 className="fw-bold text-secondary text-center" style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>Free RAM instances</h5>
                </>
                ) : null}
            </Col>

            <Col md={5} lg={4} className="d-flex flex-column align-items-center">
                {resources && specs ? (
                <>
                    <CircularProgress 
                    value={specs.max_total_storage - resources.totalStorage} 
                    max={specs.max_total_storage} 
                    unit="TB"
                    color="#198754" 
                    />
                    <h5 className="fw-bold text-secondary text-center" style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>Total available storage</h5>
                </>
                ) : null}
            </Col>
        </Row>
      )}

      <Container className="mt-5">

        {successMsg && (
            <Row className="justify-content-center mb-3">
                <Col md={12} lg={10} xl={10}>
                    <Alert variant="success" onClose={() => setSuccessMsg('')} dismissible>
                        {successMsg}
                    </Alert>
                </Col>
            </Row>
        )}
        
        {error && (
            <Row className="justify-content-center mb-3">
                <Col md={12} lg={10} xl={10}>
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                </Col>
            </Row>
        )}

        {showForm ? (
            <Row className="justify-content-center">
                <Col md={12} lg={10} xl={10}>
                    <OrderForm 
                        onCancel={() => {
                            setShowForm(false);
                            setError(''); 
                            setSuccessMsg('');
                        }} 
                        onSave={handleSaveOrder} 
                        isSaving={isSaving} 
                    />
                </Col>
            </Row>
        ) : (
            <Row className="justify-content-center g-3">
                <Col xs="auto">
                    <CreateOrderButton loggedIn={true} onClick={() => {
                        setShowForm(true);
                        setSuccessMsg('');
                    }} />
                </Col>
                <Col xs="auto">
                    <ListOrdersButton />
                </Col>
            </Row>
        )}
      </Container>
    </>
  );
}

export { Dashboard };