const axios = require('axios');

const apiClient = axios.create({
    baseURL: 'http://localhost:8080/api/v1'
});

console.log(apiClient.getUri({ url: '/meals' }));
console.log(apiClient.getUri({ url: 'meals' }));
