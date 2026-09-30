require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const app = require('./app');

const port = process.env.PORT || 4000;
app.listen(port, '0.0.0.0', () => console.log(`doroom API on http://localhost:${port}/api  |  admin web: /admin`));
