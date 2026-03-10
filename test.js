const sendSuccessResponse = (data = null) => {
    const response = {
        success: true,
        message: 'Success',
    };
    if (data) {
        response.data = data;
    }
    return response; // this simulates res.json(response)
};

// Simulated mock API client
const apiClient = {
    get: async () => {
        // Axios wraps the JSON response in a `data` property
        return {
            status: 200,
            data: sendSuccessResponse([{ id: 1, name: 'meal1'}])
        };
    }
};

// Simulated meal.service.js
const getMeals = async () => {
    const response = await apiClient.get('/meals');
    return response.data; // This is the payload { success: true, data: [...] }
};

// Simulated meal.slice.js
const fetchMeals = async () => {
    try {
        const response = await getMeals();
        // response is { success: true, data: [...] }
        return response.data; 
    } catch (e) {
        return e.toString();
    }
};

fetchMeals().then(res => console.log("Result:", res));
