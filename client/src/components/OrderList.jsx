import { Card, Row, Col, ListGroup, Button, Alert } from 'react-bootstrap';


function OrderItem({ order, config, onDeleteClick, loggedInTotp, showTotpError }) {
  
  // --- Cost calculation ---
  const calculateCosts = () => {
    if (!config) return { ram: 0, storage: 0, transfer: 0, total: 0 };
    const ramOption = config.ramOptions.find(r => r.ram_label === order.ram_label);
    const ramCost = ramOption ? ramOption.m_fee : 0;
    const storageVal = Number(order.storage_tb);
    const storageCost = storageVal * config.storage_price_per_tb;

    let transferCost = 0;
    const transferVal = Number(order.transfer_gb);
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

    return { ram: ramCost, storage: storageCost, transfer: transferCost, total: ramCost + storageCost + transferCost };
  };

  const costs = calculateCosts();

  return (
    <Card className={`mb-4 shadow-sm border-0 ${showTotpError ? 'border border-danger' : ''}`}>
      <Card.Body className="p-0">
        <Row className="g-0">
            <Col md={7} className="p-4 d-flex flex-column justify-content-center">
                <div className="d-flex justify-content-between align-items-start">
                    <h5 className="text-primary mb-3">Order #{order.id}</h5>
                </div>
                
                <div className="mb-2">
                    <span className="fw-bold text-secondary">Instance Type:</span>
                    <h4 className="fw-bold">{order.ram_label}</h4>
                </div>
                <div className="mb-2">
                    <span className="fw-bold text-secondary">Storage:</span>
                    <span className="fs-5 ms-2">{order.storage_tb} TB</span>
                </div>
                <div className="mb-3">
                    <span className="fw-bold text-secondary">Data Transfer:</span>
                    <span className="fs-5 ms-2">{order.transfer_gb} GB</span>
                </div>
                
                {/* ERROR TOTP MESSAGE */}
                {showTotpError && (
                    <Alert variant="danger" className="py-2 mb-2 small">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        <strong>Authentication required!</strong><br/>
                        You must complete the TOTP login to delete this order.
                    </Alert>
                )}

                {/* Cancel button */}
                <div className="mt-2">
                     <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => onDeleteClick(order.id)}
                        // Button is always active
                     >
                        <i className="bi bi-trash3-fill me-1"></i> Delete Order
                     </Button>
                     {!loggedInTotp && !showTotpError && (
                        <small className="text-muted ms-2 fst-italic">(Redirects to 2FA)</small>
                     )}
                </div> 
            </Col>

            {/* Right column (Price) */}
            <Col md={5}>
                <div className="bg-light h-100 p-4 border-start">
                    <h6 className="mb-3 text-secondary text-uppercase small fw-bold">Monthly Cost Breakdown</h6>
                    <ListGroup variant="flush" className="bg-transparent">
                        <ListGroup.Item className="bg-transparent d-flex justify-content-between align-items-center px-0 py-1 small">
                            <span>RAM Fee</span>
                            <span>€ {costs.ram.toFixed(2)}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="bg-transparent d-flex justify-content-between align-items-center px-0 py-1 small">
                            <span>Storage Cost</span>
                            <span>€ {costs.storage.toFixed(2)}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="bg-transparent d-flex justify-content-between align-items-center px-0 py-1 small">
                            <span>Transfer Cost</span>
                            <span>€ {costs.transfer.toFixed(2)}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="bg-transparent d-flex justify-content-between align-items-center px-0 border-top border-secondary pt-3 mt-2">
                            <span className="fw-bold">Total / Month</span>
                            <span className="text-primary fs-5 fw-bold">€ {costs.total.toFixed(2)}</span>
                        </ListGroup.Item>
                    </ListGroup>
                </div>
            </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

export {OrderItem};