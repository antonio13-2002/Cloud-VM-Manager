import { Button, Form, Row, Col, Card, Spinner, ListGroup, Badge, Alert} from 'react-bootstrap';
import { useNavigate } from 'react-router';
import { useState, useEffect} from 'react';

import API from '../API';

function CreateOrderButton(props) {
  const navigate = useNavigate();

  const handleClick = () => {
    // CASE 1: Already logged and we open the form
    if (props.onClick) {
      props.onClick(); 
    } 
    // CASO 2: Button pressed in the open page
    else {
      if (props.loggedIn) {
        navigate('/', { state: { openOrderForm: true } });
      } else {
        // guest user: makes login and has a ticket to later perform order creation { openOrderForm: true }
        navigate('/login', { state: { openOrderForm: true } });
      }
    }
  };

  return (
    <Button 
      variant="primary" 
      size="lg" 
      className="fw-bold px-4 shadow rounded-pill" 
      onClick={handleClick}
    >
      <i className="bi bi-plus-circle-fill me-2"></i>
      Create new order
    </Button>
  );
}

function ListOrdersButton() {
  const navigate = useNavigate();

  return (
    <Button 
      variant="outline-primary" 
      size="lg" 
      className="fw-bold px-4 shadow-sm rounded-pill"
      onClick={() => navigate('/orders')} 
    >
      <i className="bi bi-list-check me-2"></i>
      List Past Orders
    </Button>
  );
}

function OrderForm(props) {
  // --- 1. data state ---
  const [ramOptions, setRamOptions] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 2. input form state ---
  const [selectedClassId, setSelectedClassId] = useState('');
  const [storage, setStorage] = useState(1);
  const [dataTransfer, setDataTransfer] = useState(10);
  
  // --- 3. constraints ---
  const [minStorageAllowed, setMinStorageAllowed] = useState(1);
  const [minTransferAllowed, setMinTransferAllowed] = useState(10);

  // --- 4. info message state ---
  const [showInfo, setShowInfo] = useState(false);

  // get specifications from db
  useEffect(() => {
    API.getSpecifications().then((data) => {
        setConfig(data);
        setRamOptions(data.ramOptions);
        
        setMinTransferAllowed(data.min_order_transfer);
        setDataTransfer(data.min_order_transfer);

        if(data.ramOptions && data.ramOptions.length > 0) {
            const defaultRam = data.ramOptions[0];
            setSelectedClassId(defaultRam.id);
            setMinStorageAllowed(defaultRam.min_stor_req);
            setStorage(defaultRam.min_stor_req);
        }
        setLoading(false);
    }).catch(err => console.error("Errore caricamento specifiche:", err));
  }, []);

  // handle RAM selection with all related constraints
  const handleRamChange = (newId) => {
      const id = parseInt(newId);
      setSelectedClassId(id);

      const selectedClass = ramOptions.find(c => c.id === id);
      if (selectedClass) {
          const newMin = selectedClass.min_stor_req;
          setMinStorageAllowed(newMin);

          if (Number(storage) < newMin) {
              setStorage(newMin);
          }
      }
  };

  // --- VALIDATION ---
  const isStorageValid = Number(storage) >= minStorageAllowed;
  const isDataTransferValid = Number(dataTransfer) >= minTransferAllowed;
  const isFormValid = isStorageValid && isDataTransferValid;

  //calculate costs
  const calculateCosts = () => {
    if (!config || !selectedClassId) return { ram: 0, storage: 0, transfer: 0, total: 0 };

    const selectedRam = ramOptions.find(r => r.id === parseInt(selectedClassId));
    const ramCost = selectedRam ? selectedRam.m_fee : 0;

    const storageVal = Number(storage);
    const storageCost = storageVal * config.storage_price_per_tb;

    let transferCost = 0;
    const transferVal = Number(dataTransfer);
    const limit1 = config.transfer_limit_1; 
    const limit2 = config.transfer_limit_2; 
    
    const cost1 = config.transfer_cost_1;         
    const baseRate = config.transfer_rate_base;   
    const factor2 = config.transfer_factor2;      
    const factor3 = config.transfer_factor3;      

    if (transferVal <= limit1) {
        transferCost = cost1;
    } else if (transferVal <= limit2) {
        const extraGb = transferVal - limit1;
        transferCost = cost1 + (extraGb * (baseRate * factor2));
    } else {
        const tier1Gb = limit2 - limit1; 
        const tier2Gb = transferVal - limit2; 
        transferCost = cost1 + (tier1Gb * (baseRate * factor2)) + (tier2Gb * (baseRate * factor3));
    }

    return {
        ram: ramCost,
        storage: storageCost,
        transfer: transferCost,
        total: ramCost + storageCost + transferCost
    };
  };

  const costs = calculateCosts();

  // submit
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isFormValid) return;

    const order = { 
        type_ram_id: selectedClassId, 
        storage_tb: Number(storage), 
        transfer_gb: Number(dataTransfer) 
    };
    
    props.onSave(order);
  };

  if (loading) return <div className="text-center p-4"><Spinner animation="border" variant="primary" /></div>;

  return (
    <Card className="mt-4 shadow-sm border-0">
      <Card.Body className="p-4">
        <h3 className="mb-4 text-primary">Configure your Instance</h3>
        
        <Row>
            {/**Left column: order form */}
            <Col lg={7}>
                <Form onSubmit={handleSubmit}>
                    <Row>
                        <Col md={12} className="mb-3">
                            <Form.Group controlId="formRam">
                                <Form.Label className="fw-bold">RAM Type</Form.Label>
                                <Form.Select 
                                    value={selectedClassId} 
                                    onChange={ev => handleRamChange(ev.target.value)} 
                                    required
                                    disabled={props.isSaving}
                                >
                                    {ramOptions.map((opt) => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.ram_label}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">Select the desired computational power.</Form.Text>
                            </Form.Group>
                        </Col>

                        <Col md={12} className="mb-3">
                            <Form.Group controlId="formStorage">
                                <Form.Label className="fw-bold">Storage (TB)</Form.Label>
                                <Form.Control 
                                    type="number" min={minStorageAllowed} step="1"
                                    value={storage} onChange={ev => setStorage(ev.target.value)} 
                                    isInvalid={!isStorageValid} required 
                                    disabled={props.isSaving}
                                />
                                <Form.Control.Feedback type="invalid">
                                    Value too low. Min required: {minStorageAllowed} TB.
                                </Form.Control.Feedback>
                                <Form.Text className="text-muted">
                                    Minimum required for this RAM: <strong>{minStorageAllowed} TB</strong>.
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        <Col md={12} className="mb-3">
                            <Form.Group controlId="formData">
                                <Form.Label className="fw-bold">Data Transfer (GB)</Form.Label>
                                <Form.Control 
                                    type="number" min={minTransferAllowed}
                                    value={dataTransfer} onChange={ev => setDataTransfer(ev.target.value)} 
                                    isInvalid={!isDataTransferValid} required 
                                    disabled={props.isSaving}
                                />
                                <Form.Control.Feedback type="invalid">
                                    Value too low. Min required: {minTransferAllowed} GB.
                                </Form.Control.Feedback>
                                <Form.Text className="text-muted">
                                    Base amount included: <strong>{minTransferAllowed} GB</strong>.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="d-flex justify-content-end mt-2">
                        <Button 
                            variant="secondary" 
                            className="me-2" 
                            onClick={props.onCancel}
                            disabled={props.isSaving}
                        >
                            Cancel
                        </Button>
                        
                        <Button 
                            variant="primary" 
                            type="submit" 
                            disabled={!isFormValid || props.isSaving}
                        >
                            {props.isSaving ? (
                                <>
                                 <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2"/>
                                 Processing...
                                </>
                            ) : (
                                'Confirm Order'
                            )}
                        </Button>
                    </div>
                </Form>
            </Col>

            {/* Right column: price resume */}
            <Col lg={5}>
                <Card className="bg-light border-0 h-100">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                            <h5 className="text-secondary m-0">Monthly Cost Estimation</h5>
                            <Button 
                                variant={showInfo ? "info" : "outline-info"} 
                                size="sm" 
                                className="rounded-circle"
                                onClick={() => setShowInfo(!showInfo)}
                                title="Show pricing details"
                            >
                                <i className={`bi ${showInfo ? 'bi-x-lg' : 'bi-info-lg'}`}></i>
                            </Button>
                        </div>

                        <ListGroup variant="flush" className="bg-transparent">
                            <ListGroup.Item className="bg-transparent d-flex justify-content-between align-items-center px-0 py-2">
                                <span><i className="bi bi-cpu me-2"></i>RAM Instance</span>
                                <span className="fw-semibold">€ {costs.ram.toFixed(2)}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="bg-transparent d-flex justify-content-between align-items-center px-0 py-2">
                                <span><i className="bi bi-hdd me-2"></i>Storage ({storage} TB)</span>
                                <span className="fw-semibold">€ {costs.storage.toFixed(2)}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="bg-transparent d-flex justify-content-between align-items-center px-0 py-2">
                                <span><i className="bi bi-arrow-left-right me-2"></i>Data Transfer ({dataTransfer} GB)</span>
                                <span className="fw-semibold">€ {costs.transfer.toFixed(2)}</span>
                            </ListGroup.Item>
                            
                            <ListGroup.Item className="bg-transparent d-flex justify-content-between align-items-center px-0 border-top border-secondary pt-3 mt-2">
                                <span className="fs-5">Total / Month</span>
                                <span className="text-primary fs-4 fw-bold">€ {costs.total.toFixed(2)}</span>
                            </ListGroup.Item>
                        </ListGroup>
                    </Card.Body>
                </Card>
            </Col>
        </Row>

        {/* show informations about price calculation to the user*/}
        {showInfo && (
            <Alert variant="info" className="mt-4 mb-0 border-info bg-opacity-10">
                <h6 className="alert-heading fw-bold"><i className="bi bi-info-circle-fill me-2"></i>Pricing Policy Details</h6>
                <hr />
                <Row className="small">
                    <Col md={6}>
                        <strong>Computation Instances:</strong>
                        <ul className="mb-2">
                            <li>16 GB RAM: 10 €/month</li>
                            <li>32 GB RAM: 20 €/month (Min. 10 TB Storage)</li>
                            <li>128 GB RAM: 40 €/month (Min. 20 TB Storage)</li>
                        </ul>
                    </Col>
                    <Col md={6}>
                        <strong>Storage:</strong>
                        <ul className="mb-2">
                            <li>Price: 10 €/TB/month</li>
                            <li>Minimum 1 TB, integer values only.</li>
                        </ul>
                    </Col>
                    <Col md={12}>
                        <strong>Data Transfer:</strong>
                        <ul className="mb-0">
                            <li>Base 10 GB: 1 €/month (always included).</li>
                            <li>Additional GB (up to 1000 GB): Charged at 80% of base rate.</li>
                            <li>Beyond 1000 GB: Charged at 50% of base rate.</li>
                        </ul>
                    </Col>
                </Row>
            </Alert>
        )}

      </Card.Body>
    </Card>
  );
}

export { CreateOrderButton, ListOrdersButton, OrderForm };