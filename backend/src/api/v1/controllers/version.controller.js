const pkg = require('../../../../package.json');

let cached = null;

const getVersion = (req, res) => {
    if (!cached) {
        cached = {
            version: pkg.version,
            name: pkg.name,
            uptime: Date.now(),
        };
    }
    res.json(cached);
};

module.exports = { getVersion };
