const axios = require('axios');

const client = axios.create({
    baseURL: 'http://localhost:8080/api/v1'
});

console.log(client.getUri({ url: '/auth/login' }));
console.log(client.getUri({ url: 'auth/login' }));
