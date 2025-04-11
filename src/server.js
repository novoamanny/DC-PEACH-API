const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8001;


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
// app.use(cors({
//   origin: 'http://localhost:3000',  // Allow only your frontend origin
//   methods: ['GET', 'POST'],        // Allow necessary HTTP methods
//   allowedHeaders: ['Content-Type', 'Authorization'],  // Customize allowed headers if needed
// }));

// DC
// app.use('/api/dc/', require('./routes/api/DreamCatchers/'));
// app.use('/api/dc/orders', require('./routes/api/DreamCatchers/orders'));
// app.use('/api/dc/customers', require('./routes/api/DreamCatchers/customers'));
// app.use('/api/dc/loyalty', require('./routes/api/DreamCatchers/loyalty'));
// app.use('/api/dc/hubspot', require('./routes/api/DreamCatchers/hubspot'));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
