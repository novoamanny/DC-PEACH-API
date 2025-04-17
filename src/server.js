const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8001;


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

// backend routes
app.use('/api', require('./routes/api/'));
app.use('/api/sync', require('./routes/api/sync'));
// app.use('/api/dc/customers', require('./routes/api/DreamCatchers/customers'));
// app.use('/api/dc/loyalty', require('./routes/api/DreamCatchers/loyalty'));
// app.use('/api/dc/hubspot', require('./routes/api/DreamCatchers/hubspot'));

// app.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
