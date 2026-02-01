const SERVER_URL = 'http://localhost:3001/api/';


/**
 * A utility function for parsing the HTTP response.
 */
function getJson(httpResponsePromise) {
  return new Promise((resolve, reject) => {
    httpResponsePromise
      .then((response) => {
        // if status is 2xx
        if (response.ok) {
          response.json()
            .then(json => {
              if (json.error || json.errors || (json.success === false)) {
                  //reject promise manually
                  reject(json); 
              } else {
                  resolve(json);
              }
              // --------------------
            })
            .catch(err => reject({ error: "Cannot parse server response" }))
        } else {
          // Other errors management
          response.json()
            .then(obj => reject(obj))
            .catch(err => reject({ error: "Cannot parse server response" }))
        }
      })
      .catch(err => reject({ error: "Cannot communicate" }))
  });
}

/** Utility functions */

/**Retrieves the configurations (instance limits, costs, ...) */
const getSpecifications = async () => {
  return getJson(
    fetch(SERVER_URL + 'specifications', {
      method: 'GET',
      credentials: 'include'
    })
  );
}

/**Retrieves back the total resources used (istances and total storage) */
const getResources = async () => {
  return getJson(
    fetch(SERVER_URL + 'resources', {
      method: 'GET',
      credentials: 'include'
    })
  );
}

/**Recover the list of orders for a specific user */
const getOrders = async () => {
  return getJson(
    fetch(SERVER_URL + 'orders', {
      method: 'GET',
      credentials: 'include'
    })
  );
}

/**Create an order. The user must be authenticated. The order is: { type_ram_id, storage_tb, transfer_gb } */
const addOrder = async (orderData) => {
  return getJson(
    fetch(SERVER_URL + 'orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(orderData)
    })
  );
}

/** Delete an order given its Id, the user must be authenticated + TOTP */
const deleteOrder = async (orderId) => {
  return getJson(
    fetch(SERVER_URL + 'orders/' + orderId, {
      method: 'DELETE',
      credentials: 'include'
    })
  );
}

/*** Authentication functions ***/

/**
 * This function wants the TOTP code
 * It executes the 2FA.
 */
const totpVerify = async (totpCode) => {
  return getJson(fetch(SERVER_URL + 'login-totp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',  // this parameter specifies that authentication cookie must be forwarded
    body: JSON.stringify({code: totpCode}),
  })
  )
};


/**
 * This function wants username and password inside a "credentials" object.
 * It executes the log-in.
 */
const logIn = async (credentials) => {
  return getJson(fetch(SERVER_URL + 'sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',  // this parameter specifies that authentication cookie must be forwarded
    body: JSON.stringify(credentials),
  })
  )
};

/**
 * This function is used to verify if the user is still logged-in.
 * It returns a JSON object with the user info.
 */
const getUserInfo = async () => {
  return getJson(fetch(SERVER_URL + 'sessions/current', {
    // this parameter specifies that authentication cookie must be forwarded
    credentials: 'include'
  })
  )
};

/**
 * This function destroy the current user's session and execute the log-out.
 */
const logOut = async() => {
  return getJson(fetch(SERVER_URL + 'sessions/current', {
    method: 'DELETE',
    credentials: 'include'  // this parameter specifies that authentication cookie must be forwarded
  })
  )
}

const API = { getSpecifications, getResources, getOrders, addOrder, deleteOrder,
              logIn, getUserInfo, logOut, totpVerify };
export default API;
