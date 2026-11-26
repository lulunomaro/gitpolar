(() => {
  window.GitpolarAPI = async function request(path, { method = 'GET', body, signal } = {}) {
    const response = await fetch(`/api/${path}`, { method, signal, credentials:'same-origin', cache:'no-store', headers:body === undefined ? {} : {'Content-Type':'application/json'}, ...(body === undefined ? {} : {body:JSON.stringify(body)}) });
    if(response.status === 204) return null;
    const value = await response.json();
    if(!response.ok) { const error = new Error(value.error || `Request failed (${response.status}).`); error.status=response.status; throw error; }
    return value;
  };
})();
