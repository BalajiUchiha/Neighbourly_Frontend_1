const API_URL = import.meta.env.VITE_API_URL || '';

export const apiFetch = async (url, options = {}) => {
  const fullUrl = (url.startsWith('http://') || url.startsWith('https://')) 
    ? url 
    : `${API_URL}${url}`;
  
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let res = await fetch(fullUrl, {
    ...options,
    headers,
  });
  
  let isAuthEndpoint = false;
  try {
    const parsedUrl = new URL(fullUrl, window.location.origin);
    isAuthEndpoint = parsedUrl.pathname.includes('/api/auth/refresh') || parsedUrl.pathname.includes('/api/auth/login');
  } catch (e) {
    isAuthEndpoint = url.includes('/api/auth/refresh') || url.includes('/api/auth/login');
  }

  if (res.status === 401 && !isAuthEndpoint) {
    try {
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('token', data.access_token);
        headers['Authorization'] = `Bearer ${data.access_token}`;
        
        res = await fetch(fullUrl, {
          ...options,
          headers,
        });
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return res;
      }
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return res;
    }
  }
  return res;
};

export const api = {
  async request(endpoint, options = {}) {
    const headers = { ...options.headers };
    
    // Default to application/json only if body is not FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    
    // Add token if available in local storage
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && endpoint !== '/api/auth/refresh' && endpoint !== '/api/auth/login') {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('token', data.access_token);
          headers['Authorization'] = `Bearer ${data.access_token}`;
          
          response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
          });
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.detail || 'Something went wrong');
      error.status = response.status;
      throw error;
    }

    return response.json();
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  put(endpoint, body, options = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  patch(endpoint, body, options = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },
};

export default apiFetch;

